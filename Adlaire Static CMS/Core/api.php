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

// --- Auth verification helper ---

function verifyApiAuth(FileStorage $storage): bool
{
    $sessionUser = is_string($_SESSION['user'] ?? null) ? ($_SESSION['user'] ?? '') : '';
    $sessionHash = is_string($_SESSION['l'] ?? null) ? ($_SESSION['l'] ?? '') : '';
    if ($sessionUser === '' || $sessionHash === '') {
        return false;
    }
    $userData = $storage->getUser($sessionUser);
    if ($userData === false || !isset($userData['password'])) {
        return false;
    }
    if (isset($userData['enabled']) && $userData['enabled'] === false) {
        return false;
    }
    if (!is_string($userData['password'])) {
        return false;
    }
    return hash_equals($userData['password'], $sessionHash);
}

// --- Admin edit handler ---

function handleEdit(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return;
    }

    $fieldname = $_POST['fieldname'] ?? null;
    $content = $_POST['content'] ?? null;

    if (!is_string($fieldname) || !is_string($content)) {
        return;
    }

    $fieldname = basename(trim($fieldname));
    if ($fieldname === '') {
        return;
    }
    $allowedConfigFields = ['title', 'description', 'keywords', 'copyright', 'sidebar', 'themeSelect', 'language', 'menu', 'status'];
    if (!in_array($fieldname, $allowedConfigFields, true) && !FileStorage::validateSlug($fieldname)) {
        header('HTTP/1.1 400 Bad Request');
        exit;
    }

    if (session_status() !== PHP_SESSION_ACTIVE) {
        header('HTTP/1.1 401 Unauthorized');
        exit;
    }

    $storage = new FileStorage('data');
    if (!verifyApiAuth($storage)) {
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
        // Page content inline save — not supported in PT format.
        // Page content must be saved via the /api/pages endpoint.
        $result = false;
    }

    if (!$result) {
        header('HTTP/1.1 500 Internal Server Error');
        exit;
    }

    header('Content-Type: text/plain; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    $csrfValue = $_SESSION['csrf'] ?? '';
    if (is_string($csrfValue) && $csrfValue !== '' && preg_match('/^[a-f0-9]+$/', $csrfValue)) {
        header('X-CSRF-Token: ' . $csrfValue);
    }
    echo $content;
    exit;
}

// --- REST API handler ---

