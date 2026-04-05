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
                if (is_link($path)) {
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
    $publicJs = ['markdown.js', 'editInplace.js'];
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
        $format = $data['format'] ?? 'blocks';
        $contentHtml = '';

        if ($format === 'blocks' && isset($data['blocks']) && is_array($data['blocks'])) {
            $contentHtml = renderBlocksToHtml($data['blocks']);
        } elseif ($format === 'markdown') {
            $contentHtml = renderMarkdownToHtml((string) ($data['content'] ?? ''));
        } else {
            $contentHtml = esc((string) ($data['content'] ?? ''));
        }

        $pageHtml = generatePageHtml($app, $slug, $contentHtml, $theme);

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
        if (!is_dir($pageDir) && !mkdir($pageDir, GENERATOR_DIR_PERMISSION, true) && !is_dir($pageDir)) {
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
    $xml .= '</urlset>';
    if (file_put_contents($distDir . '/sitemap.xml', $xml) === false) {
        apiError(500, 'Failed to write sitemap.xml');
        return;
    }
    @chmod($distDir . '/sitemap.xml', GENERATOR_FILE_PERMISSION);

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
 * Generate a full HTML page using the theme structure.
 */
function generatePageHtml(App $app, string $slug, string $contentHtml, string $theme): string
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

    $sidebarBlocks = $app->getSidebarBlocks();
    $sideContent = '';
    if ($sidebarBlocks !== []) {
        $sideContent = renderBlocksToHtml($sidebarBlocks);
    } else {
        $sideContent = esc((string) ($c['subside'] ?? ''));
    }

    return <<<HTML
    <!doctype html>
    <html lang="{$lang}">
    <head>
        <meta charset="utf-8">
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
