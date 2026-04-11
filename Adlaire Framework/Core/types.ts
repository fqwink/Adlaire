// ============================================================
// Adlaire Framework — types.ts
// 全型定義。他の Core ファイルはすべてここからインポートする。
// ============================================================

// ------------------------------------------------------------
// §5.1 Context
// ------------------------------------------------------------

export interface Context<
  P extends Record<string, string> = Record<string, string>,
  B = unknown,
  Q extends Record<string, string> = Record<string, string>,
  S extends Record<string, unknown> = Record<string, unknown>,
> {
  req: Request;
  params: P;
  query: Q;
  body: B;
  state: S;
}

// ------------------------------------------------------------
// §5.2 Handler / Middleware / ErrorHandler
// ------------------------------------------------------------

export type Handler<
  P extends Record<string, string> = Record<string, string>,
  B = unknown,
  Q extends Record<string, string> = Record<string, string>,
  S extends Record<string, unknown> = Record<string, unknown>,
> = (ctx: Context<P, B, Q, S>) => Response | Promise<Response>;

export type Middleware<
  S extends Record<string, unknown> = Record<string, unknown>,
> = (
  ctx: Context<Record<string, string>, unknown, Record<string, string>, S>,
  next: () => Promise<Response>,
) => Promise<Response>;

export type ErrorHandler = (
  err: unknown,
  ctx: Context,
) => Response | Promise<Response>;

// ------------------------------------------------------------
// §5.3 ValidationError / Schema / Rule
// ------------------------------------------------------------

export interface ValidationError {
  field: string;
  message: string;
}

export interface RuleBase {
  required?: boolean;
  nullable?: boolean;
  message?: string;
}

export type Rule =
  | (RuleBase & { type: "string"; min?: number; max?: number; pattern?: RegExp; enum?: string[] })
  | (RuleBase & { type: "number"; min?: number; max?: number; integer?: boolean })
  | (RuleBase & { type: "boolean" })
  | (RuleBase & { type: "email" })
  | (RuleBase & { type: "url"; allowedProtocols?: string[] })
  | (RuleBase & { type: "object"; fields?: Schema })
  | (RuleBase & { type: "array"; items?: Rule; min?: number; max?: number })
  | (RuleBase & { type: "custom"; validate: (v: unknown) => true | string });

export type Schema = Record<string, Rule>;

// ------------------------------------------------------------
// §5.4 HttpStatus / ErrorResponse / HTTPError
// ------------------------------------------------------------

export type HttpStatus =
  | 100 | 101
  | 200 | 201 | 202 | 203 | 204 | 205 | 206
  | 300 | 301 | 302 | 303 | 304 | 307 | 308
  | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409
  | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 422
  | 423 | 424 | 425 | 426 | 428 | 429 | 431 | 451
  | 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;

export interface ErrorResponse {
  error: string;
  detail?: unknown;
}

export class HTTPError extends Error {
  constructor(
    public readonly status: HttpStatus,
    message?: string,
    public readonly detail?: unknown,
  ) {
    super(message ?? String(status));
    this.name = "HTTPError";
  }
}

// ------------------------------------------------------------
// §5.5 Route / Method
// ------------------------------------------------------------

export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export interface Route {
  method: Method;
  path: string;
  handler: Handler;
}

// ------------------------------------------------------------
// §5.6 EnvRule / EnvSchema / EnvResult
// ------------------------------------------------------------

export type EnvRule =
  | { type: "string"; required?: boolean; default?: string }
  | { type: "number"; required?: boolean; default?: number }
  | { type: "boolean"; required?: boolean; default?: boolean }
  | { type: "port"; required?: boolean; default?: number };

export type EnvSchema = Record<string, EnvRule>;

export type EnvResult<S extends EnvSchema> = {
  readonly [K in keyof S]:
    S[K]["type"] extends "number" | "port" ? number :
    S[K]["type"] extends "boolean" ? boolean :
    string;
};

// ------------------------------------------------------------
// §5.7 QueryRule / QuerySchema / QueryResult
// ------------------------------------------------------------

export type QueryRule =
  | { type: "string";  required?: boolean; default?: string }
  | { type: "number";  required?: boolean; default?: number; integer?: boolean; min?: number; max?: number }
  | { type: "boolean"; required?: boolean; default?: boolean }
  | { type: "enum";    values: readonly string[]; required?: boolean; default?: string };

export type QuerySchema = Record<string, QueryRule>;

// ルール単体から値の TypeScript 型を導出するヘルパー型
// enum は values の要素リテラル Union 型を生成する
type QueryValueOf<R extends QueryRule> =
  R extends { type: "number" } ? number :
  R extends { type: "boolean" } ? boolean :
  R extends { type: "enum"; values: infer V extends readonly string[] } ? V[number] :
  string;

export type QueryResult<S extends QuerySchema> = {
  readonly [K in keyof S]:
    S[K] extends ({ required: true } | { default: unknown })
      ? QueryValueOf<S[K]>
      : QueryValueOf<S[K]> | undefined
};

// ------------------------------------------------------------
// §8.10 ContentSecurityPolicy（secureHeaders 用）
// ------------------------------------------------------------

export interface ContentSecurityPolicy {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  objectSrc?: string[];
  frameSrc?: string[];
  frameAncestors?: string[];
  formAction?: string[];
  baseUri?: string[];
  upgradeInsecureRequests?: boolean;
  reportUri?: string;
}
