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
    if (!isset($_SESSION['csrf']) || $_SESSION['csrf'] === '') {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_verify(): void
{
    $token = $_POST['csrf'] ?? $_REQUEST['csrf'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $session = $_SESSION['csrf'] ?? '';
    if ($token === '' || $session === '' || !hash_equals($session, $token)) {
        header('HTTP/1.1 403 Forbidden');
        exit;
    }
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

/**
 * @return bool true if attempt is allowed, false if rate-limited
 */
function login_rate_check(): bool
{
    $maxAttempts = 5;
    $windowSeconds = 300;
    $now = time();

    $_SESSION['login_attempts'] ??= [];
    $_SESSION['login_attempts'] = array_values(array_filter(
        $_SESSION['login_attempts'],
        fn(int $t) => ($now - $t) < $windowSeconds
    ));

    if (count($_SESSION['login_attempts']) >= $maxAttempts) {
        return false;
    }

    $_SESSION['login_attempts'][] = $now;
    return true;
}
