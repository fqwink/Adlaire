/**
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

    function resize(): void {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight + extra;
        textarea.style.height = Math.max(scrollHeight, minHeight) + 'px';
    }

    textarea.addEventListener('input', resize);
    window.addEventListener('resize', resize);

    // Initial resize
    resize();

    // Cleanup on remove (via custom event)
    textarea.addEventListener('autosize:destroy', () => {
        textarea.style.overflow = savedOverflow;
        textarea.style.resize = '';
        textarea.removeEventListener('input', resize);
        window.removeEventListener('resize', resize);
        delete textarea.dataset.autosize;
    }, { once: true });
}
