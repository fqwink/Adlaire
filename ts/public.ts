/**
 * @license Adlaire License Ver.2.0 (Frontend Source - Closed)
 * @copyright Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏
 *
 * Public - Public page entry point for Adlaire Static CMS.
 * Provides rendering functions for published pages (visitor view).
 */

import { markdownToHtml } from './markdown.ts';
import { renderBlocks, sanitizeHtml, escHtml } from './editor.ts';

// Expose globals for PHP theme templates
(window as Record<string, unknown>).markdownToHtml = markdownToHtml;
(window as Record<string, unknown>).renderBlocks = renderBlocks;
(window as Record<string, unknown>).sanitizeHtml = sanitizeHtml;
(window as Record<string, unknown>).escHtml = escHtml;
