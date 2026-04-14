/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
 * Public - Public page entry point for Adlaire Static CMS.
 * Provides rendering functions for published pages (visitor view).
 */

import { markdownToHtml } from './markdown.ts';
import { renderBlocks, renderPortableText, sanitizeHtml, escHtml, type PortableTextNode } from './editor.ts';

// Expose globals for PHP theme templates
(window as unknown as Record<string, unknown>).markdownToHtml = markdownToHtml;
(window as unknown as Record<string, unknown>).renderBlocks = renderBlocks;
(window as unknown as Record<string, unknown>).renderPortableText = renderPortableText;
(window as unknown as Record<string, unknown>).sanitizeHtml = sanitizeHtml;
(window as unknown as Record<string, unknown>).escHtml = escHtml;

// Render all .pt-content elements on page load
(function renderPTOnLoad(): void {
    document.querySelectorAll<HTMLElement>('.pt-content').forEach(el => {
        let raw = el.dataset.body || '';
        const b64 = el.dataset.bodyB64;
        if (b64) {
            try { raw = new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))); } catch { /* ignore */ }
        }
        if (!raw) return;
        try {
            const body = JSON.parse(raw) as PortableTextNode[];
            if (Array.isArray(body)) {
                el.innerHTML = sanitizeHtml(renderPortableText(body));
            }
        } catch { /* ignore */ }
    });
})();
