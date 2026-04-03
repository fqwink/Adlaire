<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - Admin UI Template
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
    <link rel="stylesheet" href="themes/admin.css">
<?php $app->scriptTags(true); ?>
<?php $app->editTags(); ?>
</head>
<body>
<div class="admin-wrap">
    <?php if (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off'): ?>
        <div style="background:#fff3cd;color:#856404;padding:8px 12px;border-radius:4px;font-size:13px;margin-bottom:8px;">⚠ HTTPS is not enabled. Admin operations over HTTP are not secure.</div>
    <?php endif; ?>
    <header class="admin-header">
        <h1><?= esc($c['title']) ?> — Admin <small style="font-size:12px;color:#888;font-weight:normal;"><?= esc(App::VERSION) ?></small></h1>
        <div>
            <a href="./">← <?= esc($app->t('admin_view_site')) ?></a>
            <a href="<?= esc($app->host) ?>?logout"><?= esc($app->t('logout')) ?></a>
        </div>
    </header>

    <nav class="admin-nav">
        <a href="?admin" class="<?= $adminAction === 'dashboard' || $adminAction === '' ? 'active' : '' ?>"><?= esc($app->t('admin_dashboard')) ?></a>
        <a href="?admin=new"><?= esc($app->t('admin_new_page')) ?></a>
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
    // Sort by updated_at descending
    uasort($pages, fn($a, $b) => strcmp($b['updated_at'] ?? '', $a['updated_at'] ?? ''));

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
        $jsonSlug = json_encode($slug, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
        echo "<td class='actions'><a href='?admin=edit&page={$safeSlug}'>Edit</a><a href='{$safeSlug}' target='_blank'>View</a><a href='#' class='admin-btn--danger' style='font-size:12px;padding:2px 6px;color:#c33;' data-action='delete' data-slug={$jsonSlug} data-csrf='" . esc(csrf_token()) . "'>Delete</a></td>";
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
    $themesDir = dirname(__DIR__) . '/themes';
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
    echo '<label class="admin-btn admin-btn--outline" style="cursor:pointer;">Import <input type="file" accept=".json" style="display:none;" onchange="importSite(this)"></label>';
    echo '<button class="admin-btn" onclick="generateSite()">Generate Static Site</button>';
    echo '</div>';
    echo '<div id="import-result" style="margin-top:4px;font-size:13px;"></div>';
    echo '<div id="generate-result" style="margin-top:8px;font-size:13px;"></div>';
    echo '<script>';
    echo 'function importSite(input){';
    echo 'var file=input.files[0];if(!file)return;';
    echo 'var reader=new FileReader();reader.onload=function(){';
    echo 'api.importSite(reader.result).then(function(r){';
    echo 'document.getElementById("import-result").textContent="Imported: config="+r.config+", pages="+r.pages;';
    echo 'document.getElementById("import-result").style.color="#0a0";';
    echo 'setTimeout(function(){location.reload();},1500);';
    echo '}).catch(function(e){document.getElementById("import-result").textContent="Error: "+e.message;document.getElementById("import-result").style.color="#c00";});';
    echo '};reader.readAsText(file);}';
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

    echo '<script>';
    echo 'function deletePage(slug){';
    echo 'if(!confirm("Delete page: "+slug+"?"))return;';
    echo 'api.deletePage(slug).then(function(){location.reload();}).catch(function(e){alert("Error: "+e.message);});';
    echo '}';
    echo '</script>';

    // --- System Info ---
    echo '<section class="admin-section">';
    echo '<h2>System</h2>';
    $versionFile = dirname(__DIR__) . '/VERSION';
    $fileVersion = file_exists($versionFile) ? esc(trim((string) file_get_contents($versionFile))) : '—';
    $appVersion = esc(App::VERSION);
    $lockFile = dirname(__DIR__) . '/data/system/install.lock';
    $installedAt = '—';
    if (file_exists($lockFile)) {
        $lock = json_decode((string) file_get_contents($lockFile), true);
        $installedAt = is_array($lock) ? esc(substr($lock['installed_at'] ?? '', 0, 19)) : '—';
    }
    echo "<table class='admin-table'>";
    echo "<tr><th>Release Version</th><td>{$fileVersion}</td></tr>";
    echo "<tr><th>App Version</th><td>{$appVersion}</td></tr>";
    echo "<tr><th>Installed</th><td>{$installedAt}</td></tr>";
    echo "<tr><th>PHP</th><td>" . esc(PHP_VERSION) . "</td></tr>";
    echo "</table>";
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
    if ($pageData === false) {
        echo '<p>Page not found. <a href="?admin">Back to dashboard</a></p>';
        return;
    }
    $format = $pageData['format'] ?? 'blocks';
    $status = $pageData['status'] ?? 'published';
    $content = $pageData['content'] ?? '';
    $blocksB64 = '';
    if (isset($pageData['blocks'])) {
        $blocksB64 = base64_encode(json_encode($pageData['blocks'], JSON_UNESCAPED_UNICODE));
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

    // Status toggle
    $pubSelected = $status === 'published' ? ' selected' : '';
    $draftSelected = $status === 'draft' ? ' selected' : '';
    echo "<label style='font-size:13px;'>Status: </label>";
    echo "<select id='status-select' style='font-size:13px;padding:4px;'>";
    echo "<option value='published'{$pubSelected}>Published</option>";
    echo "<option value='draft'{$draftSelected}>Draft</option>";
    echo "</select>";
    echo "<button class='admin-btn' id='save-status-btn' style='font-size:12px;padding:4px 12px;'>Save Status</button>";
    $jsonSafeSlug = json_encode($slug, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    echo "<script>document.getElementById('save-status-btn').addEventListener('click',function(){";
    echo "var s=document.getElementById('status-select').value;";
    echo "var body=new URLSearchParams();";
    echo "body.append('slug',{$jsonSafeSlug});body.append('status',s);body.append('csrf',csrfToken);";
    echo "fetch('index.php?api=pages&action=status',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()})";
    echo ".then(function(r){return r.json();}).then(function(){location.reload();});";
    echo "});</script>";

    echo "</div>";

    // Editor area
    if ($format === 'blocks') {
        echo "<div class='admin-editor-area'>";
        echo "<div id='{$safeSlug}' class='ce-editor-wrapper' data-format='blocks' data-blocks-b64='{$blocksB64}'></div>";
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
    echo "var content=fmt==='blocks'?JSON.stringify([{type:'paragraph',data:{text:''}}]):'';";
    echo "api.savePage(slug,content,fmt).then(function(){";
    echo "location.href='?admin=edit&page='+encodeURIComponent(slug);";
    echo "}).catch(function(e){alert('Error: '+e.message);});";
    echo "}";
    echo "</script>";
    echo "</section>";
}
