# Adlaire Framework — フレームワーク仕様ルールブック

> **文書バージョン: Ver.1.0**
> **最終更新: 2026-04-11**

---

# 0. 絶対原則

いかなる例外も認めない不変の規則。

## 0.1 役割分離

本フレームワークは以下の 2 つの役割を明確に区別する。

| 役割 | 定義 | 権限 |
|------|------|------|
| **フレームワーク開発者** | Adlaire Group — Core ファイルの実装者 | アーキテクチャ方針の決定・Core 実装・公開 API の設計 |
| **アプリ開発者** | adlaire-fw を利用してアプリケーションを構築する開発者 | `mod.ts` が公開する API のみ使用可 |

**アプリ開発者は `Core/` 内のファイルに直接触れることができない。**
`deno.json` の `"exports": "./mod.ts"` のみを設定し、`Core/` 直接インポートをパッケージ構造で封鎖する。

## 0.2 型安全

**型安全の方針はフレームワーク開発者が決定し、アーキテクチャで保証する。**

- 公開 API（`mod.ts` エクスポート）に `any` 型を含めない
- エスケープハッチ（`any` を返す関数・型アサーションを強いる設計）を提供しない
- アプリ開発者が公開 API を通じて型を破る手段を設計上存在させない
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

Adlaire Group の全プロジェクトで共通利用する TypeScript 製フルスタック Web フレームワーク。
バックエンド（サーバーサイド）とフロントエンド（クライアントサイド）を単一プロジェクト・単一 `Core/` 内で提供する。

| 項目 | 内容 |
|------|------|
| **名称** | Adlaire Framework（adlaire-fw） |
| **種別** | フルスタック Web フレームワーク |
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
Adlaire Framework/        # プロジェクトルート（フルスタック）
├── mod.ts                # 【唯一の公開エントリーポイント】アプリ開発者はここからのみインポートする
├── deno.json             # Deno 設定（exports: "./mod.ts" のみ）
└── Core/                 # 【フレームワーク開発者専用】サブディレクトリ分割禁止・フラット配置
    ├── types.ts          # [Backend Core] 全型定義
    ├── server.ts         # [Backend Core] App クラス・起動・エラーハンドラー・env
    ├── router.ts         # [Backend Core] Router
    ├── middleware.ts     # [Backend Core] バリデーター
    ├── response.ts       # [Backend Core] レスポンスヘルパー
    └── ...               # [Frontend Core] 仕様策定後に追加（同階層・サブディレクトリなし）
```

`Core/` 内のファイルはバックエンド・フロントエンド問わず全て同格・同階層とする。サブディレクトリによる分割を禁止する。

## 3.2 公開エントリーポイントの封鎖

アプリ開発者は `mod.ts` が公開するシンボルのみ使用できる。
`deno.json` の `"exports"` を `"./mod.ts"` のみに設定することで、`Core/` への直接インポートをパッケージ構造で封鎖する。

```typescript
// ✅ アプリ開発者の正しい使用
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
3. リクエストボディ読み込み・JSON パース
4. Context オブジェクト生成（state: {} を含む）
5. Router.match() でルートマッチング
   └ 未一致 → 404 JSON レスポンス終了
6. ミドルウェアチェーン実行（登録順）
   └ 例外発生 → onError ハンドラーチェーンへ移行
7. ルートハンドラー実行 → Response を返す
8. onError（登録済みの場合）でエラーを Response に変換
```

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
> {
  req: Request;                    // Web 標準 Request
  params: P;                       // URL パスパラメータ
  query: Q;                        // クエリストリング
  body: B;                         // パース済みボディ
  state: Record<string, unknown>;  // ミドルウェア間共有データ
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
> = (ctx: Context<P, B, Q>) => Response | Promise<Response>;

// Middleware は next() の結果を返す
type Middleware =
  (ctx: Context, next: () => Promise<Response>) => Promise<Response>;

// ErrorHandler はエラーを Response に変換する
type ErrorHandler =
  (err: unknown, ctx: Context) => Response | Promise<Response>;
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
}

// Rule — Discriminated Union（type フィールドで判別）
type Rule =
  | (RuleBase & { type: "string";  min?: number; max?: number; pattern?: RegExp; enum?: string[] })
  | (RuleBase & { type: "number";  min?: number; max?: number; integer?: boolean })
  | (RuleBase & { type: "boolean" })
  | (RuleBase & { type: "email" })
  | (RuleBase & { type: "object";  fields?: Schema })
  | (RuleBase & { type: "array";   items?: Rule; min?: number; max?: number })
  | (RuleBase & { type: "custom";  validate: (v: unknown) => true | string });

type Schema = Record<string, Rule>;
```

