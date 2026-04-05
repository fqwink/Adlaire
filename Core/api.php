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
    return hash_equals((string) $userData['password'], $sessionHash);
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
    $allowedConfigFields = ['title', 'description', 'keywords', 'copyright', 'sidebar', 'themeSelect', 'language', 'menu', 'content', 'status', 'format', 'blocks'];
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
    $endpoint = $_GET['api'] ?? $_POST['api'] ?? null;
    if ($endpoint === null || !is_string($endpoint)) {
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
        default     => apiError(404, 'Unknown endpoint'),
    };
    exit;
}

function handleApiPages(FileStorage $storage, string $method): void
{
    $slug = $_REQUEST['slug'] ?? null;
    if ($slug !== null && is_string($slug)) {
        $slug = trim($slug);
    }

    $action = is_string($_REQUEST['action'] ?? '') ? ($_REQUEST['action'] ?? '') : '';

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
            'format'     => $data['format'] ?? 'blocks',
            'status'     => $data['status'] ?? 'published',
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
    apiResponse(['page' => $slug, 'data' => $data], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
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

    if (!is_string($slug) || !is_string($content)) {
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

    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $result = $storage->deletePage($slug);
    if (!$result) {
        apiError(404, 'Page not found');
        return;
    }

    apiResponse(['status' => 'ok', 'deleted' => $slug]);
}

function handleApiRevisions(FileStorage $storage, string $method): void
{
    $slug = $_REQUEST['slug'] ?? null;
    if (!is_string($slug) || !FileStorage::validateSlug($slug)) {
        apiError(400, 'Invalid slug');
        return;
    }

    $action = is_string($_REQUEST['action'] ?? '') ? ($_REQUEST['action'] ?? '') : '';
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

    $result = $storage->restoreRevision($slug, $timestamp);
    if (!$result) {
        apiError(404, 'Revision not found');
        return;
    }

    apiResponse(['status' => 'ok', 'restored' => $slug, 'timestamp' => $timestamp]);
}

// --- Search API ---

/** Maximum search query length */
const API_SEARCH_MAX_QUERY_LENGTH = 200;

/** Maximum search snippet length */
const API_SEARCH_SNIPPET_LENGTH = 120;

/** Search snippet context chars before match */
const API_SEARCH_SNIPPET_CONTEXT = 40;

function handleApiSearch(FileStorage $storage): void
{
    $rawQuery = is_string($_REQUEST['q'] ?? null) ? trim($_REQUEST['q'] ?? '') : '';
    if ($rawQuery === '' || mb_strlen($rawQuery, 'UTF-8') > API_SEARCH_MAX_QUERY_LENGTH) {
        apiResponse(['results' => []]);
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

        $start = max(0, $pos - API_SEARCH_SNIPPET_CONTEXT);
        $snippet = mb_substr($data['content'], $start, API_SEARCH_SNIPPET_LENGTH, 'UTF-8');
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

    $maxImportSize = API_MAX_IMPORT_SIZE;
    $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > $maxImportSize) {
        apiError(413, 'Import data exceeds 16MB limit');
        return;
    }

    static $rawInput = null;
    if ($rawInput === null) {
        $rawInput = file_get_contents('php://input', false, null, 0, $maxImportSize + 1);
    }
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
    if ($contentType !== '' && !str_contains($contentType, 'application/json')) {
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
                if (!is_array($revData) || !isset($revData['content'])) {
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
    header('Cache-Control: public, max-age=60');
    $versionFile = dirname(__DIR__) . '/VERSION';
    $version = file_exists($versionFile) ? trim((string) file_get_contents($versionFile)) : App::VERSION;

    $lockFile = dirname(__DIR__) . '/data/system/install.lock';
    $installed = file_exists($lockFile) && !is_link($lockFile);
    $installedAt = '';
    if ($installed) {
        $lockContent = file_get_contents($lockFile);
        if ($lockContent !== false) {
            $lock = json_decode($lockContent, true);
            $installedAt = is_array($lock) ? ($lock['installed_at'] ?? '') : '';
        }
    }

    apiResponse([
        'product' => 'Adlaire',
        'version' => $version,
        'app_version' => App::VERSION,
        'installed' => $installed,
        'installed_at' => $installedAt,
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
        apiResponse(['users' => $users], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        return;
    }

    if ($method === 'POST') {
        if (!csrf_verify()) {
            apiError(403, 'CSRF verification failed');
            return;
        }
        $action = $_POST['action'] ?? '';

        if ($action === 'generate') {
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
            $username = is_string($_POST['user'] ?? null) ? trim($_POST['user'] ?? '') : '';
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

        if ($action === 'password') {
            $sessionUser = is_string($_SESSION['user'] ?? null) ? ($_SESSION['user'] ?? '') : '';
            $password = is_string($_POST['password'] ?? null) ? ($_POST['password'] ?? '') : '';
            if ($password === '' || strlen($password) < 8) {
                apiError(400, 'Password must be at least 8 characters');
                return;
            }
            if (strlen($password) > 256) {
                apiError(400, 'Password is too long');
                return;
            }
            $weakPasswords = ['admin', 'password', '12345678', 'adlaire'];
            if (in_array(strtolower($password), $weakPasswords, true)) {
                apiError(400, 'Password is too weak');
                return;
            }
            $newHash = password_hash($password, PASSWORD_DEFAULT);
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
        if (!csrf_verify()) {
            apiError(403, 'CSRF verification failed');
            return;
        }
        $username = is_string($_REQUEST['username'] ?? null) ? trim($_REQUEST['username'] ?? '') : '';
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

    apiResponse(['status' => 'ok']);
}

function apiSidebar(FileStorage $storage, string $method): void
{
    $app = App::getInstance();
    if ($method === 'GET') {
        $blocks = $app->getSidebarBlocks();
        apiResponse(['blocks' => $blocks], JSON_UNESCAPED_UNICODE);
        return;
    }
    if ($method === 'POST') {
        if (!csrf_verify()) {
            apiError(403, 'CSRF verification failed');
            return;
        }
        $raw = $_POST['blocks'] ?? '';
        if (!is_string($raw)) {
            apiError(400, 'Invalid blocks parameter');
            return;
        }
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

    apiResponse(['status' => 'ok', 'deleted' => $deleted]);
}

function apiRevisionDiff(FileStorage $storage, string $slug): void
{
    $t1 = is_string($_GET['t1'] ?? '') ? ($_GET['t1'] ?? '') : '';
    $t2 = is_string($_GET['t2'] ?? '') ? ($_GET['t2'] ?? '') : '';
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

    $blocks1 = is_array($data1['blocks'] ?? null) ? $data1['blocks'] : [];
    $blocks2 = is_array($data2['blocks'] ?? null) ? $data2['blocks'] : [];

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
