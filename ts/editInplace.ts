/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
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
        // Update CSRF token from response header (one-time token)
        // #33: グローバル変数を直接更新
        const newToken = response.headers.get('X-CSRF-Token');
        if (newToken) { csrfToken = newToken; }
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
        if (!el) { changing = false; return; }

        if (val === '') {
            el.textContent = el.getAttribute('title') || '';
        } else {
            el.textContent = data;
        }
        changing = false;
    })
    .catch(() => {
        changing = false;
        showFieldFeedback(key, false);
    });
}

function showFieldFeedback(key: string, success: boolean): void {
    const el = document.querySelector(`[onchange*="fieldSave(\\"${CSS.escape(key)}\\""]`) as HTMLElement
        || document.getElementById(key);
    if (!el) return;
    const orig = el.style.borderColor;
    el.style.borderColor = success ? '#0a0' : '#c00';
    setTimeout(() => { el.style.borderColor = orig; }, 1500);
}

// --- Text-based editing (Markdown and settings fields) ---

function plainTextEdit(span: HTMLElement): void {
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
    // #36: typeof autosize チェックをより堅牢に
    if (typeof autosize !== 'undefined' && typeof autosize === 'function') { autosize(textarea); }
}

function richTextHook(span: HTMLElement): void {
    plainTextEdit(span);
}

// --- Content rendering for visitors ---

function renderMarkdownContent(): void {
    document.querySelectorAll<HTMLElement>('.markdown-content').forEach(el => {
        const b64 = el.dataset.rawB64;
        const raw = b64 ? atob(b64) : (el.textContent || '');
        if (typeof markdownToHtml === 'function') {
            el.innerHTML = sanitizeHtml(markdownToHtml(raw));
        }
    });
}

function renderBlocksContent(): void {
    document.querySelectorAll<HTMLElement>('.blocks-content').forEach(el => {
        let raw = el.dataset.blocks || '';
        const b64 = el.dataset.blocksB64;
        if (b64) {
            try { raw = atob(b64); } catch { /* empty */ }
        }
        if (!raw) return;
        try {
            const blocks = JSON.parse(raw);
            el.innerHTML = sanitizeHtml(renderBlocks(blocks));
        } catch (err) {
            // #38: JSON.parse失敗時のconsole.warnログ出力
            console.warn('Failed to parse blocks JSON:', err);
        }
    });
}

// --- Block editor initialization ---

