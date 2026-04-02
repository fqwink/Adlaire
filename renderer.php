<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - Renderer
 *
 * Server-side rendering: blocks-to-HTML and Markdown-to-HTML conversion.
 * Depends on: helpers.php
 *
 * @copyright Copyright (c) 2014 - 2026 IEAS Group
 * @copyright Copyright (c) 2014 - 2026 AIZM
 * @license Adlaire License
 */

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
            'list'      => (function() use ($d) { $t = (($d['style'] ?? '') === 'ordered') ? 'ol' : 'ul'; return "<{$t}>" . implode('', array_map(fn($i) => '<li>' . esc((string) $i) . '</li>', $d['items'] ?? [])) . "</{$t}>"; })(),
            'code'      => '<pre><code>' . esc((string) ($d['code'] ?? '')) . '</code></pre>',
            'quote'     => '<blockquote>' . esc((string) ($d['text'] ?? '')) . '</blockquote>',
            'delimiter' => '<hr>',
            'image'     => '<figure><img src="' . esc((string) ($d['url'] ?? '')) . '" alt="">' . (isset($d['caption']) && $d['caption'] !== '' ? '<figcaption>' . esc((string) $d['caption']) . '</figcaption>' : '') . '</figure>',
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

    // Code blocks
    $html = preg_replace_callback('/```(\w+)?\n([\s\S]*?)```/', function ($m) {
        $cls = $m[1] ? ' class="language-' . $m[1] . '"' : '';
        return '<pre><code' . $cls . '>' . trim($m[2]) . '</code></pre>';
    }, $html) ?? $html;

    $html = preg_replace('/`([^`]+)`/', '<code>$1</code>', $html) ?? $html;
    $html = preg_replace('/^### (.+)$/m', '<h3>$1</h3>', $html) ?? $html;
    $html = preg_replace('/^## (.+)$/m', '<h2>$1</h2>', $html) ?? $html;
    $html = preg_replace('/^# (.+)$/m', '<h1>$1</h1>', $html) ?? $html;
    $html = preg_replace('/^---$/m', '<hr>', $html) ?? $html;
    $html = preg_replace('/\*\*\*(.+?)\*\*\*/', '<strong><em>$1</em></strong>', $html) ?? $html;
    $html = preg_replace('/\*\*(.+?)\*\*/', '<strong>$1</strong>', $html) ?? $html;
    $html = preg_replace('/\*(.+?)\*/', '<em>$1</em>', $html) ?? $html;
    $html = preg_replace('/!\[([^\]]*)\]\(([^)]+)\)/', '<img src="$2" alt="$1">', $html) ?? $html;
    $html = preg_replace('/\[([^\]]+)\]\(([^)]+)\)/', '<a href="$2">$1</a>', $html) ?? $html;
    $html = preg_replace('/^\- (.+)$/m', '<li>$1</li>', $html) ?? $html;
    $html = preg_replace('/((?:<li>.*?<\/li>\n?)+)/', '<ul>$1</ul>', $html) ?? $html;
    $html = preg_replace('/^&gt; (.+)$/m', '<blockquote>$1</blockquote>', $html) ?? $html;
    $html = preg_replace('/^(?!<[a-z\/])(.*\S.*)$/m', '<p>$1</p>', $html) ?? $html;

    return $html;
}
