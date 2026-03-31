<?php
declare(strict_types=1);

/**
 * Adlaire Platform
 *
 * Version: Ver.{Major}.{Minor}-{Build}
 *   Major  - Incremented on breaking changes. Resets Minor to 0.
 *   Minor  - Incremented on backward-compatible feature additions.
 *   Build  - Cumulative revision number. Never resets.
 *
 * @copyright Copyright (c) 2014 - 2015 IEAS Group
 * @copyright Copyright (c) 2014 - 2015 AIZM
 * @license Adlaire License
 */

ob_start();
ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
session_start();

/**
 * FileStorage - Flat file data management layer
 *
 * Provides atomic writes, file locking, JSON config consolidation,
 * organized directory structure, and automatic migration from legacy format.
 */
final class FileStorage
{
    private string $basePath;
    private string $configFile;
    private string $configLock;
    private string $pagesDir;
    private string $backupsDir;
    /** Config keys managed in config.json */
    private const CONFIG_KEYS = [
        'password', 'themeSelect', 'menu', 'title',
        'subside', 'description', 'keywords', 'copyright',
        'language',
    ];

    /** Maximum number of config backup generations to retain */
    private const MAX_BACKUPS = 9;

    public function __construct(string $basePath = 'files')
    {
        $this->basePath = $basePath;
        $this->configFile = $basePath . '/config.json';
        $this->configLock = $basePath . '/.config.lock';
        $this->pagesDir = $basePath . '/pages';
        $this->backupsDir = $basePath . '/backups';
    }

