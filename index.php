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
 * @license Adlaire License Ver.2.0 (Platform Code)
 */

ob_start();

register_shutdown_function(function (): void {
    if (ob_get_level() > 0) {
        ob_end_flush();
    }
});

ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_samesite', 'Strict');
session_start();

require __DIR__ . '/Core/helpers.php';
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

handleApi();
handleEdit();

$app = App::getInstance();

// --- Security headers ---
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'");

// --- Admin UI routing ---
if (isset($_GET['admin'])) {
    if (!$app->isLoggedIn()) {
        header('Location: ?login');
        exit;
    }
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'");
    require __DIR__ . '/Core/admin-ui.php';
    ob_end_flush();
    exit;
}

// --- Public page rendering ---
$theme = basename($app->config['themeSelect']);
$themePath = 'themes/' . $theme . '/theme.php';
if (!is_file($themePath)) {
    $theme = 'AP-Default';
    $themePath = 'themes/' . $theme . '/theme.php';
}
require $themePath;

ob_end_flush();
