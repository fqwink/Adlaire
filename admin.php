<?php
declare(strict_types=1);

/**
 * Adlaire Platform - Admin
 *
 * Application class and admin editing handler.
 *
 * @copyright Copyright (c) 2014 - 2015 IEAS Group
 * @copyright Copyright (c) 2014 - 2015 AIZM
 * @license Adlaire License
 */

final class App
{
    public const VERSION_MAJOR = 1;
    public const VERSION_MINOR = 4;
    public const VERSION_BUILD = 18;
    public const VERSION = 'Ver.1.4-18';

    /** @var array<string, mixed> */
    public array $config = [];

    /** @var array<string, mixed> */
    public array $defaults = [];

    /** @var array<string, mixed> */
    public array $hooks = [];

    public readonly string $host;
    public readonly string $requestPage;
    public string $credit;
    public readonly string $language;

    public readonly FileStorage $storage;

    /** @var array<string, string> */
    private array $translations = [];

    private static ?self $instance = null;

    public static function getInstance(): self
    {
        return self::$instance ??= new self();
    }

    private function __construct()
    {
        [$this->host, $this->requestPage] = $this->parseHost();

        $this->storage = new FileStorage('files');
        $this->initDefaults();
        $this->storage->ensureDirectories();
        $this->storage->migrate();
        $this->loadConfig();
        $this->loadLanguage();
        $this->initTranslatableDefaults();
        $this->handleAuth();
        $this->handlePage();
        $this->loadPlugins();
    }

    private function parseHost(): array
    {
        $rp = isset($_REQUEST['page'])
            ? (preg_replace('#/+#', '/', urldecode($_REQUEST['page'])) ?? '')
            : '';

        $host = $_SERVER['HTTP_HOST'];
        $uri = preg_replace('#/+#', '/', urldecode($_SERVER['REQUEST_URI'])) ?? '';

        $host = ($rp !== '' && str_contains($uri, $rp))
            ? $host . '/' . substr($uri, 0, strlen($uri) - strlen($rp))
            : $host . '/' . $uri;

        $host = explode('?', $host)[0];
        $host = '//' . str_replace('//', '/', $host);

        $strip = ['index.php', '?', '"', "'", '>', '<', '=', '(', ')', '\\'];
        $rp = strip_tags(str_replace($strip, '', $rp));
        $host = strip_tags(str_replace($strip, '', $host));

        return [$host, $rp];
    }

    private function initDefaults(): void
    {
        $this->config = [
            'password'    => 'admin',
            'loggedin'    => false,
            'page'        => 'home',
            'themeSelect' => 'AP-Default',
            'language'    => 'ja',
            'menu'        => "Home<br />\nExample",
            'title'       => '',
            'subside'     => '',
            'description' => '',
            'keywords'    => '',
            'copyright'   => '',
        ];
    }

    private function initTranslatableDefaults(): void
    {
        $rp = $this->requestPage;
        $esc_rp = esc($rp);
        $year = date('Y');

        $translatableDefaults = [
            'title'       => $this->t('default_title'),
            'subside'     => $this->t('default_subside'),
            'description' => $this->t('default_description'),
            'keywords'    => $this->t('default_keywords'),
            'copyright'   => $this->t('default_copyright', ['year' => $year]),
        ];

        foreach ($translatableDefaults as $key => $val) {
            $this->defaults[$key] = $val;
            if ($this->config[$key] === '') {
                $this->config[$key] = $val;
            }
        }

        $this->defaults['page'] = [
            'home'    => $this->t('default_home'),
            'example' => $this->t('default_example'),
        ];
        $this->defaults['new_page'] = [
            'admin'   => $this->t('new_page_admin', ['page' => $esc_rp]),
            'visitor' => $this->t('new_page_visitor', ['page' => $esc_rp]),
        ];
        $this->defaults['content'] = $this->t('click_to_edit');
        $this->credit = $this->t('credit');
    }

    private function loadConfig(): void
    {
        $stored = $this->storage->readConfig();

        foreach ($this->config as $key => $val) {
            if ($key === 'content' || $key === 'loggedin' || $key === 'page') {
                continue;
            }

            $this->defaults[$key] ??= $val;

            if (isset($stored[$key])) {
                $this->config[$key] = $stored[$key];
            }

            match ($key) {
                'password' => $this->handlePassword($stored[$key] ?? false, $val),
                default    => null,
            };
        }
    }

    private function handlePassword(string|false $fval, string $val): void
    {
        if ($fval === false || $fval === '') {
            $this->config['password'] = $this->savePassword($val);
        }
    }

