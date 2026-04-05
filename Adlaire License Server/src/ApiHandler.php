<?php
declare(strict_types=1);

/**
 * API endpoint handlers for Adlaire License Server.
 * Spec: LICENSE_SERVER_RULEBOOK.md §3
 */
final class ApiHandler
{
    private const RATE_LIMIT_REGISTER = 10;  // per hour
    private const RATE_LIMIT_VERIFY = 60;    // per hour

    private Database $db;

    public function __construct(Database $db)
    {
        $this->db = $db;
    }

    /**
     * POST /api/license/register
     * Receives system_key, returns primary + second keys.
     */
    public function register(): void
    {
        $body = KeyValidator::parseRequestBody();
        if ($body === null) {
            $this->error(400, 'Invalid request body');
            return;
        }

        $systemKey = (string) ($body['system_key'] ?? '');
        $domain = (string) ($body['domain'] ?? '');
        $version = (string) ($body['product_version'] ?? '');
        $timestamp = (string) ($body['timestamp'] ?? '');

        if (!KeyValidator::validateSystemKey($systemKey)) {
            $this->error(400, 'Invalid system key format');
            return;
        }

        if ($timestamp !== '' && !KeyValidator::validateTimestamp($timestamp)) {
            $this->error(400, 'Timestamp out of range');
            return;
        }

        if (!$this->checkRateLimit('register', self::RATE_LIMIT_REGISTER)) {
            $this->error(429, 'Rate limit exceeded');
            return;
        }

        $pdo = $this->db->pdo();

        // Check if already registered
        $stmt = $pdo->prepare('SELECT id, primary_key, second_key, status FROM licenses WHERE system_key = ?');
        $stmt->execute([$systemKey]);
        $existing = $stmt->fetch();

        if ($existing !== false) {
            if ($existing['status'] === 'revoked') {
                $this->error(403, 'License has been revoked');
            } else {
                // Return existing keys
                $this->respond([
                    'status' => 'ok',
                    'primary_key' => $existing['primary_key'],
                    'second_key' => $existing['second_key'],
                    'registered_at' => $this->getRegisteredAt($systemKey),
                ]);
            }
            $this->audit('register_existing', $systemKey);
            return;
        }

        // Generate new keys
        $primaryKey = KeyGenerator::primaryKey();
        $secondKey = KeyGenerator::secondKey();
        $now = gmdate('c');
        $ip = $this->getClientIp();

        $stmt = $pdo->prepare('
            INSERT INTO licenses (system_key, primary_key, second_key, domain, product_version, registered_at, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([$systemKey, $primaryKey, $secondKey, $domain, $version, $now, $ip]);

        $this->audit('register', $systemKey, ['domain' => $domain, 'version' => $version]);

        $this->respond([
            'status' => 'ok',
            'primary_key' => $primaryKey,
            'second_key' => $secondKey,
            'registered_at' => $now,
        ]);
    }

    /**
     * POST /api/license/verify
     * Checks key validity.
     */
    public function verify(): void
    {
        $body = KeyValidator::parseRequestBody();
        if ($body === null) {
            $this->error(400, 'Invalid request body');
            return;
        }

        $systemKey = (string) ($body['system_key'] ?? '');
        $primaryKey = (string) ($body['primary_key'] ?? '');

        if (!KeyValidator::validateSystemKey($systemKey)) {
            $this->error(400, 'Invalid system key format');
            return;
        }

        if (!$this->checkRateLimit('verify', self::RATE_LIMIT_VERIFY)) {
            $this->error(429, 'Rate limit exceeded');
            return;
        }

        $pdo = $this->db->pdo();
        $stmt = $pdo->prepare('SELECT id, status FROM licenses WHERE system_key = ? AND primary_key = ?');
        $stmt->execute([$systemKey, $primaryKey]);
        $license = $stmt->fetch();

        if ($license === false) {
            $this->audit('verify_failed', $systemKey);
            $this->respond(['status' => 'ok', 'valid' => false, 'reason' => 'not_found']);
            return;
        }

        // Update last_verified_at
        $now = gmdate('c');
        $stmt = $pdo->prepare('UPDATE licenses SET last_verified_at = ? WHERE id = ?');
        $stmt->execute([$now, $license['id']]);

        // Check for commercial contract
        $stmt = $pdo->prepare('SELECT status, expires_at FROM contracts WHERE license_id = ? AND status = \'active\' LIMIT 1');
        $stmt->execute([$license['id']]);
        $contract = $stmt->fetch();

        $type = $contract !== false ? 'commercial' : 'free';
        $expiresAt = $contract !== false ? ($contract['expires_at'] ?? null) : null;

        $this->audit('verify', $systemKey);

        $this->respond([
            'status' => 'ok',
            'valid' => $license['status'] === 'active',
            'type' => $type,
            'expires_at' => $expiresAt,
        ]);
    }

    /**
     * POST /api/license/renew
     * Renews license keys.
     */
    public function renew(): void
    {
        $body = KeyValidator::parseRequestBody();
        if ($body === null) {
            $this->error(400, 'Invalid request body');
            return;
        }

        $systemKey = (string) ($body['system_key'] ?? '');
        $primaryKey = (string) ($body['primary_key'] ?? '');

        if (!KeyValidator::validateSystemKey($systemKey)) {
            $this->error(400, 'Invalid system key format');
            return;
        }

        if (!$this->checkRateLimit('renew', self::RATE_LIMIT_VERIFY)) {
            $this->error(429, 'Rate limit exceeded');
            return;
        }

        $pdo = $this->db->pdo();
        $stmt = $pdo->prepare('SELECT id, status, primary_key, second_key FROM licenses WHERE system_key = ? AND primary_key = ?');
        $stmt->execute([$systemKey, $primaryKey]);
        $license = $stmt->fetch();

        if ($license === false) {
            $this->error(404, 'License not found');
            return;
        }

        if ($license['status'] !== 'active') {
            $this->error(403, 'License is not active');
            return;
        }

        $this->audit('renew', $systemKey);

        $this->respond([
            'status' => 'ok',
            'primary_key' => $license['primary_key'],
            'second_key' => $license['second_key'],
            'renewed_at' => gmdate('c'),
        ]);
    }

    /**
     * POST /api/license/third-party
     * Issues or validates third-party key for commercial use.
     */
    public function thirdParty(): void
    {
        $body = KeyValidator::parseRequestBody();
        if ($body === null) {
            $this->error(400, 'Invalid request body');
            return;
        }

        $systemKey = (string) ($body['system_key'] ?? '');
        $primaryKey = (string) ($body['primary_key'] ?? '');
        $contractCode = (string) ($body['contract_code'] ?? '');

        if (!KeyValidator::validateSystemKey($systemKey)) {
            $this->error(400, 'Invalid system key format');
            return;
        }

        if ($contractCode === '') {
            $this->error(400, 'Contract code is required');
            return;
        }

        if (!$this->checkRateLimit('third-party', self::RATE_LIMIT_VERIFY)) {
            $this->error(429, 'Rate limit exceeded');
            return;
        }

        $pdo = $this->db->pdo();

        // Find license
        $stmt = $pdo->prepare('SELECT id, status FROM licenses WHERE system_key = ? AND primary_key = ?');
        $stmt->execute([$systemKey, $primaryKey]);
        $license = $stmt->fetch();

        if ($license === false) {
            $this->error(404, 'License not found');
            return;
        }

        if ($license['status'] !== 'active') {
            $this->error(403, 'License is not active');
            return;
        }

        // Find contract by code
        $stmt = $pdo->prepare('SELECT id, third_party_key, status, expires_at FROM contracts WHERE contract_code = ?');
        $stmt->execute([$contractCode]);
        $contract = $stmt->fetch();

        if ($contract === false) {
            $this->error(404, 'Contract not found');
            return;
        }

        if ($contract['status'] !== 'active') {
            $this->error(403, 'Contract is not active');
            return;
        }

        // Link contract to license if not already linked
        $stmt = $pdo->prepare('UPDATE contracts SET license_id = ? WHERE id = ? AND license_id != ?');
        $stmt->execute([$license['id'], $contract['id'], $license['id']]);

        $this->audit('third_party', $systemKey, ['contract_code' => $contractCode]);

        $this->respond([
            'status' => 'ok',
            'third_party_key' => $contract['third_party_key'],
            'contract_type' => 'commercial',
            'expires_at' => $contract['expires_at'],
        ]);
    }

    // --- Helpers ---

    private function respond(mixed $data): void
    {
        http_response_code(200);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }

    private function error(int $code, string $message): void
    {
        http_response_code($code);
        echo json_encode(['status' => 'error', 'message' => $message], JSON_UNESCAPED_UNICODE);
    }

    private function getClientIp(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? '';
    }

    private function getRegisteredAt(string $systemKey): string
    {
        $stmt = $this->db->pdo()->prepare('SELECT registered_at FROM licenses WHERE system_key = ?');
        $stmt->execute([$systemKey]);
        $row = $stmt->fetch();
        return $row !== false ? (string) $row['registered_at'] : '';
    }

    private function audit(string $action, string $systemKey, mixed $details = null): void
    {
        $stmt = $this->db->pdo()->prepare('
            INSERT INTO audit_log (action, system_key, ip_address, details, created_at)
            VALUES (?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $action,
            $systemKey,
            $this->getClientIp(),
            $details !== null ? json_encode($details, JSON_UNESCAPED_UNICODE) : null,
            gmdate('c'),
        ]);
    }

    private function checkRateLimit(string $action, int $maxPerHour): bool
    {
        $ip = $this->getClientIp();
        $oneHourAgo = gmdate('c', time() - 3600);

        $stmt = $this->db->pdo()->prepare('
            SELECT COUNT(*) as cnt FROM audit_log
            WHERE action = ? AND ip_address = ? AND created_at > ?
        ');
        $stmt->execute([$action, $ip, $oneHourAgo]);
        $row = $stmt->fetch();

        return ($row['cnt'] ?? 0) < $maxPerHour;
    }
}
