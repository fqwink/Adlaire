/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
 * API - REST API client for Adlaire Static CMS.
 * Provides typed methods for page CRUD and revision management.
 *
 * Requires: csrfToken global variable set by PHP.
 */

// #64: PageSummary partial response対応 — フィールドをoptionalに
interface PageSummary {
    format?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
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

// #33: グローバル変数を直接更新
function updateCsrfFromResponse(res: Response): void {
    const newToken = res.headers.get('X-CSRF-Token');
    if (newToken) { csrfToken = newToken; }
}

// #96: URL構築のbuilder helper — URLSearchParams統一
function buildApiUrl(endpoint: string, params?: Record<string, string>): string {
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
    async listPages(): Promise<Record<string, PageSummary>> {
        const res = await fetch(buildApiUrl('pages'));
        if (!res.ok) { throw new Error(`API error: ${res.status}`); }
        const json = await res.json();
        return json.pages;
    },

    /**
     * Get a single page with full content and metadata.
     */
    async getPage(slug: string): Promise<PageData> {
        const res = await fetch(buildApiUrl('pages', { slug }));
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

        const res = await fetch(buildApiUrl('pages'), {
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
        const res = await fetch(buildApiUrl('pages', { slug }), {
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
    // #44: listRevisions エラーログ追加
    async listRevisions(slug: string): Promise<Revision[]> {
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
    // BugFix #6: res.okチェックをres.json()の前に移動（非JSONレスポンスでの例外防止）
    async restoreRevision(slug: string, timestamp: string): Promise<void> {
        const body = new URLSearchParams();
        body.append('timestamp', timestamp);
        body.append('csrf', csrfToken);

        const res = await fetch(buildApiUrl('revisions', { slug }), {
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

    /**
     * Search pages by query string.
     */
    // #44: search エラーログ追加
    async search(query: string): Promise<SearchResult[]> {
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
    // BugFix #8: CSRFトークンヘッダー送信 + updateCsrfFromResponse追加
    async exportSite(): Promise<string> {
        const res = await fetch(buildApiUrl('export'), {
            headers: { 'X-CSRF-Token': csrfToken },
        });
        updateCsrfFromResponse(res);
        if (!res.ok) { throw new Error('Export failed'); }
        return res.text();
    },

    /**
     * Import site data from JSON.
     */
    // BugFix #7: res.okチェックをres.json()の前に移動（非JSONレスポンスでの例外防止）
    async importSite(data: string): Promise<{ config: boolean; pages: number }> {
        const res = await fetch(buildApiUrl('import'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: data,
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            let msg = `API error: ${res.status}`;
            try { const json = await res.json(); msg = json.error || msg; } catch { /* non-JSON response */ }
            throw new Error(msg);
        }
        const json = await res.json();
        return json.imported;
    },

    async reorderPages(slugs: string[]): Promise<void> {
        const res = await fetch(buildApiUrl('reorder'), {
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
        const res = await fetch(buildApiUrl('bulk'), {
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
        const res = await fetch(buildApiUrl('bulk'), {
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
        const res = await fetch(buildApiUrl('revisiondiff', { slug, t1, t2 }));
        if (!res.ok) {
            let msg = `API error: ${res.status}`;
            try { const json = await res.json(); msg = json.error || msg; } catch { /* non-JSON response */ }
            throw new Error(msg);
        }
        return res.json();
    },

    /**
     * List all users (master admin only).
     */
    async listUsers(): Promise<UserInfo[]> {
        const res = await fetch(buildApiUrl('users'), {
            headers: { 'X-CSRF-Token': csrfToken },
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            let msg = `API error: ${res.status}`;
            try { const json = await res.json(); msg = json.error || msg; } catch { /* non-JSON response */ }
            throw new Error(msg);
        }
        const json = await res.json();
        return json.users ?? [];
    },

    /**
     * Create a new user (master admin only, max 3).
     */
    async createUser(username: string, password: string): Promise<void> {
        const body = new URLSearchParams();
        body.append('username', username);
        body.append('password', password);
        body.append('csrf', csrfToken);

        const res = await fetch(buildApiUrl('users'), {
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

    /**
     * Update a user's password (master admin only).
     */
    async updateUserPassword(username: string, password: string): Promise<void> {
        const body = new URLSearchParams();
        body.append('username', username);
        body.append('password', password);
        body.append('csrf', csrfToken);

        const res = await fetch(buildApiUrl('users'), {
            method: 'PUT',
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

    /**
     * Delete a user (master admin only).
     */
    async deleteUser(username: string): Promise<void> {
        const res = await fetch(buildApiUrl('users', { username }), {
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

    async saveSidebar(blocks: string): Promise<void> {
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
            try { const json = await res.json(); msg = json.error || msg; } catch { /* non-JSON response */ }
            throw new Error(msg);
        }
    },
};
