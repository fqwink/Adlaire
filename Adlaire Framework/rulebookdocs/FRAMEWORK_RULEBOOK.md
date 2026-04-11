# Adlaire Framework — フレームワーク仕様ルールブック

> **文書バージョン: Ver.2.0**
> **最終更新: 2026-04-11**

---

# 0. 絶対原則

Adlaire Group の全プロジェクトに適用される不変の規則。いかなる例外も認めない。

| 原則 | 内容 |
|------|------|
| **型安全** | フレームワーク全体に適用される不変の制約。開発者はフレームワーク全体を通じて型安全を変更・上書き・回避することを一切禁止する。`any` 型・`// @ts-ignore`・`// @ts-expect-error`・`as any` の使用不可。`unknown` を使用し型ガードで絞り込む。すべての公開 API に明示的な型注釈を付与する |
| **npm 禁止** | `npm:` スペシャライザーの使用を禁止。依存は Deno 標準ライブラリ（`jsr:@std/*`）と Web 標準 API のみ |

---

# 1. 概要

Adlaire Group の全プロジェクトで共通利用する TypeScript 製バックエンドフレームワーク。

| 項目 | 内容 |
|------|------|
| **名称** | Adlaire Framework（adlaire-fw） |
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
| `Deno.readTextFile()` | 静的ファイル・`.env` 読み込み |
| `crypto.subtle` | JWT 署名・検証（Web Crypto API） |
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
import { createServer } from "adlaire-fw/server";

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

5 ファイルすべて Core 扱いとする。役割による優劣・階層はない。

```
adlaire-fw/
├── mod.ts            # 公開 API（バレルエクスポート）
├── deno.json         # Deno 設定・import map
└── src/
    ├── types.ts      # [Core] 全型定義
    ├── server.ts     # [Core] App クラス・起動・エラーハンドラー・env
    ├── router.ts     # [Core] Router
    ├── middleware.ts # [Core] バリデーター・組み込みミドルウェア・静的ファイル配信
    └── response.ts   # [Core] レスポンスヘルパー
```

### deno.json

```json
{
  "name": "@adlaire/fw",
  "version": "1.0.0",
  "exports": "./mod.ts",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "exactOptionalPropertyTypes": true
  },
  "imports": {
    "@std/path": "jsr:@std/path@^1"
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
type Handler<P, B, Q> =
  (ctx: Context<P, B, Q>) => Response | Promise<Response>;

// Middleware は next() の結果を返す
type Middleware =
  (ctx: Context, next: () => Promise<Response>) => Promise<Response>;

// ErrorHandler はエラーを Response に変換する
type ErrorHandler =
  (err: unknown, ctx: Context) => Response | Promise<Response>;
```

## 5.3 ValidationError / Schema

```typescript
interface ValidationError {
  field: string;   // ドット記法（例: address.city）
  message: string;
}

type Schema = Record<string, Rule>; // Rule は middleware.ts で定義
```

## 5.4 Route / Method

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

組み込みミドルウェア・バリデーター・静的ファイル配信を担う。
関連性の高いユーティリティを単一ファイルに集約することで import コストを最小化する。

## 8.1 組み込みミドルウェア

| 名称 | 関数 | 説明 |
|------|------|------|
| （仕様策定予定） | — | — |

## 8.2 バリデーター

### Rule 型

| 型 | オプション |
|----|-----------|
| `string` | `required` / `min` / `max`（文字数） |
| `number` | `required` / `min` / `max`（値域） |
| `boolean` | `required` |
| `email` | `required` |
| `object` | `required` / `fields`（サブスキーマ） |
| `array` | `required` / `items`（要素ルール）/ `min` / `max`（要素数） |
| `custom` | `validate(v): true \| string` |

### 使用例

```typescript
const schema: Schema = {
  name:    { type: "string", required: true, min: 1, max: 50 },
  address: {
    type: "object",
    fields: {
      city: { type: "string", required: true },
      zip:  { type: "string", required: true },
    },
  },
  tags:  { type: "array", items: { type: "string" }, max: 10 },
  score: { type: "custom", validate: (v) => (v >= 0 && v <= 100) || "0〜100 で入力" },
};

const errors: ValidationError[] = validate(ctx.body, schema);
```

### バリデーション仕様

- エラーパスはドット記法（例: `address.city is required`）
- 戻り値が空配列の場合はバリデーション成功

## 8.4 静的ファイル配信

| 設定 | デフォルト | 説明 |
|------|-----------|------|
| `root` | （必須） | 配信元ディレクトリのパス |
| `prefix` | `/static` | URL プレフィクス |

- `jsr:@std/path` でパスを正規化する
- ディレクトリトラバーサル攻撃を防ぐパス検証を実施する

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

| ケース | レスポンス | 処理箇所 |
|--------|-----------|---------|
| ルート未一致 | `404  { error: "Not Found" }` | `server.ts`（`Router.match` が `null`） |
| ハンドラー例外 | `500  { error: "Internal Server Error" }` | `onError` ハンドラー or フォールバック |
| バリデーションエラー | `400  { errors: ValidationError[] }` | ハンドラー内で `validate()` 結果を確認 |

### onError 優先順位

1. `server.onError()` で登録したハンドラーを順に試行する
2. いずれも `Response` を返さなかった場合、500 フォールバックを返す

---

# 11. 設計制約まとめ

| 制約 | 内容 |
|------|------|
| **型安全（絶対原則）** | フレームワーク全体を通じて開発者による変更・上書き・回避を一切禁止。`strict: true` 必須。`any` 型・`// @ts-ignore`・`// @ts-expect-error`・`as any` の使用不可 |
| **npm 禁止（絶対原則）** | `npm:` スペシャライザー禁止。`jsr:@std/*` と Web 標準 API のみ |
| **5 ファイル Core 構成** | `types` / `server` / `router` / `middleware` / `response` の 5 ファイルのみ。階層なし |
| **Web 標準ベース** | `Request` / `Response` / `URL` / `ReadableStream` を使用。Node.js API 不使用 |
| **デュアルデプロイ対応** | Fetch ハンドラー形式（Deno Deploy）と `Deno.serve`（Adlaire Deploy）を両サポート |
| **Handler は Response を返す** | `void` 禁止。すべてのハンドラーは `Response` を返す |
