/**
 * Markdown - Lightweight Markdown to HTML converter.
 * Supports: headings, bold, italic, code blocks (with language), inline code,
 * links, images, tables, task lists, unordered/ordered lists, blockquotes,
 * horizontal rules, footnotes, paragraphs.
 *
 * Spec: RULEBOOK.md Section 6.5
 */

function markdownToHtml(md: string): string {
    let html = md;

    // Escape HTML entities
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // --- Fenced code blocks with optional language ---
    // ```language\ncode\n``` → <pre><code class="language-xxx">
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
        const cls = lang ? ` class="language-${lang}"` : '';
        return `<pre><code${cls}>${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // --- Footnote definitions: [^id]: text → collect and remove ---
    const footnotes: Record<string, string> = {};
    html = html.replace(/^\[\^(\w+)\]:\s*(.+)$/gm, (_m, id, text) => {
        footnotes[id] = text;
        return '';
    });

    // Footnote references: [^id] → superscript link
    html = html.replace(/\[\^(\w+)\]/g, (_m, id) => {
        return `<sup><a href="#fn-${id}" id="fnref-${id}">${id}</a></sup>`;
    });

    // Headings (### > ## > #)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Images ![alt](url) — must come before links
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // --- Tables ---
    html = html.replace(/((?:^\|.+\|$\n?)+)/gm, (tableBlock) => {
        const rows = tableBlock.trim().split('\n').filter(r => r.trim() !== '');
        if (rows.length < 2) return tableBlock;

        const parseRow = (row: string): string[] =>
            row.split('|').slice(1, -1).map(cell => cell.trim());

        const headerCells = parseRow(rows[0]);

        // Check if row 2 is separator (|---|---|)
        const sep = rows[1];
        if (!/^\|[\s\-:|]+\|$/.test(sep)) return tableBlock;

        let tableHtml = '<table><thead><tr>';
        headerCells.forEach(cell => { tableHtml += `<th>${cell}</th>`; });
        tableHtml += '</tr></thead><tbody>';

        for (let i = 2; i < rows.length; i++) {
            if (rows[i].trim() === '') continue;
            const cells = parseRow(rows[i]);
            tableHtml += '<tr>';
            cells.forEach(cell => { tableHtml += `<td>${cell}</td>`; });
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';
        return tableHtml;
    });

    // --- Task lists ---
    // - [x] done → checked checkbox, - [ ] todo → unchecked checkbox
    html = html.replace(/^\- \[x\] (.+)$/gm, '<li class="task done"><input type="checkbox" checked disabled> $1</li>');
    html = html.replace(/^\- \[ \] (.+)$/gm, '<li class="task"><input type="checkbox" disabled> $1</li>');

    // Unordered list items (must come after task lists)
    html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');

    // Ordered list items: 1. item
    html = html.replace(/^\d+\. (.+)$/gm, '<li class="ol">$1</li>');

    // Wrap consecutive <li> in <ul> or <ol>
    html = html.replace(/((?:<li class="ol">.*<\/li>\n?)+)/g, (m) => {
        return '<ol>' + m.replaceAll(' class="ol"', '') + '</ol>';
    });
    html = html.replace(/((?:<li[\s>].*<\/li>\n?)+)/g, (m) => {
        if (m.startsWith('<ol>')) return m;
        return '<ul>' + m + '</ul>';
    });

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Paragraphs: wrap remaining lines that aren't already HTML tags
    html = html.replace(/^(?!<[a-z\/])(.*\S.*)$/gm, '<p>$1</p>');

    // --- Footnote section ---
    const fnIds = Object.keys(footnotes);
    if (fnIds.length > 0) {
        html += '\n<section class="footnotes"><hr><ol>';
        fnIds.forEach(id => {
            html += `<li id="fn-${id}">${footnotes[id]} <a href="#fnref-${id}">↩</a></li>`;
        });
        html += '</ol></section>';
    }

    // Clean up excessive newlines
    html = html.replace(/\n{2,}/g, '\n');

    return html.trim();
}
