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
 * @copyright Copyright (c) 2014 - 2015 IEAS Group
 * @copyright Copyright (c) 2014 - 2015 AIZM
 * @license Adlaire License
 */

ob_start();

// Ensure output buffer is flushed even on fatal errors
register_shutdown_function(function (): void {
    if (ob_get_level() > 0) {
        ob_end_flush();
    }
});

ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
session_start();

require __DIR__ . '/core.php';
require __DIR__ . '/admin.php';

// --- Bootstrap ---

handleApi();
handleEdit();

$app = App::getInstance();

$theme = basename($app->config['themeSelect']);
$themePath = 'themes/' . $theme . '/theme.php';
if (!is_file($themePath)) {
    $theme = 'AP-Default';
    $themePath = 'themes/' . $theme . '/theme.php';
}
require $themePath;

ob_end_flush();
