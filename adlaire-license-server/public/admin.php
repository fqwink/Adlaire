<?php
declare(strict_types=1);

/**
 * Adlaire License Server — Admin Dashboard
 * Spec: LICENSE_SERVER_RULEBOOK.md §6
 *
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 */

require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/KeyGenerator.php';
require_once __DIR__ . '/../src/Auth.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_samesite', 'Strict');
    session_start();
}

$db = Database::getInstance(__DIR__ . '/../data/license.db');
$pdo = $db->pdo();

$action = $_GET['action'] ?? 'dashboard';

// Login handling
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = (string) ($_POST['username'] ?? '');
    $password = (string) ($_POST['password'] ?? '');
    if (Auth::login($username, $password)) {
        header('Location: admin.php');
        exit;
    }
    $loginError = 'Invalid credentials';
}

if ($action === 'logout') {
    Auth::logout();
    header('Location: admin.php?action=login');
    exit;
}

// Auth gate
if (!Auth::isLoggedIn() && $action !== 'login') {
    header('Location: admin.php?action=login');
    exit;
}

$esc = fn(string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

// --- Actions (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && Auth::isLoggedIn()) {
    if ($action === 'revoke' && isset($_POST['license_id'])) {
        $stmt = $pdo->prepare('UPDATE licenses SET status = \'revoked\' WHERE id = ?');
        $stmt->execute([(int) $_POST['license_id']]);
        header('Location: admin.php');
        exit;
    }

    if ($action === 'create-contract' && isset($_POST['license_id'], $_POST['contract_code'])) {
        $tpk = KeyGenerator::thirdPartyKey();
        $stmt = $pdo->prepare('
            INSERT INTO contracts (license_id, third_party_key, contract_code, contractor_name, contractor_email, issued_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            (int) $_POST['license_id'],
            $tpk,
            (string) $_POST['contract_code'],
            (string) ($_POST['contractor_name'] ?? ''),
            (string) ($_POST['contractor_email'] ?? ''),
            gmdate('c'),
            (string) ($_POST['expires_at'] ?? ''),
        ]);
        header('Location: admin.php?action=detail&id=' . (int) $_POST['license_id']);
        exit;
    }
}

