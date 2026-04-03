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
// #5: CSRF同時リクエスト防止用のセーブキュー
let fieldSaveQueue: Promise<void> = Promise.resolve();
// #12: flushSave競合防止フラグ
let flushSaving = false;

function nl2br(s: string): string {
    return s.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
}

// #95: fieldSave大規模content上限（1MB）
const FIELD_SAVE_MAX_LENGTH = 1_048_576;
function fieldSave(key: string, val: string): void {
    // #95: 大規模content対策 — 上限超過時は警告して中断
    if (val.length > FIELD_SAVE_MAX_LENGTH) {
        console.warn('fieldSave: content exceeds max length, skipping save for:', key);
        showFieldFeedback(key, false);
        return;
    }
    // #5: CSRF同時リクエスト時のトークン不整合対策 — キューで直列化
    fieldSaveQueue = fieldSaveQueue.then(() => {
        const body = new URLSearchParams();
        body.append('fieldname', key);
        body.append('content', val);
        body.append('csrf', csrfToken);

        return fetch('index.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        })
        .then(response => {
            if (!response.ok) { throw new Error(String(response.status)); }
            // #87: updateCsrfFromResponse DRY統一
            updateCsrfFromResponse(response);
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
        .catch((err: unknown) => {
            changing = false;
            // #40: network/server error区別 — TypeError はネットワークエラー
            if (err instanceof TypeError) {
                console.warn('fieldSave network error:', key, err.message);
            } else {
                console.warn('fieldSave server error:', key, err instanceof Error ? err.message : String(err));
            }
            showFieldFeedback(key, false);
        });
    });
}

// #107: CSS.escapeフォールバック追加（Safari旧バージョン対策）
function showFieldFeedback(key: string, success: boolean): void {
    const escapedKey = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(key)
        : key.replace(/([^\w-])/g, '\\$1');
    const el = document.querySelector(`[onchange*="fieldSave(\\"${escapedKey}\\""]`) as HTMLElement
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
    // #108: title属性値のエスケープ（引用符対策）
    const titleAttr = title ? `"${title.replace(/"/g, '&quot;')}" ` : '';
    const isMarkdown = span.dataset.format === 'markdown';

    const content = isMarkdown
        ? span.innerHTML
        : (span.textContent || '');

    const textarea = document.createElement('textarea');
    textarea.name = 'textarea';
    textarea.id = id + '_field';
    textarea.setAttribute('title', titleAttr);
    textarea.value = content;

    // #90: saved二重防止改善 — blurイベントのonce指定
    let saved = false;
    textarea.addEventListener('blur', () => {
        if (saved) return;
        saved = true;
        // #90: textarea参照が無効でないか確認
        if (!textarea.isConnected) { changing = false; return; }
        if (isMarkdown) {
            fieldSave(id, textarea.value);
        } else {
            // Settings fields (title, description, etc.)
            fieldSave(id, nl2br(textarea.value));
        }
    }, { once: true });

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

// #94: render*Content二重呼び出し防止フラグ
let _markdownRendered = false;
function renderMarkdownContent(): void {
    if (_markdownRendered) return;
    _markdownRendered = true;
    document.querySelectorAll<HTMLElement>('.markdown-content').forEach(el => {
        const b64 = el.dataset.rawB64;
        // #89: b64デコードエラーハンドリング
        let raw: string;
        if (b64) {
            try { raw = atob(b64); } catch { raw = el.textContent || ''; }
        } else {
            raw = el.textContent || '';
        }
        if (typeof markdownToHtml === 'function') {
            el.innerHTML = sanitizeHtml(markdownToHtml(raw));
        }
    });
}

let _blocksRendered = false;
function renderBlocksContent(): void {
    if (_blocksRendered) return;
    _blocksRendered = true;
    document.querySelectorAll<HTMLElement>('.blocks-content').forEach(el => {
        let raw = el.dataset.blocks || '';
        const b64 = el.dataset.blocksB64;
        if (b64) {
            try { raw = atob(b64); } catch { /* empty */ }
        }
        if (!raw) return;
        try {
            const blocks = JSON.parse(raw);
            // #111: パース結果のArray.isArrayチェック追加
            if (!Array.isArray(blocks)) return;
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
            // #12: flushSave中の別focusout競合防止
            if (flushSaving) return;
            // #59: activeEditor null後のsave防止
            if (!editorInstance || !activeEditor) return;
            flushSaving = true;
            const saved = editorInstance.save();
            // #39: JSON.stringifyでキーソート統一
            // #62: sortedReplacer return type改善 — Record | unknown の明示的ユニオン
            const sortedReplacer = (_key: string, value: unknown): Record<string, unknown> | unknown => {
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    const obj = value as Record<string, unknown>;
                    const sorted: Record<string, unknown> = {};
                    for (const k of Object.keys(obj).sort()) {
                        sorted[k] = obj[k];
                    }
                    return sorted;
                }
                return value;
            };
            const json = JSON.stringify(saved.blocks, sortedReplacer);
            const slug = wrapper.id;
            if (!slug || json === lastSavedJson) { flushSaving = false; return; }

            lastSavedJson = json;
            showSaveIndicator(wrapper, 'saving');
            api.savePage(slug, json, 'blocks').then((result) => {
                showSaveIndicator(wrapper, 'saved');
                if (result.warnings && result.warnings.length > 0) {
                    showWarnings(result.warnings);
                }
            }).catch(() => {
                showSaveIndicator(wrapper, 'error');
            }).finally(() => {
                flushSaving = false;
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

            // #36: saveTimer null代入の明確化
            if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
            saveTimer = setTimeout(flushSave, 300);
        });

        // #41: beforeunloadでnavigator.sendBeacon()使用に変更（同期的に送信可能）
        // #14: sidebar/main順序保証 — mainを先に送信
        window.addEventListener('beforeunload', () => {
            if (saveTimer) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }
            // #59: activeEditor null後のsave防止
            if (!editorInstance || !activeEditor) return;
            const saved = editorInstance.save();
            // #62: sortedReplacer return type改善
            const sortedReplacer = (_key: string, value: unknown): Record<string, unknown> | unknown => {
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    const obj = value as Record<string, unknown>;
                    const sorted: Record<string, unknown> = {};
                    for (const k of Object.keys(obj).sort()) {
                        sorted[k] = obj[k];
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
            // #13: sendBeacon失敗時のユーザー通知（返り値チェック）
            const sent = navigator.sendBeacon('index.php?api=pages', body);
            if (!sent) {
                console.warn('sendBeacon failed for page:', slug);
            }
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
        // #112: sidebar flushSaving競合防止フラグ追加
        let sidebarFlushSaving = false;

        const flushSidebarSave = (): void => {
            if (sidebarFlushSaving) return;
            sidebarFlushSaving = true;
            const saved = sidebarEditor.save();
            const json = JSON.stringify(saved.blocks);
            if (json === sidebarLastJson) { sidebarFlushSaving = false; return; }
            sidebarLastJson = json;
            showSaveIndicator(sidebarEl, 'saving');
            api.saveSidebar(json).then(() => {
                showSaveIndicator(sidebarEl, 'saved');
            }).catch(() => {
                showSaveIndicator(sidebarEl, 'error');
            }).finally(() => {
                sidebarFlushSaving = false;
            });
        };

        sidebarEl.addEventListener('focusout', (e) => {
            const related = (e as FocusEvent).relatedTarget as Node | null;
            // #84: sidebar focusoutのrelatedTarget拡大（toolbox, inline-toolbar含む）
            if (related && (
                sidebarEl.contains(related) ||
                (related as HTMLElement).closest?.('.ce-toolbox') ||
                (related as HTMLElement).closest?.('.ce-inline-toolbar')
            )) return;
            if (sidebarSaveTimer) clearTimeout(sidebarSaveTimer);
            sidebarSaveTimer = setTimeout(flushSidebarSave, 300);
        });

        // #41: sidebarもsendBeaconに変更
        // #14: sidebar/main順序保証 — sidebarはmainの後に送信（後発イベント）
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
            // #13: sendBeacon失敗時のユーザー通知
            const sent = navigator.sendBeacon('index.php?api=sidebar', body);
            if (!sent) {
                console.warn('sendBeacon failed for sidebar');
            }
        });
    }
}

// --- Save indicator ---

// #110: showSaveIndicator — parentElement nullチェック強化
function showSaveIndicator(container: HTMLElement, state: 'saving' | 'saved' | 'error'): void {
    const parent = container.parentElement;
    if (!parent) return;
    let indicator = parent.querySelector('.ce-save-indicator') as HTMLElement | null;
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'ce-save-indicator';
        parent.insertBefore(indicator, container);
    }

    indicator.textContent = state === 'saving' ? '...' : state === 'saved' ? '\u2713' : '\u2717';
    indicator.className = 'ce-save-indicator ce-save--' + state;

    if (state !== 'saving') {
        const indicatorRef = indicator;
        setTimeout(() => { indicatorRef.className = 'ce-save-indicator'; }, 2000);
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

                // #42: confirm()ダイアログのformat引数をescHtml() + confirm後のchangingフラグリセット
                if (!confirm(i18n.t('confirm_format_switch', { format: escHtml(newFormat) }))) {
                    changing = false;
                    return;
                }
                switchFormat(slug, newFormat);
            });
        });
    });
}

