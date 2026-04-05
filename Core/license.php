<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - License Manager
 *
 * Manages API key lifecycle: system key generation, registration status,
 * grace period enforcement, and license validation.
 *
 * Spec: LICENSE_SYSTEM_RULEBOOK.md Ver.2.0
 *
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group
 * @copyright Copyright (c) 2014 - 2026 倉田和宏
 * @license Adlaire License Ver.2.0 (Open Source - Platform Code)
 */

final class LicenseManager
{
    private const LICENSE_FILE = __DIR__ . '/../data/system/license.json';
    private const FILE_PERMISSION = 0600;
    private const GRACE_PERIOD_DAYS = 3;
    private const SYSTEM_KEY_LENGTH = 32; // 32 bytes = 64 hex chars

    /** @var array<string, mixed>|null */
    private static ?array $cache = null;

    /**
     * Check license status and enforce gate.
     * Returns null if OK, or an error message string if blocked.
     */
    public static function check(): ?string
    {
        $data = self::read();

        // No license file = not yet initialized (pre-first-login)
        if ($data === null) {
            return null;
        }

        // Registered: primary_key exists
        if (isset($data['primary_key']) && $data['primary_key'] !== '') {
            return null;
        }

        // Not registered: check grace period
        $firstLogin = $data['first_login_at'] ?? '';
        if ($firstLogin === '') {
            return null;
        }

        $loginTime = strtotime($firstLogin);
        if ($loginTime === false) {
            return 'Invalid license data: first_login_at is malformed.';
        }

        $graceEnd = $loginTime + (self::GRACE_PERIOD_DAYS * 86400);
        if (time() > $graceEnd) {
            return 'License registration required. Grace period has expired.';
        }

        return null;
    }

    /**
     * Initialize license on first login.
     * Generates system key and records first login timestamp.
     * Returns true if newly initialized, false if already exists.
     */
    public static function initOnFirstLogin(): bool
    {
        $data = self::read();

        // Already initialized
        if ($data !== null && isset($data['system_key']) && $data['system_key'] !== '') {
            return false;
        }

        $now = gmdate('c');
        $systemKey = bin2hex(random_bytes(self::SYSTEM_KEY_LENGTH));

        $license = [
            'first_login_at' => $now,
            'system_key' => $systemKey,
            'primary_key' => '',
            'second_key' => '',
            'third_party_key' => '',
            'registered_at' => '',
        ];

        self::write($license);
        return true;
    }

    /**
     * Register keys received from the official server.
     */
    public static function registerKeys(string $primaryKey, string $secondKey): bool
    {
        $data = self::read();
        if ($data === null || !isset($data['system_key']) || $data['system_key'] === '') {
            return false;
        }

        $data['primary_key'] = $primaryKey;
        $data['second_key'] = $secondKey;
        $data['registered_at'] = gmdate('c');

        self::write($data);
        return true;
    }

    /**
     * Register third-party key for commercial use.
     */
    public static function registerThirdPartyKey(string $thirdPartyKey): bool
    {
        $data = self::read();
        if ($data === null || !isset($data['primary_key']) || $data['primary_key'] === '') {
            return false;
        }

        $data['third_party_key'] = $thirdPartyKey;
        self::write($data);
        return true;
    }

    /**
     * Get system key for registration with official server.
     */
    public static function getSystemKey(): string
    {
        $data = self::read();
        return ($data !== null && isset($data['system_key'])) ? (string) $data['system_key'] : '';
    }

    /**
     * Check if license is registered (has primary key).
     */
    public static function isRegistered(): bool
    {
        $data = self::read();
        return $data !== null && isset($data['primary_key']) && $data['primary_key'] !== '';
    }

    /**
     * Check if commercial license is active (has third-party key).
     */
    public static function isCommercial(): bool
    {
        $data = self::read();
        return $data !== null && isset($data['third_party_key']) && $data['third_party_key'] !== '';
    }

    /**
     * Get remaining grace period in seconds. Returns 0 if expired or registered.
     */
    public static function getGraceRemaining(): int
    {
        if (self::isRegistered()) {
            return 0;
        }

        $data = self::read();
        if ($data === null || !isset($data['first_login_at']) || $data['first_login_at'] === '') {
            return self::GRACE_PERIOD_DAYS * 86400;
        }

        $loginTime = strtotime($data['first_login_at']);
        if ($loginTime === false) {
            return 0;
        }

        $graceEnd = $loginTime + (self::GRACE_PERIOD_DAYS * 86400);
        $remaining = $graceEnd - time();
        return max(0, $remaining);
    }

    /**
     * Get license info for display in admin UI.
     * @return array<string, mixed>
     */
    public static function getInfo(): array
    {
        $data = self::read();
        if ($data === null) {
            return [
                'initialized' => false,
                'registered' => false,
                'commercial' => false,
            ];
        }

        return [
            'initialized' => isset($data['system_key']) && $data['system_key'] !== '',
            'registered' => isset($data['primary_key']) && $data['primary_key'] !== '',
            'commercial' => isset($data['third_party_key']) && $data['third_party_key'] !== '',
            'system_key' => isset($data['system_key']) && strlen($data['system_key']) > 8 ? substr($data['system_key'], 0, 8) . '...' : ($data['system_key'] ?? ''),
            'registered_at' => $data['registered_at'] ?? '',
            'first_login_at' => $data['first_login_at'] ?? '',
            'grace_remaining' => self::getGraceRemaining(),
        ];
    }

    /**
     * Read license data from file.
     * @return array<string, mixed>|null
     */
    private static function read(): ?array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }

        $path = self::LICENSE_FILE;

        if (!file_exists($path)) {
            return null;
        }

        // Symlink detection
        if (is_link($path)) {
            return null;
        }

        $content = file_get_contents($path);
        if ($content === false) {
            return null;
        }

        $data = json_decode($content, true);
        if (!is_array($data)) {
            return null;
        }

        self::$cache = $data;
        return $data;
    }

    /**
     * Write license data to file (atomic).
     * @param array<string, mixed> $data
     */
    private static function write(array $data): void
    {
        $path = self::LICENSE_FILE;
        $dir = dirname($path);

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        // Atomic write
        $tmpFile = $path . '.tmp.' . bin2hex(random_bytes(4));
        if (file_put_contents($tmpFile, $json, LOCK_EX) === false) {
            if (file_exists($tmpFile)) {
                unlink($tmpFile);
            }
            self::$cache = null;
            throw new \RuntimeException('Failed to write license file.');
        }

        chmod($tmpFile, self::FILE_PERMISSION);

        if (!rename($tmpFile, $path)) {
            if (file_exists($tmpFile)) {
                unlink($tmpFile);
            }
            self::$cache = null;
            throw new \RuntimeException('Failed to finalize license file.');
        }

        self::$cache = $data;
    }
}
