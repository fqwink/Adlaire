# Adlaire Framework — フレームワーク仕様ルールブック

> **文書バージョン: Ver.1.0**
> **最終更新: 2026-04-11**

---

# 0. 絶対原則

いかなる例外も認めない不変の規則。

## 0.1 外部変更禁止

本フレームワークは **Adlaire Group が開発・管理する**。フレームワーク全体への外部からの変更・改変を一切禁止する。

- フレームワークの実装・設計方針は Adlaire Group のみが決定する
- `Core/`・`mod.ts`・`deno.json` への変更は Adlaire Group のみが実施する
- `deno.json` の `"exports": "./mod.ts"` のみを設定し、`Core/` への直接インポートをパッケージ構造で封鎖する

## 0.2 型安全

**型安全の方針はフレームワーク開発者が決定し、アーキテクチャで保証する。**

- 公開 API（`mod.ts` エクスポート）に `any` 型を含めない
- エスケープハッチ（`any` を返す関数・型アサーションを強いる設計）を提供しない
- `any` 型の具体的な使用禁止規則は §0.4 で定める

## 0.3 npm 禁止

`npm:` スペシャライザーの使用を禁止する。依存は Deno 標準ライブラリ（`jsr:@std/*`）と Web 標準 API のみ。

## 0.4 any 使用禁止

`any` 型の使用をフレームワーク全域で禁止する。いかなる理由があっても例外を認めない。

- `any` 型の宣言・使用禁止
- `as any` によるキャスト禁止
- `// @ts-ignore`・`// @ts-expect-error` による型エラー抑制禁止
- `as unknown as T` 等の型安全を迂回するキャストチェーン禁止
- 動的な値には `unknown` を使用し、型ガードで絞り込む

---

# 1. 概要

Adlaire Group の全プロジェクトで共通利用する TypeScript 製フルスタックフレームワーク。

| 項目 | 内容 |
|------|------|
| **名称** | Adlaire Framework（adlaire-fw） |
| **種別** | フルスタックフレームワーク |
| **言語** | TypeScript 5.x（strict モード必須） |
| **ランタイム** | Deno 2.x |
| **配備環境** | Deno Deploy / Adlaire Deploy |
| **外部依存** | Deno 標準ライブラリ（`jsr:@std/*`）・Web 標準 API のみ |
| **npm 利用** | 禁止 |
| **対象用途** | 社内ツール・Web アプリケーション |

---

# 2. ランタイム・デプロイ仕様

## 2.1 Deno ランタイム

本フレームワークは Deno の組み込み HTTP サーバー（`Deno.serve`）を使用する。
Node.js 互換レイヤー（`node:` スペシャライザー）は使用しない。

| Deno / Web API | 用途 |
|----------------|------|
| `Deno.serve()` | HTTP サーバー起動 |
| `Deno.readTextFile()` | `.env` 読み込み |
| `crypto.subtle` | 暗号処理（署名・検証等）（Web Crypto API） |
| `Request` / `Response` | HTTP リクエスト・レスポンス |
| `URL` / `URLSearchParams` | URL パース |
| `ReadableStream` | ストリームレスポンス |

## 2.2 デプロイ対応

フレームワークは以下の 2 環境に対して同一コードで動作する。

| 環境 | 起動方式 | 備考 |
|------|---------|------|
| **Deno Deploy** | `export default server.fetch` | Fetch ハンドラー形式。`Deno.serve` 不要 |
| **Adlaire Deploy** | `server.listen(port)` | `Deno.serve` を使用。ポートは env で注入 |

### デュアル起動パターン

```typescript
import { createServer } from "@adlaire/fw";

const server = createServer();
// ... ルート定義 ...

// Deno Deploy
export default server.fetch;

// Adlaire Deploy
if (Deno.env.get("DEPLOY_TARGET") !== "deno-deploy") {
  server.listen(8000);
}
```

---

# 3. ファイル構成

## 3.1 構成

```
Adlaire Framework/
├── mod.ts                # 【唯一の公開エントリーポイント】外部からのインポートはここのみ
├── cli.ts                # CLI エントリーポイント（adlaire-fw コマンド）
├── deno.json             # Deno 設定
└── Core/                 # 【Adlaire Group 専用】サブディレクトリ分割禁止・フラット配置
    ├── types.ts          # 全型定義
    ├── server.ts         # App クラス・起動・エラーハンドラー・env
    ├── router.ts         # Router
    ├── middleware.ts     # バリデーター・各種ミドルウェア
    └── response.ts       # レスポンスヘルパー・パースヘルパー
```

`Core/` 内のファイルはすべて同格・同階層とする。サブディレクトリによる分割を禁止する。

## 3.2 公開エントリーポイントの封鎖

`deno.json` の `"exports"` を `"./mod.ts"` のみに設定することで、`Core/` への直接インポートをパッケージ構造で封鎖する。

```typescript
// ✅ 正規のインポート
import { createServer, json, HTTPError } from "@adlaire/fw";

// ✅ CLI エントリーポイント（adlaire-fw コマンド用）
// deno run -A jsr:@adlaire/fw/cli routes

// ❌ 禁止（パッケージ構造上インポートできない）
import { ... } from "@adlaire/fw/Core/types.ts";
```

## 3.3 deno.json

```json
{
  "name": "@adlaire/fw",
  "version": "1.1.0",
  "exports": {
    ".": "./mod.ts",
    "./cli": "./cli.ts"
  },
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "exactOptionalPropertyTypes": true
  }
}
```

- `"."` — 通常のライブラリインポート（`@adlaire/fw`）
- `"./cli"` — CLI ツール（`@adlaire/fw/cli`）

---

# 4. リクエスト処理フロー

```
1. Deno.serve / export default fetch がリクエストを受信
2. URL パース（URLSearchParams でクエリ分離）
3. リクエストボディ読み込み・Content-Type に応じたパース（§4.1）
4. Context オブジェクト生成（state: {} を含む）
5. Router.match() でルートマッチング
   └ 未一致 → 404 JSON レスポンス終了
6. ミドルウェアチェーン実行（登録順）
   └ 例外発生 → onError ハンドラーチェーンへ移行
7. ルートハンドラー実行 → Response を返す
8. onError（登録済みの場合）でエラーを Response に変換
```

## 4.1 Content-Type 別ボディパース

| Content-Type | `ctx.body` の型 | 動作 |
|---|---|---|
| `application/json` | `unknown` | `JSON.parse()` でパース |
| `text/plain` | `string` | テキストとして読み込み |
| `application/x-www-form-urlencoded` | `Record<string, string>` | `URLSearchParams` でパース |
| `multipart/form-data` | `null` | Phase 3 実装予定。現在は `null` |
| ボディなし（`GET` / `HEAD` / `DELETE` 等） | `null` | `null` |
| パース失敗（不正 JSON 等） | `null` | `null`（エラーをスローしない） |

---

# 5. types.ts　[Core]

フレームワーク全体で使用する型定義を一元管理する。
他の Core ファイルはすべて `types.ts` からインポートする。

## 5.1 Context

```typescript
interface Context<
  P extends Record<string, string> = Record<string, string>,
  B = unknown,
  Q extends Record<string, string> = Record<string, string>,
  S extends Record<string, unknown> = Record<string, unknown>,
> {
  req: Request;   // Web 標準 Request
  params: P;      // URL パスパラメータ
  query: Q;       // クエリストリング
  body: B;        // パース済みボディ
  state: S;       // ミドルウェア間共有データ（型引数 S で型付け可能）
}
```

## 5.2 Handler / Middleware / ErrorHandler

