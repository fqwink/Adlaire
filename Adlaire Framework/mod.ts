// ============================================================
// Adlaire Framework — mod.ts
// 【唯一の公開エントリーポイント】外部からのインポートはここのみ
// ============================================================

// Types
export type {
  ContentSecurityPolicy,
  Context,
  EnvResult,
  EnvRule,
  EnvSchema,
  ErrorHandler,
  ErrorResponse,
  ExtractRouteParams,
  Handler,
  HttpStatus,
  InferFieldType,
  InferSchema,
  Method,
  Middleware,
  QueryResult,
  QueryRule,
  QuerySchema,
  Route,
  Rule,
  RuleBase,
  Schema,
  Simplify,
  StrictQueryResult,
  TypedHandler,
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
  parseParam,
  parseQuery,
  redirect,
  sanitizeHtml,
  send,
  serveStatic,
  setCookie,
  text,
} from "./Core/response.ts";
export type { CookieOptions, StaticOptions } from "./Core/response.ts";

// Middleware
export {
  assertBody,
  bodyLimit,
  compress,
  cors,
  csrfProtection,
  etag,
  hsts,
  ipFilter,
  logger,
  rateLimit,
  requestId,
  secureHeaders,
  timeout,
} from "./Core/middleware.ts";
export type {
  BodyLimitOptions,
  CompressOptions,
  CorsOptions,
  CsrfOptions,
  HstsOptions,
  IpFilterOptions,
  LoggerOptions,
  LogInfo,
  RateLimitOptions,
  RateLimitStore,
  RequestIdOptions,
  SecureHeadersOptions,
  TimeoutOptions,
} from "./Core/middleware.ts";

// Validator
export { validate } from "./Core/middleware.ts";