## 5.4 ErrorResponse / HTTPError

```typescript
// すべてのエラーレスポンスのボディ形式（統一）
interface ErrorResponse {
  error: string;
  detail?: unknown;
}

// ハンドラーから任意の HTTP ステータスをスローするためのエラークラス
class HTTPError extends Error {
  constructor(
    public readonly status: number,
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

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
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
function loadEnv(path?: string): Promise<void>
```

- `path` 省略時は実行ディレクトリの `.env` を読み込む

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
| `get / post / put / delete / patch(path, handler)` | ルートを登録（メソッドチェーン対応） |
| `group(prefix)` | プレフィクス付き `RouteGroup` を返す |
| `match(method, url)` | ハンドラーと `params` を返す。未一致は `null` |

## 7.2 パスマッチングルール

| パターン | 説明 | 例 |
|---------|------|-----|
| 固定セグメント | 完全一致 | `/users/list` |
| 動的セグメント | `:name` で変数化 | `/users/:id` |
| クエリストリング | パスマッチから除外し `ctx.query` に格納 | `?page=1` |

---

# 8. middleware.ts　[Core]

バリデーターを担う。
関連性の高いユーティリティを単一ファイルに集約することで import コストを最小化する。

## 8.1 バリデーター

### Rule 型（型定義は §5.3 参照）

| 型 | 共通オプション | 固有オプション |
|----|--------------|--------------|
| `string` | `required` / `nullable` | `min` / `max`（文字数）/ `pattern`（正規表現）/ `enum`（列挙値） |
| `number` | `required` / `nullable` | `min` / `max`（値域）/ `integer`（整数チェック） |
| `boolean` | `required` / `nullable` | — |
| `email` | `required` / `nullable` | — |
| `object` | `required` / `nullable` | `fields`（サブスキーマ） |
| `array` | `required` / `nullable` | `items`（要素ルール）/ `min` / `max`（要素数） |
| `custom` | `required` / `nullable` | `validate(v: unknown): true \| string` |

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

# 9. response.ts　[Core]

すべてのヘルパーは `Response` オブジェクトを返す（直接送信は行わない）。

| 関数 | シグネチャ | 説明 |
|------|-----------|------|
| `json` | `json(data, status?)` | JSON レスポンス（デフォルト 200） |
| `text` | `text(body, status?)` | プレーンテキスト |
| `send` | `send(status, body?)` | 任意ステータスと生テキスト |

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
| **役割分離（絶対原則）** | フレームワーク開発者（Adlaire Group）が方針を決定し Core を実装する。アプリ開発者は `mod.ts` 公開 API のみ使用可。`Core/` への直接アクセスをパッケージ構造で封鎖する |
| **型安全（絶対原則）** | 型安全はフレームワークのアーキテクチャが構造的に保証する。公開 API に `any` を含めない。エスケープハッチを提供しない。アプリ開発者がフレームワーク経由で型を破る手段を API 設計上存在させない |
| **any 使用禁止（絶対原則）** | `any` 型・`as any`・`// @ts-ignore`・`// @ts-expect-error`・型安全を迂回するキャストチェーンをフレームワーク全域で禁止。例外なし |
| **npm 禁止（絶対原則）** | `npm:` スペシャライザー禁止。`jsr:@std/*` と Web 標準 API のみ |
| **Core フラット構成** | `Core/` 内はサブディレクトリ分割禁止。バックエンド・フロントエンドのファイルを問わず同階層に配置する |
| **Web 標準ベース** | `Request` / `Response` / `URL` / `ReadableStream` を使用。Node.js API 不使用 |
| **デュアルデプロイ対応** | Fetch ハンドラー形式（Deno Deploy）と `Deno.serve`（Adlaire Deploy）を両サポート |
| **Handler は Response を返す** | `void` 禁止。すべてのハンドラーは `Response` を返す |

---

# 12. フルスタック構成

Adlaire Framework は**フルスタック Web フレームワーク**であり、バックエンド（§1〜§11）とフロントエンドを単一プロジェクト・単一 `Core/` 内で提供する。

## 12.1 構成原則

ファイル配置は §3.1 の Core フラット構成に準拠する。バックエンド・フロントエンドで `Core/` を分けない。

## 12.2 フロントエンド仕様

フロントエンド部分の Core ファイル構成・仕様は別途本ルールブックに追記する（現在仕様策定中）。

| 項目 | 内容 |
|------|------|
| **配置** | `Adlaire Framework/Core/`（バックエンド Core と同一ディレクトリ） |
| **状態** | 仕様策定中 |
| **適用原則** | §0（役割分離 / 型安全 / any 禁止 / npm 禁止）を全面適用 |