function initBlockEditor(): void {
    document.querySelectorAll<HTMLElement>('.ce-editor-wrapper').forEach(wrapper => {
        // Support both data-blocks (JSON) and data-blocks-b64 (base64-encoded JSON)
        let blocksRaw = wrapper.dataset.blocks || '';
        const blocksB64 = wrapper.dataset.blocksB64;
        if (blocksB64) {
            try { blocksRaw = atob(blocksB64); } catch { /* empty */ }
        }
        let blocks: { type: string; data: Record<string, unknown> }[] = [];
        if (blocksRaw) {
            try { blocks = JSON.parse(blocksRaw); } catch (err) { console.warn('Failed to parse blocks:', err); }
        }

        const editorData = {
            time: Date.now(),
            version: '1.0',
            blocks: blocks.length > 0 ? blocks : [{ type: 'paragraph', data: { text: '' } }],
        };

        const editorInstance = Editor.create(wrapper, { data: editorData });
        activeEditor = editorInstance;

        // Auto-save on focusout from the editor
        let saveTimer: ReturnType<typeof setTimeout> | null = null;
        let lastSavedJson = '';

        const flushSave = (): void => {
            if (!editorInstance) return;
            const saved = editorInstance.save();
            // #39: JSON.stringifyでキーソート統一
            const sortedReplacer = (_key: string, value: unknown): unknown => {
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    const sorted: Record<string, unknown> = {};
                    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
                        sorted[k] = (value as Record<string, unknown>)[k];
                    }
                    return sorted;
                }
                return value;
            };
            const json = JSON.stringify(saved.blocks, sortedReplacer);
            const slug = wrapper.id;
            if (!slug || json === lastSavedJson) return;

            lastSavedJson = json;
            showSaveIndicator(wrapper, 'saving');
            api.savePage(slug, json, 'blocks').then((result) => {
                showSaveIndicator(wrapper, 'saved');
                if (result.warnings && result.warnings.length > 0) {
                    showWarnings(result.warnings);
                }
            }).catch(() => {
                showSaveIndicator(wrapper, 'error');
            });
        };

        wrapper.addEventListener('focusout', (e) => {
            const related = (e as FocusEvent).relatedTarget as Node | null;
            // #40: relatedTargetチェック拡大（.ce-toolbox, .ce-inline-toolbar含む）
            if (related && (
                wrapper.contains(related) ||
                (related as HTMLElement).closest?.('.ce-toolbox') ||
                (related as HTMLElement).closest?.('.ce-inline-toolbar')
            )) return;

            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(flushSave, 300);
        });

        // #41: beforeunloadでnavigator.sendBeacon()使用に変更（同期的に送信可能）
        window.addEventListener('beforeunload', () => {
            if (saveTimer) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }
            if (!editorInstance) return;
            const saved = editorInstance.save();
            const sortedReplacer = (_key: string, value: unknown): unknown => {
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    const sorted: Record<string, unknown> = {};
                    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
                        sorted[k] = (value as Record<string, unknown>)[k];
                    }
                    return sorted;
                }
                return value;
            };
            const json = JSON.stringify(saved.blocks, sortedReplacer);
            const slug = wrapper.id;
            if (!slug || json === lastSavedJson) return;
            lastSavedJson = json;
            const body = new URLSearchParams();
            body.append('slug', slug);
            body.append('format', 'blocks');
            body.append('csrf', csrfToken);
            body.append('blocks', json);
            body.append('content', '');
            navigator.sendBeacon('index.php?api=pages', body);
        });
    });

    // #18: Sidebar editor
    const sidebarEl = document.querySelector<HTMLElement>('#sidebar-editor');
    if (sidebarEl) {
        let sidebarBlocksRaw = sidebarEl.dataset.blocks || '';
        const sidebarB64 = sidebarEl.dataset.blocksB64;
        if (sidebarB64) {
            try { sidebarBlocksRaw = atob(sidebarB64); } catch { /* empty */ }
        }
        let sidebarBlocks: { type: string; data: Record<string, unknown> }[] = [];
        if (sidebarBlocksRaw) {
            try { sidebarBlocks = JSON.parse(sidebarBlocksRaw); } catch (err) { console.warn('Failed to parse sidebar blocks:', err); }
        }

        const sidebarData: EditorData = {
            time: Date.now(),
            version: '1.0',
            blocks: sidebarBlocks.length > 0 ? sidebarBlocks : [{ type: 'paragraph', data: { text: '' } }],
        };

        const sidebarEditor = Editor.create(sidebarEl, { data: sidebarData });

        let sidebarSaveTimer: ReturnType<typeof setTimeout> | null = null;
        let sidebarLastJson = '';

        const flushSidebarSave = (): void => {
            const saved = sidebarEditor.save();
            const json = JSON.stringify(saved.blocks);
            if (json === sidebarLastJson) return;
            sidebarLastJson = json;
            showSaveIndicator(sidebarEl, 'saving');
            api.saveSidebar(json).then(() => {
                showSaveIndicator(sidebarEl, 'saved');
            }).catch(() => {
                showSaveIndicator(sidebarEl, 'error');
            });
        };

        sidebarEl.addEventListener('focusout', (e) => {
            const related = (e as FocusEvent).relatedTarget as Node | null;
            if (related && sidebarEl.contains(related)) return;
            if (sidebarSaveTimer) clearTimeout(sidebarSaveTimer);
            sidebarSaveTimer = setTimeout(flushSidebarSave, 300);
        });

        // #41: sidebarもsendBeaconに変更
        window.addEventListener('beforeunload', () => {
            if (sidebarSaveTimer) {
                clearTimeout(sidebarSaveTimer);
                sidebarSaveTimer = null;
            }
            const saved = sidebarEditor.save();
            const json = JSON.stringify(saved.blocks);
            if (json === sidebarLastJson) return;
            sidebarLastJson = json;
            const body = new URLSearchParams();
            body.append('blocks', json);
            body.append('csrf', csrfToken);
            navigator.sendBeacon('index.php?api=sidebar', body);
        });
    }
}

