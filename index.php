<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - Entry Point
 *
 * Version: Ver.{Major}.{Minor}-{Build}
 *   Major  - Incremented on breaking changes. Resets Minor to 0.
 *   Minor  - Incremented on backward-compatible feature additions.
 *   Build  - Cumulative revision number. Never resets.
 *
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group
 * @copyright Copyright (c) 2014 - 2026 倉田和宏
 * @license Adlaire License Ver.2.0 (Open Source - Platform Code)
 */

if (ob_get_level() === 0) {
    ob_start();
}

register_shutdown_function(function (): void {
    if (ob_get_level() > 0) {
        ob_end_flush();
    }
});

ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_only_cookies', '1');
ini_set('session.use_trans_sid', '0');
$isHttpsDetected = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (int) ($_SERVER['SERVER_PORT'] ?? 0) === 443;
if ($isHttpsDetected) {
    ini_set('session.cookie_secure', '1');
}
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

require __DIR__ . '/Core/helpers.php';
require __DIR__ . '/Core/license.php';
require __DIR__ . '/Core/core.php';
require __DIR__ . '/Core/app.php';
require __DIR__ . '/Core/renderer.php';
require __DIR__ . '/Core/api.php';
require __DIR__ . '/Core/generator.php';

// --- Bootstrap ---

// Redirect to installer if not yet set up
if (!file_exists(__DIR__ . '/data/system/install.lock') && file_exists(__DIR__ . '/bundle-installer.php')) {
    header('Location: bundle-installer.php');
    exit;
}

// --- License gate ---
$licenseError = LicenseManager::check();
if ($licenseError !== null) {
    http_response_code(503);
    $safeMsg = htmlspecialchars($licenseError, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    echo "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Adlaire - License Required</title></head>";
    echo "<body style=\"font-family:sans-serif;text-align:center;padding:60px 20px\">";
    echo "<h1>503 Service Unavailable</h1><p>{$safeMsg}</p>";
    echo "<p><a href=\"?admin\">License Settings</a></p></body></html>";
    exit;
}

$nonce = bin2hex(random_bytes(16));

// --- Security headers ---
$cspHeader = "Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{$nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'";
header($cspHeader);
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

handleApi();
handleEdit();

$app = App::getInstance();
$app->nonce = $nonce;

// --- Admin UI routing ---
if (isset($_GET['admin'])) {
    if (!$app->isLoggedIn()) {
        header('Location: ?login');
        exit;
    }
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    require __DIR__ . '/Core/admin-ui.php';
    ob_end_flush();
    exit;
}

if ($app->is404() && !$app->isLoggedIn()) {
    http_response_code(404);
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo '<!doctype html><html><head><meta charset="utf-8"><title>404</title></head><body>';
    echo '<h1>404 Not Found</h1><p>' . esc($app->config['content'] ?? '') . '</p>';
    echo '</body></html>';
    ob_end_flush();
    exit;
}

// --- Preview routing ---
if (isset($_GET['preview'])) {
    $previewSlug = $_GET['preview'];
    if (!$app->isLoggedIn()) {
        header('Location: ?login');
        exit;
    }
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    header('X-Robots-Tag: noindex, nofollow');
    if (is_string($previewSlug) && FileStorage::validateSlug($previewSlug)) {
        $previewData = $app->storage->readPageData($previewSlug);
        if ($previewData !== false) {
            $app->config['page'] = $previewSlug;
            $app->config['content'] = $previewData['content'];
            $app->config['pageFormat'] = $previewData['format'] ?? 'blocks';
            $app->config['pageStatus'] = $previewData['status'] ?? 'published';
            if (isset($previewData['blocks'])) {
                $app->config['pageBlocks'] = $previewData['blocks'];
            }
        }
    }
}

// --- Public page rendering ---
$theme = basename($app->config['themeSelect']);
$themePath = __DIR__ . '/themes/' . $theme . '/theme.php';
$themesBase = realpath(__DIR__ . '/themes');
$realThemePath = ($themesBase !== false && is_file($themePath)) ? realpath($themePath) : false;
if ($realThemePath === false || $themesBase === false || !str_starts_with($realThemePath, $themesBase . DIRECTORY_SEPARATOR)) {
    $theme = 'AP-Default';
    $themePath = __DIR__ . '/themes/' . $theme . '/theme.php';
    $realThemePath = realpath($themePath);
}
if ($realThemePath === false || !is_file($realThemePath)) {
    error_log('Adlaire: Theme file not found or invalid: ' . $theme);
    http_response_code(500);
    exit;
}
require $realThemePath;

ob_end_flush();
exit;