```typescript
// Handler は必ず Response を返す（void 禁止）
// 型引数にデフォルト値を付与することで Route.handler での引数省略を可能にする
type Handler<
  P extends Record<string, string> = Record<string, string>,
  B = unknown,
  Q extends Record<string, string> = Record<string, string>,
  S extends Record<string, unknown> = Record<string, unknown>,
> = (ctx: Context<P, B, Q, S>) => Response | Promise<Response>;

// Middleware は next() の結果を返す。S で state の型を宣言する
type Middleware<
  S extends Record<string, unknown> = Record<string, unknown>,
> = (
  ctx: Context<Record<string, string>, unknown, Record<string, string>, S>,
  next: () => Promise<Response>,
) => Promise<Response>;

// ErrorHandler はエラーを Response に変換する
type ErrorHandler =
  (err: unknown, ctx: Context) => Response | Promise<Response>;
```

### state 型安全化の使用例

`Middleware<S>` で state の書き込み型を宣言し、`Handler<P,B,Q,S>` で同じ `S` を指定して型付きで参照する。

```typescript
type AuthState = { userId: string };

// Middleware<S> で state の書き込み型を宣言する
const authMiddleware: Middleware<AuthState> = async (ctx, next) => {
  ctx.state.userId = "user-123"; // string として代入可能
  return next();
};
server.use(authMiddleware);

// ハンドラーで同じ S を指定して型付きで参照する
server.router.get<Record<string, string>, unknown, Record<string, string>, AuthState>(
  "/profile",
  (ctx) => {
    const id = ctx.state.userId; // string（unknown でない）
    return json({ id });
  },
);
```

## 5.3 ValidationError / Schema / Rule

```typescript
interface ValidationError {
  field: string;   // ドット記法・配列インデックス記法（例: address.city / tags[0]）
  message: string;
}

// Rule の共通オプション
interface RuleBase {
  required?: boolean;   // デフォルト: false
  nullable?: boolean;   // null 値を許可するか（デフォルト: false）
  message?: string;     // カスタムエラーメッセージ（省略時はフレームワーク標準メッセージ）
}

// Rule — Discriminated Union（type フィールドで判別）
type Rule =
  | (RuleBase & { type: "string";  min?: number; max?: number; pattern?: RegExp; enum?: string[] })
  | (RuleBase & { type: "number";  min?: number; max?: number; integer?: boolean })
  | (RuleBase & { type: "boolean" })
  | (RuleBase & { type: "email" })
  | (RuleBase & { type: "url";     allowedProtocols?: string[] })
  | (RuleBase & { type: "object";  fields?: Schema })
  | (RuleBase & { type: "array";   items?: Rule; min?: number; max?: number })
  | (RuleBase & { type: "custom";  validate: (v: unknown) => true | string });

type Schema = Record<string, Rule>;
```

## 5.4 ErrorResponse / HTTPError

```typescript
// 有効な HTTP ステータスコード（100〜599）
type HttpStatus =
  | 100 | 101
  | 200 | 201 | 202 | 203 | 204 | 205 | 206
  | 300 | 301 | 302 | 303 | 304 | 307 | 308
  | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409
  | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 422
  | 423 | 424 | 425 | 426 | 428 | 429 | 431 | 451
  | 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;

// すべてのエラーレスポンスのボディ形式（統一）
interface ErrorResponse {
  error: string;
  detail?: unknown;
}

// ハンドラーから任意の HTTP ステータスをスローするためのエラークラス
class HTTPError extends Error {
  constructor(
    public readonly status: HttpStatus,
    message?: string,
    public readonly detail?: unknown,
  ) {
    super(message ?? String(status));
  }
}
```

## 5.5 Route / Method

```typescript
interface Route {
  method: Method;
  path:   string;
  handler: Handler;
}

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
```

## 5.6 EnvRule / EnvSchema / EnvResult

`loadEnv()` のスキーマ検証・型変換に使用する型（§6.2 参照）。

```typescript
// 環境変数の型変換ルール
type EnvRule =
  | { type: "string";  required?: boolean; default?: string }
  | { type: "number";  required?: boolean; default?: number }
  | { type: "boolean"; required?: boolean; default?: boolean }
  | { type: "port";    required?: boolean; default?: number }       // 1〜65535 の整数
  | { type: "enum";    values: readonly string[]; required?: boolean; default?: string };  // 列挙値

type EnvSchema = Record<string, EnvRule>;

// ルール単体から値の TypeScript 型を導出するヘルパー型
// enum は values の要素リテラル Union 型を生成する
type EnvValueOf<R extends EnvRule> =
  R extends { type: "number" | "port" } ? number :
  R extends { type: "boolean" } ? boolean :
  R extends { type: "enum"; values: infer V extends readonly string[] } ? V[number] :
  string;

// スキーマから変換された値の型を導出する Mapped Type
// required: true または default 指定があれば非 undefined。それ以外は T | undefined
type EnvResult<S extends EnvSchema> = {
  readonly [K in keyof S]:
    S[K] extends ({ required: true } | { default: unknown })
      ? EnvValueOf<S[K]>
      : EnvValueOf<S[K]> | undefined
};
```

- `"enum"` 型: `values` 外の値が来た場合は `Error` を throw する
- `"enum"` の型推論: `values: ["dev","staging","prod"] as const` → `"dev" | "staging" | "prod"`

> **破壊的変更（Ver.1.1-4）**: `required` なし・`default` なしのフィールドは `T | undefined` を返す。以前はゼロ値（`0` / `false` / `""`）を返していた。

## 5.7 QueryRule / QuerySchema / QueryResult

`parseQuery()`（§9.5）のスキーマ検証・型変換に使用する型。

```typescript
// クエリ文字列の型変換ルール
type QueryRule =
  | { type: "string";  required?: boolean; default?: string }
  | { type: "number";  required?: boolean; default?: number; integer?: boolean; min?: number; max?: number }
  | { type: "boolean"; required?: boolean; default?: boolean }
  | { type: "enum";    values: readonly string[]; required?: boolean; default?: string };

type QuerySchema = Record<string, QueryRule>;

// ルール単体から値の TypeScript 型を導出するヘルパー型
// enum は values の要素リテラル Union 型を生成する（例: values: ["asc","desc"] → "asc" | "desc"）
type QueryValueOf<R extends QueryRule> =
  R extends { type: "number" } ? number :
  R extends { type: "boolean" } ? boolean :
  R extends { type: "enum"; values: infer V extends readonly string[] } ? V[number] :
  string;

// スキーマから変換された値の型を導出する Mapped Type
// required: true または default 指定があれば非 undefined。それ以外は T | undefined
type QueryResult<S extends QuerySchema> = {
  readonly [K in keyof S]:
    S[K] extends ({ required: true } | { default: unknown })
      ? QueryValueOf<S[K]>
      : QueryValueOf<S[K]> | undefined
};
```

## 5.8 ExtractRouteParams

ルートパスのリテラル型からパスパラメータのオブジェクト型を導出するユーティリティ型。

```typescript
// パスリテラル型からパラメータキー名を抽出するヘルパー型
// /:param セグメントと /*wildcard セグメントを再帰的に抽出する
type ParamKeys<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ParamKeys<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
    ? Param
    : Path extends `${string}*${infer WildName}`
    ? (WildName extends "" ? "wildcard" : WildName)
    : never;

// パスリテラル型からパラメータオブジェクト型を導出する
// string 型（リテラルでない）の場合は Record<string, string> にフォールバックする
type ExtractRouteParams<Path extends string> =
  string extends Path ? Record<string, string> :
  [ParamKeys<Path>] extends [never] ? Record<string, string> :
  { [K in ParamKeys<Path>]: string };
```

