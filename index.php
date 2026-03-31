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

    private static ?self $instance = null;

    public static function getInstance(): self
    {
        return self::$instance ??= new self();
    }

    private function __construct()
    {
        [$this->host, $this->requestPage] = $this->parseHost();

        $this->initDefaults();
        $this->ensureDirectories();
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

    private function ensureDirectories(): void
    {
        if (!file_exists('files')) {
            mkdir('files', 0755, true);
            mkdir('plugins', 0755, true);
        }
    }

    private function loadConfig(): void
    {
        foreach ($this->config as $key => $val) {
            if ($key === 'content' || $key === 'loggedin') {
                continue;
            }

            $fpath = 'files/' . $key;
            $fval = file_exists($fpath) ? file_get_contents($fpath) : false;
            $this->defaults[$key] ??= $val;

            if ($fval !== false) {
                $this->config[$key] = $fval;
            }

            match ($key) {
                'password' => $this->handlePassword($fval, $val),
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

        $pagefile = 'files/' . $this->config['page'];
        $content = file_exists($pagefile) ? file_get_contents($pagefile) : false;

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
                $this->savePassword($input);
                $this->config['password'] = (string) file_get_contents('files/password');
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
        $result = file_put_contents('files/password', $hash);
        if ($result === false) {
            echo 'Set 644 permission to the password file.';
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
    if (!preg_match('/^[a-zA-Z0-9_\-]+$/', $fieldname)) {
        header('HTTP/1.1 400 Bad Request');
        exit;
    }

    $content = trim($content);

    if (!isset($_SESSION['l'])) {
        header('HTTP/1.1 401 Unauthorized');
        exit;
    }

    csrf_verify();

    $filepath = __DIR__ . '/files/' . $fieldname;
    $result = file_put_contents($filepath, $content);
    if ($result === false) {
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
