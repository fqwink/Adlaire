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
    $force = ($_POST['force'] ?? $_REQUEST['force'] ?? '') === 'true';
    $buildStateFile = $distDir . '/.build_state.json';
    $lastBuildTime = '';

    // Read previous build state for diff build
    if (!$force && file_exists($buildStateFile)) {
        $state = json_decode((string) file_get_contents($buildStateFile), true);
        $lastBuildTime = is_array($state) ? ($state['built_at'] ?? '') : '';
    }

    // Full rebuild: clean dist directory
    if ($force || $lastBuildTime === '') {
        if (is_dir($distDir)) {
            $files = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($distDir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($files as $file) {
                $path = $file->getPathname();
                if (is_link($path)) {
                    unlink($path);
                } elseif ($file->isDir()) {
                    rmdir($file->getRealPath());
                } else {
                    unlink($file->getRealPath());
                }
            }
        }
    }
    if (!is_dir($distDir)) {
        mkdir($distDir, 0755, true);
    }

    $pages = $storage->listPublishedPages();
    $theme = basename($app->config['themeSelect']);
    $themePath = dirname(__DIR__) . '/themes/' . $theme;
    $count = 0;
    $skipped = 0;
    $failed = 0;
    $details = [];
    $startTime = hrtime(true);

    // Copy theme CSS (prefer minimal.css for static output)
    $cssDir = $distDir . '/themes/' . $theme;
    if (!is_dir($cssDir)) {
        mkdir($cssDir, 0755, true);
    }
    $cssSource = is_file($themePath . '/minimal.css') ? '/minimal.css' : '/style.css';
    if (is_file($themePath . $cssSource)) {
        if (!copy($themePath . $cssSource, $cssDir . '/style.css')) {
            error_log('Adlaire: Failed to copy theme CSS');
        }
    }

    // Copy JS
    $jsSrc = dirname(__DIR__) . '/js';
    $jsDst = $distDir . '/js';
    if (is_dir($jsSrc)) {
        if (!is_dir($jsDst)) {
            mkdir($jsDst, 0755, true);
        }
        $jsFiles = glob($jsSrc . '/*.js');
        if (is_array($jsFiles)) {
            foreach ($jsFiles as $jsFile) {
                if (!copy($jsFile, $jsDst . '/' . basename($jsFile))) {
                    error_log('Adlaire: Failed to copy JS file: ' . basename($jsFile));
                }
            }
        }
    }

    // Copy translation files
    $langSrc = dirname(__DIR__) . '/data/lang';
    $langDst = $distDir . '/data/lang';
    if (is_dir($langSrc)) {
        if (!is_dir($langDst)) {
            mkdir($langDst, 0755, true);
        }
        $langFiles = glob($langSrc . '/*.json');
        if (is_array($langFiles)) {
            foreach ($langFiles as $langFile) {
                if (!copy($langFile, $langDst . '/' . basename($langFile))) {
                    error_log('Adlaire: Failed to copy lang file: ' . basename($langFile));
                }
            }
        }
    }

    // Generate each page (diff build: skip unchanged pages)
    foreach ($pages as $slug => $data) {
        $updatedTime = strtotime($data['updated_at'] ?? '');
        $buildTime = strtotime($lastBuildTime);
        if ($lastBuildTime !== '' && $updatedTime !== false && $buildTime !== false && $updatedTime <= $buildTime) {
            $skipped++;
            $details[] = ['slug' => $slug, 'result' => 'skipped'];
            continue;
        }
        $format = $data['format'] ?? 'blocks';
        $contentHtml = '';

        if ($format === 'blocks' && isset($data['blocks'])) {
            $contentHtml = renderBlocksToHtml($data['blocks']);
        } elseif ($format === 'markdown') {
            $contentHtml = renderMarkdownToHtml($data['content']);
        } else {
            $contentHtml = $data['content'] ?? '';
        }

        $pageHtml = generatePageHtml($app, $slug, $contentHtml, $theme);

        $writeFailed = false;
        if ($slug === 'home') {
            if (file_put_contents($distDir . '/index.html', $pageHtml) === false) {
                $writeFailed = true;
            }
        }
        $pageDir = $distDir . '/' . $slug;
        if (!is_dir($pageDir)) {
            mkdir($pageDir, 0755, true);
        }
        if (file_put_contents($pageDir . '/index.html', $pageHtml) === false) {
            $writeFailed = true;
        }

        if ($writeFailed) {
            $failed++;
            $details[] = ['slug' => $slug, 'result' => 'failed'];
        } else {
            $count++;
            $details[] = ['slug' => $slug, 'result' => 'generated'];
        }
    }

    // Generate sitemap.xml
    $isHttps = ($_SERVER['HTTPS'] ?? '') === 'on';
    $host = ($isHttps ? 'https' : 'http') . ':' . rtrim($app->host, '/');
    $basePath = '';
    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($pages as $slug => $data) {
        $loc = htmlspecialchars("{$host}{$basePath}/{$slug}", ENT_XML1, 'UTF-8');
        $lastmod = substr($data['updated_at'] ?? '', 0, 10);
        $xml .= "  <url><loc>{$loc}</loc><lastmod>{$lastmod}</lastmod></url>\n";
    }
    $xml .= '</urlset>';
    if (file_put_contents($distDir . '/sitemap.xml', $xml) === false) {
        apiError(500, 'Failed to write sitemap.xml');
        return;
    }

    // Save build state for diff builds
    $buildStateJson = json_encode([
        'built_at' => date('c'),
        'pages' => $count,
    ], JSON_PRETTY_PRINT);
    if ($buildStateJson === false || file_put_contents($distDir . '/.build_state.json', $buildStateJson) === false) {
        apiError(500, 'Failed to write build state');
        return;
    }

    $buildTimeMs = (int) ((hrtime(true) - $startTime) / 1_000_000);
    $pagesTotal = count($pages);

    echo json_encode([
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
    $title = esc($c['title']);
    $pageTitle = esc($slug);
    $desc = esc($c['description']);
    $keywords = esc($c['keywords']);
    $lang = esc($app->language);
    $copyright = esc((string) ($c['copyright'] ?? ''));
    $credit = esc($app->credit);

    // Build menu
    $menuHtml = '<ul>';
    $menu = str_replace("\r\n", "\n", $c['menu']);
    $items = explode("<br />\n", $menu);
    foreach ($items as $item) {
        $item = trim($item);
        if ($item === '') continue;
        $itemSlug = App::getSlug($item);
        $active = ($slug === $itemSlug) ? ' id="active"' : '';
        $safeItemSlug = esc($itemSlug);
        $menuHtml .= "<li{$active}><a href='{$safeItemSlug}/'>" . esc($item) . "</a></li>";
    }
    $menuHtml .= '</ul>';

    $sideContent = esc((string) ($c['subside'] ?? ''));

    return <<<HTML
    <!doctype html>
    <html lang="{$lang}">
    <head>
        <meta charset="utf-8">
        <title>{$title} - {$pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="themes/{$theme}/style.css">
        <meta name="description" content="{$desc}">
        <meta name="keywords" content="{$keywords}">
        <script src="js/markdown.js"></script>
        <script src="js/editInplace.js"></script>
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