    private function handleAuth(): void
    {
        if (isset($_SESSION['l']) && $_SESSION['l'] === $this->config['password']) {
            $this->config['loggedin'] = true;
        }

        if (isset($_REQUEST['logout'])) {
            session_destroy();
            header('Location: ./');
            exit;
        }

        if (isset($_REQUEST['login'])) {
            if ($this->isLoggedIn()) {
                header('Location: ./');
                exit;
            }

            $msg = '';
            if (isset($_POST['sub'])) {
                $msg = $this->login();
            }

            $csrf = csrf_token();
            $loginLabel = esc($this->t('login_submit'));
            $changePwLabel = esc($this->t('change_password_label'));
            $changePwHint = $this->t('change_password_hint');
            $changePwSubmit = esc($this->t('change_password_submit'));
            $this->config['content'] = <<<HTML
                <form action='' method='POST'>
                <input type='hidden' name='csrf' value='{$csrf}'>
                <input type='password' name='password'>
                <input type='submit' name='login' value='{$loginLabel}'> {$msg}
                <p class='toggle'>{$changePwLabel}</p>
                <div class='hide'>{$changePwHint}<br />
                <input type='password' name='new'>
                <input type='submit' name='login' value='{$changePwSubmit}'>
                <input type='hidden' name='sub' value='sub'>
                </div>
                </form>
                HTML;
        }
    }

    private function handlePage(): void
    {
        if ($this->requestPage !== '') {
            $this->config['page'] = $this->requestPage;
        }
        $this->config['page'] = self::getSlug($this->config['page']);
        $this->config['pageFormat'] = 'html';
        $this->config['pageStatus'] = 'published';

        if (isset($_REQUEST['login'])) {
            return;
        }

        $pageData = $this->storage->readPageData($this->config['page']);

        if ($pageData !== false) {
            $isDraft = ($pageData['status'] ?? 'published') === 'draft';
            if ($isDraft && !$this->isLoggedIn()) {
                header('HTTP/1.1 404 Not Found');
                $this->config['content'] = $this->defaults['new_page']['visitor'];
                return;
            }
            $this->config['content'] = $pageData['content'];
            $this->config['pageFormat'] = $pageData['format'] ?? 'html';
            $this->config['pageStatus'] = $pageData['status'] ?? 'published';
            if (isset($pageData['blocks'])) {
                $this->config['pageBlocks'] = $pageData['blocks'];
            }
            return;
        }

        if (isset($this->defaults['page'][$this->config['page']])) {
            $this->config['content'] = $this->defaults['page'][$this->config['page']];
            return;
        }

        header('HTTP/1.1 404 Not Found');
        $this->config['content'] = $this->isLoggedIn()
            ? $this->defaults['new_page']['admin']
            : $this->defaults['new_page']['visitor'];
    }

    private function loadPlugins(): void
    {
        $cwd = getcwd();
        if ($cwd === false) {
            $cwd = __DIR__;
        }
        $pluginsDir = $cwd . '/plugins';
        if (is_dir($pluginsDir)) {
            $dirs = glob($pluginsDir . '/*', GLOB_ONLYDIR);
            if (is_array($dirs)) {
                foreach ($dirs as $dir) {
                    require_once $dir . '/index.php';
                }
            }
        }
    }

    private function loadLanguage(): void
    {
        $lang = $this->config['language'] ?? 'ja';
        if (!in_array($lang, ['en', 'ja'], true)) {
            $lang = 'ja';
        }
        $this->language = $lang;
        $file = __DIR__ . '/data/lang/' . $lang . '.json';
        if (is_file($file)) {
            $json = file_get_contents($file);
            if ($json !== false) {
                $this->translations = json_decode($json, true) ?: [];
            }
        }
    }

    /**
     * @param array<string, string> $params
     */
    public function t(string $key, array $params = []): string
    {
        $str = $this->translations[$key] ?? $key;
        foreach ($params as $k => $v) {
            $str = str_replace(':' . $k, $v, $str);
        }
        return $str;
    }

    public function isLoggedIn(): bool
    {
        return $this->config['loggedin'] === true;
    }

    public function getLoginStatus(): string
    {
        $host = $this->host;
        return $this->isLoggedIn()
            ? "<a href='{$host}?logout'>" . esc($this->t('logout')) . "</a>"
            : "<a href='{$host}?login'>" . esc($this->t('login')) . "</a>";
    }

    public static function getSlug(string $page): string
    {
        return mb_convert_case(str_replace(' ', '-', $page), MB_CASE_LOWER, 'UTF-8');
    }

