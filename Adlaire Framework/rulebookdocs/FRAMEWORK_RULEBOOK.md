# Adlaire Framework — フレームワーク仕様ルールブック

> **文書バージョン: Ver.1.30**
> **最終更新: 2026-04-10**

---

# 1. 製品定義

## 1.1 概要

**Adlaire Framework** は、Adlaire Group 全プロジェクトに適用する Deno / TypeScript 製 Web フレームワークである。
ファイルベースルーティングと型安全ファーストを設計原則とし、npm 依存ゼロの軽量なサーバーサイドフレームワークを提供する。

## 1.2 設計原則

| 原則 | 説明 |
|------|------|
| **型安全ファースト** | ルートパラメータ・クエリ・ボディ・状態まで TypeScript 型で保護する |
| **ファイルベースルーティング** | `routes/` ディレクトリ構造が URL に直結し、設定不要でルート定義できる |
| **ゼロ依存** | npm・CDN への外部依存を持たない。Deno 標準ライブラリと WebCrypto API のみ使用する |
| **ミドルウェアチェーン** | `_middleware.ts` による階層的・スコープ限定の処理チェーン |
| **組み込みセキュリティ** | CORS・CSRF・JWT 認証・セキュリティヘッダーを標準提供する |

## 1.3 適用対象プロジェクト

- Adlaire Deploy（バックエンド API）
- Adlaire BaaS
- Adlaire License Server
- その他 Adlaire Group が開発する全サーバーサイドプロジェクト

## 1.4 HTTP サーバー

- **`Deno.serve`** を基盤とする
- `adlaire.config.ts` の `port` 設定値でリッスン（デフォルト: `8000`）
- 未ハンドル例外はすべてキャッチし 500 エラーレスポンスを返す

---

# 2. ディレクトリ構成

```
<プロジェクトルート>/
├── adlaire.config.ts        # フレームワーク設定
├── routes/                  # ルートファイル群
│   ├── index.ts             # GET /
│   ├── _middleware.ts       # グローバルミドルウェア
│   ├── _error.ts            # グローバルエラーハンドラー
│   ├── _404.ts              # グローバル 404 ハンドラー
│   ├── (group)/             # ルートグループ（URL に影響しない）
│   │   └── foo.ts           # GET /foo
│   └── [id]/                # 動的パラメータ
│       └── index.ts         # GET /:id
├── static/                  # 静的ファイル配信ルート
└── deno.json                # Deno 設定
```

---

# 3. 動作要件

- **Deno**: 1.40 以上
- **TypeScript**: strict モード必須（`deno.json` で `"strict": true` 設定）
- **npm:** プレフィックスインポート禁止

---

# 4. 設定

## 4.1 adlaire.config.ts

`adlaire.config.ts` を `defineConfig()` でエクスポートしてフレームワークを設定する。

```typescript
import { defineConfig } from "./src/mod.ts";

export default defineConfig({
  port: 8000,
  staticDir: "static",
});
```

### 設定オプション

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `port` | `number` | `8000` | リッスンポート |
| `staticDir` | `string` | `"static"` | 静的ファイルディレクトリ |
| `onStart` | `(port: number) => void \| Promise<void>` | — | サーバー起動時フック |
| `onStop` | `() => void \| Promise<void>` | — | サーバー停止時フック |

## 4.2 ライフサイクルフック

`adlaire.config.ts` の `onStart` / `onStop` でサーバーのライフサイクルに処理を挟む。

```typescript
export default defineConfig({
  port: 8000,
  async onStart(port) {
    console.log(`Listening on http://localhost:${port}`);
    await db.connect();
  },
  async onStop() {
    await db.close();
  },
});
```

- `onStart(port: number)` — サーバーが正常に起動し最初のリクエスト受付可能になった直後に呼ばれる
- `onStop()` — `SIGINT` / `SIGTERM` 受信時、またはプロセス終了前に呼ばれる
- いずれも `async` 可。完了まで待機してからサーバーが次の処理に進む

---

# 5. ルーティング

## 5.1 ファイルベースルーティング

`routes/` ディレクトリ以下のファイル構造が URL パスに直結する。

| ファイルパス | URL |
|-------------|-----|
| `routes/index.ts` | `GET /` |
| `routes/users.ts` | `/users` |
| `routes/users/index.ts` | `/users` |
| `routes/users/[id].ts` | `/users/:id` |
| `routes/users/[id]/posts.ts` | `/users/:id/posts` |

## 5.2 HTTP メソッド

各ルートファイルでは HTTP メソッド名のエクスポートでハンドラーを登録する。

```typescript
// routes/users.ts
import { defineHandler } from "../src/mod.ts";

