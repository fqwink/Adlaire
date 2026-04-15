<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - Generator
 *
 * Static site generator: diff builds, HTML generation.
 * Depends on: helpers.php, core.php, app.php, renderer.php
 *
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group
 * @copyright Copyright (c) 2014 - 2026 倉田和宏
 * @license Adlaire License Ver.2.0 (Open Source - Platform Code)
 */

/**
 * Handle the static site generation API endpoint.
 */
/** Directory permission for generated output */
const GENERATOR_DIR_PERMISSION = 0755;

/** File permission for generated output */
const GENERATOR_FILE_PERMISSION = 0644;

function handleApiGenerate(FileStorage $storage): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        apiError(405, 'Method not allowed');
        return;
    }

    if (!csrf_verify()) {
        apiError(403, 'CSRF verification failed');
        return;
    }

    $app = App::getInstance();
    $distDir = dirname(__DIR__) . '/dist';
    $force = ($_POST['force'] ?? '') === 'true';
    $buildStateFile = $distDir . '/.build_state.json';
    $lastBuildTime = '';

    // Read previous build state for diff build
    if (!$force && file_exists($buildStateFile)) {
        $state = json_decode((string) file_get_contents($buildStateFile), true);
        $lastBuildTime = is_array($state) ? ($state['built_at'] ?? '') : '';
    }

    // Full rebuild: clean dist directory (preserve .build_state.json)
    if ($force || $lastBuildTime === '') {
        if (is_dir($distDir)) {
            $files = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($distDir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($files as $file) {
                $path = $file->getPathname();
                if (basename($path) === '.build_state.json') {
                    continue;
                }
                $lstat = @lstat($path);
                if ($lstat !== false && ($lstat['mode'] & 0120000) === 0120000) {
                    @unlink($path);
                } elseif ($file->isDir()) {
                    $realPath = $file->getRealPath();
                    if ($realPath !== false) {
                        @rmdir($realPath);
                    }
                } else {
                    $realPath = $file->getRealPath();
                    if ($realPath !== false) {
                        @unlink($realPath);
                    }
                }
            }
        }
    }
    if (!is_dir($distDir)) {
        if (!mkdir($distDir, GENERATOR_DIR_PERMISSION, true)) {
            apiError(500, 'Failed to create dist directory');
            return;
        }
    }

    $pages = $storage->listPublishedPages();
    $themeRaw = $app->config['themeSelect'] ?? 'AP-Default';
    $theme = basename(is_string($themeRaw) ? $themeRaw : 'AP-Default');
    $themePath = dirname(__DIR__) . '/themes/' . $theme;
    $count = 0;
    $skipped = 0;
    $failed = 0;
    $details = [];
    $startTime = hrtime(true);

    // Build sorted posts list and prev/next navigation map
    $sortedPosts = array_filter($pages, fn(array $d) => ($d['type'] ?? 'page') === 'post');
    uasort($sortedPosts, static function (array $a, array $b): int {
        $da = (is_string($a['posted_at'] ?? null) && $a['posted_at'] !== '') ? $a['posted_at'] : (is_string($a['updated_at'] ?? null) ? ($a['updated_at'] ?? '') : '');
        $db = (is_string($b['posted_at'] ?? null) && $b['posted_at'] !== '') ? $b['posted_at'] : (is_string($b['updated_at'] ?? null) ? ($b['updated_at'] ?? '') : '');
        return strcmp($db, $da); // newest first
    });
    $postSlugs = array_keys($sortedPosts);
    /** @var array<string, array{prevPost: array<string, string>|null, nextPost: array<string, string>|null}> $prevNextMap */
    $prevNextMap = [];
    foreach ($postSlugs as $i => $postSlug) {
        $prevNextMap[$postSlug] = ['prevPost' => null, 'nextPost' => null];
        // In newest-first order: nextPost (newer) = i-1, prevPost (older) = i+1
        foreach (['nextPost' => $i - 1, 'prevPost' => $i + 1] as $navKey => $navIdx) {
            if (!isset($postSlugs[$navIdx])) {
                continue;
            }
            $navSlug = $postSlugs[$navIdx];
            $navData = $pages[$navSlug] ?? [];
            $navBody = is_array($navData['body'] ?? null) ? $navData['body'] : [];
            $navTitle = '';
            foreach ($navBody as $node) {
                if (!is_array($node) || ($node['_type'] ?? '') !== 'block') {
                    continue;
                }
                $cs = is_array($node['children'] ?? null) ? $node['children'] : [];
                $tx = implode('', array_map(fn(mixed $ch): string => is_array($ch) ? (string) ($ch['text'] ?? '') : '', $cs));
                if ($tx !== '') {
                    $navTitle = $tx;
                    break;
                }
            }
            $prevNextMap[$postSlug][$navKey] = [
                'slug'      => $navSlug,
                'title'     => $navTitle !== '' ? $navTitle : str_replace('-', ' ', $navSlug),
                'posted_at' => is_string($navData['posted_at'] ?? null) ? ($navData['posted_at'] ?? '') : '',
            ];
        }
    }

    // Copy theme CSS (prefer minimal.css for static output)
    $cssDir = $distDir . '/themes/' . $theme;
    if (!is_dir($cssDir)) {
        if (!@mkdir($cssDir, GENERATOR_DIR_PERMISSION, true) && !is_dir($cssDir)) {
            error_log('Adlaire: Failed to create theme CSS directory: ' . $cssDir);
        }
    }
    $cssSource = is_file($themePath . '/minimal.css') ? '/minimal.css' : '/style.css';
    if (is_file($themePath . $cssSource)) {
        $cssDest = $cssDir . '/style.css';
        if (!copy($themePath . $cssSource, $cssDest)) {
            error_log('Adlaire: Failed to copy theme CSS: ' . $cssSource);
        } else {
            @chmod($cssDest, GENERATOR_FILE_PERMISSION);
        }
    }

    // Copy only public JS (exclude admin-only scripts from static output)
    $jsSrc = dirname(__DIR__) . '/js';
    $jsDst = $distDir . '/js';
    $publicJs = ['public.js'];
    if (is_dir($jsSrc)) {
        if (!is_dir($jsDst)) {
            if (!@mkdir($jsDst, GENERATOR_DIR_PERMISSION, true) && !is_dir($jsDst)) {
                error_log('Adlaire: Failed to create JS directory: ' . $jsDst);
            }
        }
        foreach ($publicJs as $jsName) {
            $jsPath = $jsSrc . '/' . $jsName;
            if (is_file($jsPath)) {
                $jsDstPath = $jsDst . '/' . $jsName;
                if (!copy($jsPath, $jsDstPath)) {
                    error_log('Adlaire: Failed to copy JS file: ' . $jsName);
                } else {
                    @chmod($jsDstPath, GENERATOR_FILE_PERMISSION);
                }
            }
        }
    }

    // Copy translation files
    $langSrc = dirname(__DIR__) . '/data/lang';
    $langDst = $distDir . '/data/lang';
    if (is_dir($langSrc)) {
        if (!is_dir($langDst)) {
            if (!@mkdir($langDst, GENERATOR_DIR_PERMISSION, true) && !is_dir($langDst)) {
                error_log('Adlaire: Failed to create lang directory: ' . $langDst);
            }
        }
        $langFiles = glob($langSrc . '/*.json');
        if ($langFiles === false) {
            error_log('Adlaire: glob() failed for lang directory: ' . $langSrc);
        } else {
            foreach ($langFiles as $langFile) {
                $langDstFile = $langDst . '/' . basename($langFile);
                if (!copy($langFile, $langDstFile)) {
                    error_log('Adlaire: Failed to copy lang file: ' . basename($langFile));
                } else {
                    @chmod($langDstFile, GENERATOR_FILE_PERMISSION);
                }
            }
        }
    }

    // Generate each page (diff build: skip unchanged pages)
    foreach ($pages as $slug => $data) {
        $updatedAt = $data['updated_at'] ?? '';
        $updatedTime = is_string($updatedAt) && $updatedAt !== '' ? strtotime($updatedAt) : false;
        $buildTime = $lastBuildTime !== '' ? strtotime($lastBuildTime) : false;
        if ($lastBuildTime !== '' && $updatedTime !== false && $buildTime !== false && $updatedTime <= $buildTime) {
            $skipped++;
            $details[] = ['slug' => $slug, 'result' => 'skipped'];
            continue;
        }

        $contentHtml = '';
        if (isset($data['body']) && is_array($data['body'])) {
            $contentHtml = renderPortableTextToHtml($data['body']);
        }

        $postMeta = [];
        if (($data['type'] ?? 'page') === 'post' && isset($prevNextMap[$slug])) {
            $postMeta = [
                'type'      => 'post',
                'posted_at' => is_string($data['posted_at'] ?? null) ? ($data['posted_at'] ?? '') : '',
                'category'  => is_string($data['category'] ?? null) ? ($data['category'] ?? '') : '',
                'tags'      => is_array($data['tags'] ?? null) ? $data['tags'] : [],
                'author'    => is_string($data['author'] ?? null) ? ($data['author'] ?? '') : '',
                'prevPost'  => $prevNextMap[$slug]['prevPost'],
                'nextPost'  => $prevNextMap[$slug]['nextPost'],
            ];
        }
        $pageHtml = generatePageHtml($app, $slug, $contentHtml, $theme, $postMeta);

        $writeFailed = false;
        if ($slug === 'home') {
            $homeResult = file_put_contents($distDir . '/index.html', $pageHtml);
            if ($homeResult === false) {
                $writeFailed = true;
            } else {
                @chmod($distDir . '/index.html', GENERATOR_FILE_PERMISSION);
            }
        }
        $pageDir = $distDir . '/' . $slug;
        if (!is_dir($pageDir) && !@mkdir($pageDir, GENERATOR_DIR_PERMISSION, true) && !is_dir($pageDir)) {
            error_log('Adlaire: Failed to create page directory: ' . $pageDir);
            $failed++;
            $details[] = ['slug' => $slug, 'result' => 'failed'];
            continue;
        }
        $pageWriteResult = file_put_contents($pageDir . '/index.html', $pageHtml);
        if ($pageWriteResult === false) {
            $writeFailed = true;
        } else {
            @chmod($pageDir . '/index.html', GENERATOR_FILE_PERMISSION);
        }

        if ($writeFailed) {
            error_log('Adlaire: Failed to write page HTML: ' . $slug);
            $failed++;
            $details[] = ['slug' => $slug, 'result' => 'failed'];
        } else {
            $count++;
            $details[] = ['slug' => $slug, 'result' => 'generated'];
        }
    }

    // Generate blog index and archive pages (category/tag/date)
    if ($sortedPosts !== []) {
        $blogDir = $distDir . '/blog';
        if (!is_dir($blogDir) && !@mkdir($blogDir, GENERATOR_DIR_PERMISSION, true) && !is_dir($blogDir)) {
            error_log('Adlaire: Failed to create blog directory');
        } else {
            $blogHtml = generateBlogIndexHtml($app, $sortedPosts, $theme);
            $blogWriteResult = file_put_contents($blogDir . '/index.html', $blogHtml);
            if ($blogWriteResult === false) {
                error_log('Adlaire: Failed to write blog/index.html');
            } else {
                @chmod($blogDir . '/index.html', GENERATOR_FILE_PERMISSION);
            }
            generateArchivePages($app, $sortedPosts, $distDir, $theme);
        }
    }

    // Generate sitemap.xml
    $httpsVal = $_SERVER['HTTPS'] ?? '';
    $isHttps = is_string($httpsVal) && $httpsVal !== '' && $httpsVal !== 'off';
    $hostTrimmed = rtrim($app->host, '/');
    $host = ($isHttps ? 'https' : 'http') . ':' . $hostTrimmed;
    $basePath = '';
    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($pages as $slug => $data) {
        $loc = htmlspecialchars("{$host}{$basePath}/{$slug}", ENT_XML1, 'UTF-8');
        $updatedAt = $data['updated_at'] ?? '';
        $lastmod = (is_string($updatedAt) && strlen($updatedAt) >= 10) ? htmlspecialchars(substr($updatedAt, 0, 10), ENT_XML1, 'UTF-8') : '';
        $xml .= "  <url><loc>{$loc}</loc>";
        if ($lastmod !== '') {
            $xml .= "<lastmod>{$lastmod}</lastmod>";
        }
        $xml .= "</url>\n";
    }
    // R6-14: ブログインデックスページをsitemapに追加
    if ($sortedPosts !== []) {
        $blogLoc = htmlspecialchars("{$host}{$basePath}/blog/", ENT_XML1, 'UTF-8');
        $xml .= "  <url><loc>{$blogLoc}</loc></url>\n";
    }
    $xml .= '</urlset>';
    if (file_put_contents($distDir . '/sitemap.xml', $xml) === false) {
        apiError(500, 'Failed to write sitemap.xml');
        return;
    }
    @chmod($distDir . '/sitemap.xml', GENERATOR_FILE_PERMISSION);

    // Ver.3.7: 全文検索インデックス生成（GENERATOR_RULEBOOK.md §11）
    generateSearchIndex($storage, $distDir);

    // Save build state for diff builds
    $buildStateJson = json_encode([
        'built_at' => date('c'),
        'pages' => $count,
    ], JSON_PRETTY_PRINT);
    if ($buildStateJson === false || file_put_contents($distDir . '/.build_state.json', $buildStateJson) === false) {
        apiError(500, 'Failed to write build state');
        return;
    }
    @chmod($distDir . '/.build_state.json', GENERATOR_FILE_PERMISSION);

    $buildTimeMs = (int) ((hrtime(true) - $startTime) / 1_000_000);
    $pagesTotal = count($pages);

    apiResponse([
        'status' => 'ok',
        'pages' => $count,
        'output' => 'dist/',
        'pages_total' => $pagesTotal,
        'pages_generated' => $count,
        'pages_skipped' => $skipped,
        'pages_failed' => $failed,
        'build_time_ms' => $buildTimeMs,
        'details' => $details,
    ]);
}

