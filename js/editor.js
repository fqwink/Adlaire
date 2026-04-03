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
// --- Helper: get Editor from element ---
function getEditorFromElement(el) {
    const editorEl = el.closest('.ce-editor');
    return editorEl ? editorEl.__editor ?? null : null;
}
// --- Helper: attach Backspace handler to any contentEditable block ---
function attachBackspaceHandler(el) {
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && (el.textContent?.trim() === '')) {
            e.preventDefault();
            const editor = getEditorFromElement(el);
            if (!editor)
                return;
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
function attachListItemHandlers(li) {
    li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
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
    });
}
// --- Sanitize: strip dangerous tags from block content ---
function sanitizeHtml(html) {
    let s = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    s = s.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
    s = s.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
    s = s.replace(/<embed\b[^>]*\/?>/gi, '');
    s = s.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '');
    s = s.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '');
    s = s.replace(/<input\b[^>]*\/?>/gi, '');
    s = s.replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, '');
    s = s.replace(/<meta\b[^>]*\/?>/gi, '');
    s = s.replace(/<base\b[^>]*\/?>/gi, '');
    s = s.replace(/<link\b[^>]*\/?>/gi, '');
    s = s.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    s = s.replace(/(href|src)\s*=\s*["']?\s*javascript\s*:[^"'>]*/gi, '$1=""');
    s = s.replace(/\s+data-\w+\s*=\s*["']?\s*javascript\s*:[^"'>]*/gi, '');
    return s;
}
// --- Undo Manager (#25) ---
class UndoManager {
    constructor() {
        this.stack = [];
        this.pointer = -1;
        this.maxSize = 50;
    }
    push(state) {
        const json = JSON.stringify(state);
        if (this.pointer >= 0 && this.stack[this.pointer] === json)
            return;
        this.stack = this.stack.slice(0, this.pointer + 1);
        this.stack.push(json);
        if (this.stack.length > this.maxSize)
            this.stack.shift();
        this.pointer = this.stack.length - 1;
    }
    undo() {
        if (this.pointer <= 0)
            return null;
        this.pointer--;
        return JSON.parse(this.stack[this.pointer]);
    }
    redo() {
        if (this.pointer >= this.stack.length - 1)
            return null;
        this.pointer++;
        return JSON.parse(this.stack[this.pointer]);
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
                            const idx = editor.getBlockIndex(el.closest('.ce-block'));
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
        let style = data.style || 'unordered';
        const items = data.items || [''];
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
                    const currentItems = [];
                    listEl.querySelectorAll('li').forEach(li => currentItems.push(li.innerHTML));
                    style = style === 'ordered' ? 'unordered' : 'ordered';
                    const newTag = style === 'ordered' ? 'ol' : 'ul';
                    const newEl = document.createElement(newTag);
                    newEl.className = 'ce-list';
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
                const savedItems = [];
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
                code.textContent = data.code || '';
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
                bq.innerHTML = sanitizeHtml(data.text || '');
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
                const initialUrl = data.url || '';
                img.src = /^\s*javascript\s*:/i.test(initialUrl) ? '' : initialUrl;
                img.alt = '';
                const urlInput = document.createElement('input');
                urlInput.type = 'text';
                urlInput.className = 'ce-image__url';
                urlInput.placeholder = 'Image URL...';
                urlInput.value = initialUrl;
                urlInput.addEventListener('input', () => {
                    const val = urlInput.value;
                    img.src = /^\s*javascript\s*:/i.test(val) ? '' : val;
                });
                const cap = document.createElement('figcaption');
                cap.contentEditable = 'true';
                cap.textContent = data.caption || '';
                cap.setAttribute('placeholder', 'Caption...');
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
        this.el.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                if (action === 'bold') {
                    this.toggleInlineTag('strong');
                }
                else if (action === 'italic') {
                    this.toggleInlineTag('em');
                }
                else if (action === 'link') {
                    const url = prompt('URL:');
                    if (url)
                        this.wrapWithLink(url);
                }
            });
        });
        this.selectionHandler = () => this.update();
        document.addEventListener('selectionchange', this.selectionHandler);
    }
    destroy() {
        document.removeEventListener('selectionchange', this.selectionHandler);
        this.el.remove();
    }
    toggleInlineTag(tagName) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount)
            return;
        const range = sel.getRangeAt(0);
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE)
            node = node.parentNode;
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
            try {
                range.surroundContents(wrapper);
            }
            catch {
                try {
                    const contents = range.extractContents();
                    wrapper.appendChild(contents);
                    range.insertNode(wrapper);
                }
                catch {
                    sel.removeAllRanges();
                    sel.addRange(savedRange);
                }
            }
        }
    }
    wrapWithLink(url) {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount)
            return;
        const range = sel.getRangeAt(0);
        const a = document.createElement('a');
        a.href = /^\s*javascript\s*:/i.test(url) ? '' : url;
        try {
            range.surroundContents(a);
        }
        catch {
            const contents = range.extractContents();
            a.appendChild(contents);
            range.insertNode(a);
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
    constructor(container, tools) {
        this.blockElements = [];
        this.blockTools = [];
        this.blockTypes = [];
        // #25: Undo/Redo
        this.undoManager = new UndoManager();
        this.isUndoRedoing = false;
        // #26: Drag & Drop
        this.dragSourceIndex = -1;
        // #27: Block clipboard
        this.clipboardBlock = null;
        this.container = container;
        this.tools = { ...builtinTools, ...tools };
        this.container.classList.add('ce-editor');
        this.container.__editor = this;
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
        // #25: Save state on content changes (focusout)
        this.container.addEventListener('focusout', (e) => {
            const related = e.relatedTarget;
            if (related && (this.container.contains(related) || related.closest?.('.ce-inline-toolbar'))) {
                return;
            }
            if (!this.isUndoRedoing) {
                this.saveUndoState();
            }
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
        data.blocks.forEach(block => {
            this.insertBlock(block.type, block.data, this.blockElements.length);
        });
    }
    save() {
        const blocks = [];
        for (let i = 0; i < this.blockElements.length; i++) {
            const contentEl = this.blockElements[i].querySelector('.ce-block__content')?.firstElementChild;
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
    destroy() {
        this.clear();
        this.container.classList.remove('ce-editor');
        delete this.container.__editor;
        Editor.inlineToolbarRefCount--;
        if (Editor.inlineToolbarRefCount <= 0 && Editor.inlineToolbar) {
            Editor.inlineToolbar.destroy();
            Editor.inlineToolbar = null;
            Editor.inlineToolbarRefCount = 0;
        }
    }
    insertBlock(type, data, index) {
        const factory = this.tools[type];
        if (!factory)
            return;
        const tool = factory(data);
        const blockEl = this.createBlockWrapper(type, tool);
        if (index >= this.blockElements.length) {
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
    removeBlock(index) {
        if (index < 0 || index >= this.blockElements.length)
            return;
        this.blockElements[index].remove();
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
    undo() {
        const state = this.undoManager.undo();
        if (!state)
            return;
        this.isUndoRedoing = true;
        try {
            this.render(state);
        }
        finally {
            this.isUndoRedoing = false;
        }
    }
    redo() {
        const state = this.undoManager.redo();
        if (!state)
            return;
        this.isUndoRedoing = true;
        try {
            this.render(state);
        }
        finally {
            this.isUndoRedoing = false;
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
        // Only intercept if no text is selected (block-level copy)
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed)
            return;
        e.preventDefault();
        const contentEl = blockEl.querySelector('.ce-block__content')?.firstElementChild;
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
    }
    // --- Block wrapper creation ---
    createBlockWrapper(type, tool) {
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
    showToolbox(refBlock) {
        this.container.querySelector('.ce-toolbox')?.remove();
        const toolbox = document.createElement('div');
        toolbox.className = 'ce-toolbox';
        const toolTypes = [
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
                let defaultData = {};
                if (type === 'heading') {
                    defaultData = { level: 2 };
                }
                else if (type === 'list') {
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
        const close = (e) => {
            if (!toolbox.contains(e.target)) {
                toolbox.remove();
                ac.abort();
            }
        };
        setTimeout(() => document.addEventListener('click', close, { signal: ac.signal }), 0);
    }
    clear() {
        this.blockElements.forEach(el => el.remove());
        this.blockElements = [];
        this.blockTools = [];
        this.blockTypes = [];
        this.container.querySelector('.ce-toolbox')?.remove();
    }
}
Editor.inlineToolbar = null;
Editor.inlineToolbarRefCount = 0;
// --- Render blocks to HTML (for visitor view) ---
function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function renderBlocks(blocks) {
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
                const items = d.items || [];
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
