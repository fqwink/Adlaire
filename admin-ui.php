<?php
declare(strict_types=1);

/**
 * Adlaire Platform - Admin UI Template
 *
 * Dedicated admin interface, separated from public theme templates.
 * Spec: RULEBOOK.md Section 7
 *
 * @var App $app
 */

$c = $app->config;
$adminAction = $_REQUEST['admin'] ?? 'dashboard';
?>
<!doctype html>
<html lang="<?= esc($app->language) ?>">
<head>
    <meta charset="utf-8">
    <title><?= esc($c['title']) ?> - Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <link rel="stylesheet" href="themes/<?= esc($c['themeSelect']) ?>/style.css">
    <style>
        .admin-wrap{max-width:960px;margin:20px auto;padding:0 20px;color:#333;font-family:Verdana,sans-serif;}
        .admin-header{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:2px solid #1ab;}
        .admin-header h1{margin:0;font-size:20px;color:#1f2b33;}
        .admin-header a{color:#1ab;text-decoration:none;border:none;margin-left:16px;}
        .admin-header a:hover{text-decoration:underline;}
        .admin-nav{display:flex;gap:8px;margin:16px 0;}
        .admin-nav a{padding:6px 16px;background:#1f2b33;color:#fff;border-radius:4px;text-decoration:none;border:none;font-size:13px;}
        .admin-nav a.active,.admin-nav a:hover{background:#1ab;}
        .admin-section{margin:20px 0;}
        .admin-section h2{font-size:16px;color:#1f2b33;border-bottom:1px solid #ddd;padding-bottom:6px;}
        .admin-table{width:100%;border-collapse:collapse;font-size:14px;}
        .admin-table th,.admin-table td{text-align:left;padding:8px 12px;border-bottom:1px solid #eee;}
        .admin-table th{background:#f5f5f5;color:#666;font-weight:normal;text-transform:uppercase;font-size:12px;}
        .admin-table tr:hover{background:#f9f9f9;}
        .admin-table .actions a{margin-right:8px;color:#1ab;text-decoration:none;border:none;}
        .admin-table .status-draft{color:#f90;font-weight:bold;}
        .admin-table .status-published{color:#0a0;}
        .admin-form{max-width:480px;}
        .admin-form label{display:block;margin:12px 0 4px;font-size:13px;color:#666;}
        .admin-form input,.admin-form select,.admin-form textarea{width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;box-sizing:border-box;}
        .admin-form textarea{min-height:80px;resize:vertical;}
        .admin-form button,.admin-btn{padding:8px 20px;background:#1ab;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;text-decoration:none;}
        .admin-form button:hover,.admin-btn:hover{background:#099;}
        .admin-btn--danger{background:#c33;}
        .admin-btn--danger:hover{background:#a00;}
        .admin-btn--outline{background:none;border:1px solid #ddd;color:#666;}
        .admin-btn--outline:hover{background:#f5f5f5;}
        .admin-editor-area{margin:16px 0;background:#fff;border:1px solid #ddd;border-radius:4px;padding:16px;min-height:300px;}
        .admin-sidebar{margin:20px 0;padding:16px;background:#f9f9f9;border:1px solid #eee;border-radius:4px;}
        .admin-sidebar h3{margin:0 0 8px;font-size:14px;}
        .admin-sidebar ul{list-style:none;padding:0;margin:0;}
        .admin-sidebar li{padding:4px 0;font-size:13px;display:flex;justify-content:space-between;}
        .admin-sidebar li a{color:#1ab;text-decoration:none;border:none;}
        .admin-meta{display:flex;gap:12px;align-items:center;margin:12px 0;flex-wrap:wrap;}
        .admin-meta select,.admin-meta button{font-size:13px;}
    </style>
<?php $app->scriptTags(); ?>
<?php $app->editTags(); ?>
</head>
<body>
<div class="admin-wrap">
    <header class="admin-header">
        <h1><?= esc($c['title']) ?> — Admin <small style="font-size:12px;color:#888;font-weight:normal;"><?= App::VERSION ?></small></h1>
        <div>
            <a href="./">← <?= esc($app->t('login')) === 'Login' ? 'View Site' : 'サイト表示' ?></a>
            <a href="<?= esc($app->host) ?>?logout"><?= esc($app->t('logout')) ?></a>
        </div>
    </header>

    <nav class="admin-nav">
        <a href="?admin" class="<?= $adminAction === 'dashboard' || $adminAction === '' ? 'active' : '' ?>">Dashboard</a>
        <a href="?admin=new">+ New Page</a>
    </nav>

<?php
match ($adminAction) {
    'edit'      => renderAdminEditor($app),
    'new'       => renderAdminNewPage($app),
    default     => renderAdminDashboard($app),
};
?>

</div>
</body>
</html>
<?php

function renderAdminDashboard(App $app): void
{
    $pages = $app->storage->listPages();

    // --- Page List ---
    echo '<section class="admin-section">';
    echo '<h2>Pages</h2>';
    echo '<table class="admin-table">';
    echo '<thead><tr><th>Slug</th><th>Format</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>';
    echo '<tbody>';
    foreach ($pages as $slug => $data) {
        $safeSlug = esc($slug);
        $format = esc($data['format'] ?? 'blocks');
        $status = $data['status'] ?? 'published';
        $statusClass = $status === 'draft' ? 'status-draft' : 'status-published';
        $updated = substr($data['updated_at'] ?? '', 0, 10);
        echo "<tr>";
        echo "<td><a href='?admin=edit&page={$safeSlug}'>{$safeSlug}</a></td>";
        echo "<td>{$format}</td>";
        echo "<td class='{$statusClass}'>{$status}</td>";
        echo "<td>{$updated}</td>";
        echo "<td class='actions'><a href='?admin=edit&page={$safeSlug}'>Edit</a><a href='{$safeSlug}' target='_blank'>View</a></td>";
        echo "</tr>";
    }
    if (empty($pages)) {
        echo '<tr><td colspan="5" style="text-align:center;color:#999;">No pages yet</td></tr>';
    }
    echo '</tbody></table>';
    echo '</section>';

    // --- Settings ---
    echo '<section class="admin-section">';
    echo '<h2>' . esc($app->t('settings')) . '</h2>';
    echo '<div class="admin-form">';

    $fields = ['title', 'description', 'keywords', 'copyright'];
    foreach ($fields as $key) {
        $label = esc(ucfirst($key));
        $value = esc((string) ($app->config[$key] ?? ''));
        $default = esc((string) ($app->defaults[$key] ?? ''));
        echo "<label>{$label}</label>";
        echo "<input type='text' value='{$value}' placeholder='{$default}' onchange='fieldSave(\"{$key}\", this.value)'>";
    }

    // Menu
    $menuLabel = esc($app->t('settings_menu'));
    $menuVal = esc($app->config['menu'] ?? '');
    echo "<label>{$menuLabel}</label>";
    echo "<textarea onchange='fieldSave(\"menu\", this.value)'>{$menuVal}</textarea>";

    // Theme
    $themeLabel = esc($app->t('settings_theme'));
    echo "<label>{$themeLabel}</label>";
    echo "<select onchange='fieldSave(\"themeSelect\", this.value)'>";
    $themesDir = __DIR__ . '/themes';
    if (is_dir($themesDir)) {
        $dirs = glob($themesDir . '/*', GLOB_ONLYDIR);
        if (is_array($dirs)) {
            foreach ($dirs as $dir) {
                $val = basename($dir);
                $selected = ($val === $app->config['themeSelect']) ? ' selected' : '';
                echo "<option value='" . esc($val) . "'{$selected}>" . esc($val) . "</option>";
            }
        }
    }
    echo "</select>";

    // Language
    $langLabel = esc($app->t('settings_language'));
    echo "<label>{$langLabel}</label>";
    echo "<select onchange='fieldSave(\"language\", this.value)'>";
    foreach (['ja' => '日本語', 'en' => 'English'] as $code => $label) {
        $selected = ($code === $app->language) ? ' selected' : '';
        echo "<option value='{$code}'{$selected}>{$label}</option>";
    }
    echo "</select>";

    echo '</div>';

    // Export/Import/Generate
    echo '<div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap;">';
    echo '<a class="admin-btn admin-btn--outline" href="?api=export">Export</a>';
    echo '<button class="admin-btn" onclick="generateSite()">Generate Static Site</button>';
    echo '</div>';
    echo '<div id="generate-result" style="margin-top:8px;font-size:13px;"></div>';
    echo '<script>';
    echo 'function generateSite(){';
    echo 'var el=document.getElementById("generate-result");';
    echo 'el.textContent="Generating...";el.style.color="#f90";';
    echo 'var body=new URLSearchParams();body.append("csrf",csrfToken);';
    echo 'fetch("index.php?api=generate",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:body.toString()})';
    echo '.then(function(r){return r.json();})';
    echo '.then(function(d){if(d.status==="ok"){el.textContent="Generated "+d.pages+" pages to "+d.output;el.style.color="#0a0";}else{el.textContent="Error: "+d.error;el.style.color="#c00";}})';
    echo '.catch(function(e){el.textContent="Error: "+e.message;el.style.color="#c00";});';
    echo '}';
    echo '</script>';

    echo '</section>';
}

function renderAdminEditor(App $app): void
{
    $slug = $_REQUEST['page'] ?? '';
    if ($slug === '' || !FileStorage::validateSlug($slug)) {
        echo '<p>Invalid page slug.</p>';
        return;
    }

    $pageData = $app->storage->readPageData($slug);
    $format = $pageData['format'] ?? 'blocks';
    $status = $pageData['status'] ?? 'published';
    $content = $pageData['content'] ?? '';
    $blocksJson = '';
    if (isset($pageData['blocks'])) {
        $blocksJson = esc(json_encode($pageData['blocks'], JSON_UNESCAPED_UNICODE));
    }

    $safeSlug = esc($slug);

    echo "<section class='admin-section'>";
    echo "<h2>Edit: {$safeSlug}</h2>";

    // Meta bar
    echo "<div class='admin-meta'>";
    // Format switcher
    echo "<div class='ce-format-bar' data-slug='{$safeSlug}'>";
    $formats = ['blocks' => 'Blocks', 'markdown' => 'Markdown'];
    foreach ($formats as $fmt => $label) {
        $active = ($fmt === $format) ? ' class="active"' : '';
        echo "<button{$active} data-format='" . esc($fmt) . "'>{$label}</button>";
    }
    echo "</div>";

    // Status
    echo "<select onchange='api.savePage(\"{$safeSlug}\", \"\", \"" . esc($format) . "\").catch(()=>{});fieldSave(\"" . $safeSlug . "_status\",this.value);location.reload();' style='display:none;'>";
    echo "</select>";
    $pubSelected = $status === 'published' ? ' selected' : '';
    $draftSelected = $status === 'draft' ? ' selected' : '';
    echo "<label style='font-size:13px;'>Status: </label>";
    echo "<select id='status-select' style='font-size:13px;padding:4px;'>";
    echo "<option value='published'{$pubSelected}>Published</option>";
    echo "<option value='draft'{$draftSelected}>Draft</option>";
    echo "</select>";
    echo "<button class='admin-btn' id='save-status-btn' style='font-size:12px;padding:4px 12px;'>Save Status</button>";
    echo "<script>document.getElementById('save-status-btn').addEventListener('click',function(){";
    echo "var s=document.getElementById('status-select').value;";
    echo "api.savePage('" . $safeSlug . "','" . esc(json_encode($pageData['blocks'] ?? [], JSON_UNESCAPED_UNICODE)) . "','blocks').then(function(){";
    echo "fetch('index.php?api=pages',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},";
    echo "body:'slug={$safeSlug}&content=&format={$format}&status='+s+'&csrf='+csrfToken}).then(function(){location.reload();});";
    echo "});});</script>";

    echo "</div>";

    // Editor area
    if ($format === 'blocks') {
        echo "<div class='admin-editor-area'>";
        echo "<div id='{$safeSlug}' class='ce-editor-wrapper' data-format='blocks' data-blocks='{$blocksJson}'></div>";
        echo "</div>";
    } elseif ($format === 'markdown') {
        echo "<div class='admin-editor-area'>";
        echo "<span id='{$safeSlug}' class='editText richText' data-format='markdown'>" . esc($content) . "</span>";
        echo "</div>";
    }

    // Revisions sidebar
    $revisions = $app->storage->listRevisions($slug);
    if (!empty($revisions)) {
        echo "<div class='admin-sidebar'>";
        echo "<h3>Revisions (" . count($revisions) . ")</h3>";
        echo "<ul>";
        foreach (array_slice($revisions, 0, 10) as $rev) {
            $ts = esc($rev['timestamp']);
            echo "<li><span>{$ts}</span> <a href='#' onclick='api.restoreRevision(\"{$safeSlug}\",\"{$ts}\").then(function(){location.reload();});return false;'>Restore</a></li>";
        }
        echo "</ul>";
        echo "</div>";
    }

    echo "</section>";
}

function renderAdminNewPage(App $app): void
{
    $csrf = csrf_token();
    echo "<section class='admin-section'>";
    echo "<h2>New Page</h2>";
    echo "<div class='admin-form'>";
    echo "<label>Slug</label>";
    echo "<input type='text' id='new-slug' placeholder='page-name' pattern='[a-zA-Z0-9_\\-]+'>";
    echo "<label>Format</label>";
    echo "<select id='new-format'><option value='blocks'>Blocks</option><option value='markdown'>Markdown</option></select>";
    echo "<br><br>";
    echo "<button onclick='createNewPage()'>Create Page</button>";
    echo "</div>";
    echo "<script>";
    echo "function createNewPage(){";
    echo "var slug=document.getElementById('new-slug').value.toLowerCase().replace(/\\s+/g,'-');";
    echo "var fmt=document.getElementById('new-format').value;";
    echo "if(!slug){alert('Slug is required');return;}";
    echo "var content=fmt==='blocks'?'[]':'';";
    echo "api.savePage(slug,content,fmt).then(function(){";
    echo "location.href='?admin=edit&page='+encodeURIComponent(slug);";
    echo "}).catch(function(e){alert('Error: '+e.message);});";
    echo "}";
    echo "</script>";
    echo "</section>";
}
