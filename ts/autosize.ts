/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
 * Autosize - Auto-resize textarea to fit content.
 * Vanilla TypeScript replacement for jQuery autosize plugin.
 */

function autosize(textarea: HTMLTextAreaElement): void {
    if (textarea.dataset.autosize === 'true') return;
    textarea.dataset.autosize = 'true';

    const style = window.getComputedStyle(textarea);
    const boxSizing = style.boxSizing;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderBottom = parseFloat(style.borderBottomWidth) || 0;

    const extra = boxSizing === 'border-box'
        ? borderTop + borderBottom
        : -(paddingTop + paddingBottom);

    const minHeight = parseFloat(style.minHeight) || 0;

    const savedOverflow = textarea.style.overflow;
    textarea.style.overflow = 'hidden';
    textarea.style.resize = 'none';

    const ac = new AbortController();

    function resize(): void {
        textarea.style.overflowY = 'hidden';
        textarea.style.height = '0';
        const scrollHeight = textarea.scrollHeight + extra;
        textarea.style.height = Math.max(scrollHeight, minHeight) + 'px';
    }

    textarea.addEventListener('input', resize, { signal: ac.signal });
    window.addEventListener('resize', resize, { signal: ac.signal });

    resize();

    // #3: MutationObserver to detect DOM removal and abort listeners
    const observer = new MutationObserver(() => {
        if (!textarea.isConnected) {
            ac.abort();
            observer.disconnect();
        }
    });
    if (textarea.parentNode) {
        observer.observe(textarea.parentNode, { childList: true });
    }

    // #4: WeakRef-based GC guard for destroy event not firing
    const weakRef = new WeakRef(textarea);
    const gcCheckInterval = setInterval(() => {
        if (!weakRef.deref()) {
            ac.abort();
            observer.disconnect();
            clearInterval(gcCheckInterval);
        }
    }, 5000);

    textarea.addEventListener('autosize:destroy', () => {
        ac.abort();
        observer.disconnect();
        clearInterval(gcCheckInterval);
        textarea.style.overflow = savedOverflow;
        textarea.style.resize = '';
        delete textarea.dataset.autosize;
    }, { once: true });
}