// --- Save indicator ---

function showSaveIndicator(container: HTMLElement, state: 'saving' | 'saved' | 'error'): void {
    let indicator = container.parentElement?.querySelector('.ce-save-indicator') as HTMLElement | null;
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'ce-save-indicator';
        container.parentElement?.insertBefore(indicator, container);
    }

    indicator.textContent = state === 'saving' ? '...' : state === 'saved' ? '✓' : '✗';
    indicator.className = 'ce-save-indicator ce-save--' + state;

    if (state !== 'saving') {
        setTimeout(() => { indicator!.className = 'ce-save-indicator'; }, 2000);
    }
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

                // #42: confirm()ダイアログのformat引数をescHtml()
                if (!confirm(i18n.t('confirm_format_switch', { format: escHtml(newFormat) }))) return;
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
        // #43: sanitizeHtml適用
        tmp.innerHTML = sanitizeHtml(currentContent);
        currentContent = tmp.textContent || '';
    }

    // Save with new format via API
    if (newFormat === 'blocks') {
        // #44: 段落分割ロジック改善（\n\n分割、連続空行も統一）
        const blocks = currentContent.split(/\n{2,}/).filter(Boolean).map(text => ({
            type: 'paragraph',
            data: { text: sanitizeHtml(text.replace(/\n/g, '<br>')) },
        }));

        api.savePage(slug, JSON.stringify(blocks), 'blocks').then(() => {
            location.reload();
        }).catch(() => {
            alert('Format switch failed. Reloading to recover.');
            location.reload();
        });
    } else {
        api.savePage(slug, currentContent, newFormat).then(() => {
            location.reload();
        }).catch(() => {
            alert('Format switch failed. Reloading to recover.');
            location.reload();
        });
    }
}

// --- Page reorder D&D (#16) ---

function initPageReorder(): void {
    const table = document.querySelector<HTMLTableElement>('.ce-page-list');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // #45: dragRowをクロージャスコープに限定（initPageReorder内のローカル変数）
    const state: { dragRow: HTMLTableRowElement | null } = { dragRow: null };

    tbody.querySelectorAll<HTMLTableRowElement>('tr').forEach(row => {
        const handle = document.createElement('td');
        handle.className = 'ce-drag-handle';
        handle.textContent = '\u2630';
        handle.draggable = true;
        row.insertBefore(handle, row.firstChild);

        handle.addEventListener('dragstart', (e) => {
            state.dragRow = row;
            row.classList.add('ce-row--dragging');
            e.dataTransfer!.effectAllowed = 'move';
        });

        handle.addEventListener('dragend', () => {
            row.classList.remove('ce-row--dragging');
            tbody.querySelectorAll('.ce-row--dragover').forEach(el =>
                el.classList.remove('ce-row--dragover')
            );
            state.dragRow = null;
        });

        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'move';
            row.classList.add('ce-row--dragover');
        });

        row.addEventListener('dragleave', () => {
            row.classList.remove('ce-row--dragover');
        });

        row.addEventListener('drop', (e) => {
            e.preventDefault();
            row.classList.remove('ce-row--dragover');
            if (!state.dragRow || state.dragRow === row) return;
            tbody.insertBefore(state.dragRow, row.nextSibling);
            const slugs: string[] = [];
            tbody.querySelectorAll<HTMLTableRowElement>('tr').forEach(r => {
                const slug = r.dataset.slug;
                if (slug) slugs.push(slug);
            });
            // #46: catch内でalert表示後にreload
            api.reorderPages(slugs).catch(() => {
                alert(i18n.t('reorder_error') || 'Reorder failed');
                location.reload();
            });
        });
    });

    const headerRow = table.querySelector('thead tr');
    if (headerRow) {
        const th = document.createElement('th');
        th.className = 'ce-drag-handle-header';
        headerRow.insertBefore(th, headerRow.firstChild);
    }
}

