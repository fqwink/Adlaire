<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - Renderer
 *
 * Server-side rendering: blocks-to-HTML and Markdown-to-HTML conversion.
 * Depends on: helpers.php
 *
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group
 * @copyright Copyright (c) 2014 - 2026 倉田和宏
 * @license Adlaire License Ver.2.0 (Open Source - Platform Code)
 */

/** Allowed image URL pattern */
const IMAGE_URL_PATTERN = '#^(?:https?://[^\s<>"]+|/[a-zA-Z0-9_./-][^\s<>"]*|[a-zA-Z0-9_./-][^\s<>"]*)$#';

/** Dangerous URI scheme pattern */
const DANGEROUS_SCHEME_PATTERN = '/^\s*(javascript|vbscript|data)\s*:/i';

/**
 * Render blocks array to static HTML string (server-side).
 * @param array<int, array{type: string, data: array<string, mixed>}> $blocks
 */
function renderBlocksToHtml(array $blocks): string
{
    $html = '';
    foreach ($blocks as $block) {
        $d = $block['data'] ?? [];
        $html .= match ($block['type'] ?? '') {
            'paragraph' => '<p>' . esc((string) ($d['text'] ?? '')) . '</p>',
            'heading'   => (function() use ($d) { $l = max(1, min(3, (int) ($d['level'] ?? 2))); return "<h{$l}>" . esc((string) ($d['text'] ?? '')) . "</h{$l}>"; })(),
            'list'      => (function() use ($d) { $t = (($d['style'] ?? '') === 'ordered') ? 'ol' : 'ul'; $items = is_array($d['items'] ?? null) ? $d['items'] : []; return "<{$t}>" . implode('', array_map(fn($i) => '<li>' . esc((string) $i) . '</li>', $items)) . "</{$t}>"; })(),
            'code'      => '<pre><code>' . esc((string) ($d['code'] ?? '')) . '</code></pre>',
            'quote'     => '<blockquote>' . esc((string) ($d['text'] ?? '')) . '</blockquote>',
            'delimiter' => '<hr>',
            'image'     => (function() use ($d) { $url = (string) ($d['url'] ?? ''); $decoded = html_entity_decode($url, ENT_QUOTES, 'UTF-8'); $lower = strtolower(trim($decoded)); if ($url === '' || !preg_match(IMAGE_URL_PATTERN, $url) || preg_match(DANGEROUS_SCHEME_PATTERN, $lower)) { $url = ''; } return '<figure><img src="' . esc($url) . '" alt="' . esc((string) ($d['caption'] ?? '')) . '" loading="lazy">' . (isset($d['caption']) && $d['caption'] !== '' ? '<figcaption>' . esc((string) $d['caption']) . '</figcaption>' : '') . '</figure>'; })(),
            default     => '',
        };
        $html .= "\n";
    }
    return $html;
}

/**
 * Server-side Markdown to HTML conversion for static generation.
 */
function renderMarkdownToHtml(string $md): string
{
    $html = htmlspecialchars($md, ENT_QUOTES, 'UTF-8');

    $html = preg_replace_callback('/```(\w+)?\n([\s\S]*?)```/', function ($m) {
        $cls = $m[1] ? ' class="language-' . esc($m[1]) . '"' : '';
        $code = htmlspecialchars(htmlspecialchars_decode(trim($m[2]), ENT_QUOTES), ENT_QUOTES, 'UTF-8');
        return '<pre><code' . $cls . '>' . $code . '</code></pre>';
    }, $html) ?? $html;

    $html = preg_replace('/`([^`]+)`/', '<code>$1</code>', $html) ?? $html;
    $html = preg_replace('/^### (.+)$/m', '<h3>$1</h3>', $html) ?? $html;
    $html = preg_replace('/^## (.+)$/m', '<h2>$1</h2>', $html) ?? $html;
    $html = preg_replace('/^# (.+)$/m', '<h1>$1</h1>', $html) ?? $html;
    $html = preg_replace('/^---$/m', '<hr>', $html) ?? $html;
    $html = preg_replace('/\*\*\*(.+?)\*\*\*/', '<strong><em>$1</em></strong>', $html) ?? $html;
    $html = preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $html) ?? $html;
    $html = preg_replace('/\*(.+?)\*/', '<em>$1</em>', $html) ?? $html;
    $html = preg_replace_callback('/!\[([^\]]*)\]\(([^)]+)\)/', function ($m) {
        $url = html_entity_decode($m[2], ENT_QUOTES, 'UTF-8');
        $urlDouble = html_entity_decode($url, ENT_QUOTES, 'UTF-8');
        $lower = strtolower(trim($urlDouble));
        if (preg_match(DANGEROUS_SCHEME_PATTERN, $lower)) { return esc($m[0]); }
        return '<img src="' . esc($url) . '" alt="' . esc($m[1]) . '" loading="lazy">';
    }, $html) ?? $html;
    $html = preg_replace_callback('/\[([^\]]+)\]\(([^)]+)\)/', function ($m) {
        $url = html_entity_decode($m[2], ENT_QUOTES, 'UTF-8');
        $urlDouble = html_entity_decode($url, ENT_QUOTES, 'UTF-8');
        $lower = strtolower(trim($urlDouble));
        if (preg_match(DANGEROUS_SCHEME_PATTERN, $lower)) { return esc($m[0]); }
        return '<a href="' . esc($url) . '">' . $m[1] . '</a>';
    }, $html) ?? $html;
    $html = preg_replace('/^\- (.+)$/m', '<li>$1</li>', $html) ?? $html;
    $html = preg_replace('/((?:<li>.*?<\/li>\n?)+)/', '<ul>$1</ul>', $html) ?? $html;
    $html = preg_replace('/^&gt; (.+)$/m', '<blockquote>$1</blockquote>', $html) ?? $html;
    $html = preg_replace('/^(?!<[a-z\/])(.*\S.*)$/m', '<p>$1</p>', $html) ?? $html;

    if (preg_last_error() !== PREG_NO_ERROR) {
        return htmlspecialchars($md, ENT_QUOTES, 'UTF-8');
    }

    return $html;
}
