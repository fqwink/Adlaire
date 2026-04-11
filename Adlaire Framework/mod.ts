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
  Schema,
  ValidationError,
} from "./Core/types.ts";
export { HTTPError } from "./Core/types.ts";

// Server
export { App, createServer, loadEnv } from "./Core/server.ts";

// Router (型のみ公開。インスタンスは createServer() 経由で取得)
export type { RouteGroup } from "./Core/router.ts";

// Response helpers
export { html, json, redirect, send, text } from "./Core/response.ts";

// Middleware
export { cors } from "./Core/middleware.ts";
export type { CorsOptions } from "./Core/middleware.ts";

// Validator
export { validate } from "./Core/middleware.ts";
