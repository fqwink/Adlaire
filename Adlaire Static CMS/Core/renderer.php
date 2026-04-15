<?php
declare(strict_types=1);

/**
 * Adlaire Static CMS - Renderer
 *
 * Server-side rendering: Portable Text to HTML conversion.
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

/**
 * Extract plain text from a Portable Text body array (for search indexing).
 * @param list<array<string, mixed>> $body
 */
function extractTextFromPT(array $body): string
{
    $parts = [];
    foreach ($body as $node) {
        if (!is_array($node)) {
            continue;
        }
        $type = (string) ($node['_type'] ?? '');
        if ($type === 'block') {
            $children = is_array($node['children'] ?? null) ? $node['children'] : [];
            $texts = [];
            foreach ($children as $child) {
                if (is_array($child) && ($child['_type'] ?? '') === 'span') {
                    $texts[] = (string) ($child['text'] ?? '');
                }
            }
            if ($texts !== []) {
                $parts[] = implode('', $texts);
            }
        } elseif ($type === 'code') {
            $code = (string) ($node['code'] ?? '');
            if ($code !== '') {
                $parts[] = $code;
            }
        }
    }
    return implode(' ', $parts);
}

/**
 * Render Portable Text body to static HTML string (server-side).
 * @param list<array<string, mixed>> $body
 */
