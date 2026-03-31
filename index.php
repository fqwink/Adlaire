<?php
declare(strict_types=1);

/**
 * Adlaire Platform
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
        $skipFiles = array_merge(self::CONFIG_KEYS, ['config.json']);
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
    /** @var array<string, mixed> */
    public array $config = [];

    /** @var array<string, mixed> */
    public array $defaults = [];

    /** @var array<string, mixed> */
    public array $hooks = [];

    public readonly string $host;
    public readonly string $requestPage;
    public string $credit;

    public readonly FileStorage $storage;

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
        $rp = $this->requestPage;

        $this->config = [
            'password'    => 'admin',
            'loggedin'    => false,
            'page'        => 'home',
            'themeSelect' => 'AP-Default',
            'menu'        => "Home<br />\nExample",
            'title'       => 'Website title',
            'subside'     => "<h3>ABOUT YOUR WEBSITE</h3><br />\n\n This content is static and is visible on all pages.",
            'description' => 'Your website description.',
            'keywords'    => 'enter, your website, keywords',
            'copyright'   => '&copy;' . date('Y') . ' Your website',
        ];

        $esc_rp = esc($rp);
        $this->defaults = [
            'page' => [
                'home'    => "<h3>Your website is now powered by Adlaire Platform.</h3><br />\nLogin with the 'Login' link below. The password is admin.<br />\nChange the password as soon as possible.<br /><br />\n\nClick on the content to edit and click outside to save it.<br />",
                'example' => "This is an example page.<br /><br />\n\nTo add a new one, click on the existing pages (in the admin panel) and enter a new one below the others.",
            ],
            'new_page' => [
                'admin'   => "Page <b>{$esc_rp}</b> created.<br /><br />\n\nClick here to start editing!",
                'visitor' => "Sorry, but <b>{$esc_rp}</b> doesn't exist. :(",
            ],
            'content' => 'Click to edit!',
        ];

        $this->credit = "Powered by <a href=''>Adlaire Platform</a>";
        $this->hooks['admin-richText'] = 'rte.php';
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

        $this->handleAuth();
        $this->handlePage();
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
            $this->config['content'] = <<<HTML
                <form action='' method='POST'>
                <input type='hidden' name='csrf' value='{$csrf}'>
                <input type='password' name='password'>
                <input type='submit' name='login' value='Login'> {$msg}
                <p class='toggle'>Change password</p>
                <div class='hide'>Type your old password above and your new one below.<br />
                <input type='password' name='new'>
                <input type='submit' name='login' value='Change'>
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
        if (is_dir('./plugins/') && chdir('./plugins/')) {
            $dirs = glob('*', GLOB_ONLYDIR);
            if (is_array($dirs)) {
                foreach ($dirs as $dir) {
                    require_once $cwd . '/plugins/' . $dir . '/index.php';
                }
            }
        }
        chdir($cwd);

        $hookFile = $this->hooks['admin-richText'];
        $this->hooks['admin-head'][] = "\n\t<script type='text/javascript' src='./js/editInplace.php?hook={$hookFile}'></script>";
    }

    public function isLoggedIn(): bool
    {
        return $this->config['loggedin'] === true;
    }

    public function getLoginStatus(): string
    {
        $host = $this->host;
        return $this->isLoggedIn()
            ? "<a href='{$host}?logout'>Logout</a>"
            : "<a href='{$host}?login'>Login</a>";
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
            return 'wrong password';
        }

        $newPass = $_POST['new'] ?? '';
        if ($newPass !== '') {
            $newHash = $this->savePassword($newPass);
            $this->config['password'] = $newHash;
            session_regenerate_id(true);
            $_SESSION['l'] = $newHash;
            return 'password changed';
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
            echo 'Set 755 permission to the files folder.';
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
        echo "<div class='settings'>
        <h3 class='toggle'>↕ Settings ↕</h3>
        <div class='hide'>
        <div class='change border'><b>Theme</b>&nbsp;<span id='themeSelect'><select name='themeSelect' onchange='fieldSave(\"themeSelect\",this.value);'>";

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

        echo "</select></span></div>
        <div class='change border'><b>Menu <small>(add a page below and <a href='javascript:location.reload(true);'>refresh</a>)</small></b><span id='menu' title='Home' class='editText'>{$this->config['menu']}</span></div>";

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
        echo 'Set 755 permission to the files folder.';
        exit;
    }

    echo $content;
    exit;
}

// --- Bootstrap ---

handleEdit();

$app = App::getInstance();

require 'themes/' . $app->config['themeSelect'] . '/theme.php';

ob_end_flush();
