<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - API
 *
 * REST API handlers and admin edit handler.
 * Depends on: helpers.php, core.php, app.php, renderer.php
 *
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group
 * @copyright Copyright (c) 2014 - 2026 倉田和宏
 * @license Adlaire License Ver.2.0 (Open Source - Platform Code)
 */

// --- Admin edit handler ---

function handleEdit(): void
{
    $fieldname = $_REQUEST['fieldname'] ?? null;
    $content = $_REQUEST['content'] ?? null;

    if ($fieldname === null || $content === null) {
        return;
    }

    $fieldname = basename($fieldname);
    if (!FileStorage::validateSlug($fieldname)) {
        header('HTTP/1.1 400 Bad Request');
        exit;
    }

    if (session_status() !== PHP_SESSION_ACTIVE) {
        header('HTTP/1.1 401 Unauthorized');
        exit;
    }

    $storage = new FileStorage('data');
    $config = $storage->readConfig();
    $storedPassword = $config['password'] ?? '';
    $sessionToken = $_SESSION['l'] ?? '';
    if ($storedPassword === '' || $sessionToken === '' || !hash_equals($storedPassword, $sessionToken)) {
        header('HTTP/1.1 401 Unauthorized');
        exit;
    }

    if (!csrf_verify()) {
        http_response_code(403);
        exit;
    }

    if ($fieldname === 'password') {
        header('HTTP/1.1 403 Forbidden');
        exit;
    }

    if ($storage->isConfigKey($fieldname)) {
        $result = $storage->writeConfigValue($fieldname, $content);
    } else {
        // Preserve existing page format when editing inline
        $existing = $storage->readPageData($fieldname);
        $format = ($existing !== false && isset($existing['format'])) ? $existing['format'] : 'blocks';
        $status = ($existing !== false && isset($existing['status'])) ? $existing['status'] : 'published';
        $blocks = ($existing !== false && isset($existing['blocks'])) ? $existing['blocks'] : null;
        $result = $storage->writePage($fieldname, $content, $format, $blocks, $status);
    }

    if (!$result) {
        header('HTTP/1.1 500 Internal Server Error');
        exit;
    }

    // Return new CSRF token for subsequent requests (one-time token)
    header('Content-Type: text/plain; charset=UTF-8');
    $csrfValue = $_SESSION['csrf'] ?? '';
    if ($csrfValue !== '') {
        header('X-CSRF-Token: ' . $csrfValue);
    }
    echo $content;
    exit;
}

// --- REST API handler ---

