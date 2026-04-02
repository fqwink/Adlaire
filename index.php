<?php
declare(strict_types=1);

/**
 * Adlaire Platform - Entry Point
 *
 * Version: Ver.{Major}.{Minor}-{Build}
 *   Major  - Incremented on breaking changes. Resets Minor to 0.
 *   Minor  - Incremented on backward-compatible feature additions.
 *   Build  - Cumulative revision number. Never resets.
 *
 * @copyright Copyright (c) 2014 - 2026 IEAS Group
 * @copyright Copyright (c) 2014 - 2026 AIZM
 * @license Adlaire License
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

require __DIR__ . '/helpers.php';
require __DIR__ . '/core.php';
require __DIR__ . '/app.php';
require __DIR__ . '/renderer.php';
require __DIR__ . '/api.php';
require __DIR__ . '/generator.php';

// --- Bootstrap ---

// Redirect to installer if not yet set up
if (!file_exists(__DIR__ . '/files/system/install.lock') && file_exists(__DIR__ . '/bundle-installer.php')) {
    header('Location: bundle-installer.php');
    exit;
}

handleApi();
handleEdit();

$app = App::getInstance();

// --- Security headers ---
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'");

// --- Admin UI routing ---
if (isset($_REQUEST['admin'])) {
    if (!$app->isLoggedIn()) {
        header('Location: ?login');
        exit;
    }
    require __DIR__ . '/admin-ui.php';
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
