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
// #33: グローバル変数を直接更新
function updateCsrfFromResponse(res) {
    const newToken = res.headers.get('X-CSRF-Token');
    if (newToken) {
        csrfToken = newToken;
    }
}
// #96: URL構築のbuilder helper — URLSearchParams統一
function buildApiUrl(endpoint, params) {
    let url = `index.php?api=${endpoint}`;
    if (params) {
        const search = new URLSearchParams(params);
        url += `&${search.toString()}`;
    }
    return url;
}
const api = {
    /**
     * List all pages (metadata only, no content).
     */
    async listPages() {
        const res = await fetch(buildApiUrl('pages'));
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
        const res = await fetch(buildApiUrl('pages', { slug }));
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
        const res = await fetch(buildApiUrl('pages'), {
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
        try {
            return await res.json();
        }
        catch {
            return {};
        }
    },
    /**
     * Delete a page.
     */
    async deletePage(slug) {
        const res = await fetch(buildApiUrl('pages', { slug }), {
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
    // #44: listRevisions エラーログ追加
    async listRevisions(slug) {
        const res = await fetch(buildApiUrl('revisions', { slug }));
        if (!res.ok) {
            console.warn('listRevisions failed:', res.status, slug);
            return [];
        }
        const json = await res.json();
        return json.revisions ?? [];
    },
    /**
     * Restore a page from a specific revision.
     */
    async restoreRevision(slug, timestamp) {
        const body = new URLSearchParams();
        body.append('timestamp', timestamp);
        body.append('csrf', csrfToken);
        const res = await fetch(buildApiUrl('revisions', { slug }), {
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
    // #44: search エラーログ追加
    async search(query) {
        const res = await fetch(buildApiUrl('search', { q: query }));
        if (!res.ok) {
            console.warn('search failed:', res.status, query);
            return [];
        }
        const json = await res.json();
        return json.results ?? [];
    },
    /**
     * Export all site data as JSON.
     */
    async exportSite() {
        const res = await fetch(buildApiUrl('export'));
        if (!res.ok) {
            throw new Error('Export failed');
        }
        return res.text();
    },
    /**
     * Import site data from JSON.
     */
    async importSite(data) {
        const res = await fetch(buildApiUrl('import'), {
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
    async reorderPages(slugs) {
        const res = await fetch(buildApiUrl('reorder'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ slugs }),
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
    async bulkStatus(slugs, status) {
        const res = await fetch(buildApiUrl('bulk'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ action: 'status', slugs, status }),
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
    async bulkDelete(slugs) {
        const res = await fetch(buildApiUrl('bulk'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ action: 'delete', slugs }),
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
    async getRevisionDiff(slug, t1, t2) {
        const res = await fetch(buildApiUrl('revisiondiff', { slug, t1, t2 }));
        if (!res.ok) {
            let msg = `API error: ${res.status}`;
            try {
                const json = await res.json();
                msg = json.error || msg;
            }
            catch { /* non-JSON response */ }
            throw new Error(msg);
        }
        return res.json();
    },
    async saveSidebar(blocks) {
        const body = new URLSearchParams();
        body.append('blocks', blocks);
        body.append('csrf', csrfToken);
        const res = await fetch(buildApiUrl('sidebar'), {
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
};
