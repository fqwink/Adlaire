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
    private readonly string $basePath;
    private readonly string $configFile;
    private readonly string $configLock;
    private readonly string $pagesDir;
    private readonly string $backupsDir;
    private readonly string $revisionsDir;
    private readonly string $usersFile;
    private bool $migrated = false;

    /** File permission for sensitive data files */
    private const FILE_PERMISSION = 0600;

    /** Directory permission */
    private const DIR_PERMISSION = 0755;

    /** Public file permission for non-sensitive assets */
    private const PUBLIC_FILE_PERMISSION = 0644;

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

    /** Slug validation pattern (precompiled) */
    private const SLUG_PATTERN = '/^[a-zA-Z0-9_-]+$/';

    /** Timestamp validation pattern */
    private const TIMESTAMP_PATTERN = '/^\d{8}_\d{6}(_[a-f0-9]+)?$/';

    /** Username validation pattern */
    private const USERNAME_PATTERN = '/^[a-zA-Z0-9_-]{1,64}$/';

    /** Lock retry count */
    private const LOCK_RETRY_COUNT = 3;

    /** Lock retry wait in microseconds */
    private const LOCK_RETRY_WAIT = 50000;

    /** Memory usage threshold (80%) */
    private const MEMORY_THRESHOLD = 0.8;

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
        if ($slug === '' || strlen($slug) > 128) {
            return false;
        }
        return (bool) preg_match(self::SLUG_PATTERN, $slug);
    }

    /**
     * Migrate from legacy formats to current structure.
     * Phase 1: legacy flat-file → JSON (only when config.json absent).
     * Phase 2: blocks JSON → Portable Text (runs once per installation).
     */
    public function migrate(): void
    {
        if ($this->migrated) {
            return;
        }
        $this->migrated = true;

        if (!file_exists($this->configFile)) {
            $this->migrateLegacyFiles();
        }

        $this->migratePagesToPT();
    }

    /**
     * Migrate legacy flat files to Portable Text JSON page format.
     * Called only when config.json does not exist (fresh/V2.x install).
     */
    private function migrateLegacyFiles(): void
    {
        $realBase = realpath($this->basePath);
        if ($realBase === false) {
            $realBase = $this->basePath;
        }

        $legacyConfigKeys = array_merge(self::CONFIG_KEYS, ['password']);

        $config = [];
        foreach ($legacyConfigKeys as $key) {
            $legacyFile = $realBase . '/' . $key;
            if (file_exists($legacyFile) && !is_link($legacyFile)) {
                $raw = file_get_contents($legacyFile);
                $config[$key] = ($raw !== false) ? $raw : '';
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
                    $ptBody = [[
                        '_type' => 'block',
                        '_key' => bin2hex(random_bytes(4)),
                        'style' => 'normal',
                        'markDefs' => [],
                        'children' => [[
                            '_type' => 'span',
                            '_key' => bin2hex(random_bytes(4)),
                            'text' => $rawContent,
                            'marks' => [],
                        ]],
                    ]];
                    $pageData = [
                        'body'       => $ptBody,
                        'status'     => 'published',
                        'type'       => 'page',
                        'posted_at'  => '',
                        'category'   => '',
                        'tags'       => [],
                        'author'     => '',
                        'created_at' => $mtime,
                        'updated_at' => $mtime,
                    ];
                    $pageJson = json_encode($pageData, self::JSON_FLAGS);
                    if ($pageJson !== false) {
                        $this->atomicWrite($dest, $pageJson);
                    }
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
     * Migrate existing page JSON files from blocks format to Portable Text format.
     * Runs once per installation (marker: data/.pt_migrated).
     */
    private function migratePagesToPT(): void
    {
        $markerFile = $this->basePath . '/.pt_migrated';
        if (file_exists($markerFile)) {
            return;
        }

        $files = glob($this->pagesDir . '/*.json');
        if (!is_array($files)) {
            $this->atomicWrite($markerFile, date('c'));
            return;
        }

        foreach ($files as $file) {
            if (is_link($file)) {
                continue;
            }
            $json = $this->lockedRead($file);
            if ($json === false || $json === '') {
                continue;
            }
            $data = json_decode($json, true);
            if (!is_array($data)) {
                continue;
            }

            // Skip if already in PT format
            if (isset($data['body']) && !isset($data['content'])) {
                continue;
            }

            $body = [];
            if (isset($data['blocks']) && is_array($data['blocks'])) {
                $body = $this->convertBlocksToPT($data['blocks']);
            } elseif (isset($data['content']) && is_string($data['content']) && $data['content'] !== '') {
                $body = [[
                    '_type' => 'block',
                    '_key' => bin2hex(random_bytes(4)),
                    'style' => 'normal',
                    'markDefs' => [],
                    'children' => [[
                        '_type' => 'span',
                        '_key' => bin2hex(random_bytes(4)),
                        'text' => $data['content'],
                        'marks' => [],
                    ]],
                ]];
            }

            $newData = [
                'body'       => $body,
                'status'     => $data['status'] ?? 'published',
                'type'       => $data['type'] ?? 'page',
                'posted_at'  => $data['posted_at'] ?? '',
                'category'   => $data['category'] ?? '',
                'tags'       => is_array($data['tags'] ?? null) ? $data['tags'] : [],
                'author'     => $data['author'] ?? '',
                'created_at' => $data['created_at'] ?? date('c'),
                'updated_at' => $data['updated_at'] ?? date('c'),
            ];

            $newJson = json_encode($newData, self::JSON_FLAGS);
            if ($newJson !== false) {
                $this->atomicWrite($file, $newJson);
            }
        }

        $this->atomicWrite($markerFile, date('c'));
    }

    /**
     * Convert legacy blocks array to Portable Text nodes.
     * @param array<int, array{type: string, data: array<string, mixed>}> $blocks
     * @return list<array<string, mixed>>
     */
    public function convertBlocksToPT(array $blocks): array
    {
        $pt = [];
        foreach ($blocks as $block) {
            if (!is_array($block)) {
                continue;
            }
            $type = (string) ($block['type'] ?? '');
            $d = is_array($block['data'] ?? null) ? $block['data'] : [];
            switch ($type) {
                case 'paragraph':
                    $pt[] = [
                        '_type' => 'block',
                        '_key' => bin2hex(random_bytes(4)),
                        'style' => 'normal',
                        'markDefs' => [],
                        'children' => [[
                            '_type' => 'span',
                            '_key' => bin2hex(random_bytes(4)),
                            'text' => (string) ($d['text'] ?? ''),
                            'marks' => [],
                        ]],
                    ];
                    break;
                case 'heading':
                    $level = max(1, min(3, (int) ($d['level'] ?? 2)));
                    $pt[] = [
                        '_type' => 'block',
                        '_key' => bin2hex(random_bytes(4)),
                        'style' => 'h' . $level,
                        'markDefs' => [],
                        'children' => [[
                            '_type' => 'span',
                            '_key' => bin2hex(random_bytes(4)),
                            'text' => (string) ($d['text'] ?? ''),
                            'marks' => [],
                        ]],
                    ];
                    break;
                case 'list':
                    $items = is_array($d['items'] ?? null) ? $d['items'] : [];
                    $listStyle = (($d['style'] ?? '') === 'ordered') ? 'number' : 'bullet';
                    foreach ($items as $item) {
                        $pt[] = [
                            '_type' => 'block',
                            '_key' => bin2hex(random_bytes(4)),
                            'style' => 'normal',
                            'listItem' => $listStyle,
                            'level' => 1,
                            'markDefs' => [],
                            'children' => [[
                                '_type' => 'span',
                                '_key' => bin2hex(random_bytes(4)),
                                'text' => (string) $item,
                                'marks' => [],
                            ]],
                        ];
                    }
                    break;
                case 'code':
                    $pt[] = [
                        '_type' => 'code',
                        '_key' => bin2hex(random_bytes(4)),
                        'code' => (string) ($d['code'] ?? ''),
                        'language' => (string) ($d['language'] ?? ''),
                    ];
                    break;
                case 'quote':
                    $pt[] = [
                        '_type' => 'block',
                        '_key' => bin2hex(random_bytes(4)),
                        'style' => 'blockquote',
                        'markDefs' => [],
                        'children' => [[
                            '_type' => 'span',
                            '_key' => bin2hex(random_bytes(4)),
                            'text' => (string) ($d['text'] ?? ''),
                            'marks' => [],
                        ]],
                    ];
                    break;
                case 'delimiter':
                    $pt[] = [
                        '_type' => 'delimiter',
                        '_key' => bin2hex(random_bytes(4)),
                    ];
                    break;
                case 'image':
                    $pt[] = [
                        '_type' => 'image',
                        '_key' => bin2hex(random_bytes(4)),
                        'url' => (string) ($d['url'] ?? ''),
                        'caption' => (string) ($d['caption'] ?? ''),
                    ];
                    break;
            }
        }
        return $pt;
    }

    /**
     * Read all config values from config.json.
     * @return array<string, string>
     */
    public function readConfig(): array
    {
        if (!file_exists($this->configFile) || is_link($this->configFile)) {
            return [];
        }

        $json = $this->lockedRead($this->configFile);
        if ($json === false || $json === '') {
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
        for ($retry = 0; $retry < self::LOCK_RETRY_COUNT; $retry++) {
            if (flock($lockFp, LOCK_EX | LOCK_NB)) {
                $locked = true;
                break;
            }
            usleep(self::LOCK_RETRY_WAIT);
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
                    if (is_string($raw) && $raw !== '') {
                        $decoded = json_decode($raw, true);
                        $existing = is_array($decoded) ? $decoded : [];
                    }
                }
            }

            $merged = array_merge($existing, $config);

            if (file_exists($this->configFile)) {
                $backupName = date('Ymd_His') . '_' . substr(bin2hex(random_bytes(3)), 0, 6);
                $backupDest = $this->backupsDir . '/config.' . $backupName . '.json';
                if (!copy($this->configFile, $backupDest)) {
                    error_log('Adlaire: Failed to copy config backup: ' . $backupName);
                    return false;
                }
                @chmod($backupDest, self::FILE_PERMISSION);
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
     * @return array{body: list<array<string, mixed>>, status: string, type: string, posted_at: string, category: string, tags: list<string>, author: string, created_at: string, updated_at: string}|false
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
        if ($json === false || $json === '') {
            return false;
        }
        $data = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('Adlaire: Failed to parse page data: ' . $slug . ' - ' . json_last_error_msg());
            return false;
        }
        return is_array($data) && isset($data['body']) ? $data : false;
    }

    /**
     * Write a page in Portable Text format.
     * @param list<array<string, mixed>> $body Portable Text nodes
     * @param list<string> $tags
     */
    public function writePage(
        string $slug,
        array $body,
        string $status = 'published',
        string $type = 'page',
        string $postedAt = '',
        string $category = '',
        array $tags = [],
        string $author = ''
    ): bool {
        if (!self::validateSlug($slug)) {
            return false;
        }
        if (!in_array($status, ['draft', 'published'], true)) {
            $status = 'published';
        }
        if (!in_array($type, ['page', 'post'], true)) {
            $type = 'page';
        }

        $path = $this->pagesDir . '/' . $slug . '.json';

        $realPagesDir = realpath($this->pagesDir);
        if ($realPagesDir === false) {
            return false;
        }
        $resolvedPath = $realPagesDir . DIRECTORY_SEPARATOR . $slug . '.json';
        if (!str_starts_with($resolvedPath, $realPagesDir . DIRECTORY_SEPARATOR)) {
            return false;
        }
        $now = date('c');

        $existing = $this->readPageData($slug);
        $createdAt = ($existing !== false) ? $existing['created_at'] : $now;

        if ($existing !== false) {
            $this->saveRevision($slug, $existing);
        }

        $data = [
            'body'       => $body,
            'status'     => $status,
            'type'       => $type,
            'posted_at'  => $postedAt,
            'category'   => $category,
            'tags'       => array_values(array_filter($tags, 'is_string')),
            'author'     => $author,
            'created_at' => $createdAt,
            'updated_at' => $now,
        ];

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

        // Path traversal check
        $realPath = realpath($path);
        $realPagesDir = realpath($this->pagesDir);
        if ($realPath === false || $realPagesDir === false || !str_starts_with($realPath, $realPagesDir . DIRECTORY_SEPARATOR)) {
            return false;
        }

        $backupPath = $this->backupsDir . '/page_' . $slug . '.' . date('Ymd_His') . '_' . substr(bin2hex(random_bytes(3)), 0, 6) . '.json';
        if (!copy($path, $backupPath)) {
            error_log('Adlaire: Failed to copy page backup, aborting delete: ' . $slug);
            return false;
        }
        @chmod($backupPath, self::FILE_PERMISSION);

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
     * @return array<string, array<string, mixed>>
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
            if ($cacheMtime !== false && $dirMtime !== false && $cacheMtime > $dirMtime) {
                $cached = $this->lockedRead($cacheFile);
                if ($cached !== false && $cached !== '') {
                    $decoded = json_decode($cached, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $cachedIndex = $decoded;
                    }
                }
            }
        }

        $pages = [];
        $memoryLimitRaw = ini_get('memory_limit');
        $val = is_string($memoryLimitRaw) ? (int) $memoryLimitRaw : 0;
        if ($memoryLimitRaw === '-1' || $val === -1) {
            // Unlimited memory: skip memory check
        } elseif ($val > 0) {
            $unit = strtolower(substr(trim($memoryLimitRaw), -1));
            $memoryLimitBytes = match (true) {
                $unit === 'g' => $val * 1024 * 1024 * 1024,
                $unit === 'm' => $val * 1024 * 1024,
                $unit === 'k' => $val * 1024,
                ctype_digit($unit) => $val,
                default => $val,
            };
            if (memory_get_usage(true) > (int) ($memoryLimitBytes * self::MEMORY_THRESHOLD)) {
                error_log('Adlaire: Memory usage exceeds 80% of limit during listPages');
                if ($cachedIndex !== null) {
                    foreach ($cachedIndex as $slug => $meta) {
                        $data = $this->readPageData($slug);
                        if ($data !== false) {
                            $pages[$slug] = $data;
                        }
                    }
                    return $pages;
                }
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
            if ($files === false) {
                error_log('Adlaire: glob() failed for pages directory: ' . $this->pagesDir);
                return $pages;
            }
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

            // Write index cache (metadata only — excludes body for performance)
            $cacheSummary = [];
            foreach ($pages as $slug => $data) {
                $cacheSummary[$slug] = [
                    'status'     => $data['status'] ?? 'published',
                    'type'       => $data['type'] ?? 'page',
                    'posted_at'  => $data['posted_at'] ?? '',
                    'created_at' => $data['created_at'] ?? '',
                    'updated_at' => $data['updated_at'] ?? '',
                ];
            }
            $cacheJson = json_encode($cacheSummary, self::JSON_FLAGS);
            if ($cacheJson !== false) {
                $this->atomicWrite($cacheFile, $cacheJson);
            }
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
        clearstatcache(true, $cacheFile);
        clearstatcache(true, $this->pagesDir);
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

        // Skip if status is already the same
        if (($data['status'] ?? 'published') === $status) {
            return true;
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
     * List published pages only (all types, for visitor-facing use).
     * @return array<string, array<string, mixed>>
     */
    public function listPublishedPages(): array
    {
        $all = $this->listPages();
        return array_filter($all, fn(array $data) => $data['status'] === 'published');
    }

    /**
     * List published posts only (type: post, status: published).
     * Sorted newest first by posted_at, then updated_at.
     * @return array<string, array<string, mixed>>
     */
    public function listPublishedPosts(): array
    {
        $all = $this->listPublishedPages();
        $posts = array_filter($all, fn(array $data) => ($data['type'] ?? 'page') === 'post');
        uasort($posts, static function (array $a, array $b): int {
            $dateA = ($a['posted_at'] !== '' && is_string($a['posted_at'])) ? $a['posted_at'] : ($a['updated_at'] ?? '');
            $dateB = ($b['posted_at'] !== '' && is_string($b['posted_at'])) ? $b['posted_at'] : ($b['updated_at'] ?? '');
            $ta = is_string($dateA) ? (strtotime($dateA) ?: 0) : 0;
            $tb = is_string($dateB) ? (strtotime($dateB) ?: 0) : 0;
            return $tb <=> $ta;
        });
        return $posts;
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
        if ($files === false || count($files) <= self::MAX_BACKUPS) {
            return;
        }
        // Filter out symlinks
        $files = array_filter($files, static fn(string $f): bool => !is_link($f) && is_file($f));
        if (count($files) <= self::MAX_BACKUPS) {
            return;
        }
        usort($files, static function (string $a, string $b): int {
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
        if (!self::validateSlug($slug)) {
            return;
        }
        $dir = $this->revisionsDir . '/' . $slug;
        if (!is_dir($dir)) {
            if (!mkdir($dir, self::DIR_PERMISSION, true) && !is_dir($dir)) {
                error_log('Adlaire: Failed to create revision directory: ' . $dir);
                return;
            }
        }

        $revFile = $dir . '/' . date('Ymd_His') . '_' . substr(bin2hex(random_bytes(3)), 0, 6) . '.json';
        $revJson = json_encode($pageData, self::JSON_FLAGS);
        if ($revJson === false) {
            error_log('Adlaire: Failed to encode revision JSON for: ' . $slug);
            return;
        }
        $this->atomicWrite($revFile, $revJson);

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

        // Path traversal check
        $realDir = realpath($dir);
        $realRevisionsDir = realpath($this->revisionsDir);
        if ($realDir === false || $realRevisionsDir === false || !str_starts_with($realDir, $realRevisionsDir . DIRECTORY_SEPARATOR)) {
            return [];
        }

        $files = glob($realDir . '/*.json');
        if (!is_array($files)) {
            return [];
        }

        rsort($files);
        $revisions = [];
        foreach ($files as $file) {
            $ts = basename($file, '.json');
            if (preg_match(self::TIMESTAMP_PATTERN, $ts)) {
                $revisions[] = [
                    'timestamp' => $ts,
                ];
            }
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
        if (!preg_match(self::TIMESTAMP_PATTERN, $timestamp)) {
            return false;
        }

        $revFile = $this->revisionsDir . '/' . $slug . '/' . $timestamp . '.json';
        if (!file_exists($revFile) || is_link($revFile)) {
            return false;
        }

        // Path traversal check
        $realRevFile = realpath($revFile);
        $realRevisionsDir = realpath($this->revisionsDir);
        if ($realRevFile === false || $realRevisionsDir === false || !str_starts_with($realRevFile, $realRevisionsDir . DIRECTORY_SEPARATOR)) {
            return false;
        }

        $json = $this->lockedRead($revFile);
        if ($json === false || $json === '') {
            return false;
        }

        $data = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            return false;
        }

        $status = $data['status'] ?? 'published';
        $type = $data['type'] ?? 'page';
        $postedAt = $data['posted_at'] ?? '';
        $category = $data['category'] ?? '';
        $tags = is_array($data['tags'] ?? null) ? $data['tags'] : [];
        $author = $data['author'] ?? '';

        // Handle both old format (blocks) and new format (body)
        if (isset($data['body']) && is_array($data['body'])) {
            $body = $data['body'];
        } elseif (isset($data['blocks']) && is_array($data['blocks'])) {
            $body = $this->convertBlocksToPT($data['blocks']);
        } elseif (isset($data['content']) && is_string($data['content'])) {
            $text = $data['content'];
            $body = $text !== '' ? [[
                '_type' => 'block',
                '_key' => bin2hex(random_bytes(4)),
                'style' => 'normal',
                'markDefs' => [],
                'children' => [[
                    '_type' => 'span',
                    '_key' => bin2hex(random_bytes(4)),
                    'text' => $text,
                    'marks' => [],
                ]],
            ]] : [];
        } else {
            $body = [];
        }

        return $this->writePage($slug, $body, $status, $type, $postedAt, $category, $tags, $author);
    }

    /** @return list<string> */
    public function getPageOrder(): array
    {
        $config = $this->readConfig();
        $raw = $config['page_order'] ?? '';
        if (!is_string($raw) || $raw === '') {
            return [];
        }
        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            return [];
        }
        return array_values(array_filter($data, 'is_string'));
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
        $json = json_encode(array_values($slugs), JSON_UNESCAPED_UNICODE);
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

    /** @return array<string, mixed>|false */
    public function getRevisionData(string $slug, string $timestamp): array|false
    {
        if (!self::validateSlug($slug)) {
            return false;
        }
        if (!preg_match(self::TIMESTAMP_PATTERN, $timestamp)) {
            return false;
        }
        $revFile = $this->revisionsDir . '/' . $slug . '/' . $timestamp . '.json';
        if (!file_exists($revFile) || is_link($revFile)) {
            return false;
        }
        // Path traversal check
        $realRevFile = realpath($revFile);
        $realRevisionsDir = realpath($this->revisionsDir);
        if ($realRevFile === false || $realRevisionsDir === false || !str_starts_with($realRevFile, $realRevisionsDir . DIRECTORY_SEPARATOR)) {
            return false;
        }
        $json = $this->lockedRead($realRevFile);
        if ($json === false || $json === '') {
            return false;
        }
        $data = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            return false;
        }
        return $data;
    }

    // --- User management ---

    /** @return array<string, array<string, mixed>> */
    public function readUsers(): array
    {
        if (!file_exists($this->usersFile) || is_link($this->usersFile)) {
            return [];
        }
        $json = $this->lockedRead($this->usersFile);
        if ($json === false || $json === '') {
            return [];
        }
        $data = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            error_log('Adlaire: Failed to parse users.json: ' . json_last_error_msg());
            return [];
        }
        return $data['users'] ?? [];
    }

    /** @param array<string, mixed> $data */
    public function writeUser(string $username, array $data): bool
    {
        if ($username === '' || !preg_match(self::USERNAME_PATTERN, $username)) {
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
        if ($username === '' || !preg_match(self::USERNAME_PATTERN, $username)) {
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

    /** @return array<string, array<string, mixed>> */
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

    /** @return array<string, mixed>|false */
    public function getUser(string $username): array|false
    {
        if ($username === '' || !preg_match(self::USERNAME_PATTERN, $username)) {
            return false;
        }
        $users = $this->readUsers();
        if (!isset($users[$username]) || !is_array($users[$username])) {
            return false;
        }
        return $users[$username];
    }

    /** @return array{login_id: string, password: string, token: string} */
    public function generateSubMasterCredentials(): array
    {
        $loginId = bin2hex(random_bytes(8));   // 16 hex chars
        $password = bin2hex(random_bytes(12)); // 24 hex chars
        $token = bin2hex(random_bytes(16));    // 32 hex chars
        // Total: 16 + 24 + 32 = 72. Ensure >= 73 total chars.
        $totalLen = strlen($loginId) + strlen($password) + strlen($token);
        if ($totalLen < 73) {
            $extra = 73 - $totalLen;
            $extraBytes = max(1, (int) ceil($extra / 2));
            $token .= bin2hex(random_bytes($extraBytes));
            $targetTokenLen = 73 - strlen($loginId) - strlen($password);
            if ($targetTokenLen > 0 && strlen($token) > $targetTokenLen) {
                $token = substr($token, 0, $targetTokenLen);
            }
        }

        // Validate generated login_id matches username pattern
        if (!preg_match(self::USERNAME_PATTERN, $loginId)) {
            // Extremely unlikely but defensive
            $loginId = 'sub' . bin2hex(random_bytes(6));
        }

        return [
            'login_id' => $loginId,
            'password' => $password,
            'token' => $token,
        ];
    }

    public function disableUser(string $username): bool
    {
        if ($username === '' || !preg_match(self::USERNAME_PATTERN, $username)) {
            return false;
        }
        $users = $this->readUsers();
        if (!isset($users[$username])) {
            error_log('Adlaire: Cannot disable non-existent user: ' . $username);
            return false;
        }
        if (!empty($users[$username]['is_main'])) {
            error_log('Adlaire: Cannot disable main master user');
            return false;
        }
        if (isset($users[$username]['enabled']) && $users[$username]['enabled'] === false) {
            return true; // Already disabled
        }
        $users[$username]['enabled'] = false;
        return $this->writeUsersFile($users);
    }

    /** @param array<string, array<string, mixed>> $users */
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

        if (file_exists($this->configFile)) {
            $backupName = date('Ymd_His') . '_' . substr(bin2hex(random_bytes(3)), 0, 6);
            $backupDest = $this->backupsDir . '/config.' . $backupName . '.json';
            if (!copy($this->configFile, $backupDest)) {
                error_log('Adlaire: Failed to copy config backup in removeConfigKey: ' . $backupName);
                return false;
            }
            @chmod($backupDest, self::FILE_PERMISSION);
            $this->rotateBackups();
        }

        $json = json_encode($config, self::JSON_FLAGS);
        if ($json === false) {
            error_log('Adlaire: Failed to encode config JSON in removeConfigKey');
            return false;
        }
        return $this->atomicWrite($this->configFile, $json);
    }
}