function handleApi(): void
{
    $endpoint = $_GET['api'] ?? null;
    if ($endpoint === null || !is_string($endpoint)) {
        return;
    }
    $endpoint = trim($endpoint);

    $storage = new FileStorage('data');
    $method = $_SERVER['REQUEST_METHOD'];

    // Non-JSON endpoints
    if ($endpoint === 'sitemap') {
        handleApiSitemap($storage);
        exit;
    }

    header('Content-Type: application/json; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    $origin = is_string($_SERVER['HTTP_ORIGIN'] ?? null) ? ($_SERVER['HTTP_ORIGIN'] ?? '') : '';
    $allowedHost = is_string($_SERVER['HTTP_HOST'] ?? null) ? ($_SERVER['HTTP_HOST'] ?? '') : '';
    if ($origin === 'null' || $origin === '') {
        // Reject null and empty origins
    } elseif ($allowedHost !== '') {
        $parsedHost = parse_url($origin, PHP_URL_HOST);
        $parsedPort = parse_url($origin, PHP_URL_PORT);
        $hostWithPort = $allowedHost;
        $hostOnly = str_contains($allowedHost, ':') ? strstr($allowedHost, ':', true) : $allowedHost;
        if (is_string($parsedHost) && $parsedHost === $hostOnly) {
            $allowedPort = str_contains($allowedHost, ':') ? (int) substr($allowedHost, (int) strpos($allowedHost, ':') + 1) : null;
            if ($allowedPort === null && $parsedPort === null) {
                header('Access-Control-Allow-Origin: ' . $origin);
            } elseif ($parsedPort !== null && $allowedPort !== null && (int) $parsedPort === $allowedPort) {
                header('Access-Control-Allow-Origin: ' . $origin);
            } elseif ($parsedPort === null && $allowedPort === null) {
                header('Access-Control-Allow-Origin: ' . $origin);
            }
        }
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

    if (!verifyApiAuth($storage)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    $apiCsrf = $_SESSION['csrf'] ?? '';
    if (is_string($apiCsrf) && $apiCsrf !== '' && preg_match('/^[a-f0-9]+$/', $apiCsrf)) {
        header('X-CSRF-Token: ' . $apiCsrf);
    }

    match ($endpoint) {
        'pages'     => handleApiPages($storage, $method),
        'revisions' => handleApiRevisions($storage, $method),
        'export'    => handleApiExport($storage),
        'import'    => handleApiImport($storage),
        'generate'  => handleApiGenerate($storage),
        'users'     => handleApiUsers($storage, $method),
        'license'   => handleApiLicense($method),
        // Ver.3.5: メディア管理API（API_RULEBOOK.md §4.9）
        'media'     => handleApiMedia($method),
        default     => apiError(404, 'Unknown endpoint'),
    };
    exit;
}

// --- License API ---

function handleApiLicense(string $method): void
{
    if ($method === 'GET') {
        apiResponse(LicenseManager::getInfo());
        return;
    }

    if ($method !== 'POST') {
        apiError(405, 'Method not allowed');
        return;
    }

    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $action = is_string($_POST['action'] ?? null) ? ($_POST['action'] ?? '') : '';

    if ($action === 'register') {
        $systemKey = LicenseManager::getSystemKey();
        if ($systemKey === '') {
            apiError(400, 'System key not initialized');
            return;
        }

        $licenseServerUrl = is_string($_POST['server_url'] ?? null) ? trim($_POST['server_url'] ?? '') : '';
        if ($licenseServerUrl === '') {
            apiError(400, 'License server URL is required');
            return;
        }

        $domain = $_SERVER['HTTP_HOST'] ?? '';
        $version = App::VERSION;

        // R6-37: JSON_THROW_ON_ERROR を除去し他の json_encode と一貫したエラーチェックに統一
        $payload = json_encode([
            'system_key' => $systemKey,
            'domain' => $domain,
            'product_version' => $version,
            'timestamp' => gmdate('c'),
        ]);
        if ($payload === false) {
            apiError(500, 'Failed to encode license payload');
            return;
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 10,
                'ignore_errors' => true,
            ],
            'ssl' => [
                'verify_peer' => true,
            ],
        ]);

        $url = rtrim($licenseServerUrl, '/') . '/api/license/register';
        $response = @file_get_contents($url, false, $context);

        if ($response === false) {
            apiError(502, 'Failed to connect to license server');
            return;
        }

        $data = json_decode($response, true);
        if (!is_array($data) || ($data['status'] ?? '') !== 'ok') {
            apiError(502, 'License server error: ' . ($data['message'] ?? 'unknown'));
            return;
        }

        $primaryKey = is_string($data['primary_key'] ?? null) ? $data['primary_key'] : '';
        $secondKey = is_string($data['second_key'] ?? null) ? $data['second_key'] : '';

        if ($primaryKey === '' || $secondKey === '') {
            apiError(502, 'Invalid keys received from license server');
            return;
        }

        if (!LicenseManager::registerKeys($primaryKey, $secondKey)) {
            apiError(500, 'Failed to save license keys');
            return;
        }

        apiResponse(['registered' => true]);
        return;
    }

    if ($action === 'third-party') {
        $thirdPartyKey = is_string($_POST['third_party_key'] ?? null) ? trim($_POST['third_party_key'] ?? '') : '';
        if ($thirdPartyKey === '') {
            apiError(400, 'Third-party key is required');
            return;
        }

        if (!LicenseManager::registerThirdPartyKey($thirdPartyKey)) {
            apiError(500, 'Failed to save third-party key');
            return;
        }

        apiResponse(['commercial' => true]);
        return;
    }

    apiError(400, 'Unknown license action');
}

function handleApiPages(FileStorage $storage, string $method): void
{
    $slug = $_GET['slug'] ?? $_POST['slug'] ?? null;
    if ($slug !== null && is_string($slug)) {
        $slug = trim($slug);
    }

    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    $action = is_string($action) ? $action : '';

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
        $summary[$slug] = [
            'status'     => $data['status'] ?? 'published',
            'type'       => $data['type'] ?? 'page',
            'posted_at'  => $data['posted_at'] ?? '',
            'category'   => $data['category'] ?? '',
            'author'     => $data['author'] ?? '',
            'created_at' => $data['created_at'] ?? '',
            'updated_at' => $data['updated_at'] ?? '',
        ];
    }
    apiResponse(['pages' => $summary], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

function apiPageGet(FileStorage $storage, string $slug): void
{
    if (!FileStorage::validateSlug($slug)) {
        apiError(400, 'Invalid slug');
        return;
    }
    $data = $storage->readPageData($slug);
    if ($data === false) {
        apiError(404, 'Page not found');
        return;
    }
    // Return only the fields the frontend needs (exclude large body from summary)
    $response = [
        'body'       => $data['body'] ?? [],
        'status'     => $data['status'] ?? 'published',
        'type'       => $data['type'] ?? 'page',
        'posted_at'  => $data['posted_at'] ?? '',
        'category'   => $data['category'] ?? '',
        'tags'       => $data['tags'] ?? [],
        'author'     => $data['author'] ?? '',
        'created_at' => $data['created_at'] ?? '',
        'updated_at' => $data['updated_at'] ?? '',
    ];
    apiResponse(['page' => $slug, 'data' => $response], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

function apiPageSave(FileStorage $storage): void
{
    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $slug = $_POST['slug'] ?? null;
    $bodyJson = $_POST['body'] ?? null;

    if (!is_string($slug)) {
        apiError(400, 'Missing slug');
        return;
    }
    if (!FileStorage::validateSlug($slug)) {
        apiError(400, 'Invalid slug');
        return;
    }

    if (!is_string($bodyJson)) {
        apiError(400, 'Missing body');
        return;
    }
    $body = json_decode($bodyJson, true, API_PAGE_BODY_DECODE_DEPTH);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($body)) {
        apiError(400, 'Invalid body JSON');
        return;
    }

    if (isset($_POST['status'])) {
        $status = $_POST['status'];
        if (!in_array($status, ['draft', 'published'], true)) {
            apiError(400, 'Invalid status');
            return;
        }
    } else {
        $existing = $storage->readPageData($slug);
        $status = ($existing !== false) ? ($existing['status'] ?? 'draft') : 'draft';
    }

    $type = isset($_POST['type']) && in_array($_POST['type'], ['page', 'post'], true)
        ? $_POST['type']
        : 'page';
    $postedAt = is_string($_POST['posted_at'] ?? null) ? $_POST['posted_at'] : '';
    // R6-30: author / category フィールド最大長チェック（DBなしフラットファイル保護）
    $category = is_string($_POST['category'] ?? null) ? substr($_POST['category'], 0, 200) : '';
    $tagsRaw = is_string($_POST['tags'] ?? null) ? $_POST['tags'] : '';
    $tags = ($tagsRaw !== '') ? json_decode($tagsRaw, true) : [];
    if (!is_array($tags)) {
        $tags = [];
    }
    $author = is_string($_POST['author'] ?? null) ? substr($_POST['author'], 0, 200) : '';

    $result = $storage->writePage($slug, $body, $status, $type, $postedAt, $category, $tags, $author);
    if (!$result) {
        apiError(500, 'Write failed');
        return;
    }

    $warnings = [];
    if ($status === 'published' && $body === []) {
        $warnings[] = 'empty_content';
    }
    if ($status === 'published') {
        $hasHeading = false;
        foreach ($body as $node) {
            if (is_array($node) && ($node['_type'] ?? '') === 'block') {
                $style = $node['style'] ?? '';
                if (in_array($style, ['h1', 'h2', 'h3'], true)) {
                    $hasHeading = true;
                    break;
                }
            }
        }
        if (!$hasHeading) {
            $warnings[] = 'no_heading';
        }
    }

    $response = ['status' => 'ok', 'slug' => $slug];
    if ($warnings !== []) {
        $response['warnings'] = $warnings;
    }
    apiResponse($response);
}

function apiPageStatusUpdate(FileStorage $storage): void
{
    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $slug = $_POST['slug'] ?? null;
    $status = $_POST['status'] ?? null;

    if (!is_string($slug) || !FileStorage::validateSlug($slug)) {
        apiError(400, 'Invalid slug');
        return;
    }
    if (!is_string($status) || !in_array($status, ['draft', 'published'], true)) {
        apiError(400, 'Invalid status');
        return;
    }

    $result = $storage->updatePageStatus($slug, $status);
    if (!$result) {
        apiError(404, 'Page not found');
        return;
    }

    apiResponse(['status' => 'ok', 'slug' => $slug, 'page_status' => $status]);
}

function apiPageDelete(FileStorage $storage, string|null $slug): void
{
    if (!is_string($slug) || !FileStorage::validateSlug($slug)) {
        apiError(400, 'Invalid slug');
        return;
    }

    $csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($csrfToken) || $csrfToken === '') {
        apiError(403, 'CSRF verification failed');
        return;
    }
    $session = $_SESSION['csrf'] ?? '';
    if (!is_string($session) || $session === '' || !hash_equals($session, $csrfToken)) {
        apiError(403, 'CSRF verification failed');
        return;
    }
    $_SESSION['csrf'] = bin2hex(random_bytes(32));

    $result = $storage->deletePage($slug);
    if (!$result) {
        apiError(404, 'Page not found');
        return;
    }

    apiResponse(['status' => 'ok', 'deleted' => $slug]);
}

function handleApiRevisions(FileStorage $storage, string $method): void
{
    $slug = $_GET['slug'] ?? $_POST['slug'] ?? null;
    if (!is_string($slug) || !FileStorage::validateSlug($slug)) {
        apiError(400, 'Invalid slug');
        return;
    }

    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    $action = is_string($action) ? $action : '';
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
    apiResponse(['slug' => $slug, 'revisions' => $revisions], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

function apiRevisionRestore(FileStorage $storage, string $slug): void
{
    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $timestamp = $_POST['timestamp'] ?? null;
    if (!is_string($timestamp) || $timestamp === '') {
        apiError(400, 'Missing timestamp');
        return;
    }
    // Note: TIMESTAMP_PATTERN validates format (\d{8}_\d{6}) but does not
    // validate date ranges (e.g., month 13 or day 32 would pass).
    // restoreRevision() performs the pattern check and file existence check,
    // so invalid dates simply won't match any revision file.

    $result = $storage->restoreRevision($slug, $timestamp);
    if (!$result) {
        apiError(404, 'Revision not found');
        return;
    }

    apiResponse(['status' => 'ok', 'restored' => $slug, 'timestamp' => $timestamp]);
}

// --- Search API ---

/** R6-13: JSON decode depth for page body (PT format, depth 64 is sufficient) */
const API_PAGE_BODY_DECODE_DEPTH = 64;

/** Maximum search query length */
const API_SEARCH_MAX_QUERY_LENGTH = 200;

/** Maximum search snippet length */
const API_SEARCH_SNIPPET_LENGTH = 120;

/** Search snippet context chars before match */
const API_SEARCH_SNIPPET_CONTEXT = 40;

function handleApiSearch(FileStorage $storage): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        apiError(405, 'Method not allowed');
        return;
    }
    $rawQuery = is_string($_GET['q'] ?? null) ? trim($_GET['q'] ?? '') : '';
    if ($rawQuery === '' || mb_strlen($rawQuery, 'UTF-8') > API_SEARCH_MAX_QUERY_LENGTH) {
        apiResponse(['results' => []]);
        return;
    }

    $query = mb_strtolower($rawQuery, 'UTF-8');
    $pages = $storage->listPublishedPages();
    $results = [];

    foreach ($pages as $slug => $data) {
        $ptBody = is_array($data['body'] ?? null) ? $data['body'] : [];
        $plainText = extractTextFromPT($ptBody);
        $content = mb_strtolower($plainText, 'UTF-8');
        $pos = mb_strpos($content, $query, 0, 'UTF-8');
        if ($pos === false) {
            continue;
        }

        $start = max(0, $pos - API_SEARCH_SNIPPET_CONTEXT);
        $snippet = mb_substr($plainText, $start, API_SEARCH_SNIPPET_LENGTH, 'UTF-8');
        if ($start > 0) {
            $snippet = '...' . $snippet;
        }

        $results[] = [
            'slug'       => $slug,
            'snippet'    => $snippet,
            'type'       => $data['type'] ?? 'page',
            'status'     => $data['status'] ?? 'published',
            'updated_at' => $data['updated_at'] ?? '',
        ];
    }

    apiResponse(['query' => $rawQuery, 'results' => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

// --- Sitemap API ---

function handleApiSitemap(FileStorage $storage): void
{
    header('Content-Type: application/xml; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: public, max-age=3600');

    $app = App::getInstance();
    $httpsVal = $_SERVER['HTTPS'] ?? '';
    $isHttps = is_string($httpsVal) && $httpsVal !== '' && $httpsVal !== 'off';
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
        $updatedAt = $data['updated_at'] ?? '';
        $lastmod = strlen($updatedAt) >= 10 ? htmlspecialchars(substr($updatedAt, 0, 10), ENT_XML1, 'UTF-8') : '';
        $xml .= "  <url>\n";
        $xml .= "    <loc>{$loc}</loc>\n";
        if ($lastmod !== '') {
            $xml .= "    <lastmod>{$lastmod}</lastmod>\n";
        }
        $xml .= "  </url>\n";
    }

    $xml .= '</urlset>';
    echo $xml;
}

// --- Export API ---

function handleApiExport(FileStorage $storage): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        apiError(405, 'Method not allowed');
        return;
    }

    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    if (!isMainMasterSession($storage)) {
        apiError(403, 'Main master access required');
        return;
    }

    $config = $storage->readConfig();
    unset($config['password'], $config['session'], $config['csrf'], $config['loggedin']);

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

    $exportJson = json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($exportJson === false) {
        header('Content-Type: application/json; charset=UTF-8');
        apiError(500, 'Export JSON encoding failed');
        return;
    }
    $safeDate = preg_replace('/[^0-9_]/', '', date('Ymd_His'));
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="adlaire-export-' . $safeDate . '.json"');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo $exportJson;
}

// --- Import API ---

/** Maximum import file size in bytes (16 MB) */
const API_MAX_IMPORT_SIZE = 16 * 1024 * 1024;

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

    if (!isMainMasterSession($storage)) {
        apiError(403, 'Main master access required');
        return;
    }

    $maxImportSize = API_MAX_IMPORT_SIZE;
    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > $maxImportSize) {
        apiError(413, 'Import data exceeds 16MB limit');
        return;
    }

    $rawInput = file_get_contents('php://input', false, null, 0, $maxImportSize + 1);
    $input = ($rawInput !== false && $rawInput !== '') ? $rawInput : '';
    if ($input === '') {
        $input = is_string($_POST['data'] ?? null) ? ($_POST['data'] ?? '') : '';
    }

    if ($input === '') {
        apiError(400, 'Empty request body');
        return;
    }

    if (strlen($input) > $maxImportSize) {
        apiError(413, 'Import data exceeds 16MB limit');
        return;
    }

    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    if (is_string($contentType) && $contentType !== '' && !str_contains($contentType, 'application/json') && !str_contains($contentType, 'text/plain')) {
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

    // Import pages (PT format)
    $allowedPageKeys = ['body', 'status', 'type', 'posted_at', 'category', 'tags', 'author', 'created_at', 'updated_at'];
    if (isset($data['pages']) && is_array($data['pages'])) {
        foreach ($data['pages'] as $slug => $pageData) {
            if (!is_string($slug) || !FileStorage::validateSlug($slug) || !is_array($pageData) || !isset($pageData['body'])) {
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
            $body = is_array($pageData['body'] ?? null) ? $pageData['body'] : [];
            $status = $pageData['status'] ?? 'published';
            $type = $pageData['type'] ?? 'page';
            $postedAt = $pageData['posted_at'] ?? '';
            $category = $pageData['category'] ?? '';
            $tags = is_array($pageData['tags'] ?? null) ? $pageData['tags'] : [];
            $author = $pageData['author'] ?? '';
            $storage->writePage($slug, $body, $status, $type, $postedAt, $category, $tags, $author);
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
            if (is_link($revDir)) {
                continue;
            }
            if (!is_dir($revDir)) {
                if (!@mkdir($revDir, 0755, true) && !is_dir($revDir)) {
                    error_log('Adlaire: Failed to create revision directory for import: ' . $slug);
                    continue;
                }
            }
            foreach ($revisions as $ts => $revData) {
                if (!is_string($ts) || !preg_match('/^\d{8}_\d{6}(_[a-f0-9]+)?$/', $ts)) {
                    continue;
                }
                // R6-12: PT形式では 'body' キーを使用（'content' は旧形式）
                if (!is_array($revData) || !isset($revData['body'])) {
                    continue;
                }
                $revFile = $revDir . '/' . $ts . '.json';
                if (!file_exists($revFile)) {
                    $revJson = json_encode($revData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                    if ($revJson === false) {
                        continue;
                    }
                    $tmpRev = tempnam(dirname($revFile), '.tmp_');
                    if ($tmpRev !== false && file_put_contents($tmpRev, $revJson, LOCK_EX) !== false) {
                        chmod($tmpRev, 0600);
                        if (rename($tmpRev, $revFile)) {
                            $revCount++;
                        } else {
                            @unlink($tmpRev);
                        }
                    } elseif ($tmpRev !== false) {
                        @unlink($tmpRev);
                    }
                }
            }
        }
        $imported['revisions'] = $revCount;
    }

    apiResponse(['status' => 'ok', 'imported' => $imported]);
}

// --- Version API ---

function handleApiVersion(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        apiError(405, 'Method not allowed');
        return;
    }
    header('Cache-Control: public, max-age=60');
    $versionFile = dirname(__DIR__) . '/VERSION';
    $version = (file_exists($versionFile) && !is_link($versionFile)) ? trim((string) file_get_contents($versionFile)) : App::VERSION;

    apiResponse([
        'product' => 'Adlaire',
        'version' => $version,
        'app_version' => App::VERSION,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}


// --- Users API ---

function isMainMasterSession(FileStorage $storage): bool
{
    $sessionUser = is_string($_SESSION['user'] ?? null) ? ($_SESSION['user'] ?? '') : '';
    if ($sessionUser === '') {
        return false;
    }
    $userData = $storage->getUser($sessionUser);
    if ($userData === false) {
        return false;
    }
    return ($userData['is_main'] ?? false) === true;
}

function handleApiUsers(FileStorage $storage, string $method): void
{
    if (!isMainMasterSession($storage)) {
        apiError(403, 'Main master access required');
        return;
    }

    if ($method === 'GET') {
        $users = $storage->listUsers();
        // Don't expose password hashes or tokens in user list
        foreach ($users as $uname => &$udata) {
            unset($udata['password'], $udata['token']);
        }
        unset($udata);
        apiResponse(['users' => $users], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        return;
    }

    if ($method === 'POST') {
        if (!csrf_verify()) {
            apiError(403, 'CSRF verification failed');
            return;
        }

        // R6-3: application/json ボディを $_POST にフォールバックして読む
        $jsonBody = null;
        $ct = is_string($_SERVER['CONTENT_TYPE'] ?? null) ? ($_SERVER['CONTENT_TYPE'] ?? '') : '';
        if (str_contains($ct, 'application/json')) {
            $raw = file_get_contents('php://input');
            if ($raw !== false && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $jsonBody = $decoded;
                }
            }
        }

        $action = is_string($jsonBody['action'] ?? null)
            ? (string) ($jsonBody['action'] ?? '')
            : (is_string($_POST['action'] ?? null) ? (string) ($_POST['action'] ?? '') : '');

        // R6-5: 'generate_sub_master' および 'generate' の両方を受け付ける
        if ($action === 'generate' || $action === 'generate_sub_master') {
            $credentials = $storage->generateSubMasterCredentials();
            $loginId = $credentials['login_id'];
            $password = $credentials['password'];
            $token = $credentials['token'];

            $existing = $storage->getUser($loginId);
            if ($existing !== false) {
                apiError(409, 'ID collision, please try again');
                return;
            }

            $sessionUser = is_string($_SESSION['user'] ?? null) ? ($_SESSION['user'] ?? '') : '';
            $userData = [
                'password' => password_hash($password, PASSWORD_DEFAULT),
                'role' => 'master',
                'is_main' => false,
                'token' => password_hash($token, PASSWORD_DEFAULT),
                'enabled' => true,
                'created_by' => $sessionUser,
                'created_at' => date('c'),
                'last_login' => '',
            ];
            if (!$storage->writeUser($loginId, $userData)) {
                apiError(400, 'Maximum user limit reached');
                return;
            }
            apiResponse([
                'status' => 'ok',
                'credentials' => [
                    'login_id' => $loginId,
                    'password' => $password,
                    'token' => $token,
                ],
            ]);
            return;
        }

        if ($action === 'disable') {
            // R6-7: 'username' および旧来の 'user' フィールド両方に対応
            $username = is_string($jsonBody['username'] ?? null)
                ? trim((string) ($jsonBody['username'] ?? ''))
                : (is_string($_POST['username'] ?? null)
                    ? trim((string) ($_POST['username'] ?? ''))
                    : (is_string($_POST['user'] ?? null) ? trim((string) ($_POST['user'] ?? '')) : ''));
            if ($username === '') {
                apiError(400, 'Invalid username');
                return;
            }
            $targetUser = $storage->getUser($username);
            if ($targetUser === false) {
                apiError(404, 'User not found');
                return;
            }
            if (!empty($targetUser['is_main'])) {
                apiError(400, 'Cannot disable main master');
                return;
            }
            if (!$storage->disableUser($username)) {
                apiError(500, 'Failed to disable user');
                return;
            }
            apiResponse(['status' => 'ok', 'disabled' => $username]);
            return;
        }

        // R6-6: 'update_main_password' および 'password' の両方を受け付ける
        if ($action === 'password' || $action === 'update_main_password') {
            $sessionUser = is_string($_SESSION['user'] ?? null) ? ($_SESSION['user'] ?? '') : '';
            // 'new_password' フィールド（api.ts 送信）と旧来の 'password' フィールド両方に対応
            $newPassword = is_string($jsonBody['new_password'] ?? null)
                ? (string) ($jsonBody['new_password'] ?? '')
                : (is_string($_POST['new_password'] ?? null)
                    ? (string) ($_POST['new_password'] ?? '')
                    : (is_string($_POST['password'] ?? null) ? (string) ($_POST['password'] ?? '') : ''));
            if ($newPassword === '' || strlen($newPassword) < 8) {
                apiError(400, 'Password must be at least 8 characters');
                return;
            }
            if (strlen($newPassword) > 256) {
                apiError(400, 'Password is too long');
                return;
            }
            $weakPasswords = ['admin', 'password', '12345678', 'adlaire'];
            if (in_array(strtolower($newPassword), $weakPasswords, true)) {
                apiError(400, 'Password is too weak');
                return;
            }
            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
            if (!$storage->writeUser($sessionUser, ['password' => $newHash])) {
                apiError(500, 'Failed to update password');
                return;
            }
            $_SESSION['l'] = $newHash;
            apiResponse(['status' => 'ok']);
            return;
        }

        apiError(400, 'Invalid action');
        return;
    }

    if ($method === 'DELETE') {
        $csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($csrfToken) || $csrfToken === '') {
            apiError(403, 'CSRF verification failed');
            return;
        }
        $csrfSession = $_SESSION['csrf'] ?? '';
        if (!is_string($csrfSession) || $csrfSession === '' || !hash_equals($csrfSession, $csrfToken)) {
            apiError(403, 'CSRF verification failed');
            return;
        }
        $_SESSION['csrf'] = bin2hex(random_bytes(32));

        // R6-4: $_GET['username'] に優先、JSON ボディからも読む
        $username = is_string($_GET['username'] ?? null) ? trim($_GET['username'] ?? '') : '';
        if ($username === '') {
            // JSON ボディ（api.ts が送信する形式）からフォールバック
            $raw = file_get_contents('php://input');
            if ($raw !== false && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded) && is_string($decoded['username'] ?? null)) {
                    $username = trim((string) ($decoded['username'] ?? ''));
                }
            }
        }
        if ($username === '') {
            apiError(400, 'Invalid username');
            return;
        }
        $sessionUser = is_string($_SESSION['user'] ?? null) ? ($_SESSION['user'] ?? '') : '';
        if ($username === $sessionUser) {
            apiError(400, 'Cannot delete yourself');
            return;
        }
        $targetUser = $storage->getUser($username);
        if ($targetUser !== false && !empty($targetUser['is_main'])) {
            apiError(400, 'Cannot delete main master');
            return;
        }
        if (!$storage->deleteUser($username)) {
            apiError(400, 'Cannot delete user (not found or last remaining)');
            return;
        }
        apiResponse(['status' => 'ok', 'deleted' => $username]);
        return;
    }

    apiError(405, 'Method not allowed');
}

function apiPageReorder(FileStorage $storage): void
{
    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $raw = $_POST['slugs'] ?? '';
    $slugs = is_array($raw) ? $raw : (is_string($raw) ? json_decode($raw, true) : null);
    if (!is_array($slugs) || $slugs === []) {
        apiError(400, 'Invalid slugs');
        return;
    }

    // Deduplicate to prevent ordering inconsistencies
    $seen = [];
    $uniqueSlugs = [];
    foreach ($slugs as $s) {
        if (!is_string($s) || !FileStorage::validateSlug($s)) {
            apiError(400, 'Invalid slug in list');
            return;
        }
        if (!isset($seen[$s])) {
            $seen[$s] = true;
            $uniqueSlugs[] = $s;
        }
    }
    $slugs = $uniqueSlugs;

    $result = $storage->savePageOrder($slugs);
    if (!$result) {
        apiError(500, 'Write failed');
        return;
    }

    apiResponse(['status' => 'ok']);
}

function apiSidebar(FileStorage $storage, string $method): void
{
    $app = App::getInstance();
    if ($method === 'GET') {
        $body = $app->getSidebarBody();
        apiResponse(['body' => $body], JSON_UNESCAPED_UNICODE);
        return;
    }
    if ($method === 'POST') {
        if (!csrf_verify()) {
            apiError(403, 'CSRF verification failed');
            return;
        }
        $raw = $_POST['body'] ?? '';
        if (!is_string($raw)) {
            apiError(400, 'Invalid body parameter');
            return;
        }
        $ptBody = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($ptBody)) {
            apiError(400, 'Invalid body JSON');
            return;
        }
        $result = $app->saveSidebarBody($ptBody);
        if (!$result) {
            apiError(500, 'Write failed');
            return;
        }
        apiResponse(['status' => 'ok']);
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
    $status = is_string($_POST['status'] ?? '') ? ($_POST['status'] ?? '') : '';
    if (!is_array($slugs) || !in_array($status, ['draft', 'published'], true)) {
        apiError(400, 'Invalid parameters');
        return;
    }

    $updated = 0;
    foreach ($slugs as $slug) {
        if (is_string($slug) && FileStorage::validateSlug($slug)) {
            // R6-25: 存在しない slug に対するステータス更新を防止
            if ($storage->readPageData($slug) === false) {
                continue;
            }
            if ($storage->updatePageStatus($slug, $status)) {
                $updated++;
            }
        }
    }

    apiResponse(['status' => 'ok', 'updated' => $updated]);
}

function apiBulkDelete(FileStorage $storage): void
{
    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    if (!isMainMasterSession($storage)) {
        apiError(403, 'Main master access required');
        return;
    }

    $slugs = $_POST['slugs'] ?? [];
    if (!is_array($slugs) || count($slugs) === 0) {
        apiError(400, 'Invalid parameters');
        return;
    }

    $deleted = 0;
    $failed = [];
    foreach ($slugs as $slug) {
        if (is_string($slug) && FileStorage::validateSlug($slug)) {
            if ($storage->deletePage($slug)) {
                $deleted++;
            } else {
                $failed[] = $slug;
            }
        }
    }

    $response = ['status' => 'ok', 'deleted' => $deleted];
    if ($failed !== []) {
        $response['failed'] = $failed;
    }
    apiResponse($response);
}

function apiRevisionDiff(FileStorage $storage, string $slug): void
{
    $t1 = is_string($_GET['t1'] ?? '') ? ($_GET['t1'] ?? '') : '';
    $t2 = is_string($_GET['t2'] ?? '') ? ($_GET['t2'] ?? '') : '';
    if ($t1 === '' || $t2 === '') {
        apiError(400, 'Missing t1 or t2');
        return;
    }
    // R6-40: タイムスタンプ形式バリデーション（任意文字列でのファイルアクセス試行防止）
    if (!preg_match('/^\d{8}_\d{6}(_[a-f0-9]+)?$/', $t1) || !preg_match('/^\d{8}_\d{6}(_[a-f0-9]+)?$/', $t2)) {
        apiError(400, 'Invalid timestamp format');
        return;
    }
    if ($t1 === $t2) {
        apiResponse(['slug' => $slug, 't1' => $t1, 't2' => $t2, 'added' => [], 'removed' => [], 'changed' => []], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        return;
    }

    $data1 = $storage->getRevisionData($slug, $t1);
    $data2 = $storage->getRevisionData($slug, $t2);
    if ($data1 === false || $data2 === false) {
        apiError(404, 'Revision not found');
        return;
    }

    // R6-8: PT形式では 'body' キーを使用（'blocks' は旧形式）
    $blocks1 = is_array($data1['body'] ?? null) ? $data1['body'] : [];
    $blocks2 = is_array($data2['body'] ?? null) ? $data2['body'] : [];

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

    apiResponse(['slug' => $slug, 't1' => $t1, 't2' => $t2, 'added' => $added, 'removed' => $removed, 'changed' => $changed], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

// --- Media API (Ver.3.5: API_RULEBOOK.md §4.9) ---

/** Media storage directory (relative to CMS root) */
const API_MEDIA_DIR = 'data/media';

/** Allowed media extensions */
const API_MEDIA_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

/** Maximum upload file size (10 MB) */
const API_MEDIA_MAX_SIZE = 10 * 1024 * 1024;

/**
 * Validate a media filename: only alphanumerics, dash, underscore, dot. No path traversal.
 */
function validateMediaFilename(string $name): bool
{
    return $name !== '' && preg_match('/^[a-zA-Z0-9_\-\.]+$/', $name) === 1 && !str_contains($name, '..');
}

function handleApiMedia(string $method): void
{
    $mediaDir = dirname(__DIR__) . '/' . API_MEDIA_DIR;

    if ($method === 'GET') {
        // List media files
        $files = [];
        if (is_dir($mediaDir)) {
            $entries = scandir($mediaDir);
            if ($entries !== false) {
                foreach ($entries as $entry) {
                    if ($entry === '.' || $entry === '..') {
                        continue;
                    }
                    $path = $mediaDir . '/' . $entry;
                    if (!is_file($path) || is_link($path)) {
                        continue;
                    }
                    $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
                    if (!in_array($ext, API_MEDIA_ALLOWED_EXTENSIONS, true)) {
                        continue;
                    }
                    $files[] = [
                        'name'       => $entry,
                        'size'       => (int) filesize($path),
                        'updated_at' => date('c', (int) filemtime($path)),
                    ];
                }
            }
        }
        apiResponse(['files' => $files], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        return;
    }

    if ($method === 'POST') {
        if (!csrf_verify()) {
            apiError(403, 'CSRF verification failed');
            return;
        }

        // Create media directory if needed
        if (!is_dir($mediaDir)) {
            if (!@mkdir($mediaDir, 0755, true) && !is_dir($mediaDir)) {
                // R6-33: ディレクトリ作成失敗時のエラーログ追加
                error_log('Adlaire: Failed to create media directory: ' . $mediaDir);
                apiError(500, 'Failed to create media directory');
                return;
            }
        }

        $uploadedFile = $_FILES['file'] ?? null;
        if (!is_array($uploadedFile) || !isset($uploadedFile['tmp_name']) || !is_string($uploadedFile['tmp_name'])) {
            apiError(400, 'No file uploaded');
            return;
        }

        $tmpName = $uploadedFile['tmp_name'];
        // R6-10: $_FILES エラーコードチェック（PHPアップロードエラー検出）
        $uploadError = (int) ($uploadedFile['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($uploadError !== UPLOAD_ERR_OK) {
            apiError(400, 'Upload error: ' . $uploadError);
            return;
        }
        if (!is_uploaded_file($tmpName)) {
            apiError(400, 'Invalid upload');
            return;
        }

        // R6-29: $_FILES['size'] は信頼できないため実際のファイルサイズを再確認
        $fileSize = (int) filesize($tmpName);
        if ($fileSize <= 0) {
            $fileSize = (int) ($uploadedFile['size'] ?? 0);
        }
        if ($fileSize > API_MEDIA_MAX_SIZE) {
            apiError(413, 'File exceeds 10MB limit');
            return;
        }

        $originalName = is_string($uploadedFile['name'] ?? null) ? $uploadedFile['name'] : '';
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        if (!in_array($ext, API_MEDIA_ALLOWED_EXTENSIONS, true)) {
            apiError(400, 'Unsupported file type');
            return;
        }

        // R6-11: MIMEタイプ検証（拡張子偽装対策）
        $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $mimeType = finfo_file($finfo, $tmpName);
            finfo_close($finfo);
            if ($mimeType === false || !in_array($mimeType, $allowedMimes, true)) {
                apiError(400, 'Invalid file type');
                return;
            }
        }

        // Sanitize filename: strip path components, allow only safe characters
        $baseName = pathinfo($originalName, PATHINFO_FILENAME);
        $safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $baseName) ?? 'file';
        $safeName = trim($safeName, '_');
        // R6-45: 予測可能な 'upload' フォールバック名をランダム化
        if ($safeName === '') {
            $safeName = 'file_' . bin2hex(random_bytes(4));
        }

        // Deduplicate: append timestamp suffix if file exists
        $filename = $safeName . '.' . $ext;
        $destPath = $mediaDir . '/' . $filename;
        // R6-18: time()の衝突リスク排除 — random_bytes使用
        if (file_exists($destPath)) {
            $filename = $safeName . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
            $destPath = $mediaDir . '/' . $filename;
        }

        if (!move_uploaded_file($tmpName, $destPath)) {
            apiError(500, 'Failed to save file');
            return;
        }
        chmod($destPath, 0644);

        $url = '/' . API_MEDIA_DIR . '/' . $filename;
        apiResponse(['status' => 'ok', 'filename' => $filename, 'url' => $url]);
        return;
    }

    if ($method === 'DELETE') {
        $csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($csrfToken) || $csrfToken === '') {
            apiError(403, 'CSRF verification failed');
            return;
        }
        $csrfSession = $_SESSION['csrf'] ?? '';
        if (!is_string($csrfSession) || $csrfSession === '' || !hash_equals($csrfSession, $csrfToken)) {
            apiError(403, 'CSRF verification failed');
            return;
        }
        $_SESSION['csrf'] = bin2hex(random_bytes(32));

        $file = is_string($_GET['file'] ?? null) ? trim($_GET['file'] ?? '') : '';
        if (!validateMediaFilename($file)) {
            apiError(400, 'Invalid filename');
            return;
        }

        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (!in_array($ext, API_MEDIA_ALLOWED_EXTENSIONS, true)) {
            apiError(400, 'Unsupported file type');
            return;
        }

        $filePath = $mediaDir . '/' . $file;
        // Resolve real path to prevent path traversal
        $realMedia = realpath($mediaDir);
        $realFile = realpath($filePath);
        if ($realFile === false || $realMedia === false || !str_starts_with($realFile, $realMedia . DIRECTORY_SEPARATOR)) {
            apiError(400, 'Invalid file path');
            return;
        }
        if (!is_file($realFile) || is_link($realFile)) {
            apiError(404, 'File not found');
            return;
        }

        if (!unlink($realFile)) {
            apiError(500, 'Failed to delete file');
            return;
        }

        apiResponse(['status' => 'ok', 'deleted' => $file]);
        return;
    }

    apiError(405, 'Method not allowed');
}

function apiResponse(array $data, int $flags = 0): void
{
    $json = json_encode($data, $flags);
    if ($json === false) {
        http_response_code(500);
        error_log('Adlaire: JSON encoding failed: ' . json_last_error_msg());
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