### 使用例

```typescript
import { ExtractRouteParams, Handler } from "@adlaire/fw";

type UserParams = ExtractRouteParams<"/users/:id">;
// → { id: string }

type PostParams = ExtractRouteParams<"/posts/:postId/comments/:commentId">;
// → { postId: string; commentId: string }

type StaticParams = ExtractRouteParams<"/static/*path">;
// → { path: string }

// ハンドラーの型引数として使用する
const userHandler: Handler<ExtractRouteParams<"/users/:id">> = (ctx) => {
  const id = ctx.params.id;   // string（型付き）
  return json({ id });
};
```

- `Router` のルート登録メソッド（`get / post / put / delete / patch / head / options`）はパスリテラルから自動推論する（§7.6 参照）

## 5.9 InferSchema

`Schema` 定義から TypeScript 型を導出するユーティリティ型。`assertBody<T>()` との組み合わせで Schema と型定義の二重管理を排除する。

```typescript
// Rule 型から TypeScript 型を導出するヘルパー型
type InferFieldType<R extends Rule> =
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
type InferSchema<S extends Schema> =
  { [K in keyof S as S[K] extends { required: true } ? K : never]-?: InferRuleValue<S[K]> } &
  { [K in keyof S as S[K] extends { required: true } ? never : K]?: InferRuleValue<S[K]> };
```

### 使用例

```typescript
import { type InferSchema, assertBody, createServer, json } from "@adlaire/fw";
import type { Schema } from "@adlaire/fw";

const createUserSchema = {
  name:  { type: "string",  required: true, min: 1, max: 50 } as const,
  age:   { type: "number",  required: true, min: 0, integer: true } as const,
  email: { type: "email",   required: true } as const,
  bio:   { type: "string" } as const,  // optional
} satisfies Schema;

// Schema から型を自動導出
type CreateUserBody = InferSchema<typeof createUserSchema>;
// → { name: string; age: number; email: string; bio?: string }

// assertBody<T>() と組み合わせることで Schema と型定義の二重管理を排除する
server.router.post("/users", (ctx) => {
  const body = assertBody<CreateUserBody>(ctx.body, createUserSchema);
  return json({ name: body.name, age: body.age });
});
```

## 5.10 TypedHandler

パスリテラル型から `ctx.params` の型を自動推論するハンドラー型エイリアス。`Handler<ExtractRouteParams<Path>, ...>` の省略形。

```typescript
type TypedHandler<
  Path extends string,
  B = unknown,
  Q extends Record<string, string> = Record<string, string>,
  S extends Record<string, unknown> = Record<string, unknown>,
> = Handler<ExtractRouteParams<Path>, B, Q, S>;
```

### 使用例

```typescript
import { type TypedHandler, json } from "@adlaire/fw";

// Handler<ExtractRouteParams<"/users/:id">> の省略形
const userHandler: TypedHandler<"/users/:id"> = (ctx) => {
  const id = ctx.params.id;   // string（型付き）
  return json({ id });
};

// Body や State も型付けする場合
type AuthState = { userId: string };
const postHandler: TypedHandler<"/posts/:postId", { title: string }, Record<string, string>, AuthState> = (ctx) => {
  const postId = ctx.params.postId;       // string
  const userId = ctx.state.userId;        // string
  return json({ postId, userId });
};
```

## 5.11 Simplify

TypeScript の mapped type や intersection 型を展開して可読性を向上させるユーティリティ型。IDE のホバー表示で `{ [K in ...] } & { ... }` のまま表示される場合に使用する。

```typescript
type Simplify<T> = { [K in keyof T]: T[K] } & {};
```

### 使用例

```typescript
import { type InferSchema, type Simplify } from "@adlaire/fw";

// InferSchema の結果をフラット表示する
type RawBody = InferSchema<typeof schema>;
// IDE 表示: { [K in ...]-?: ... } & { [K in ...]?: ... }

type Body = Simplify<InferSchema<typeof schema>>;
// IDE 表示: { name: string; age: number; bio?: string | undefined }
```

## 5.12 StrictQueryResult

`QueryResult<S>` の `T | undefined` フィールドをすべて非 `undefined` に変換する型。デフォルト値ガード済みの値を扱う際に使用する。

```typescript
type StrictQueryResult<S extends QuerySchema> = {
  readonly [K in keyof QueryResult<S>]-?: NonNullable<QueryResult<S>[K]>
};
```

### 使用例

```typescript
import { type StrictQueryResult, parseQuery, json } from "@adlaire/fw";

const schema = {
  page:  { type: "number" as const, default: 1, integer: true },
  limit: { type: "number" as const, default: 20, integer: true },
  sort:  { type: "enum" as const, values: ["asc", "desc"] as const, default: "asc" },
} as const;

server.router.get("/items", (ctx) => {
  const q = parseQuery(ctx.query, schema);
  // q.page は number（default があるので非 undefined）
  // q.sort は "asc" | "desc"（default があるので非 undefined）

  // StrictQueryResult は全フィールドが非 undefined
  const strict = q as StrictQueryResult<typeof schema>;
  const page: number = strict.page;       // undefined なし
  return json({ page });
});
```

---

# 6. server.ts　[Core]

App クラス・サーバー起動・エラーハンドラー・env 管理を担う。

## 6.1 App クラス

| メンバー | シグネチャ | 説明 |
|---------|-----------|------|
| `router` | `readonly Router` | ルーター参照 |
| `use()` | `use(mw: Middleware): this` | ミドルウェアを登録順に追加 |
| `onError()` | `onError(h: ErrorHandler): this` | エラーハンドラーを登録 |
| `fetch` | `(req: Request) => Promise<Response>` | Deno Deploy 向け Fetch ハンドラー |
| `listen()` | `listen(port: number, cb?: () => void): Deno.HttpServer` | Adlaire Deploy 向け起動。`Deno.HttpServer` を返す |
| `close()` | `close(): Promise<void>` | グレースフルシャットダウン。処理中リクエストの完了を待機してから停止 |
| `testRequest()` | `testRequest(method: string, path: string, options?): Promise<Response>` | サーバー起動なしでルートをテスト。内部で `fetch` ハンドラーを直接呼び出す |

### testRequest() オプション

```typescript
interface TestRequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
}
```

```typescript
// ファクトリ関数でインスタンスを生成
const server = createServer();
```

## 6.2 loadEnv()

`.env` ファイルを読み込み `Deno.env.set` で展開する。Adlaire Deploy 専用。

```typescript
// スキーマなし: .env を読み込み Deno.env に展開するだけ
function loadEnv(path?: string): Promise<void>;

// スキーマあり: 型変換・バリデーション済みの値オブジェクトを返す
function loadEnv<S extends EnvSchema>(options: {
  path?: string;
  schema: S;
}): Promise<EnvResult<S>>;
```

- `path` 省略時は実行ディレクトリの `.env` を読み込む
- スキーマあり呼び出し時: 各値を `EnvRule.type` に従い型変換する
  - `"number"` / `"port"`: `Number()` で変換。`"port"` は 1〜65535 の範囲を検証する
  - `"boolean"`: `"true"` → `true`、それ以外 → `false`
  - `"string"`: そのまま
- `required: true` の変数が未設定かつ `default` もない場合は `Error` を throw する

### 使用例

```typescript
import { loadEnv } from "@adlaire/fw";

// スキーマなし
await loadEnv(".env");

// スキーマあり
const env = await loadEnv({
  schema: {
    PORT:     { type: "port",    required: true, default: 8000 },
    DB_URL:   { type: "string",  required: true },
    DEBUG:    { type: "boolean", default: false },
  },
});
// env.PORT は number、env.DB_URL は string、env.DEBUG は boolean
```

