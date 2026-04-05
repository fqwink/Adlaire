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
 * Expects: global csrfToken, pageLang, pageFormat variables set by PHP.
 */

import { autosize } from './autosize.ts';
import { markdownToHtml } from './markdown.ts';
// R5-28: EditorData型のインポート漏れ修正
import { Editor, renderBlocks, sanitizeHtml, escHtml, type BlockData, type EditorData } from './editor.ts';
import { api, updateCsrfFromResponse } from './api.ts';
import { i18n } from './i18n.ts';

declare const pageLang: string | undefined;
declare const pageFormat: string | undefined;

// Expose globals for PHP templates
(window as Record<string, unknown>).markdownToHtml = markdownToHtml;
(window as Record<string, unknown>).renderBlocks = renderBlocks;
(window as Record<string, unknown>).sanitizeHtml = sanitizeHtml;
(window as Record<string, unknown>).escHtml = escHtml;

let changing = false;
let activeEditor: InstanceType<typeof Editor> | null = null;
// #5: CSRF同時リクエスト防止用のセーブキュー
let fieldSaveQueue: Promise<void> = Promise.resolve();
// #12: flushSave競合防止フラグ
let flushSaving = false;
// Ver.2.9 TS#3/TS#7: sendBeacon用のCSRFトークンキャッシュ — 最後の有効トークンを保持
let _lastValidCsrfToken: string = '';

