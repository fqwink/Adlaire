/**
 * Editor - Block-based content editor for Adlaire Platform.
 * Editor.js-like architecture implemented in pure TypeScript.
 *
 * Spec: RULEBOOK.md Section 6.3
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

// --- Helper: attach Backspace handler to any contentEditable block ---

function attachBackspaceHandler(el: HTMLElement): void {
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && el.textContent === '') {
            e.preventDefault();
            const editor = (el.closest('.ce-editor') as HTMLElement)?.__editor;
            if (!editor) return;
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
        }
    });
}

// --- Sanitize: strip script tags from block content ---

function sanitizeHtml(html: string): string {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
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
                        const editor = (el.closest('.ce-editor') as HTMLElement)?.__editor;
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

    heading(data) {
        const rawLevel = (data.level as number) || 2;
        const level = Math.max(1, Math.min(3, rawLevel));
        return {
            render() {
                const el = document.createElement(`h${level}`);
                el.contentEditable = 'true';
                el.className = 'ce-heading';
                el.innerHTML = sanitizeHtml((data.text as string) || '');
                attachBackspaceHandler(el);
                return el;
            },
            save(el) {
                return { text: el.innerHTML, level };
            },
        };
    },

    list(data) {
        const style = (data.style as string) || 'unordered';
        const items = (data.items as string[]) || [''];
        return {
            render() {
                const tag = style === 'ordered' ? 'ol' : 'ul';
                const el = document.createElement(tag);
                el.className = 'ce-list';
                items.forEach(item => {
                    const li = document.createElement('li');
                    li.contentEditable = 'true';
                    li.innerHTML = item;
                    attachListItemHandlers(li);
                    el.appendChild(li);
                });
                return el;
            },
            save(el) {
                const lis = el.querySelectorAll('li');
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
                code.style.whiteSpace = 'pre-wrap';
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
                img.src = (data.url as string) || '';
                img.alt = '';

                // URL input for editing
                const urlInput = document.createElement('input');
                urlInput.type = 'text';
                urlInput.className = 'ce-image__url';
                urlInput.placeholder = 'Image URL...';
                urlInput.value = (data.url as string) || '';
                urlInput.addEventListener('input', () => {
                    img.src = urlInput.value;
                });

                const cap = document.createElement('figcaption');
                cap.contentEditable = 'true';
                cap.textContent = (data.caption as string) || '';
                cap.setAttribute('placeholder', 'Caption...');

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

// --- Inline Toolbar ---

class InlineToolbar {
    private el: HTMLElement;

    constructor() {
        this.el = document.createElement('div');
        this.el.className = 'ce-inline-toolbar';
        this.el.innerHTML = `
            <button data-cmd="bold" title="Bold"><b>B</b></button>
            <button data-cmd="italic" title="Italic"><i>I</i></button>
            <button data-cmd="createLink" title="Link">🔗</button>
        `;
        this.el.style.display = 'none';
        document.body.appendChild(this.el);

        this.el.querySelectorAll<HTMLButtonElement>('button').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const cmd = btn.dataset.cmd!;
                if (cmd === 'createLink') {
                    const url = prompt('URL:');
                    if (url) document.execCommand(cmd, false, url);
                } else {
                    document.execCommand(cmd);
                }
            });
        });

        document.addEventListener('selectionchange', () => this.update());
    }

    private update(): void {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
            this.el.style.display = 'none';
            return;
        }

        const range = sel.getRangeAt(0);
        const ancestor = range.commonAncestorContainer as HTMLElement;
        if (!ancestor.closest?.('.ce-editor') && !(ancestor.parentElement?.closest('.ce-editor'))) {
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

    constructor(container: HTMLElement, tools?: Record<string, BlockToolFactory>) {
        this.container = container;
        this.tools = { ...builtinTools, ...tools };
        this.container.classList.add('ce-editor');
        (this.container as any).__editor = this;

        if (!Editor.inlineToolbar) {
            Editor.inlineToolbar = new InlineToolbar();
        }
    }

    static create(el: HTMLElement, config?: { tools?: Record<string, BlockToolFactory>; data?: EditorData }): Editor {
        const editor = new Editor(el, config?.tools);
        if (config?.data?.blocks?.length) {
            editor.render(config.data);
        } else {
            editor.insertBlock('paragraph', {}, 0);
        }
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
            const contentEl = this.blockElements[i].querySelector('.ce-block__content')?.firstElementChild as HTMLElement;
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
    }

    insertBlock(type: string, data: Record<string, unknown>, index: number): void {
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

        // Focus new block
        const editable = blockEl.querySelector('[contenteditable]') as HTMLElement;
        if (editable) editable.focus();
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

        // Re-render DOM order
        if (to >= this.blockElements.length - 1) {
            this.container.appendChild(el);
        } else {
            const ref = this.blockElements[to + 1];
            this.container.insertBefore(el, ref);
        }
    }

    focusBlock(index: number): void {
        if (index < 0 || index >= this.blockElements.length) return;
        const editable = this.blockElements[index].querySelector('[contenteditable]') as HTMLElement;
        if (editable) editable.focus();
    }

    getBlockIndex(blockEl: HTMLElement): number {
        return this.blockElements.indexOf(blockEl);
    }

    private createBlockWrapper(type: string, tool: BlockToolConfig): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'ce-block';
        wrapper.dataset.type = type;

        // Block toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'ce-block__toolbar';

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
        moveUpBtn.textContent = '▲';
        moveUpBtn.title = 'Move up';
        moveUpBtn.addEventListener('click', () => {
            const idx = this.getBlockIndex(wrapper);
            this.moveBlock(idx, idx - 1);
        });

        const moveDownBtn = document.createElement('button');
        moveDownBtn.className = 'ce-btn ce-btn--down';
        moveDownBtn.textContent = '▼';
        moveDownBtn.title = 'Move down';
        moveDownBtn.addEventListener('click', () => {
            const idx = this.getBlockIndex(wrapper);
            this.moveBlock(idx, idx + 1);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'ce-btn ce-btn--del';
        delBtn.textContent = '×';
        delBtn.title = 'Delete block';
        delBtn.addEventListener('click', () => {
            const idx = this.getBlockIndex(wrapper);
            this.removeBlock(idx);
        });

        toolbar.appendChild(addBtn);
        toolbar.appendChild(moveUpBtn);
        toolbar.appendChild(moveDownBtn);
        toolbar.appendChild(delBtn);

        // Content
        const content = document.createElement('div');
        content.className = 'ce-block__content';
        content.appendChild(tool.render());

        wrapper.appendChild(toolbar);
        wrapper.appendChild(content);
        return wrapper;
    }

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
                    const level = prompt('Heading level (1-3):', '2');
                    defaultData = { level: Math.max(1, Math.min(3, parseInt(level || '2', 10))) };
                } else if (type === 'list') {
                    const style = confirm('Ordered list? (OK=ordered, Cancel=unordered)') ? 'ordered' : 'unordered';
                    defaultData = { style, items: [''] };
                }
                this.insertBlock(type, defaultData, idx + 1);
                toolbox.remove();
            });
            toolbox.appendChild(btn);
        });

        refBlock.after(toolbox);

        const close = (e: MouseEvent) => {
            if (!toolbox.contains(e.target as Node)) {
                toolbox.remove();
                document.removeEventListener('click', close);
            }
        };
        setTimeout(() => document.addEventListener('click', close), 0);
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
                return `<p>${d.text || ''}</p>`;
            case 'heading': {
                const lvl = Math.max(1, Math.min(3, Number(d.level) || 2));
                return `<h${lvl}>${d.text || ''}</h${lvl}>`;
            }
            case 'list': {
                const tag = d.style === 'ordered' ? 'ol' : 'ul';
                const items = (d.items as string[]) || [];
                return `<${tag}>${items.map(i => `<li>${i}</li>`).join('')}</${tag}>`;
            }
            case 'code':
                return `<pre><code>${escHtml(String(d.code || ''))}</code></pre>`;
            case 'quote':
                return `<blockquote>${d.text || ''}</blockquote>`;
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