export const GET = defineHandler((ctx) => {
  return ctx.json({ users: [] });
});

export const POST = defineHandler(async (ctx) => {
  const body = await ctx.body<{ name: string }>();
  return ctx.json({ created: body }, 201);
});

// default エクスポートは全メソッドにマッチする
export default defineHandler((ctx) => {
  return ctx.json({ error: "Method Not Allowed" }, 405);
});
```

## 5.3 動的パラメータ

`[paramName]` 形式のディレクトリ・ファイル名が動的パラメータになる。

```typescript
// routes/users/[id].ts
import { defineHandler } from "../../src/mod.ts";

export const GET = defineHandler<{ id: string }>((ctx) => {
  const { id } = ctx.params; // 型: string
  return ctx.json({ id });
});
```

## 5.4 ワイルドカードパラメータ

`[...rest]` 形式のファイル名がワイルドカードパラメータになる。

```typescript
// routes/files/[...path].ts
export const GET = defineHandler<{ path: string[] }>((ctx) => {
  const { path } = ctx.params; // 型: string[]
  return ctx.text(path.join("/"));
});
```

## 5.5 特殊ファイル

| ファイル名 | 役割 |
|-----------|------|
| `_middleware.ts` | 同一ディレクトリ以下のすべてのルートに適用するミドルウェア |
| `_error.ts` | 同一スコープ内の 500 エラーハンドラー（最長プレフィックスマッチ） |
| `_404.ts` | 同一スコープ内の 404 ハンドラー（最長プレフィックスマッチ） |

### _error.ts

```typescript
// routes/_error.ts
import { defineHandler } from "../src/mod.ts";

export default defineHandler((ctx) => {
  const err = ctx.error; // Error オブジェクト
  console.error(err);
  return ctx.json({ error: "Internal Server Error" }, 500);
});
```

### _404.ts

```typescript
// routes/_404.ts
import { defineHandler } from "../src/mod.ts";

export default defineHandler((ctx) => {
  return ctx.json({ error: "Not Found" }, 404);
});
```

## 5.6 ルートグループ

`(group-name)` 形式のディレクトリは URL に影響しない透過ディレクトリ（ルートグループ）である。
ミドルウェアのスコープ分割・ファイル整理を目的として使用する。

```
routes/
├── (public)/
│   ├── _middleware.ts   # /index, /about にのみ適用
│   ├── index.ts         # GET /
│   └── about.ts         # GET /about
└── (admin)/
    ├── _middleware.ts   # /dashboard, /settings にのみ適用
    ├── dashboard.ts     # GET /dashboard
    └── settings.ts      # GET /settings
```

---

# 6. コンテキスト

## 6.1 Context 型

```typescript
interface Context<
  Params extends Record<string, string | string[]> = Record<string, string>,
  State extends Record<string, unknown> = Record<string, unknown>
> {
  request: Request;
  params: Params;
  state: State;
  error?: Error;        // _error.ts でのみ設定される
  // ...メソッド群
}
```

## 6.2 ctx.json()

JSON レスポンスを返す。

```typescript
ctx.json(data: unknown, status?: number): Response
```

- `Content-Type: application/json` を自動付与
- `status` デフォルト: `200`

## 6.3 ctx.html()

HTML レスポンスを返す。

```typescript
ctx.html(html: string, status?: number): Response
```

- `Content-Type: text/html; charset=utf-8` を自動付与

## 6.4 ctx.text()

プレーンテキストレスポンスを返す。

```typescript
ctx.text(text: string, status?: number): Response
```

## 6.5 ctx.query

クエリパラメータへの型安全アクセス。

```typescript
ctx.query: URLSearchParams

