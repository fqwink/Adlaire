<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - App
 *
 * Application class: configuration, authentication, translation, rendering.
 * Depends on: helpers.php, core.php
 *
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group
 * @copyright Copyright (c) 2014 - 2026 倉田和宏
 * @license Adlaire License Ver.2.0 (Open Source - Platform Code)
 */

final class App
{
    public const VERSION_MAJOR = 2;
    public const VERSION_MINOR = 9;
    public const VERSION_BUILD = 45;
    public const VERSION = 'Ver.2.9-45';

    /** Session timeout in seconds (30 minutes) */
    private const SESSION_TIMEOUT = 1800;

    /** Minimum password length */
    private const MIN_PASSWORD_LENGTH = 8;

    /** Maximum password length */
    private const MAX_PASSWORD_LENGTH = 256;

    /** Maximum username length */
    private const MAX_USERNAME_LENGTH = 64;

    /** Weak passwords blacklist */
    private const WEAK_PASSWORDS = ['admin', 'password', '12345678', 'adlaire'];

    /** Allowed languages */
    private const ALLOWED_LANGUAGES = ['en', 'ja'];

    /** Host validation pattern */
    private const HOST_PATTERN = '/^[a-zA-Z0-9.\-]+(:\d{1,5})?$/';

    /** Slug sanitization pattern */
    private const SLUG_SANITIZE_PATTERN = '/[^a-zA-Z0-9_\-]/';

    /** JSON encoding flags for safe JS embedding */
    private const JSON_JS_FLAGS = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;

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
    public string $nonce = '';

    public readonly FileStorage $storage;

    /** @var array<string, string> */
    private array $translations = [];

    /** @var string[]|null */
    private ?array $menuItems = null;

    private bool $is404 = false;

    private static ?self $instance = null;

    public static function getInstance(): self
    {
        return self::$instance ??= new self();
    }

    private function __construct()
    {
        [$this->host, $this->requestPage] = $this->parseHost();

        $this->storage = new FileStorage('data');
        $this->initDefaults();
        $this->storage->ensureDirectories();
        $this->storage->migrate();
        $this->migrateUsersFromConfig();
        $this->loadConfig();
        $this->loadLanguage();
        $this->initTranslatableDefaults();
        $this->handleAuth();
        $this->handlePage();
        $this->loadPlugins();
    }

    /** @return array{0: string, 1: string} */
    private function parseHost(): array
    {
        $rpRaw = isset($_GET['page'])
            ? preg_replace('#/+#', '/', $_GET['page'])
            : '';
        $rp = is_string($rpRaw) ? $rpRaw : '';

        $httpHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
        if (!is_string($httpHost) || preg_match(self::HOST_PATTERN, $httpHost) !== 1) {
            $httpHost = $_SERVER['SERVER_NAME'] ?? 'localhost';
            if (!is_string($httpHost) || preg_match(self::HOST_PATTERN, $httpHost) !== 1) {
                $httpHost = 'localhost';
            }
        }

        $rawUri = $_SERVER['REQUEST_URI'] ?? '/';
        $parsedPath = parse_url($rawUri, PHP_URL_PATH);
        $uriResult = is_string($parsedPath) ? preg_replace('#/+#', '/', urldecode($parsedPath)) : null;
        $uri = is_string($uriResult) ? $uriResult : '/';

        $host = ($rp !== '' && str_contains($uri, $rp))
            ? $httpHost . '/' . substr($uri, 0, strlen($uri) - strlen($rp))
            : $httpHost . '/' . $uri;

        $hostResult = preg_replace('#/+#', '/', $host);
        $host = '//' . (is_string($hostResult) ? $hostResult : $host);

        $rpResult = ($rp !== '') ? preg_replace('/[^a-zA-Z0-9_\-\/]/', '', $rp) : '';
        $rp = is_string($rpResult) ? trim($rpResult, '/') : '';

        return [$host, $rp];
    }

