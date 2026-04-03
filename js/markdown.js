"use strict";
/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
 * Markdown - Lightweight Markdown to HTML converter.
 * Supports: headings, bold, italic, code blocks (with language), inline code,
 * links, images, tables, task lists, unordered/ordered lists, blockquotes,
 * horizontal rules, footnotes, paragraphs.
 *
 * Spec: RULEBOOK.md Section 6.5
 */
// #51: regex再コンパイル最適化 — 非グローバルな共通パターンを事前コンパイル
const _mdSepTest = /^\|[\s\-:|]+\|$/;
const _mdDangerousProto = /^\s*(javascript|data|vbscript)\s*:/i;
const _mdSafeIdStrip = /[^a-zA-Z0-9_-]/g;
function markdownToHtml(md) {
    let html = md;
    // --- Extract fenced code blocks BEFORE escaping (preserve raw content) ---
    const codeBlocks = [];
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
        const escaped = code.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // #50: langをescHtml()でエスケープ
        const escapeLang = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        // #46: code block language validation強化 — 英数字・ハイフン・プラスのみ許可
        // Ver.2.9 TS#44: コードブロック空言語 — lang が空文字列・undefinedの場合を安全に処理
        let cls = '';
        if (lang && typeof lang === 'string' && lang.trim() !== '' && /^[a-zA-Z0-9+#._-]+$/.test(lang)) {
            cls = ` class="language-${escapeLang(lang)}"`;
        }
        codeBlocks.push(`<pre><code${cls}>${escaped}</code></pre>`);
        return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
    });
    // Escape HTML entities (after code blocks are extracted)
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Inline code (skip placeholder patterns) — #25: 複数行対応（[\s\S]で改行を含む）
    html = html.replace(/`([^`]+?)`/g, (m, code) => {
        if (m.includes('%%CODEBLOCK_'))
            return m;
        return `<code>${code}</code>`;
    });
    // #8: 属性値エスケープヘルパー
    const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    // --- Footnote definitions: [^id]: text → collect and remove ---
    const footnotes = {};
    // #63: safeId重複保証 — 重複時にサフィックスを付与
    const footnoteIdSet = new Set();
    // Ver.2.9 TS#34: 脚注複数行対応 — 定義行と後続インデント行を結合
    html = html.replace(/^\[\^(\w+)\]:\s*(.+(?:\n  .+)*)$/gm, (_m, id, text) => {
        // Ver.2.9 #5: footnote IDのダブルエスケープ修正 — _mdSafeIdStrip後はescAttr不要
        // _mdSafeIdStrip(/[^a-zA-Z0-9_-]/g)で既に安全な文字のみ残るため、escAttrは不適用
        let safeId = id.replace(_mdSafeIdStrip, '');
        // #63: 重複IDの場合はサフィックスで一意化
        let uniqueId = safeId;
        let counter = 2;
        while (footnoteIdSet.has(uniqueId)) {
            uniqueId = `${safeId}-${counter}`;
            counter++;
        }
        safeId = uniqueId;
        footnoteIdSet.add(safeId);
        // Ver.2.9 TS#34: 複数行のテキストを結合（先頭2スペースインデントを除去）
        const mergedText = text.replace(/\n  /g, ' ');
        // Ver.2.9 #5: footnoteテキストはHTML出力されるためescAttr適用
        footnotes[safeId] = escAttr(mergedText);
        return '';
    });
    // #121: Footnote references — ID別にカウンタを保持し、back-linkの参照先を正確化
    let fnRefCount = 0;
    const fnRefFirstById = {};
    html = html.replace(/\[\^(\w+)\]/g, (_m, id) => {
        // Ver.2.9 #5: footnote IDのダブルエスケープ修正 — _mdSafeIdStrip後はescAttr不要
        const safeId = id.replace(_mdSafeIdStrip, '');
        fnRefCount++;
        if (!(safeId in fnRefFirstById)) {
            fnRefFirstById[safeId] = fnRefCount;
        }
        // Ver.2.9 TS#5/TS#28: 脚注参照 — safeIdは_mdSafeIdStripで安全文字のみのためescAttr不要（ダブルエスケープ防止）
        return `<sup><a href="#fn-${safeId}" id="fnref-${safeId}-${fnRefCount}">${safeId}</a></sup>`;
    });
    // Headings (### > ## > #) — #22: 末尾の強調記号ネスト処理（#, =を除去）
    html = html.replace(/^### (.+?)[\s#]*$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+?)[\s#]*$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+?)[\s#]*$/gm, '<h1>$1</h1>');
    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr>');
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Images ![alt](url) — must come before links
    // Ver.2.9 #34: 正規表現改善 — URL内のスペースとタイトル属性対応
    html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_m, alt, url, title) => {
        if (_mdDangerousProto.test(url))
            return `<img src="" alt="${escAttr(alt)}">`;
        const titleAttr = title ? ` title="${escAttr(title)}"` : '';
        return `<img src="${escAttr(url)}" alt="${escAttr(alt)}"${titleAttr}>`;
    });
    // Links [text](url)
    // Ver.2.9 #34: 正規表現改善 — URL内のスペースとタイトル属性対応
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_m, text, url, title) => {
        if (_mdDangerousProto.test(url))
            return `<a href="">${text}</a>`;
        const titleAttr = title ? ` title="${escAttr(title)}"` : '';
        return `<a href="${escAttr(url)}"${titleAttr}>${text}</a>`;
    });
    // --- Tables ---
    html = html.replace(/((?:^\|.+\|$\n?)+)/gm, (tableBlock) => {
        const rows = tableBlock.trim().split('\n').filter(r => r.trim() !== '');
        if (rows.length < 2)
            return tableBlock;
        const parseRow = (row) => row.split('|').slice(1, -1).map(cell => cell.trim());
        const headerCells = parseRow(rows[0]);
        // Check if row 2 is separator (|---|---|) — #23: alignment情報保持
        const sep = rows[1];
        if (!_mdSepTest.test(sep))
            return tableBlock;
        const sepCols = sep.split('|').slice(1, -1);
        if (sepCols.length !== headerCells.length)
            return tableBlock;
        // #23: parse alignment from separator columns
        const alignments = sepCols.map(col => {
            const trimmed = col.trim();
            const left = trimmed.startsWith(':');
            const right = trimmed.endsWith(':');
            if (left && right)
                return 'center';
            if (right)
                return 'right';
            if (left)
                return 'left';
            return null;
        });
        let tableHtml = '<table><thead><tr>';
        // #10: Table内セル内容のHTMLエスケープ（二重エスケープ防止のため&amp;は除外）
        const escCell = (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        headerCells.forEach((cell, ci) => {
            // Ver.2.9 TS#20: テーブルalignment配列超過防止 — ci範囲チェック
            const align = (ci < alignments.length && alignments[ci]) ? ` style="text-align:${alignments[ci]}"` : '';
            tableHtml += `<th${align}>${escCell(cell)}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
        for (let i = 2; i < rows.length; i++) {
            if (rows[i].trim() === '')
                continue;
            const cells = parseRow(rows[i]);
            tableHtml += '<tr>';
            // Ver.2.9 #39: テーブルセル — ヘッダ列数に合わせてセル数を正規化
            const normalizedCells = cells.length > headerCells.length
                ? cells.slice(0, headerCells.length)
                : cells;
            normalizedCells.forEach((cell, ci) => {
                // Ver.2.9 TS#20: テーブルalignment配列超過防止
                const align = (ci < alignments.length && alignments[ci]) ? ` style="text-align:${alignments[ci]}"` : '';
                tableHtml += `<td${align}>${escCell(cell)}</td>`;
            });
            // Ver.2.9 #39: セル不足時は空セルで補完
            for (let ci = normalizedCells.length; ci < headerCells.length; ci++) {
                // Ver.2.9 TS#20: テーブルalignment配列超過防止
                const align = (ci < alignments.length && alignments[ci]) ? ` style="text-align:${alignments[ci]}"` : '';
                tableHtml += `<td${align}></td>`;
            }
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';
        return tableHtml;
    });
    // --- Task lists ---
    // - [x] done → checked checkbox, - [ ] todo → unchecked checkbox
    // #24: [X]大文字X対応 — フラグにi��追加
    // Ver.2.9 #25: タスクリスト — 行頭スペースを許容（インデント対応）
    html = html.replace(/^[\s]*\- \[x\] (.+)$/gim, '<li class="task done"><input type="checkbox" checked disabled> $1</li>');
    html = html.replace(/^[\s]*\- \[ \] (.+)$/gm, '<li class="task"><input type="checkbox" disabled> $1</li>');
    // Unordered list items (must come after task lists)
    html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
    // Ordered list items: 1. item
    html = html.replace(/^\d+\. (.+)$/gm, '<li class="ol">$1</li>');
    // Wrap consecutive <li> in <ul> or <ol>
    html = html.replace(/((?:<li class="ol">[\s\S]*?<\/li>\n?)+)/g, (m) => {
        return '<ol>' + m.replaceAll(' class="ol"', '') + '</ol>';
    });
    html = html.replace(/((?:<li[\s>][\s\S]*?<\/li>\n?)+)/g, (m) => {
        if (m.startsWith('<ol>'))
            return m;
        return '<ul>' + m + '</ul>';
    });
    // Blockquotes — merge consecutive lines into single block
    html = html.replace(/^&gt; (.+)$/gm, '%%BQ%%$1%%/BQ%%');
    html = html.replace(/((?:%%BQ%%.*%%\/BQ%%\n?)+)/g, (m) => {
        const content = m.replace(/%%\/?BQ%%/g, '').trim().replace(/\n/g, '<br>');
        return `<blockquote>${content}</blockquote>`;
    });
    // #120: Paragraphs — 空白のみの行を除外する条件を明確化
    html = html.replace(/^(?!<[a-z\/])(?!%%CODEBLOCK_)(.*\S.*)$/gm, '<p>$1</p>');
    // --- Footnote section ---
    const fnIds = Object.keys(footnotes);
    if (fnIds.length > 0) {
        html += '\n<section class="footnotes"><hr><ol>';
        fnIds.forEach(id => {
            // #8: footnote IDは既にescAttr済み、テキストもエスケープ
            // #121: back-linkは最初の参照IDを使用
            const firstRef = fnRefFirstById[id] ?? 1;
            html += `<li id="fn-${id}">${footnotes[id]} <a href="#fnref-${id}-${firstRef}">\u21A9</a></li>`;
        });
        html += '</ol></section>';
    }
    // Restore code blocks from placeholders
    // Ver.2.9 #44: コードブロック復元 — <p>ラップされたプレースホルダも処理
    codeBlocks.forEach((block, i) => {
        const placeholder = `%%CODEBLOCK_${i}%%`;
        // コードブロックが<p>でラップされている場合はラップを除去
        html = html.replace(`<p>${placeholder}</p>`, block);
        html = html.replace(placeholder, block);
    });
    // Clean up excessive newlines
    html = html.replace(/\n{2,}/g, '\n');
    return html.trim();
}