// --- Page search/filter (#A) ---

function initPageSearch(): void {
    const input = document.querySelector<HTMLInputElement>('#page-search');
    if (!input) return;

    const table = document.querySelector<HTMLTableElement>('.ce-page-list');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        tbody.querySelectorAll<HTMLTableRowElement>('tr').forEach(row => {
            const text = row.textContent?.toLowerCase() || '';
            row.style.display = text.includes(query) ? '' : 'none';
        });
    });
}

// --- Bulk actions (#D) ---

function initBulkActions(): void {
    const selectAll = document.querySelector<HTMLInputElement>('#ce-bulk-select-all');
    if (!selectAll) return;

    const table = document.querySelector<HTMLTableElement>('.ce-page-list');
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    selectAll.addEventListener('change', () => {
        tbody.querySelectorAll<HTMLInputElement>('.ce-bulk-check').forEach(cb => {
            cb.checked = selectAll.checked;
        });
    });

    tbody.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (!target.classList.contains('ce-bulk-check')) return;
        const all = tbody.querySelectorAll<HTMLInputElement>('.ce-bulk-check');
        let allChecked = true;
        all.forEach(cb => { if (!cb.checked) allChecked = false; });
        selectAll.checked = allChecked;
    });

    const getSelectedSlugs = (): string[] => {
        const slugs: string[] = [];
        tbody.querySelectorAll<HTMLInputElement>('.ce-bulk-check:checked').forEach(cb => {
            const row = cb.closest('tr');
            if (row?.dataset.slug) slugs.push(row.dataset.slug);
        });
        return slugs;
    };

    const statusBtn = document.querySelector<HTMLButtonElement>('#ce-bulk-status');
    if (statusBtn) {
        statusBtn.addEventListener('click', () => {
            const slugs = getSelectedSlugs();
            if (slugs.length === 0) return;
            const statusSelect = document.querySelector<HTMLSelectElement>('#ce-bulk-status-select');
            const status = statusSelect?.value;
            if (!status) return;
            api.bulkStatus(slugs, status).then(() => { location.reload(); }).catch(() => {
                alert(i18n.t('bulk_status_error'));
            });
        });
    }

    const deleteBtn = document.querySelector<HTMLButtonElement>('#ce-bulk-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const slugs = getSelectedSlugs();
            if (slugs.length === 0) return;
            if (!confirm(i18n.t('confirm_bulk_delete', { count: String(slugs.length) }))) return;
            api.bulkDelete(slugs).then(() => { location.reload(); }).catch(() => {
                alert(i18n.t('bulk_delete_error'));
            });
        });
    }
}

// --- Publish warnings (#B) ---

function showWarnings(warnings: string[]): void {
    let container = document.querySelector<HTMLElement>('.ce-warnings');
    if (!container) {
        container = document.createElement('div');
        container.className = 'ce-warnings';
        const editor = document.querySelector('.ce-editor-wrapper');
        if (editor?.parentElement) {
            editor.parentElement.insertBefore(container, editor);
        } else {
            document.body.prepend(container);
        }
    }
    container.innerHTML = '';
    warnings.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'ce-warnings__item';
        item.textContent = msg;
        container!.appendChild(item);
    });
    setTimeout(() => { container!.innerHTML = ''; }, 8000);
}

// --- Revision diff (#C) ---

function initRevisionDiff(): void {
    const list = document.querySelector<HTMLElement>('.ce-revision-list');
    if (!list) return;

    const slug = list.dataset.slug;
    if (!slug) return;

    const items = list.querySelectorAll<HTMLElement>('.ce-revision-item');
    items.forEach((item, idx) => {
        if (idx >= items.length - 1) return;
        const btn = document.createElement('button');
        btn.className = 'ce-btn ce-btn--diff';
        btn.textContent = i18n.t('show_diff');
        btn.addEventListener('click', () => {
            const t2 = item.dataset.timestamp || '';
            const t1 = items[idx + 1]?.dataset.timestamp || '';
            if (!t1 || !t2) return;

            api.getRevisionDiff(slug, t1, t2).then(diff => {
                showRevisionDiffModal(diff);
            }).catch(() => {
                alert(i18n.t('diff_error'));
            });
        });
        item.appendChild(btn);
    });
}