// 例
const page = ctx.query.get("page") ?? "1";
```

## 6.6 ctx.body\<T\>()

JSON リクエストボディを型安全にパースする。

```typescript
ctx.body<T>(guard?: (val: unknown) => val is T): Promise<T>
```

- `guard` を指定した場合、バリデーション失敗時に `ValidationError`（400）をスロー
- `guard` を省略した場合、型キャストのみ行う（`T = unknown` 推奨）

```typescript
export const POST = defineHandler(async (ctx) => {
  const body = await ctx.body<{ name: string }>((val): val is { name: string } =>
    typeof val === "object" && val !== null && typeof (val as Record<string, unknown>).name === "string"
  );
  return ctx.json({ name: body.name });
});
```

## 6.7 ctx.cookies

Cookie の読み書きを行う。

```typescript
ctx.cookies: {
  get(name: string): string | undefined;
  set(name: string, value: string, options?: CookieOptions): void;
  delete(name: string, options?: CookieOptions): void;
}
```

### CookieOptions

| オプション | 型 | 説明 |
|-----------|-----|------|
| `maxAge` | `number` | Max-Age（秒） |
| `expires` | `Date` | Expires |
| `path` | `string` | Path（デフォルト: `/`） |
| `domain` | `string` | Domain |
| `secure` | `boolean` | Secure フラグ |
| `httpOnly` | `boolean` | HttpOnly フラグ |
| `sameSite` | `"Strict" \| "Lax" \| "None"` | SameSite |

`ctx.cookies.set()` / `ctx.cookies.delete()` で設定した値はレスポンスに自動反映される。

## 6.8 ctx.upgradeWebSocket()

WebSocket アップグレードを行う。

```typescript
ctx.upgradeWebSocket(handlers: WebSocketHandlers): Response

interface WebSocketHandlers {
  onOpen?(ws: WebSocket): void;
  onMessage?(ws: WebSocket, event: MessageEvent): void;
  onClose?(ws: WebSocket, event: CloseEvent): void;
  onError?(ws: WebSocket, event: Event): void;
}
```

```typescript
export const GET = defineHandler((ctx) => {
  return ctx.upgradeWebSocket({
    onMessage(ws, event) {
      ws.send(`echo: ${event.data}`);
    },
  });
});
```

## 6.9 ctx.sse()

Server-Sent Events（SSE）レスポンスを生成する。

```typescript
ctx.sse(callback: (stream: SSEStream) => void | Promise<void>): Response

interface SSEStream {
  send(data: string, options?: { id?: string; event?: string; retry?: number }): void;
  close(): void;
}
```

- `data` にマルチライン文字列（`\n` 含む）を渡した場合、RFC 8895 準拠の複数 `data:` 行に分割する
- `Content-Type: text/event-stream` を自動付与
- `Cache-Control: no-cache` を自動付与

```typescript
export const GET = defineHandler((ctx) => {
  return ctx.sse(async (stream) => {
    for (let i = 0; i < 5; i++) {
      stream.send(String(i), { event: "count" });
      await new Promise((r) => setTimeout(r, 1000));
    }
    stream.close();
  });
});
```

## 6.10 ctx.sendFile()

任意ファイルをレスポンスとして配信する。

```typescript
ctx.sendFile(path: string, options?: SendFileOptions): Promise<Response>

interface SendFileOptions {
  contentType?: string;   // MIME タイプを手動指定（省略時は自動判定）
  filename?: string;      // Content-Disposition の filename（省略時はパスのベース名）
  inline?: boolean;       // true: inline, false: attachment（デフォルト: false）
}
```

- MIME タイプは拡張子から自動判定する
- `filename` に含まれる非 ASCII 文字は `encodeURIComponent` でエスケープする
- Range リクエスト（部分ダウンロード）は未対応

## 6.11 ctx.negotiate()

`Accept` ヘッダーによるコンテンツネゴシエーションを行う。

```typescript
ctx.negotiate(handlers: {
  "application/json"?: () => Response | Promise<Response>;
  "text/html"?: () => Response | Promise<Response>;
  [mediaType: string]: (() => Response | Promise<Response>) | undefined;
}): Promise<Response>
```

- `Accept` ヘッダーの優先度（q 値）に従い、最初にマッチしたハンドラーを実行する
- マッチしない場合は `406 Not Acceptable` を返す

## 6.12 ctx.formData\<T\>()

`multipart/form-data` および `application/x-www-form-urlencoded` を型安全にパースする。

```typescript
ctx.formData<T>(guard?: (val: unknown) => val is T): Promise<T>
```

- 同名フィールドが複数存在する場合は配列として返す（`File` 型も同様）
- `guard` を指定した場合、バリデーション失敗時に `ValidationError`（400）をスロー

## 6.13 WebSocketRoom

WebSocket 接続のグループ管理・ブロードキャストを提供する。

```typescript
class WebSocketRoom {
  constructor(name?: string);
  add(ws: WebSocket): void;
  remove(ws: WebSocket): void;
  broadcast(data: string | ArrayBuffer, exclude?: WebSocket): void;
  get size(): number;
}
```

```typescript
const room = new WebSocketRoom("chat");

