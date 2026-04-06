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
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function csrf_token(): string
{
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

function csrf_verify(): bool
{
    $token = $_POST['csrf'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($token) || $token === '' || strlen($token) > 128) {
        return false;
    }
    $session = $_SESSION['csrf'] ?? '';
    if (!is_string($session) || $session === '') {
        return false;
    }
    if (!hash_equals($session, $token)) {
        return false;
    }
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return true;
}

/** Maximum login attempts within the rate limit window */
const LOGIN_MAX_ATTEMPTS = 5;

/** Rate limit window in seconds */
const LOGIN_WINDOW_SECONDS = 300;

/** Rate file hash algorithm */
const RATE_HASH_ALGO = 'sha256';

function login_rate_check(): bool
{
    $now = time();

    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    if (!is_string($ip) || !filter_var($ip, FILTER_VALIDATE_IP)) {
        $ip = '127.0.0.1';
    }
    $rateDir = __DIR__ . '/../data/system';
    if (!is_dir($rateDir)) {
        if (!@mkdir($rateDir, 0755, true) && !is_dir($rateDir)) {
            return true;
        }
    }
    $rateFile = $rateDir . '/rate_' . hash(RATE_HASH_ALGO, $ip) . '.json';

    $attempts = [];
    if (is_file($rateFile)) {
        $fp = fopen($rateFile, 'r');
        if ($fp !== false) {
            $locked = flock($fp, LOCK_SH | LOCK_NB) || flock($fp, LOCK_SH);
            if (!$locked) {
                fclose($fp);
                return true; // Allow login on lock failure
            }
            $raw = stream_get_contents($fp);
            flock($fp, LOCK_UN);
            fclose($fp);
            $decoded = json_decode(is_string($raw) && $raw !== '' ? $raw : '[]', true);
            if (is_array($decoded)) {
                $attempts = $decoded;
            }
        }
    }

    $attempts = array_values(array_filter($attempts, fn(mixed $t) => is_int($t) && $t > 0 && ($now - $t) < LOGIN_WINDOW_SECONDS));
    $attemptCount = count($attempts);

    if ($attemptCount >= LOGIN_MAX_ATTEMPTS) {
        // Write back the filtered attempts to keep the rate file current
        if (is_file($rateFile)) {
            $fp = fopen($rateFile, 'r+');
            if ($fp !== false) {
                if (!flock($fp, LOCK_EX)) {
                    fclose($fp);
                    return false;
                }
                ftruncate($fp, 0);
                rewind($fp);
                $encoded = json_encode($attempts);
                if ($encoded !== false) {
                    fwrite($fp, $encoded);
                }
                fflush($fp);
                flock($fp, LOCK_UN);
                fclose($fp);
            }
        }
        return false;
    }

    $attempts[] = $now;
    if (!is_file($rateFile)) {
        if (@file_put_contents($rateFile, '[]', LOCK_EX) === false) {
            error_log('Adlaire: Failed to create rate limit file: ' . $rateFile);
            return true;
        }
        @chmod($rateFile, 0600);
    }
    $fp = fopen($rateFile, 'r+');
    if ($fp !== false) {
        if (!flock($fp, LOCK_EX)) {
            fclose($fp);
            return true;
        }
        ftruncate($fp, 0);
        rewind($fp);
        $encoded = json_encode($attempts);
        if ($encoded === false || fwrite($fp, $encoded) === false) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, '[]');
        }
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        @chmod($rateFile, 0600);
    }

    return true;
}
