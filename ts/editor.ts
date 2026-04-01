/**
 * Editor - Block-based content editor for Adlaire Platform.
 * Editor.js-like architecture implemented in pure TypeScript.
 *
 * Spec: RULEBOOK.md Section 6.2
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

// --- Built-in Block Tools ---

const builtinTools: Record<string, BlockToolFactory> = {
    paragraph(data) {
        return {
            render() {
                const el = document.createElement('div');
                el.contentEditable = 'true';
                el.className = 'ce-paragraph';
                el.innerHTML = (data.text as string) || '';
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
                return el;
            },
            save(el) {
                return { text: el.innerHTML };
            },
        };
    },

    heading(data) {
        const level = (data.level as number) || 2;
        return {
            render() {
                const el = document.createElement(`h${level}`);
                el.contentEditable = 'true';
                el.className = 'ce-heading';
                el.innerHTML = (data.text as string) || '';
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
                code.textContent = (data.code as string) || '';
                pre.appendChild(code);
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
                bq.innerHTML = (data.text as string) || '';
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
                wrap.appendChild(img);
                if (data.caption) {
                    const cap = document.createElement('figcaption');
                    cap.contentEditable = 'true';
                    cap.textContent = data.caption as string;
                    wrap.appendChild(cap);
                }
                return wrap;
            },
            save(el) {
                const img = el.querySelector('img');
                const cap = el.querySelector('figcaption');
                return {
                    url: img?.src || '',
                    caption: cap?.textContent || '',
                };
            },
        };
    },
};

// --- Editor Class ---

class Editor {
    private container: HTMLElement;
    private tools: Record<string, BlockToolFactory>;
    private blockElements: HTMLElement[] = [];
    private blockTools: BlockToolConfig[] = [];
    private blockTypes: string[] = [];

    constructor(container: HTMLElement, tools?: Record<string, BlockToolFactory>) {
        this.container = container;
        this.tools = { ...builtinTools, ...tools };
        this.container.classList.add('ce-editor');
        (this.container as any).__editor = this;
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

        // Ensure at least one block
        if (this.blockElements.length === 0) {
            this.insertBlock('paragraph', {}, 0);
        }
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
        addBtn.addEventListener('click', () => {
            this.showToolbox(wrapper);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'ce-btn ce-btn--del';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => {
            const idx = this.getBlockIndex(wrapper);
            this.removeBlock(idx);
        });

        toolbar.appendChild(addBtn);
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
        // Remove existing toolbox
        this.container.querySelector('.ce-toolbox')?.remove();

        const toolbox = document.createElement('div');
        toolbox.className = 'ce-toolbox';

        const toolTypes: { type: string; label: string }[] = [
            { type: 'paragraph', label: 'Text' },
            { type: 'heading', label: 'Heading' },
            { type: 'list', label: 'List' },
            { type: 'code', label: 'Code' },
            { type: 'quote', label: 'Quote' },
            { type: 'delimiter', label: '---' },
            { type: 'image', label: 'Image' },
        ];

        toolTypes.forEach(({ type, label }) => {
            const btn = document.createElement('button');
            btn.className = 'ce-toolbox__btn';
            btn.textContent = label;
            btn.addEventListener('click', () => {
                const idx = this.getBlockIndex(refBlock);
                const defaultData = type === 'heading' ? { level: 2 } : {};
                this.insertBlock(type, defaultData, idx + 1);
                toolbox.remove();
            });
            toolbox.appendChild(btn);
        });

        refBlock.after(toolbox);

        // Close on outside click
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
                const lvl = d.level || 2;
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