// Ver.2.9 TS#69/#75: sortedReplacer共通化（flushSave/beforeunload両方で使用）
const _sortedReplacer = (_key: string, value: unknown): Record<string, unknown> | unknown => {
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

// Ver.2.9 TS#79: マジックナンバー定数化
const SAVE_DEBOUNCE_MS = 300;
const WARNINGS_DISPLAY_MS = 8000;
const REVOKE_URL_DELAY_MS = 5000;
const FEEDBACK_DISPLAY_MS = 1500;
const SEARCH_DEBOUNCE_MS = 150;

// R4-9: nl2br入力null安全化
function nl2br(s: string): string {
    if (!s) return '';
    return s.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
}

// #95: fieldSave大規模content上限（1MB）
const FIELD_SAVE_MAX_LENGTH = 1_048_576;
function fieldSave(key: string, val: string): void {
    // #95: 大規模content対策 — 上限超過時は警告して中断
    if (val.length > FIELD_SAVE_MAX_LENGTH) {
        console.warn('fieldSave: content exceeds max length, skipping save for:', key);
        showFieldFeedback(key, false);
        changing = false;
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
            // Ver.2.9 TS#3/TS#7: 有効なCSRFトークンをキャッシュ
            _lastValidCsrfToken = csrfToken;
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
    const el = document.querySelector(`[data-field="${escapedKey}"]`) as HTMLElement
        || document.getElementById(key);
    if (!el) return;
    const orig = el.style.borderColor;
    el.style.borderColor = success ? '#0a0' : '#c00';
    // Ver.2.9 TS#79/#92: マジックナンバー定数化 + orig null安全
    setTimeout(() => { el.style.borderColor = orig || ''; }, FEEDBACK_DISPLAY_MS);
}

// --- Text-based editing (Markdown and settings fields) ---

function plainTextEdit(span: HTMLElement): void {
    const id = span.id;
    const title = span.getAttribute('title');
    // #108: title属性値のエスケープ（引用符対策）
    const titleAttr = title ? `"${title.replace(/"/g, '&quot;')}" ` : '';
    const isMarkdown = span.dataset.format === 'markdown';

    // R5-26: markdown/非markdown分岐が同一ロジック — 意図を明確化
    const content = span.textContent || '';

    const textarea = document.createElement('textarea');
    textarea.name = 'textarea';
    // R3-27: textarea id — id空文字の場合の安全チェック
    textarea.id = id ? id + '_field' : '';
    // R3-28: title属性に生のtitleAttrを設定（HTML属性値にタグが混入しないように）
    if (title) textarea.title = title;
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
    autosize(textarea);
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
            // Ver.2.9 TS#88: atob失敗時console.warn
            // R5-7: b64空文字チェック（空文字でatobするとエラーにはならないが空結果）
            try { raw = b64.trim() ? new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))) : ''; } catch (e) { console.warn('renderMarkdownContent: atob failed', e); raw = el.textContent || ''; }
        } else {
            raw = el.textContent || '';
        }
        // R5-8: markdownToHtml型チェック強化
        if (typeof markdownToHtml === 'function') {
            try {
                el.innerHTML = sanitizeHtml(markdownToHtml(raw));
            } catch (e) {
                console.warn('renderMarkdownContent: markdownToHtml failed', e);
            }
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
            // Ver.2.9 TS#89: atob失敗時console.warn
            try { raw = new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))); } catch (e) { console.warn('renderBlocksContent: atob failed', e); }
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
        // R4-23: wrapper.id空チェック — idのないラッパーは保存先が不明のためスキップ
        if (!wrapper.id) { console.warn('initBlockEditor: wrapper has no id, skipping'); return; }
        // Support both data-blocks (JSON) and data-blocks-b64 (base64-encoded JSON)
        let blocksRaw = wrapper.dataset.blocks || '';
        const blocksB64 = wrapper.dataset.blocksB64;
        if (blocksB64) {
            try { blocksRaw = new TextDecoder().decode(Uint8Array.from(atob(blocksB64), c => c.charCodeAt(0))); } catch { /* empty */ }
        }
        let blocks: { type: string; data: Record<string, unknown> }[] = [];
        if (blocksRaw) {
            try {
                const parsed = JSON.parse(blocksRaw);
                // R4-24: JSON.parse結果のArray.isArrayチェック
                blocks = Array.isArray(parsed) ? parsed : [];
            } catch (err) { console.warn('Failed to parse blocks:', err); }
        }

        const editorData = {
            time: Date.now(),
            version: '1.0',
            blocks: blocks.length > 0 ? blocks : [{ type: 'paragraph', data: { text: '' } }],
        };

        const editorInstance = Editor.create(wrapper, { data: editorData });
        activeEditor = editorInstance;
        // Ver.2.9 TS#3/TS#7: 初期CSRFトークンをキャッシュ
        if (!_lastValidCsrfToken) { _lastValidCsrfToken = csrfToken; }

        // Ver.2.9 TS#29: フォーカス管理 — エディタフォーカス時にactiveEditor更新
        wrapper.addEventListener('focusin', () => {
            activeEditor = editorInstance;
        });

        // Auto-save on focusout from the editor
        let saveTimer: ReturnType<typeof setTimeout> | null = null;
        let lastSavedJson = '';
        // Ver.2.9 TS#26: セーブタイマー複数エディタ — flushSavingをエディタごとにローカル化
        let wrapperFlushSaving = false;

        const flushSave = (): void => {
            // #12: flushSave中の別focusout競合防止
            // Ver.2.9 TS#26: エディタ固有のフラグを使用
            if (wrapperFlushSaving) return;
            // #59: activeEditor null後のsave防止
            if (!editorInstance) return;
            wrapperFlushSaving = true;
            const saved = editorInstance.save();
            // #39/#69/#75: JSON.stringifyでキーソート統一 — 共通sortedReplacer使用
            const json = JSON.stringify(saved.blocks, _sortedReplacer);
            const slug = wrapper.id;
            if (!slug || json === lastSavedJson) { wrapperFlushSaving = false; return; }

            lastSavedJson = json;
            // Ver.2.9 TS#10: save大規模content上限チェック
            if (json.length > FIELD_SAVE_MAX_LENGTH) {
                console.warn('flushSave: content exceeds max length, skipping save for:', slug);
                showSaveIndicator(wrapper, 'error');
                wrapperFlushSaving = false;
                return;
            }
            showSaveIndicator(wrapper, 'saving');
            api.savePage(slug, json, 'blocks').then((result) => {
                showSaveIndicator(wrapper, 'saved');
                // Ver.2.9 TS#3/TS#7: 有効なCSRFトークンをキャッシュ
                _lastValidCsrfToken = csrfToken;
                if (result.warnings && result.warnings.length > 0) {
                    // Ver.2.9 TS#41: showWarnings isConnected確認
                    if (wrapper.isConnected) {
                        showWarnings(result.warnings);
                    }
                }
            }).catch((err: unknown) => {
                showSaveIndicator(wrapper, 'error');
                // Ver.2.9 TS#30: save()失敗時のUI通知
                console.warn('flushSave error:', slug, err instanceof Error ? err.message : String(err));
            }).finally(() => {
                wrapperFlushSaving = false;
            });
        };

        wrapper.addEventListener('focusout', (e) => {
            const related = (e as FocusEvent).relatedTarget as Node | null;
            // #40: relatedTargetチェック拡大（.ce-toolbox, .ce-inline-toolbar含む）
            // R5-20: block toolbar含むフォーカス制御追加（main editor）
            if (related && (
                wrapper.contains(related) ||
                (related as HTMLElement).closest?.('.ce-toolbox') ||
                (related as HTMLElement).closest?.('.ce-inline-toolbar') ||
                (related as HTMLElement).closest?.('.ce-block__toolbar')
            )) return;

            // #36: saveTimer null代入の明確化
            if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
            // Ver.2.9 TS#79: マジックナンバー定数化
            saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
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
            // #62/#69/#75: sortedReplacer共通化使用
            const json = JSON.stringify(saved.blocks, _sortedReplacer);
            const slug = wrapper.id;
            if (!slug || json === lastSavedJson) return;
            lastSavedJson = json;
            const body = new URLSearchParams();
            body.append('slug', slug);
            body.append('format', 'blocks');
            // Ver.2.9 TS#3/TS#7: sendBeacon時はキャッシュ済み最終有効トークンを使用
            body.append('csrf', _lastValidCsrfToken || csrfToken);
            body.append('blocks', json);
            body.append('content', '');
            // #13: sendBeacon失敗時のユーザー通知（返り値チェック）
            // Ver.2.9 TS#18: sendBeaconリトライ — 失敗時にXHR同期フォールバック
            const sent = navigator.sendBeacon('index.php?api=pages', body);
            if (!sent) {
                console.warn('sendBeacon failed for page:', slug, '- attempting XHR fallback');
                try {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', 'index.php?api=pages', false);
                    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                    xhr.send(body.toString());
                } catch { /* best-effort */ }
            }
        });
    });

    // #18: Sidebar editor
    const sidebarEl = document.querySelector<HTMLElement>('#sidebar-editor');
    if (sidebarEl) {
        let sidebarBlocksRaw = sidebarEl.dataset.blocks || '';
        const sidebarB64 = sidebarEl.dataset.blocksB64;
        if (sidebarB64) {
            try { sidebarBlocksRaw = new TextDecoder().decode(Uint8Array.from(atob(sidebarB64), c => c.charCodeAt(0))); } catch { /* empty */ }
        }
        let sidebarBlocks: { type: string; data: Record<string, unknown> }[] = [];
        if (sidebarBlocksRaw) {
            // R4-25: sidebar JSON.parse結果のArray.isArrayチェック
            try {
                const parsed = JSON.parse(sidebarBlocksRaw);
                sidebarBlocks = Array.isArray(parsed) ? parsed : [];
            } catch (err) { console.warn('Failed to parse sidebar blocks:', err); }
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
            const json = JSON.stringify(saved.blocks, _sortedReplacer);
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
            // R4-13: block toolbar含むフォーカス制御追加
            if (related && (
                sidebarEl.contains(related) ||
                (related as HTMLElement).closest?.('.ce-toolbox') ||
                (related as HTMLElement).closest?.('.ce-inline-toolbar') ||
                (related as HTMLElement).closest?.('.ce-block__toolbar')
            )) return;
            if (sidebarSaveTimer) clearTimeout(sidebarSaveTimer);
            // Ver.2.9 TS#79: マジックナンバー定数化
            sidebarSaveTimer = setTimeout(flushSidebarSave, SAVE_DEBOUNCE_MS);
        });

        // #41: sidebarもsendBeaconに変更
        // #14: sidebar/main順序保証 — sidebarはmainの後に送信（後発イベント）
        window.addEventListener('beforeunload', () => {
            if (sidebarSaveTimer) {
                clearTimeout(sidebarSaveTimer);
                sidebarSaveTimer = null;
            }
            const saved = sidebarEditor.save();
            const json = JSON.stringify(saved.blocks, _sortedReplacer);
            if (json === sidebarLastJson) return;
            sidebarLastJson = json;
            const body = new URLSearchParams();
            body.append('blocks', json);
            // Ver.2.9 TS#3/TS#7: sendBeacon時はキャッシュ済み最終有効トークンを使用
            body.append('csrf', _lastValidCsrfToken || csrfToken);
            // #13: sendBeacon失敗時のユーザー通知
            // Ver.2.9 TS#18: sendBeaconリトライ — 失敗時にXHR同期フォールバック
            const sent = navigator.sendBeacon('index.php?api=sidebar', body);
            if (!sent) {
                console.warn('sendBeacon failed for sidebar - attempting XHR fallback');
                try {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', 'index.php?api=sidebar', false);
                    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                    xhr.send(body.toString());
                } catch { /* best-effort */ }
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

    // Ver.2.9 TS#95: save状態テキストi18n化
    const stateLabels: Record<string, string> = {
        saving: i18n.t('save_state_saving') || '...',
        saved: i18n.t('save_state_saved') || '\u2713',
        error: i18n.t('save_state_error') || '\u2717',
    };
    indicator.textContent = stateLabels[state] || state;
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
                // R5-27: switchFormat前にchangingフラグセット
                changing = true;
                switchFormat(slug, newFormat);
            });
        });
    });
}

