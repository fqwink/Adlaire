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

// --- 環境変数 ---
export { getEnv } from "./env.ts";

// --- エラークラス ---
export { ValidationError } from "./error.ts";

// --- 組み込みミドルウェア ---
export { cache, compress, cors, csrf, jwtAuth, logger, rateLimit, requestId, securityHeaders } from "./builtin_middleware.ts";

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
export type {
  CacheOptions,
  CorsOptions,
  CsrfOptions,
  JwtAuthOptions,
  LoggerOptions,
  RateLimitOptions,
  RequestIdOptions,
  SecurityHeadersOptions,
} from "./builtin_middleware.ts";
