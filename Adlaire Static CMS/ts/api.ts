/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
 * API - REST API client for Adlaire Static CMS.
 * Provides typed methods for page CRUD and revision management.
 *
 * Requires: csrfToken global variable set by PHP.
 */

/// <reference path="./globals.d.ts" />

import type { PortableTextNode } from './editor.ts';

// #64: PageSummary partial response対応 — フィールドをoptionalに
interface PageSummary {
    type?: string;
    posted_at?: string;
    category?: string;
    author?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
}

interface PageData {
    body: PortableTextNode[];
    status: string;
    type: string;
    posted_at: string;
    category: string;
    tags: string[];
    author: string;
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
    type: string;
    status: string;
    updated_at: string;
}

// #33: グローバル変数を直接更新
export function updateCsrfFromResponse(res: Response): void {
    const newToken = res.headers.get('X-CSRF-Token');
    if (newToken) { csrfToken = newToken; }
}

// Ver.2.9 TS#73: エラーメッセージ取得ヘルパー（DRY化）
// R5-18: extractApiError — エラーメッセージからHTMLタグ除去（XSS防止）
async function extractApiError(res: Response, fallbackStatus: number): Promise<string> {
    let msg = `API error: ${fallbackStatus}`;
    try {
        const json = await res.json();
        if (json.error && typeof json.error === 'string') {
            // R5-19: サーバーエラーメッセージのサニタイズ
            msg = json.error.replace(/<[^>]*>/g, '');
        }
    } catch { /* non-JSON response */ }
    return msg;
}

// Ver.2.9 TS#82: GenerateReport型定義 → globals.d.ts に配置

// #96: URL構築のbuilder helper — URLSearchParams統一
// R5-17: endpoint入力バリデーション — 英数字とハイフンのみ許可
function buildApiUrl(endpoint: string, params?: Record<string, string>): string {
    if (!endpoint || !/^[a-zA-Z0-9_-]+$/.test(endpoint)) {
        throw new Error('buildApiUrl: invalid endpoint');
    }
    let url = `index.php?api=${encodeURIComponent(endpoint)}`;
    if (params) {
        const search = new URLSearchParams(params);
        url += `&${search.toString()}`;
    }
    return url;
}

