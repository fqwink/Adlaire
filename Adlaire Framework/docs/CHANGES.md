# Adlaire Framework — 変更履歴

> 実装の変更履歴を管理する文書。

---

## Ver.1.8-10 — logger(format) 拡張 + cache()

**リリース日**: 2026-04-10
**種別**: 機能改良 + 追加機能

### 機能改良

- **`logger(options?)`**（§8.5）: `options` 引数（`LoggerOptions`）を追加。`format: "json"` を指定すると `{ method, path, status, ms, timestamp }` の JSON Lines 形式でコンソールに出力する。`format: "text"`（デフォルト）は従来の `${METHOD} ${PATH} ${STATUS} — ${ms}ms` 形式のまま。後方互換を維持（引数なしで呼び出し可能）。

### 追加機能

- **`cache(options?)`**（§8.10）: `Cache-Control` ヘッダーを設定するミドルウェア。`noStore: true` の場合は `"no-store"` のみを設定（他オプションを無視）。それ以外は `public`/`private`・`no-cache`・`max-age`・`stale-while-revalidate` を組み合わせてディレクティブを生成する。ミドルウェア初期化時にディレクティブ文字列をキャッシュして毎リクエスト生成を避ける。
- `builtin_middleware.ts`: `LoggerOptions` / `CacheOptions` インターフェースを追加。
- `mod.ts`: `cache` 関数と `CacheOptions` / `LoggerOptions` 型をエクスポート追加。

**仕様**: FRAMEWORK_RULEBOOK.md Ver.1.27 準拠（§8.5 / §8.10）

---

## Ver.1.7-9 — securityHeaders() + requestId()

**リリース日**: 2026-04-10
**種別**: 追加機能

### 追加機能

- **`securityHeaders(options?)`**（§8.8）: セキュリティヘッダーを一括付与するミドルウェア。デフォルトで `X-Content-Type-Options: nosniff` / `X-Frame-Options: SAMEORIGIN` / `Referrer-Policy: strict-origin-when-cross-origin` を全レスポンスに付与する。`xFrameOptions: false` でヘッダーを無効化可能。`permissionsPolicy` が空文字でない場合は `Permissions-Policy` ヘッダーも付与する。
- **`requestId(options?)`**（§8.9）: リクエスト ID ミドルウェア。`X-Request-ID` リクエストヘッダーが存在する場合はその値を使用し、なければ `crypto.randomUUID()` で新規生成する。生成した ID を `ctx.state["requestId"]` に注入し、レスポンスにも `X-Request-ID` ヘッダーとして付与する。`generate` オプションで ID 生成関数を差し替え可能。
- `builtin_middleware.ts`: `SecurityHeadersOptions` / `RequestIdOptions` インターフェースを追加。
- `mod.ts`: `securityHeaders` / `requestId` 関数と `SecurityHeadersOptions` / `RequestIdOptions` 型をエクスポート追加。

**仕様**: FRAMEWORK_RULEBOOK.md Ver.1.26 準拠（§8.8 / §8.9）

---

## Ver.1.6-8 — jwtAuth() + csrf()

**リリース日**: 2026-04-10
**種別**: 追加機能

### 追加機能

- **`jwtAuth(options)`**（§8.6）: JWT Bearer 認証ミドルウェア。`Authorization: Bearer <token>` ヘッダーから JWT を取得し、WebCrypto API（HMAC-SHA-256）でHS256 署名を検証する。検証成功時はペイロードを `ctx.state[stateKey]` に注入して `next()` を呼び出す。トークン未設定・署名不一致・`exp` 期限切れのいずれかで 401 Unauthorized を返す。外部ライブラリ依存なし（`crypto.subtle` のみ使用）。カスタム `getToken` 関数でトークン取得方法を差し替え可能。
- **`csrf(options?)`**（§8.7）: CSRF 二重送信 Cookie 保護ミドルウェア。すべてのリクエストで `_csrf` Cookie が未設定の場合は `crypto.getRandomValues(32bytes)` で hex トークンを生成して `SameSite=Strict` で設定する。`ignoreMethods`（デフォルト: GET/HEAD/OPTIONS）以外のメソッドでは `X-CSRF-Token` ヘッダーと Cookie の値を照合し、不一致時は 403 Forbidden を返す。
- `builtin_middleware.ts`: `JwtAuthOptions` / `CsrfOptions` インターフェースを追加。`base64urlDecode()` / `verifyJwt()` / `generateCsrfToken()` をモジュール内部ヘルパーとして実装。
- `mod.ts`: `jwtAuth` / `csrf` 関数と `JwtAuthOptions` / `CsrfOptions` 型をエクスポート追加。

**仕様**: FRAMEWORK_RULEBOOK.md Ver.1.25 準拠（§8.6 / §8.7）