| 環境 | loadEnv() | 設定方法 |
|------|-----------|---------|
| Deno Deploy | 不要 | Deno Deploy ダッシュボードで設定 |
| Adlaire Deploy | 起動時に `loadEnv()` を実行 | コンテナ / `.env` ファイルで注入 |

---

# 7. router.ts　[Core]

ルート登録・グループ化・パスマッチングを担う。

## 7.1 Router クラス

| メソッド | 説明 |
|---------|------|
| `get / post / put / delete / patch / head / options(path, handler)` | ルートを登録（メソッドチェーン対応） |
| `group(prefix)` | プレフィクス付き `RouteGroup` を返す |
| `match(method, url)` | ハンドラーと `params` を返す。未一致は `null` |
| `routes()` | 登録済みルートの一覧を返す（`ReadonlyArray<Route>`） |

## 7.2 パスマッチングルール

| パターン | 説明 | 例 |
|---------|------|-----|
| 固定セグメント | 完全一致 | `/users/list` |
| 動的セグメント | `:name` で変数化 | `/users/:id` |
| ワイルドカード | `*name` でそれ以降のパス全体を変数化。最後のセグメントにのみ使用可 | `/static/*path` |
| クエリストリング | パスマッチから除外し `ctx.query` に格納 | `?page=1` |

マッチング優先順位（降順）: 固定セグメント > 動的セグメント > ワイルドカード

## 7.3 HEAD / OPTIONS の動作

| メソッド | 動作 |
|---------|------|
| `HEAD` | 明示的に `head()` で登録したハンドラーを優先する。未登録の場合、対応する `GET` ハンドラーを実行しボディを除いたレスポンスを返す |
| `OPTIONS` | `cors()` ミドルウェアがプリフライトを処理する。`options()` で明示登録した場合はミドルウェアより後に呼ばれる |

## 7.4 ルートレベルミドルウェア

ハンドラーの前にミドルウェアを挟むことで、特定ルート/グループのみにミドルウェアを適用する。

```typescript
// ルート単位: ハンドラーの前にミドルウェアを可変長で渡す
server.router.get("/admin", authMiddleware, (ctx) => {
  return json({ ok: true });
});

// 複数ミドルウェア
server.router.post("/api/data", authMiddleware, rateLimitMiddleware, (ctx) => {
  return json(ctx.body);
});

// グループ単位: group.use() で登録
const admin = server.router.group("/admin");
admin.use(authMiddleware);
admin.get("/dashboard", (ctx) => json({ page: "dashboard" }));
```

- ルートレベルミドルウェアはグローバルミドルウェア（`server.use()`）の後に実行される
- グループの `use()` はそのグループ配下の全ルートに適用される
- 最後の引数が `Handler`、それ以前が `Middleware`

## 7.5 名前付きルート

ルートに名前を付けてリバース URL 生成を行う。

```typescript
server.router.get("/users/:id", handler, { name: "users.show" });

const url = server.router.url("users.show", { id: "123" });
// → "/users/123"
```

| メソッド | 説明 |
|---------|------|
| `url(name, params?)` | 名前付きルートから URL を生成する。未登録の名前は `Error` を throw |

## 7.6 型付きルートパラメータ（ExtractRouteParams 連携）

ルート登録メソッドはパスリテラル型から `ExtractRouteParams<Path>`（§5.8）を自動推論し、ハンドラーの `ctx.params` を型付けする。

```typescript
// get<Path extends string> のシグネチャ概念
get<Path extends string>(
  path: Path,
  handler: Handler<ExtractRouteParams<Path>>,
): this;
```

### 使用例

```typescript
import { createServer, json } from "@adlaire/fw";

const server = createServer();

// ctx.params.id が string として型付けされる
server.router.get("/users/:id", (ctx) => {
  const id = ctx.params.id;       // string（型付き）
  return json({ id });
});

// ctx.params.postId と ctx.params.commentId が string として型付けされる
server.router.get("/posts/:postId/comments/:commentId", (ctx) => {
  const { postId, commentId } = ctx.params;
  return json({ postId, commentId });
});
```

- ルートレベルミドルウェア付きオーバーロードでも同様に型推論が機能する
- `{ name: "..." }` の RouteOptions を渡す場合も型推論を維持する
- `RouteGroup` の各ルート登録メソッドも同様の型付きオーバーロードをサポートする

```typescript
const admin = server.router.group("/admin");
admin.get("/users/:id", (ctx) => {
  const id = ctx.params.id;   // string（型付き）
  return json({ id });
});
```

---

# 8. middleware.ts　[Core]

バリデーターを担う。
関連性の高いユーティリティを単一ファイルに集約することで import コストを最小化する。

## 8.1 バリデーター

### Rule 型（型定義は §5.3 参照）

| 型 | 共通オプション | 固有オプション |
|----|--------------|--------------|
| `string` | `required` / `nullable` / `message` | `min` / `max`（文字数）/ `pattern`（正規表現）/ `enum`（列挙値） |
| `number` | `required` / `nullable` / `message` | `min` / `max`（値域）/ `integer`（整数チェック） |
| `boolean` | `required` / `nullable` / `message` | — |
| `email`  | `required` / `nullable` / `message` | — |
| `url`    | `required` / `nullable` / `message` | `allowedProtocols`（デフォルト: `["http", "https"]`）|
| `object` | `required` / `nullable` / `message` | `fields`（サブスキーマ） |
| `array`  | `required` / `nullable` / `message` | `items`（要素ルール）/ `min` / `max`（要素数） |
| `custom` | `required` / `nullable` / `message` | `validate(v: unknown): true \| string` |

### 使用例

```typescript
const schema: Schema = {
  name:    { type: "string", required: true, min: 1, max: 50 },
  code:    { type: "string", pattern: /^\d{3}-\d{4}$/ },
  role:    { type: "string", enum: ["admin", "editor", "viewer"] },
  age:     { type: "number", min: 0, max: 150, integer: true },
  active:  { type: "boolean", nullable: true },
  address: {
    type: "object",
    fields: {
      city: { type: "string", required: true },
      zip:  { type: "string", required: true },
    },
  },
  tags:  { type: "array", items: { type: "string" }, max: 10 },
  score: { type: "custom", validate: (v) => (typeof v === "number" && v >= 0 && v <= 100) || "0〜100 で入力" },
};

const errors: ValidationError[] = validate(ctx.body, schema);
```

### バリデーション仕様

- エラーパスはドット記法（例: `address.city`）
- 配列要素のエラーパスはインデックス記法（例: `tags[0]`）
- ネスト組み合わせ例: `items[2].name`
- 戻り値が空配列の場合はバリデーション成功
- `required: true` かつ値が `undefined` の場合はエラー
- `nullable: true` の場合、`null` 値はバリデーションを通過する
- `required: true` + `nullable: false`（デフォルト）の場合、`null` はエラー

---

## 8.2 CORS ミドルウェア

`cors()` ファクトリ関数が返す `Middleware` を `server.use()` に登録することで、Cross-Origin Resource Sharing ヘッダーを制御する。

### CorsOptions

