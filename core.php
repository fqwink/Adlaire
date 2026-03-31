<?php
declare(strict_types=1);

/**
 * Adlaire Platform - Core
 *
 * FileStorage data management layer and utility functions.
 *
 * @copyright Copyright (c) 2014 - 2015 IEAS Group
 * @copyright Copyright (c) 2014 - 2015 AIZM
 * @license Adlaire License
 */

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

    public function writeConfigValue(string $key, string $value): bool
    {
        return $this->writeConfig([$key => $value]);
    }

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

    public function writePage(string $slug, string $content): bool
    {
        if (!self::validateSlug($slug)) {
            return false;
        }

        $path = $this->pagesDir . '/' . $slug . '.json';
        $now = date('c');

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

    public function deletePage(string $slug): bool
    {
        if (!self::validateSlug($slug)) {
            return false;
        }

        $path = $this->pagesDir . '/' . $slug . '.json';
        if (!file_exists($path)) {
            return false;
        }

        $backupPath = $this->backupsDir . '/page_' . $slug . '.' . date('Ymd_His') . '.json';
        copy($path, $backupPath);

        unlink($path);
        return true;
    }

    /**
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

    public function isConfigKey(string $key): bool
    {
        return in_array($key, self::CONFIG_KEYS, true);
    }

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
