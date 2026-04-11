// ============================================================
// Adlaire Framework — mod.ts
// 【唯一の公開エントリーポイント】外部からのインポートはここのみ
// ============================================================

// Types
export type {
  Context,
  EnvResult,
  EnvRule,
  EnvSchema,
  ErrorHandler,
  ErrorResponse,
  Handler,
  HttpStatus,
  Method,
  Middleware,
  Route,
  Rule,
  RuleBase,
  Schema,
  ValidationError,
} from "./Core/types.ts";
export { HTTPError } from "./Core/types.ts";

// Server
export { App, createServer, loadEnv } from "./Core/server.ts";
export type { TestRequestOptions } from "./Core/server.ts";

// Router
export type { RouteGroup, RouteOptions } from "./Core/router.ts";

// Response helpers
export {
  accepts,
  deleteCookie,
  getCookie,
  html,
  json,
  redirect,
  send,
  serveStatic,
  setCookie,
  text,
} from "./Core/response.ts";
export type { CookieOptions, StaticOptions } from "./Core/response.ts";

// Middleware
export { compress, cors, etag, logger, rateLimit } from "./Core/middleware.ts";
export type {
  CompressOptions,
  CorsOptions,
  LoggerOptions,
  RateLimitOptions,
} from "./Core/middleware.ts";

// Validator
export { validate } from "./Core/middleware.ts";
