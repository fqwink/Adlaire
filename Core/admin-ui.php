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
if (!is_string($adminAction) || !in_array($adminAction, ['dashboard', '', 'edit', 'new'], true)) {
    $adminAction = 'dashboard';
}
$n = $app->nonce !== '' ? " nonce=\"" . esc($app->nonce) . "\"" : '';
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
    'edit'      => renderAdminEditor($app, $n),
    'new'       => renderAdminNewPage($app, $n),
    default     => renderAdminDashboard($app, $n),
};
?>

</div>
</body>
</html>
<?php

function renderAdminDashboard(App $app, string $n): void
{
    $pages = $app->storage->listPages();
    $pageOrder = $app->storage->getPageOrder();

    if ($pageOrder !== []) {
        $ordered = [];
        foreach ($pageOrder as $slug) {
            if (isset($pages[$slug])) {
                $ordered[$slug] = $pages[$slug];
            }
        }
        foreach ($pages as $slug => $data) {
            if (!isset($ordered[$slug])) {
                $ordered[$slug] = $data;
            }
        }
        $unordered = array_diff_key($pages, array_flip($pageOrder));
        uasort($unordered, function ($a, $b) {
            $ta = strtotime($b['updated_at'] ?? '1970-01-01') ?: 0;
            $tb = strtotime($a['updated_at'] ?? '1970-01-01') ?: 0;
            return $ta <=> $tb;
        });
        $pages = $ordered;
    } else {
        uasort($pages, function ($a, $b) {
            $ta = strtotime($b['updated_at'] ?? '1970-01-01') ?: 0;
            $tb = strtotime($a['updated_at'] ?? '1970-01-01') ?: 0;
            return $ta <=> $tb;
        });
    }

    // --- Page List ---
    echo '<section class="admin-section">';
    echo '<h2>' . esc($app->t('admin_pages')) . '</h2>';
    echo '<div style="margin-bottom:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
    echo '<input type="text" id="page-search" placeholder="' . esc($app->t('admin_search')) . '" style="padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;">';
    echo '<select id="page-filter" style="padding:6px;border:1px solid #ddd;border-radius:4px;font-size:13px;"><option value="">' . esc($app->t('admin_filter')) . '</option><option value="published">Published</option><option value="draft">Draft</option></select>';
    echo '<button class="admin-btn" id="bulk-status-btn" style="font-size:12px;padding:4px 12px;display:none;" data-csrf="' . esc(csrf_token()) . '">' . esc($app->t('admin_bulk_status')) . '</button>';
    echo '<button class="admin-btn admin-btn--danger" id="bulk-delete-btn" style="font-size:12px;padding:4px 12px;display:none;" data-csrf="' . esc(csrf_token()) . '">' . esc($app->t('admin_bulk_delete')) . '</button>';
    echo '<button class="admin-btn admin-btn--outline" id="reorder-btn" style="font-size:12px;padding:4px 12px;" data-csrf="' . esc(csrf_token()) . '">' . esc($app->t('admin_reorder')) . '</button>';
    echo '</div>';
    echo '<table class="admin-table">';
    echo '<thead><tr><th><input type="checkbox" id="select-all"></th><th>Slug</th><th>Format</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>';
    echo '<tbody id="page-list">';
    foreach ($pages as $slug => $data) {
        $safeSlug = esc($slug);
        $format = esc($data['format'] ?? 'blocks');
        $status = $data['status'] ?? 'published';
        $statusClass = $status === 'draft' ? 'status-draft' : 'status-published';
        $updated = substr($data['updated_at'] ?? '', 0, 10);
        echo "<tr data-slug='" . esc($slug) . "' data-status='" . esc($status) . "'>";
        echo "<td><input type='checkbox' class='page-check' value='" . esc($slug) . "'></td>";
        echo "<td><a href='?admin=edit&page={$safeSlug}'>{$safeSlug}</a></td>";
        echo "<td>{$format}</td>";
        echo "<td class='{$statusClass}'>" . esc($status) . "</td>";
        echo "<td>" . esc($updated) . "</td>";
        $jsonSlug = json_encode($slug, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
        echo "<td class='actions'><a href='?admin=edit&page={$safeSlug}'>" . esc($app->t('admin_edit')) . "</a><a href='{$safeSlug}' target='_blank'>" . esc($app->t('admin_view')) . "</a><a href='?preview={$safeSlug}' target='_blank'>" . esc($app->t('admin_preview')) . "</a><a href='#' class='admin-btn--danger' style='font-size:12px;padding:2px 6px;color:#c33;' data-action='delete' data-slug={$jsonSlug} data-csrf='" . esc(csrf_token()) . "'>" . esc($app->t('admin_delete')) . "</a></td>";
        echo "</tr>";
    }
    if (empty($pages)) {
        echo '<tr><td colspan="6" style="text-align:center;color:#999;">No pages yet</td></tr>';
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
        echo "<input type='text' value='{$value}' placeholder='{$default}' data-action='field-save' data-field='" . esc($key) . "'>";
    }

    // Menu
    $menuLabel = esc($app->t('settings_menu'));
    $menuVal = esc($app->config['menu'] ?? '');
    echo "<label>{$menuLabel}</label>";
    echo "<textarea data-action='field-save' data-field='menu'>{$menuVal}</textarea>";

    // Theme
    $themeLabel = esc($app->t('settings_theme'));
    echo "<label>{$themeLabel}</label>";
    echo "<select data-action='field-save' data-field='themeSelect'>";
    $themesDir = dirname(__DIR__) . '/themes';
    if (is_dir($themesDir)) {
        $dirs = glob($themesDir . '/*', GLOB_ONLYDIR);
        if (is_array($dirs)) {
            foreach ($dirs as $dir) {
                $val = basename($dir);
                $selected = ($val === $app->config['themeSelect']) ? ' selected' : '';
                $themeMeta = $app->loadThemeJson($val);
                $themeDesc = '';
                if (($themeMeta['description'] ?? '') !== '' || ($themeMeta['version'] ?? '') !== '') {
                    $themeDesc = ' (' . esc($themeMeta['description'] ?? '') . ($themeMeta['version'] !== '' ? ' v' . esc($themeMeta['version']) : '') . ')';
                }
                echo "<option value='" . esc($val) . "'{$selected}>" . esc($val) . $themeDesc . "</option>";
            }
        }
    }
    echo "</select>";

    // Language
    $langLabel = esc($app->t('settings_language'));
    echo "<label>{$langLabel}</label>";
    echo "<select data-action='field-save' data-field='language'>";
    $langDir = dirname(__DIR__) . '/data/lang';
    $langOptions = [];
    if (is_dir($langDir)) {
        $langFiles = glob($langDir . '/*.json');
        if (is_array($langFiles)) {
            foreach ($langFiles as $langFile) {
                $code = basename($langFile, '.json');
                $langData = json_decode((string) file_get_contents($langFile), true);
                $label = is_array($langData) && isset($langData['_language_name']) ? $langData['_language_name'] : $code;
                $langOptions[$code] = $label;
            }
        }
    }
    if ($langOptions === []) {
        $langOptions = ['ja' => '日本語', 'en' => 'English'];
    }
    foreach ($langOptions as $code => $label) {
        $selected = ($code === $app->language) ? ' selected' : '';
        echo "<option value='" . esc($code) . "'{$selected}>" . esc($label) . "</option>";
    }
    echo "</select>";

    echo '</div>';

    // Sidebar editor
    echo '<section class="admin-section">';
    echo '<h2>' . esc($app->t('admin_sidebar')) . '</h2>';
    echo '<div class="ce-editor-wrapper" id="sidebar-editor"></div>';
    echo '</section>';

    // Export/Import/Generate
    echo '<div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap;">';
    echo '<a class="admin-btn admin-btn--outline" href="?api=export">' . esc($app->t('admin_export')) . '</a>';
    echo '<label class="admin-btn admin-btn--outline" style="cursor:pointer;">' . esc($app->t('admin_import')) . ' <input type="file" accept=".json" style="display:none;" data-action="import-site"></label>';
    echo '<button class="admin-btn" data-action="generate-site">' . esc($app->t('admin_generate')) . '</button>';
    echo '</div>';
    echo '<div id="import-result" style="margin-top:4px;font-size:13px;"></div>';
    echo '<div id="generate-result" style="margin-top:8px;font-size:13px;"></div>';
    echo "<script{$n}>";
    echo 'document.addEventListener("change",function(e){';
    echo 'var el=e.target;';
    echo 'if(el.matches("[data-action=\\"field-save\\"]")){fieldSave(el.getAttribute("data-field"),el.value);}';
    echo 'if(el.matches("[data-action=\\"import-site\\"]")){';
    echo 'var file=el.files[0];if(!file)return;';
    echo 'var reader=new FileReader();reader.onload=function(){';
    echo 'api.importSite(reader.result).then(function(r){';
    echo 'document.getElementById("import-result").textContent=i18n.t("admin_import_result")+": config="+r.config+", pages="+r.pages;';
    echo 'document.getElementById("import-result").style.color="#0a0";';
    echo 'setTimeout(function(){location.reload();},1500);';
    echo '}).catch(function(err){document.getElementById("import-result").textContent="Error: "+err.message;document.getElementById("import-result").style.color="#c00";});';
    echo '};reader.readAsText(file);}';
    echo '});';
    echo 'document.addEventListener("click",function(e){';
    echo 'var btn=e.target.closest("[data-action=\\"generate-site\\"]");';
    echo 'if(!btn)return;';
    echo 'var el=document.getElementById("generate-result");';
    echo 'el.textContent="Generating...";el.style.color="#f90";';
    echo 'var body=new URLSearchParams();body.append("csrf",csrfToken);';
    echo 'fetch("index.php?api=generate",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:body.toString()})';
    echo '.then(function(r){return r.json();})';
    echo '.then(function(d){if(d.status==="ok"){el.textContent="' . esc($app->t('admin_generate_report')) . ': "+d.pages_generated+" generated, "+d.pages_skipped+" skipped, "+d.pages_failed+" failed ("+d.build_time_ms+"ms)";el.style.color="#0a0";}else{el.textContent="Error: "+d.error;el.style.color="#c00";}})';
    echo '.catch(function(err){el.textContent="Error: "+err.message;el.style.color="#c00";});';
    echo '});';
    echo '</script>';

    echo "<script{$n}>";
    echo 'document.addEventListener("click",function(e){';
    echo 'var btn=e.target.closest("[data-action=\\"delete\\"]");';
    echo 'if(!btn)return;';
    echo 'e.preventDefault();';
    echo 'var slug=JSON.parse(btn.getAttribute("data-slug"));';
    echo 'if(!confirm("Delete page: "+slug+"?"))return;';
    echo 'api.deletePage(slug).then(function(){location.reload();}).catch(function(err){alert("Error: "+err.message);});';
    echo '});';
    echo '</script>';

    echo "<script{$n}>";
    echo 'document.getElementById("select-all").addEventListener("change",function(){';
    echo 'var checks=document.querySelectorAll(".page-check");';
    echo 'for(var i=0;i<checks.length;i++){checks[i].checked=this.checked;}';
    echo 'toggleBulkBtns();';
    echo '});';
    echo 'document.addEventListener("change",function(e){if(e.target.classList.contains("page-check")){toggleBulkBtns();}});';
    echo 'function toggleBulkBtns(){var c=document.querySelectorAll(".page-check:checked");var s=c.length>0?"inline-block":"none";document.getElementById("bulk-status-btn").style.display=s;document.getElementById("bulk-delete-btn").style.display=s;}';
    echo 'document.getElementById("bulk-status-btn").addEventListener("click",function(){';
    echo 'var slugs=[];document.querySelectorAll(".page-check:checked").forEach(function(c){slugs.push(c.value);});';
    echo 'var st=prompt("' . esc($app->t('admin_bulk_action')) . ': published / draft");';
    echo 'if(st!=="published"&&st!=="draft")return;';
    echo 'var body=new URLSearchParams();body.append("csrf",csrfToken);body.append("status",st);';
    echo 'slugs.forEach(function(s){body.append("slugs[]",s);});';
    echo 'fetch("index.php?api=pages&action=bulk-status",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:body.toString()})';
    echo '.then(function(r){return r.json();}).then(function(){location.reload();});';
    echo '});';
    echo 'document.getElementById("bulk-delete-btn").addEventListener("click",function(){';
    echo 'var slugs=[];document.querySelectorAll(".page-check:checked").forEach(function(c){slugs.push(c.value);});';
    echo 'if(!confirm("' . esc($app->t('confirm_bulk_delete')) . '"))return;';
    echo 'var body=new URLSearchParams();body.append("csrf",csrfToken);';
    echo 'slugs.forEach(function(s){body.append("slugs[]",s);});';
    echo 'fetch("index.php?api=pages&action=bulk-delete",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:body.toString()})';
    echo '.then(function(r){return r.json();}).then(function(){location.reload();});';
    echo '});';
    echo '</script>';

    echo "<script{$n}>";
    echo 'var searchEl=document.getElementById("page-search");';
    echo 'var filterEl=document.getElementById("page-filter");';
    echo 'function filterPages(){var q=(searchEl.value||"").toLowerCase();var f=filterEl.value;var rows=document.querySelectorAll("#page-list tr");';
    echo 'for(var i=0;i<rows.length;i++){var r=rows[i];var slug=r.getAttribute("data-slug")||"";var st=r.getAttribute("data-status")||"";';
    echo 'var show=true;if(q&&slug.indexOf(q)===-1)show=false;if(f&&st!==f)show=false;r.style.display=show?"":"none";}}';
    echo 'if(searchEl)searchEl.addEventListener("input",filterPages);';
    echo 'if(filterEl)filterEl.addEventListener("change",filterPages);';
    echo '</script>';

    echo '</section>';

    // --- System Info ---
    echo '<section class="admin-section">';
    echo '<h2>System</h2>';
    $versionFile = dirname(__DIR__) . '/VERSION';
    $fileVersion = file_exists($versionFile) ? esc(trim((string) file_get_contents($versionFile))) : '—';
    $appVersion = esc(App::VERSION);
    $lockFile = dirname(__DIR__) . '/data/system/install.lock';
    $installedAt = '—';
    if (file_exists($lockFile)) {
        $lockRaw = file_get_contents($lockFile);
        $lock = ($lockRaw !== false) ? json_decode($lockRaw, true) : null;
        if (is_array($lock) && isset($lock['installed_at']) && is_string($lock['installed_at'])) {
            $installedAt = esc(substr($lock['installed_at'], 0, 19));
        }
    }
    echo "<table class='admin-table'>";
    echo "<tr><th>Release Version</th><td>{$fileVersion}</td></tr>";
    echo "<tr><th>App Version</th><td>{$appVersion}</td></tr>";
    echo "<tr><th>Installed</th><td>{$installedAt}</td></tr>";
    echo "<tr><th>PHP</th><td>" . esc(PHP_VERSION) . "</td></tr>";
    echo "</table>";
    echo '</section>';
}

function renderAdminEditor(App $app, string $n): void
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
    echo "<h2>" . esc($app->t('admin_edit')) . ": {$safeSlug}</h2>";

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
    echo "<a href='?preview={$safeSlug}' target='_blank' class='admin-btn admin-btn--outline' style='font-size:12px;padding:4px 12px;'>" . esc($app->t('admin_preview')) . "</a>";
    $jsonSafeSlug = json_encode($slug, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    echo "<script{$n}>document.getElementById('save-status-btn').addEventListener('click',function(){";
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
        echo "<div id='{$safeSlug}' class='ce-editor-wrapper' data-format='blocks' data-blocks-b64='" . esc($blocksB64) . "'></div>";
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
        echo "<h3>" . esc($app->t('admin_revisions')) . " (" . count($revisions) . ")</h3>";
        echo "<ul>";
        foreach (array_slice($revisions, 0, 10) as $idx => $rev) {
            $ts = esc($rev['timestamp']);
            echo "<li><span>{$ts}</span> ";
            echo "<a href='#' class='rev-restore' data-slug='{$safeSlug}' data-ts='{$ts}'>" . esc($app->t('admin_restore')) . "</a>";
            if ($idx > 0) {
                $prevTs = esc($revisions[$idx - 1]['timestamp']);
                echo " <a href='#' class='rev-diff' data-slug='{$safeSlug}' data-t1='{$ts}' data-t2='{$prevTs}'>" . esc($app->t('admin_revision_diff')) . "</a>";
            }
            echo "</li>";
        }
        echo "</ul>";
        echo "<div id='diff-result' style='margin-top:8px;font-size:12px;'></div>";
        echo "</div>";
    }

    echo "<script{$n}>";
    echo 'document.addEventListener("click",function(e){';
    echo 'var rb=e.target.closest(".rev-restore");';
    echo 'if(rb){e.preventDefault();api.restoreRevision(rb.getAttribute("data-slug"),rb.getAttribute("data-ts")).then(function(){location.reload();});return;}';
    echo 'var db=e.target.closest(".rev-diff");';
    echo 'if(db){e.preventDefault();';
    echo 'fetch("index.php?api=revisions&action=diff&slug="+encodeURIComponent(db.getAttribute("data-slug"))+"&t1="+encodeURIComponent(db.getAttribute("data-t1"))+"&t2="+encodeURIComponent(db.getAttribute("data-t2")))';
    echo '.then(function(r){return r.json();}).then(function(d){';
    echo 'var el=document.getElementById("diff-result");';
    echo 'el.textContent="Added:"+d.added.length+" Removed:"+d.removed.length+" Changed:"+d.changed.length;';
    echo '});}';
    echo '});';
    echo '</script>';

    echo "</section>";
}