// Ver.2.9 TS#21: switchFormat location.reload重複防止フラグ
let _switchFormatReloading = false;
function switchFormat(slug: string, newFormat: string): void {
    // Ver.2.9 TS#21: reload中の重複呼び出し防止
    if (_switchFormatReloading) return;
    // #15: switchFormat失敗時のロールバック — 元データを保持
    // #109: 未使用変数previousEditorRef削除
    let previousContent = '';
    let previousFormat = '';
    // Ver.2.9 TS#43: switchFormatデータ整形 — newFormatの入力検証
    if (newFormat !== 'blocks' && newFormat !== 'markdown' && newFormat !== 'html') return;

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
    // R5-21: switchFormat内容最大長チェック — 巨大データの送信防止
    if (currentContent.length > FIELD_SAVE_MAX_LENGTH) {
        alert(i18n.t('content_too_large') || 'Content too large for format switch.');
        return;
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
            // Ver.2.9 TS#21: reload重複防止
            if (!_switchFormatReloading) { _switchFormatReloading = true; location.reload(); }
        }).catch(() => {
            // #15: 失敗時にロールバック
            rollback();
        });
    } else {
        api.savePage(slug, currentContent, newFormat).then(() => {
            // Ver.2.9 TS#21: reload重複防止
            if (!_switchFormatReloading) { _switchFormatReloading = true; location.reload(); }
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
            // Ver.2.9 TS#24: D&D整数チェック — dragRowがtbody内に存在するか確認
            if (!tbody.contains(state.dragRow)) { state.dragRow = null; return; }
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
    // Ver.2.9 #37: 検索フィルタ — デバウンスで入力中のパフォーマンス改善
    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    input.addEventListener('input', () => {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            // Ver.2.9 TS#37: normalize古ブラウザ対応 — normalize未対応ブラウザフォールバック
            const safeNormalize = (s: string): string =>
                typeof s.normalize === 'function' ? s.normalize('NFKC') : s;
            const query = safeNormalize(input.value).toLowerCase().trim();
            tbody.querySelectorAll<HTMLTableRowElement>('tr').forEach(row => {
                if (!query) { row.style.display = ''; return; }
                const text = safeNormalize(row.textContent || '').toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        // Ver.2.9 TS#79: マジックナンバー定数化
        }, SEARCH_DEBOUNCE_MS);
    });
}

// --- Bulk actions (#D) ---

// Ver.2.9 TS#11: bulkActions初期化重複防止
let _bulkActionsInitialized = false;
function initBulkActions(): void {
    if (_bulkActionsInitialized) return;
    _bulkActionsInitialized = true;
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
            // Ver.2.9 TS#96: bulk操作エラーメッセージi18nフォールバック追加
            api.bulkStatus(slugs, status).then(() => { location.reload(); }).catch(() => {
                alert(i18n.t('bulk_status_error') || 'Bulk status change failed.');
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
            // Ver.2.9 TS#96: bulk操作エラーメッセージi18nフォールバック追加
            api.bulkDelete(slugs).then(() => { location.reload(); }).catch(() => {
                alert(i18n.t('bulk_delete_error') || 'Bulk delete failed.');
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
    // Ver.2.9 TS#41: 既存containerがDOM接続済みか確認
    if (container && !container.isConnected) { container = null; }
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
    // #83/#79: タイマーIDを保持してスタック防止 + マジックナンバー定数化
    _warningsTimer = setTimeout(() => {
        if (containerRef.isConnected) { containerRef.innerHTML = ''; }
        _warningsTimer = null;
    }, WARNINGS_DISPLAY_MS);
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
        // R5-25: diff操作中のボタン無効化
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            const t2 = item.dataset.timestamp || '';
            const t1 = items[idx + 1]?.dataset.timestamp || '';
            if (!t1 || !t2) return;
            // #99: timestampバリデーション（数字のみ許可）
            if (!/^\d+$/.test(t1) || !/^\d+$/.test(t2)) return;

            btn.disabled = true;
            api.getRevisionDiff(slug, t1, t2).then(diff => {
                showRevisionDiffModal(diff);
            }).catch(() => {
                alert(i18n.t('diff_error'));
            }).finally(() => {
                btn.disabled = false;
            });
        });
        item.appendChild(btn);
    });
}

// R5-11: showRevisionDiffModal diff null安全化
function showRevisionDiffModal(diff: { added: unknown[]; removed: unknown[]; changed: unknown[] }): void {
    if (!diff) return;
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

    // Ver.2.9 TS#80: innerHTML→DOM API化（XSS安全性向上）
    modal.innerHTML = '';
    const backdrop = document.createElement('div');
    backdrop.className = 'ce-diff-modal__backdrop';
    const content = document.createElement('div');
    content.className = 'ce-diff-modal__content';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ce-diff-modal__close';
    closeBtn.textContent = '\u00D7';
    content.appendChild(closeBtn);
    const addSection = document.createElement('div');
    addSection.className = 'ce-diff-added';
    addSection.innerHTML = renderItems(diff.added, 'ce-diff-line--added');
    content.appendChild(addSection);
    const removeSection = document.createElement('div');
    removeSection.className = 'ce-diff-removed';
    removeSection.innerHTML = renderItems(diff.removed, 'ce-diff-line--removed');
    content.appendChild(removeSection);
    const changeSection = document.createElement('div');
    changeSection.className = 'ce-diff-changed';
    changeSection.innerHTML = renderItems(diff.changed, 'ce-diff-line--changed');
    content.appendChild(changeSection);
    modal.appendChild(backdrop);
    modal.appendChild(content);
    modal.style.display = 'flex';

    const closeModal = (): void => {
        modal!.style.display = 'none';
        // #85: Escapeキーリスナーを解除
        document.removeEventListener('keydown', escHandler);
    };
    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    // #85: Escapeキーでモーダルを閉じる
    const escHandler = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', escHandler);
}

// --- Generate report (#F) ---

// Ver.2.9 TS#83: GenerateReport型を使用
// R4-14: showGenerateReport reportフィールド型安全化
function showGenerateReport(report: GenerateReport): void {
    if (!report || typeof report !== 'object') return;
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
            // R4-10: generate API !res.okチェック追加
            if (!res.ok) throw new Error(`API error: ${res.status}`);
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

// Ver.2.9 TS#1: downloadCredentials XSS防止 — escHtml()適用で表示時XSS防止
// Ver.2.9 TS#40: URL.revokeObjectURL早期破棄防止 — setTimeout内で破棄
function downloadCredentials(username: string, password: string, token: string): void {
    // Ver.2.9 TS#94: downloadCredentials i18n化
    const content = `${i18n.t('cred_file_title') || 'Adlaire Sub-Master Credentials'}\n` +
        `================================\n` +
        `${i18n.t('cred_file_login_id') || 'Login ID'}: ${username}\n` +
        `${i18n.t('cred_file_password') || 'Password'}: ${password}\n` +
        `${i18n.t('cred_file_token') || 'Token'}: ${token}\n` +
        `================================\n` +
        `${i18n.t('cred_file_warning') || 'WARNING: This file is shown only once. Keep it safe.'}\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Ver.2.9 TS#1: ファイル名もエスケープ（特殊文字除去）
    // R5-9: safeFilename空文字防止 — 全文字除去時のフォールバック
    const safeFilename = username.replace(/[^a-zA-Z0-9_-]/g, '_') || 'user';
    a.download = `adlaire-sub-master-${safeFilename}.txt`;
    document.body.appendChild(a);
    a.click();
    // R5-10: アンカー要素のDOM除去
    document.body.removeChild(a);
    // Ver.2.9 TS#40/#79: revokeObjectURLを遅延実行 + マジックナンバー定数化
    setTimeout(() => { URL.revokeObjectURL(url); }, REVOKE_URL_DELAY_MS);
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
                // Ver.2.9 TS#22: generateSubMasterレスポンス解析 — 必須フィールド検証
                if (!result || !result.username || !result.password || !result.token) {
                    alert(i18n.t('sub_master_generate_error') || 'Failed to generate sub-master credentials.');
                    return;
                }
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
                // R5-6: disableUser操作中のボタン無効化
                const disableBtn = target as HTMLButtonElement;
                disableBtn.disabled = true;
                api.disableUser(username).then(() => {
                    location.reload();
                }).catch((err: unknown) => {
                    disableBtn.disabled = false;
                    alert(err instanceof Error ? err.message : String(err));
                });
            }

            // Delete sub-master
            // Ver.2.9 #46: ユーザー削除 — ダブル確認とボタン無効化
            if (target.classList.contains('ce-user-delete-btn')) {
                const username = target.dataset.username;
                if (!username) return;
                if (!confirm(i18n.t('confirm_delete_user', { username: escHtml(username) }) || `Delete user "${username}"? This cannot be undone.`)) return;
                // Ver.2.9 #46: 削除中のボタン無効化
                const btn = target as HTMLButtonElement;
                btn.disabled = true;
                api.deleteUser(username).then(() => {
                    location.reload();
                }).catch((err: unknown) => {
                    btn.disabled = false;
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
            // Ver.2.9 #33: パスワード検証 — 最小長チェック（8文字以上）
            if (newPw.length < 8) {
                alert(i18n.t('password_too_short') || 'Password must be at least 8 characters long.');
                return;
            }
            // Ver.2.9 #33: パスワード検証 — 現在のパスワードと同一でないか
            if (currentPw === newPw) {
                alert(i18n.t('password_same_as_current') || 'New password must be different from current password.');
                return;
            }

            api.updateMainPassword(currentPw, newPw).then(() => {
                alert(i18n.t('password_updated') || 'Password updated successfully.');
                pwForm.reset();
                // Ver.2.9 TS#100: 成功時にcurrentPasswordフィールドにフォーカス
                const currentPwInput = pwForm.querySelector<HTMLInputElement>('#ce-current-password');
                if (currentPwInput) currentPwInput.focus();
            }).catch((err: unknown) => {
                alert(err instanceof Error ? err.message : String(err));
                // Ver.2.9 TS#33: パスワードフォームエラー時リセット — パスワードフィールドのみクリア
                const newPwInput = pwForm.querySelector<HTMLInputElement>('#ce-new-password');
                const confirmPwInput = pwForm.querySelector<HTMLInputElement>('#ce-confirm-password');
                if (newPwInput) newPwInput.value = '';
                if (confirmPwInput) confirmPwInput.value = '';
            });
        });
    }

    // Enforce 3-user limit: disable generate button when at capacity
    refreshUserList();
}

// Ver.2.9 TS#32: refreshUserList競合防止 — 実行中フラグ
let _refreshUserListPending = false;
function refreshUserList(): void {
    const generateBtn = document.querySelector<HTMLButtonElement>('#ce-generate-sub-master');
    if (!generateBtn) return;
    // Ver.2.9 TS#32: 既に実行中の場合はスキップ
    if (_refreshUserListPending) return;
    _refreshUserListPending = true;

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
    }).finally(() => {
        _refreshUserListPending = false;
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
    // Ver.2.9 TS#22(i18n): ready?.then型チェック — Promiseインスタンス確認を追加
    if (typeof i18n !== 'undefined' && i18n && i18n.ready instanceof Promise && typeof i18n.ready.then === 'function') {
        i18n.ready.then(initEditorUI).catch(() => { initEditorUI(); });
    } else {
        initEditorUI();
    }

    // Editable text spans (HTML and Markdown formats)
    // Ver.2.9 TS#31: イベントリスナー伝播制御 — click伝播を停止して親要素の誤動作を防止
    document.querySelectorAll<HTMLElement>('span.editText').forEach(span => {
        span.addEventListener('click', (e) => {
            e.stopPropagation();
            if (changing) return;
            changing = true;

            // R4-11: span.id空チェック — idのないspanは編集不可
            if (!span.id) { changing = false; return; }
            if (span.classList.contains('richText')) {
                richTextHook(span);
            } else {
                plainTextEdit(span);
            }
        });
    });

    // Toggle sections
    // R4-12: toggleイベント伝播防止
    document.querySelectorAll<HTMLElement>('.toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
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
