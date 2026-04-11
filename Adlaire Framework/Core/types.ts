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
  | { type: "port"; required?: boolean; default?: number }
  | { type: "enum"; values: readonly string[]; required?: boolean; default?: string };

export type EnvSchema = Record<string, EnvRule>;

// ルール単体から値の TypeScript 型を導出するヘルパー型
// enum は values の要素リテラル Union 型を生成する
type EnvValueOf<R extends EnvRule> =
  R extends { type: "number" | "port" } ? number :
  R extends { type: "boolean" } ? boolean :
  R extends { type: "enum"; values: infer V extends readonly string[] } ? V[number] :
  string;

// required: true または default 指定があれば非 undefined。それ以外は T | undefined
export type EnvResult<S extends EnvSchema> = {
  readonly [K in keyof S]:
    S[K] extends ({ required: true } | { default: unknown })
      ? EnvValueOf<S[K]>
      : EnvValueOf<S[K]> | undefined
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
// §5.8 ExtractRouteParams
// ------------------------------------------------------------

// パスリテラル型からパラメータキー名を再帰的に抽出するヘルパー型
type ParamKeys<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ParamKeys<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
    ? Param
    : Path extends `${string}*${infer WildName}`
    ? (WildName extends "" ? "wildcard" : WildName)
    : never;

// パスリテラル型からパスパラメータオブジェクト型を導出する
export type ExtractRouteParams<Path extends string> =
  string extends Path ? Record<string, string> :
  [ParamKeys<Path>] extends [never] ? Record<string, string> :
  { [K in ParamKeys<Path>]: string };

// ------------------------------------------------------------
// §5.9 InferSchema
// ------------------------------------------------------------

// Rule 型から TypeScript 型を導出するヘルパー型（相互再帰のため interface は使用不可）
export type InferFieldType<R extends Rule> =
  R extends { type: "string" | "email" | "url" } ? string :
  R extends { type: "number" } ? number :
  R extends { type: "boolean" } ? boolean :
  R extends { type: "object"; fields: infer F extends Schema } ? InferSchema<F> :
  R extends { type: "object" } ? Record<string, unknown> :
  R extends { type: "array"; items: infer I extends Rule } ? InferFieldType<I>[] :
  R extends { type: "array" } ? unknown[] :
  R extends { type: "custom" } ? unknown :
  never;

// nullable: true の場合は T | null を生成する
type InferRuleValue<R extends Rule> =
  R extends { nullable: true }
    ? InferFieldType<R> | null
    : InferFieldType<R>;

// Schema 全体から TypeScript 型を導出する Mapped Type
// required: true の場合は必須フィールド（non-optional）、それ以外はオプショナルフィールド
export type InferSchema<S extends Schema> =
  { [K in keyof S as S[K] extends { required: true } ? K : never]-?: InferRuleValue<S[K]> } &
  { [K in keyof S as S[K] extends { required: true } ? never : K]?: InferRuleValue<S[K]> };

// ------------------------------------------------------------
// §5.10 TypedHandler
// ------------------------------------------------------------

export type TypedHandler<
  Path extends string,
  B = unknown,
  Q extends Record<string, string> = Record<string, string>,
  S extends Record<string, unknown> = Record<string, unknown>,
> = Handler<ExtractRouteParams<Path>, B, Q, S>;

// ------------------------------------------------------------
// §5.11 Simplify
// ------------------------------------------------------------

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

// ------------------------------------------------------------
// §5.12 StrictQueryResult
// ------------------------------------------------------------

export type StrictQueryResult<S extends QuerySchema> = {
  readonly [K in keyof QueryResult<S>]-?: NonNullable<QueryResult<S>[K]>
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
