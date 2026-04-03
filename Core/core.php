<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - Core
 *
 * FileStorage data management layer and utility functions.
 *
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group
 * @copyright Copyright (c) 2014 - 2026 倉田和宏
 * @license Adlaire License Ver.2.0 (Open Source - Platform Code)
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
    private string $usersFile;
    private bool $migrated = false;

    /** File permission for sensitive data files */
    private const FILE_PERMISSION = 0600;

    /** Directory permission */
    private const DIR_PERMISSION = 0755;

    /** Maximum number of users */
    private const MAX_USERS = 3;

    /** Config keys managed in config.json */
    private const CONFIG_KEYS = [
        'themeSelect', 'menu', 'title',
        'subside', 'description', 'keywords', 'copyright',
        'language', 'page_order', 'sidebar_blocks',
    ];

    /** Maximum number of config backup generations to retain */
    private const MAX_BACKUPS = 9;

    /** Maximum number of page revisions to retain per page */
    private const MAX_REVISIONS = 30;

    /** JSON encoding flags for data files */
    private const JSON_FLAGS = JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE;

    public function __construct(string $basePath = 'data')
    {
        $this->basePath = $basePath;
        $this->configFile = $basePath . '/config.json';
        $this->configLock = $basePath . '/.config.lock';
        $this->pagesDir = $basePath . '/pages';
        $this->backupsDir = $basePath . '/backups';
        $this->revisionsDir = $basePath . '/revisions';
        $this->usersFile = $basePath . '/system/users.json';
    }

    public function ensureDirectories(): void
    {
        $legacyDir = dirname($this->basePath) . '/files';
        if ($this->basePath === 'data' && !is_dir($this->basePath) && is_dir($legacyDir)) {
            if (is_link($legacyDir) || is_link($this->basePath)) {
                error_log('Adlaire: Symlink detected during legacy migration, skipping');
            } elseif (!rename($legacyDir, $this->basePath)) {
                error_log('Adlaire: Failed to rename legacy directory: ' . $legacyDir);
            }
        }

        foreach ([$this->basePath, $this->pagesDir, $this->backupsDir, $this->revisionsDir] as $dir) {
            if (!is_dir($dir) && !is_link($dir)) {
                if (!@mkdir($dir, self::DIR_PERMISSION, true) && !is_dir($dir)) {
                    error_log('Adlaire: Failed to create directory: ' . $dir);
                }
            }
        }
        $systemDir = $this->basePath . '/system';
        if (!is_dir($systemDir) && !is_link($systemDir)) {
            if (!@mkdir($systemDir, self::DIR_PERMISSION, true) && !is_dir($systemDir)) {
                error_log('Adlaire: Failed to create system directory: ' . $systemDir);
            }
        }
        $pluginsDir = dirname($this->basePath) . '/plugins';
        if (!is_dir($pluginsDir) && !is_link($pluginsDir)) {
            if (!@mkdir($pluginsDir, self::DIR_PERMISSION, true) && !is_dir($pluginsDir)) {
                error_log('Adlaire: Failed to create plugins directory: ' . $pluginsDir);
            }
        }
    }

    /**
     * Validate a page slug. Returns true only for safe, non-traversal names.
     */
    public static function validateSlug(string $slug): bool
    {
        if ($slug === '') {
            return false;
        }
        return (bool) preg_match('/^[a-zA-Z0-9_-]+$/', $slug);
    }

    /**
     * Migrate from legacy flat file format to new structure.
     * Runs once automatically when config.json does not exist.
     */
    public function migrate(): void
    {
        if ($this->migrated || file_exists($this->configFile)) {
            $this->migrated = true;
            return;
        }
        $this->migrated = true;

        $realBase = realpath($this->basePath);
        if ($realBase === false) {
            $realBase = $this->basePath;
        }

        $legacyConfigKeys = array_merge(self::CONFIG_KEYS, ['password']);

        $config = [];
        foreach ($legacyConfigKeys as $key) {
            $legacyFile = $realBase . '/' . $key;
            if (file_exists($legacyFile) && !is_link($legacyFile)) {
                $config[$key] = file_get_contents($legacyFile);
            }
        }

        if ($config !== []) {
            $this->writeConfig($config);
        }

        $skipFiles = array_merge($legacyConfigKeys, [
            'config.json', 'pages.meta.json', 'pages.index.json',
            '.htaccess', '.config.lock', 'install.lock',
        ]);
        $files = glob($realBase . '/*');
        if (is_array($files)) {
            foreach ($files as $file) {
                if (is_dir($file) || is_link($file)) {
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
                    $this->atomicWrite($dest, json_encode($pageData, self::JSON_FLAGS));
                    @unlink($file);
                }
            }
        }

        foreach ($legacyConfigKeys as $key) {
            $legacyFile = $realBase . '/' . $key;
            if (file_exists($legacyFile) && !is_link($legacyFile)) {
                @unlink($legacyFile);
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
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('Adlaire: Failed to parse config.json: ' . json_last_error_msg());
            return [];
        }
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

        $locked = false;
        for ($retry = 0; $retry < 3; $retry++) {
            if (flock($lockFp, LOCK_EX | LOCK_NB)) {
                $locked = true;
                break;
            }
            usleep(50000);
        }
        if (!$locked) {
            if (!flock($lockFp, LOCK_EX)) {
                fclose($lockFp);
                return false;
            }
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
                if (!copy($this->configFile, $this->backupsDir . '/config.' . $backupName . '.json')) {
                    error_log('Adlaire: Failed to copy config backup: ' . $backupName);
                    return false;
                }
                $this->rotateBackups();
            }

            $json = json_encode($merged, self::JSON_FLAGS);
            if ($json === false) {
                error_log('Adlaire: Failed to encode config JSON: ' . json_last_error_msg());
                return false;
            }
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
        if (!file_exists($path) || is_link($path)) {
            return false;
        }
        $realPath = realpath($path);
        $realPagesDir = realpath($this->pagesDir);
        if ($realPath === false || $realPagesDir === false || !str_starts_with($realPath, $realPagesDir . DIRECTORY_SEPARATOR)) {
            return false;
        }
        $json = $this->lockedRead($realPath);
        if ($json === false) {
            return false;
        }
        $data = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('Adlaire: Failed to parse page data: ' . $slug . ' - ' . json_last_error_msg());
            return false;
        }
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

        $json = json_encode($data, self::JSON_FLAGS);
        if ($json === false) {
            error_log('Adlaire: Failed to encode page JSON: ' . $slug . ' - ' . json_last_error_msg());
            return false;
        }
        $result = $this->atomicWrite($path, $json);
        if ($result) { $this->invalidatePageCache(); }
        return $result;
    }

    public function deletePage(string $slug): bool
    {
        if (!self::validateSlug($slug)) {
            return false;
        }

        $path = $this->pagesDir . '/' . $slug . '.json';
        if (!file_exists($path) || is_link($path)) {
            return false;
        }

        $backupPath = $this->backupsDir . '/page_' . $slug . '.' . date('Ymd_His') . '_' . substr(bin2hex(random_bytes(3)), 0, 6) . '.json';
        if (!copy($path, $backupPath)) {
            error_log('Adlaire: Failed to copy page backup, aborting delete: ' . $slug);
            return false;
        }

        if (!@unlink($path)) {
            error_log('Adlaire: Failed to delete page file: ' . $path);
            return false;
        }

        // Clean up revisions for deleted page
        $revDir = $this->revisionsDir . '/' . $slug;
        if (is_dir($revDir)) {
            $revFiles = glob($revDir . '/*.json');
            if (is_array($revFiles)) {
                foreach ($revFiles as $rf) {
                    @unlink($rf);
                }
            }
            if (!@rmdir($revDir)) {
                error_log('Adlaire: Failed to remove revision directory: ' . $revDir);
            }
        }

        $this->invalidatePageCache();
        return true;
    }

    /**
     * @return array<string, array{content: string, format: string, status: string, created_at: string, updated_at: string, blocks?: array}>
     */
    public function listPages(): array
    {
        $cacheFile = $this->basePath . '/pages.index.json';
        $cachedIndex = null;

        if (file_exists($cacheFile) && file_exists($this->pagesDir)) {
            clearstatcache(true, $cacheFile);
            clearstatcache(true, $this->pagesDir);
            $cacheMtime = filemtime($cacheFile);
            $dirMtime = filemtime($this->pagesDir);
            if ($cacheMtime !== false && $dirMtime !== false && $cacheMtime >= $dirMtime) {
                $cached = $this->lockedRead($cacheFile);
                if ($cached !== false) {
                    $decoded = json_decode($cached, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $cachedIndex = $decoded;
                    }
                }
            }
        }

        $pages = [];
        $memoryLimit = (int) ini_get('memory_limit');
        if ($memoryLimit > 0) {
            $memoryLimitBytes = $memoryLimit * 1024 * 1024;
            if (memory_get_usage(true) > (int) ($memoryLimitBytes * 0.8)) {
                error_log('Adlaire: Memory usage exceeds 80% of limit during listPages');
                return $pages;
            }
        }

        if ($cachedIndex !== null) {
            foreach ($cachedIndex as $slug => $meta) {
                $data = $this->readPageData($slug);
                if ($data !== false) {
                    $pages[$slug] = $data;
                }
            }
        } else {
            $files = glob($this->pagesDir . '/*.json');
            if (is_array($files)) {
                foreach ($files as $file) {
                    if (is_dir($file) || is_link($file)) {
                        continue;
                    }
                    $slug = basename($file, '.json');
                    $data = $this->readPageData($slug);
                    if ($data !== false) {
                        $pages[$slug] = $data;
                    }
                }
            }

            // Write index cache (metadata only — excludes content/blocks for performance)
            $cacheSummary = [];
            foreach ($pages as $slug => $data) {
                $cacheSummary[$slug] = [
                    'format'     => $data['format'] ?? 'blocks',
                    'status'     => $data['status'] ?? 'published',
                    'created_at' => $data['created_at'] ?? '',
                    'updated_at' => $data['updated_at'] ?? '',
                ];
            }
            $this->atomicWrite($cacheFile, json_encode($cacheSummary, self::JSON_FLAGS));
        }

        return $pages;
    }

    /**
     * Invalidate the page index cache.
     */
    private function invalidatePageCache(): void
    {
        $cacheFile = $this->basePath . '/pages.index.json';
        if (file_exists($cacheFile)) {
            @unlink($cacheFile);
        }
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
        $json = json_encode($data, self::JSON_FLAGS);
        if ($json === false) {
            error_log('Adlaire: Failed to encode page status JSON: ' . $slug);
            return false;
        }
        $result = $this->atomicWrite($path, $json);
        if ($result) { $this->invalidatePageCache(); }
        return $result;
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
        if (!is_dir($dir)) {
            if (!@mkdir($dir, self::DIR_PERMISSION, true) && !is_dir($dir)) {
                error_log('Adlaire: Failed to create directory for atomicWrite: ' . $dir);
                return false;
            }
        }
        $tmp = tempnam($dir, '.tmp_');
        if ($tmp === false) {
            error_log('Adlaire: tempnam() failed for directory: ' . $dir);
            return false;
        }

        $written = file_put_contents($tmp, $content, LOCK_EX);
        if ($written === false) {
            @unlink($tmp);
            return false;
        }

        if (!@chmod($tmp, self::FILE_PERMISSION)) {
            error_log('Adlaire: chmod failed for temp file: ' . $tmp);
            @unlink($tmp);
            return false;
        }
        if (!rename($tmp, $path)) {
            error_log('Adlaire: Failed to rename temp file: ' . $tmp . ' -> ' . $path);
            @unlink($tmp);
            return false;
        }
        return true;
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
        if (!is_array($files) || count($files) <= self::MAX_BACKUPS) {
            return;
        }
        usort($files, function (string $a, string $b): int {
            $mtimeA = filemtime($a);
            $mtimeB = filemtime($b);
            if ($mtimeA === false) { $mtimeA = 0; }
            if ($mtimeB === false) { $mtimeB = 0; }
            return $mtimeA <=> $mtimeB;
        });
        $toRemove = array_slice($files, 0, max(0, count($files) - self::MAX_BACKUPS));
        foreach ($toRemove as $old) {
            @unlink($old);
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
            if (!mkdir($dir, self::DIR_PERMISSION, true) && !is_dir($dir)) {
                error_log('Adlaire: Failed to create revision directory: ' . $dir);
                return;
            }
        }

        $revFile = $dir . '/' . date('Ymd_His') . '_' . substr(bin2hex(random_bytes(3)), 0, 6) . '.json';
        $this->atomicWrite($revFile, json_encode($pageData, self::JSON_FLAGS));

        // Rotate old revisions
        $files = glob($dir . '/*.json');
        if (is_array($files) && count($files) > self::MAX_REVISIONS) {
            sort($files);
            $toRemove = array_slice($files, 0, count($files) - self::MAX_REVISIONS);
            foreach ($toRemove as $old) {
                @unlink($old);
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
        if (!is_dir($dir) || is_link($dir)) {
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
        if (!file_exists($revFile) || is_link($revFile)) {
            return false;
        }

        $json = $this->lockedRead($revFile);
        if ($json === false) {
            return false;
        }

        $data = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data) || !isset($data['content'])) {
            return false;
        }

        $format = $data['format'] ?? 'blocks';
        $blocks = $data['blocks'] ?? null;
        $status = $data['status'] ?? 'published';
        return $this->writePage($slug, $data['content'], $format, $blocks, $status);
    }

    /** @return list<string> */
    public function getPageOrder(): array
    {
        $config = $this->readConfig();
        $raw = $config['page_order'] ?? '';
        if ($raw === '') {
            return [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /** @param list<string> $slugs */
    public function savePageOrder(array $slugs): bool
    {
        foreach ($slugs as $slug) {
            if (!is_string($slug) || !self::validateSlug($slug)) {
                error_log('Adlaire: Invalid slug in page order');
                return false;
            }
        }
        $json = json_encode($slugs, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            error_log('Adlaire: Failed to encode page order JSON');
            return false;
        }
        return $this->writeConfigValue('page_order', $json);
    }

    /** @return array<string, list<array{timestamp: string}>> */
    public function listAllRevisions(): array
    {
        $result = [];
        if (!is_dir($this->revisionsDir)) {
            return $result;
        }
        $dirs = glob($this->revisionsDir . '/*', GLOB_ONLYDIR);
        if (!is_array($dirs)) {
            return $result;
        }
        foreach ($dirs as $dir) {
            $slug = basename($dir);
            if (!self::validateSlug($slug)) {
                continue;
            }
            $files = glob($dir . '/*.json');
            if (!is_array($files)) {
                continue;
            }
            rsort($files);
            $revs = [];
            foreach ($files as $file) {
                $revs[] = ['timestamp' => basename($file, '.json')];
            }
            if ($revs !== []) {
                $result[$slug] = $revs;
            }
        }
        return $result;
    }

    public function getRevisionData(string $slug, string $timestamp): array|false
    {
        if (!self::validateSlug($slug)) {
            return false;
        }
        if (!preg_match('/^\d{8}_\d{6}(_[a-f0-9]+)?$/', $timestamp)) {
            return false;
        }
        $revFile = $this->revisionsDir . '/' . $slug . '/' . $timestamp . '.json';
        if (!file_exists($revFile) || is_link($revFile)) {
            return false;
        }
        $json = $this->lockedRead($revFile);
        if ($json === false) {
            return false;
        }
        $data = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            return false;
        }
        return $data;
    }

    // --- User management ---

    public function readUsers(): array
    {
        if (!file_exists($this->usersFile) || is_link($this->usersFile)) {
            return [];
        }
        $json = $this->lockedRead($this->usersFile);
        if ($json === false) {
            return [];
        }
        $data = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            error_log('Adlaire: Failed to parse users.json: ' . json_last_error_msg());
            return [];
        }
        return $data['users'] ?? [];
    }

    public function writeUser(string $username, array $data): bool
    {
        if ($username === '' || !preg_match('/^[a-zA-Z0-9_-]{1,64}$/', $username)) {
            return false;
        }
        $users = $this->readUsers();
        if (!isset($users[$username]) && count($users) >= self::MAX_USERS) {
            error_log('Adlaire: Maximum user limit reached (' . self::MAX_USERS . ')');
            return false;
        }
        if (isset($users[$username])) {
            $users[$username] = array_merge($users[$username], $data);
        } else {
            $data['created_at'] = $data['created_at'] ?? date('c');
            $data['last_login'] = $data['last_login'] ?? '';
            $users[$username] = $data;
        }
        return $this->writeUsersFile($users);
    }

    public function deleteUser(string $username): bool
    {
        if ($username === '') {
            return false;
        }
        $users = $this->readUsers();
        if (!isset($users[$username])) {
            return false;
        }
        if (!empty($users[$username]['is_main'])) {
            error_log('Adlaire: Cannot delete main master user');
            return false;
        }
        if (count($users) <= 1) {
            error_log('Adlaire: Cannot delete last remaining user');
            return false;
        }
        unset($users[$username]);
        return $this->writeUsersFile($users);
    }

    public function listUsers(): array
    {
        $users = $this->readUsers();
        $result = [];
        foreach ($users as $username => $data) {
            $entry = [
                'role' => $data['role'] ?? 'master',
                'is_main' => $data['is_main'] ?? false,
                'created_at' => $data['created_at'] ?? '',
                'last_login' => $data['last_login'] ?? '',
            ];
            if (isset($data['enabled'])) {
                $entry['enabled'] = $data['enabled'];
            }
            if (isset($data['created_by'])) {
                $entry['created_by'] = $data['created_by'];
            }
            $result[$username] = $entry;
        }
        return $result;
    }

    public function getUserCount(): int
    {
        return count($this->readUsers());
    }

    public function usersFileExists(): bool
    {
        return file_exists($this->usersFile) && !is_link($this->usersFile);
    }

    public function getUser(string $username): array|false
    {
        $users = $this->readUsers();
        if (!isset($users[$username])) {
            return false;
        }
        return $users[$username];
    }

    public function generateSubMasterCredentials(): array
    {
        $loginId = bin2hex(random_bytes(8));
        $password = bin2hex(random_bytes(12));
        $token = bin2hex(random_bytes(16));
        $totalLen = strlen($loginId) + strlen($password) + strlen($token);
        if ($totalLen < 73) {
            $extra = 73 - $totalLen;
            $token .= bin2hex(random_bytes((int) ceil($extra / 2)));
            $token = substr($token, 0, 73 - strlen($loginId) - strlen($password));
        }
        return [
            'login_id' => $loginId,
            'password' => $password,
            'token' => $token,
        ];
    }

    public function disableUser(string $username): bool
    {
        $users = $this->readUsers();
        if (!isset($users[$username])) {
            return false;
        }
        if (!empty($users[$username]['is_main'])) {
            return false;
        }
        $users[$username]['enabled'] = false;
        return $this->writeUsersFile($users);
    }

    private function writeUsersFile(array $users): bool
    {
        $data = [
            'users' => $users,
            'max_users' => self::MAX_USERS,
        ];
        $json = json_encode($data, self::JSON_FLAGS);
        if ($json === false) {
            error_log('Adlaire: Failed to encode users JSON: ' . json_last_error_msg());
            return false;
        }
        return $this->atomicWrite($this->usersFile, $json);
    }

    public function removeConfigKey(string $key): bool
    {
        $config = $this->readConfig();
        if (!isset($config[$key])) {
            return true;
        }
        unset($config[$key]);
        $json = json_encode($config, self::JSON_FLAGS);
        if ($json === false) {
            error_log('Adlaire: Failed to encode config JSON in removeConfigKey');
            return false;
        }
        return $this->atomicWrite($this->configFile, $json);
    }
}