export const GET = defineHandler((ctx) => {
  return ctx.upgradeWebSocket({
    onOpen(ws) { room.add(ws); },
    onMessage(ws, e) { room.broadcast(e.data, ws); },
    onClose(ws) { room.remove(ws); },
  });
});
```

---

# 7. ハンドラー定義

## 7.1 defineHandler()

型安全なルートハンドラーを定義する関数。

```typescript
function defineHandler<
  Params extends Record<string, string | string[]> = Record<string, string>,
  State extends Record<string, unknown> = Record<string, unknown>
>(
  handler: (ctx: Context<Params, State>) => Response | Promise<Response>
): RouteHandler<Params, State>
```

## 7.2 レスポンスヘルパー

| メソッド | 説明 |
|---------|------|
| `ctx.json(data, status?)` | JSON レスポンス（§6.2） |
| `ctx.html(html, status?)` | HTML レスポンス（§6.3） |
| `ctx.text(text, status?)` | テキストレスポンス（§6.4） |
| `ctx.sendFile(path, opts?)` | ファイル配信（§6.10） |
| `ctx.sse(callback)` | SSE レスポンス（§6.9） |
| `ctx.upgradeWebSocket(handlers)` | WebSocket アップグレード（§6.8） |
| `ctx.negotiate(handlers)` | コンテンツネゴシエーション（§6.11） |

## 7.3 エラーレスポンス

- `ValidationError` — `ctx.body<T>(guard)` / `ctx.formData<T>(guard)` でバリデーション失敗時にスローされる。HTTP 400 を返す
- ハンドラー内でスローされた例外はフレームワークがキャッチし、スコープ内の `_error.ts` ハンドラーへ委譲する
- `_error.ts` が存在しない場合は 500 エラーレスポンスを返す

---

# 8. ミドルウェア

## 8.1 defineMiddleware()

型安全なミドルウェアを定義する関数。

```typescript
function defineMiddleware<
  State extends Record<string, unknown> = Record<string, unknown>
>(
  middleware: (ctx: Context<Record<string, string>, State>, next: () => Promise<Response>) => Response | Promise<Response>
): Middleware<State>
```

## 8.2 _middleware.ts

`_middleware.ts` に `export default` でミドルウェアを定義する。
配列エクスポートで複数ミドルウェアをチェーンできる。

```typescript
// routes/_middleware.ts
import { defineMiddleware } from "../src/mod.ts";

export default [
  defineMiddleware(async (ctx, next) => {
    console.log(`${ctx.request.method} ${ctx.request.url}`);
    return await next();
  }),
];
```

## 8.3 状態型付け

`ctx.state` にミドルウェアで値を注入し、後続ハンドラーで型安全にアクセスできる。

```typescript
// routes/(auth)/_middleware.ts
export default defineMiddleware<{ userId: string }>(async (ctx, next) => {
  ctx.state.userId = "user-123"; // 型チェックあり
  return await next();
});