function handleApi(): void
{
    $endpoint = $_REQUEST['api'] ?? null;
    if ($endpoint === null) {
        return;
    }

    $storage = new FileStorage('data');
    $method = $_SERVER['REQUEST_METHOD'];

    // Non-JSON endpoints
    if ($endpoint === 'sitemap') {
        handleApiSitemap($storage);
        exit;
    }

    header('Content-Type: application/json; charset=UTF-8');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowedHost = $_SERVER['HTTP_HOST'] ?? '';
    if ($origin === 'null' || $origin === '') {
        // Reject null and empty origins
    } elseif ($allowedHost !== '') {
        $parsed = parse_url($origin, PHP_URL_HOST);
        if (is_string($parsed) && $parsed === $allowedHost) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
    }
    $apiCsrf = $_SESSION['csrf'] ?? '';
    if ($apiCsrf !== '') {
        header('X-CSRF-Token: ' . $apiCsrf);
    }

    // Public endpoints (no authentication)
    if ($endpoint === 'search') {
        handleApiSearch($storage);
        exit;
    }
    if ($endpoint === 'version') {
        handleApiVersion();
        exit;
    }

    $config = $storage->readConfig();
    $apiPassword = $config['password'] ?? '';
    $apiSession = $_SESSION['l'] ?? '';
    if ($apiPassword === '' || $apiSession === '' || !hash_equals($apiPassword, $apiSession)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    match ($endpoint) {
        'pages'     => handleApiPages($storage, $method),
        'revisions' => handleApiRevisions($storage, $method),
        'export'    => handleApiExport($storage),
        'import'    => handleApiImport($storage),
        'generate'  => handleApiGenerate($storage),
        default     => apiError(404, 'Unknown endpoint'),
    };
    exit;
}

function handleApiPages(FileStorage $storage, string $method): void
{
    $slug = $_REQUEST['slug'] ?? null;

    $action = $_REQUEST['action'] ?? '';

    if ($method === 'POST' && $action === 'reorder') {
        apiPageReorder($storage);
        return;
    }
    if ($method === 'POST' && $action === 'bulk-status') {
        apiBulkStatus($storage);
        return;
    }
    if ($method === 'POST' && $action === 'bulk-delete') {
        apiBulkDelete($storage);
        return;
    }
    if ($action === 'sidebar') {
        apiSidebar($storage, $method);
        return;
    }

    match ($method) {
        'GET' => $slug !== null
            ? apiPageGet($storage, $slug)
            : apiPageList($storage),
        'POST'   => $action === 'status'
            ? apiPageStatusUpdate($storage)
            : apiPageSave($storage),
        'DELETE' => apiPageDelete($storage, $slug),
        default  => apiError(405, 'Method not allowed'),
    };
}

function apiPageList(FileStorage $storage): void
{
    $pages = $storage->listPages();
    $summary = [];
    foreach ($pages as $slug => $data) {
        unset($data['content'], $data['blocks']);
        $summary[$slug] = [
            'format'     => $data['format'] ?? 'blocks',
            'status'     => $data['status'] ?? 'published',
            'created_at' => $data['created_at'],
            'updated_at' => $data['updated_at'],
        ];
    }
    echo json_encode(['pages' => $summary], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

function apiPageGet(FileStorage $storage, string $slug): void
{
    $data = $storage->readPageData($slug);
    if ($data === false) {
        apiError(404, 'Page not found');
        return;
    }
    echo json_encode(['page' => $slug, 'data' => $data], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

function apiPageSave(FileStorage $storage): void
{
    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $slug = $_POST['slug'] ?? null;
    $content = $_POST['content'] ?? null;
    $format = $_POST['format'] ?? 'blocks';

    if ($slug === null || $content === null) {
        apiError(400, 'Missing slug or content');
        return;
    }

    if (!FileStorage::validateSlug($slug)) {
        apiError(400, 'Invalid slug');
        return;
    }

    if (!in_array($format, ['markdown', 'blocks'], true)) {
        apiError(400, 'Invalid format');
        return;
    }

    $blocks = null;
    if ($format === 'blocks' && isset($_POST['blocks'])) {
        $blocks = json_decode($_POST['blocks'], true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($blocks)) {
            apiError(400, 'Invalid blocks JSON');
            return;
        }
    }

    $status = $_POST['status'] ?? 'published';
    if (!in_array($status, ['draft', 'published'], true)) {
        apiError(400, 'Invalid status');
        return;
    }
    $result = $storage->writePage($slug, $content, $format, $blocks, $status);
    if (!$result) {
        apiError(500, 'Write failed');
        return;
    }

    $warnings = [];
    if ($status === 'published') {
        $isEmpty = false;
        if ($format === 'blocks' && trim($content) === '' && ($blocks === null || $blocks === [])) {
            $isEmpty = true;
        }
        if ($format === 'markdown' && trim($content) === '') {
            $isEmpty = true;
        }
        if ($isEmpty) {
            $warnings[] = 'empty_content';
        }
        if ($format === 'blocks' && is_array($blocks)) {
            $hasHeading = false;
            foreach ($blocks as $b) {
                if (($b['type'] ?? '') === 'heading') {
                    $hasHeading = true;
                    break;
                }
            }
            if (!$hasHeading) {
                $warnings[] = 'no_heading';
            }
        }
    }

    $response = ['status' => 'ok', 'slug' => $slug];
    if ($warnings !== []) {
        $response['warnings'] = $warnings;
    }
    echo json_encode($response);
}

function apiPageStatusUpdate(FileStorage $storage): void
{
    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $slug = $_POST['slug'] ?? null;
    $status = $_POST['status'] ?? null;

    if ($slug === null || !FileStorage::validateSlug($slug)) {
        apiError(400, 'Invalid slug');
        return;
    }
    if ($status === null || !in_array($status, ['draft', 'published'], true)) {
        apiError(400, 'Invalid status');
        return;
    }

    $result = $storage->updatePageStatus($slug, $status);
    if (!$result) {
        apiError(404, 'Page not found');
        return;
    }

    echo json_encode(['status' => 'ok', 'slug' => $slug, 'page_status' => $status]);
}

function apiPageDelete(FileStorage $storage, ?string $slug): void
{
    if ($slug === null || !FileStorage::validateSlug($slug)) {
        apiError(400, 'Invalid slug');
        return;
    }

    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $result = $storage->deletePage($slug);
    if (!$result) {
        apiError(404, 'Page not found');
        return;
    }

    echo json_encode(['status' => 'ok', 'deleted' => $slug]);
}

function handleApiRevisions(FileStorage $storage, string $method): void
{
    $slug = $_REQUEST['slug'] ?? null;
    if ($slug === null || !FileStorage::validateSlug($slug)) {
        apiError(400, 'Invalid slug');
        return;
    }

    $action = $_REQUEST['action'] ?? '';
    if ($method === 'GET' && $action === 'diff') {
        apiRevisionDiff($storage, $slug);
        return;
    }

    match ($method) {
        'GET'  => apiRevisionList($storage, $slug),
        'POST' => apiRevisionRestore($storage, $slug),
        default => apiError(405, 'Method not allowed'),
    };
}

function apiRevisionList(FileStorage $storage, string $slug): void
{
    $revisions = $storage->listRevisions($slug);
    echo json_encode(['slug' => $slug, 'revisions' => $revisions], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

function apiRevisionRestore(FileStorage $storage, string $slug): void
{
    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $timestamp = $_POST['timestamp'] ?? null;
    if ($timestamp === null) {
        apiError(400, 'Missing timestamp');
        return;
    }

    $result = $storage->restoreRevision($slug, $timestamp);
    if (!$result) {
        apiError(404, 'Revision not found');
        return;
    }

    echo json_encode(['status' => 'ok', 'restored' => $slug, 'timestamp' => $timestamp]);
}

// --- Search API ---

function handleApiSearch(FileStorage $storage): void
{
    $rawQuery = $_REQUEST['q'] ?? '';
    if ($rawQuery === '') {
        echo json_encode(['results' => []]);
        return;
    }

    $query = mb_strtolower($rawQuery, 'UTF-8');
    static $cachedPages = null;
    if ($cachedPages === null) {
        $cachedPages = $storage->listPublishedPages();
    }
    $pages = $cachedPages;
    $results = [];

    foreach ($pages as $slug => $data) {
        $content = mb_strtolower($data['content'] ?? '', 'UTF-8');
        $pos = mb_strpos($content, $query, 0, 'UTF-8');
        if ($pos === false) {
            continue;
        }

        // Extract snippet around match
        $start = max(0, $pos - 40);
        $snippet = mb_substr($data['content'], $start, 120, 'UTF-8');
        if ($start > 0) {
            $snippet = '...' . $snippet;
        }

        $results[] = [
            'slug'       => $slug,
            'snippet'    => strip_tags($snippet),
            'format'     => $data['format'] ?? 'blocks',
            'status'     => $data['status'] ?? 'published',
            'updated_at' => $data['updated_at'],
        ];
    }

    $searchJson = json_encode(['query' => $rawQuery, 'results' => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    echo $searchJson !== false ? $searchJson : '{"results":[]}';
}

// --- Sitemap API ---

function handleApiSitemap(FileStorage $storage): void
{
    header('Content-Type: application/xml; charset=UTF-8');

    $app = App::getInstance();
    $isHttps = ($_SERVER['HTTPS'] ?? '') === 'on';
    $rawHost = rtrim($app->host, '/');
    $host = ($isHttps ? 'https' : 'http') . ':' . $rawHost;

    $pages = $storage->listPublishedPages();

    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

    // Home page
    $homeLoc = htmlspecialchars("{$host}/", ENT_XML1, 'UTF-8');
    $xml .= "  <url>\n";
    $xml .= "    <loc>{$homeLoc}</loc>\n";
    $xml .= "    <changefreq>weekly</changefreq>\n";
    $xml .= "  </url>\n";

    foreach ($pages as $slug => $data) {
        $loc = htmlspecialchars("{$host}/{$slug}", ENT_XML1, 'UTF-8');
        $lastmod = substr($data['updated_at'], 0, 10); // YYYY-MM-DD
        $xml .= "  <url>\n";
        $xml .= "    <loc>{$loc}</loc>\n";
        $xml .= "    <lastmod>{$lastmod}</lastmod>\n";
        $xml .= "  </url>\n";
    }

    $xml .= '</urlset>';
    echo $xml;
}

// --- Export API ---

function handleApiExport(FileStorage $storage): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        apiError(405, 'Method not allowed');
        return;
    }

    $config = $storage->readConfig();
    unset($config['password']);

    $export = [
        'version'   => App::VERSION,
        'exported_at' => date('c'),
        'config'    => $config,
        'pages'     => $storage->listPages(),
    ];

    if (($_GET['revisions'] ?? '') === '1') {
        $export['revisions'] = $storage->listAllRevisions();
        $revisionData = [];
        foreach ($export['revisions'] as $slug => $revs) {
            foreach ($revs as $rev) {
                $ts = $rev['timestamp'];
                $data = $storage->getRevisionData($slug, $ts);
                if ($data !== false) {
                    $revisionData[$slug][$ts] = $data;
                }
            }
        }
        $export['revision_data'] = $revisionData;
    }

    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="adlaire-export-' . date('Ymd_His') . '.json"');
    echo json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

// --- Import API ---

function handleApiImport(FileStorage $storage): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        apiError(405, 'Method not allowed');
        return;
    }

    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    static $rawInput = null;
    if ($rawInput === null) {
        $rawInput = file_get_contents('php://input');
    }
    $input = ($rawInput !== false && $rawInput !== '') ? $rawInput : '';
    if ($input === '') {
        $input = $_POST['data'] ?? '';
    }

    if ($input === '') {
        apiError(400, 'Empty request body');
        return;
    }

    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    if ($contentType !== '' && !str_contains($contentType, 'application/json') && !str_contains($contentType, 'application/x-www-form-urlencoded')) {
        apiError(400, 'Unsupported Content-Type');
        return;
    }

    if (mb_detect_encoding($input, 'UTF-8', true) === false) {
        apiError(400, 'Input must be valid UTF-8');
        return;
    }

    $data = json_decode($input, true);
    if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
        apiError(400, 'Invalid JSON');
        return;
    }

    $imported = ['config' => false, 'pages' => 0];

    // Import config (whitelist keys only)
    $allowedConfigKeys = ['themeSelect', 'menu', 'title', 'subside', 'description', 'keywords', 'copyright', 'language', 'sidebar_blocks', 'page_order'];
    if (isset($data['config']) && is_array($data['config'])) {
        $filteredConfig = array_intersect_key($data['config'], array_flip($allowedConfigKeys));
        if ($filteredConfig !== []) {
            $storage->writeConfig($filteredConfig);
            $imported['config'] = true;
        }
    }

    // Import pages (whitelist keys only)
    $allowedPageKeys = ['content', 'format', 'blocks', 'status', 'created_at', 'updated_at'];
    if (isset($data['pages']) && is_array($data['pages'])) {
        foreach ($data['pages'] as $slug => $pageData) {
            if (!is_string($slug) || !FileStorage::validateSlug($slug) || !is_array($pageData) || !isset($pageData['content'])) {
                continue;
            }
            $pageData = array_intersect_key($pageData, array_flip($allowedPageKeys));
            $existingPage = $storage->readPageData($slug);
            if ($existingPage !== false) {
                if (isset($existingPage['created_at']) && isset($pageData['created_at'])) {
                    unset($pageData['created_at']);
                }
                if (isset($existingPage['updated_at']) && isset($pageData['updated_at'])) {
                    unset($pageData['updated_at']);
                }
            }
            $format = $pageData['format'] ?? 'blocks';
            $blocks = $pageData['blocks'] ?? null;
            $status = $pageData['status'] ?? 'published';
            $storage->writePage($slug, $pageData['content'], $format, $blocks, $status);
            $imported['pages']++;
        }
    }

    if (isset($data['revision_data']) && is_array($data['revision_data'])) {
        $revCount = 0;
        foreach ($data['revision_data'] as $slug => $revisions) {
            if (!is_string($slug) || !FileStorage::validateSlug($slug) || !is_array($revisions)) {
                continue;
            }
            $revDir = 'data/revisions/' . $slug;
            if (!is_dir($revDir)) {
                mkdir($revDir, 0755, true);
            }
            foreach ($revisions as $ts => $revData) {
                if (!is_array($revData)) {
                    continue;
                }
                $revFile = $revDir . '/' . $ts . '.json';
                if (!file_exists($revFile)) {
                    file_put_contents($revFile, json_encode($revData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
                    $revCount++;
                }
            }
        }
        $imported['revisions'] = $revCount;
    }

    echo json_encode(['status' => 'ok', 'imported' => $imported]);
}

// --- Version API ---

function handleApiVersion(): void
{
    $versionFile = dirname(__DIR__) . '/VERSION';
    $version = file_exists($versionFile) ? trim((string) file_get_contents($versionFile)) : App::VERSION;

    $lockFile = dirname(__DIR__) . '/data/system/install.lock';
    $installed = file_exists($lockFile);
    $installedAt = '';
    if ($installed) {
        $lock = json_decode((string) file_get_contents($lockFile), true);
        $installedAt = is_array($lock) ? ($lock['installed_at'] ?? '') : '';
    }

    echo json_encode([
        'product' => 'Adlaire',
        'version' => $version,
        'app_version' => App::VERSION,
        'installed' => $installed,
        'installed_at' => $installedAt,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

function apiPageReorder(FileStorage $storage): void
{
    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $raw = $_POST['slugs'] ?? '';
    $slugs = is_array($raw) ? $raw : json_decode($raw, true);
    if (!is_array($slugs)) {
        apiError(400, 'Invalid slugs');
        return;
    }

    foreach ($slugs as $s) {
        if (!is_string($s) || !FileStorage::validateSlug($s)) {
            apiError(400, 'Invalid slug in list');
            return;
        }
    }

    $result = $storage->savePageOrder($slugs);
    if (!$result) {
        apiError(500, 'Write failed');
        return;
    }

    echo json_encode(['status' => 'ok']);
}

function apiSidebar(FileStorage $storage, string $method): void
{
    $app = App::getInstance();
    if ($method === 'GET') {
        $blocks = $app->getSidebarBlocks();
        echo json_encode(['blocks' => $blocks], JSON_UNESCAPED_UNICODE);
        return;
    }
    if ($method === 'POST') {
        if (!csrf_verify()) {
            apiError(403, 'CSRF verification failed');
            return;
        }
        $raw = $_POST['blocks'] ?? '';
        $blocks = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($blocks)) {
            apiError(400, 'Invalid blocks JSON');
            return;
        }
        $result = $app->saveSidebarBlocks($blocks);
        if (!$result) {
            apiError(500, 'Write failed');
            return;
        }
        echo json_encode(['status' => 'ok']);
        return;
    }
    apiError(405, 'Method not allowed');
}

function apiBulkStatus(FileStorage $storage): void
{
    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $slugs = $_POST['slugs'] ?? [];
    $status = $_POST['status'] ?? '';
    if (!is_array($slugs) || !in_array($status, ['draft', 'published'], true)) {
        apiError(400, 'Invalid parameters');
        return;
    }

    $updated = 0;
    foreach ($slugs as $slug) {
        if (is_string($slug) && FileStorage::validateSlug($slug)) {
            if ($storage->updatePageStatus($slug, $status)) {
                $updated++;
            }
        }
    }

    echo json_encode(['status' => 'ok', 'updated' => $updated]);
}

function apiBulkDelete(FileStorage $storage): void
{
    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $slugs = $_POST['slugs'] ?? [];
    if (!is_array($slugs)) {
        apiError(400, 'Invalid parameters');
        return;
    }

    $deleted = 0;
    foreach ($slugs as $slug) {
        if (is_string($slug) && FileStorage::validateSlug($slug)) {
            if ($storage->deletePage($slug)) {
                $deleted++;
            }
        }
    }

    echo json_encode(['status' => 'ok', 'deleted' => $deleted]);
}

function apiRevisionDiff(FileStorage $storage, string $slug): void
{
    $t1 = $_GET['t1'] ?? '';
    $t2 = $_GET['t2'] ?? '';
    if ($t1 === '' || $t2 === '') {
        apiError(400, 'Missing t1 or t2');
        return;
    }

    $data1 = $storage->getRevisionData($slug, $t1);
    $data2 = $storage->getRevisionData($slug, $t2);
    if ($data1 === false || $data2 === false) {
        apiError(404, 'Revision not found');
        return;
    }

    $blocks1 = $data1['blocks'] ?? [];
    $blocks2 = $data2['blocks'] ?? [];

    $added = [];
    $removed = [];
    $changed = [];

    $max = max(count($blocks1), count($blocks2));
    for ($i = 0; $i < $max; $i++) {
        $b1 = $blocks1[$i] ?? null;
        $b2 = $blocks2[$i] ?? null;
        if ($b1 === null && $b2 !== null) {
            $added[] = ['index' => $i, 'block' => $b2];
        } elseif ($b1 !== null && $b2 === null) {
            $removed[] = ['index' => $i, 'block' => $b1];
        } elseif ($b1 !== null && $b2 !== null && $b1 !== $b2) {
            $changeEntry = ['index' => $i, 'before' => $b1, 'after' => $b2];
            if (($b1['type'] ?? '') !== ($b2['type'] ?? '')) {
                $changeEntry['type_changed'] = true;
            }
            $changed[] = $changeEntry;
        }
    }

    echo json_encode(['slug' => $slug, 't1' => $t1, 't2' => $t2, 'added' => $added, 'removed' => $removed, 'changed' => $changed], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

function apiResponse(array $data, int $flags = 0): void
{
    $json = json_encode($data, $flags);
    if ($json === false) {
        http_response_code(500);
        echo '{"error":"JSON encoding failed"}';
        return;
    }
    echo $json;
}

function apiError(int $code, string $message): void
{
    http_response_code($code);
    $json = json_encode(['error' => $message]);
    if ($json === false) {
        echo '{"error":"JSON encoding failed"}';
        return;
    }
    echo $json;
}
