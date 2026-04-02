"use strict";
/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
 * API - REST API client for Adlaire Static CMS.
 * Provides typed methods for page CRUD and revision management.
 *
 * Requires: csrfToken global variable set by PHP.
 */
function updateCsrfFromResponse(res) {
    const newToken = res.headers.get('X-CSRF-Token');
    if (newToken) {
        window.csrfToken = newToken;
    }
}
const api = {
    /**
     * List all pages (metadata only, no content).
     */
    async listPages() {
        const res = await fetch('index.php?api=pages');
        if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
        }
        const json = await res.json();
        return json.pages;
    },
    /**
     * Get a single page with full content and metadata.
     */
    async getPage(slug) {
        const res = await fetch(`index.php?api=pages&slug=${encodeURIComponent(slug)}`);
        if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
        }
        const json = await res.json();
        return json.data;
    },
    /**
     * Create or update a page.
     */
    async savePage(slug, content, format = 'blocks') {
        const body = new URLSearchParams();
        body.append('slug', slug);
        body.append('format', format);
        body.append('csrf', csrfToken);
        if (format === 'blocks') {
            body.append('blocks', content);
            body.append('content', '');
        }
        else {
            body.append('content', content);
        }
        const res = await fetch('index.php?api=pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            let msg = `API error: ${res.status}`;
            try {
                const json = await res.json();
                msg = json.error || msg;
            }
            catch { /* non-JSON response */ }
            throw new Error(msg);
        }
    },
    /**
     * Delete a page.
     */
    async deletePage(slug) {
        const res = await fetch(`index.php?api=pages&slug=${encodeURIComponent(slug)}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': csrfToken },
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            let msg = `API error: ${res.status}`;
            try {
                const json = await res.json();
                msg = json.error || msg;
            }
            catch { /* non-JSON response */ }
            throw new Error(msg);
        }
    },
    /**
     * List revisions for a page.
     */
    async listRevisions(slug) {
        const res = await fetch(`index.php?api=revisions&slug=${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.error);
        }
        return json.revisions;
    },
    /**
     * Restore a page from a specific revision.
     */
    async restoreRevision(slug, timestamp) {
        const body = new URLSearchParams();
        body.append('timestamp', timestamp);
        body.append('csrf', csrfToken);
        const res = await fetch(`index.php?api=revisions&slug=${encodeURIComponent(slug)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        updateCsrfFromResponse(res);
        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.error);
        }
    },
    /**
     * Search pages by query string.
     */
    async search(query) {
        const res = await fetch(`index.php?api=search&q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.error);
        }
        return json.results;
    },
    /**
     * Export all site data as JSON.
     */
    async exportSite() {
        const res = await fetch('index.php?api=export');
        if (!res.ok) {
            throw new Error('Export failed');
        }
        return res.text();
    },
    /**
     * Import site data from JSON.
     */
    async importSite(data) {
        const res = await fetch('index.php?api=import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: data,
        });
        updateCsrfFromResponse(res);
        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.error);
        }
        return json.imported;
    },
};