```typescript
interface CorsOptions {
  /** 許可するオリジン（デフォルト: "*"） */
  origin?: string | string[] | RegExp | ((origin: string) => boolean);
  /** 許可する HTTP メソッド（デフォルト: ["GET","POST","PUT","DELETE","PATCH"]） */
  methods?: Method[];
  /** 許可するリクエストヘッダー（デフォルト: ["Content-Type","Authorization"]） */
  allowedHeaders?: string[];
  /** クライアントに公開するレスポンスヘッダー（デフォルト: []） */
  exposedHeaders?: string[];
  /** 認証情報（Cookie 等）を許可するか（デフォルト: false） */
  credentials?: boolean;
  /** プリフライトキャッシュ秒数（デフォルト: 5） */
  maxAge?: number;
}
```

### cors() 関数

```typescript
function cors(options?: CorsOptions): Middleware
```

### 動作仕様

- `origin` 省略時（または `"*"`）: すべてのオリジンに `Access-Control-Allow-Origin: *` を付与する
- `origin` が `string` の場合: リクエストの `Origin` ヘッダーと一致する場合のみ付与する
- `origin` が `string[]` の場合: リスト内いずれかと一致する場合に付与する
- `origin` が `RegExp` の場合: `test()` が `true` の場合に付与する
- `origin` が `(origin: string) => boolean` の場合: 戻り値が `true` の場合に付与する
- `credentials: true` かつ `origin` が `"*"`（省略を含む）の組み合わせは禁止。`cors()` 呼び出し時に `TypeError` を throw する
- `OPTIONS` プリフライトリクエストには `204 No Content` を即座に返す（後続のミドルウェア・ハンドラーを呼ばない）
- オリジン評価がリクエスト依存（`string[]` / `RegExp` / 関数）の場合は `Vary: Origin` を付与する
- `Origin` ヘッダーが存在しないリクエスト（curl・サーバー間通信等）には CORS ヘッダーを付与せず、そのまま `next()` を呼ぶ

### 付与するヘッダー

| ヘッダー | 付与条件 |
|---------|---------|
| `Access-Control-Allow-Origin` | 常に（オリジン評価結果に基づく） |
| `Access-Control-Allow-Methods` | `methods` オプションの値 |
| `Access-Control-Allow-Headers` | `allowedHeaders` オプションの値 |
| `Access-Control-Expose-Headers` | `exposedHeaders` が空でない場合 |
| `Access-Control-Allow-Credentials` | `credentials: true` の場合 |
| `Access-Control-Max-Age` | プリフライト（`OPTIONS`）時のみ、`maxAge` オプションの値 |
| `Vary` | `origin` がリクエスト依存の場合（`Vary: Origin`） |

### 使用例

```typescript
import { createServer, cors } from "@adlaire/fw";

const server = createServer();

// 全オリジン許可（credentials なし）
server.use(cors());

// 特定オリジン + credentials
server.use(cors({
  origin: "https://example.com",
  credentials: true,
}));

// 複数オリジン
server.use(cors({
  origin: ["https://a.example.com", "https://b.example.com"],
}));

// 動的判定
server.use(cors({
  origin: (o) => o.endsWith(".example.com"),
}));
```

## 8.3 ロガーミドルウェア

```typescript
function logger(options?: LoggerOptions): Middleware
```

```typescript
interface LogInfo {
  method: string;       // HTTP メソッド（"GET" / "POST" 等）
  path: string;         // リクエストパス
  status: number;       // レスポンスステータスコード
  durationMs: number;   // 処理時間（ミリ秒、Math.round で整数）
}

interface LoggerOptions {
  level?: "silent" | "info" | "debug";      // デフォルト: "info"
  format?: (info: LogInfo) => string;        // カスタムフォーマット（省略時はデフォルト書式）
}
```

- リクエストのメソッド・パス・ステータスコード・レスポンス時間をログ出力する
- 出力先は `console.log`（外部依存なし）
- `level: "silent"` でログ出力を抑制
- `level: "debug"` でヘッダー情報も出力（`format` 指定時はフォーマット後の文字列のみ出力）
- `format` 省略時のデフォルト出力形式: `GET /users 200 12ms`
- `format` 指定時: `format(info)` の戻り値を `console.log` に出力する

### 使用例

```typescript
import { createServer, logger } from "@adlaire/fw";

const server = createServer();

// デフォルト書式
server.use(logger());

// カスタムフォーマット
server.use(logger({
  format: ({ method, path, status, durationMs }) =>
    `[${new Date().toISOString()}] ${method} ${path} → ${status} (${durationMs}ms)`,
}));
```

## 8.4 レートリミッター

```typescript
function rateLimit(options: RateLimitOptions): Middleware
```

```typescript
// カスタムストアのインターフェース（インメモリ以外の実装に差し替え可能）
interface RateLimitStore {
  /** 指定キーのカウントをインクリメントし、現在のカウントとリセット時刻を返す */
  increment(key: string, windowMs: number): { count: number; resetAt: number } | Promise<{ count: number; resetAt: number }>;
  /** 指定キーのカウントをリセットする */
  reset(key: string): void | Promise<void>;
}

interface RateLimitOptions {
  windowMs: number;                                // ウィンドウ期間（ミリ秒）
  max: number;                                     // ウィンドウ内の最大リクエスト数
  key?: (ctx: Context) => string;                  // クライアント識別キー（デフォルト: IP アドレス）
  message?: string;                                // 429 レスポンスメッセージ
  store?: RateLimitStore;                          // カスタムストア（省略時: インメモリ Map）
}
```

- `store` 省略時はインメモリ固定ウィンドウカウンター（`Map`）を使用する
- `store` 指定時: `increment()` が返す `{ count, resetAt }` に基づいてレート判定を行う
- 超過時 `429 Too Many Requests` + `Retry-After` ヘッダーを返す
- デフォルトキー: `ctx.req.headers.get("x-forwarded-for")` → `"unknown"`

### 使用例

```typescript
import { createServer, rateLimit } from "@adlaire/fw";

const server = createServer();

// デフォルト（インメモリ）
server.use(rateLimit({ windowMs: 60_000, max: 100 }));

// カスタムストア（例: Deno KV を使用）
const kv = await Deno.openKv();
const kvStore: RateLimitStore = {
  async increment(key, windowMs) {
    const entry = await kv.get<{ count: number; resetAt: number }>(["rl", key]);
    const now = Date.now();
    const data = entry.value && now < entry.value.resetAt
      ? { count: entry.value.count + 1, resetAt: entry.value.resetAt }
      : { count: 1, resetAt: now + windowMs };
    await kv.set(["rl", key], data, { expireIn: windowMs });
    return data;
  },
  async reset(key) { await kv.delete(["rl", key]); },
};
server.use(rateLimit({ windowMs: 60_000, max: 100, store: kvStore }));
```

## 8.5 ETag ミドルウェア

```typescript
function etag(): Middleware
```

- `next()` 実行後、レスポンスボディから弱い ETag（`W/"<ハッシュ>"` 形式）を算出して `ETag` ヘッダーを付与する
- ハッシュは `crypto.subtle.digest("SHA-256", body)` で生成（Web Crypto API）
- リクエストの `If-None-Match` ヘッダーが ETag と一致した場合、`304 Not Modified`（ボディなし）を返す
- ボディが空または `null` のレスポンスには ETag を付与しない

## 8.6 応答圧縮ミドルウェア

```typescript
function compress(options?: CompressOptions): Middleware
```

```typescript
interface CompressOptions {
  threshold?: number;  // 圧縮対象の最小バイト数（デフォルト: 1024）
}
```

- `Accept-Encoding` ヘッダーに基づき `gzip` / `deflate` を適用する
- Web 標準 `CompressionStream` API を使用（外部依存なし）
- `Content-Encoding` / `Vary: Accept-Encoding` を付与する
- `threshold` 未満のレスポンスは圧縮しない

