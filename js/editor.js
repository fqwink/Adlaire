"use strict";
/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
 * Editor - Block-based content editor for Adlaire Static CMS.
 * Editor.js-like architecture implemented in pure TypeScript.
 *
 * Spec: EDITOR_RULEBOOK.md §13 (Ver.2.5 エディタ高度化仕様)
 */
// Ver.2.9 #6: InlineToolbar参照を各Editorインスタンスに紐づけるためのWeakMap
const _editorInlineToolbarMap = new WeakMap();
// --- Helper: get Editor from element ---
function getEditorFromElement(el) {
    const editorEl = el.closest('.ce-editor');
    if (!editorEl)
        return null;
    const record = editorEl;
    if ('__editor' in editorEl && record['__editor'] instanceof Editor) {
        return record['__editor'];
    }
    return null;
}
// --- Helper: attach Backspace handler to any contentEditable block ---
function attachBackspaceHandler(el) {
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && (el.textContent?.trim() === '')) {
            e.preventDefault();
            const editor = getEditorFromElement(el);
            if (!editor)
                return;
            // #12: focusout前の状態保存トリガー
            editor.saveUndoState();
            const block = el.closest('.ce-block');
            const idx = editor.getBlockIndex(block);
            if (idx > 0) {
                editor.removeBlock(idx);
                editor.focusBlock(idx - 1);
            }
        }
    });
}
// --- Helper: attach Enter handler for list items ---
// Ver.2.9 TS#38: リスト重複リスナー防止 — dataset属性で登録済みチェック
function attachListItemHandlers(li) {
    if (li.dataset.listHandlerAttached === 'true')
        return;
    li.dataset.listHandlerAttached = 'true';
    li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Ver.2.9 #38: 空のliでEnterを押した場合はリストブロック後に新paragraph挿入
            if (li.textContent?.trim() === '') {
                const listEl = li.closest('ul, ol');
                const editor = listEl ? getEditorFromElement(listEl) : getEditorFromElement(li);
                if (editor && listEl) {
                    const block = listEl.closest('.ce-block');
                    if (block) {
                        const idx = editor.getBlockIndex(block);
                        li.remove();
                        if (listEl.children.length === 0) {
                            editor.removeBlock(idx);
                        }
                        editor.insertBlock('paragraph', { text: '' }, idx + 1);
                        return;
                    }
                }
            }
            const newLi = document.createElement('li');
            newLi.contentEditable = 'true';
            attachListItemHandlers(newLi);
            li.after(newLi);
            newLi.focus();
            const listEl = li.closest('ul, ol');
            const editor = listEl ? getEditorFromElement(listEl) : getEditorFromElement(li);
            if (editor) {
                editor.saveUndoState();
            }
        }
        // Ver.2.9 #38: Backspaceで空liを削除して前のliにフォーカス
        if (e.key === 'Backspace' && li.textContent?.trim() === '') {
            e.preventDefault();
            const prev = li.previousElementSibling;
            const listEl = li.closest('ul, ol');
            li.remove();
            if (prev) {
                prev.focus();
                const sel = window.getSelection();
                if (sel && prev.lastChild) {
                    const range = document.createRange();
                    range.selectNodeContents(prev);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
            const editor = listEl ? getEditorFromElement(listEl) : null;
            if (editor) {
                editor.saveUndoState();
            }
        }
    });
}
// --- Sanitize: strip dangerous tags from block content ---
// #47: replace chain順序保証 — 1) 危険タグ除去 → 2) Unicode decode → 3) on*属性除去 → 4) プロトコル除去
function sanitizeHtml(html) {
    // Phase 1: 危険タグの除去（最初に実行）
    let s = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    s = s.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
    s = s.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
    s = s.replace(/<embed\b[^>]*\/?>/gi, '');
    // #6: SVG内onclick等のネスト対応 - SVGタグ全体を除去
    s = s.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '');
    s = s.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '');
    s = s.replace(/<input\b[^>]*\/?>/gi, '');
    s = s.replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, '');
    s = s.replace(/<meta\b[^>]*\/?>/gi, '');
    s = s.replace(/<base\b[^>]*\/?>/gi, '');
    s = s.replace(/<link\b[^>]*\/?>/gi, '');
    // #114: <style>タグ除去（CSSインジェクション対策）
    s = s.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    // #115: <textarea>タグ除去（コンテンツインジェクション対策）
    s = s.replace(/<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi, '');
    // Phase 2: Unicode escape sequences decode before sanitization (e.g. \u003c → <)
    s = s.replace(/\\u(00[0-9a-fA-F]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
    s = s.replace(/\\x([0-9a-fA-F]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
    // Phase 3: 属性値内の改行/タブを除去してからイベントハンドラを検出（再チェック含む）
    s = s.replace(/(<[^>]*?)[\r\n\t]+/gi, '$1 ');
    // #7: on\w+ 正規表現をケース非感度+属性値内特殊文字対応に強化
    s = s.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    // #2: 属性値内改行/タブ除去後のon*再チェック（二重パス）
    s = s.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    // Phase 4: javascript:プロトコルフィルタにユニコードエスケープ対応
    const jsProtoPattern = /(href|src)\s*=\s*["']?\s*(?:javascript|&#0*106;?|&#x0*6a;?|\\u006[aA]|\\x6[aA])\s*(?:&#0*97;?|a)?\s*(?:v|&#0*118;?|&#x0*76;?)\s*(?:a|&#0*97;?)\s*(?:s|&#0*115;?)\s*(?:c|&#0*99;?)\s*(?:r|&#0*114;?)\s*(?:i|&#0*105;?)\s*(?:p|&#0*112;?)\s*(?:t|&#0*116;?)\s*:[^"'>]*/gi;
    s = s.replace(jsProtoPattern, '$1=""');
    s = s.replace(/(href|src)\s*=\s*["']?\s*javascript\s*:[^"'>]*/gi, '$1=""');
    // #4: about: / data: プロトコルフィルタ追加
    s = s.replace(/(href|src)\s*=\s*["']?\s*(?:about|data|vbscript)\s*:[^"'>]*/gi, '$1=""');
    s = s.replace(/\s+data-\w+\s*=\s*["']?\s*javascript\s*:[^"'>]*/gi, '');
    return s;
}
// --- Undo Manager (#25) ---
class UndoManager {
    constructor(maxSize = 50) {
        this.stack = [];
        this.pointer = -1;
        // Ver.2.9 #21: 最終push時刻を記録してデバウンス判定に使用
        this.lastPushTime = 0;
        this.maxSize = maxSize;
    }
    // #118: push最適化 — raw比較を先に行い、不一致時のみ正規化比較
    // Ver.2.9 #21: 連続pushのデバウンス（300ms以内の同一操作を統合）
    push(state) {
        const json = JSON.stringify(state);
        const now = Date.now();
        // Ver.2.9 TS#21: maxSize/pointer整合性 — pointerがstack範囲外の場合に補正
        if (this.pointer >= this.stack.length) {
            this.pointer = this.stack.length - 1;
        }
        if (this.pointer >= 0 && this.pointer < this.stack.length) {
            // Fast path: 完全一致チェック
            if (this.stack[this.pointer] === json)
                return;
            // #9: ホワイトスペース正規化で同一チェック（slow path）
            const normalized = json.replace(/\s+/g, ' ');
            const prevNormalized = this.stack[this.pointer].replace(/\s+/g, ' ');
            if (prevNormalized === normalized)
                return;
            // Ver.2.9 #21: 300ms以内の変更は上書き統合（スタック肥大化防止）
            if (now - this.lastPushTime < 300) {
                this.stack[this.pointer] = json;
                this.lastPushTime = now;
                return;
            }
        }
        this.stack = this.stack.slice(0, this.pointer + 1);
        this.stack.push(json);
        if (this.stack.length > this.maxSize) {
            this.stack.shift();
        }
        // Ver.2.9 TS#21: pointer整合性保証 — shiftで要素が減った場合も正確に追従
        this.pointer = this.stack.length - 1;
        this.lastPushTime = now;
    }
    // #10: JSON.parseにtry-catch追加
    // Ver.2.9 TS#49: undo/redo pointer範囲保護
    undo() {
        if (this.pointer <= 0 || this.stack.length === 0)
            return null;
        this.pointer--;
        // Ver.2.9 TS#49: pointer下限保護
        if (this.pointer < 0) {
            this.pointer = 0;
            return null;
        }
        try {
            return JSON.parse(this.stack[this.pointer]);
        }
        catch {
            return null;
        }
    }
    // #11: JSON.parseにtry-catch追加
    // Ver.2.9 TS#49: redo pointer範囲保護
    redo() {
        if (this.pointer >= this.stack.length - 1)
            return null;
        this.pointer++;
        // Ver.2.9 TS#49: pointer上限保護
        if (this.pointer >= this.stack.length) {
            this.pointer = this.stack.length - 1;
            return null;
        }
        try {
            return JSON.parse(this.stack[this.pointer]);
        }
        catch {
            return null;
        }
    }
    // Ver.2.9 #49: clear — Undo時のメモリ解放メソッド追加
    clear() {
        this.stack = [];
        this.pointer = -1;
        this.lastPushTime = 0;
    }
}
// --- Built-in Block Tools ---
const builtinTools = {
    paragraph(data) {
        return {
            render() {
                const el = document.createElement('div');
                el.contentEditable = 'true';
                el.className = 'ce-paragraph';
                el.innerHTML = sanitizeHtml(data.text || '');
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const editor = getEditorFromElement(el);
                        if (editor) {
                            // #88: Enter時の選択範囲保存 — カーソル以降のテキストを新ブロックに移動
                            const sel = window.getSelection();
                            let trailingHtml = '';
                            if (sel && sel.rangeCount) {
                                const range = sel.getRangeAt(0);
                                const tailRange = range.cloneRange();
                                tailRange.selectNodeContents(el);
                                tailRange.setStart(range.endContainer, range.endOffset);
                                const fragment = tailRange.extractContents();
                                const tmp = document.createElement('div');
                                tmp.appendChild(fragment);
                                trailingHtml = tmp.innerHTML;
                            }
                            const idx = editor.getBlockIndex(el.closest('.ce-block'));
                            // Ver.2.9 #50: 新ブロックのtrailingHtmlもサニタイズ
                            editor.insertBlock('paragraph', { text: sanitizeHtml(trailingHtml) }, idx + 1);
                        }
                    }
                });
                // Ver.2.9 #50: paste時にサニタイズ適用（外部HTMLのXSS防止）
                el.addEventListener('paste', (e) => {
                    const html = e.clipboardData?.getData('text/html');
                    if (html) {
                        e.preventDefault();
                        const cleaned = sanitizeHtml(html);
                        const sel = window.getSelection();
                        if (sel && sel.rangeCount) {
                            const range = sel.getRangeAt(0);
                            range.deleteContents();
                            const frag = range.createContextualFragment(cleaned);
                            range.insertNode(frag);
                            range.collapse(false);
                        }
                    }
                });
                attachBackspaceHandler(el);
                return el;
            },
            save(el) {
                return { text: el.innerHTML };
            },
        };
    },
    // #28: heading level click cycle (prompt → cycle button)
    heading(data) {
        let level = Math.max(1, Math.min(3, data.level || 2));
        let headingEl;
        return {
            render() {
                const wrap = document.createElement('div');
                wrap.className = 'ce-heading-wrap';
                headingEl = document.createElement(`h${level}`);
                headingEl.contentEditable = 'true';
                headingEl.className = 'ce-heading';
                headingEl.innerHTML = sanitizeHtml(data.text || '');
                attachBackspaceHandler(headingEl);
                const levelBtn = document.createElement('button');
                levelBtn.className = 'ce-heading__level';
                levelBtn.textContent = `H${level}`;
                levelBtn.title = 'Change heading level';
                levelBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Ver.2.9 #13: 形式切替時にinnerHTMLを保持しつつサニタイズ適用
                    const currentHtml = sanitizeHtml(headingEl.innerHTML);
                    level = level >= 3 ? 1 : level + 1;
                    const newEl = document.createElement(`h${level}`);
                    // #54: contentEditable属性を確実に設定
                    newEl.contentEditable = 'true';
                    newEl.className = 'ce-heading';
                    newEl.innerHTML = currentHtml;
                    attachBackspaceHandler(newEl);
                    headingEl.replaceWith(newEl);
                    headingEl = newEl;
                    levelBtn.textContent = `H${level}`;
                    newEl.focus();
                    // Ver.2.9 #13: レベル変更後にdirtyフラグをセット
                    const editor = getEditorFromElement(newEl);
                    if (editor) {
                        editor.dirty = true;
                    }
                });
                wrap.appendChild(levelBtn);
                wrap.appendChild(headingEl);
                return wrap;
            },
            save() {
                return { text: headingEl.innerHTML, level };
            },
        };
    },
    // #29: list ordered/unordered toggle (confirm → toggle button)
    // Ver.2.9 #10: list初期化 — items配列が空の場合のフォールバック改善
    list(data) {
        let style = data.style || 'unordered';
        const rawItems = data.items;
        const items = (Array.isArray(rawItems) && rawItems.length > 0) ? rawItems.map(i => String(i ?? '')) : [''];
        let listEl;
        return {
            render() {
                const wrap = document.createElement('div');
                wrap.className = 'ce-list-wrap';
                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'ce-list__toggle';
                toggleBtn.textContent = style === 'ordered' ? 'OL' : 'UL';
                toggleBtn.title = 'Toggle list type';
                toggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Ver.2.9 TS#42: リストトグルlistEl参照 — listElがDOM未接続の場合は再取得
                    if (!listEl.isConnected) {
                        const fallback = wrap.querySelector('ul, ol');
                        if (fallback)
                            listEl = fallback;
                        else
                            return;
                    }
                    const currentItems = [];
                    // #14: li.innerHTMLにsanitizeHtml適用してXSS防止
                    listEl.querySelectorAll('li').forEach(li => currentItems.push(sanitizeHtml(li.innerHTML)));
                    style = style === 'ordered' ? 'unordered' : 'ordered';
                    const newTag = style === 'ordered' ? 'ol' : 'ul';
                    const newEl = document.createElement(newTag);
                    newEl.className = 'ce-list';
                    // #15: sanitizeHtml後のli内HTML
                    currentItems.forEach(item => {
                        const li = document.createElement('li');
                        li.contentEditable = 'true';
                        li.innerHTML = item;
                        attachListItemHandlers(li);
                        newEl.appendChild(li);
                    });
                    listEl.replaceWith(newEl);
                    listEl = newEl;
                    toggleBtn.textContent = style === 'ordered' ? 'OL' : 'UL';
                    // Ver.2.9 TS#42: トグル後にdirtyフラグをセット
                    const editor = getEditorFromElement(newEl);
                    if (editor) {
                        editor.dirty = true;
                    }
                });
                const tag = style === 'ordered' ? 'ol' : 'ul';
                listEl = document.createElement(tag);
                listEl.className = 'ce-list';
                items.forEach(item => {
                    const li = document.createElement('li');
                    li.contentEditable = 'true';
                    li.innerHTML = sanitizeHtml(item);
                    attachListItemHandlers(li);
                    listEl.appendChild(li);
                });
                wrap.appendChild(toggleBtn);
                wrap.appendChild(listEl);
                return wrap;
            },
            save() {
                const lis = listEl.querySelectorAll('li');
                const savedItems = [];
                // #58: list item save時にsanitizeHtml適用
                lis.forEach(li => savedItems.push(sanitizeHtml(li.innerHTML)));
                return { style, items: savedItems };
            },
        };
    },
    code(data) {
        return {
            render() {
                const pre = document.createElement('pre');
                pre.className = 'ce-code';
                // Ver.2.9 TS#13: コードブロック言語タグ — data-languageをpre要素に保持
                const lang = typeof data.language === 'string' ? data.language.replace(/[^a-zA-Z0-9+#._-]/g, '') : '';
                if (lang) {
                    pre.dataset.language = lang;
                    pre.className = `ce-code language-${lang}`;
                }
                const code = document.createElement('code');
                code.contentEditable = 'true';
                code.textContent = data.code || '';
                // #73: code blockでtabキー入力対応（インデント挿入）
                code.addEventListener('keydown', (e) => {
                    // Ver.2.9 #47: Tab処理改善 — Shift+Tabでインデント解除対応
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        const sel = window.getSelection();
                        if (sel && sel.rangeCount) {
                            const range = sel.getRangeAt(0);
                            // Ver.2.9 TS#47: Tab挿入複数選択 — 選択範囲がある場合は各行にインデント操作
                            if (!range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE && range.startContainer.textContent) {
                                const textNode = range.startContainer;
                                const text = textNode.textContent;
                                const startOffset = range.startOffset;
                                const endOffset = range.endOffset;
                                // 選択範囲内の行を処理
                                let lineStart = text.lastIndexOf('\n', startOffset - 1) + 1;
                                let modified = text;
                                let offsetDelta = 0;
                                if (e.shiftKey) {
                                    // 各行頭のインデントを除去
                                    let pos = lineStart;
                                    while (pos <= endOffset + offsetDelta && pos < modified.length) {
                                        if (modified.substring(pos, pos + 4) === '    ') {
                                            modified = modified.substring(0, pos) + modified.substring(pos + 4);
                                            offsetDelta -= 4;
                                        }
                                        else if (modified.charAt(pos) === '\t') {
                                            modified = modified.substring(0, pos) + modified.substring(pos + 1);
                                            offsetDelta -= 1;
                                        }
                                        const next = modified.indexOf('\n', pos);
                                        if (next === -1 || next >= endOffset + offsetDelta)
                                            break;
                                        pos = next + 1;
                                    }
                                }
                                else {
                                    // 各行頭に4スペース追加
                                    let pos = lineStart;
                                    while (pos <= endOffset + offsetDelta && pos < modified.length) {
                                        modified = modified.substring(0, pos) + '    ' + modified.substring(pos);
                                        offsetDelta += 4;
                                        const next = modified.indexOf('\n', pos + 4);
                                        if (next === -1 || next >= endOffset + offsetDelta)
                                            break;
                                        pos = next + 1;
                                    }
                                }
                                textNode.textContent = modified;
                                range.setStart(textNode, Math.max(0, startOffset));
                                range.setEnd(textNode, Math.min(modified.length, Math.max(0, endOffset + offsetDelta)));
                            }
                            else if (e.shiftKey) {
                                // Shift+Tab: 行頭の4スペースまたはタブを削除
                                const textNode = range.startContainer;
                                if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
                                    const text = textNode.textContent;
                                    const offset = range.startOffset;
                                    // 行頭を探す
                                    let lineStart = text.lastIndexOf('\n', offset - 1) + 1;
                                    if (text.substring(lineStart, lineStart + 4) === '    ') {
                                        textNode.textContent = text.substring(0, lineStart) + text.substring(lineStart + 4);
                                        range.setStart(textNode, Math.max(lineStart, offset - 4));
                                        range.collapse(true);
                                    }
                                    else if (text.charAt(lineStart) === '\t') {
                                        textNode.textContent = text.substring(0, lineStart) + text.substring(lineStart + 1);
                                        range.setStart(textNode, Math.max(lineStart, offset - 1));
                                        range.collapse(true);
                                    }
                                }
                            }
                            else {
                                range.deleteContents();
                                range.insertNode(document.createTextNode('    '));
                                range.collapse(false);
                            }
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                    }
                });
                pre.appendChild(code);
                pre.addEventListener('click', () => code.focus());
                return pre;
            },
            save(el) {
                const code = el.querySelector('code');
                // Ver.2.9 TS#13/TS#44: コードブロック言語タグ保存 — 空言語も安全に処理
                const savedLang = el.dataset.language || '';
                const result = { code: code?.textContent || '' };
                if (savedLang)
                    result.language = savedLang;
                return result;
            },
        };
    },
    quote(data) {
        return {
            render() {
                const bq = document.createElement('blockquote');
                bq.className = 'ce-quote';
                bq.contentEditable = 'true';
                bq.innerHTML = sanitizeHtml(data.text || '');
                attachBackspaceHandler(bq);
                // #74: blockquoteのネスト防止（paste時にblockquoteタグを除去）
                bq.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const text = e.clipboardData?.getData('text/plain') || '';
                    document.execCommand('insertText', false, text);
                });
                // #17: blockquote focusoutでのセーブ検知改善
                // #75: delimiter含むfocusout処理
                // #91: quote focusout saveUndoState一貫性 — dirtyフラグチェック追加
                bq.addEventListener('focusout', () => {
                    const editor = getEditorFromElement(bq);
                    if (editor && editor.dirty) {
                        editor.saveUndoState();
                        editor.dirty = false;
                    }
                });
                return bq;
            },
            save(el) {
                return { text: el.innerHTML };
            },
        };
    },
    delimiter() {
        return {
            render() {
                const el = document.createElement('div');
                el.className = 'ce-delimiter';
                // #21: delimiter blockのkeyboard navigation対応
                el.tabIndex = 0;
                el.innerHTML = '<hr>';
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const editor = getEditorFromElement(el);
                        if (editor) {
                            const block = el.closest('.ce-block');
                            const idx = editor.getBlockIndex(block);
                            if (idx >= 0)
                                editor.focusBlock(idx + 1);
                        }
                    }
                    else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const editor = getEditorFromElement(el);
                        if (editor) {
                            const block = el.closest('.ce-block');
                            const idx = editor.getBlockIndex(block);
                            if (idx > 0)
                                editor.focusBlock(idx - 1);
                        }
                    }
                    else if (e.key === 'Backspace') {
                        e.preventDefault();
                        const editor = getEditorFromElement(el);
                        if (editor) {
                            const block = el.closest('.ce-block');
                            const idx = editor.getBlockIndex(block);
                            if (idx >= 0) {
                                editor.removeBlock(idx);
                                if (idx > 0)
                                    editor.focusBlock(idx - 1);
                            }
                        }
                    }
                });
                return el;
            },
            save() {
                return {};
            },
        };
    },
    image(data) {
        return {
            render() {
                const wrap = document.createElement('figure');
                wrap.className = 'ce-image';
                // #56: block wrapperにrole属性追加
                wrap.setAttribute('role', 'figure');
                const img = document.createElement('img');
                const initialUrl = data.url || '';
                // #18: javascript:, data:, vbscript: プロトコル + protocol-relative URL対策
                const isDangerousUrl = (url) => /^\s*(javascript|data|vbscript)\s*:/i.test(url) || /^\s*\/\//.test(url.trim());
                img.src = isDangerousUrl(initialUrl) ? '' : initialUrl;
                // #60: alt属性にtextContentで安全に設定
                img.alt = data.alt || '';
                // #19: onerror属性をnullに設定
                img.onerror = null;
                const urlInput = document.createElement('input');
                urlInput.type = 'text';
                urlInput.className = 'ce-image__url';
                urlInput.placeholder = 'Image URL...';
                urlInput.value = initialUrl;
                urlInput.addEventListener('input', () => {
                    const val = urlInput.value;
                    img.src = isDangerousUrl(val) ? '' : val;
                    // #19: URLの割り当て時にonerror属性をnullに設定
                    img.onerror = null;
                });
                const cap = document.createElement('figcaption');
                cap.contentEditable = 'true';
                // #20: captionはtextContentで安全にXSS防止
                cap.textContent = data.caption || '';
                const placeholderText = 'Caption...';
                cap.setAttribute('placeholder', placeholderText.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
                wrap.appendChild(urlInput);
                wrap.appendChild(img);
                wrap.appendChild(cap);
                return wrap;
            },
            save(el) {
                const urlInput = el.querySelector('.ce-image__url');
                const cap = el.querySelector('figcaption');
                return {
                    url: urlInput?.value || '',
                    caption: cap?.textContent || '',
                };
            },
        };
    },
};
// --- Inline Toolbar (#46: Selection API replaces document.execCommand) ---
class InlineToolbar {
    constructor() {
        this.el = document.createElement('div');
        this.el.className = 'ce-inline-toolbar';
        this.el.innerHTML = `
            <button data-action="bold" title="Bold"><b>B</b></button>
            <button data-action="italic" title="Italic"><i>I</i></button>
            <button data-action="link" title="Link">\uD83D\uDD17</button>
        `;
        this.el.style.display = 'none';
        document.body.appendChild(this.el);
        // #32: AbortControllerで多重登録防止
        this.selectionAc = new AbortController();
        this.el.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                if (!action)
                    return;
                if (action === 'bold') {
                    this.toggleInlineTag('strong');
                }
                else if (action === 'italic') {
                    this.toggleInlineTag('em');
                }
                else if (action === 'link') {
                    const url = prompt('URL:');
                    if (url) {
                        // #22: URLバリデーション追加
                        try {
                            new URL(url, window.location.href);
                        }
                        catch {
                            return; // 無効なURLは無視
                        }
                        // #4: about:/data:/javascript: プロトコル拒否
                        if (/^\s*(javascript|data|about|vbscript)\s*:/i.test(url))
                            return;
                        this.wrapWithLink(url);
                    }
                }
            });
        });
        // Ver.2.9 TS#45: InlineToolbar getBoundingClientRect性能改善 — requestAnimationFrameでスロットル
        let _updateRafId = null;
        this.selectionHandler = () => {
            if (_updateRafId !== null)
                return;
            _updateRafId = requestAnimationFrame(() => {
                _updateRafId = null;
                this.update();
            });
        };
        // #32: signal指定でselectionchangeリスナー多重登録防止
        document.addEventListener('selectionchange', this.selectionHandler, { signal: this.selectionAc.signal });
    }
    destroy() {
        // #32: AbortControllerでリスナーを確実に解除
        this.selectionAc.abort();
        this.el.remove();
    }
    toggleInlineTag(tagName) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount)
            return;
        const range = sel.getRangeAt(0);
        let node = range.commonAncestorContainer;
        // #57: TEXT_NODEの場合はparentElementで安全にHTMLElementを取得
        if (node.nodeType === Node.TEXT_NODE)
            node = node.parentElement;
        if (!node || !(node instanceof HTMLElement))
            return;
        const existing = node.closest?.(tagName);
        if (existing && existing.closest('.ce-editor')) {
            if (!existing.parentNode)
                return;
            const parent = existing.parentNode;
            while (existing.firstChild) {
                parent.insertBefore(existing.firstChild, existing);
            }
            parent.removeChild(existing);
        }
        else {
            const wrapper = document.createElement(tagName);
            const savedRange = range.cloneRange();
            // Ver.2.9 #2/#8: surroundContents失敗時のHTML構造復元+サニタイズ - 親要素のHTML保存
            const ancestor = range.commonAncestorContainer;
            const restoreTarget = ancestor.nodeType === Node.TEXT_NODE
                ? ancestor.parentElement : ancestor;
            const restoreHtml = restoreTarget?.innerHTML ?? '';
            try {
                range.surroundContents(wrapper);
                // Ver.2.9 #8: surroundContents成功後もwrapper内をサニタイズ
                wrapper.innerHTML = sanitizeHtml(wrapper.innerHTML);
            }
            catch {
                try {
                    const contents = range.extractContents();
                    wrapper.appendChild(contents);
                    // Ver.2.9 #8: extractContents経由でもサニタイズ適用
                    wrapper.innerHTML = sanitizeHtml(wrapper.innerHTML);
                    range.insertNode(wrapper);
                }
                catch {
                    // Ver.2.9 #2: HTML構造復元 - extractContentsも失敗した場合に元のHTMLをサニタイズして復元
                    if (restoreTarget) {
                        restoreTarget.innerHTML = sanitizeHtml(restoreHtml);
                    }
                    sel.removeAllRanges();
                    sel.addRange(savedRange);
                }
            }
            finally {
                // #23: 状態復元保証 - selectionが失われた場合に復元
                if (sel.rangeCount === 0) {
                    sel.addRange(savedRange);
                }
            }
        }
    }
    // Ver.2.9 #36: wrapWithLink — 選択範囲検証とURL安全性の二重チェック
    wrapWithLink(url) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount)
            return;
        const range = sel.getRangeAt(0);
        // Ver.2.9 #36: 選択範囲がエディタ内であることを確認
        const ancestor = range.commonAncestorContainer;
        const ancestorEl = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor;
        if (!ancestorEl || !ancestorEl.closest('.ce-editor'))
            return;
        const savedRange = range.cloneRange();
        const a = document.createElement('a');
        // Ver.2.9 #36: data:/vbscript:も拒否
        a.href = /^\s*(javascript|data|vbscript|about)\s*:/i.test(url) ? '' : url;
        a.rel = 'noopener noreferrer';
        try {
            range.surroundContents(a);
        }
        catch {
            try {
                const contents = range.extractContents();
                a.appendChild(contents);
                range.insertNode(a);
            }
            catch {
                // フォールバック失敗時はselectionを復元
                sel.removeAllRanges();
                sel.addRange(savedRange);
            }
        }
        finally {
            // selection が失われた場合に復元
            if (sel.rangeCount === 0) {
                sel.addRange(savedRange);
            }
        }
    }
    update() {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
            this.el.style.display = 'none';
            return;
        }
        const range = sel.getRangeAt(0);
        const ancestor = range.commonAncestorContainer;
        // #57: TEXT_NODEの場合はparentElementで安全にHTMLElementを取得
        const el = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor;
        // #116: el nullチェック + instanceof確認強化
        if (!el || !(el instanceof HTMLElement) || !el.closest('.ce-editor')) {
            this.el.style.display = 'none';
            return;
        }
        const rect = range.getBoundingClientRect();
        // Ver.2.9 #23: InlineToolbar位置 — 選択範囲が空の場合は非表示
        if (rect.width === 0 && rect.height === 0) {
            this.el.style.display = 'none';
            return;
        }
        this.el.style.display = 'flex';
        // #66: InlineToolbar position計算のviewport制限
        // Ver.2.9 #45: InlineToolbar位置計算改善 — scrollX/scrollYとvisualViewport考慮
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        let top = rect.top + scrollY - 40;
        let left = rect.left + scrollX + rect.width / 2 - this.el.offsetWidth / 2;
        // 上端制限
        if (top < scrollY)
            top = rect.bottom + scrollY + 4;
        // 左端制限
        if (left < 0)
            left = 4;
        // 右端制限
        const maxLeft = document.documentElement.clientWidth - this.el.offsetWidth - 4;
        if (left > maxLeft)
            left = maxLeft;
        // Ver.2.9 #23: 下端制限 — ビューポート下にはみ出す場合は選択範囲上に表示
        const viewportBottom = scrollY + window.innerHeight;
        if (top + 40 > viewportBottom) {
            top = rect.top + scrollY - 44;
        }
        this.el.style.top = `${top}px`;
        this.el.style.left = `${left}px`;
    }
}
// --- Editor Class ---
class Editor {
    constructor(container, tools) {
        this.blockElements = [];
        this.blockTools = [];
        this.blockTypes = [];
        // Ver.2.9 #6: 静的inlineToolbar参照をインスタンスベースに変更（競合解消）
        this.ownInlineToolbar = null;
        // #25: Undo/Redo
        this.undoManager = new UndoManager();
        this.isUndoRedoing = false;
        // #26: Drag & Drop (#78: インスタンス変数として明示宣言)
        this.dragSourceIndex = -1;
        // #27: Block clipboard (#79: インスタンス変数として明示宣言)
        this.clipboardBlock = null;
        // #11: ブロック内容変更追跡フラグ
        this.dirty = false;
        // Ver.2.9 #4: isConnected監視用インターバルID
        this.connectedCheckInterval = null;
        // Ver.2.9 #4: MutationObserver参照保持
        this.containerObserver = null;
        this.container = container;
        this.tools = { ...builtinTools, ...tools };
        this.container.classList.add('ce-editor');
        this.container.__editor = this;
        // Ver.2.9 #6: 各Editorインスタンスごとに独立したInlineToolbarを生成
        this.ownInlineToolbar = new InlineToolbar();
        _editorInlineToolbarMap.set(this.container, this.ownInlineToolbar);
        Editor.inlineToolbarRefCount++;
        // Ver.2.9 #4: isConnected監視 — DOM切断時にObserver/Intervalを自動クリーンアップ
        this.connectedCheckInterval = setInterval(() => {
            if (!this.container.isConnected) {
                this.destroy();
            }
        }, 5000);
        // Ver.2.9 #4: MutationObserverでDOM削除を即座に検知
        if (this.container.parentNode) {
            this.containerObserver = new MutationObserver(() => {
                if (!this.container.isConnected) {
                    this.destroy();
                }
            });
            this.containerObserver.observe(this.container.parentNode, { childList: true });
        }
        // #25: Keyboard shortcuts for Undo/Redo + #27: Copy/Paste
        this.container.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                }
                else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    this.redo();
                }
                else if (e.key === 'c' && !e.shiftKey) {
                    this.copyFocusedBlock(e);
                }
                else if (e.key === 'v' && !e.shiftKey) {
                    this.pasteCopiedBlock(e);
                }
            }
        });
        // #11: input/keyupでdirtyフラグを立て、focusoutで未保存チェック
        this.container.addEventListener('input', () => { this.dirty = true; });
        // #25: Save state on content changes (focusout)
        // Ver.2.9 #20: focusout重複防止 — デバウンスタイマーで集約
        let focusoutTimer = null;
        this.container.addEventListener('focusout', (e) => {
            const related = e.relatedTarget;
            // #27: toolbar操作時のセーブ遅延改善 - ce-toolbox, ce-inline-toolbar含む
            if (related && (this.container.contains(related) ||
                related.closest?.('.ce-inline-toolbar') ||
                related.closest?.('.ce-toolbox') ||
                related.closest?.('.ce-block__toolbar'))) {
                return;
            }
            // Ver.2.9 #20: 短時間に複数focusoutが発火した場合は統合
            if (focusoutTimer)
                clearTimeout(focusoutTimer);
            focusoutTimer = setTimeout(() => {
                focusoutTimer = null;
                // #11: dirtyフラグがある場合のみ保存（不要な保存回避）
                if (!this.isUndoRedoing && this.dirty) {
                    this.saveUndoState();
                    this.dirty = false;
                }
            }, 50);
        });
    }
    static create(el, config) {
        const editor = new Editor(el, config?.tools);
        if (config?.data?.blocks?.length) {
            editor.render(config.data);
        }
        else {
            editor.insertBlock('paragraph', {}, 0);
        }
        editor.saveUndoState();
        return editor;
    }
    render(data) {
        this.clear();
        // Ver.2.9 TS#35: 空blocks処理 — blocks配列のバリデーション
        const blocks = Array.isArray(data.blocks) ? data.blocks : [];
        if (blocks.length === 0) {
            this.insertBlock('paragraph', {}, 0);
            return;
        }
        blocks.forEach(block => {
            // Ver.2.9 TS#50: ブロック編集中間エラー — 無効なblock定義をスキップ
            if (!block || !block.type)
                return;
            this.insertBlock(block.type, block.data || {}, this.blockElements.length);
        });
    }
    save() {
        const blocks = [];
        for (let i = 0; i < this.blockElements.length; i++) {
            // #28: セレクタを.ce-block__content > :first-childに限定し確実化
            const contentEl = this.blockElements[i].querySelector('.ce-block__content > :first-child');
            // #61: blockTools[i]のnullチェック強化
            if (contentEl && this.blockTools[i] && typeof this.blockTools[i].save === 'function') {
                try {
                    const savedData = this.blockTools[i].save(contentEl);
                    // Ver.2.9 TS#50: ブロック編集中間エラー — save結果のnull/undefinedチェック
                    if (savedData && typeof savedData === 'object') {
                        blocks.push({
                            type: this.blockTypes[i],
                            data: savedData,
                        });
                    }
                }
                catch {
                    // #61: save失敗時はスキップしてデータ損失を防止
                    console.warn(`Block save failed at index ${i}, type: ${this.blockTypes[i]}`);
                }
            }
        }
        // Ver.2.9 TS#35: 空blocks処理 — blocksが空の場合はデフォルト段落を含める
        if (blocks.length === 0) {
            blocks.push({ type: 'paragraph', data: { text: '' } });
        }
        return {
            time: Date.now(),
            version: '1.0',
            blocks,
        };
    }
    destroy() {
        this.clear();
        // Ver.2.9 TS#49: destroy時にUndoManagerをクリアしてメモリ解放
        this.undoManager.clear();
        this.container.classList.remove('ce-editor');
        delete this.container.__editor;
        // Ver.2.9 #4: isConnected監視のインターバルをクリア
        if (this.connectedCheckInterval) {
            clearInterval(this.connectedCheckInterval);
            this.connectedCheckInterval = null;
        }
        // Ver.2.9 #4: MutationObserverを切断
        if (this.containerObserver) {
            this.containerObserver.disconnect();
            this.containerObserver = null;
        }
        // Ver.2.9 #6: インスタンス固有のInlineToolbarを破棄
        if (this.ownInlineToolbar) {
            this.ownInlineToolbar.destroy();
            _editorInlineToolbarMap.delete(this.container);
            this.ownInlineToolbar = null;
        }
        // #26: refCount<0にならないよう保護
        if (Editor.inlineToolbarRefCount > 0) {
            Editor.inlineToolbarRefCount--;
        }
    }
    insertBlock(type, data, index) {
        // #29: index負数チェック追加
        index = Math.max(0, index);
        // #72: createBlockWrapperのtype検証（ツールが存在しない場合は無視）
        const factory = this.tools[type];
        if (!factory || typeof factory !== 'function') {
            // Ver.2.9 TS#27: insertBlock未知type通知
            console.warn('insertBlock: unknown block type:', type);
            return;
        }
        const tool = factory(data);
        const blockEl = this.createBlockWrapper(type, tool);
        // #49: length参照の最適化 — ローカル変数にキャッシュ
        const len = this.blockElements.length;
        if (index >= len) {
            this.container.appendChild(blockEl);
            this.blockElements.push(blockEl);
            this.blockTools.push(tool);
            this.blockTypes.push(type);
        }
        else {
            const ref = this.blockElements[index];
            this.container.insertBefore(blockEl, ref);
            this.blockElements.splice(index, 0, blockEl);
            this.blockTools.splice(index, 0, tool);
            this.blockTypes.splice(index, 0, type);
        }
        const editable = blockEl.querySelector('[contenteditable]');
        if (editable)
            editable.focus();
        if (!this.isUndoRedoing)
            this.saveUndoState();
    }
    // Ver.2.9 #14: ブロック削除改善 — 削除後に隣接ブロックへフォーカス移動
    // Ver.2.9 TS#17: removeBlock undo状態保存 — 削除前に状態を保存
    removeBlock(index) {
        if (index < 0 || index >= this.blockElements.length)
            return;
        // Ver.2.9 TS#17: 削除前にundo状態を保存（復元可能にする）
        if (!this.isUndoRedoing)
            this.saveUndoState();
        const el = this.blockElements[index];
        // Ver.2.9 #14: 削除前にDOM接続確認
        if (el.isConnected) {
            el.remove();
        }
        this.blockElements.splice(index, 1);
        this.blockTools.splice(index, 1);
        this.blockTypes.splice(index, 1);
        if (this.blockElements.length === 0) {
            this.insertBlock('paragraph', {}, 0);
        }
        if (!this.isUndoRedoing)
            this.saveUndoState();
    }
    moveBlock(from, to) {
        // #37: moveBlock境界チェック改善（整数チェック追加）
        if (!Number.isInteger(from) || !Number.isInteger(to))
            return;
        if (from < 0 || from >= this.blockElements.length)
            return;
        if (to < 0 || to >= this.blockElements.length)
            return;
        if (from === to)
            return;
        const el = this.blockElements[from];
        const tool = this.blockTools[from];
        const type = this.blockTypes[from];
        this.blockElements.splice(from, 1);
        this.blockTools.splice(from, 1);
        this.blockTypes.splice(from, 1);
        this.blockElements.splice(to, 0, el);
        this.blockTools.splice(to, 0, tool);
        this.blockTypes.splice(to, 0, type);
        if (to >= this.blockElements.length - 1) {
            this.container.appendChild(el);
        }
        else {
            const ref = this.blockElements[to + 1];
            this.container.insertBefore(el, ref);
        }
        if (!this.isUndoRedoing)
            this.saveUndoState();
    }
    focusBlock(index) {
        if (index < 0 || index >= this.blockElements.length)
            return;
        const editable = this.blockElements[index].querySelector('[contenteditable]');
        if (editable)
            editable.focus();
    }
    getBlockIndex(blockEl) {
        return this.blockElements.indexOf(blockEl);
    }
    // --- #25: Undo/Redo ---
    saveUndoState() {
        this.undoManager.push(this.save());
    }
    // Ver.2.9 #49: Undo時にdirtyフラグをリセットしてfocusout再トリガー防止
    undo() {
        const state = this.undoManager.undo();
        if (!state)
            return;
        // #55: undo/redo中のfocus保持 — 現在のfocusインデックスを記憶
        const focusedBlock = this.container.querySelector('[contenteditable]:focus');
        let focusIdx = -1;
        if (focusedBlock) {
            const blockEl = focusedBlock.closest('.ce-block');
            if (blockEl)
                focusIdx = this.getBlockIndex(blockEl);
        }
        this.isUndoRedoing = true;
        try {
            this.render(state);
        }
        finally {
            this.isUndoRedoing = false;
            // Ver.2.9 #49: render後のdirtyフラグをリセット
            this.dirty = false;
        }
        // #55: focusを復元
        if (focusIdx >= 0 && focusIdx < this.blockElements.length) {
            this.focusBlock(focusIdx);
        }
    }
    // Ver.2.9 #49: Redo時にもdirtyフラグをリセット
    redo() {
        const state = this.undoManager.redo();
        if (!state)
            return;
        // #55: undo/redo中のfocus保持
        const focusedBlock = this.container.querySelector('[contenteditable]:focus');
        let focusIdx = -1;
        if (focusedBlock) {
            const blockEl = focusedBlock.closest('.ce-block');
            if (blockEl)
                focusIdx = this.getBlockIndex(blockEl);
        }
        this.isUndoRedoing = true;
        try {
            this.render(state);
        }
        finally {
            this.isUndoRedoing = false;
            // Ver.2.9 #49: render後のdirtyフラグをリセット
            this.dirty = false;
        }
        // #55: focusを復元
        if (focusIdx >= 0 && focusIdx < this.blockElements.length) {
            this.focusBlock(focusIdx);
        }
    }
    // --- #27: Block Copy & Paste ---
    copyFocusedBlock(e) {
        const focused = this.container.querySelector('[contenteditable]:focus');
        if (!focused)
            return;
        const blockEl = focused.closest('.ce-block');
        if (!blockEl)
            return;
        const idx = this.getBlockIndex(blockEl);
        if (idx < 0)
            return;
        // #31: テキスト範囲選択時はブラウザのデフォルトコピーを優先
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed)
            return;
        e.preventDefault();
        // #28: セレクタを.ce-block__content > :first-childに限定
        const contentEl = blockEl.querySelector('.ce-block__content > :first-child');
        if (contentEl && this.blockTools[idx]) {
            this.clipboardBlock = {
                type: this.blockTypes[idx],
                data: this.blockTools[idx].save(contentEl),
            };
        }
    }
    pasteCopiedBlock(e) {
        if (!this.clipboardBlock)
            return;
        // #27: clipboard blockのtypeチェック
        if (!this.clipboardBlock.type || !this.tools[this.clipboardBlock.type])
            return;
        // Only intercept if no text is selected (block-level paste)
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed)
            return;
        const focused = this.container.querySelector('[contenteditable]:focus');
        if (!focused)
            return;
        const blockEl = focused.closest('.ce-block');
        if (!blockEl)
            return;
        const idx = this.getBlockIndex(blockEl);
        if (idx < 0)
            return;
        e.preventDefault();
        this.insertBlock(this.clipboardBlock.type, { ...this.clipboardBlock.data }, idx + 1);
        // #81: paste block後のfocus確認（新しいブロックにfocus）
        if (idx + 1 < this.blockElements.length) {
            this.focusBlock(idx + 1);
        }
    }
    // --- Block wrapper creation ---
    createBlockWrapper(type, tool) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ce-block';
        wrapper.dataset.type = type;
        // Block toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'ce-block__toolbar';
        // #26: Drag handle (#26中: aria-label追加)
        const dragHandle = document.createElement('span');
        dragHandle.className = 'ce-btn ce-btn--drag';
        dragHandle.textContent = '\u2630';
        dragHandle.title = 'Drag to reorder';
        dragHandle.setAttribute('aria-label', 'Drag to reorder');
        dragHandle.setAttribute('role', 'button');
        dragHandle.draggable = true;
        dragHandle.addEventListener('dragstart', (e) => {
            this.dragSourceIndex = this.getBlockIndex(wrapper);
            wrapper.classList.add('ce-block--dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        dragHandle.addEventListener('dragend', () => {
            wrapper.classList.remove('ce-block--dragging');
            this.container.querySelectorAll('.ce-block--dragover').forEach(el => el.classList.remove('ce-block--dragover'));
            this.dragSourceIndex = -1;
        });
        const addBtn = document.createElement('button');
        addBtn.className = 'ce-btn ce-btn--add';
        addBtn.textContent = '+';
        addBtn.title = 'Add block';
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showToolbox(wrapper);
        });
        const moveUpBtn = document.createElement('button');
        moveUpBtn.className = 'ce-btn ce-btn--up';
        moveUpBtn.textContent = '\u25B2';
        moveUpBtn.title = 'Move up';
        moveUpBtn.addEventListener('click', () => {
            const idx = this.getBlockIndex(wrapper);
            this.moveBlock(idx, idx - 1);
        });
        const moveDownBtn = document.createElement('button');
        moveDownBtn.className = 'ce-btn ce-btn--down';
        moveDownBtn.textContent = '\u25BC';
        moveDownBtn.title = 'Move down';
        moveDownBtn.addEventListener('click', () => {
            const idx = this.getBlockIndex(wrapper);
            this.moveBlock(idx, idx + 1);
        });
        const delBtn = document.createElement('button');
        delBtn.className = 'ce-btn ce-btn--del';
        delBtn.textContent = '\u00D7';
        delBtn.title = 'Delete block';
        delBtn.addEventListener('click', () => {
            const idx = this.getBlockIndex(wrapper);
            this.removeBlock(idx);
        });
        toolbar.appendChild(dragHandle);
        toolbar.appendChild(addBtn);
        toolbar.appendChild(moveUpBtn);
        toolbar.appendChild(moveDownBtn);
        toolbar.appendChild(delBtn);
        // #26: Drop zone
        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            wrapper.classList.add('ce-block--dragover');
        });
        wrapper.addEventListener('dragleave', () => {
            wrapper.classList.remove('ce-block--dragover');
        });
        wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            wrapper.classList.remove('ce-block--dragover');
            const toIndex = this.getBlockIndex(wrapper);
            // #80: drag & dropのindex境界チェック強化
            if (this.dragSourceIndex >= 0 && this.dragSourceIndex < this.blockElements.length &&
                toIndex >= 0 && toIndex < this.blockElements.length &&
                this.dragSourceIndex !== toIndex) {
                this.moveBlock(this.dragSourceIndex, toIndex);
            }
            // #80: ドロップ後にdragSourceIndexを確実にリセット
            this.dragSourceIndex = -1;
        });
        // Content
        const content = document.createElement('div');
        content.className = 'ce-block__content';
        content.appendChild(tool.render());
        wrapper.appendChild(toolbar);
        wrapper.appendChild(content);
        return wrapper;
    }
    // #28/#29: Toolbox without prompt/confirm
    // Ver.2.9 #19: ツールボックス改善 — キーボードEscape閉じ + フォーカストラップ
    showToolbox(refBlock) {
        this.container.querySelector('.ce-toolbox')?.remove();
        const toolbox = document.createElement('div');
        toolbox.className = 'ce-toolbox';
        // #35: toolboxのキーボードアクセシビリティ（role, aria-label）
        toolbox.setAttribute('role', 'toolbar');
        toolbox.setAttribute('aria-label', 'Block type selection');
        const toolTypes = [
            { type: 'paragraph', label: i18n.t('block_text') },
            { type: 'heading', label: i18n.t('block_heading') },
            { type: 'list', label: i18n.t('block_list') },
            { type: 'code', label: i18n.t('block_code') },
            { type: 'quote', label: i18n.t('block_quote') },
            { type: 'delimiter', label: '---' },
            { type: 'image', label: i18n.t('block_image') },
        ];
        const ac = new AbortController();
        toolTypes.forEach(({ type, label }) => {
            const btn = document.createElement('button');
            btn.className = 'ce-toolbox__btn';
            btn.textContent = label;
            btn.addEventListener('click', () => {
                const idx = this.getBlockIndex(refBlock);
                let defaultData = {};
                if (type === 'heading') {
                    defaultData = { level: 2 };
                }
                else if (type === 'list') {
                    defaultData = { style: 'unordered', items: [''] };
                }
                this.insertBlock(type, defaultData, idx + 1);
                toolbox.remove();
                if (!ac.signal.aborted)
                    ac.abort();
            });
            toolbox.appendChild(btn);
        });
        refBlock.after(toolbox);
        const close = (e) => {
            if (!toolbox.contains(e.target)) {
                toolbox.remove();
                // Ver.2.9 TS#19: AbortControllerタイミング — abort前にsignal確認
                if (!ac.signal.aborted)
                    ac.abort();
            }
        };
        // Ver.2.9 #19: Escapeキーでツールボックスを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                toolbox.remove();
                if (!ac.signal.aborted)
                    ac.abort();
            }
        }, { signal: ac.signal });
        // Ver.2.9 TS#19: showToolbox AbortControllerタイミング改善 — requestAnimationFrame使用
        requestAnimationFrame(() => {
            if (!ac.signal.aborted) {
                document.addEventListener('click', close, { signal: ac.signal });
            }
        });
    }
    // #119: clear時にdirtyフラグをリセット
    // Ver.2.9 #49: Undo時のメモリ解放 — destroy時にUndoManagerをクリア
    clear() {
        this.blockElements.forEach(el => { if (el.isConnected)
            el.remove(); });
        this.blockElements = [];
        this.blockTools = [];
        this.blockTypes = [];
        this.dirty = false;
        this.container.querySelector('.ce-toolbox')?.remove();
    }
}
Editor.inlineToolbarRefCount = 0;
// --- Render blocks to HTML (for visitor view) ---
function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// Ver.2.9 #35: 空コンテンツ — 空paragraphはスキップ、data未定義時の安全処理
function renderBlocks(blocks) {
    if (!Array.isArray(blocks))
        return '';
    return blocks.map(block => {
        if (!block || !block.type)
            return '';
        const d = block.data || {};
        switch (block.type) {
            case 'paragraph': {
                const text = String(d.text || '');
                // Ver.2.9 #35: 空paragraphは空行として出力（完全除去はしない）
                return `<p>${escHtml(text)}</p>`;
            }
            case 'heading': {
                const lvl = Math.max(1, Math.min(3, Number(d.level) || 2));
                return `<h${lvl}>${escHtml(String(d.text || ''))}</h${lvl}>`;
            }
            case 'list': {
                const tag = d.style === 'ordered' ? 'ol' : 'ul';
                const items = Array.isArray(d.items) ? d.items : [];
                // Ver.2.9 #35: 空のリストアイテムをフィルタ
                return `<${tag}>${items.map(i => `<li>${escHtml(String(i ?? ''))}</li>`).join('')}</${tag}>`;
            }
            case 'code':
                return `<pre><code>${escHtml(String(d.code || ''))}</code></pre>`;
            case 'quote':
                return `<blockquote>${escHtml(String(d.text || ''))}</blockquote>`;
            case 'delimiter':
                return '<hr>';
            // #117: image alt属性にcaptionをフォールバック出力
            case 'image': {
                const url = escHtml(String(d.url || ''));
                // Ver.2.9 #44: image URL安全性チェック
                if (/^\s*(javascript|data|vbscript)\s*:/i.test(String(d.url || ''))) {
                    return `<figure><img src="" alt="${escHtml(String(d.caption || ''))}"/></figure>`;
                }
                const alt = escHtml(String(d.caption || ''));
                const cap = d.caption ? `<figcaption>${escHtml(String(d.caption))}</figcaption>` : '';
                return `<figure><img src="${url}" alt="${alt}"/>${cap}</figure>`;
            }
            default:
                return '';
        }
    }).join('\n');
}
