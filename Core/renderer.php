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

/** Allowed image URL pattern (protocol-relative // is forbidden) */
const RENDERER_IMAGE_URL_PATTERN = '#^(?:https?://[^\s<>"]+|/[a-zA-Z0-9_./-][^\s<>"]*|[a-zA-Z0-9_./-][^\s<>"]*)$#';

/** Dangerous URI scheme pattern */
const RENDERER_DANGEROUS_SCHEME_PATTERN = '/^\s*(javascript|vbscript|data)\s*:/i';

/** Protocol-relative URL pattern */
const RENDERER_PROTOCOL_RELATIVE_PATTERN = '#^\s*//#';

/** Maximum heading level */
const RENDERER_MAX_HEADING_LEVEL = 3;

/** Minimum heading level */
const RENDERER_MIN_HEADING_LEVEL = 1;

/**
 * Render blocks array to static HTML string (server-side).
 * @param array<int, array{type: string, data: array<string, mixed>}> $blocks
 */
function renderBlocksToHtml(array $blocks): string
{
    $html = '';
    foreach ($blocks as $block) {
        if (!is_array($block)) {
            continue;
        }
        $type = (string) ($block['type'] ?? '');
        $d = is_array($block['data'] ?? null) ? $block['data'] : [];
        $html .= match ($type) {
            'paragraph' => '<p>' . esc((string) ($d['text'] ?? '')) . '</p>',
            'heading'   => (function() use ($d): string { $l = max(RENDERER_MIN_HEADING_LEVEL, min(RENDERER_MAX_HEADING_LEVEL, (int) ($d['level'] ?? 2))); return "<h{$l}>" . esc((string) ($d['text'] ?? '')) . "</h{$l}>"; })(),
            'list'      => (function() use ($d): string { $t = (($d['style'] ?? '') === 'ordered') ? 'ol' : 'ul'; $items = is_array($d['items'] ?? null) ? $d['items'] : []; return "<{$t}>" . implode('', array_map(fn(mixed $i): string => '<li>' . esc((string) $i) . '</li>', $items)) . "</{$t}>"; })(),
            'code'      => '<pre><code>' . esc((string) ($d['code'] ?? '')) . '</code></pre>',
            'quote'     => '<blockquote>' . esc((string) ($d['text'] ?? '')) . '</blockquote>',
            'delimiter' => '<hr>',
            'image'     => (function() use ($d): string { $url = (string) ($d['url'] ?? ''); $decoded = html_entity_decode($url, ENT_QUOTES, 'UTF-8'); $lower = strtolower(trim($decoded)); if ($url === '' || !preg_match(RENDERER_IMAGE_URL_PATTERN, $url) || preg_match(RENDERER_DANGEROUS_SCHEME_PATTERN, $lower) || preg_match(RENDERER_PROTOCOL_RELATIVE_PATTERN, $decoded)) { $url = ''; } $caption = (string) ($d['caption'] ?? ''); return '<figure><img src="' . esc($url) . '" alt="' . esc($caption) . '" loading="lazy">' . ($caption !== '' ? '<figcaption>' . esc($caption) . '</figcaption>' : '') . '</figure>'; })(),
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
    if ($md === '') {
        return '';
    }
    $md = preg_replace('/<script\b[^>]*>[\s\S]*?<\/script>/i', '', $md) ?? $md;
    $html = htmlspecialchars($md, ENT_QUOTES, 'UTF-8');

    $html = preg_replace_callback('/```(\w+)?\n([\s\S]*?)```/s', function ($m) {
        $cls = $m[1] ? ' class="language-' . esc($m[1]) . '"' : '';
        $code = htmlspecialchars(htmlspecialchars_decode(trim($m[2]), ENT_QUOTES), ENT_QUOTES, 'UTF-8');
        return '<pre><code' . $cls . '>' . $code . '</code></pre>';
    }, $html) ?? $html;

    $html = preg_replace('/`([^`]+)`/', '<code>$1</code>', $html) ?? $html;
    $html = preg_replace('/^### (.+)$/m', '<h3>$1</h3>', $html) ?? $html;
    $html = preg_replace('/^## (.+)$/m', '<h2>$1</h2>', $html) ?? $html;
    $html = preg_replace('/^# (.+)$/m', '<h1>$1</h1>', $html) ?? $html;
    $html = preg_replace('/^---$/m', '<hr>', $html) ?? $html;
    $html = preg_replace('/\*\*\*(.+?)\*\*\*/s', '<strong><em>$1</em></strong>', $html) ?? $html;
    $html = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $html) ?? $html;
    $html = preg_replace('/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/s', '<em>$1</em>', $html) ?? $html;
    $html = preg_replace_callback('/!\[([^\]]*)\]\(([^)]+)\)/', function ($m) {
        $url = html_entity_decode($m[2], ENT_QUOTES, 'UTF-8');
        $urlDouble = html_entity_decode($url, ENT_QUOTES, 'UTF-8');
        $lower = strtolower(trim($urlDouble));
        if (preg_match(RENDERER_DANGEROUS_SCHEME_PATTERN, $lower) || preg_match(RENDERER_PROTOCOL_RELATIVE_PATTERN, $urlDouble)) { return esc($m[0]); }
        return '<img src="' . esc($url) . '" alt="' . esc($m[1]) . '" loading="lazy">';
    }, $html) ?? $html;
    $html = preg_replace_callback('/\[([^\]]+)\]\(([^)]+)\)/', function ($m) {
        $url = html_entity_decode($m[2], ENT_QUOTES, 'UTF-8');
        $urlDouble = html_entity_decode($url, ENT_QUOTES, 'UTF-8');
        $lower = strtolower(trim($urlDouble));
        if (preg_match(RENDERER_DANGEROUS_SCHEME_PATTERN, $lower) || preg_match(RENDERER_PROTOCOL_RELATIVE_PATTERN, $urlDouble)) { return esc($m[0]); }
        return '<a href="' . esc($url) . '">' . esc($m[1]) . '</a>';
    }, $html) ?? $html;
    $html = preg_replace('/^\- (.+)$/m', '<li>$1</li>', $html) ?? $html;
    $html = preg_replace('/((?:<li>.*?<\/li>\n?)+)/', '<ul>$1</ul>', $html) ?? $html;
    $html = preg_replace('/^&gt; (.+)$/m', '<blockquote>$1</blockquote>', $html) ?? $html;
    $html = preg_replace('/^(?!<[a-z\/!])(.*\S.*)$/m', '<p>$1</p>', $html) ?? $html;

    if (preg_last_error() !== PREG_NO_ERROR) {
        return htmlspecialchars($md, ENT_QUOTES, 'UTF-8');
    }

    return $html;
}
