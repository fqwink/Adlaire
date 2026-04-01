/**
 * API - REST API client for Adlaire Platform.
 * Provides typed methods for page CRUD and revision management.
 *
 * Requires: csrfToken global variable set by PHP.
 */

interface PageSummary {
    format: string;
    created_at: string;
    updated_at: string;
}

interface PageData {
    content: string;
    format: string;
    created_at: string;
    updated_at: string;
}

interface Revision {
    timestamp: string;
    file: string;
}

const api = {
    /**
     * List all pages (metadata only, no content).
     */
    async listPages(): Promise<Record<string, PageSummary>> {
        const res = await fetch('index.php?api=pages');
        const json = await res.json();
        if (!res.ok) { throw new Error(json.error); }
        return json.pages;
    },

    /**
     * Get a single page with full content and metadata.
     */
    async getPage(slug: string): Promise<PageData> {
        const res = await fetch(`index.php?api=pages&slug=${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (!res.ok) { throw new Error(json.error); }
        return json.data;
    },

    /**
     * Create or update a page.
     */
    async savePage(slug: string, content: string, format: string = 'html'): Promise<void> {
        const body = new URLSearchParams();
        body.append('slug', slug);
        body.append('content', content);
        body.append('format', format);
        body.append('csrf', csrfToken);
        if (format === 'blocks') {
            body.append('blocks', content);
        }

        const res = await fetch('index.php?api=pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        const json = await res.json();
        if (!res.ok) { throw new Error(json.error); }
    },

    /**
     * Delete a page.
     */
    async deletePage(slug: string): Promise<void> {
        const res = await fetch(`index.php?api=pages&slug=${encodeURIComponent(slug)}&csrf=${encodeURIComponent(csrfToken)}`, {
            method: 'DELETE',
        });
        const json = await res.json();
        if (!res.ok) { throw new Error(json.error); }
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
};