    public function login(): string
    {
        csrf_verify();

        $stored = $this->config['password'];
        $input = $_POST['password'] ?? '';

        if (strlen($stored) === 32 && ctype_xdigit($stored)) {
            $valid = hash_equals($stored, md5($input));
            if ($valid) {
                $this->config['password'] = $this->savePassword($input);
            }
        } else {
            $valid = password_verify($input, $stored);
        }

        if (!$valid) {
            return $this->t('wrong_password');
        }

        $newPass = $_POST['new'] ?? '';
        if ($newPass !== '') {
            $newHash = $this->savePassword($newPass);
            $this->config['password'] = $newHash;
            session_regenerate_id(true);
            $_SESSION['l'] = $newHash;
            return $this->t('password_changed');
        }

        session_regenerate_id(true);
        $_SESSION['l'] = $this->config['password'];
        header('Location: ./');
        exit;
    }

    public function savePassword(string $password): string
    {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $result = $this->storage->writeConfigValue('password', $hash);
        if (!$result) {
            echo $this->t('permission_error');
            exit;
        }
        return $hash;
    }

    public function editTags(): void
    {
        if (!$this->isLoggedIn() && !isset($_REQUEST['login'])) {
            return;
        }
        $token = csrf_token();
        $safeToken = json_encode($token, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT);
        $safeLang = json_encode($this->language);
        $safeFormat = json_encode($this->config['pageFormat'] ?? 'html');
        echo "\t<script>var csrfToken={$safeToken};var pageLang={$safeLang};var pageFormat={$safeFormat};</script>\n";
        echo "\t<script>i18n.init({$safeLang});</script>\n";
        foreach ($this->hooks['admin-head'] ?? [] as $tag) {
            echo "\t{$tag}\n";
        }
    }

    public function content(string $id, string $content): void
    {
        $format = $this->config['pageFormat'] ?? 'html';
        $isPage = ($id === $this->config['page']);
        $isMarkdown = ($format === 'markdown' && $isPage);
        $isBlocks = ($format === 'blocks' && $isPage);

        if ($this->isLoggedIn()) {
            $safeId = esc($id);
            $safeTitle = esc($this->defaults['content']);

            if ($isBlocks) {
                $blocksJson = '';
                if (isset($this->config['pageBlocks'])) {
                    $blocksJson = esc(json_encode($this->config['pageBlocks'], JSON_UNESCAPED_UNICODE));
                }
                echo "<div id='{$safeId}' class='ce-editor-wrapper' data-format='blocks' data-blocks='{$blocksJson}'></div>";
            } else {
                $formatAttr = $isMarkdown ? " data-format='markdown'" : '';
                echo "<span title='{$safeTitle}' id='{$safeId}' class='editText richText'{$formatAttr}>{$content}</span>";
            }
        } else {
            if ($isBlocks) {
                $blocksJson = '';
                if (isset($this->config['pageBlocks'])) {
                    $blocksJson = esc(json_encode($this->config['pageBlocks'], JSON_UNESCAPED_UNICODE));
                }
                echo "<div class='blocks-content' data-blocks='{$blocksJson}'></div>";
            } elseif ($isMarkdown) {
                $encoded = esc(base64_encode($content));
                echo "<div class='markdown-content' data-raw-b64='{$encoded}'>{$content}</div>";
            } else {
                echo $content;
            }
        }
    }

    public function menu(): void
    {
        $items = explode("<br />\n", $this->config['menu']);
        echo '<ul>';
        foreach ($items as $item) {
            $item = trim($item);
            if ($item === '') {
                continue;
            }
            $slug = self::getSlug($item);
            $safeItem = esc($item);
            $safeSlug = esc($slug);
            $active = ($this->config['page'] === $slug) ? ' id="active"' : '';
            echo "<li{$active}><a href='{$safeSlug}'>{$safeItem}</a></li>";
        }
        echo '</ul>';
    }