---

## Ver.1.5-7 — ルートグループ + getEnv()

**リリース日**: 2026-04-10
**種別**: 追加機能

### 追加機能

- **ルートグループ**（§5.6）: `(group-name)` 形式のディレクトリを URL に影響しない透過ディレクトリとして扱う。`router.ts:scanDirectory` に `/^\(.*\)$/` 判定を追加し、ヒットした場合は親の `urlPrefix` をそのまま継承する。`_middleware.ts` / `_error.ts` / `_404.ts` のスコープも親プレフィックスを引き継ぐ。
- **`getEnv()` 型安全環境変数アクセサ**（§10.7）: `src/env.ts` を新規作成。オーバーロード 2 形式（必須 / フォールバックあり）。必須形式で未設定の場合は `Error: Missing required environment variable: KEY` をスロー。
- `mod.ts` に `getEnv` をエクスポート追加。

**仕様**: FRAMEWORK_RULEBOOK.md Ver.1.24 準拠（§5.6 / §10.7）

---

## Ver.1.4-6 — SSE サポート + adlaire deploy CLI

**リリース日**: 2026-04-10
**種別**: 追加機能

### 追加機能

- **`ctx.sse(callback)`**（§6.9）: `src/context.ts` に Server-Sent Events レスポンス生成を実装。`ReadableStream<Uint8Array>` + `TextEncoder` により RFC 8895 形式のイベントチャンクを生成する。`callback` が `Promise` を返す場合はエラーをキャッチしてストリームを閉じる。Content-Type: `text/event-stream; charset=utf-8`。
- **`SSEEvent` / `SSEStream` インターフェース**: `types.ts` に追加、`mod.ts` からエクスポート。
- **`adlaire deploy --host=<URL> --project=<ID>`**（§11.3）: `cli/cmd_deploy.ts` を新規作成。Adlaire Deploy 管理 API `POST {host}/api/projects/{project}/deploy` を呼び出す。成功時は終了コード 0、失敗時は終了コード 1。ネットワークエラーもキャッチして終了コード 1。
- `cli/main.ts` に `deploy` コマンドをディスパッチ追加。

**仕様**: FRAMEWORK_RULEBOOK.md Ver.1.23 準拠（§6.9 / §11.3）

---

## Ver.1.3-5 — 組み込みミドルウェア + WebSocket サポート

**リリース日**: 2026-04-10
**種別**: 追加機能

### 追加機能

- **`cors(options?)`**（§8.5）: CORS ヘッダー設定ミドルウェア。Preflight（OPTIONS）に 204 即時応答。特定オリジン指定時は `Vary: Origin` を付与。
- **`logger()`**（§8.5）: リクエストログミドルウェア。`${METHOD} ${PATH} ${STATUS} — ${ms}ms` 形式でコンソール出力。
- **`rateLimit(options?)`**（§8.5）: IP ベースのレートリミット。`X-Forwarded-For` / `CF-Connecting-IP` ヘッダーから IP を取得。制限超過時は 429 Too Many Requests。`Map<string, { count, reset }>` によるインメモリ管理。
- **`compress()`**（§8.5）: gzip / deflate 圧縮ミドルウェア。テキスト系コンテンツ（`text/*` / `application/json` / `application/javascript`）のみ対象。`CompressionStream` API を使用（brotli 非対応）。
- **`ctx.upgradeWebSocket(handlers)`**（§6.8）: `Deno.upgradeWebSocket` の型安全ラッパー。`WebSocketHandlers`（`onOpen` / `onMessage` / `onClose` / `onError`）インターフェースで型付け。
- `src/builtin_middleware.ts` を新規作成。`CorsOptions` / `RateLimitOptions` インターフェースを定義。
- `WebSocketHandlers` 型を `types.ts` に追加。
- `mod.ts` に `compress` / `cors` / `logger` / `rateLimit` / `CorsOptions` / `RateLimitOptions` / `WebSocketHandlers` をエクスポート追加。

**仕様**: FRAMEWORK_RULEBOOK.md Ver.1.22 準拠（§6.8 / §8.5）

---

## Ver.1.2-4 — エラーハンドラー + ctx.query + ctx.body + ctx.cookies

**リリース日**: 2026-04-10
**種別**: 追加機能

### 追加機能