function switchFormat(slug: string, newFormat: string): void {
    // #15: switchFormat失敗時のロールバック — 元データを保持
    // #109: 未使用変数previousEditorRef削除
    let previousContent = '';
    let previousFormat = '';

    // Gather current content before switching
    let currentContent = '';

    if (activeEditor) {
        // Currently in blocks mode — extract text from blocks
        const saved = activeEditor.save();
        previousContent = JSON.stringify(saved.blocks);
        previousFormat = 'blocks';
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
                previousContent = textarea.value;
            } else {
                currentContent = span.innerHTML.replace(/<br\s*\/?>/gi, '\n');
                previousContent = currentContent;
            }
            previousFormat = span.dataset.format || 'markdown';
        }
    }

    // Strip HTML tags for clean text when switching to markdown
    if (newFormat === 'markdown') {
        const tmp = document.createElement('div');
        // #43: sanitizeHtml適用
        tmp.innerHTML = sanitizeHtml(currentContent);
        currentContent = tmp.textContent || '';
    }

    // #15: ロールバック関数
    const rollback = (): void => {
        if (previousFormat === 'blocks' && previousContent) {
            api.savePage(slug, previousContent, 'blocks').finally(() => {
                location.reload();
            });
        } else {
            alert(i18n.t('format_switch_error') || 'Format switch failed. Reloading to recover.');
            location.reload();
        }
    };

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
            // #15: 失敗時にロールバック
            rollback();
        });
    } else {
        api.savePage(slug, currentContent, newFormat).then(() => {
            location.reload();
        }).catch(() => {
            // #15: 失敗時にロールバック
            rollback();
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
            // #16: reorderPages失敗後のUI復元 — 元の順序を保存
            const originalOrder: HTMLTableRowElement[] = [];
            tbody.querySelectorAll<HTMLTableRowElement>('tr').forEach(r => originalOrder.push(r));
            tbody.insertBefore(state.dragRow, row.nextSibling);
            const slugs: string[] = [];
            tbody.querySelectorAll<HTMLTableRowElement>('tr').forEach(r => {
                const slug = r.dataset.slug;
                if (slug) slugs.push(slug);
            });
            // #46: catch内でalert表示後にUI復元
            api.reorderPages(slugs).catch(() => {
                // #16: 元の順序にDOMを復元
                originalOrder.forEach(r => tbody.appendChild(r));
                alert(i18n.t('reorder_error') || 'Reorder failed');
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

    // #30: Japanese検索改善 — normalize + toLowerCase で全角/半角統一
    input.addEventListener('input', () => {
        const query = input.value.normalize('NFKC').toLowerCase();
        tbody.querySelectorAll<HTMLTableRowElement>('tr').forEach(row => {
            const text = (row.textContent || '').normalize('NFKC').toLowerCase();
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

    // #31: DOM queryキャッシュ — checkboxリストを一度取得して再利用
    const allCheckboxes = tbody.querySelectorAll<HTMLInputElement>('.ce-bulk-check');

    selectAll.addEventListener('change', () => {
        allCheckboxes.forEach(cb => {
            cb.checked = selectAll.checked;
        });
    });

    // #53: allChecked判定の最適化 — Array.from + every で短絡評価
    tbody.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (!target.classList.contains('ce-bulk-check')) return;
        selectAll.checked = Array.from(allCheckboxes).every(cb => cb.checked);
    });
    const getSelectedSlugs = (): string[] => {
        const slugs: string[] = [];
        allCheckboxes.forEach(cb => {
            if (!cb.checked) return;
            const row = cb.closest('tr');
            // #82: hidden item操作防止 — 非表示行のチェックボックスを除外
            if (row && row.style.display === 'none') return;
            if (row?.dataset.slug) slugs.push(row.dataset.slug);
        });
        return slugs;
    };

    const statusBtn = document.querySelector<HTMLButtonElement>('#ce-bulk-status');
    if (statusBtn) {
        statusBtn.addEventListener('click', () => {
            const slugs = getSelectedSlugs();
            // #92: slugs空チェック改善（ユーザー通知追加）
            if (slugs.length === 0) {
                alert(i18n.t('bulk_no_selection') || 'No pages selected.');
                return;
            }
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
            // #92: slugs空チェック改善（ユーザー通知追加）
            if (slugs.length === 0) {
                alert(i18n.t('bulk_no_selection') || 'No pages selected.');
                return;
            }
            if (!confirm(i18n.t('confirm_bulk_delete', { count: String(slugs.length) }))) return;
            api.bulkDelete(slugs).then(() => { location.reload(); }).catch(() => {
                alert(i18n.t('bulk_delete_error'));
            });
        });
    }
}

// --- Publish warnings (#B) ---

// #83: showWarnings スタック防止 — タイマーIDを保持
let _warningsTimer: ReturnType<typeof setTimeout> | null = null;
function showWarnings(warnings: string[]): void {
    // #93: container参照安全化 — 配列チェック追加
    if (!Array.isArray(warnings) || warnings.length === 0) return;
    // #83: 前回のタイマーをキャンセルしてスタック防止
    if (_warningsTimer) { clearTimeout(_warningsTimer); _warningsTimer = null; }
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
    // #93: container参照をローカル変数で保持
    const containerRef = container;
    warnings.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'ce-warnings__item';
        item.textContent = msg;
        containerRef.appendChild(item);
    });
    // #83: タイマーIDを保持してスタック防止
    _warningsTimer = setTimeout(() => {
        if (containerRef.isConnected) { containerRef.innerHTML = ''; }
        _warningsTimer = null;
    }, 8000);
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
            // #99: timestampバリデーション（数字のみ許可）
            if (!/^\d+$/.test(t1) || !/^\d+$/.test(t2)) return;

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

    const closeModal = (): void => {
        modal!.style.display = 'none';
        // #85: Escapeキーリスナーを解除
        document.removeEventListener('keydown', escHandler);
    };
    modal.querySelector('.ce-diff-modal__backdrop')?.addEventListener('click', closeModal);
    modal.querySelector('.ce-diff-modal__close')?.addEventListener('click', closeModal);
    // #85: Escapeキーでモーダルを閉じる
    const escHandler = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', escHandler);
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

    // #113: container非null参照をローカル変数で保持
    const containerRef = container;
    const line = (label: string, value: string): void => {
        const row = document.createElement('div');
        row.className = 'ce-generate-report__row';
        row.textContent = `${label}: ${value}`;
        containerRef.appendChild(row);
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
        // #86: btn.disabled強化 — 既にdisabledなら重複実行防止
        if (btn.disabled) return;
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

// --- Sub-master credential download (Ver.2.9) ---

function downloadCredentials(username: string, password: string, token: string): void {
    const content = `Adlaire Sub-Master Credentials\n` +
        `================================\n` +
        `Login ID: ${username}\n` +
        `Password: ${password}\n` +
        `Token: ${token}\n` +
        `================================\n` +
        `WARNING: This file is shown only once. Keep it safe.\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adlaire-sub-master-${username}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- User Management UI (Ver.2.9: マスター管理者対応) ---

function initUserManagement(): void {
    // Sub-master generation
    const generateBtn = document.querySelector<HTMLButtonElement>('#ce-generate-sub-master');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            if (generateBtn.disabled) return;
            generateBtn.disabled = true;
            api.generateSubMaster().then(result => {
                // Display credentials (shown only once, disappears on reload)
                const credDisplay = document.createElement('div');
                credDisplay.className = 'ce-sub-master-credentials';
                credDisplay.innerHTML = `
                    <div class="ce-sub-master-credentials__item"><strong>${escHtml(i18n.t('sub_master_id') || 'Login ID')}:</strong> ${escHtml(result.username)}</div>
                    <div class="ce-sub-master-credentials__item"><strong>${escHtml(i18n.t('sub_master_password') || 'Password')}:</strong> ${escHtml(result.password)}</div>
                    <div class="ce-sub-master-credentials__item"><strong>${escHtml(i18n.t('sub_master_token') || 'Token')}:</strong> ${escHtml(result.token)}</div>
                    <div class="ce-sub-master-credentials__warn">${escHtml(i18n.t('sub_master_warn') || 'This information is shown only once. Please save it.')}</div>
                `;
                generateBtn.parentElement?.insertBefore(credDisplay, generateBtn.nextSibling);

                // Auto-download credentials as text file
                downloadCredentials(result.username, result.password, result.token);

                // Refresh user list
                refreshUserList();
            }).catch((err: unknown) => {
                alert(err instanceof Error ? err.message : String(err));
            }).finally(() => {
                generateBtn.disabled = false;
            });
        });
    }

    // Disable user buttons (event delegation)
    const userListContainer = document.querySelector<HTMLElement>('#ce-user-list');
    if (userListContainer) {
        userListContainer.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;

            // Disable (deactivate) sub-master
            if (target.classList.contains('ce-user-disable-btn')) {
                const username = target.dataset.username;
                if (!username) return;
                if (!confirm(i18n.t('confirm_disable_user', { username: escHtml(username) }) || `Disable user "${username}"?`)) return;
                api.disableUser(username).then(() => {
                    location.reload();
                }).catch((err: unknown) => {
                    alert(err instanceof Error ? err.message : String(err));
                });
            }

            // Delete sub-master
            if (target.classList.contains('ce-user-delete-btn')) {
                const username = target.dataset.username;
                if (!username) return;
                if (!confirm(i18n.t('confirm_delete_user', { username: escHtml(username) }) || `Delete user "${username}"? This cannot be undone.`)) return;
                api.deleteUser(username).then(() => {
                    location.reload();
                }).catch((err: unknown) => {
                    alert(err instanceof Error ? err.message : String(err));
                });
            }
        });
    }

    // Main master password change form
    const pwForm = document.querySelector<HTMLFormElement>('#ce-main-password-form');
    if (pwForm) {
        pwForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPw = pwForm.querySelector<HTMLInputElement>('#ce-current-password')?.value || '';
            const newPw = pwForm.querySelector<HTMLInputElement>('#ce-new-password')?.value || '';
            const confirmPw = pwForm.querySelector<HTMLInputElement>('#ce-confirm-password')?.value || '';

            if (!currentPw || !newPw || !confirmPw) {
                alert(i18n.t('password_fields_required') || 'All password fields are required.');
                return;
            }
            if (newPw !== confirmPw) {
                alert(i18n.t('password_mismatch') || 'New password and confirmation do not match.');
                return;
            }

            api.updateMainPassword(currentPw, newPw).then(() => {
                alert(i18n.t('password_updated') || 'Password updated successfully.');
                pwForm.reset();
            }).catch((err: unknown) => {
                alert(err instanceof Error ? err.message : String(err));
            });
        });
    }

    // Enforce 3-user limit: disable generate button when at capacity
    refreshUserList();
}

function refreshUserList(): void {
    const generateBtn = document.querySelector<HTMLButtonElement>('#ce-generate-sub-master');
    if (!generateBtn) return;

    api.listUsers().then(users => {
        // 3-user limit: main master + 2 sub-masters = 3 total
        const MAX_USERS = 3;
        generateBtn.disabled = users.length >= MAX_USERS;
        if (users.length >= MAX_USERS) {
            generateBtn.title = i18n.t('sub_master_limit_reached') || 'Maximum number of users reached (3).';
        } else {
            generateBtn.title = '';
        }
    }).catch(() => {
        // Silently ignore list errors on refresh
    });
}

// --- Login page: sub-master token field toggle (Ver.2.9) ---

function initLoginSubMasterToggle(): void {
    const checkbox = document.querySelector<HTMLInputElement>('#ce-login-sub-master');
    const tokenField = document.querySelector<HTMLElement>('#ce-login-token-field');
    if (!checkbox || !tokenField) return;

    tokenField.style.display = 'none';
    checkbox.addEventListener('change', () => {
        tokenField.style.display = checkbox.checked ? '' : 'none';
    });
}

// --- Main initialization ---

// #98: initEditInplace重複実行防止
let _editInplaceInitialized = false;
function initEditInplace(): void {
    if (_editInplaceInitialized) return;
    _editInplaceInitialized = true;
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
        initUserManagement();
        initLoginSubMasterToggle();
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
