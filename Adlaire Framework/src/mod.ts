/**
 * Adlaire Framework — 公開 API エントリポイント
 * FRAMEWORK_RULEBOOK §3.1 準拠
 *
 * フレームワーク利用者はこのモジュールからインポートする。
 *
 * ```typescript
 * import { defineHandler, defineMiddleware, serve } from "adlaire-framework/mod.ts";
 * ```
 */

// --- サーバー ---
export { serve } from "./server.ts";

// --- ハンドラー ---
export { defineHandler, defineErrorHandler, defineNotFoundHandler } from "./handler.ts";

// --- ミドルウェア ---
export { defineMiddleware } from "./middleware.ts";

// --- 型 ---
export type {
  AdlaireConfig,
  Context,
  ErrorHandler,
  Handler,
  HttpMethod,
  MethodHandlers,
  MiddlewareFunction,
  MiddlewareState,
  NextFunction,
  NotFoundHandler,
  RedirectStatus,
  RouteParams,
  SingleHandler,
} from "./types.ts";
