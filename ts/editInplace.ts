/**
 * EditInplace - Inline content editing for Adlaire Platform.
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

declare const pageLang: string | undefined;
declare const pageFormat: string | undefined;

let changing = false;
let activeEditor: InstanceType<typeof Editor> | null = null;

function nl2br(s: string): string {
    return s.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
}

function fieldSave(key: string, val: string): void {
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
        if (!response.ok) { throw new Error(String(response.status)); }
        return response.text();
    })
    .then(data => {
        if (key === 'themeSelect' || key === 'language') {
            location.reload();
            return;
        }

        const el = document.getElementById(key);
        if (!el) { changing = false; return; }

        if (val === '') {
            el.innerHTML = el.getAttribute('title') || '';
        } else {
            el.innerHTML = data;
        }
        changing = false;
    })
    .catch(() => {
        changing = false;
    });
}

// --- Text-based editing (Markdown and settings fields) ---

function plainTextEdit(span: HTMLElement): void {
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
        if (saved) return;
        saved = true;
        if (isMarkdown) {
            fieldSave(id, textarea.value);
        } else {
            // Settings fields (title, description, etc.)
            fieldSave(id, nl2br(textarea.value));
        }
    });

    span.textContent = '';
    span.appendChild(textarea);
    textarea.focus();
    autosize(textarea);
}

function richTextHook(span: HTMLElement): void {
    plainTextEdit(span);
}

// --- Content rendering for visitors ---

function renderMarkdownContent(): void {
    document.querySelectorAll<HTMLElement>('.markdown-content').forEach(el => {
        const b64 = el.dataset.rawB64;
        const raw = b64 ? atob(b64) : (el.textContent || '');
        el.innerHTML = markdownToHtml(raw);
    });
}

function renderBlocksContent(): void {
    document.querySelectorAll<HTMLElement>('.blocks-content').forEach(el => {
        const blocksJson = el.dataset.blocks;
        if (!blocksJson) return;
        try {
            const blocks = JSON.parse(blocksJson);
            el.innerHTML = renderBlocks(blocks);
        } catch {
            // Leave content as-is on parse failure
        }
    });
}

// --- Block editor initialization ---

function initBlockEditor(): void {
    document.querySelectorAll<HTMLElement>('.ce-editor-wrapper').forEach(wrapper => {
        const blocksJson = wrapper.dataset.blocks;
        let blocks: { type: string; data: Record<string, unknown> }[] = [];
        if (blocksJson) {
            try { blocks = JSON.parse(blocksJson); } catch { /* empty */ }
        }

        const editorData = {
            time: Date.now(),
            version: '1.0',
            blocks: blocks.length > 0 ? blocks : [{ type: 'paragraph', data: { text: '' } }],
        };

        activeEditor = Editor.create(wrapper, { data: editorData });

        // Auto-save on focusout from the editor
        let saveTimer: ReturnType<typeof setTimeout> | null = null;
        wrapper.addEventListener('focusout', (e) => {
            const related = (e as FocusEvent).relatedTarget as Node | null;
            if (related && wrapper.contains(related)) return;

            // Debounce to avoid saving while user clicks between blocks
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                if (!activeEditor) return;
                const saved = activeEditor.save();
                const slug = wrapper.id;
                if (!slug) return;

                api.savePage(slug, JSON.stringify(saved.blocks), 'blocks').catch(() => {
                    // Silent fail - will retry on next focusout
                });
            }, 300);
        });
    });
}

// --- Format switching ---

function initFormatSwitcher(): void {
    document.querySelectorAll<HTMLElement>('.ce-format-bar').forEach(bar => {
        const slug = bar.dataset.slug;
        if (!slug) return;

        bar.querySelectorAll<HTMLButtonElement>('button[data-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                const newFormat = btn.dataset.format;
                if (!newFormat || btn.classList.contains('active')) return;

                switchFormat(slug, newFormat);
            });
        });
    });
}

function switchFormat(slug: string, newFormat: string): void {
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
                case 'list': return ((d.items as string[]) || []).join('\n');
                case 'code': return String(d.code || '');
                case 'quote': return String(d.text || '');
                default: return '';
            }
        }).filter(Boolean).join('\n\n');

        // Destroy current editor
        activeEditor.destroy();
        activeEditor = null;
    } else {
        // Currently in text mode — get from the span
        const span = document.getElementById(slug);
        if (span) {
            const textarea = span.querySelector('textarea');
            if (textarea) {
                currentContent = textarea.value;
            } else {
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
            // Revert on failure
        });
    } else {
        api.savePage(slug, currentContent, newFormat).then(() => {
            location.reload();
        }).catch(() => {
            // Revert on failure
        });
    }
}

// --- Main initialization ---

function initEditInplace(): void {
    // Render content for visitors
    renderMarkdownContent();
    renderBlocksContent();

    // Initialize block editor for admin (blocks-format pages)
    initBlockEditor();

    // Initialize format switcher for admin
    initFormatSwitcher();

    // Editable text spans (HTML and Markdown formats)
    document.querySelectorAll<HTMLElement>('span.editText').forEach(span => {
        span.addEventListener('click', () => {
            if (changing) return;
            changing = true;

            if (span.classList.contains('richText')) {
                richTextHook(span);
            } else {
                plainTextEdit(span);
            }
        });
    });

    // Toggle sections
    document.querySelectorAll<HTMLElement>('.toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            document.querySelectorAll<HTMLElement>('.hide').forEach(el => {
                if (el.style.display === 'none' || el.style.display === '') {
                    el.style.display = 'block';
                } else {
                    el.style.display = 'none';
                }
            });
        });
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditInplace);
} else {
    initEditInplace();
}
