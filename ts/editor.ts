/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
 * Editor - Block-based content editor for Adlaire Static CMS.
 * Editor.js-like architecture implemented in pure TypeScript.
 *
 * Spec: EDITOR_RULEBOOK.md §13 (Ver.2.5 エディタ高度化仕様)
 */

// --- Types ---

interface BlockData {
    type: string;
    data: Record<string, unknown>;
}

interface EditorData {
    time: number;
    version: string;
    blocks: BlockData[];
}

interface BlockToolConfig {
    render(): HTMLElement;
    save(el: HTMLElement): Record<string, unknown>;
}

type BlockToolFactory = (data: Record<string, unknown>) => BlockToolConfig;

// --- Helper: get Editor from element ---

function getEditorFromElement(el: HTMLElement): Editor | null {
    const editorEl = el.closest('.ce-editor') as HTMLElement | null;
    if (!editorEl) return null;
    const record = editorEl as unknown as Record<string, unknown>;
    if ('__editor' in editorEl && record['__editor'] instanceof Editor) {
        return record['__editor'];
    }
    return null;
}

// --- Helper: attach Backspace handler to any contentEditable block ---

function attachBackspaceHandler(el: HTMLElement): void {
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && (el.textContent?.trim() === '')) {
            e.preventDefault();
            const editor = getEditorFromElement(el);
            if (!editor) return;
            // #12: focusout前の状態保存トリガー
            (editor as any).saveUndoState();
            const block = el.closest('.ce-block') as HTMLElement;
            const idx = editor.getBlockIndex(block);
            if (idx > 0) {
                editor.removeBlock(idx);
                editor.focusBlock(idx - 1);
            }
        }
    });
}

// --- Helper: attach Enter handler for list items ---

function attachListItemHandlers(li: HTMLLIElement): void {
    li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newLi = document.createElement('li');
            newLi.contentEditable = 'true';
            attachListItemHandlers(newLi);
            li.after(newLi);
            newLi.focus();
            const listEl = li.closest('ul, ol');
            const editor = listEl ? getEditorFromElement(listEl as HTMLElement) : getEditorFromElement(li);
            if (editor) {
                (editor as any).saveUndoState();
            }
        }
    });
}

// --- Sanitize: strip dangerous tags from block content ---