## 8.7 ボディサイズ制限ミドルウェア

```typescript
function bodyLimit(options: BodyLimitOptions): Middleware
```

```typescript
interface BodyLimitOptions {
  maxBytes: number;    // 最大ボディサイズ（バイト）
  message?: string;    // エラーメッセージ（デフォルト: "Payload Too Large"）
}
```

- `Content-Length` ヘッダーが `maxBytes` を超える場合、`413 Payload Too Large` を返す
- `Content-Length` ヘッダーが存在しない場合はスキップ（サイズ不明）
- **注意**: リバースプロキシ（nginx 等）が `Content-Length` を必ず付与する構成で最も効果的に機能する

### 使用例

```typescript
import { bodyLimit, createServer } from "@adlaire/fw";

const server = createServer();
server.use(bodyLimit({ maxBytes: 1 * 1024 * 1024 })); // 1 MB
```

## 8.8 リクエスト ID ミドルウェア

```typescript
function requestId(options?: RequestIdOptions): Middleware<{ requestId: string }>
```

```typescript
interface RequestIdOptions {
  header?: string;               // ヘッダー名（デフォルト: "X-Request-ID"）
  generator?: () => string;      // ID 生成関数（デフォルト: crypto.randomUUID()）
}
```

- リクエストの `X-Request-ID` ヘッダーを読み取る。存在する場合はそれを使用し、ない場合は `crypto.randomUUID()` で生成する
- 生成または受け取った ID を `ctx.state.requestId` に格納する（`string` 型）
- レスポンスに `X-Request-ID` ヘッダーを付与する

### 使用例

```typescript
import { createServer, requestId } from "@adlaire/fw";

const server = createServer();
server.use(requestId());

server.router.get("/", (ctx) => {
  const id = (ctx.state as { requestId: string }).requestId;
  return json({ requestId: id });
});
```

## 8.9 タイムアウトミドルウェア

```typescript
function timeout(options: TimeoutOptions): Middleware
```

```typescript
interface TimeoutOptions {
  ms: number;                   // タイムアウト期間（ミリ秒）
  message?: string;             // エラーメッセージ（デフォルト: "Request Timeout"）
  status?: 408 | 503 | 504;    // レスポンスステータス（デフォルト: 503）
}
```

- `Promise.race()` を用いて `next()` とタイムアウトを競争させる
- タイムアウト発生時は指定ステータス（デフォルト 503）の JSON レスポンスを返す
- タイムアウト後もハンドラーは内部で完了まで実行される（キャンセルは行わない）

### 使用例

```typescript
import { createServer, timeout } from "@adlaire/fw";

const server = createServer();
server.use(timeout({ ms: 5000 })); // 5 秒
```

## 8.10 セキュリティヘッダーミドルウェア

```typescript
function secureHeaders(options?: SecureHeadersOptions): Middleware
```

```typescript
interface ContentSecurityPolicy {
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

interface SecureHeadersOptions {
  /** X-Content-Type-Options: nosniff（デフォルト: true） */
  xContentTypeOptions?: boolean;
  /** X-Frame-Options（デフォルト: "SAMEORIGIN"、false で付与しない） */
  xFrameOptions?: "DENY" | "SAMEORIGIN" | false;
  /** X-XSS-Protection: 0 — 旧式 XSS フィルター無効化（デフォルト: true） */
  xXssProtection?: boolean;
  /** Referrer-Policy（デフォルト: "strict-origin-when-cross-origin"、false で付与しない） */
  referrerPolicy?: string | false;
  /** Permissions-Policy（デフォルト: false） */
  permissionsPolicy?: string | false;
  /** Content-Security-Policy（デフォルト: false） */
  contentSecurityPolicy?: ContentSecurityPolicy | false;
}
```

- レスポンスに以下のセキュリティヘッダーを付与する

| ヘッダー | デフォルト値 |
|---------|------------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-XSS-Protection` | `0`（旧式フィルター無効化） |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | （付与しない） |
| `Content-Security-Policy` | （付与しない） |

- 各オプションで `false` を設定したヘッダーは付与しない
- `ContentSecurityPolicy` のプロパティは camelCase。ビルダー関数が対応する CSP ディレクティブ文字列に変換する

### 使用例

```typescript
import { createServer, secureHeaders } from "@adlaire/fw";

const server = createServer();
server.use(secureHeaders());

// X-Frame-Options を DENY に変更 + CSP を設定
server.use(secureHeaders({
  xFrameOptions: "DENY",
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'nonce-abc123'"],
    styleSrc: ["'self'", "https://fonts.googleapis.com"],
    upgradeInsecureRequests: true,
  },
}));
```

## 8.11 CSRF 保護ミドルウェア

Double Submit Cookie パターンを用いて CSRF 攻撃を防止する。

```typescript
function csrfProtection(options?: CsrfOptions): Middleware
```

```typescript
interface CsrfOptions {
  /** CSRF トークンを格納するクッキー名（デフォルト: "csrf_token"） */
  cookie?: string;
  /** リクエストから CSRF トークンを読み取るヘッダー名（デフォルト: "X-CSRF-Token"） */
  header?: string;
  /** 保護対象の HTTP メソッド（デフォルト: ["POST","PUT","PATCH","DELETE"]） */
  methods?: Method[];
  /** クッキーの Secure フラグ（デフォルト: false） */
  secure?: boolean;
}
```

### 動作仕様

| フェーズ | 動作 |
|---------|------|
| **セーフメソッド**（GET / HEAD / OPTIONS）| トークンが未設定の場合、新規トークンを生成して Set-Cookie で付与する |
| **保護対象メソッド**（POST / PUT 等）| リクエストのクッキートークンとヘッダートークンを照合する |
| トークン不一致 | `403 Forbidden` (`{ error: "CSRF token mismatch" }`) を返す |
| クッキー未設定 | `403 Forbidden` (`{ error: "CSRF token missing" }`) を返す |

- トークンは `crypto.getRandomValues()` で生成する 64 文字の 16 進文字列（256 bit）
- クッキーは `HttpOnly: false`（JavaScript から読み取り可能）、`SameSite: Strict`、`Path: /` を設定する
- `secure: true` の場合、クッキーに `Secure` フラグを付与する

### 使用例

```typescript
import { createServer, csrfProtection } from "@adlaire/fw";

const server = createServer();
server.use(csrfProtection());

// クライアント側: GET 時に取得した csrf_token クッキーを
// X-CSRF-Token ヘッダーに付与して POST 等を送信する
```

## 8.12 型付きボディアサーション

バリデーション済みのボディを型付きで返す。

```typescript
function assertBody<T>(body: unknown, schema: Schema): T
```

- `validate(body, schema)` を内部で呼び出す
- バリデーションエラーが存在する場合: `HTTPError(400, "Validation Failed", errors)` を throw する
- エラーがない場合: 実行時バリデーション済みとして `T` にキャストして返す
- `as T` は実行時バリデーション後の正当な型アサーション（`any` 使用禁止原則の例外）

### 使用例

```typescript
import { assertBody, createServer, HTTPError, json } from "@adlaire/fw";

type CreateUserBody = { name: string; age: number };

const schema = {
  name: { type: "string" as const, required: true, min: 1 },
  age:  { type: "number" as const, required: true, min: 0, integer: true },
};