    public function settings(): void
    {
        $settingsLabel = esc($this->t('settings'));
        $themeLabel = esc($this->t('settings_theme'));
        $menuLabel = esc($this->t('settings_menu'));
        $menuHint = $this->t('settings_menu_hint');
        $langLabel = esc($this->t('settings_language'));

        echo "<div class='settings'>
        <h3 class='toggle'>↕ {$settingsLabel} ↕</h3>
        <div class='hide'>
        <div class='change border'><b>{$themeLabel}</b>&nbsp;<span id='themeSelect'><select name='themeSelect' onchange='fieldSave(\"themeSelect\",this.value);'>";

        $themesDir = __DIR__ . '/themes';
        if (is_dir($themesDir)) {
            $dirs = glob($themesDir . '/*', GLOB_ONLYDIR);
            if (is_array($dirs)) {
                foreach ($dirs as $dir) {
                    $val = basename($dir);
                    $safeVal = esc($val);
                    $selected = ($val === $this->config['themeSelect']) ? ' selected' : '';
                    echo "<option value=\"{$safeVal}\"{$selected}>{$safeVal}</option>\n";
                }
            }
        }

        echo "</select></span></div>";

        echo "<div class='change border'><b>{$langLabel}</b>&nbsp;<select onchange='fieldSave(\"language\",this.value);'>";
        foreach (['ja' => '日本語', 'en' => 'English'] as $code => $label) {
            $selected = ($code === $this->language) ? ' selected' : '';
            echo "<option value=\"{$code}\"{$selected}>{$label}</option>";
        }
        echo "</select></div>";

        echo "<div class='change border'><b>{$menuLabel} <small>({$menuHint})</small></b><span id='menu' title='Home' class='editText'>{$this->config['menu']}</span></div>";

        foreach (['title', 'description', 'keywords', 'copyright'] as $key) {
            $safeDefault = esc((string) ($this->defaults[$key] ?? ''));
            $safeValue = esc($this->config[$key]);
            echo "<div class='change border'><span title='{$safeDefault}' id='{$key}' class='editText'>{$safeValue}</span></div>";
        }
        echo '</div></div>';
    }
}

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

    $content = trim($content);

    if (!isset($_SESSION['l'])) {
        header('HTTP/1.1 401 Unauthorized');
        exit;
    }

    csrf_verify();

    $storage = new FileStorage('files');

    if ($fieldname === 'password') {
        header('HTTP/1.1 403 Forbidden');
        exit;
    }

    if ($storage->isConfigKey($fieldname)) {
        $result = $storage->writeConfigValue($fieldname, $content);
    } else {
        // Preserve existing page format when editing inline
        $existing = $storage->readPageData($fieldname);
        $format = ($existing !== false && isset($existing['format'])) ? $existing['format'] : 'html';
        $status = ($existing !== false && isset($existing['status'])) ? $existing['status'] : 'published';
        $blocks = ($existing !== false && isset($existing['blocks'])) ? $existing['blocks'] : null;
        $result = $storage->writePage($fieldname, $content, $format, $blocks, $status);
    }

    if (!$result) {
        header('HTTP/1.1 500 Internal Server Error');
        exit;
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

    $storage = new FileStorage('files');
    $method = $_SERVER['REQUEST_METHOD'];

    // Sitemap uses XML content type — handle before JSON header
    if ($endpoint === 'sitemap') {
        handleApiSitemap($storage);
        exit;
    }

    header('Content-Type: application/json; charset=UTF-8');

    // Public endpoints (no authentication)
    if ($endpoint === 'search') {
        handleApiSearch($storage);
        exit;
    }

    // Authenticated endpoints
    if (!isset($_SESSION['l'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    match ($endpoint) {
        'pages'     => handleApiPages($storage, $method),
        'revisions' => handleApiRevisions($storage, $method),
        'export'    => handleApiExport($storage),
        'import'    => handleApiImport($storage),
        default     => apiError(404, 'Unknown endpoint'),
    };
    exit;
}

function handleApiPages(FileStorage $storage, string $method): void
{
    $slug = $_REQUEST['slug'] ?? null;

    match ($method) {
        'GET' => $slug !== null
            ? apiPageGet($storage, $slug)
            : apiPageList($storage),
        'POST'   => apiPageSave($storage),
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
            'format'     => $data['format'] ?? 'html',
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
    $format = $_POST['format'] ?? 'html';

    if ($slug === null || $content === null) {
        apiError(400, 'Missing slug or content');
        return;
    }

    if (!FileStorage::validateSlug($slug)) {
        apiError(400, 'Invalid slug');
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
    $result = $storage->writePage($slug, $content, $format, $blocks, $status);
    if (!$result) {
        apiError(500, 'Write failed');
        return;
    }

    echo json_encode(['status' => 'ok', 'slug' => $slug]);
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
    $query = $_REQUEST['q'] ?? '';
    if ($query === '') {
        echo json_encode(['results' => []]);
        return;
    }

    $query = mb_strtolower($query, 'UTF-8');
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
            'format'     => $data['format'] ?? 'html',
            'status'     => $data['status'] ?? 'published',
            'updated_at' => $data['updated_at'],
        ];
    }

    echo json_encode(['query' => $_REQUEST['q'], 'results' => $results], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
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

    // CSRF token must be in URL query for JSON body requests
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
            $format = $pageData['format'] ?? 'html';
            $blocks = $pageData['blocks'] ?? null;
            $status = $pageData['status'] ?? 'published';
            $storage->writePage($slug, $pageData['content'], $format, $blocks, $status);
            $imported['pages']++;
        }
    }

    echo json_encode(['status' => 'ok', 'imported' => $imported]);
}

function apiError(int $code, string $message): void
{
    http_response_code($code);
    echo json_encode(['error' => $message]);
}