// --- Views ---
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Adlaire License Server — Admin</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;padding:20px;background:#f5f5f5;color:#333}
.wrap{max-width:960px;margin:0 auto;background:#fff;padding:24px;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
h1{font-size:1.4em;margin:0 0 20px}
table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #eee}
th{background:#f9f9f9;font-weight:600}
.btn{display:inline-block;padding:6px 14px;background:#1ab;color:#fff;border:none;border-radius:3px;cursor:pointer;text-decoration:none;font-size:.9em}
.btn:hover{opacity:.9}
.btn-danger{background:#c33}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:.8em;color:#fff}
.badge-active{background:#2a7}
.badge-revoked{background:#c33}
input,select{padding:6px 10px;border:1px solid #ccc;border-radius:3px;font-size:.9em}
.stats{display:flex;gap:20px;margin:0 0 20px}
.stat-box{flex:1;padding:16px;background:#f0f8ff;border-radius:4px;text-align:center}
.stat-box strong{display:block;font-size:1.6em;color:#1ab}
nav{margin:0 0 20px;padding:0 0 12px;border-bottom:1px solid #eee}
nav a{margin-right:16px;text-decoration:none;color:#1ab;font-weight:600}
.error{color:#c33;margin:8px 0}
</style>
</head>
<body>
<div class="wrap">
<?php if ($action === 'login'): ?>
    <h1>Admin Login</h1>
    <?php if (isset($loginError)): ?><p class="error"><?= $esc($loginError) ?></p><?php endif; ?>
    <form method="POST" action="admin.php?action=login">
        <p><input name="username" placeholder="Username" required></p>
        <p><input name="password" type="password" placeholder="Password" required></p>
        <p><button class="btn" type="submit">Login</button></p>
    </form>

<?php elseif ($action === 'detail' && isset($_GET['id'])): ?>
    <?php
    $stmt = $pdo->prepare('SELECT * FROM licenses WHERE id = ?');
    $stmt->execute([(int) $_GET['id']]);
    $lic = $stmt->fetch();
    ?>
    <nav><a href="admin.php">Dashboard</a><a href="admin.php?action=logout">Logout</a></nav>
    <?php if ($lic): ?>
    <h1>License #<?= (int) $lic['id'] ?></h1>
    <table>
        <tr><th>System Key</th><td><?= $esc(substr($lic['system_key'], 0, 16) . '...') ?></td></tr>
        <tr><th>Primary Key</th><td><?= $esc($lic['primary_key']) ?></td></tr>
        <tr><th>Second Key</th><td><?= $esc($lic['second_key']) ?></td></tr>
        <tr><th>Domain</th><td><?= $esc($lic['domain']) ?></td></tr>
        <tr><th>Version</th><td><?= $esc($lic['product_version']) ?></td></tr>
        <tr><th>Status</th><td><span class="badge badge-<?= $esc($lic['status']) ?>"><?= $esc($lic['status']) ?></span></td></tr>
        <tr><th>Registered</th><td><?= $esc($lic['registered_at']) ?></td></tr>
        <tr><th>Last Verified</th><td><?= $esc($lic['last_verified_at'] ?? 'Never') ?></td></tr>
        <tr><th>IP</th><td><?= $esc($lic['ip_address']) ?></td></tr>
    </table>

    <?php if ($lic['status'] === 'active'): ?>
    <form method="POST" action="admin.php?action=revoke" style="margin:12px 0">
        <input type="hidden" name="license_id" value="<?= (int) $lic['id'] ?>">
        <button class="btn btn-danger" type="submit" onclick="return confirm('Revoke this license?')">Revoke</button>
    </form>
    <?php endif; ?>

    <h2 style="margin-top:24px">Contracts</h2>
    <?php
    $stmt = $pdo->prepare('SELECT * FROM contracts WHERE license_id = ? ORDER BY issued_at DESC');
    $stmt->execute([(int) $lic['id']]);
    $contracts = $stmt->fetchAll();
    ?>
    <?php if (count($contracts) > 0): ?>
    <table>
        <tr><th>TPK</th><th>Code</th><th>Name</th><th>Status</th><th>Expires</th></tr>
        <?php foreach ($contracts as $c): ?>
        <tr>
            <td><?= $esc(substr($c['third_party_key'], 0, 20) . '...') ?></td>
            <td><?= $esc($c['contract_code']) ?></td>
            <td><?= $esc($c['contractor_name']) ?></td>
            <td><span class="badge badge-<?= $esc($c['status']) ?>"><?= $esc($c['status']) ?></span></td>
            <td><?= $esc($c['expires_at'] ?? 'None') ?></td>
        </tr>
        <?php endforeach; ?>
    </table>
    <?php else: ?>
    <p>No contracts.</p>
    <?php endif; ?>

    <h3>Issue Third-Party Key</h3>
    <form method="POST" action="admin.php?action=create-contract">
        <input type="hidden" name="license_id" value="<?= (int) $lic['id'] ?>">
        <p><input name="contract_code" placeholder="Contract Code" required></p>
        <p><input name="contractor_name" placeholder="Contractor Name"></p>
        <p><input name="contractor_email" placeholder="Email"></p>
        <p><input name="expires_at" type="date" placeholder="Expires"></p>
        <p><button class="btn" type="submit">Issue Key</button></p>
    </form>
    <?php else: ?>
    <p>License not found.</p>
    <?php endif; ?>

<?php elseif ($action === 'audit'): ?>
    <nav><a href="admin.php">Dashboard</a><a href="admin.php?action=audit">Audit Log</a><a href="admin.php?action=logout">Logout</a></nav>
    <h1>Audit Log</h1>
    <?php
    $stmt = $pdo->query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200');
    $logs = $stmt->fetchAll();
    ?>
    <table>
        <tr><th>Time</th><th>Action</th><th>System Key</th><th>IP</th><th>Details</th></tr>
        <?php foreach ($logs as $log): ?>
        <tr>
            <td><?= $esc($log['created_at']) ?></td>
            <td><?= $esc($log['action']) ?></td>
            <td><?= $esc($log['system_key'] ? substr($log['system_key'], 0, 12) . '...' : '') ?></td>
            <td><?= $esc($log['ip_address'] ?? '') ?></td>
            <td><?= $esc($log['details'] ?? '') ?></td>
        </tr>
        <?php endforeach; ?>
    </table>

<?php else: /* dashboard */ ?>
    <nav><a href="admin.php">Dashboard</a><a href="admin.php?action=audit">Audit Log</a><a href="admin.php?action=logout">Logout</a></nav>
    <h1>Adlaire License Server — Dashboard</h1>
    <?php
    $totalLicenses = (int) $pdo->query('SELECT COUNT(*) FROM licenses')->fetchColumn();
    $activeLicenses = (int) $pdo->query('SELECT COUNT(*) FROM licenses WHERE status = \'active\'')->fetchColumn();
    $commercialCount = (int) $pdo->query('SELECT COUNT(*) FROM contracts WHERE status = \'active\'')->fetchColumn();
    ?>
    <div class="stats">
        <div class="stat-box"><strong><?= $totalLicenses ?></strong>Total Licenses</div>
        <div class="stat-box"><strong><?= $activeLicenses ?></strong>Active</div>
        <div class="stat-box"><strong><?= $commercialCount ?></strong>Commercial</div>
    </div>

    <h2>Licenses</h2>
    <?php
    $search = (string) ($_GET['q'] ?? '');
    if ($search !== '') {
        $stmt = $pdo->prepare('SELECT * FROM licenses WHERE domain LIKE ? OR system_key LIKE ? ORDER BY registered_at DESC LIMIT 100');
        $term = '%' . $search . '%';
        $stmt->execute([$term, $term]);
    } else {
        $stmt = $pdo->query('SELECT * FROM licenses ORDER BY registered_at DESC LIMIT 100');
    }
    $licenses = $stmt->fetchAll();
    ?>
    <form method="GET" action="admin.php" style="margin:0 0 12px">
        <input name="q" value="<?= $esc($search) ?>" placeholder="Search domain or key...">
        <button class="btn" type="submit">Search</button>
    </form>
    <table>
        <tr><th>#</th><th>Domain</th><th>Version</th><th>Status</th><th>Registered</th><th></th></tr>
        <?php foreach ($licenses as $lic): ?>
        <tr>
            <td><?= (int) $lic['id'] ?></td>
            <td><?= $esc($lic['domain']) ?></td>
            <td><?= $esc($lic['product_version']) ?></td>
            <td><span class="badge badge-<?= $esc($lic['status']) ?>"><?= $esc($lic['status']) ?></span></td>
            <td><?= $esc($lic['registered_at']) ?></td>
            <td><a class="btn" href="admin.php?action=detail&id=<?= (int) $lic['id'] ?>">Detail</a></td>
        </tr>
        <?php endforeach; ?>
    </table>
<?php endif; ?>
</div>
</body>
</html>