function renderPortableTextToHtml(array $body): string
{
    $html = '';
    $pendingListItems = [];
    $pendingListType = '';

    $flushList = function () use (&$pendingListItems, &$pendingListType, &$html): void {
        if ($pendingListItems === []) {
            return;
        }
        $tag = $pendingListType === 'number' ? 'ol' : 'ul';
        $html .= "<{$tag}>";
        foreach ($pendingListItems as $item) {
            $html .= '<li>' . $item . '</li>';
        }
        $html .= "</{$tag}>\n";
        $pendingListItems = [];
        $pendingListType = '';
    };

    foreach ($body as $node) {
        if (!is_array($node)) {
            continue;
        }
        $nodeType = (string) ($node['_type'] ?? '');

        if ($nodeType === 'block') {
            $style = (string) ($node['style'] ?? 'normal');
            $listItem = (string) ($node['listItem'] ?? '');
            $children = is_array($node['children'] ?? null) ? $node['children'] : [];
            $markDefs = is_array($node['markDefs'] ?? null) ? $node['markDefs'] : [];

            // Build a map of mark definitions by _key
            $markDefMap = [];
            foreach ($markDefs as $md) {
                if (is_array($md) && isset($md['_key'])) {
                    $markDefMap[(string) $md['_key']] = $md;
                }
            }

            // Render children (spans)
            $innerHtml = '';
            foreach ($children as $child) {
                if (!is_array($child) || ($child['_type'] ?? '') !== 'span') {
                    continue;
                }
                $text = esc((string) ($child['text'] ?? ''));
                $marks = is_array($child['marks'] ?? null) ? $child['marks'] : [];
                // Apply marks (strong, em, underline, code, link)
                foreach (array_reverse($marks) as $mark) {
                    $markStr = (string) $mark;
                    if ($markStr === 'strong') {
                        $text = '<strong>' . $text . '</strong>';
                    } elseif ($markStr === 'em') {
                        $text = '<em>' . $text . '</em>';
                    } elseif ($markStr === 'underline') {
                        $text = '<u>' . $text . '</u>';
                    } elseif ($markStr === 'code') {
                        $text = '<code>' . $text . '</code>';
                    } elseif (isset($markDefMap[$markStr])) {
                        $md = $markDefMap[$markStr];
                        if (($md['_type'] ?? '') === 'link') {
                            $href = (string) ($md['href'] ?? '');
                            $hrefDecoded = html_entity_decode($href, ENT_QUOTES, 'UTF-8');
                            $lower = strtolower(trim($hrefDecoded));
                            if ($href !== '' && !preg_match(RENDERER_DANGEROUS_SCHEME_PATTERN, $lower) && !preg_match(RENDERER_PROTOCOL_RELATIVE_PATTERN, $hrefDecoded)) {
                                $text = '<a href="' . esc($href) . '">' . $text . '</a>';
                            }
                        }
                    }
                }
                $innerHtml .= $text;
            }

            if ($listItem !== '') {
                // Accumulate list items
                if ($listItem !== $pendingListType && $pendingListItems !== []) {
                    $flushList();
                }
                $pendingListType = $listItem;
                $pendingListItems[] = $innerHtml;
                continue;
            }

            $flushList();

            $html .= match ($style) {
                'normal'     => '<p>' . $innerHtml . '</p>',
                'h1'         => '<h1>' . $innerHtml . '</h1>',
                'h2'         => '<h2>' . $innerHtml . '</h2>',
                'h3'         => '<h3>' . $innerHtml . '</h3>',
                'blockquote' => '<blockquote>' . $innerHtml . '</blockquote>',
                default      => '<p>' . $innerHtml . '</p>',
            };
            $html .= "\n";

        } elseif ($nodeType === 'code') {
            // R6-16: language 属性を class="language-xxx" として出力（シンタックスハイライト対応）
            $flushList();
            $code = (string) ($node['code'] ?? '');
            $lang = is_string($node['language'] ?? null) ? preg_replace('/[^a-zA-Z0-9+#._-]/', '', (string) ($node['language'] ?? '')) : '';
            $langClass = ($lang !== null && $lang !== '') ? ' class="language-' . esc($lang) . '"' : '';
            $html .= '<pre><code' . $langClass . '>' . esc($code) . '</code></pre>' . "\n";

        } elseif ($nodeType === 'delimiter') {
            $flushList();
            $html .= '<hr>' . "\n";

        } elseif ($nodeType === 'image') {
            $flushList();
            $url = (string) ($node['url'] ?? '');
            $decoded = html_entity_decode($url, ENT_QUOTES, 'UTF-8');
            $lower = strtolower(trim($decoded));
            if ($url !== '' && preg_match(RENDERER_IMAGE_URL_PATTERN, $url) && !preg_match(RENDERER_DANGEROUS_SCHEME_PATTERN, $lower) && !preg_match(RENDERER_PROTOCOL_RELATIVE_PATTERN, $decoded)) {
                $caption = (string) ($node['caption'] ?? '');
                $html .= '<figure><img src="' . esc($url) . '" alt="' . esc($caption) . '" loading="lazy">';
                if ($caption !== '') {
                    $html .= '<figcaption>' . esc($caption) . '</figcaption>';
                }
                $html .= '</figure>' . "\n";
            }

        } elseif ($nodeType === 'table') {
            // Ver.3.5: テーブルブロック（EDITOR_RULEBOOK.md §14.1）
            $flushList();
            $withHeadings = ($node['withHeadings'] ?? false) === true;
            $content = is_array($node['content'] ?? null) ? $node['content'] : [];
            $html .= '<table class="ce-table">' . "\n";
            $rowStart = 0;
            if ($withHeadings && isset($content[0]) && is_array($content[0])) {
                $html .= '<thead><tr>';
                foreach ($content[0] as $cell) {
                    $html .= '<th>' . esc((string) $cell) . '</th>';
                }
                $html .= '</tr></thead>' . "\n";
                $rowStart = 1;
            }
            $html .= '<tbody>' . "\n";
            for ($i = $rowStart; $i < count($content); $i++) {
                if (!is_array($content[$i])) {
                    continue;
                }
                $html .= '<tr>';
                foreach ($content[$i] as $cell) {
                    $html .= '<td>' . esc((string) $cell) . '</td>';
                }
                $html .= '</tr>' . "\n";
            }
            $html .= '</tbody></table>' . "\n";

        } elseif ($nodeType === 'accordion') {
            // Ver.3.5: アコーディオンブロック（EDITOR_RULEBOOK.md §14.2）
            // R6-1: accordion content をサーバー側で strip_tags によるサニタイズ実施（XSS 防止）
            $flushList();
            $title = esc((string) ($node['title'] ?? ''));
            $raw = (string) ($node['content'] ?? '');
            // 許可する安全なブロックレベル・インラインタグのみ残す（スクリプト・イベント属性は除去）
            $allowedTags = '<p><br><strong><em><u><a><ul><ol><li><code><pre><blockquote>';
            $content = strip_tags($raw, $allowedTags);
            $html .= '<details class="ce-accordion">'
                . '<summary class="ce-accordion__title">' . $title . '</summary>'
                . '<div class="ce-accordion__content">' . $content . '</div>'
                . '</details>' . "\n";
        }
    }

    $flushList();
    return $html;
}

