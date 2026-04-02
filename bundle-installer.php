<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - Bundle Installer (Setup Tool)
 *
 * Public release ZIP setup tool. Single-file, no Node.js required.
 * Spec: rulebookdocs/RULEBOOK_Ver2.md Section 2.2
 *
 * @copyright Copyright (c) 2014 - 2026 IEAS Group
 * @copyright Copyright (c) 2014 - 2026 AIZM
 * @license Adlaire License
 */

// --- Security: prevent re-execution ---
$lockFile = __DIR__ . '/files/system/install.lock';
if (file_exists($lockFile)) {
    echo '<!doctype html><html><head><meta charset="utf-8"><title>Adlaire Setup</title></head><body>';
    echo '<h1>Already Installed</h1><p>Adlaire is already installed. Delete <code>install.lock</code> to re-run setup.</p>';
    echo '<p><a href="?login">Login</a> | <a href="?admin">Admin</a></p>';
    echo '</body></html>';
    exit;
}

// --- Load core for FileStorage, esc(), csrf ---
require __DIR__ . '/helpers.php';
require __DIR__ . '/core.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

// --- Detect functions ---

function detect_php_version(): array
{
    $ok = version_compare(PHP_VERSION, '8.3.0', '>=');
    return ['ok' => $ok, 'version' => PHP_VERSION, 'message' => $ok ? 'PHP ' . PHP_VERSION : 'PHP 8.3+ required (current: ' . PHP_VERSION . ')'];
}

function detect_files_writable(): array
{
    $dir = __DIR__ . '/files';
    if (!is_dir($dir)) {
        $created = @mkdir($dir, 0755, true);
        if (!$created) {
            return ['ok' => false, 'message' => 'Cannot create files/ directory'];
        }
    }
    $ok = is_writable($dir);
    return ['ok' => $ok, 'message' => $ok ? 'files/ is writable' : 'files/ is not writable (set 755)'];
}

function detect_session(): array
{
    $ok = session_status() === PHP_SESSION_ACTIVE;
    return ['ok' => $ok, 'message' => $ok ? 'Sessions available' : 'Sessions not available'];
}

function detect_password_hash(): array
{
    $ok = function_exists('password_hash');
    return ['ok' => $ok, 'message' => $ok ? 'password_hash() available' : 'password_hash() not available'];
}

function detect_https(): array
{
    $ok = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    return ['ok' => $ok, 'message' => $ok ? 'HTTPS enabled' : 'HTTPS not detected (recommended)', 'warning' => !$ok];
}

// --- Load functions ---

function load_manifest(): array|false
{
    $path = __DIR__ . '/release-manifest.json';
    if (!file_exists($path)) {
        return false;
    }
    $json = file_get_contents($path);
    if ($json === false) {
        return false;
    }
    $data = json_decode($json, true);
    return is_array($data) ? $data : false;
}

function load_version(): string
{
    $path = __DIR__ . '/VERSION';
    if (!file_exists($path)) {
        return 'unknown';
    }
    return trim((string) file_get_contents($path));
}

// --- Validate functions ---

function validate_input(array $post): array
{
    $errors = [];
    $siteName = trim($post['site_name'] ?? '');
    $locale = $post['default_locale'] ?? '';
    $password = $post['admin_password'] ?? '';
    $confirm = $post['admin_password_confirm'] ?? '';

    if ($siteName === '') {
        $errors[] = 'Site name is required';
    }
    if (!in_array($locale, ['ja', 'en'], true)) {
        $errors[] = 'Invalid language selection';
    }
    if (strlen($password) < 8) {
        $errors[] = 'Password must be at least 8 characters';
    }
    $weak = ['admin', 'password', '12345678', 'adlaire'];
    if (in_array(strtolower($password), $weak, true)) {
        $errors[] = 'That password is too weak';
    }
    if ($password !== $confirm) {
        $errors[] = 'Passwords do not match';
    }

    return $errors;
}

// --- Install functions ---

