<?php
declare(strict_types=1);

/**
 * Adlaire Platform - Core
 *
 * FileStorage data management layer and utility functions.
 *
 * @copyright Copyright (c) 2014 - 2026 IEAS Group
 * @copyright Copyright (c) 2014 - 2026 AIZM
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
    private string $revisionsDir;

    /** Config keys managed in config.json */
    private const CONFIG_KEYS = [
        'password', 'themeSelect', 'menu', 'title',
        'subside', 'description', 'keywords', 'copyright',
        'language',
    ];

    /** Maximum number of config backup generations to retain */
    private const MAX_BACKUPS = 9;

    /** Maximum number of page revisions to retain per page */
    private const MAX_REVISIONS = 30;

    public function __construct(string $basePath = 'files')
    {
        $this->basePath = $basePath;
        $this->configFile = $basePath . '/config.json';
        $this->configLock = $basePath . '/.config.lock';
        $this->pagesDir = $basePath . '/pages';
        $this->backupsDir = $basePath . '/backups';
        $this->revisionsDir = $basePath . '/revisions';
    }

    public function ensureDirectories(): void
    {
        foreach ([$this->basePath, $this->pagesDir, $this->backupsDir, $this->revisionsDir] as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
        $pluginsDir = dirname($this->basePath) . '/plugins';
        if (!is_dir($pluginsDir)) {
            mkdir($pluginsDir, 0755, true);
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
                    $rawContent = $content !== false ? $content : '';
                    $pageBlocks = [['type' => 'paragraph', 'data' => ['text' => $rawContent]]];
                    $pageData = [
                        'content'    => $rawContent,
                        'format'     => 'blocks',
                        'status'     => 'published',
                        'blocks'     => $pageBlocks,
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
                $backupName = date('Ymd_His') . '_' . substr(bin2hex(random_bytes(3)), 0, 6);
                copy($this->configFile, $this->backupsDir . '/config.' . $backupName . '.json');
                $this->rotateBackups();
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

    /**
     * @return array{content: string, format: string, status: string, created_at: string, updated_at: string, blocks?: array}|false
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
     * @param array<int, array{type: string, data: array<string, mixed>}>|null $blocks
     */
    public function writePage(string $slug, string $content, string $format = 'blocks', ?array $blocks = null, string $status = 'published'): bool
    {
        if (!self::validateSlug($slug)) {
            return false;
        }

        if (!in_array($format, ['markdown', 'blocks'], true)) {
            $format = 'blocks';
        }
        if (!in_array($status, ['draft', 'published'], true)) {
            $status = 'published';
        }

        $path = $this->pagesDir . '/' . $slug . '.json';
        $now = date('c');

        $existing = $this->readPageData($slug);
        $createdAt = ($existing !== false) ? $existing['created_at'] : $now;

        // Save revision before overwriting
        if ($existing !== false) {
            $this->saveRevision($slug, $existing);
        }

        $data = [
            'content'    => $content,
            'format'     => $format,
            'status'     => $status,
            'created_at' => $createdAt,
            'updated_at' => $now,
        ];

        if ($format === 'blocks' && $blocks !== null) {
            $data['blocks'] = $blocks;
        }

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

        $backupPath = $this->backupsDir . '/page_' . $slug . '.' . date('Ymd_His') . '_' . substr(bin2hex(random_bytes(3)), 0, 6) . '.json';
        copy($path, $backupPath);

        unlink($path);

        // Clean up revisions for deleted page
        $revDir = $this->revisionsDir . '/' . $slug;
        if (is_dir($revDir)) {
            $revFiles = glob($revDir . '/*.json');
            if (is_array($revFiles)) {
                foreach ($revFiles as $rf) {
                    unlink($rf);
                }
            }
            rmdir($revDir);
        }

        return true;
    }

    /**
     * @return array<string, array{content: string, format: string, status: string, created_at: string, updated_at: string, blocks?: array}>
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
     * Update only the status of a page (draft/published).
     */
    public function updatePageStatus(string $slug, string $status): bool
    {
        if (!self::validateSlug($slug) || !in_array($status, ['draft', 'published'], true)) {
            return false;
        }

        $data = $this->readPageData($slug);
        if ($data === false) {
            return false;
        }

        $data['status'] = $status;
        $data['updated_at'] = date('c');

        $path = $this->pagesDir . '/' . $slug . '.json';
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        return $this->atomicWrite($path, $json);
    }

    /**
     * List published pages only (for visitor-facing use).
     * @return array<string, array<string, mixed>>
     */
    public function listPublishedPages(): array
    {
        $all = $this->listPages();
        return array_filter($all, fn(array $data) => ($data['status'] ?? 'published') === 'published');
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

        if (!chmod($tmp, 0644)) {
            unlink($tmp);
            return false;
        }
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
        return $content !== false ? $content : false;
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
    // --- Revision management ---

    /**
     * Save a revision of a page before overwriting.
     * @param array<string, mixed> $pageData
     */
    private function saveRevision(string $slug, array $pageData): void
    {
        $dir = $this->revisionsDir . '/' . $slug;
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $revFile = $dir . '/' . date('Ymd_His') . '_' . substr(bin2hex(random_bytes(3)), 0, 6) . '.json';
        $this->atomicWrite($revFile, json_encode($pageData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        // Rotate old revisions
        $files = glob($dir . '/*.json');
        if (is_array($files) && count($files) > self::MAX_REVISIONS) {
            sort($files);
            $toRemove = array_slice($files, 0, count($files) - self::MAX_REVISIONS);
            foreach ($toRemove as $old) {
                unlink($old);
            }
        }
    }

    /**
     * List revisions for a page, newest first.
     * @return array<int, array{timestamp: string}>
     */
    public function listRevisions(string $slug): array
    {
        if (!self::validateSlug($slug)) {
            return [];
        }

        $dir = $this->revisionsDir . '/' . $slug;
        if (!is_dir($dir)) {
            return [];
        }

        $files = glob($dir . '/*.json');
        if (!is_array($files)) {
            return [];
        }

        rsort($files);
        $revisions = [];
        foreach ($files as $file) {
            $revisions[] = [
                'timestamp' => basename($file, '.json'),
            ];
        }
        return $revisions;
    }

    /**
     * Restore a page from a specific revision.
     */
    public function restoreRevision(string $slug, string $timestamp): bool
    {
        if (!self::validateSlug($slug)) {
            return false;
        }
        if (!preg_match('/^\d{8}_\d{6}(_[a-f0-9]+)?$/', $timestamp)) {
            return false;
        }

        $revFile = $this->revisionsDir . '/' . $slug . '/' . $timestamp . '.json';
        if (!file_exists($revFile)) {
            return false;
        }

        $json = $this->lockedRead($revFile);
        if ($json === false) {
            return false;
        }

        $data = json_decode($json, true);
        if (!is_array($data) || !isset($data['content'])) {
            return false;
        }

        $format = $data['format'] ?? 'blocks';
        $blocks = $data['blocks'] ?? null;
        $status = $data['status'] ?? 'published';
        return $this->writePage($slug, $data['content'], $format, $blocks, $status);
    }
}

// --- Helper functions ---

function esc(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function csrf_token(): string
{
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function csrf_verify(): void
{
    $token = $_POST['csrf'] ?? $_REQUEST['csrf'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $session = $_SESSION['csrf'] ?? '';
    if ($token === '' || $session === '' || !hash_equals($session, $token)) {
        header('HTTP/1.1 403 Forbidden');
        exit;
    }
    // Regenerate token after successful verification (one-time use)
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

/**
 * Rate limiting for login attempts.
 * @return bool true if attempt is allowed, false if rate-limited
 */
function login_rate_check(): bool
{
    $maxAttempts = 5;
    $windowSeconds = 300; // 5 minutes
    $now = time();

    $_SESSION['login_attempts'] ??= [];
    // Prune old attempts
    $_SESSION['login_attempts'] = array_values(array_filter(
        $_SESSION['login_attempts'],
        fn(int $t) => ($now - $t) < $windowSeconds
    ));

    if (count($_SESSION['login_attempts']) >= $maxAttempts) {
        return false;
    }

    $_SESSION['login_attempts'][] = $now;
    return true;
}
