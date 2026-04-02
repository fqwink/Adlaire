<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - API
 *
 * REST API handlers and admin edit handler.
 * Depends on: helpers.php, core.php, app.php, renderer.php
 *
 * @copyright Copyright (c) 2014 - 2026 IEAS Group
 * @copyright Copyright (c) 2014 - 2026 AIZM
 * @license Adlaire License
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

    $storage = new FileStorage('files');
    $config = $storage->readConfig();
    if (!isset($_SESSION['l']) || !hash_equals($config['password'] ?? '', $_SESSION['l'])) {
        header('HTTP/1.1 401 Unauthorized');
        exit;
    }

    csrf_verify();

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
    header('X-CSRF-Token: ' . ($_SESSION['csrf'] ?? ''));
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

    $storage = new FileStorage('files');
    $method = $_SERVER['REQUEST_METHOD'];

    // Non-JSON endpoints
    if ($endpoint === 'sitemap') {
        handleApiSitemap($storage);
        exit;
    }

    header('Content-Type: application/json; charset=UTF-8');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowedHost = $_SERVER['HTTP_HOST'] ?? '';
    if ($origin !== '' && $allowedHost !== '') {
        $parsed = parse_url($origin, PHP_URL_HOST);
        if ($parsed === $allowedHost) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
    }
    header('X-CSRF-Token: ' . ($_SESSION['csrf'] ?? ''));

    // Public endpoints (no authentication)
    if ($endpoint === 'search') {
        handleApiSearch($storage);
        exit;
    }
    if ($endpoint === 'version') {
        handleApiVersion();
        exit;
    }

    // Authenticated endpoints
    $config = $storage->readConfig();
    if (!isset($_SESSION['l']) || !hash_equals($config['password'] ?? '', $_SESSION['l'])) {
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
    // Strip content from listing for efficiency
    $summary = [];
    foreach ($pages as $slug => $data) {
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
    csrf_verify();

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
        if (!is_array($blocks)) {
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

    echo json_encode(['status' => 'ok', 'slug' => $slug]);
}

function apiPageStatusUpdate(FileStorage $storage): void
{
    csrf_verify();

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

    csrf_verify();

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
    csrf_verify();

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
    $pages = $storage->listPublishedPages();
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

    echo json_encode(['query' => $rawQuery, 'results' => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

// --- Sitemap API ---

function handleApiSitemap(FileStorage $storage): void
{
    header('Content-Type: application/xml; charset=UTF-8');

    $isHttps = ($_SERVER['HTTPS'] ?? '') === 'on';
    $host = ($isHttps ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
    $basePath = dirname($_SERVER['SCRIPT_NAME']);
    if ($basePath === '/') {
        $basePath = '';
    }

    $pages = $storage->listPublishedPages();

    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

    // Home page
    $homeLoc = htmlspecialchars("{$host}{$basePath}/", ENT_XML1, 'UTF-8');
    $xml .= "  <url>\n";
    $xml .= "    <loc>{$homeLoc}</loc>\n";
    $xml .= "    <changefreq>weekly</changefreq>\n";
    $xml .= "  </url>\n";

    foreach ($pages as $slug => $data) {
        $loc = htmlspecialchars("{$host}{$basePath}/{$slug}", ENT_XML1, 'UTF-8');
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

    csrf_verify();

    $input = file_get_contents('php://input');
    if ($input === false || $input === '') {
        $input = $_POST['data'] ?? '';
    }

    if ($input === '') {
        apiError(400, 'Empty request body');
        return;
    }

    $data = json_decode($input, true);
    if (!is_array($data)) {
        apiError(400, 'Invalid JSON');
        return;
    }

    $imported = ['config' => false, 'pages' => 0];

    // Import config
    if (isset($data['config']) && is_array($data['config'])) {
        // Don't overwrite password on import
        unset($data['config']['password']);
        if ($data['config'] !== []) {
            $storage->writeConfig($data['config']);
            $imported['config'] = true;
        }
    }

    // Import pages
    if (isset($data['pages']) && is_array($data['pages'])) {
        foreach ($data['pages'] as $slug => $pageData) {
            if (!FileStorage::validateSlug($slug) || !isset($pageData['content'])) {
                continue;
            }
            $format = $pageData['format'] ?? 'blocks';
            $blocks = $pageData['blocks'] ?? null;
            $status = $pageData['status'] ?? 'published';
            $storage->writePage($slug, $pageData['content'], $format, $blocks, $status);
            $imported['pages']++;
        }
    }

    echo json_encode(['status' => 'ok', 'imported' => $imported]);
}

// --- Version API ---

function handleApiVersion(): void
{
    $versionFile = __DIR__ . '/VERSION';
    $version = file_exists($versionFile) ? trim((string) file_get_contents($versionFile)) : App::VERSION;

    $lockFile = __DIR__ . '/files/system/install.lock';
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

function apiError(int $code, string $message): void
{
    http_response_code($code);
    echo json_encode(['error' => $message]);
}