/**
 * Generate full-text search index file dist/search-index.json (Ver.3.7).
 * @see GENERATOR_RULEBOOK.md §11
 */
function generateSearchIndex(FileStorage $storage, string $distDir): void
{
    $pages = $storage->listPublishedPages();
    $index = [];
    foreach ($pages as $slug => $data) {
        if (!is_string($slug)) {
            continue;
        }
        $body = is_array($data['body'] ?? null) ? $data['body'] : [];
        $type = is_string($data['type'] ?? null) ? ($data['type'] ?? 'page') : 'page';
        $updatedAt = is_string($data['updated_at'] ?? null) ? ($data['updated_at'] ?? '') : '';

        // §11.5: タイトル抽出 — 最初の heading (h1/h2/h3) ブロックのテキストを使用
        $title = '';
        foreach ($body as $node) {
            if (!is_array($node) || ($node['_type'] ?? '') !== 'block') {
                continue;
            }
            $style = (string) ($node['style'] ?? '');
            if (!in_array($style, ['h1', 'h2', 'h3'], true)) {
                continue;
            }
            $children = is_array($node['children'] ?? null) ? $node['children'] : [];
            $parts = [];
            foreach ($children as $child) {
                if (is_array($child) && ($child['_type'] ?? '') === 'span') {
                    $parts[] = (string) ($child['text'] ?? '');
                }
            }
            $title = implode('', $parts);
            if ($title !== '') {
                break;
            }
        }
        // §11.5: heading なしの場合は slug をタイトルとする
        if ($title === '') {
            $title = $slug;
        }

        // §11.4: excerpt — 先頭 120文字、HTML タグ除去済み
        $plainText = extractTextFromPT($body);
        $excerpt = mb_substr($plainText, 0, 120);

        $index[] = [
            'slug'       => $slug,
            'title'      => $title,
            'excerpt'    => $excerpt,
            'type'       => $type,
            'updated_at' => $updatedAt,
        ];
    }

    $json = json_encode($index, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        error_log('Adlaire: Failed to encode search index JSON: ' . json_last_error_msg());
        return;
    }
    if (file_put_contents($distDir . '/search-index.json', $json) === false) {
        error_log('Adlaire: Failed to write search-index.json');
        return;
    }
    @chmod($distDir . '/search-index.json', GENERATOR_FILE_PERMISSION);
}