// routes/(auth)/profile.ts
export const GET = defineHandler<Record<string, string>, { userId: string }>((ctx) => {
  return ctx.json({ userId: ctx.state.userId }); // 型安全
});
```

## 8.4 ミドルウェアスコープ

- `_middleware.ts` は同一ディレクトリ以下のすべてのルートに適用される
- ルートグループ（§5.6）を使用することで適用スコープを制限できる
- 複数の `_middleware.ts` が存在する場合、外側から内側の順に実行される

## 8.5 組み込みミドルウェア

### cors(options?)

CORS ヘッダーを設定し、Preflight リクエストに 204 で応答する。

```typescript
cors(options?: CorsOptions): Middleware
```

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `origin` | `string \| string[] \| ((origin: string) => boolean)` | `"*"` | 許可オリジン |
| `methods` | `string[]` | `["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]` | 許可メソッド |
| `allowedHeaders` | `string[]` | `["Content-Type", "Authorization"]` | 許可ヘッダー |
| `exposedHeaders` | `string[]` | `[]` | 公開ヘッダー |
| `credentials` | `boolean` | `false` | `Access-Control-Allow-Credentials` |
| `maxAge` | `number` | `86400` | Preflight キャッシュ秒数 |

**制約**: `credentials: true` の場合、`origin` に `"*"` を指定してはならない（RFC 違反）。

### logger(options?)

リクエストログを出力する。

```typescript
logger(options?: LoggerOptions): Middleware

interface LoggerOptions {
  format?: "text" | "json";  // デフォルト: "text"
}
```

- `format: "text"` — `METHOD PATH STATUS DURATIONms` 形式で標準出力に書き込む
- `format: "json"` — JSON Lines 形式で標準出力に書き込む

### rateLimit(options?)

IP ベースのレートリミットを適用する。制限超過時は 429 を返す。

```typescript
rateLimit(options?: RateLimitOptions): Middleware

interface RateLimitOptions {
  max?: number;       // 最大リクエスト数（デフォルト: 100）
  windowMs?: number;  // ウィンドウ時間（ms）（デフォルト: 60000）
}
```

**注意**: 内部の Map は定期的にクリーンアップする実装とする（メモリリーク防止）。

### compress()

`Accept-Encoding` ヘッダーに応じて gzip / deflate 圧縮を適用する。

```typescript
compress(): Middleware
```

- 既に `Content-Encoding` ヘッダーが設定されているレスポンスには圧縮を適用しない（二重圧縮防止）

### cache(options?)

`Cache-Control` ヘッダーを設定する。

```typescript
cache(options?: CacheOptions): Middleware

interface CacheOptions {
  maxAge?: number;       // max-age（秒）（デフォルト: 0）
  private?: boolean;     // private ディレクティブ（デフォルト: false）
  noStore?: boolean;     // no-store ディレクティブ（デフォルト: false）
}
```

## 8.6 jwtAuth(options)

JWT Bearer 認証ミドルウェア。WebCrypto API（HS256）を使用する。

```typescript
jwtAuth(options: JwtAuthOptions): Middleware

interface JwtAuthOptions {
  secret: string;
  algorithms?: string[];  // 許可アルゴリズム（デフォルト: ["HS256"]）
  credentialsRequired?: boolean;  // false の場合、トークン未提供でも通過（デフォルト: true）
}
```

- 認証成功時: `ctx.state.jwtPayload` にデコード済みペイロードを注入
- 認証失敗時: `401 Unauthorized` を返す
- `algorithms` オプションは実際のアルゴリズム検証に使用する

## 8.7 csrf(options?)

CSRF 二重送信 Cookie 保護ミドルウェア。

```typescript
csrf(options?: CsrfOptions): Middleware

interface CsrfOptions {
  cookieName?: string;   // デフォルト: "_csrf"
  headerName?: string;   // デフォルト: "X-CSRF-Token"
  secure?: boolean;      // Cookie の Secure フラグ（デフォルト: true）
}
```

- `GET` / `HEAD` / `OPTIONS` リクエストはスキップ
- それ以外のリクエストで Cookie 値とリクエストヘッダー値を比較し、不一致なら 403 を返す

## 8.8 securityHeaders(options?)

セキュリティヘッダーを一括付与する。

```typescript
securityHeaders(options?: SecurityHeadersOptions): Middleware
```

デフォルトで付与するヘッダー:

| ヘッダー | デフォルト値 |
|---------|------------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

各ヘッダーは `options` で個別に上書き可能。`null` を指定した場合はそのヘッダーを付与しない。

## 8.9 requestId(options?)

リクエスト ID を生成し `ctx.state` に注入する。

```typescript
requestId(options?: RequestIdOptions): Middleware

interface RequestIdOptions {
  header?: string;         // レスポンスヘッダー名（デフォルト: "X-Request-Id"）
  generator?: () => string;  // ID 生成関数（デフォルト: crypto.randomUUID()）
}
```

- `ctx.state.requestId: string` に生成した ID を格納
- 指定ヘッダー名でレスポンスにも付与

---

# 9. 静的ファイル配信

- `static/` ディレクトリ（`adlaire.config.ts` の `staticDir` で設定）内のファイルを URL パスにマッピングして配信する
- MIME タイプは拡張子から自動判定する
- ルートハンドラーとパスが競合した場合、ルートハンドラーを優先する
- ディレクトリパス（末尾 `/`）への GET リクエストには `index.html` を返す（存在する場合）

---

# 10. ビルド・デプロイ・環境変数

## 10.1 開発サーバー

`adlaire dev` コマンドで起動する。ファイル変更を監視し自動リロードする。

## 10.2 deno.json

```json
{
  "compilerOptions": {
    "strict": true
  },
  "tasks": {
    "dev": "deno run -A cli/main.ts dev",
    "build": "deno run -A cli/main.ts build",
    "check": "deno run -A cli/main.ts check"
  }
}
```

## 10.3 ビルドターゲット

```bash
adlaire build --target=deno   # Deno Deploy 向けバンドル
adlaire build --target=js     # Node.js 互換 JS バンドル
```

## 10.4 デプロイ環境

| 環境 | 対応 |
|------|------|
| Deno Deploy | 対応済み |
| Adlaire Deploy | 対応済み |
| VPS（systemd + Deno） | 対応済み |

## 10.5 デュアルデプロイ対応（計画）

`adlaire build` 実行時に環境（Deno Deploy / Adlaire Deploy）を自動判定してビルド形式を切り替える機能。
未実装（次バージョン以降で実装予定）。

## 10.6 デプロイターゲット自動判定（計画）

§10.5 と同一計画。

## 10.7 getEnv()

型安全な環境変数アクセサ。

```typescript
function getEnv(key: string, fallback?: string): string
```

- `fallback` が省略された場合、変数が未設定なら `Error` をスロー
- `fallback` を指定した場合、変数未設定時は `fallback` を返す

```typescript
const port = getEnv("PORT", "8000");
const secret = getEnv("JWT_SECRET");  // 未設定時は Error をスロー
```

## 10.8 defineEnvSchema()

複数環境変数の一括スキーマ定義・型変換・バリデーションを行う。

```typescript
function defineEnvSchema<T extends Record<string, EnvFieldDef>>(
  schema: T
): { [K in keyof T]: InferEnvType<T[K]> }

interface EnvFieldDef {
  type?: "string" | "number" | "boolean";  // デフォルト: "string"
  default?: string | number | boolean;
  required?: boolean;  // デフォルト: true
}
```

- 空文字列（`""`）は未設定として扱い、`number` 型への暗黙変換を行わない
- `required: true`（デフォルト）かつ値未設定の場合は `Error` をスロー

```typescript
const env = defineEnvSchema({
  PORT: { type: "number", default: 8000 },
  JWT_SECRET: { type: "string" },
  DEBUG: { type: "boolean", default: false, required: false },
});
// env.PORT: number, env.JWT_SECRET: string, env.DEBUG: boolean
```

---

# 11. CLI

## 11.1 adlaire new

```bash
adlaire new <project-name>
```

指定名のディレクトリにプロジェクトテンプレートを生成する。
生成物の import map は実在するパスのみを参照する。

## 11.2 adlaire dev

```bash
adlaire dev
```

開発サーバーを起動する。`routes/` および `adlaire.config.ts` の変更を監視し自動リロードする。

## 11.3 adlaire deploy

```bash
adlaire deploy --host=<URL> --project=<PROJECT_ID>
```

Adlaire Deploy API を呼び出してデプロイをトリガーする。

| オプション | 説明 |
|-----------|------|
| `--host` | Adlaire Deploy サーバーの URL |
| `--project` | デプロイ対象のプロジェクト ID |

## 11.4 adlaire build

```bash
adlaire build [--target=deno|js]
```

`--target` 省略時はデフォルトターゲット（Deno）でビルドする。

## 11.5 adlaire check

```bash
adlaire check
```

すべてのルートファイルの型チェックを実行する。

## 11.6 adlaire routes

```bash
adlaire routes
```

検出されたルート一覧をメソッド・URL パス付きで表示する。

---

# 12. エラー型

| 型名 | HTTP ステータス | 説明 |
|------|:-------------:|------|
| `ValidationError` | 400 | `ctx.body<T>(guard)` / `ctx.formData<T>(guard)` バリデーション失敗 |
| `NotFoundError` | 404 | ルートが見つからない |
| `MethodNotAllowedError` | 405 | HTTP メソッド未定義 |
