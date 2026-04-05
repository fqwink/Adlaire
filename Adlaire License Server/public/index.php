<?php
declare(strict_types=1);

/**
 * Adlaire License Server — API Router
 *
 * Public entry point for all API requests.
 * Spec: LICENSE_SERVER_RULEBOOK.md Ver.1.0
 *
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 */

require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/KeyGenerator.php';
require_once __DIR__ . '/../src/KeyValidator.php';
require_once __DIR__ . '/../src/ApiHandler.php';
require_once __DIR__ . '/../src/Auth.php';

// HTTPS enforcement
if (($_SERVER['HTTPS'] ?? '') !== 'on' && ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') !== 'https') {
    if (($_SERVER['SERVER_NAME'] ?? '') !== 'localhost' && ($_SERVER['SERVER_NAME'] ?? '') !== '127.0.0.1') {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'HTTPS required']);
        exit;
    }
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = is_string($path) ? $path : '/';

// Normalize path
$basePath = dirname($_SERVER['SCRIPT_NAME'] ?? '/');
if ($basePath !== '/' && str_starts_with($path, $basePath)) {
    $path = substr($path, strlen($basePath));
}
$path = '/' . ltrim($path, '/');

$db = Database::getInstance(__DIR__ . '/../data/license.db');
$handler = new ApiHandler($db);

match (true) {
    $path === '/api/license/register' && $method === 'POST'
        => $handler->register(),
    $path === '/api/license/verify' && $method === 'POST'
        => $handler->verify(),
    $path === '/api/license/renew' && $method === 'POST'
        => $handler->renew(),
    $path === '/api/license/third-party' && $method === 'POST'
        => $handler->thirdParty(),
    default => (function () {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Not found']);
    })(),
};