/**
 * Generate a full HTML page using the theme structure.
 * @param array<string, mixed> $meta Optional post metadata (type, posted_at, category, tags, author, prevPost, nextPost).
 */
function generatePageHtml(App $app, string $slug, string $contentHtml, string $theme, array $meta = []): string
{
    $c = $app->config;
    $title = esc((string) ($c['title'] ?? ''));
    $pageTitle = esc(str_replace('-', ' ', $slug));
    $desc = esc((string) ($c['description'] ?? ''));
    $keywords = esc((string) ($c['keywords'] ?? ''));
    $lang = esc($app->language);
    $copyright = esc((string) ($c['copyright'] ?? ''));
    $credit = esc($app->credit);
    $safeTheme = esc($theme);

    $menuHtml = '<ul>';
    $menuRaw = $c['menu'] ?? '';
    $menu = str_replace("\r\n", "\n", is_string($menuRaw) ? $menuRaw : '');
    $items = explode("<br />\n", $menu);
    foreach ($items as $item) {
        $item = trim(strip_tags($item));
        if ($item === '') {
            continue;
        }
        $itemSlug = App::getSlug($item);
        $active = ($slug === $itemSlug) ? ' id="active"' : '';
        $safeItemSlug = esc($itemSlug);
        $menuHtml .= "<li{$active}><a href=\"{$safeItemSlug}/\">" . esc($item) . "</a></li>";
    }
    $menuHtml .= '</ul>';

    $sidebarBody = $app->getSidebarBody();
    $sideContent = '';
    if ($sidebarBody !== []) {
        $sideContent = renderPortableTextToHtml($sidebarBody);
    } else {
        $sideContent = esc((string) ($c['subside'] ?? ''));
    }

    // Build post navigation HTML (prev/next) for post type pages
    $postNavHtml = '';
    $prevPost = is_array($meta['prevPost'] ?? null) ? $meta['prevPost'] : null;
    $nextPost = is_array($meta['nextPost'] ?? null) ? $meta['nextPost'] : null;
    if ($prevPost !== null || $nextPost !== null) {
        $postNavHtml = '<nav class="post-nav">';
        if ($prevPost !== null) {
            $prevSlug = esc((string) ($prevPost['slug'] ?? ''));
            $prevTitle = esc((string) ($prevPost['title'] ?? ''));
            $postNavHtml .= "<a class=\"post-nav__prev\" href=\"{$prevSlug}/\">&#8592; {$prevTitle}</a>";
        }
        if ($nextPost !== null) {
            $nextSlug = esc((string) ($nextPost['slug'] ?? ''));
            $nextTitle = esc((string) ($nextPost['title'] ?? ''));
            $postNavHtml .= "<a class=\"post-nav__next\" href=\"{$nextSlug}/\">{$nextTitle} &#8594;</a>";
        }
        $postNavHtml .= '</nav>';
    }

    return <<<HTML
    <!doctype html>
    <html lang="{$lang}">
    <head>
        <meta charset="utf-8">
        <base href="/">
        <title>{$title} - {$pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="themes/{$safeTheme}/style.css">
        <meta name="description" content="{$desc}">
        <meta name="keywords" content="{$keywords}">
        <meta name="generator" content="Adlaire Static CMS">
    </head>
    <body>
        <nav id="nav">
            <h1><a href="./">{$title}</a></h1>
            {$menuHtml}
            <div class="clear"></div>
        </nav>
        <div id="wrapper" class="border">
            <div class="pad">
                {$contentHtml}
                {$postNavHtml}
            </div>
        </div>
        <div id="side" class="border">
            <div class="pad">
                {$sideContent}
            </div>
        </div>
        <div class="clear"></div>
        <footer>
            <p>{$copyright} | {$credit}</p>
        </footer>
    </body>
    </html>
    HTML;
}

/**
 * Generate blog index HTML page listing all published posts.
 * @param array<string, array<string, mixed>> $posts Sorted newest-first
 */
function generateBlogIndexHtml(App $app, array $posts, string $theme): string
{
    $c = $app->config;
    $title = esc((string) ($c['title'] ?? ''));
    $desc = esc((string) ($c['description'] ?? ''));
    $keywords = esc((string) ($c['keywords'] ?? ''));
    $lang = esc($app->language);
    $copyright = esc((string) ($c['copyright'] ?? ''));
    $credit = esc($app->credit);
    $safeTheme = esc($theme);

    $menuHtml = '<ul>';
    $menuRaw = $c['menu'] ?? '';
    $menu = str_replace("\r\n", "\n", is_string($menuRaw) ? $menuRaw : '');
    $items = explode("<br />\n", $menu);
    foreach ($items as $item) {
        $item = trim(strip_tags($item));
        if ($item === '') {
            continue;
        }
        $itemSlug = App::getSlug($item);
        $safeItemSlug = esc($itemSlug);
        $menuHtml .= "<li><a href=\"{$safeItemSlug}/\">" . esc($item) . "</a></li>";
    }
    $menuHtml .= '</ul>';

    $listHtml = '<ul class="blog-list">';
    foreach ($posts as $slug => $data) {
        $safeSlug = esc($slug);
        $ptBody = is_array($data['body'] ?? null) ? $data['body'] : [];
        $rawTitle = '';
        foreach ($ptBody as $node) {
            if (!is_array($node) || ($node['_type'] ?? '') !== 'block') {
                continue;
            }
            $children = is_array($node['children'] ?? null) ? $node['children'] : [];
            $text = implode('', array_map(fn(mixed $c): string => is_array($c) ? (string) ($c['text'] ?? '') : '', $children));
            if ($text !== '') {
                $rawTitle = $text;
                break;
            }
        }
        $postTitle = esc($rawTitle !== '' ? $rawTitle : str_replace('-', ' ', $slug));
        $postedAt = is_string($data['posted_at'] ?? null) && $data['posted_at'] !== '' ? $data['posted_at'] : ($data['updated_at'] ?? '');
        $dateStr = (is_string($postedAt) && strlen($postedAt) >= 10) ? esc(substr($postedAt, 0, 10)) : '';
        $category = is_string($data['category'] ?? null) ? esc($data['category']) : '';
        $author = is_string($data['author'] ?? null) ? esc($data['author']) : '';
        $listHtml .= "<li class=\"blog-list__item\">";
        $listHtml .= "<a href=\"{$safeSlug}/\" class=\"blog-list__title\">{$postTitle}</a>";
        $listHtml .= "<span class=\"blog-list__meta\">";
        if ($dateStr !== '') {
            $listHtml .= "<time datetime=\"{$dateStr}\">{$dateStr}</time>";
        }
        if ($category !== '') {
            $listHtml .= " <span class=\"blog-list__category\">{$category}</span>";
        }
        if ($author !== '') {
            $listHtml .= " <span class=\"blog-list__author\">{$author}</span>";
        }
        $listHtml .= "</span>";
        $listHtml .= "</li>";
    }
    $listHtml .= '</ul>';

    $blogTitle = esc($app->t('blog_title'));

    return <<<HTML
    <!doctype html>
    <html lang="{$lang}">
    <head>
        <meta charset="utf-8">
        <base href="/">
        <title>{$title} - {$blogTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="themes/{$safeTheme}/style.css">
        <meta name="description" content="{$desc}">
        <meta name="keywords" content="{$keywords}">
        <meta name="generator" content="Adlaire Static CMS">
    </head>
    <body>
        <nav id="nav">
            <h1><a href="./">{$title}</a></h1>
            {$menuHtml}
            <div class="clear"></div>
        </nav>
        <div id="wrapper" class="border">
            <div class="pad">
                <h1>{$blogTitle}</h1>
                {$listHtml}
            </div>
        </div>
        <div class="clear"></div>
        <footer>
            <p>{$copyright} | {$credit}</p>
        </footer>
    </body>
    </html>
    HTML;
}

/**
 * Generate a single archive page HTML (category, tag, or date).
 * @param array<string, array<string, mixed>> $posts Filtered posts for this archive
 */
function generateArchiveHtml(App $app, array $posts, string $theme, string $archiveType, string $archiveLabel): string
{
    $c = $app->config;
    $title = esc((string) ($c['title'] ?? ''));
    $desc = esc((string) ($c['description'] ?? ''));
    $keywords = esc((string) ($c['keywords'] ?? ''));
    $lang = esc($app->language);
    $copyright = esc((string) ($c['copyright'] ?? ''));
    $credit = esc($app->credit);
    $safeTheme = esc($theme);
    $safeArchiveLabel = esc($archiveLabel);
    $blogTitle = esc($app->t('blog_title'));

    $menuHtml = '<ul>';
    $menuRaw = $c['menu'] ?? '';
    $menu = str_replace("\r\n", "\n", is_string($menuRaw) ? $menuRaw : '');
    $items = explode("<br />\n", $menu);
    foreach ($items as $item) {
        $item = trim(strip_tags($item));
        if ($item === '') {
            continue;
        }
        $itemSlug = App::getSlug($item);
        $safeItemSlug = esc($itemSlug);
        $menuHtml .= "<li><a href=\"{$safeItemSlug}/\">" . esc($item) . "</a></li>";
    }
    $menuHtml .= '</ul>';

    $listHtml = '<ul class="blog-list">';
    foreach ($posts as $slug => $data) {
        $safeSlug = esc($slug);
        $ptBody = is_array($data['body'] ?? null) ? $data['body'] : [];
        $rawTitle = '';
        foreach ($ptBody as $node) {
            if (!is_array($node) || ($node['_type'] ?? '') !== 'block') {
                continue;
            }
            $children = is_array($node['children'] ?? null) ? $node['children'] : [];
            $text = implode('', array_map(fn(mixed $child): string => is_array($child) ? (string) ($child['text'] ?? '') : '', $children));
            if ($text !== '') {
                $rawTitle = $text;
                break;
            }
        }
        $postTitle = esc($rawTitle !== '' ? $rawTitle : str_replace('-', ' ', $slug));
        $postedAt = is_string($data['posted_at'] ?? null) && $data['posted_at'] !== '' ? $data['posted_at'] : ($data['updated_at'] ?? '');
        $dateStr = (is_string($postedAt) && strlen($postedAt) >= 10) ? esc(substr($postedAt, 0, 10)) : '';
        $category = is_string($data['category'] ?? null) ? esc($data['category']) : '';
        $listHtml .= "<li class=\"blog-list__item\">";
        $listHtml .= "<a href=\"{$safeSlug}/\" class=\"blog-list__title\">{$postTitle}</a>";
        $listHtml .= "<span class=\"blog-list__meta\">";
        if ($dateStr !== '') {
            $listHtml .= "<time datetime=\"{$dateStr}\">{$dateStr}</time>";
        }
        if ($category !== '' && $archiveType !== 'category') {
            $listHtml .= " <span class=\"blog-list__category\">{$category}</span>";
        }
        $listHtml .= "</span>";
        $listHtml .= "</li>";
    }
    $listHtml .= '</ul>';

    return <<<HTML
    <!doctype html>
    <html lang="{$lang}">
    <head>
        <meta charset="utf-8">
        <base href="/">
        <title>{$title} - {$blogTitle} - {$safeArchiveLabel}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="themes/{$safeTheme}/style.css">
        <meta name="description" content="{$desc}">
        <meta name="keywords" content="{$keywords}">
        <meta name="generator" content="Adlaire Static CMS">
    </head>
    <body>
        <nav id="nav">
            <h1><a href="./">{$title}</a></h1>
            {$menuHtml}
            <div class="clear"></div>
        </nav>
        <div id="wrapper" class="border">
            <div class="pad">
                <h1><a href="blog/">{$blogTitle}</a></h1>
                <h2>{$safeArchiveLabel}</h2>
                {$listHtml}
            </div>
        </div>
        <div class="clear"></div>
        <footer>
            <p>{$copyright} | {$credit}</p>
        </footer>
    </body>
    </html>
    HTML;
}

/**
 * Generate category, tag, and date archive pages into dist/blog/.
 * @param array<string, array<string, mixed>> $posts Sorted newest-first published posts
 */
function generateArchivePages(App $app, array $posts, string $distDir, string $theme): void
{
    if ($posts === []) {
        return;
    }

    /** @var array<string, array<string, array<string, mixed>>> $byCategory */
    $byCategory = [];
    /** @var array<string, array<string, array<string, mixed>>> $byTag */
    $byTag = [];
    /** @var array<string, array<string, array<string, mixed>>> $byDate */
    $byDate = [];

    foreach ($posts as $slug => $data) {
        // Group by category
        $cat = is_string($data['category'] ?? null) ? trim($data['category']) : '';
        if ($cat !== '') {
            $byCategory[$cat][$slug] = $data;
        }

        // Group by tag
        $tags = is_array($data['tags'] ?? null) ? $data['tags'] : [];
        foreach ($tags as $tag) {
            if (is_string($tag) && trim($tag) !== '') {
                $byTag[trim($tag)][$slug] = $data;
            }
        }

        // Group by year/month from posted_at
        $postedAt = is_string($data['posted_at'] ?? null) ? $data['posted_at'] : '';
        if ($postedAt !== '' && strlen($postedAt) >= 7) {
            $year = substr($postedAt, 0, 4);
            $month = substr($postedAt, 5, 2);
            if (ctype_digit($year) && ctype_digit($month)) {
                $byDate[$year . '/' . $month][$slug] = $data;
            }
        }
    }

    $blogDir = $distDir . '/blog';

    // Category archives: dist/blog/category/{name}/index.html
    foreach ($byCategory as $cat => $catPosts) {
        $catEncoded = rawurlencode($cat);
        $catDir = $blogDir . '/category/' . $catEncoded;
        if (!is_dir($catDir) && !@mkdir($catDir, GENERATOR_DIR_PERMISSION, true) && !is_dir($catDir)) {
            error_log('Adlaire: Failed to create category archive directory: ' . $catDir);
            continue;
        }
        $html = generateArchiveHtml($app, $catPosts, $theme, 'category', $cat);
        if (file_put_contents($catDir . '/index.html', $html) !== false) {
            @chmod($catDir . '/index.html', GENERATOR_FILE_PERMISSION);
        }
    }

    // Tag archives: dist/blog/tag/{name}/index.html
    foreach ($byTag as $tag => $tagPosts) {
        $tagEncoded = rawurlencode($tag);
        $tagDir = $blogDir . '/tag/' . $tagEncoded;
        if (!is_dir($tagDir) && !@mkdir($tagDir, GENERATOR_DIR_PERMISSION, true) && !is_dir($tagDir)) {
            error_log('Adlaire: Failed to create tag archive directory: ' . $tagDir);
            continue;
        }
        $html = generateArchiveHtml($app, $tagPosts, $theme, 'tag', $tag);
        if (file_put_contents($tagDir . '/index.html', $html) !== false) {
            @chmod($tagDir . '/index.html', GENERATOR_FILE_PERMISSION);
        }
    }

    // Date archives: dist/blog/{year}/{month}/index.html
    foreach ($byDate as $dateKey => $datePosts) {
        [$year, $month] = explode('/', $dateKey, 2);
        $dateDir = $blogDir . '/' . $year . '/' . $month;
        if (!is_dir($dateDir) && !@mkdir($dateDir, GENERATOR_DIR_PERMISSION, true) && !is_dir($dateDir)) {
            error_log('Adlaire: Failed to create date archive directory: ' . $dateDir);
            continue;
        }
        $archiveLabel = $year . '年' . $month . '月';
        $html = generateArchiveHtml($app, $datePosts, $theme, 'date', $archiveLabel);
        if (file_put_contents($dateDir . '/index.html', $html) !== false) {
            @chmod($dateDir . '/index.html', GENERATOR_FILE_PERMISSION);
        }
    }
}