server.router.post("/users", (ctx) => {
  const body = assertBody<CreateUserBody>(ctx.body, schema);
  // body.name: string、body.age: number（型付き）
  return json({ created: body.name });
});
```

## 8.13 HSTS ミドルウェア

HTTP Strict Transport Security ヘッダーを付与する。HTTPS 接続を強制し、ダウングレード攻撃と Cookie ハイジャックを防止する。

```typescript
function hsts(options?: HstsOptions): Middleware
```

```typescript
interface HstsOptions {
  maxAge?: number;              // Strict-Transport-Security の max-age（秒）（デフォルト: 31536000 = 1年）
  includeSubDomains?: boolean;  // サブドメインにも適用する（デフォルト: true）
  preload?: boolean;            // ブラウザの HSTS プリロードリスト登録用（デフォルト: false）
}
```

- レスポンスに `Strict-Transport-Security` ヘッダーを付与する
- デフォルト値: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `preload: true` の場合: `; preload` を追加する
- **注意**: HTTPS 環境でのみ使用する。HTTP 環境で付与してもブラウザは無視する

### 付与するヘッダー例

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### 使用例

```typescript
import { createServer, hsts } from "@adlaire/fw";

const server = createServer();
server.use(hsts());

// カスタム設定（プリロードリスト申請用）
server.use(hsts({ maxAge: 63_072_000, includeSubDomains: true, preload: true }));
```

## 8.14 IP フィルタリングミドルウェア

クライアント IP アドレスに基づいてリクエストを許可または拒否する。

```typescript
function ipFilter(options: IpFilterOptions): Middleware
```

```typescript
interface IpFilterOptions {
  allow?: string[];                    // 許可リスト（IPv4 アドレス / CIDR 記法）
  deny?: string[];                     // 拒否リスト（IPv4 アドレス / CIDR 記法）
  getIp?: (ctx: Context) => string;    // IP 取得関数（デフォルト: X-Forwarded-For ヘッダー → "unknown"）
  message?: string;                    // 拒否時メッセージ（デフォルト: "Forbidden"）
}
```

### 判定ルール

| allow | deny | 動作 |
|-------|------|------|
| 指定あり | — | `allow` リストに一致する IP のみ許可。それ以外は 403 |
| — | 指定あり | `deny` リストに一致する IP を拒否。それ以外は許可 |
| 指定あり | 指定あり | `allow` 優先。`allow` に一致すれば許可。次に `deny` を確認し一致すれば拒否 |
| 両方なし | — | すべて許可（パススルー） |

### IPv4 CIDR サポート

- `"192.168.0.0/24"` 等の CIDR 記法をサポートする（IPv4 のみ）
- 外部ライブラリに依存せず、内部関数 `parseIpv4()` / `matchesCidr()` で実装する

### 使用例

```typescript
import { createServer, ipFilter } from "@adlaire/fw";

const server = createServer();

// 社内 IP のみ許可
server.use(ipFilter({
  allow: ["192.168.0.0/24", "10.0.0.0/8"],
}));

// 既知の悪意ある IP を拒否
server.use(ipFilter({
  deny: ["1.2.3.4", "5.6.7.0/24"],
}));

// カスタム IP 取得（リバースプロキシ配置時）
server.use(ipFilter({
  deny: ["10.0.0.1"],
  getIp: (ctx) => ctx.req.headers.get("CF-Connecting-IP") ?? "unknown",
}));
```

---

# 9. response.ts　[Core]

すべてのヘルパーは `Response` オブジェクトを返す（直接送信は行わない）。

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `json` | `json(data, status?)` | JSON レスポンス（デフォルト 200） |
| `text` | `text(body, status?)` | プレーンテキスト（`Content-Type: text/plain; charset=UTF-8`） |
| `html` | `html(body, status?)` | HTML レスポンス（`Content-Type: text/html; charset=UTF-8`、デフォルト 200） |
| `send` | `send(status, body?)` | 任意ステータスと生テキスト |
| `redirect` | `redirect(url, status?)` | リダイレクト（`url` は `string \| URL`、デフォルト 302。`status` は `301 \| 302 \| 307 \| 308` のみ許可） |

### 使用例

```typescript
import { createServer, html, json, redirect } from "@adlaire/fw";

const server = createServer();

server.router.get("/page", (ctx) => {
  return html("<h1>Hello</h1>");
});

server.router.get("/old-path", (ctx) => {
  return redirect("/new-path", 301);
});
```

## 9.2 静的ファイル配信

```typescript
function serveStatic(options: StaticOptions): Handler
```

```typescript
interface StaticOptions {
  root: string;  // 配信ルートディレクトリ（絶対パスまたは実行ディレクトリ相対パス）
}
```

- ワイルドカードルート `*path`（§7.2）と組み合わせて使用する
- MIME タイプは拡張子から自動判定する
- ディレクトリトラバーサル防御: パス正規化後に `root` 外を参照する場合は `403 Forbidden` を返す
- ファイル未存在時は `404 Not Found` を返す

### 使用例

```typescript
server.router.get("/static/*path", serveStatic({ root: "./public" }));
```

## 9.3 Cookie ヘルパー

```typescript
function getCookie(req: Request, name: string): string | null
function setCookie(headers: Headers, name: string, value: string, options?: CookieOptions): void
function deleteCookie(headers: Headers, name: string): void
```

```typescript
interface CookieOptions {
  maxAge?: number;       // 秒数
  expires?: Date;
  path?: string;         // デフォルト: "/"
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}
```

- Web 標準 `Cookie` / `Set-Cookie` ヘッダーのみ使用する
- `deleteCookie` は `Max-Age=0` を設定して削除する

## 9.4 Content-Negotiation

```typescript
function accepts(req: Request, ...types: string[]): string | null
```

- `Accept` ヘッダーをパースし、`types` の中から最も適合する Content-Type を返す
- Quality 値（`q=`）を考慮する
- マッチするものがない場合は `null` を返す

### 使用例

```typescript
import { accepts, html, json } from "@adlaire/fw";

server.router.get("/data", (ctx) => {
  if (accepts(ctx.req, "text/html")) return html("<h1>Data</h1>");
  return json({ data: [] });
});
```

## 9.5 クエリ文字列スキーマパース

```typescript
function parseQuery<S extends QuerySchema>(
  query: Record<string, string>,
  schema: S,
): QueryResult<S>
```

- `ctx.query`（`Record<string, string>`）をスキーマに基づいて型変換する
- `QuerySchema`（§5.7）で型変換・バリデーションルールを定義する
- `required: true` の項目が存在しない場合、`HTTPError(400)` を throw する
- `default` が指定されている場合、値が存在しないときにデフォルト値を使用する
- 変換後の値は `QueryResult<S>` の型（`number` / `boolean` / `string` / `T | undefined`）で返す

### 変換ルール

| QueryRule.type | 入力例 | 変換後 |
|----------------|--------|--------|
| `"string"` | `"hello"` | `"hello"` |
| `"number"` | `"42"` | `42`（`Number()` で変換。NaN の場合 HTTPError(400)） |
| `"boolean"` | `"true"` / `"1"` | `true`。それ以外は `false` |
| `"enum"` | `"asc"` | `"asc"`（`values` 外は HTTPError(400)） |

- `"number"` で `integer: true` の場合、整数以外は `HTTPError(400)`
- `"number"` で `min` / `max` が指定されている場合、範囲外は `HTTPError(400)`

### 使用例

```typescript
import { createServer, json, parseQuery } from "@adlaire/fw";

const server = createServer();

