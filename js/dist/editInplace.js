"use strict";
/**
 * EditInplace - Inline content editing for Adlaire Platform.
 *
 * Requires: autosize.ts, markdown.ts, editor.ts, i18n.ts, api.ts
 * Expects: global csrfToken, pageLang, pageFormat variables set by PHP.
 */
let changing = false;
let activeEditor = null;
function nl2br(s) {
    return s.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
}
function fieldSave(key, val) {
    const body = new URLSearchParams();
    body.append('fieldname', key);
    body.append('content', val);
    body.append('csrf', csrfToken);
    fetch('index.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    })
        .then(response => response.text())
        .then(data => {
        if (key === 'themeSelect' || key === 'language') {
            location.reload();
            return;
        }
        const el = document.getElementById(key);
        if (!el) {
            changing = false;
            return;
        }
        if (val === '') {
            el.innerHTML = el.getAttribute('title') || '';
        }
        else {
            el.innerHTML = data;
        }
        changing = false;
    })
        .catch(() => {
        changing = false;
    });
}
function plainTextEdit(span) {
    const id = span.id;
    const title = span.getAttribute('title');
    const titleAttr = title ? `"${title}" ` : '';
    const isMarkdown = span.dataset.format === 'markdown';
    const content = isMarkdown
        ? span.innerHTML
        : span.innerHTML.replace(/<br\s*\/?>/gi, '');
    const textarea = document.createElement('textarea');
    textarea.name = 'textarea';
    textarea.id = id + '_field';
    textarea.setAttribute('title', titleAttr);
    textarea.value = content;
    let saved = false;
    textarea.addEventListener('blur', () => {
        if (saved)
            return;
        saved = true;
        if (isMarkdown) {
            fieldSave(id, textarea.value);
        }
        else {
            fieldSave(id, nl2br(textarea.value));
        }
    });
    span.textContent = '';
    span.appendChild(textarea);
    textarea.focus();
    autosize(textarea);
}
function richTextHook(span) {
    plainTextEdit(span);
}
function renderMarkdownContent() {
    document.querySelectorAll('.markdown-content').forEach(el => {
        const b64 = el.dataset.rawB64;
        const raw = b64 ? atob(b64) : (el.textContent || '');
        el.innerHTML = markdownToHtml(raw);
    });
}
function renderBlocksContent() {
    document.querySelectorAll('.blocks-content').forEach(el => {
        const blocksJson = el.dataset.blocks;
        if (!blocksJson)
            return;
        try {
            const blocks = JSON.parse(blocksJson);
            el.innerHTML = renderBlocks(blocks);
        }
        catch {
            // Leave content as-is on parse failure
        }
    });
}
function initBlockEditor() {
    document.querySelectorAll('.ce-editor-wrapper').forEach(wrapper => {
        const blocksJson = wrapper.dataset.blocks;
        let blocks = [];
        if (blocksJson) {
            try {
                blocks = JSON.parse(blocksJson);
            }
            catch { /* empty */ }
        }
        const editorData = {
            time: Date.now(),
            version: '1.0',
            blocks: blocks.length > 0 ? blocks : [{ type: 'paragraph', data: { text: '' } }],
        };
        activeEditor = Editor.create(wrapper, { data: editorData });
        // Auto-save on focusout from the editor
        wrapper.addEventListener('focusout', (e) => {
            const related = e.relatedTarget;
            // Only save if focus leaves the editor entirely
            if (related && wrapper.contains(related))
                return;
            if (!activeEditor)
                return;
            const saved = activeEditor.save();
            const slug = wrapper.id;
            if (!slug)
                return;
            api.savePage(slug, JSON.stringify(saved.blocks), 'blocks').catch(() => {
                // Silent fail - will retry on next focusout
            });
        });
    });
}
function initEditInplace() {
    // Render content for visitors
    renderMarkdownContent();
    renderBlocksContent();
    // Initialize block editor for admin
    initBlockEditor();
    // Editable text spans (non-blocks)
    document.querySelectorAll('span.editText').forEach(span => {
        span.addEventListener('click', () => {
            if (changing)
                return;
            changing = true;
            if (span.classList.contains('richText')) {
                richTextHook(span);
            }
            else {
                plainTextEdit(span);
            }
        });
    });
    // Toggle sections
    document.querySelectorAll('.toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            document.querySelectorAll('.hide').forEach(el => {
                if (el.style.display === 'none' || el.style.display === '') {
                    el.style.display = 'block';
                }
                else {
                    el.style.display = 'none';
                }
            });
        });
    });
}
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditInplace);
}
else {
    initEditInplace();
}