function renderAdminNewPage(App $app, string $n): void
{
    echo "<section class='admin-section'>";
    echo "<h2>" . esc($app->t('admin_new_page_title')) . "</h2>";
    echo "<div class='admin-form'>";
    echo "<label>" . esc($app->t('admin_slug')) . "</label>";
    echo "<input type='text' id='new-slug' placeholder='page-name' pattern='[a-zA-Z0-9_\\-]+'>";
    echo "<label>Format</label>";
    echo "<select id='new-format'><option value='blocks'>Blocks</option><option value='markdown'>Markdown</option></select>";
    echo "<br><br>";
    echo "<button data-action='create-page'>" . esc($app->t('admin_create')) . "</button>";
    echo "</div>";
    echo "<script{$n}>";
    echo "document.addEventListener('click',function(e){";
    echo "if(!e.target.closest('[data-action=\"create-page\"]'))return;";
    echo "var slug=document.getElementById('new-slug').value.toLowerCase().replace(/\\s+/g,'-');";
    echo "var fmt=document.getElementById('new-format').value;";
    echo "if(!slug){alert('Slug is required');return;}";
    echo "var content=fmt==='blocks'?JSON.stringify([{type:'paragraph',data:{text:''}}]):'';";
    echo "api.savePage(slug,content,fmt).then(function(){";
    echo "location.href='?admin=edit&page='+encodeURIComponent(slug);";
    echo "}).catch(function(err){alert('Error: '+err.message);});";
    echo "});";
    echo "</script>";
    echo "</section>";
}