server.router.get("/items", (ctx) => {
  const q = parseQuery(ctx.query, {
    page:  { type: "number", default: 1, integer: true, min: 1 },
    limit: { type: "number", default: 20, integer: true, min: 1, max: 100 },
    sort:  { type: "enum", values: ["asc", "desc"] as const, default: "asc" },
    q:     { type: "string" },
  });
  // q.page は number、q.limit は number、q.sort は string、q.q は string | undefined
  return json({ page: q.page, limit: q.limit });
});
```

## 9.6 パスパラメータ型変換

```typescript
function parseParam(value: string, type: "number"): number
function parseParam(value: string, type: "int"): number
function parseParam(value: string, type: "uuid"): string
```

- `ctx.params` の文字列値を指定の型に変換する
- 変換失敗時は `HTTPError(400)` を throw する

| type | 動作 |
|------|------|
| `"number"` | `Number()` で変換。`NaN` の場合 `HTTPError(400)` |
| `"int"` | 整数変換。整数でない場合 `HTTPError(400)` |
| `"uuid"` | UUID v4 形式の検証。不正形式の場合 `HTTPError(400)` |

### 使用例

```typescript
import { createServer, json, parseParam } from "@adlaire/fw";

const server = createServer();

server.router.get("/users/:id", (ctx) => {
  const id = parseParam(ctx.params.id, "int");   // number
  return json({ id });
});

server.router.get("/items/:uuid", (ctx) => {
  const uuid = parseParam(ctx.params.uuid, "uuid");  // string（UUID 形式保証）
  return json({ uuid });
});
```

## 9.7 HTML サニタイズ

```typescript
function sanitizeHtml(input: string): string
```

- HTML 特殊文字を HTML エンティティにエスケープする
- `html()` レスポンスで動的コンテンツを出力する際の XSS 防御に使用する

| 文字 | エスケープ後 |
|------|------------|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#x27;` |

### 使用例

```typescript
import { html, sanitizeHtml } from "@adlaire/fw";

server.router.get("/greet", (ctx) => {
  const name = sanitizeHtml(ctx.query.name ?? "");
  return html(`<h1>Hello, ${name}!</h1>`);
});
```

---

# 10. エラーハンドリング

## 10.1 エラーレスポンス形式

すべてのエラーレスポンスは `ErrorResponse`（§5.4）形式で統一する。

```typescript
// 正常系
{ error: "Not Found" }                              // 404
{ error: "Method Not Allowed" }                     // 405
{ error: "Internal Server Error" }                  // 500
{ error: "Forbidden", detail: "..." }               // HTTPError 由来

// バリデーションエラー
{ error: "Validation Failed", detail: ValidationError[] }  // 400
```

## 10.2 エラーケース一覧

| ケース | ステータス | レスポンス | 処理箇所 |
|--------|:---------:|-----------|---------|
| ルート未一致 | 404 | `{ error: "Not Found" }` | `server.ts`（`Router.match` が `null`） |
| メソッド不一致 | 405 | `{ error: "Method Not Allowed" }` | `server.ts`（パスはマッチするがメソッドが未登録） |
| `HTTPError` スロー | HTTPError.status | `{ error: HTTPError.message, detail?: HTTPError.detail }` | `onError` チェーン or フォールバック |
| ハンドラー例外（その他） | 500 | `{ error: "Internal Server Error" }` | `onError` チェーン or フォールバック |
| バリデーション失敗 | 400 | `{ error: "Validation Failed", detail: ValidationError[] }` | ハンドラー内で `validate()` 結果を確認 |

## 10.3 HTTPError の使用

ハンドラーから `HTTPError` をスローすることで任意のステータスコードでレスポンスを返せる。

```typescript
import { createServer, HTTPError, json } from "@adlaire/fw";

server.router.get("/admin", (ctx) => {
  if (!ctx.state.isAdmin) {
    throw new HTTPError(403, "Forbidden");
  }
  return json({ ok: true });
});
```

## 10.4 onError 優先順位

1. `server.onError()` で登録したハンドラーを登録順に試行する
2. ハンドラーが `Response` を返した時点でそれを使用し、以降のハンドラーは呼ばない
3. すべてのハンドラーが `Response` を返さなかった（`null` / `undefined` / `void`）場合、フォールバックを返す
   - `HTTPError` の場合: `HTTPError.status` + `{ error: message, detail? }`
   - それ以外: `500` + `{ error: "Internal Server Error" }`

---

# 11. 設計制約まとめ

| 制約 | 内容 |
|------|------|
| **外部変更禁止（絶対原則）** | Adlaire Group のみがフレームワークの実装・設計方針を決定する。`Core/` への直接アクセスをパッケージ構造で封鎖する |
| **型安全（絶対原則）** | 型安全はフレームワークのアーキテクチャが構造的に保証する。公開 API に `any` を含めない。エスケープハッチを提供しない |
| **any 使用禁止（絶対原則）** | `any` 型・`as any`・`// @ts-ignore`・`// @ts-expect-error`・型安全を迂回するキャストチェーンをフレームワーク全域で禁止。例外なし |
| **npm 禁止（絶対原則）** | `npm:` スペシャライザー禁止。`jsr:@std/*` と Web 標準 API のみ |
| **Core フラット構成** | `Core/` 内はサブディレクトリ分割禁止。すべてのファイルを同階層に配置する |
| **Web 標準ベース** | `Request` / `Response` / `URL` / `ReadableStream` を使用。Node.js API 不使用 |
| **デュアルデプロイ対応** | Fetch ハンドラー形式（Deno Deploy）と `Deno.serve`（Adlaire Deploy）を両サポート |
| **Handler は Response を返す** | `void` 禁止。すべてのハンドラーは `Response` を返す |

---

# 12. cli.ts　[CLI]

`adlaire-fw` コマンドの実装。`cli.ts`（フレームワークルート）として提供する。

## 12.1 エントリーポイント

```bash
# パッケージ経由で実行
deno run -A jsr:@adlaire/fw/cli <command> [args]

# ローカル開発
deno run -A cli.ts <command> [args]
```

## 12.2 コマンド一覧

| コマンド | 書式 | 説明 |
|---------|------|------|
| `routes` | `adlaire-fw routes [entry]` | 登録ルート一覧を表示する |
| `dev` | `adlaire-fw dev [entry]` | ファイル変更監視付き開発サーバーを起動する |
| `new` | `adlaire-fw new <name>` | プロジェクトテンプレートを生成する |
| `check` | `adlaire-fw check [entry]` | 型検証を実行する |

`entry` のデフォルト値は `./main.ts`。

## 12.3 routes コマンド

エントリーファイルを動的インポートし、`server.router.routes()` の結果をテーブル形式で表示する。

- エントリーファイルは `export const server` または `export { server }` で `App` インスタンスをエクスポートする必要がある
- `listen()` はエントリーファイル内で `import.meta.main` ガードを使用すること（CLI からインポート時にサーバーが起動しないようにするため）

```typescript
// main.ts の推奨パターン
export const server = createServer();
// ... ルート定義 ...
if (import.meta.main) {
  server.listen(8000);
}
```

## 12.4 dev コマンド

```bash
adlaire-fw dev [./main.ts]
# → deno run --watch --allow-all <entry> を子プロセスとして起動
```

- `Deno.Command` を使用してサブプロセスを起動する
- stdin / stdout / stderr をすべて親プロセスに継承する
- Ctrl+C 等でサブプロセスが終了した場合、CLI も終了する

## 12.5 new コマンド

```bash
adlaire-fw new <name>
```

以下のファイルを生成する:

```
<name>/
├── main.ts        # App インスタンス + ルート定義サンプル
├── deno.json      # プロジェクト設定（@adlaire/fw 依存含む）
└── .env           # 環境変数テンプレート
```

## 12.6 check コマンド

```bash
adlaire-fw check [./main.ts]
# → deno check <entry> を子プロセスとして起動
```

- `deno check` の終了コードをそのまま CLI の終了コードとして返す

