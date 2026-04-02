/**
 * API - REST API client for Adlaire Platform.
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
    async savePage(slug: string, content: string, format: string = 'blocks'): Promise<void> {
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
        if (!res.ok) { const json = await res.json(); throw new Error(json.error); }
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
        if (!res.ok) { const json = await res.json(); throw new Error(json.error); }
    },

    /**
     * List revisions for a page.
     */
    async listRevisions(slug: string): Promise<Revision[]> {
        const res = await fetch(`index.php?api=revisions&slug=${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (!res.ok) { throw new Error(json.error); }
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
        const json = await res.json();
        if (!res.ok) { throw new Error(json.error); }
    },

    /**
     * Search pages by query string.
     */
    async search(query: string): Promise<SearchResult[]> {
        const res = await fetch(`index.php?api=search&q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (!res.ok) { throw new Error(json.error); }
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
        const res = await fetch(`index.php?api=import&csrf=${encodeURIComponent(csrfToken)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
        });
        const json = await res.json();
        if (!res.ok) { throw new Error(json.error); }
        return json.imported;
    },
};