function showRevisionDiffModal(diff: { added: unknown[]; removed: unknown[]; changed: unknown[] }): void {
    let modal = document.querySelector<HTMLElement>('.ce-diff-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'ce-diff-modal';
        document.body.appendChild(modal);
    }

    // #48: item型チェック強化
    const renderItems = (items: unknown[], cls: string): string => {
        if (!Array.isArray(items)) return '';
        return items.map(item => {
            if (item === null || item === undefined) return '';
            const text = typeof item === 'object' ? JSON.stringify(item) : String(item);
            return `<div class="${cls}">${escHtml(text)}</div>`;
        }).join('');
    };

    modal.innerHTML = `
        <div class="ce-diff-modal__backdrop"></div>
        <div class="ce-diff-modal__content">
            <button class="ce-diff-modal__close">&times;</button>
            <div class="ce-diff-added">${renderItems(diff.added, 'ce-diff-line--added')}</div>
            <div class="ce-diff-removed">${renderItems(diff.removed, 'ce-diff-line--removed')}</div>
            <div class="ce-diff-changed">${renderItems(diff.changed, 'ce-diff-line--changed')}</div>
        </div>
    `;
    modal.style.display = 'flex';

    const closeModal = (): void => { modal!.style.display = 'none'; };
    modal.querySelector('.ce-diff-modal__backdrop')?.addEventListener('click', closeModal);
    modal.querySelector('.ce-diff-modal__close')?.addEventListener('click', closeModal);
}

// --- Generate report (#F) ---

function showGenerateReport(report: { success: number; failed: number; skipped: number; time: number }): void {
    let container = document.querySelector<HTMLElement>('.ce-generate-report');
    if (!container) {
        container = document.createElement('div');
        container.className = 'ce-generate-report';
        const genBtn = document.querySelector('.ce-generate-btn');
        if (genBtn?.parentElement) {
            genBtn.parentElement.insertBefore(container, genBtn.nextSibling);
        } else {
            document.body.prepend(container);
        }
    }
    container.innerHTML = '';

    const line = (label: string, value: string): void => {
        const row = document.createElement('div');
        row.className = 'ce-generate-report__row';
        row.textContent = `${label}: ${value}`;
        container!.appendChild(row);
    };

    line(i18n.t('report_success'), String(report.success));
    line(i18n.t('report_failed'), String(report.failed));
    line(i18n.t('report_skipped'), String(report.skipped));
    line(i18n.t('report_time'), `${report.time}ms`);
}

function initGenerateReport(): void {
    const btn = document.querySelector<HTMLButtonElement>('.ce-generate-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        btn.disabled = true;
        // #52: Content-Type追加
        fetch('index.php?api=generate', {
            method: 'POST',
            headers: {
                'X-CSRF-Token': csrfToken,
                'Content-Type': 'application/json',
            },
        })
        .then(res => {
            updateCsrfFromResponse(res);
            return res.json();
        })
        .then(json => {
            if (json.report) {
                showGenerateReport(json.report);
            }
        })
        .catch(() => {
            alert(i18n.t('generate_error'));
        })
        .finally(() => { btn.disabled = false; });
    });
}

// --- Main initialization ---

function initEditInplace(): void {
    // Render content for visitors
    renderMarkdownContent();
    renderBlocksContent();

    // Wait for i18n to be ready before initializing editor UI
    const initEditorUI = (): void => {
        initBlockEditor();
        initFormatSwitcher();
        initPageReorder();
        initPageSearch();
        initBulkActions();
        initRevisionDiff();
        initGenerateReport();
    };
    // #36: typeof i18nチェックをより堅牢に
    if (typeof i18n !== 'undefined' && i18n && typeof i18n.ready?.then === 'function') {
        i18n.ready.then(initEditorUI);
    } else {
        initEditorUI();
    }

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
