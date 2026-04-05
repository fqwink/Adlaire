<?php
declare(strict_types=1);

/**
 * Admin authentication for Adlaire License Server.
 * Spec: LICENSE_SERVER_RULEBOOK.md §6.1
 */
final class Auth
{
    private const CREDENTIALS_FILE = __DIR__ . '/../data/admin.json';
    private const SESSION_TIMEOUT = 1800; // 30 minutes

    public static function isLoggedIn(): bool
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        if (!isset($_SESSION['admin_auth']) || $_SESSION['admin_auth'] !== true) {
            return false;
        }

        $lastActivity = $_SESSION['admin_last_activity'] ?? 0;
        if (!is_int($lastActivity) || (time() - $lastActivity) > self::SESSION_TIMEOUT) {
            self::logout();
            return false;
        }

        $_SESSION['admin_last_activity'] = time();
        return true;
    }

    public static function login(string $username, string $password): bool
    {
        $credentials = self::loadCredentials();
        if ($credentials === null) {
            return false;
        }

        $storedUser = $credentials['username'] ?? '';
        $storedHash = $credentials['password'] ?? '';

        if ($username === '' || $storedUser === '' || $storedHash === '') {
            return false;
        }

        if (!hash_equals($storedUser, $username)) {
            return false;
        }

        if (!password_verify($password, $storedHash)) {
            return false;
        }

        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }

        session_regenerate_id(true);
        $_SESSION['admin_auth'] = true;
        $_SESSION['admin_user'] = $username;
        $_SESSION['admin_last_activity'] = time();

        return true;
    }

    public static function logout(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
        $_SESSION = [];
        session_regenerate_id(true);
        session_destroy();
    }

    /**
     * @return array{username: string, password: string}|null
     */
    private static function loadCredentials(): ?array
    {
        $path = self::CREDENTIALS_FILE;
        if (!file_exists($path) || is_link($path)) {
            return null;
        }

        $content = file_get_contents($path);
        if ($content === false) {
            return null;
        }

        $data = json_decode($content, true);
        return is_array($data) ? $data : null;
    }
}