- **`_error.ts` / `_404.ts` ルーター組み込み**（§5.5）: `router.ts` に `notFoundHandlers` / `errorHandlers` を追加。最長プレフィックスマッチでスコープを選択。`defineErrorHandler` / `defineNotFoundHandler` を `handler.ts` に追加。
- **`ctx.query`**（§6.5）: クエリパラメータを `Readonly<Record<string, string>>` で型安全アクセス。同名キーは最初の値のみ保持。
- **`ctx.body<T>(guard?)`**（§6.6）: JSON ボディパース + 型ガード。JSON パース失敗・型ガード検証失敗時に `ValidationError` をスロー。`server.ts` が `ValidationError` を 400 Bad Request に変換（`_error.ts` には渡されない）。
- **`ctx.cookies`**（§6.7）: Cookie の読み書き。`cookies.set()` / `cookies.delete()` で予約した `Set-Cookie` をすべてのレスポンスヘルパー呼び出し時に自動反映。
- `src/cookies.ts` を新規作成（`CookieOptions` / `Cookies` インターフェース・シリアライズ・パース）。Cookie の `path` デフォルトは `"/"`。
- `src/error.ts` を新規作成（`ValidationError` クラス。`status: 400 as const`）。
- `mod.ts` に `ValidationError` / `CookieOptions` / `Cookies` / `ErrorHandler` / `NotFoundHandler` / `defineErrorHandler` / `defineNotFoundHandler` をエクスポート追加。

**仕様**: FRAMEWORK_RULEBOOK.md Ver.1.20〜1.21 準拠（§5.5 / §6.5 / §6.6 / §6.7）

---

## Ver.1.1-3 — バグ修正

**リリース日**: 2026-04-10
**種別**: バグ修正（精査 3件）

| # | 深刻度 | 対象 | 概要 |
|:-:|:------:|------|------|
| 1 | 重大 | `router.ts` | ミドルウェアプレフィックスマッチが `/admin` と `/administrator` を区別しない — `startsWith(prefix)` のみで判定していたため、パスセグメント境界チェック（`=== prefix` または `startsWith(prefix + "/")`) を追加 |
| 2 | 重大 | `router.ts` | `import()` 用 `file://` URL 生成がパスにスペースを含む場合に失敗 — `toFileUrl()` でパスをセグメント分割し各セグメントに `encodeURIComponent` を適用 |
| 3 | 中程度 | `cli/cmd_new.ts` | 生成プロジェクトの `import map` の `adlaire-framework` が存在しないパスを指している — `import.meta.url` からフレームワーク `src/` を特定し `copyDirRecursive` で生成プロジェクトの `framework/` にコピー |

---

## Ver.1.1-2 — Phase 2: CLI ツール

**リリース日**: 2026-04-10
**種別**: 追加機能

### 追加機能

- `adlaire new <app-name>`: プロジェクトテンプレート生成（`deno.json` / `adlaire.config.ts` / `main.ts` / `routes/index.ts` / `routes/_middleware.ts` / `static/`）
- `adlaire dev`: 開発サーバー起動（`--watch` ファイル監視リロード）
- `adlaire check`: ルート型整合性・設定ファイルのバリデーション
- `adlaire routes`: 登録済みルート一覧を表示
- `adlaire build --target=deno` / `--target=js`: 本番ビルド・共用サーバ向け JS 出力
- `cli/main.ts` / `cli/cmd_new.ts` / `cli/cmd_dev.ts` / `cli/cmd_check.ts` / `cli/cmd_routes.ts` / `cli/cmd_build.ts` を新規作成

**仕様**: FRAMEWORK_RULEBOOK.md Ver.1.19 準拠（§11）

---

## Ver.1.0-1 — Phase 1: コア実装

**リリース日**: 2026-04-10
**種別**: 追加機能（初版）

### 追加機能

- HTTP サーバー起動（`Deno.serve` ベース）: `src/server.ts` を新規作成
- ファイルベースルーティング: `routes/` 再帰探索・URL パターンマッチング・動的パラメータ `[id]` / ワイルドカード `[...path]`。`src/router.ts` を新規作成
- `defineHandler` / `Context<Params, State>` / ルートパラメータ自動型付け: `src/handler.ts` / `src/context.ts` を新規作成
- レスポンスヘルパー（`ctx.json()` / `ctx.html()` / `ctx.text()` / `ctx.redirect()` / `ctx.notFound()` / `ctx.unauthorized()` / `ctx.forbidden()` / `ctx.badRequest()` / `ctx.internalError()`）: `src/response.ts` を新規作成
- 静的ファイル配信（`static/` ディレクトリ対応）
- ミドルウェアチェーン（`defineMiddleware` / `_middleware.ts` 読み込み / 状態型付け）: `src/middleware.ts` を新規作成
- `src/types.ts` / `src/mod.ts`（公開 API エントリポイント）を新規作成

**仕様**: FRAMEWORK_RULEBOOK.md Ver.1.19 準拠（§1〜§10）

---

## Ver.1.0-0 — Phase 0: ルールブック策定

**リリース日**: （未リリース）
**種別**: Phase 0（仕様策定）

- `FRAMEWORK_RULEBOOK.md` Ver.1.0 策定
