/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
 * API - REST API client for Adlaire Static CMS.
 * Provides typed methods for page CRUD and revision management.
 *
 * Requires: csrfToken global variable set by PHP.
 */

interface PageSummary {
    format: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface PageData {
    content: string;
    format: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface Revision {
    timestamp: string;
}

interface SavePageResult {
    warnings?: string[];
}

interface SearchResult {
    slug: string;
    snippet: string;
    format: string;
    status: string;
    updated_at: string;
}

function updateCsrfFromResponse(res: Response): void {
    const newToken = res.headers.get('X-CSRF-Token');
    if (newToken) { (window as any).csrfToken = newToken; }
}

const api = {
    /**
     * List all pages (metadata only, no content).
     */
    async listPages(): Promise<Record<string, PageSummary>> {
        const res = await fetch('index.php?api=pages');
        if (!res.ok) { throw new Error(`API error: ${res.status}`); }
        const json = await res.json();
        return json.pages;
    },

    /**
     * Get a single page with full content and metadata.
     */
    async getPage(slug: string): Promise<PageData> {
        const res = await fetch(`index.php?api=pages&slug=${encodeURIComponent(slug)}`);
        if (!res.ok) { throw new Error(`API error: ${res.status}`); }
        const json = await res.json();
        return json.data;
    },

    /**
     * Create or update a page.
     */
    async savePage(slug: string, content: string, format: string = 'blocks'): Promise<SavePageResult> {
        const body = new URLSearchParams();
        body.append('slug', slug);
        body.append('format', format);
        body.append('csrf', csrfToken);
        if (format === 'blocks') {
            body.append('blocks', content);
            body.append('content', '');
        } else {
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
            try { const json = await res.json(); msg = json.error || msg; } catch { /* non-JSON response */ }
            throw new Error(msg);
        }
        try {
            return await res.json();
        } catch {
            return {};
        }
    },

    /**
     * Delete a page.
     */
    async deletePage(slug: string): Promise<void> {
        const res = await fetch(`index.php?api=pages&slug=${encodeURIComponent(slug)}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': csrfToken },
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            let msg = `API error: ${res.status}`;
            try { const json = await res.json(); msg = json.error || msg; } catch { /* non-JSON response */ }
            throw new Error(msg);
        }
    },

    /**
     * List revisions for a page.
     */
    async listRevisions(slug: string): Promise<Revision[]> {
        const res = await fetch(`index.php?api=revisions&slug=${encodeURIComponent(slug)}`);
        if (!res.ok) { return []; }
        const json = await res.json();
        return json.revisions;
    },

    /**
     * Restore a page from a specific revision.
     */
    async restoreRevision(slug: string, timestamp: string): Promise<void> {
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
        if (!res.ok) { throw new Error(json.error); }
    },

    /**
     * Search pages by query string.
     */
    async search(query: string): Promise<SearchResult[]> {
        const res = await fetch(`index.php?api=search&q=${encodeURIComponent(query)}`);
        if (!res.ok) { return []; }
        const json = await res.json();
        return json.results;
    },

    /**
     * Export all site data as JSON.
     */
    async exportSite(): Promise<string> {
        const res = await fetch('index.php?api=export');
        if (!res.ok) { throw new Error('Export failed'); }
        return res.text();
    },

    /**
     * Import site data from JSON.
     */
    async importSite(data: string): Promise<{ config: boolean; pages: number }> {
        const res = await fetch('index.php?api=import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: data,
        });
        updateCsrfFromResponse(res);
        const json = await res.json();
        if (!res.ok) { throw new Error(json.error); }
        return json.imported;
    },

    async reorderPages(slugs: string[]): Promise<void> {
        const res = await fetch('index.php?api=reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ slugs }),
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            let msg = `API error: ${res.status}`;
            try { const json = await res.json(); msg = json.error || msg; } catch { /* non-JSON response */ }
            throw new Error(msg);
        }
    },

    async bulkStatus(slugs: string[], status: string): Promise<void> {
        const res = await fetch('index.php?api=bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ action: 'status', slugs, status }),
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            let msg = `API error: ${res.status}`;
            try { const json = await res.json(); msg = json.error || msg; } catch { /* non-JSON response */ }
            throw new Error(msg);
        }
    },

    async bulkDelete(slugs: string[]): Promise<void> {
        const res = await fetch('index.php?api=bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ action: 'delete', slugs }),
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            let msg = `API error: ${res.status}`;
            try { const json = await res.json(); msg = json.error || msg; } catch { /* non-JSON response */ }
            throw new Error(msg);
        }
    },

    async getRevisionDiff(slug: string, t1: string, t2: string): Promise<{ added: unknown[]; removed: unknown[]; changed: unknown[] }> {
        const params = new URLSearchParams({ slug, t1, t2 });
        const res = await fetch(`index.php?api=revisiondiff&${params.toString()}`);
        if (!res.ok) {
            let msg = `API error: ${res.status}`;
            try { const json = await res.json(); msg = json.error || msg; } catch { /* non-JSON response */ }
            throw new Error(msg);
        }
        return res.json();
    },

    async saveSidebar(blocks: string): Promise<void> {
        const body = new URLSearchParams();
        body.append('blocks', blocks);
        body.append('csrf', csrfToken);

        const res = await fetch('index.php?api=sidebar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            let msg = `API error: ${res.status}`;
            try { const json = await res.json(); msg = json.error || msg; } catch { /* non-JSON response */ }
            throw new Error(msg);
        }
    },
};