function sanitizeHtml(html: string): string {
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
    // #6: 属性値内の改行/タブを除去してからイベントハンドラを検出
    s = s.replace(/(<[^>]*?)[\r\n\t]+/gi, '$1 ');
    // #7: on\w+ 正規表現をケース非感度+属性値内特殊文字対応に強化
    s = s.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    // #8: javascript:プロトコルフィルタにユニコードエスケープ対応
    const jsProtoPattern = /(href|src)\s*=\s*["']?\s*(?:javascript|&#0*106;?|&#x0*6a;?|\\u006[aA]|\\x6[aA])\s*(?:&#0*97;?|a)?\s*(?:v|&#0*118;?|&#x0*76;?)\s*(?:a|&#0*97;?)\s*(?:s|&#0*115;?)\s*(?:c|&#0*99;?)\s*(?:r|&#0*114;?)\s*(?:i|&#0*105;?)\s*(?:p|&#0*112;?)\s*(?:t|&#0*116;?)\s*:[^"'>]*/gi;
    s = s.replace(jsProtoPattern, '$1=""');
    s = s.replace(/(href|src)\s*=\s*["']?\s*javascript\s*:[^"'>]*/gi, '$1=""');
    s = s.replace(/\s+data-\w+\s*=\s*["']?\s*javascript\s*:[^"'>]*/gi, '');
    return s;
}

// --- Undo Manager (#25) ---

class UndoManager {
    private stack: string[] = [];
    private pointer: number = -1;
    private readonly maxSize = 50;

    push(state: EditorData): void {
        const json = JSON.stringify(state);
        // #9: ホワイトスペース正規化で同一チェック
        const normalized = json.replace(/\s+/g, ' ');
        if (this.pointer >= 0) {
            const prevNormalized = this.stack[this.pointer].replace(/\s+/g, ' ');
            if (prevNormalized === normalized) return;
        }
        this.stack = this.stack.slice(0, this.pointer + 1);
        this.stack.push(json);
        if (this.stack.length > this.maxSize) this.stack.shift();
        this.pointer = this.stack.length - 1;
    }

    // #10: JSON.parseにtry-catch追加
    undo(): EditorData | null {
        if (this.pointer <= 0) return null;
        this.pointer--;
        try {
            return JSON.parse(this.stack[this.pointer]);
        } catch {
            return null;
        }
    }

    // #11: JSON.parseにtry-catch追加
    redo(): EditorData | null {
        if (this.pointer >= this.stack.length - 1) return null;
        this.pointer++;
        try {
            return JSON.parse(this.stack[this.pointer]);
        } catch {
            return null;
        }
    }
}

// --- Built-in Block Tools ---

const builtinTools: Record<string, BlockToolFactory> = {
    paragraph(data) {
        return {
            render() {
                const el = document.createElement('div');
                el.contentEditable = 'true';
                el.className = 'ce-paragraph';
                el.innerHTML = sanitizeHtml((data.text as string) || '');
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const editor = getEditorFromElement(el);
                        if (editor) {
                            const idx = editor.getBlockIndex(el.closest('.ce-block') as HTMLElement);
                            editor.insertBlock('paragraph', {}, idx + 1);
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
        let level = Math.max(1, Math.min(3, (data.level as number) || 2));
        let headingEl: HTMLElement;

        return {
            render() {
                const wrap = document.createElement('div');
                wrap.className = 'ce-heading-wrap';

                headingEl = document.createElement(`h${level}`);
                headingEl.contentEditable = 'true';
                headingEl.className = 'ce-heading';
                headingEl.innerHTML = sanitizeHtml((data.text as string) || '');
                attachBackspaceHandler(headingEl);

                const levelBtn = document.createElement('button');
                levelBtn.className = 'ce-heading__level';
                levelBtn.textContent = `H${level}`;
                levelBtn.title = 'Change heading level';
                levelBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const text = headingEl.textContent || '';
                    level = level >= 3 ? 1 : level + 1;
                    const newEl = document.createElement(`h${level}`);
                    newEl.contentEditable = 'true';
                    newEl.className = 'ce-heading';
                    newEl.textContent = text;
                    attachBackspaceHandler(newEl);
                    headingEl.replaceWith(newEl);
                    headingEl = newEl;
                    levelBtn.textContent = `H${level}`;
                    newEl.focus();
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
    list(data) {
        let style = (data.style as string) || 'unordered';
        const items = (data.items as string[]) || [''];
        let listEl: HTMLElement;

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
                    const currentItems: string[] = [];
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
                const savedItems: string[] = [];
                lis.forEach(li => savedItems.push(li.innerHTML));
                return { style, items: savedItems };
            },
        };
    },

    code(data) {
        return {
            render() {
                const pre = document.createElement('pre');
                pre.className = 'ce-code';
                const code = document.createElement('code');
                code.contentEditable = 'true';
                code.textContent = (data.code as string) || '';
                pre.appendChild(code);
                pre.addEventListener('click', () => code.focus());
                return pre;
            },
            save(el) {
                const code = el.querySelector('code');
                return { code: code?.textContent || '' };
            },
        };
    },

    quote(data) {
        return {
            render() {
                const bq = document.createElement('blockquote');
                bq.className = 'ce-quote';
                bq.contentEditable = 'true';
                bq.innerHTML = sanitizeHtml((data.text as string) || '');
                attachBackspaceHandler(bq);
                // #17: blockquote focusoutでのセーブ検知改善
                bq.addEventListener('focusout', () => {
                    const editor = getEditorFromElement(bq);
                    if (editor) {
                        (editor as any).saveUndoState();
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
                el.innerHTML = '<hr>';
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

                const img = document.createElement('img');
                const initialUrl = (data.url as string) || '';
                // #18: javascript:, data:, vbscript: プロトコル + protocol-relative URL対策
                const isDangerousUrl = (url: string): boolean =>
                    /^\s*(javascript|data|vbscript)\s*:/i.test(url) || /^\s*\/\//.test(url.trim());
                img.src = isDangerousUrl(initialUrl) ? '' : initialUrl;
                img.alt = '';
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
                cap.textContent = (data.caption as string) || '';
                const placeholderText = 'Caption...';
                cap.setAttribute('placeholder', placeholderText.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));

                wrap.appendChild(urlInput);
                wrap.appendChild(img);
                wrap.appendChild(cap);
                return wrap;
            },
            save(el) {
                const urlInput = el.querySelector<HTMLInputElement>('.ce-image__url');
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
    private el: HTMLElement;
    private selectionHandler: () => void;

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

        this.el.querySelectorAll<HTMLButtonElement>('button').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                if (!action) return;
                if (action === 'bold') {
                    this.toggleInlineTag('strong');
                } else if (action === 'italic') {
                    this.toggleInlineTag('em');
                } else if (action === 'link') {
                    const url = prompt('URL:');
                    if (url) {
                        // #22: URLバリデーション追加
                        try {
                            new URL(url, window.location.href);
                        } catch {
                            return; // 無効なURLは無視
                        }
                        this.wrapWithLink(url);
                    }
                }
            });
        });

        this.selectionHandler = () => this.update();
        document.addEventListener('selectionchange', this.selectionHandler);
    }

    destroy(): void {
        document.removeEventListener('selectionchange', this.selectionHandler);
        this.el.remove();
    }

    private toggleInlineTag(tagName: string): void {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        let node: Node | null = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        const existing = (node as HTMLElement).closest?.(tagName);

        if (existing && existing.closest('.ce-editor')) {
            if (!existing.parentNode) return;
            const parent = existing.parentNode;
            while (existing.firstChild) {
                parent.insertBefore(existing.firstChild, existing);
            }
            parent.removeChild(existing);
        } else {
            const wrapper = document.createElement(tagName);
            const savedRange = range.cloneRange();
            try {
                range.surroundContents(wrapper);
            } catch {
                try {
                    const contents = range.extractContents();
                    wrapper.appendChild(contents);
                    range.insertNode(wrapper);
                } catch {
                    // #23: finally で状態復元保証 (catch内のフォールバック)
                    sel.removeAllRanges();
                    sel.addRange(savedRange);
                }
            } finally {
                // #23: 状態復元保証 - selectionが失われた場合に復元
                if (sel.rangeCount === 0) {
                    sel.addRange(savedRange);
                }
            }
        }
    }

    private wrapWithLink(url: string): void {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        const savedRange = range.cloneRange();
        const a = document.createElement('a');
        a.href = /^\s*javascript\s*:/i.test(url) ? '' : url;
        try {
            range.surroundContents(a);
        } catch {
            try {
                const contents = range.extractContents();
                a.appendChild(contents);
                range.insertNode(a);
            } catch {
                // フォールバック失敗時はselectionを復元
                sel.removeAllRanges();
                sel.addRange(savedRange);
            }
        } finally {
            // selection が失われた場合に復元
            if (sel.rangeCount === 0) {
                sel.addRange(savedRange);
            }
        }
    }

    private update(): void {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
            this.el.style.display = 'none';
            return;
        }

        const range = sel.getRangeAt(0);
        const ancestor = range.commonAncestorContainer;
        const el = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentElement : ancestor as HTMLElement;
        if (!el || !el.closest('.ce-editor')) {
            this.el.style.display = 'none';
            return;
        }

        const rect = range.getBoundingClientRect();
        this.el.style.display = 'flex';
        this.el.style.top = `${rect.top + window.scrollY - 40}px`;
        this.el.style.left = `${rect.left + window.scrollX + rect.width / 2 - this.el.offsetWidth / 2}px`;
    }
}

// --- Editor Class ---

class Editor {
    private container: HTMLElement;
    private tools: Record<string, BlockToolFactory>;
    private blockElements: HTMLElement[] = [];
    private blockTools: BlockToolConfig[] = [];
    private blockTypes: string[] = [];
    private static inlineToolbar: InlineToolbar | null = null;
    private static inlineToolbarRefCount = 0;

    // #25: Undo/Redo
    private undoManager = new UndoManager();
    private isUndoRedoing = false;

    // #26: Drag & Drop
    private dragSourceIndex: number = -1;

    // #27: Block clipboard
    private clipboardBlock: BlockData | null = null;

    constructor(container: HTMLElement, tools?: Record<string, BlockToolFactory>) {
        this.container = container;
        this.tools = { ...builtinTools, ...tools };
        this.container.classList.add('ce-editor');
        (this.container as any).__editor = this;

        if (!Editor.inlineToolbar) {
            Editor.inlineToolbar = new InlineToolbar();
        }
        Editor.inlineToolbarRefCount++;

        // #25: Keyboard shortcuts for Undo/Redo + #27: Copy/Paste
        this.container.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    this.redo();
                } else if (e.key === 'c' && !e.shiftKey) {
                    this.copyFocusedBlock(e);
                } else if (e.key === 'v' && !e.shiftKey) {
                    this.pasteCopiedBlock(e);
                }
            }
        });

        // #25: Save state on content changes (focusout)
        this.container.addEventListener('focusout', (e) => {
            const related = (e as FocusEvent).relatedTarget as Node | null;
            // #27: toolbar操作時のセーブ遅延改善 - ce-toolbox, ce-inline-toolbar含む
            if (related && (
                this.container.contains(related) ||
                (related as HTMLElement).closest?.('.ce-inline-toolbar') ||
                (related as HTMLElement).closest?.('.ce-toolbox') ||
                (related as HTMLElement).closest?.('.ce-block__toolbar')
            )) {
                return;
            }
            if (!this.isUndoRedoing) {
                this.saveUndoState();
            }
        });
    }

    static create(el: HTMLElement, config?: { tools?: Record<string, BlockToolFactory>; data?: EditorData }): Editor {
        const editor = new Editor(el, config?.tools);
        if (config?.data?.blocks?.length) {
            editor.render(config.data);
        } else {
            editor.insertBlock('paragraph', {}, 0);
        }
        editor.saveUndoState();
        return editor;
    }

    render(data: EditorData): void {
        this.clear();
        data.blocks.forEach(block => {
            this.insertBlock(block.type, block.data, this.blockElements.length);
        });
    }

    save(): EditorData {
        const blocks: BlockData[] = [];
        for (let i = 0; i < this.blockElements.length; i++) {
            // #28: セレクタを.ce-block__content > :first-childに限定し確実化
            const contentEl = this.blockElements[i].querySelector('.ce-block__content > :first-child') as HTMLElement;
            if (contentEl && this.blockTools[i]) {
                blocks.push({
                    type: this.blockTypes[i],
                    data: this.blockTools[i].save(contentEl),
                });
            }
        }
        return {
            time: Date.now(),
            version: '1.0',
            blocks,
        };
    }

    destroy(): void {
        this.clear();
        this.container.classList.remove('ce-editor');
        delete (this.container as any).__editor;
        // #26: refCount<0にならないよう保護
        if (Editor.inlineToolbarRefCount > 0) {
            Editor.inlineToolbarRefCount--;
        }
        if (Editor.inlineToolbarRefCount <= 0 && Editor.inlineToolbar) {
            Editor.inlineToolbar.destroy();
            Editor.inlineToolbar = null;
            Editor.inlineToolbarRefCount = 0;
        }
    }

    insertBlock(type: string, data: Record<string, unknown>, index: number): void {
        // #29: index負数チェック追加
        index = Math.max(0, index);
        const factory = this.tools[type];
        if (!factory) return;

        const tool = factory(data);
        const blockEl = this.createBlockWrapper(type, tool);

        if (index >= this.blockElements.length) {
            this.container.appendChild(blockEl);
            this.blockElements.push(blockEl);
            this.blockTools.push(tool);
            this.blockTypes.push(type);
        } else {
            const ref = this.blockElements[index];
            this.container.insertBefore(blockEl, ref);
            this.blockElements.splice(index, 0, blockEl);
            this.blockTools.splice(index, 0, tool);
            this.blockTypes.splice(index, 0, type);
        }

        const editable = blockEl.querySelector('[contenteditable]') as HTMLElement;
        if (editable) editable.focus();

        if (!this.isUndoRedoing) this.saveUndoState();
    }

    removeBlock(index: number): void {
        if (index < 0 || index >= this.blockElements.length) return;
        this.blockElements[index].remove();
        this.blockElements.splice(index, 1);
        this.blockTools.splice(index, 1);
        this.blockTypes.splice(index, 1);

        if (this.blockElements.length === 0) {
            this.insertBlock('paragraph', {}, 0);
        }

        if (!this.isUndoRedoing) this.saveUndoState();
    }

    moveBlock(from: number, to: number): void {
        if (from < 0 || from >= this.blockElements.length) return;
        if (to < 0 || to >= this.blockElements.length) return;
        if (from === to) return;

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
        } else {
            const ref = this.blockElements[to + 1];
            this.container.insertBefore(el, ref);
        }

        if (!this.isUndoRedoing) this.saveUndoState();
    }

    focusBlock(index: number): void {
        if (index < 0 || index >= this.blockElements.length) return;
        const editable = this.blockElements[index].querySelector('[contenteditable]') as HTMLElement;
        if (editable) editable.focus();
    }

    getBlockIndex(blockEl: HTMLElement): number {
        return this.blockElements.indexOf(blockEl);
    }

    // --- #25: Undo/Redo ---

    private saveUndoState(): void {
        this.undoManager.push(this.save());
    }

    private undo(): void {
        const state = this.undoManager.undo();
        if (!state) return;
        this.isUndoRedoing = true;
        try {
            this.render(state);
        } finally {
            this.isUndoRedoing = false;
        }
    }

    private redo(): void {
        const state = this.undoManager.redo();
        if (!state) return;
        this.isUndoRedoing = true;
        try {
            this.render(state);
        } finally {
            this.isUndoRedoing = false;
        }
    }

    // --- #27: Block Copy & Paste ---

    private copyFocusedBlock(e: KeyboardEvent): void {
        const focused = this.container.querySelector('[contenteditable]:focus');
        if (!focused) return;
        const blockEl = focused.closest('.ce-block') as HTMLElement;
        if (!blockEl) return;
        const idx = this.getBlockIndex(blockEl);
        if (idx < 0) return;

        // #31: テキスト範囲選択時はブラウザのデフォルトコピーを優先
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) return;

        e.preventDefault();
        // #28: セレクタを.ce-block__content > :first-childに限定
        const contentEl = blockEl.querySelector('.ce-block__content > :first-child') as HTMLElement;
        if (contentEl && this.blockTools[idx]) {
            this.clipboardBlock = {
                type: this.blockTypes[idx],
                data: this.blockTools[idx].save(contentEl),
            };
        }
    }

    private pasteCopiedBlock(e: KeyboardEvent): void {
        if (!this.clipboardBlock) return;

        // Only intercept if no text is selected (block-level paste)
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) return;

        const focused = this.container.querySelector('[contenteditable]:focus');
        if (!focused) return;
        const blockEl = focused.closest('.ce-block') as HTMLElement;
        if (!blockEl) return;
        const idx = this.getBlockIndex(blockEl);
        if (idx < 0) return;

        e.preventDefault();
        this.insertBlock(
            this.clipboardBlock.type,
            { ...this.clipboardBlock.data },
            idx + 1,
        );
    }

    // --- Block wrapper creation ---

    private createBlockWrapper(type: string, tool: BlockToolConfig): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'ce-block';
        wrapper.dataset.type = type;

        // Block toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'ce-block__toolbar';

        // #26: Drag handle
        const dragHandle = document.createElement('span');
        dragHandle.className = 'ce-btn ce-btn--drag';
        dragHandle.textContent = '\u2630';
        dragHandle.title = 'Drag to reorder';
        dragHandle.draggable = true;
        dragHandle.addEventListener('dragstart', (e) => {
            this.dragSourceIndex = this.getBlockIndex(wrapper);
            wrapper.classList.add('ce-block--dragging');
            e.dataTransfer!.effectAllowed = 'move';
        });
        dragHandle.addEventListener('dragend', () => {
            wrapper.classList.remove('ce-block--dragging');
            this.container.querySelectorAll('.ce-block--dragover').forEach(el =>
                el.classList.remove('ce-block--dragover')
            );
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
            e.dataTransfer!.dropEffect = 'move';
            wrapper.classList.add('ce-block--dragover');
        });
        wrapper.addEventListener('dragleave', () => {
            wrapper.classList.remove('ce-block--dragover');
        });
        wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            wrapper.classList.remove('ce-block--dragover');
            const toIndex = this.getBlockIndex(wrapper);
            if (this.dragSourceIndex >= 0 && this.dragSourceIndex !== toIndex) {
                this.moveBlock(this.dragSourceIndex, toIndex);
            }
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
    private showToolbox(refBlock: HTMLElement): void {
        this.container.querySelector('.ce-toolbox')?.remove();

        const toolbox = document.createElement('div');
        toolbox.className = 'ce-toolbox';

        const toolTypes: { type: string; label: string }[] = [
            { type: 'paragraph', label: i18n.t('block_text') },
            { type: 'heading', label: i18n.t('block_heading') },
            { type: 'list', label: i18n.t('block_list') },
            { type: 'code', label: i18n.t('block_code') },
            { type: 'quote', label: i18n.t('block_quote') },
            { type: 'delimiter', label: '---' },
            { type: 'image', label: i18n.t('block_image') },
        ];

        toolTypes.forEach(({ type, label }) => {
            const btn = document.createElement('button');
            btn.className = 'ce-toolbox__btn';
            btn.textContent = label;
            btn.addEventListener('click', () => {
                const idx = this.getBlockIndex(refBlock);
                let defaultData: Record<string, unknown> = {};
                if (type === 'heading') {
                    defaultData = { level: 2 };
                } else if (type === 'list') {
                    defaultData = { style: 'unordered', items: [''] };
                }
                this.insertBlock(type, defaultData, idx + 1);
                toolbox.remove();
                ac.abort();
            });
            toolbox.appendChild(btn);
        });

        const ac = new AbortController();

        refBlock.after(toolbox);
        const close = (e: MouseEvent) => {
            if (!toolbox.contains(e.target as Node)) {
                toolbox.remove();
                ac.abort();
            }
        };
        setTimeout(() => document.addEventListener('click', close, { signal: ac.signal }), 0);
    }

    private clear(): void {
        this.blockElements.forEach(el => el.remove());
        this.blockElements = [];
        this.blockTools = [];
        this.blockTypes = [];
        this.container.querySelector('.ce-toolbox')?.remove();
    }
}

// --- Render blocks to HTML (for visitor view) ---

function escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderBlocks(blocks: BlockData[]): string {
    return blocks.map(block => {
        const d = block.data;
        switch (block.type) {
            case 'paragraph':
                return `<p>${escHtml(String(d.text || ''))}</p>`;
            case 'heading': {
                const lvl = Math.max(1, Math.min(3, Number(d.level) || 2));
                return `<h${lvl}>${escHtml(String(d.text || ''))}</h${lvl}>`;
            }
            case 'list': {
                const tag = d.style === 'ordered' ? 'ol' : 'ul';
                const items = (d.items as string[]) || [];
                return `<${tag}>${items.map(i => `<li>${escHtml(String(i))}</li>`).join('')}</${tag}>`;
            }
            case 'code':
                return `<pre><code>${escHtml(String(d.code || ''))}</code></pre>`;
            case 'quote':
                return `<blockquote>${escHtml(String(d.text || ''))}</blockquote>`;
            case 'delimiter':
                return '<hr>';
            case 'image': {
                const url = escHtml(String(d.url || ''));
                const cap = d.caption ? `<figcaption>${escHtml(String(d.caption))}</figcaption>` : '';
                return `<figure><img src="${url}" alt=""/>${cap}</figure>`;
            }
            default:
                return '';
        }
    }).join('\n');
}