    private function initDefaults(): void
    {
        $this->config = [
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
            } elseif (!isset($this->config[$key]) || $this->config[$key] === '') {
                $this->config[$key] = $this->defaults[$key] ?? $val;
            }
        }
    }

    private function handleAuth(): void
    {
        $lastActivity = $_SESSION['last_activity'] ?? null;
        if (is_int($lastActivity) && (time() - $lastActivity) > self::SESSION_TIMEOUT) {
            $_SESSION = [];
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_regenerate_id(true);
                session_destroy();
            }
            if (session_status() !== PHP_SESSION_ACTIVE) {
                session_start();
            }
            return;
        }
        if (isset($_SESSION['l'])) {
            $_SESSION['last_activity'] = time();
        }

        $sessionUser = is_string($_SESSION['user'] ?? null) ? ($_SESSION['user'] ?? '') : '';
        $sessionHash = is_string($_SESSION['l'] ?? null) ? ($_SESSION['l'] ?? '') : '';
        if ($sessionUser !== '' && $sessionHash !== '') {
            $userData = $this->storage->getUser($sessionUser);
            if ($userData !== false && isset($userData['password']) && hash_equals($userData['password'], $sessionHash)) {
                if (isset($userData['enabled']) && $userData['enabled'] === false) {
                    session_regenerate_id(true);
                    $_SESSION = [];
                } else {
                    $this->config['loggedin'] = true;
                    $this->config['current_user'] = $sessionUser;
                    $this->config['current_role'] = $_SESSION['role'] ?? 'master';
                    $this->config['is_main'] = $_SESSION['is_main'] ?? ($userData['is_main'] ?? false);
                }
            }
        }

        if (isset($_GET['logout'])) {
            $_SESSION = [];
            session_regenerate_id(true);
            session_destroy();
            header('Location: ./');
            exit;
        }

        if (isset($_GET['login']) || isset($_POST['login'])) {
            if ($this->isLoggedIn()) {
                header('Location: ./');
                exit;
            }

            $msg = '';
            if (isset($_POST['sub'])) {
                $msg = esc($this->login());
            }

            $csrf = csrf_token();
            $loginLabel = esc($this->t('login_submit'));
            $usernameLabel = esc($this->t('admin_username'));
            $tokenLabel = esc($this->t('admin_token'));
            $changePwLabel = esc($this->t('change_password_label'));
            $changePwHint = esc($this->t('change_password_hint'));
            $changePwSubmit = esc($this->t('change_password_submit'));
            $nonceAttr = $this->nonce !== '' ? " nonce=\"" . esc($this->nonce) . "\"" : '';
            $this->config['content'] = <<<HTML
                <form action='' method='POST'>
                <input type='hidden' name='csrf' value='{$csrf}'>
                <label>{$usernameLabel}</label>
                <input type='text' name='username' autocomplete='username' id='login-username'>
                <input type='password' name='password' autocomplete='current-password'>
                <div id='token-field' style='display:none;'>
                <label>{$tokenLabel}</label>
                <input type='password' name='token' autocomplete='off'>
                </div>
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
        $this->config['pageFormat'] = 'blocks';
        $this->config['pageStatus'] = 'published';

        if (isset($_GET['login']) || isset($_POST['login'])) {
            return;
        }

        $pageData = $this->storage->readPageData($this->config['page']);

        if ($pageData !== false) {
            $isDraft = ($pageData['status'] ?? 'published') === 'draft';
            if ($isDraft && !$this->isLoggedIn()) {
                http_response_code(404);
                $this->is404 = true;
                $this->config['content'] = $this->defaults['new_page']['visitor'];
                return;
            }
            $this->config['content'] = $pageData['content'];
            $this->config['pageFormat'] = $pageData['format'] ?? 'blocks';
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

        http_response_code(404);
        $this->is404 = true;
        $this->config['content'] = $this->isLoggedIn()
            ? $this->defaults['new_page']['admin']
            : $this->defaults['new_page']['visitor'];
        return;
    }

    private function migrateUsersFromConfig(): void
    {
        if ($this->storage->usersFileExists()) {
            return;
        }
        $config = $this->storage->readConfig();
        $passwordHash = $config['password'] ?? '';
        if ($passwordHash === '') {
            return;
        }
        $userData = [
            'password' => $passwordHash,
            'role' => 'master',
            'is_main' => true,
            'created_at' => date('c'),
            'last_login' => '',
        ];
        if (!$this->storage->writeUser('admin', $userData)) {
            error_log('Adlaire: Failed to migrate user from config.json to users.json');
            return;
        }
        $this->storage->removeConfigKey('password');
    }

    private function loadPlugins(): void
    {
        $pluginsDir = dirname(__DIR__) . '/plugins';
        $pluginsBase = realpath($pluginsDir);
        if ($pluginsBase === false) {
            return;
        }
        if (is_dir($pluginsDir)) {
            $dirs = glob($pluginsDir . '/*', GLOB_ONLYDIR);
            if (is_array($dirs)) {
                foreach ($dirs as $dir) {
                    $pluginFile = $dir . '/index.php';
                    if (!is_file($pluginFile)) {
                        continue;
                    }
                    $realPluginPath = realpath($pluginFile);
                    if ($realPluginPath === false || !str_starts_with($realPluginPath, $pluginsBase . DIRECTORY_SEPARATOR)) {
                        error_log('Adlaire: Plugin path outside plugins directory: ' . $pluginFile);
                        continue;
                    }
                    require_once $realPluginPath;
                }
            }
        }
    }

    private function loadLanguage(): void
    {
        $lang = $this->config['language'] ?? 'ja';
        if (!in_array($lang, self::ALLOWED_LANGUAGES, true)) {
            $lang = 'ja';
        }
        $this->language = $lang;
        $file = dirname(__DIR__) . '/data/lang/' . basename($lang) . '.json';
        if (!is_file($file)) {
            error_log('Adlaire: Language file not found: ' . $file);
            $fallbackFile = dirname(__DIR__) . '/data/lang/ja.json';
            if ($lang !== 'ja' && is_file($fallbackFile)) {
                $file = $fallbackFile;
                error_log('Adlaire: Falling back to ja.json');
            } else {
                $this->translations = [];
                return;
            }
        }
        $json = file_get_contents($file);
        if ($json === false) {
            error_log('Adlaire: Failed to read language file: ' . $file);
            $this->translations = [];
            return;
        }
        $decoded = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('Adlaire: Failed to decode language file: ' . $file . ' - ' . json_last_error_msg());
            $this->translations = [];
            return;
        }
        $this->translations = is_array($decoded) ? $decoded : [];
    }

    /** @param array<string, string> $params */
    public function t(string $key, array $params = []): string
    {
        if ($key === '') {
            return '';
        }
        $str = $this->translations[$key] ?? $key;
        if ($params !== []) {
            foreach ($params as $k => $v) {
                $str = str_replace(':' . $k, (string) $v, $str);
            }
        }
        $str = preg_replace('/:[a-zA-Z_]+/', '', $str) ?? $str;
        return $str;
    }

    public function isLoggedIn(): bool
    {
        return $this->config['loggedin'] === true;
    }

    public function getCurrentUser(): string
    {
        return (string) ($this->config['current_user'] ?? '');
    }

    public function getLoginStatus(): string
    {
        $host = esc($this->host);
        if ($this->isLoggedIn()) {
            $username = esc($this->getCurrentUser());
            return "<span class=\"login-user\">{$username}</span> | <a href=\"{$host}?admin\">Admin</a> | <a href=\"{$host}?logout\">" . esc($this->t('logout')) . "</a>";
        }
        return "<a href=\"{$host}?login\">" . esc($this->t('login')) . "</a>";
    }

    public static function getSlug(string $page): string
    {
        $slug = str_replace(' ', '-', $page);
        $slug = strtolower($slug);
        $slug = (string) preg_replace(self::SLUG_SANITIZE_PATTERN, '', $slug);
        return $slug;
    }

    public function is404(): bool
    {
        return $this->is404;
    }

    public function isMainMaster(): bool
    {
        return $this->isLoggedIn() && ($this->config['is_main'] ?? false) === true;
    }

    public function login(): string
    {
        if (!csrf_verify()) {
            return $this->t('csrf_error');
        }

        if (!login_rate_check()) {
            return $this->t('login_rate_limited');
        }

        $username = is_string($_POST['username'] ?? null) ? trim($_POST['username'] ?? '') : '';
        $input = is_string($_POST['password'] ?? null) ? ($_POST['password'] ?? '') : '';

        if ($username === '' || strlen($username) > self::MAX_USERNAME_LENGTH) {
            return $this->t('wrong_password');
        }

        if (strlen($input) > self::MAX_PASSWORD_LENGTH) {
            return $this->t('wrong_password');
        }

        $userData = $this->storage->getUser($username);
        if ($userData === false || !isset($userData['password'])) {
            return $this->t('wrong_password');
        }

        if (isset($userData['enabled']) && $userData['enabled'] === false) {
            return $this->t('wrong_password');
        }

        $stored = (string) $userData['password'];
        if (!password_verify($input, $stored)) {
            return $this->t('wrong_password');
        }

        $isMain = $userData['is_main'] ?? false;

        if (!$isMain && isset($userData['token'])) {
            $tokenInput = is_string($_POST['token'] ?? null) ? ($_POST['token'] ?? '') : '';
            if ($tokenInput === '' || !password_verify($tokenInput, $userData['token'])) {
                return $this->t('wrong_password');
            }
        }

        $newPass = is_string($_POST['new'] ?? null) ? ($_POST['new'] ?? '') : '';
        if ($newPass !== '') {
            if (!$isMain) {
                return $this->t('wrong_password');
            }
            if (strlen($newPass) < self::MIN_PASSWORD_LENGTH) {
                return $this->t('password_too_short');
            }
            if (in_array(strtolower($newPass), self::WEAK_PASSWORDS, true)) {
                return $this->t('password_too_weak');
            }
            $newHash = password_hash($newPass, PASSWORD_DEFAULT);
            $this->storage->writeUser($username, ['password' => $newHash]);
            session_regenerate_id(true);
            $_SESSION['l'] = $newHash;
            $_SESSION['user'] = $username;
            $_SESSION['role'] = $userData['role'] ?? 'master';
            $_SESSION['is_main'] = $isMain;
            $_SESSION['last_activity'] = time();
            return $this->t('password_changed');
        }

        $this->storage->writeUser($username, ['last_login' => date('c')]);
        session_regenerate_id(true);
        $_SESSION['l'] = $stored;
        $_SESSION['user'] = $username;
        $_SESSION['role'] = $userData['role'] ?? 'master';
        $_SESSION['is_main'] = $isMain;
        $_SESSION['last_activity'] = time();
        LicenseManager::initOnFirstLogin();
        header('Location: ' . $this->host);
        exit;
    }

    public function editTags(): void
    {
        if (!$this->isLoggedIn()) {
            return;
        }
        $token = csrf_token();
        $safeToken = json_encode($token, self::JSON_JS_FLAGS);
        $safeLang = json_encode($this->language, self::JSON_JS_FLAGS);
        $safeFormat = json_encode($this->config['pageFormat'] ?? 'blocks', self::JSON_JS_FLAGS);
        $n = $this->nonce !== '' ? " nonce=\"" . esc($this->nonce) . "\"" : '';
        echo "\t<script{$n}>var csrfToken={$safeToken};var pageLang={$safeLang};var pageFormat={$safeFormat};</script>\n";
        echo "\t<script{$n}>i18n.init({$safeLang});</script>\n";
        $adminHeadHooks = $this->hooks['admin-head'] ?? [];
        if (is_array($adminHeadHooks)) {
            foreach ($adminHeadHooks as $tag) {
                if (is_string($tag)) {
                    echo "\t" . $tag . "\n";
                }
            }
        }
    }

    /** @return array{name: string, description: string, version: string, author: string} */
    public function loadThemeJson(string $themeName): array
    {
        $path = dirname(__DIR__) . '/themes/' . basename($themeName) . '/theme.json';
        if (is_file($path)) {
            $json = file_get_contents($path);
            if ($json !== false) {
                $data = json_decode($json, true);
                if (is_array($data)) {
                    return $data;
                }
            }
        }
        return ['name' => $themeName, 'description' => '', 'version' => '', 'author' => ''];
    }

    /** @return array<int, array{type: string, data: array<string, mixed>}> */
    public function getSidebarBlocks(): array
    {
        $config = $this->storage->readConfig();
        $raw = $config['sidebar_blocks'] ?? '';
        if ($raw === '') {
            return [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /** @param array<int, array{type: string, data: array<string, mixed>}> $blocks */
    public function saveSidebarBlocks(array $blocks): bool
    {
        $json = json_encode($blocks, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            error_log('Adlaire: Failed to encode sidebar blocks JSON: ' . json_last_error_msg());
            return false;
        }
        return $this->storage->writeConfigValue('sidebar_blocks', $json);
    }

    private const ADMIN_SCRIPTS = ['autosize', 'markdown', 'i18n', 'api', 'editor', 'editInplace'];
    private const PUBLIC_SCRIPTS = ['public'];

    public function scriptTags(bool $adminMode = false): void
    {
        $scripts = $adminMode ? self::ADMIN_SCRIPTS : self::PUBLIC_SCRIPTS;
        $n = $this->nonce !== '' ? " nonce=\"" . esc($this->nonce) . "\"" : '';
        foreach ($scripts as $name) {
            echo "\t<script{$n} src=\"js/{$name}.js\"></script>\n";
        }
    }

    public function content(string $id, string $content): void
    {
        $format = (string) ($this->config['pageFormat'] ?? 'blocks');
        $isPage = ($id === $this->config['page']);

        if ($format === 'blocks' && $isPage) {
            $blocksB64 = '';
            if (isset($this->config['pageBlocks'])) {
                $jsonFlags = JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP;
                $json = json_encode($this->config['pageBlocks'], $jsonFlags);
                if ($json !== false) {
                    $blocksB64 = base64_encode($json);
                }
            }
            echo "<div class=\"blocks-content\" data-blocks-b64=\"" . esc($blocksB64) . "\"></div>";
        } elseif ($format === 'markdown' && $isPage) {
            $b64 = base64_encode($content);
            echo "<div class=\"markdown-content\" data-raw-b64=\"" . esc($b64) . "\"></div>";
        } else {
            echo esc($content);
        }
    }

    public function menu(): void
    {
        if ($this->menuItems === null) {
            $menuRaw = $this->config['menu'] ?? '';
            $menu = str_replace("\r\n", "\n", is_string($menuRaw) ? $menuRaw : '');
            $this->menuItems = explode("<br />\n", $menu);
        }
        $items = $this->menuItems;
        echo '<ul>';
        foreach ($items as $item) {
            $item = trim(strip_tags($item));
            if ($item === '') {
                continue;
            }
            $slug = self::getSlug($item);
            $safeItem = esc($item);
            $safeSlug = esc($slug);
            $active = ($this->config['page'] === $slug) ? ' id="active"' : '';
            echo "<li{$active}><a href=\"{$safeSlug}\">{$safeItem}</a></li>";
        }
        echo '</ul>';
    }
}
