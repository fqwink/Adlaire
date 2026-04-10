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

// --- エラークラス ---
export { ValidationError } from "./error.ts";

// --- 組み込みミドルウェア ---
export { compress, cors, logger, rateLimit } from "./builtin_middleware.ts";

// --- ハンドラー ---
export { defineHandler, defineErrorHandler, defineNotFoundHandler } from "./handler.ts";

// --- ミドルウェア ---
export { defineMiddleware } from "./middleware.ts";

// --- 型 ---
export type {
  AdlaireConfig,
  Context,
  CookieOptions,
  Cookies,
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
  SSEEvent,
  SSEStream,
  WebSocketHandlers,
} from "./types.ts";
export type { CorsOptions, RateLimitOptions } from "./builtin_middleware.ts";
