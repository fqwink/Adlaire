<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - Helpers
 *
 * Utility functions: escaping, CSRF, rate limiting.
 * No dependencies.
 *
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group
 * @copyright Copyright (c) 2014 - 2026 倉田和宏
 * @license Adlaire License Ver.2.0 (Open Source - Platform Code)
 */

function esc(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function csrf_token(): string
{
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

function csrf_verify(): bool
{
    $token = $_POST['csrf'] ?? $_REQUEST['csrf'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $session = $_SESSION['csrf'] ?? '';
    if ($token === '' || $session === '' || !hash_equals($session, $token)) {
        return false;
    }
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return true;
}

/**
 * @return bool true if attempt is allowed, false if rate-limited
 */
function login_rate_check(): bool
{
    $maxAttempts = 5;
    $windowSeconds = 300;
    $now = time();

    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $rateDir = __DIR__ . '/../data/system';
    if (!is_dir($rateDir)) {
        @mkdir($rateDir, 0755, true);
    }
    $rateFile = $rateDir . '/rate_' . md5($ip) . '.json';

    $attempts = [];
    if (is_file($rateFile)) {
        $fp = fopen($rateFile, 'r');
        if ($fp !== false) {
            flock($fp, LOCK_SH);
            $raw = stream_get_contents($fp);
            flock($fp, LOCK_UN);
            fclose($fp);
            $decoded = json_decode($raw ?: '[]', true);
            if (is_array($decoded)) {
                $attempts = $decoded;
            }
        }
    }

    $attempts = array_values(array_filter($attempts, fn(int $t) => ($now - $t) < $windowSeconds));

    if (count($attempts) >= $maxAttempts) {
        return false;
    }

    $attempts[] = $now;
    $fp = fopen($rateFile, 'c');
    if ($fp !== false) {
        flock($fp, LOCK_EX);
        ftruncate($fp, 0);
        fwrite($fp, json_encode($attempts));
        flock($fp, LOCK_UN);
        fclose($fp);
        @chmod($rateFile, 0600);
    }

    return true;
}