function install_execute(string $siteName, string $locale, string $password): array
{
    $storage = new FileStorage('files');
    $storage->ensureDirectories();

    // Create system directory
    $systemDir = __DIR__ . '/files/system';
    if (!is_dir($systemDir)) {
        mkdir($systemDir, 0755, true);
    }

    // Save config
    $config = [
        'title' => $siteName,
        'language' => $locale,
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'themeSelect' => 'AP-Default',
        'menu' => "Home<br />\nExample",
        'subside' => '',
        'description' => '',
        'keywords' => '',
        'copyright' => '&copy;' . date('Y') . ' ' . $siteName,
    ];

    $result = $storage->writeConfig($config);
    if (!$result) {
        return ['ok' => false, 'message' => 'Failed to write config. Check files/ permissions.'];
    }

    // Create install.lock
    $lock = [
        'installed' => true,
        'product' => 'Adlaire',
        'version' => load_version(),
        'installed_at' => date('c'),
        'installer' => 'bundle-installer.php',
        'installer_version' => '1.0.0',
    ];
    $lockResult = file_put_contents(
        __DIR__ . '/files/system/install.lock',
        json_encode($lock, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );

    if ($lockResult === false) {
        return ['ok' => false, 'message' => 'Failed to create install.lock'];
    }

    return ['ok' => true, 'message' => 'Installation completed successfully'];
}

// --- Security functions ---

function security_csrf_token(): string
{
    $_SESSION['installer_csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['installer_csrf'];
}

function security_csrf_verify(): bool
{
    $token = $_POST['csrf'] ?? '';
    $session = $_SESSION['installer_csrf'] ?? '';
    if ($token === '' || $session === '' || !hash_equals($session, $token)) {
        return false;
    }
    $_SESSION['installer_csrf'] = bin2hex(random_bytes(32));
    return true;
}

// --- Router ---

$step = (int) ($_REQUEST['step'] ?? 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!security_csrf_verify()) {
        $step = 0;
        $csrfError = true;
    } elseif ($step === 2) {
        // Validate and install
        $errors = validate_input($_POST);
        if (empty($errors)) {
            $result = install_execute(
                trim($_POST['site_name']),
                $_POST['default_locale'],
                $_POST['admin_password']
            );
            if ($result['ok']) {
                $step = 4; // Finish
            } else {
                $installError = $result['message'];
                $step = 2; // Stay on form
            }
        } else {
            $step = 2; // Stay on form with errors
        }
    } else {
        $step = min($step + 1, 4);
    }
}

// --- Render ---

$version = load_version();
$manifest = load_manifest();
$csrf = security_csrf_token();

?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Adlaire Setup — Step <?= $step ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Verdana,sans-serif;background:#f5f5f5;color:#333;line-height:1.6;}
        .wrap{max-width:600px;margin:40px auto;padding:20px;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.1);}
        h1{font-size:22px;color:#1f2b33;margin-bottom:4px;}
        h2{font-size:16px;color:#1ab;margin:16px 0 8px;}
        .version{font-size:12px;color:#888;}
        .steps{display:flex;gap:4px;margin:16px 0;font-size:12px;}
        .steps span{padding:4px 12px;background:#eee;border-radius:12px;color:#666;}
        .steps span.active{background:#1ab;color:#fff;}
        .check{padding:6px 0;font-size:14px;}
        .check.ok::before{content:"✓ ";color:#0a0;}
        .check.fail::before{content:"✗ ";color:#c00;}
        .check.warn::before{content:"⚠ ";color:#f90;}
        .error{background:#fdd;padding:8px 12px;border-radius:4px;color:#c00;margin:8px 0;font-size:14px;}
        label{display:block;margin:12px 0 4px;font-size:13px;color:#666;}
        input,select{width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;}
        button{padding:10px 24px;background:#1ab;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;margin-top:16px;}
        button:hover{background:#099;}
        .links{margin:16px 0;font-size:14px;}
        .links a{color:#1ab;margin-right:12px;}
        .warning{background:#fff3cd;padding:8px 12px;border-radius:4px;color:#856404;margin:8px 0;font-size:13px;}
        .success{background:#d4edda;padding:12px;border-radius:4px;color:#155724;margin:8px 0;}
        hr{border:none;border-top:1px solid #eee;margin:16px 0;}
    </style>
</head>
<body>
<div class="wrap">
    <h1>Adlaire Static CMS Setup</h1>
    <p class="version">Version: <?= esc($version) ?></p>

    <div class="steps">
        <span class="<?= $step <= 0 ? 'active' : '' ?>">Welcome</span>
        <span class="<?= $step === 1 ? 'active' : '' ?>">Check</span>
        <span class="<?= $step === 2 ? 'active' : '' ?>">Config</span>
        <span class="<?= $step === 4 ? 'active' : '' ?>">Complete</span>
    </div>

    <hr>

<?php if ($step === 0): ?>
    <!-- Step 0: Welcome / Release Check -->
    <h2>Welcome</h2>

    <?php if (isset($csrfError)): ?>
        <div class="error">CSRF verification failed. Please try again.</div>
    <?php endif; ?>

    <?php if ($manifest === false): ?>
        <div class="error">release-manifest.json not found. This is not a valid Adlaire release bundle.</div>
    <?php else: ?>
        <p class="check ok">Official release bundle detected</p>
        <p class="check ok">Product: <?= esc($manifest['product'] ?? 'unknown') ?></p>
        <p class="check ok">Version: <?= esc($version) ?></p>

        <?php
        $missingFiles = [];
        foreach ($manifest['required_files'] ?? [] as $rf) {
            if (!file_exists(__DIR__ . '/' . $rf) && !is_dir(__DIR__ . '/' . $rf)) {
                $missingFiles[] = $rf;
            }
        }
        ?>

        <?php if (!empty($missingFiles)): ?>
            <div class="error">Missing required files:
                <ul><?php foreach ($missingFiles as $mf): ?><li><?= esc($mf) ?></li><?php endforeach; ?></ul>
            </div>
        <?php else: ?>
            <p class="check ok">All required files present</p>
            <form method="POST" action="?step=1">
                <input type="hidden" name="csrf" value="<?= esc($csrf) ?>">
                <input type="hidden" name="step" value="0">
                <button type="submit">Next: Environment Check →</button>
            </form>
        <?php endif; ?>
    <?php endif; ?>

<?php elseif ($step === 1): ?>
    <!-- Step 1: Environment Check -->
    <h2>Environment Check</h2>

    <?php
    $checks = [
        detect_php_version(),
        detect_files_writable(),
        detect_session(),
        detect_password_hash(),
        detect_https(),
    ];
    $allOk = true;
    foreach ($checks as $check) {
        $cls = $check['ok'] ? (isset($check['warning']) ? 'warn' : 'ok') : 'fail';
        if (!$check['ok'] && !isset($check['warning'])) {
            $allOk = false;
        }
        echo "<p class='check {$cls}'>" . esc($check['message']) . "</p>";
    }
    ?>

    <?php if ($allOk): ?>
        <form method="POST" action="?step=2">
            <input type="hidden" name="csrf" value="<?= esc($csrf) ?>">
            <input type="hidden" name="step" value="1">
            <button type="submit">Next: Site Configuration →</button>
        </form>
    <?php else: ?>
        <div class="error">Please fix the issues above before continuing.</div>
    <?php endif; ?>

<?php elseif ($step === 2): ?>
    <!-- Step 2: Site Configuration -->
    <h2>Site Configuration</h2>

    <?php if (!empty($errors ?? [])): ?>
        <div class="error">
            <?php foreach ($errors as $e): ?><p><?= esc($e) ?></p><?php endforeach; ?>
        </div>
    <?php endif; ?>

    <?php if (isset($installError)): ?>
        <div class="error"><?= esc($installError) ?></div>
    <?php endif; ?>

    <form method="POST" action="?step=2">
        <input type="hidden" name="csrf" value="<?= esc($csrf) ?>">
        <input type="hidden" name="step" value="2">

        <label>Site Name *</label>
        <input type="text" name="site_name" value="<?= esc($_POST['site_name'] ?? '') ?>" required>

        <label>Default Language *</label>
        <select name="default_locale">
            <option value="ja" <?= ($_POST['default_locale'] ?? 'ja') === 'ja' ? 'selected' : '' ?>>日本語</option>
            <option value="en" <?= ($_POST['default_locale'] ?? '') === 'en' ? 'selected' : '' ?>>English</option>
        </select>

        <label>Admin Password * (min 8 characters)</label>
        <input type="password" name="admin_password" minlength="8" required>

        <label>Confirm Password *</label>
        <input type="password" name="admin_password_confirm" minlength="8" required>

        <button type="submit">Install →</button>
    </form>

<?php elseif ($step === 4): ?>
    <!-- Step 4: Finish -->
    <h2>Installation Complete</h2>

    <div class="success">
        <strong>Adlaire has been successfully installed!</strong>
    </div>

    <div class="links">
        <a href="?login">→ Login</a>
        <a href="?admin">→ Admin Dashboard</a>
    </div>

    <hr>
    <div class="warning">
        <strong>Security Notice:</strong> Please delete <code>bundle-installer.php</code> from your server immediately.
        <?php
        // Attempt self-delete
        $deleted = @unlink(__FILE__);
        if ($deleted): ?>
            <p>✓ Installer has been automatically deleted.</p>
        <?php else: ?>
            <p>⚠ Auto-delete failed. Please manually delete <code>bundle-installer.php</code>.</p>
        <?php endif; ?>
    </div>

<?php endif; ?>

</div>
</body>
</html>
