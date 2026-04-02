"use strict";
/**
 * EditInplace - Inline content editing for Adlaire Static CMS.
 *
 * Provides unified inplace editing for page formats:
 * - Blocks: block editor with auto-save on focusout (default)
 * - Markdown: click to edit in textarea (raw markdown)
 *
 * Also handles format switching via the format toolbar.
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
        .then(response => {
        if (!response.ok) {
            throw new Error(String(response.status));
        }
        // Update CSRF token from response header (one-time token)
        const newToken = response.headers.get('X-CSRF-Token');
        if (newToken) {
            window.csrfToken = newToken;
        }
        return response.text();
    })
        .then(data => {
        if (key === 'themeSelect' || key === 'language') {
            location.reload();
            return;
        }
        // Flash save feedback for settings fields
        showFieldFeedback(key, true);
        const el = document.getElementById(key);
        if (!el) {
            changing = false;
            return;
        }
        if (val === '') {
            el.textContent = el.getAttribute('title') || '';
        }
        else {
            el.textContent = data;
        }
        changing = false;
    })
        .catch(() => {
        changing = false;
        showFieldFeedback(key, false);
    });
}
function showFieldFeedback(key, success) {
    const el = document.querySelector(`[onchange*="fieldSave(\\"${key}\\""]`)
        || document.getElementById(key);
    if (!el)
        return;
    const orig = el.style.borderColor;
    el.style.borderColor = success ? '#0a0' : '#c00';
    setTimeout(() => { el.style.borderColor = orig; }, 1500);
}
// --- Text-based editing (Markdown and settings fields) ---
function plainTextEdit(span) {
    const id = span.id;
    const title = span.getAttribute('title');
    const titleAttr = title ? `"${title}" ` : '';
    const isMarkdown = span.dataset.format === 'markdown';
    const content = isMarkdown
        ? span.innerHTML
        : (span.textContent || '');
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
            // Settings fields (title, description, etc.)
            fieldSave(id, nl2br(textarea.value));
        }
    });
    span.textContent = '';
    span.appendChild(textarea);
    textarea.focus();
    if (typeof autosize === 'function') {
        autosize(textarea);
    }
}
function richTextHook(span) {
    plainTextEdit(span);
}
// --- Content rendering for visitors ---
function renderMarkdownContent() {
    document.querySelectorAll('.markdown-content').forEach(el => {
        const b64 = el.dataset.rawB64;
        const raw = b64 ? atob(b64) : (el.textContent || '');
        if (typeof markdownToHtml === 'function') {
            el.innerHTML = markdownToHtml(raw);
        }
    });
}
function renderBlocksContent() {
    document.querySelectorAll('.blocks-content').forEach(el => {
        let raw = el.dataset.blocks || '';
        const b64 = el.dataset.blocksB64;
        if (b64) {
            try {
                raw = atob(b64);
            }
            catch { /* empty */ }
        }
        if (!raw)
            return;
        try {
            const blocks = JSON.parse(raw);
            el.innerHTML = renderBlocks(blocks);
        }
        catch {
            // Leave content as-is on parse failure
        }
    });
}
// --- Block editor initialization ---
function initBlockEditor() {
    document.querySelectorAll('.ce-editor-wrapper').forEach(wrapper => {
        // Support both data-blocks (JSON) and data-blocks-b64 (base64-encoded JSON)
        let blocksRaw = wrapper.dataset.blocks || '';
        const blocksB64 = wrapper.dataset.blocksB64;
        if (blocksB64) {
            try {
                blocksRaw = atob(blocksB64);
            }
            catch { /* empty */ }
        }
        let blocks = [];
        if (blocksRaw) {
            try {
                blocks = JSON.parse(blocksRaw);
            }
            catch { /* empty */ }
        }
        const editorData = {
            time: Date.now(),
            version: '1.0',
            blocks: blocks.length > 0 ? blocks : [{ type: 'paragraph', data: { text: '' } }],
        };
        const editorInstance = Editor.create(wrapper, { data: editorData });
        activeEditor = editorInstance;
        // Auto-save on focusout from the editor
        let saveTimer = null;
        wrapper.addEventListener('focusout', (e) => {
            const related = e.relatedTarget;
            if (related && wrapper.contains(related))
                return;
            // Debounce to avoid saving while user clicks between blocks
            if (saveTimer)
                clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                if (!editorInstance)
                    return;
                const saved = editorInstance.save();
                const slug = wrapper.id;
                if (!slug)
                    return;
                showSaveIndicator(wrapper, 'saving');
                api.savePage(slug, JSON.stringify(saved.blocks), 'blocks').then(() => {
                    showSaveIndicator(wrapper, 'saved');
                }).catch(() => {
                    showSaveIndicator(wrapper, 'error');
                });
            }, 300);
        });
    });
}
// --- Save indicator ---
function showSaveIndicator(container, state) {
    let indicator = container.parentElement?.querySelector('.ce-save-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'ce-save-indicator';
        container.parentElement?.insertBefore(indicator, container);
    }
    indicator.textContent = state === 'saving' ? '...' : state === 'saved' ? '✓' : '✗';
    indicator.className = 'ce-save-indicator ce-save--' + state;
    if (state !== 'saving') {
        setTimeout(() => { indicator.className = 'ce-save-indicator'; }, 2000);
    }
}
// --- Format switching ---
function initFormatSwitcher() {
    document.querySelectorAll('.ce-format-bar').forEach(bar => {
        const slug = bar.dataset.slug;
        if (!slug)
            return;
        bar.querySelectorAll('button[data-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                const newFormat = btn.dataset.format;
                if (!newFormat || btn.classList.contains('active'))
                    return;
                if (!confirm(i18n.t('confirm_format_switch', { format: newFormat })))
                    return;
                switchFormat(slug, newFormat);
            });
        });
    });
}
function switchFormat(slug, newFormat) {
    // Gather current content before switching
    let currentContent = '';
    if (activeEditor) {
        // Currently in blocks mode — extract text from blocks
        const saved = activeEditor.save();
        currentContent = saved.blocks.map(b => {
            const d = b.data;
            switch (b.type) {
                case 'paragraph': return String(d.text || '');
                case 'heading': return String(d.text || '');
                case 'list': return (d.items || []).join('\n');
                case 'code': return String(d.code || '');
                case 'quote': return String(d.text || '');
                default: return '';
            }
        }).filter(Boolean).join('\n\n');
        // Destroy current editor
        activeEditor.destroy();
        activeEditor = null;
    }
    else {
        // Currently in text mode — get from the span
        const span = document.getElementById(slug);
        if (span) {
            const textarea = span.querySelector('textarea');
            if (textarea) {
                currentContent = textarea.value;
            }
            else {
                currentContent = span.innerHTML.replace(/<br\s*\/?>/gi, '\n');
            }
        }
    }
    // Strip HTML tags for clean text when switching to markdown
    if (newFormat === 'markdown') {
        const tmp = document.createElement('div');
        tmp.innerHTML = currentContent;
        currentContent = tmp.textContent || '';
    }
    // Save with new format via API
    if (newFormat === 'blocks') {
        // Convert text content to a single paragraph block
        const blocks = currentContent.split('\n\n').filter(Boolean).map(text => ({
            type: 'paragraph',
            data: { text: text.replace(/\n/g, '<br>') },
        }));
        api.savePage(slug, JSON.stringify(blocks), 'blocks').then(() => {
            location.reload();
        }).catch(() => {
            alert('Format switch failed. Reloading to recover.');
            location.reload();
        });
    }
    else {
        api.savePage(slug, currentContent, newFormat).then(() => {
            location.reload();
        }).catch(() => {
            alert('Format switch failed. Reloading to recover.');
            location.reload();
        });
    }
}
// --- Main initialization ---
function initEditInplace() {
    // Render content for visitors
    renderMarkdownContent();
    renderBlocksContent();
    // Wait for i18n to be ready before initializing editor UI
    const initEditorUI = () => {
        initBlockEditor();
        initFormatSwitcher();
    };
    if (typeof i18n !== 'undefined' && i18n.ready) {
        i18n.ready.then(initEditorUI);
    }
    else {
        initEditorUI();
    }
    // Editable text spans (HTML and Markdown formats)
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