export const api = {
    /**
     * List all pages (metadata only, no content).
     */
    // #104: listPages — CSRF token更新追加
    async listPages(): Promise<Record<string, PageSummary>> {
        const res = await fetch(buildApiUrl('pages'));
        updateCsrfFromResponse(res);
        if (!res.ok) { throw new Error(`API error: ${res.status}`); }
        const json = await res.json();
        // R3-1: json.pages null/undefined安全化 — 空オブジェクトフォールバック
        return json.pages ?? {};
    },

    /**
     * Get a single page with full content and metadata.
     */
    // #105: getPage — CSRF token更新追加
    // R3-2: slug空文字チェック追加
    async getPage(slug: string): Promise<PageData> {
        if (slug == null || slug === '') throw new Error('getPage: slug is required');
        const res = await fetch(buildApiUrl('pages', { slug }));
        updateCsrfFromResponse(res);
        if (!res.ok) { throw new Error(await extractApiError(res, res.status)); }
        const json = await res.json();
        // R3-3: json.data null安全化
        if (!json.data) throw new Error('getPage: empty response data');
        return json.data;
    },

    /**
     * Create or update a page (PT format).
     */
    // Ver.3.1: savePage PT body + post metadata対応
    async savePage(
        slug: string,
        ptBody: PortableTextNode[],
        type: string = 'page',
        postedAt: string = '',
        category: string = '',
        tags: string[] = [],
        author: string = '',
    ): Promise<SavePageResult> {
        if (!slug) throw new Error('savePage: slug is required');
        const params = new URLSearchParams();
        params.append('slug', slug);
        params.append('csrf', csrfToken);
        params.append('body', JSON.stringify(ptBody));
        if (type) params.append('type', type);
        if (postedAt) params.append('posted_at', postedAt);
        if (category) params.append('category', category);
        if (tags.length > 0) params.append('tags', JSON.stringify(tags));
        if (author) params.append('author', author);

        const res = await fetch(buildApiUrl('pages'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            throw new Error(await extractApiError(res, res.status));
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
    // R3-6: deletePage slug空文字チェック
    async deletePage(slug: string): Promise<void> {
        if (!slug) throw new Error('deletePage: slug is required');
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
    // R3-7: listRevisions slug空文字チェック
    async listRevisions(slug: string): Promise<Revision[]> {
        if (!slug) return [];
        const res = await fetch(buildApiUrl('revisions', { slug }));
        updateCsrfFromResponse(res);
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
    // R3-8: restoreRevision slug/timestamp空文字チェック + R3-9: timestampフォーマット検証
    async restoreRevision(slug: string, timestamp: string): Promise<void> {
        if (!slug) throw new Error('restoreRevision: slug is required');
        if (!timestamp || !/^\d+$/.test(timestamp)) throw new Error('restoreRevision: invalid timestamp');
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
    // R3-10: search空クエリ早期リターン
    async search(query: string): Promise<SearchResult[]> {
        if (!query || !query.trim()) return [];
        const res = await fetch(buildApiUrl('search', { q: query }));
        updateCsrfFromResponse(res);
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
    // R3-11: exportSite extractApiError統一
    async exportSite(): Promise<string> {
        const res = await fetch(buildApiUrl('export'));
        updateCsrfFromResponse(res);
        if (!res.ok) { throw new Error(await extractApiError(res, res.status)); }
        return res.text();
    },

    /**
     * Import site data from JSON.
     */
    // #102: importSite — !res.okチェックをjson.parse前に移動し安全化
    // R3-12: importSite data空チェック + R3-13: json.imported null安全化
    async importSite(data: string): Promise<{ config: boolean; pages: number }> {
        if (!data) throw new Error('importSite: data is required');
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
        return json.imported ?? { config: false, pages: 0 };
    },

    // R3-14: reorderPages空配列チェック
    async reorderPages(slugs: string[]): Promise<void> {
        if (!Array.isArray(slugs) || slugs.length === 0) return;
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

    // R3-15: bulkStatus 空配列/空status防止
    async bulkStatus(slugs: string[], status: string): Promise<void> {
        if (!Array.isArray(slugs) || slugs.length === 0) throw new Error('bulkStatus: no slugs provided');
        if (!status) throw new Error('bulkStatus: status is required');
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

    // R3-16: bulkDelete 空配列防止
    async bulkDelete(slugs: string[]): Promise<void> {
        if (!Array.isArray(slugs) || slugs.length === 0) throw new Error('bulkDelete: no slugs provided');
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
    async getRevisionDiff(slug: string, t1: string, t2: string): Promise<{ added: unknown[]; removed: unknown[]; changed: unknown[] }> {
        const res = await fetch(buildApiUrl('revisiondiff', { slug, t1, t2 }));
        updateCsrfFromResponse(res);
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
    // R3-17: listUsers CSRF token更新漏れ修正
    async listUsers(): Promise<UserInfo[]> {
        const res = await fetch(buildApiUrl('users'));
        updateCsrfFromResponse(res);
        if (!res.ok) {
            console.warn('listUsers failed:', res.status);
            throw new Error(await extractApiError(res, res.status));
        }
        const json = await res.json();
        return json.users ?? [];
    },

    async generateSubMaster(): Promise<{username: string; password: string; token: string}> {
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
    async disableUser(username: string): Promise<void> {
        if (!username || typeof username !== 'string') throw new Error('Invalid username');
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
    async deleteUser(username: string): Promise<void> {
        if (!username || typeof username !== 'string') throw new Error('Invalid username');
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
    // R5-33: updateMainPassword最大長チェック + R5-34: 文字列型検証
    async updateMainPassword(currentPassword: string, newPassword: string): Promise<void> {
        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') throw new Error('Invalid password type');
        if (!currentPassword || !newPassword) throw new Error('Password fields are required');
        if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');
        if (newPassword.length > 128) throw new Error('Password must be at most 128 characters');
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

    // Ver.3.1: saveSidebar PT body対応
    async saveSidebar(ptBody: PortableTextNode[]): Promise<void> {
        const params = new URLSearchParams();
        params.append('body', JSON.stringify(ptBody));
        params.append('csrf', csrfToken);

        const res = await fetch(buildApiUrl('sidebar'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });
        updateCsrfFromResponse(res);
        if (!res.ok) {
            console.warn('saveSidebar failed:', res.status);
            throw new Error(await extractApiError(res, res.status));
        }
    },
};
