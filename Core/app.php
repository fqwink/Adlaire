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
    public const VERSION_MINOR = 4;
    public const VERSION_BUILD = 37;
    public const VERSION = 'Ver.2.4-37';

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

        $this->storage = new FileStorage('data');
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

        $httpHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
        if (preg_match('/^[a-zA-Z0-9.\-]+(:\d+)?$/', $httpHost) !== 1) {
            $httpHost = 'localhost';
        }

        $uri = preg_replace('#/+#', '/', urldecode($_SERVER['REQUEST_URI'] ?? '/')) ?? '/';

        $host = ($rp !== '' && str_contains($uri, $rp))
            ? $httpHost . '/' . substr($uri, 0, strlen($uri) - strlen($rp))
            : $httpHost . '/' . $uri;

        $host = explode('?', $host)[0];
        $host = '//' . preg_replace('#/+#', '/', $host);

        $rp = preg_replace('/[^a-zA-Z0-9_\-\/]/', '', $rp);
        $rp = trim($rp, '/');

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

    private function handlePassword(mixed $fval, string $val): void
    {
        if (!is_string($fval) || $fval === '') {
            $this->config['password'] = $this->savePassword($val);
        }
    }

    private function handleAuth(): void
    {
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > 1800) {
            $_SESSION = [];
            session_destroy();
            session_start();
            session_regenerate_id(true);
        }
        if (isset($_SESSION['l'])) {
            $_SESSION['last_activity'] = time();
        }

        if (isset($_SESSION['l']) && hash_equals($this->config['password'], $_SESSION['l'])) {
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
                $msg = esc($this->login());
            }

            $csrf = csrf_token();
            $loginLabel = esc($this->t('login_submit'));
            $changePwLabel = esc($this->t('change_password_label'));
            $changePwHint = esc($this->t('change_password_hint'));
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
        $this->config['pageFormat'] = 'blocks';
        $this->config['pageStatus'] = 'published';

        if (isset($_REQUEST['login'])) {
            return;
        }

        $pageData = $this->storage->readPageData($this->config['page']);

        if ($pageData !== false) {
            $isDraft = ($pageData['status'] ?? 'published') === 'draft';
            if ($isDraft && !$this->isLoggedIn()) {
                http_response_code(404);
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
        $this->config['content'] = $this->isLoggedIn()
            ? $this->defaults['new_page']['admin']
            : $this->defaults['new_page']['visitor'];
        return;
    }

    private function loadPlugins(): void
    {
        $pluginsDir = dirname(__DIR__) . '/plugins';
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
        $file = dirname(__DIR__) . '/data/lang/' . $lang . '.json';
        if (is_file($file)) {
            $json = file_get_contents($file);
            if ($json !== false) {
                $this->translations = json_decode($json, true) ?: [];
            }
        }
    }

    /** @param array<string, string> $params */
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
        $host = esc($this->host);
        if ($this->isLoggedIn()) {
            return "<a href='{$host}?admin'>Admin</a> | <a href='{$host}?logout'>" . esc($this->t('logout')) . "</a>";
        }
        return "<a href='{$host}?login'>" . esc($this->t('login')) . "</a>";
    }

    public static function getSlug(string $page): string
    {
        return mb_convert_case(str_replace(' ', '-', $page), MB_CASE_LOWER, 'UTF-8');
    }

    public function login(): string
    {
        csrf_verify();

        if (!login_rate_check()) {
            return $this->t('login_rate_limited');
        }

        $stored = $this->config['password'];
        $input = $_POST['password'] ?? '';

        $md5Migrated = false;
        $isBcrypt = str_starts_with($stored, '$2y$') || str_starts_with($stored, '$2b$');
        if (!$isBcrypt && strlen($stored) === 32 && ctype_xdigit($stored)) {
            $valid = hash_equals($stored, md5($input));
            if ($valid) {
                $this->config['password'] = $this->savePassword($input);
                $md5Migrated = true;
            }
        } else {
            $valid = password_verify($input, $stored);
        }

        if (!$valid) {
            return $this->t('wrong_password');
        }

        if ($md5Migrated) {
            session_regenerate_id(true);
            $_SESSION['l'] = $this->config['password'];
            $_SESSION['last_activity'] = time();
            return $this->t('password_migrated');
        }

        $newPass = $_POST['new'] ?? '';
        if ($newPass !== '') {
            if (strlen($newPass) < 8) {
                return $this->t('password_too_short');
            }
            $weak = ['admin', 'password', '12345678', 'adlaire'];
            if (in_array(strtolower($newPass), $weak, true)) {
                return $this->t('password_too_weak');
            }
            $newHash = $this->savePassword($newPass);
            $this->config['password'] = $newHash;
            session_regenerate_id(true);
            $_SESSION['l'] = $newHash;
            return $this->t('password_changed');
        }

        session_regenerate_id(true);
        $_SESSION['l'] = $this->config['password'];
        $_SESSION['last_activity'] = time();
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
        if (!$this->isLoggedIn()) {
            return;
        }
        $token = csrf_token();
        $safeToken = json_encode($token, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT);
        $safeLang = json_encode($this->language, JSON_HEX_TAG | JSON_HEX_AMP);
        $safeFormat = json_encode($this->config['pageFormat'] ?? 'blocks', JSON_HEX_TAG | JSON_HEX_AMP);
        echo "\t<script>var csrfToken={$safeToken};var pageLang={$safeLang};var pageFormat={$safeFormat};</script>\n";
        echo "\t<script>i18n.init({$safeLang});</script>\n";
        foreach ($this->hooks['admin-head'] ?? [] as $tag) {
            echo "\t" . esc($tag) . "\n";
        }
    }

    public function scriptTags(bool $adminMode = false): void
    {
        if ($adminMode) {
            $scripts = ['autosize', 'markdown', 'i18n', 'api', 'editor', 'editInplace'];
        } else {
            $scripts = ['markdown', 'editInplace'];
        }
        foreach ($scripts as $name) {
            echo "\t<script src=\"js/{$name}.js\"></script>\n";
        }
    }

    public function content(string $id, string $content): void
    {
        $format = $this->config['pageFormat'] ?? 'blocks';
        $isPage = ($id === $this->config['page']);
        $isBlocks = ($format === 'blocks' && $isPage);
        $isMarkdown = ($format === 'markdown' && $isPage);

        if ($isBlocks) {
            $blocksB64 = '';
            if (isset($this->config['pageBlocks'])) {
                $blocksB64 = base64_encode(json_encode($this->config['pageBlocks'], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP));
            }
            echo "<div class='blocks-content' data-blocks-b64='" . esc($blocksB64) . "'></div>";
        } elseif ($isMarkdown) {
            $encoded = esc(base64_encode($content));
            echo "<div class='markdown-content' data-raw-b64='{$encoded}'></div>";
        } else {
            echo $content;
        }
    }

    public function menu(): void
    {
        $menu = str_replace("\r\n", "\n", $this->config['menu']);
        $items = explode("<br />\n", $menu);
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
}
