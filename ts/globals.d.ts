/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 */

/** Global variables injected by PHP */
declare let csrfToken: string;

/** Global functions from other TS modules */
declare function autosize(textarea: HTMLTextAreaElement): void;
declare function markdownToHtml(md: string): string;
declare function renderBlocks(blocks: { type: string; data: Record<string, unknown> }[]): string;
declare function sanitizeHtml(html: string): string;
declare function escHtml(s: string): string;

/** User information for master management */
interface UserInfo {
    username: string;
    role: string;
    is_main: boolean;
    enabled?: boolean;
    created_at: string;
    last_login: string;
}

/** Ver.2.9 TS#82: Generate report type */
interface GenerateReport {
    success: number;
    failed: number;
    skipped: number;
    time: number;
}

/** Editor instance attached to container element */
interface HTMLElement {
    __editor?: Editor | undefined;
}