    public function ensureDirectories(): void
    {
        foreach ([$this->basePath, $this->pagesDir, $this->backupsDir] as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
        if (!is_dir('plugins')) {
            mkdir('plugins', 0755, true);
        }
    }

    /**
     * Validate a page slug. Returns true only for safe, non-traversal names.
     */
    public static function validateSlug(string $slug): bool
    {
        if ($slug === '' || $slug !== basename($slug)) {
            return false;
        }
        return (bool) preg_match('/^[a-zA-Z0-9_\-]+$/', $slug);
    }

    /**
     * Migrate from legacy flat file format to new structure.
     * Runs once automatically when config.json does not exist.
     */
    public function migrate(): void
    {
        if (file_exists($this->configFile)) {
            return;
        }

        $config = [];
        foreach (self::CONFIG_KEYS as $key) {
            $legacyFile = $this->basePath . '/' . $key;
            if (file_exists($legacyFile)) {
                $config[$key] = file_get_contents($legacyFile);
            }
        }

        if ($config !== []) {
            $this->writeConfig($config);
        }

        // Migrate page files to JSON format in pages/ subdirectory
        $skipFiles = array_merge(self::CONFIG_KEYS, [
            'config.json', 'pages.meta.json', '.htaccess',
        ]);
        $files = glob($this->basePath . '/*');
        if (is_array($files)) {
            foreach ($files as $file) {
                if (is_dir($file)) {
                    continue;
                }
                $name = basename($file);
                if (in_array($name, $skipFiles, true)) {
                    continue;
                }
                $dest = $this->pagesDir . '/' . $name . '.json';
                if (!file_exists($dest)) {
                    $mtime = date('c', filemtime($file) ?: time());
                    $content = file_get_contents($file);
                    $pageData = [
                        'content'    => $content !== false ? $content : '',
                        'created_at' => $mtime,
                        'updated_at' => $mtime,
                    ];
                    $this->atomicWrite($dest, json_encode($pageData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                    unlink($file);
                }
            }
        }

        // Clean up legacy config files (pages already moved)
        foreach (self::CONFIG_KEYS as $key) {
            $legacyFile = $this->basePath . '/' . $key;
            if (file_exists($legacyFile)) {
                unlink($legacyFile);
            }
        }
    }

    /**
     * Read all config values from config.json.
     * @return array<string, string>
     */
    public function readConfig(): array
    {
        if (!file_exists($this->configFile)) {
            return [];
        }

        $json = $this->lockedRead($this->configFile);
        if ($json === false) {
            return [];
        }

        $data = json_decode($json, true);
        return is_array($data) ? $data : [];
    }

    /**
     * Write config values to config.json with exclusive lock, backup, and atomic write.
     * Uses a dedicated lock file to serialize the entire read-merge-write cycle,
     * preventing lost updates from concurrent requests.
     *
     * @param array<string, string> $config
     */
    public function writeConfig(array $config): bool
    {
        $lockFp = fopen($this->configLock, 'c');
        if ($lockFp === false) {
            return false;
        }

        if (!flock($lockFp, LOCK_EX)) {
            fclose($lockFp);
            return false;
        }

        try {
            // Read existing under lock
            $existing = [];
            if (file_exists($this->configFile)) {
                $fp = fopen($this->configFile, 'r');
                if ($fp !== false) {
                    $raw = stream_get_contents($fp);
                    fclose($fp);
                    $existing = json_decode($raw ?: '{}', true) ?: [];
                }
            }

            $merged = array_merge($existing, $config);

            // Rotate backups before overwriting
            if (file_exists($this->configFile)) {
                $this->rotateBackups();
                copy($this->configFile, $this->backupsDir . '/config.' . date('Ymd_His') . '.json');
            }

            $json = json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            return $this->atomicWrite($this->configFile, $json);
        } finally {
            flock($lockFp, LOCK_UN);
            fclose($lockFp);
        }
    }

    /**
     * Write a single config value.
     */
    public function writeConfigValue(string $key, string $value): bool
    {
        return $this->writeConfig([$key => $value]);
    }

    /**
     * Read a page content from JSON data file.
     */
    public function readPage(string $slug): string|false
    {
        if (!self::validateSlug($slug)) {
            return false;
        }
        $path = $this->pagesDir . '/' . $slug . '.json';
        if (!file_exists($path)) {
            return false;
        }
        $json = $this->lockedRead($path);
        if ($json === false) {
            return false;
        }
        $data = json_decode($json, true);
        return is_array($data) && isset($data['content']) ? $data['content'] : false;
    }

    /**
     * Read full page data (content + metadata) from JSON data file.
     * @return array{content: string, created_at: string, updated_at: string}|false
     */
    public function readPageData(string $slug): array|false
    {
        if (!self::validateSlug($slug)) {
            return false;
        }
        $path = $this->pagesDir . '/' . $slug . '.json';
        if (!file_exists($path)) {
            return false;
        }
        $json = $this->lockedRead($path);
        if ($json === false) {
            return false;
        }
        $data = json_decode($json, true);
        return is_array($data) && isset($data['content']) ? $data : false;
    }

    /**
     * Write a page as JSON data file with content and metadata.
     */
    public function writePage(string $slug, string $content): bool
    {
        if (!self::validateSlug($slug)) {
            return false;
        }

        $path = $this->pagesDir . '/' . $slug . '.json';
        $now = date('c');

        // Preserve created_at from existing page
        $existing = $this->readPageData($slug);
        $createdAt = ($existing !== false) ? $existing['created_at'] : $now;

        $data = [
            'content'    => $content,
            'created_at' => $createdAt,
            'updated_at' => $now,
        ];

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        return $this->atomicWrite($path, $json);
    }

    /**
     * Delete a page with backup.
     */
    public function deletePage(string $slug): bool
    {
        if (!self::validateSlug($slug)) {
            return false;
        }

        $path = $this->pagesDir . '/' . $slug . '.json';
        if (!file_exists($path)) {
            return false;
        }

        // Backup before deletion
        $backupPath = $this->backupsDir . '/page_' . $slug . '.' . date('Ymd_His') . '.json';
        copy($path, $backupPath);

        unlink($path);
        return true;
    }

    /**
     * List all pages with metadata from JSON data files.
     * @return array<string, array{content: string, created_at: string, updated_at: string}>
     */
    public function listPages(): array
    {
        $files = glob($this->pagesDir . '/*.json');
        $pages = [];

        if (is_array($files)) {
            foreach ($files as $file) {
                if (is_dir($file)) {
                    continue;
                }
                $slug = basename($file, '.json');
                $data = $this->readPageData($slug);
                if ($data !== false) {
                    $pages[$slug] = $data;
                }
            }
        }

        return $pages;
    }

    /**
     * Check if a field name is a config key.
     */
    public function isConfigKey(string $key): bool
    {
        return in_array($key, self::CONFIG_KEYS, true);
    }

    /**
     * Atomic write: write to temp file, then rename.
     * Prevents data corruption on crash/power loss.
     */
    private function atomicWrite(string $path, string $content): bool
    {
        $dir = dirname($path);
        $tmp = tempnam($dir, '.tmp_');
        if ($tmp === false) {
            return false;
        }

        $written = file_put_contents($tmp, $content, LOCK_EX);
        if ($written === false) {
            unlink($tmp);
            return false;
        }

        chmod($tmp, 0644);
        return rename($tmp, $path);
    }

    /**
     * Read file with shared lock to prevent reading during write.
     */
    private function lockedRead(string $path): string|false
    {
        $fp = fopen($path, 'r');
        if ($fp === false) {
            return false;
        }

        if (!flock($fp, LOCK_SH)) {
            fclose($fp);
            return false;
        }

        $content = stream_get_contents($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return $content;
    }

    /**
     * Keep only the most recent MAX_BACKUPS config backup files.
     */
    private function rotateBackups(): void
    {
        $pattern = $this->backupsDir . '/config.*.json';
        $files = glob($pattern);
        if (!is_array($files) || count($files) < self::MAX_BACKUPS) {
            return;
        }
        sort($files);
        $toRemove = array_slice($files, 0, count($files) - self::MAX_BACKUPS + 1);
        foreach ($toRemove as $old) {
            unlink($old);
        }
    }

}

final class App
{
    public const VERSION_MAJOR = 1;
    public const VERSION_MINOR = 2;
    public const VERSION_BUILD = 12;
    public const VERSION = 'Ver.1.2-12';

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

    /**
     * Initialize translatable defaults. Called after loadLanguage().
     */
    private function initTranslatableDefaults(): void
    {
        $rp = $this->requestPage;
        $esc_rp = esc($rp);
        $year = date('Y');

        // Set defaults for config values that haven't been saved yet
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
            if ($key === 'content' || $key === 'loggedin') {
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
        if ($fval === false) {
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

        if (isset($_REQUEST['login'])) {
            return;
        }

        $content = $this->storage->readPage($this->config['page']);

        if ($content !== false) {
            $this->config['content'] = $content;
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
     * Translate a key with optional parameter substitution.
     * Parameters use :name syntax (e.g. ':page', ':year').
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
        echo "\t<script>var csrfToken='{$token}';</script>\n";
        foreach ($this->hooks['admin-head'] ?? [] as $tag) {
            echo "\t{$tag}\n";
        }
    }

    public function content(string $id, string $content): void
    {
        if ($this->isLoggedIn()) {
            $safeId = esc($id);
            $safeTitle = esc($this->defaults['content']);
            echo "<span title='{$safeTitle}' id='{$safeId}' class='editText richText'>{$content}</span>";
        } else {
            echo $content;
        }
    }

    public function menu(): void
    {
        $items = explode("<br />\n", $this->config['menu']);
        echo '<ul>';
        foreach ($items as $item) {
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

        $cwd = getcwd();
        if (is_dir('./themes/') && chdir('./themes/')) {
            $dirs = glob('*', GLOB_ONLYDIR);
            foreach ($dirs as $val) {
                $safeVal = esc($val);
                $selected = ($val === $this->config['themeSelect']) ? ' selected' : '';
                echo "<option value=\"{$safeVal}\"{$selected}>{$safeVal}</option>\n";
            }
            chdir($cwd);
        }

        echo "</select></span></div>";

        // Language selector
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

// --- Helper functions ---

function esc(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_verify(): void
{
    $token = $_POST['csrf'] ?? '';
    $session = $_SESSION['csrf'] ?? '';
    if ($token === '' || $session === '' || !hash_equals($session, $token)) {
        header('HTTP/1.1 403 Forbidden');
        exit;
    }
}

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

    if ($storage->isConfigKey($fieldname)) {
        $result = $storage->writeConfigValue($fieldname, $content);
    } else {
        $result = $storage->writePage($fieldname, $content);
    }

    if (!$result) {
        echo 'permission_error';
        exit;
    }

    echo $content;
    exit;
}

// --- Bootstrap ---

handleEdit();

$app = App::getInstance();

$theme = basename($app->config['themeSelect']);
$themePath = 'themes/' . $theme . '/theme.php';
if (!is_file($themePath)) {
    $theme = 'AP-Default';
    $themePath = 'themes/' . $theme . '/theme.php';
}
require $themePath;

ob_end_flush();
