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
// Ver.2.9 TS#73: エラーメッセージ取得ヘルパー（DRY化）
async function extractApiError(res, fallbackStatus) {
    let msg = `API error: ${fallbackStatus}`;
    try {
        const json = await res.json();
        msg = json.error || msg;
    }
    catch { /* non-JSON response */ }
    return msg;
}
// Ver.2.9 TS#82: GenerateReport型定義 → globals.d.ts に配置
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
    // #104: listPages — CSRF token更新追加
    async listPages() {
        const res = await fetch(buildApiUrl('pages'));
        updateCsrfFromResponse(res);
        if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
        }
        const json = await res.json();
        return json.pages;
    },
    /**
     * Get a single page with full content and metadata.
     */
    // #105: getPage — CSRF token更新追加
    async getPage(slug) {
        const res = await fetch(buildApiUrl('pages', { slug }));
        updateCsrfFromResponse(res);
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
            throw new Error(await extractApiError(res, res.status));
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
            throw new Error(await extractApiError(res, res.status));
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
    // #101: restoreRevision — res.json()失敗時のエラーハンドリング追加
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
        if (!res.ok) {
            throw new Error(await extractApiError(res, res.status));
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
    // #106: exportSite — CSRF token更新追加 + エラーメッセージ統一
    async exportSite() {
        const res = await fetch(buildApiUrl('export'));
        updateCsrfFromResponse(res);
        if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
        }
        return res.text();
    },
    /**
     * Import site data from JSON.
     */
    // #102: importSite — !res.okチェックをjson.parse前に移動し安全化
    async importSite(data) {
        const res = await fetch(buildApiUrl('import'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: data,
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            throw new Error(await extractApiError(res, res.status));
        }
        const json = await res.json();
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
            throw new Error(await extractApiError(res, res.status));
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
            throw new Error(await extractApiError(res, res.status));
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
            throw new Error(await extractApiError(res, res.status));
        }
    },
    // #103: getRevisionDiff — 戻り値の型安全性チェック追加
    async getRevisionDiff(slug, t1, t2) {
        const res = await fetch(buildApiUrl('revisiondiff', { slug, t1, t2 }));
        if (!res.ok) {
            throw new Error(await extractApiError(res, res.status));
        }
        const json = await res.json();
        return {
            added: Array.isArray(json.added) ? json.added : [],
            removed: Array.isArray(json.removed) ? json.removed : [],
            changed: Array.isArray(json.changed) ? json.changed : [],
        };
    },
    // --- User Management APIs (Ver.2.9: Master管理者対応) ---
    // Ver.2.9 TS#86: listUsers catch時にconsole.warn追加
    async listUsers() {
        const res = await fetch(buildApiUrl('users'));
        if (!res.ok) {
            console.warn('listUsers failed:', res.status);
            throw new Error(await extractApiError(res, res.status));
        }
        const json = await res.json();
        return json.users ?? [];
    },
    async generateSubMaster() {
        const res = await fetch(buildApiUrl('users'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ action: 'generate_sub_master' }),
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            throw new Error(await extractApiError(res, res.status));
        }
        return res.json();
    },
    // Ver.2.9 #32: ユーザーUI — username入力検証追加
    async disableUser(username) {
        if (!username || typeof username !== 'string')
            throw new Error('Invalid username');
        const res = await fetch(buildApiUrl('users'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ action: 'disable', username }),
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            throw new Error(await extractApiError(res, res.status));
        }
    },
    // Ver.2.9 #46: ユーザー削除 — username入力検証追加
    async deleteUser(username) {
        if (!username || typeof username !== 'string')
            throw new Error('Invalid username');
        const res = await fetch(buildApiUrl('users'), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ username }),
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            throw new Error(await extractApiError(res, res.status));
        }
    },
    // Ver.2.9 #33: パスワード検証 — クライアント側バリデーション追加
    async updateMainPassword(currentPassword, newPassword) {
        if (!currentPassword || !newPassword)
            throw new Error('Password fields are required');
        if (newPassword.length < 8)
            throw new Error('Password must be at least 8 characters');
        const res = await fetch(buildApiUrl('users'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ action: 'update_main_password', current_password: currentPassword, new_password: newPassword }),
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            throw new Error(await extractApiError(res, res.status));
        }
    },
    // Ver.2.9 TS#90: saveSidebar catch時にconsole.warn追加
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
            console.warn('saveSidebar failed:', res.status);
            throw new Error(await extractApiError(res, res.status));
        }
    },
};
