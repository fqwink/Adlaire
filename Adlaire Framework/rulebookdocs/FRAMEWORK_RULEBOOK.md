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
├── deno.json             # Deno 設定（exports: "./mod.ts" のみ）
└── Core/                 # 【Adlaire Group 専用】サブディレクトリ分割禁止・フラット配置
    ├── types.ts          # 全型定義
    ├── server.ts         # App クラス・起動・エラーハンドラー・env
    ├── router.ts         # Router
    ├── middleware.ts     # バリデーター
    └── response.ts       # レスポンスヘルパー
```

`Core/` 内のファイルはすべて同格・同階層とする。サブディレクトリによる分割を禁止する。

## 3.2 公開エントリーポイントの封鎖

`deno.json` の `"exports"` を `"./mod.ts"` のみに設定することで、`Core/` への直接インポートをパッケージ構造で封鎖する。

```typescript
// ✅ 正規のインポート
import { createServer, json, HTTPError } from "@adlaire/fw";

// ❌ 禁止（パッケージ構造上インポートできない）
import { ... } from "@adlaire/fw/Core/types.ts";
```

## 3.3 deno.json

```json
{
  "name": "@adlaire/fw",
  "version": "1.0.0",
  "exports": "./mod.ts",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "exactOptionalPropertyTypes": true
  }
}
```

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
  | { type: "port";    required?: boolean; default?: number };  // 1〜65535 の整数

type EnvSchema = Record<string, EnvRule>;

// スキーマから変換された値の型を導出する Mapped Type
type EnvResult<S extends EnvSchema> = {
  readonly [K in keyof S]:
    S[K]["type"] extends "number" | "port" ? number :
    S[K]["type"] extends "boolean" ? boolean :
    string;
};
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
| `listen()` | `listen(port: number, cb?: () => void)` | Adlaire Deploy 向け起動 |

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

