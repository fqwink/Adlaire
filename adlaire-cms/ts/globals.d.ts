/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
 * Global type declarations for PHP-injected variables and shared interfaces.
 * Module-level function declarations are handled by ES module imports.
 */

/** Global variables injected by PHP */
declare let csrfToken: string;

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
