# Adlaire Framework — 変更履歴

> 各バージョンの変更内容を記録する文書。
> 詳細仕様は `rulebookdocs/FRAMEWORK_RULEBOOK.md` を参照。

---

## Ver.1.2-7 — Core 9 ファイル化・mod.ts 廃止・新機能・機能改良

**日付**: 2026-04-12
**種別**: 追加機能・機能改良・アーキテクチャ変更

### アーキテクチャ変更

- `mod.ts` を全面廃止。`deno.json` サブパスエクスポート方式に移行（`@adlaire/fw/server` / `@adlaire/fw/response` 等 10 サブパス）
- Core を 5 ファイルから 9 ファイルに拡張（`transport.ts` / `validate.ts` / `static.ts` / `helpers.ts` 追加）

### 追加機能（5件）

- `HTTPError.toResponse()`: HTTPError を直接 Response に変換するインスタンスメソッド追加
- `sse()` / `SSEWriter`: Server-Sent Events レスポンスヘルパー追加（`@adlaire/fw/response`）
- `upgradeWebSocket()`: WebSocket アップグレードヘルパー追加（`@adlaire/fw/response`）
- `Router.all()`: 全 HTTP メソッドに同一ハンドラーを登録するメソッド追加
- `Router.mount()`: 別 Router のルートをプレフィックス付きでマウントするメソッド追加

### 機能改良（15件）

- `App.onListen()`: サーバー起動完了コールバックを登録するメソッド追加
- `App.onClose()`: シャットダウン完了コールバックを登録するメソッド追加
- `App.testRequest()`: 戻り値を `Response` から `TestResponse` ラッパーに変更（`.json()` / `.text()` メソッド付き）
- `loadEnv()`: `paths: string[]` オプション追加。複数 `.env` ファイルのマージ読み込みに対応
- `validate()`: `ValidateOptions.allowUnknown` オプション追加
- `cors()`: `CorsOptions.onBlock` コールバック追加（オリジン拒否時に呼ばれる）
- `serveStatic()`: `StaticOptions.index` オプション追加（ディレクトリデフォルトファイル指定）
- `serveStatic()`: `StaticOptions.cacheControl` オプション追加（`Cache-Control` ヘッダー値指定）
- `logger()`: `LoggerOptions.onLog` コールバック追加（カスタムログ処理）
- `rateLimit()`: `RateLimitOptions.skip` 関数オプション追加（条件付きスキップ）
- `compress()`: `threshold: 0` を「常に圧縮する」と明示的に定義
- `parseQuery()`: `ParseQueryOptions.coerce` オプション追加（enum 大文字小文字無視マッチング）
- `Router.url()`: 第 3 引数 `query?: Record<string, string>` 追加（クエリ文字列自動付与）
- `secureHeaders()`: `crossOriginOpenerPolicy` / `crossOriginEmbedderPolicy` オプション追加（COOP / COEP 対応）
- `parseBody()`: `multipart/form-data` 対応追加（`FormData` を返す）

---

## Ver.1.1-6 — 全コード精査・バグ修正

**日付**: 2026-04-11
**種別**: バグ修正
**精査件数**: 200件

### 致命的バグ修正（2件）

- `loadEnv()`: `.env` のインラインコメント（`PORT=8000 # comment`）が除去されず、数値・ポートパースで NaN エラーが発生していた問題を修正
- `loadEnv()`: スキーマバリデーション前に `Deno.env.set()` を呼び出していた問題を修正。バリデーション失敗時に環境変数が部分的に汚染されることを防ぐ

### 重大バグ修正（12件）

- `timeout()`: `next()` が reject した場合に `clearTimeout` が実行されずタイマーがリークしていた問題を修正（try/finally で保証）
- `Router.match()`: リクエストごとにルート配列を `O(n log n)` でソートしていた問題を修正。ソート結果をキャッシュしルート追加時のみ再計算する
- `etag()` 304: RFC 7232 で必須の `Cache-Control` / `Content-Location` / `Date` / `Expires` / `Vary` が 304 レスポンスに含まれていなかった問題を修正
- `etag()` エラー: 4xx/5xx エラーレスポンスにも ETag を付与していた問題を修正（エラーレスポンスはスキップ）
- `rateLimit()`: `Retry-After` ヘッダー値が 0 以下になりうる境界値バグを修正（`Math.max(1, ...)` でクランプ）
- `compress()`: `headers.append("Vary", ...)` による重複 Vary ヘッダー生成を修正（`headers.set` に変更）
- `compress()`: 画像・動画・音声・圧縮済みファイルを誤って圧縮しようとしていた問題を修正（MIME タイプでスキップ判定）
- `compress()`: `Accept-Encoding` ヘッダーの文字列部分一致から正確なトークン照合に変更
- `requestId()`: 受信 `X-Request-ID` 値の制御文字・改行を除去してヘッダーインジェクション脆弱性を修正
- `cors()`: 通常レスポンスから `Access-Control-Allow-Methods` / `Access-Control-Allow-Headers` を削除（プリフライト専用ヘッダー）
- `cors()`: オリジン依存設定でオリジンが拒否された場合でも `Vary: Origin` を付与するように修正（プロキシキャッシュ汚染防止）
- `hsts()`: `preload: true` 指定時に `includeSubDomains: true` かつ `maxAge >= 31536000` の必須条件を検証するバリデーションを追加

### 中程度バグ修正（10件）

- `newCommand()`: `Deno.mkdir({ recursive: false })` でネスト名が失敗していた問題を修正（`recursive: true` に変更）
- `json()`: `JSON.stringify()` の例外（循環参照・BigInt）を try/catch でキャッチして 500 レスポンスを返すように修正
- `parseParam("number")`: `Infinity` / `-Infinity` が通過していた問題を修正（`Number.isFinite()` チェックを追加）
- `App.#handleError`: エラーハンドラー自体がスローした場合にサイレントだった問題を修正（`console.error` でログ出力）
- `logger()`: `new URL(ctx.req.url)` のパース失敗を try/catch で保護
- `ipFilter()`: IPv6 アドレスが IPv4 CIDR ルールを意図せずバイパスしていた動作について動作仕様をコメントで明文化
- `getMimeType()`: `.mp4` / `.webm` / `.mp3` / `.ogg` / `.wav` / `.flac` / `.avif` の MIME タイプを追加
- `bodyLimit()`: チャンクエンコードによる回避が既知制限であることをコメントで明文化
- `rateLimit()` デフォルト key: `x-forwarded-for` 偽装リスクをコメントで明文化
- `loadEnv()` 検証条件: `rule.required && rule.default === undefined` を `rule.required && !("default" in rule)` に修正

### 軽微修正（14件）

- `deno.json`: バージョンを `1.1.0` → `1.1.6` に更新
- `methodColorOf()`: `HEAD`（シアン）/ `OPTIONS`（ホワイト）のカラーを追加
- `newCommand()` テンプレート: 生成 `deno.json` の import バージョンを `^1.1.6` に更新
- `RouteGroup` コンストラクタ: `@internal` JSDoc を付与して `router.group()` 経由のみが正規使用であることを明示
- `deleteCookie()`: `SameSite=Lax` 属性を付与

---

## Ver.1.1-5 — 型安全強化・機能改良

**日付**: 2026-04-11
**種別**: 追加機能・機能改良

### 型安全強化

- `TypedHandler<Path, B?, Q?, S?>`: パスリテラル型から `ctx.params` を自動推論するハンドラー型エイリアス（`Handler<ExtractRouteParams<Path>, ...>` の省略形）
- `Simplify<T>`: mapped type / intersection 型をフラット展開して IDE 表示を改善するユーティリティ型
- `StrictQueryResult<S>`: `QueryResult<S>` の全フィールドから `undefined` を除去するユーティリティ型
- `EnvRule` に `"enum"` 型を追加: `values: readonly string[]` で列挙値制限 + リテラル Union 型推論（`EnvValueOf<R>` を `infer V extends readonly string[]` で強化）
- `RouteGroup` の全ルート登録メソッド（`get / post / put / delete / patch / head / options`）に `ExtractRouteParams<Path>` 自動推論オーバーロードを追加

### 機能改良

- `loadEnv()`: `rule.type === "enum"` の場合、`values` 外の値に対して `Error` を throw するバリデーションを追加

---

## Ver.1.1-4 — セキュリティ強化・型安全強化・機能改良

**日付**: 2026-04-11
**種別**: 追加機能・機能改良・破壊的変更

### セキュリティ強化

- `hsts()`: HTTP Strict Transport Security ミドルウェア（`max-age` / `includeSubDomains` / `preload` オプション対応）
- `ipFilter()`: IP アドレスフィルタリングミドルウェア（IPv4 CIDR サポート / 許可・拒否リスト / カスタム IP 取得関数）

### 型安全強化

- `ExtractRouteParams<Path>`: パスリテラル型からパスパラメータオブジェクト型を自動導出する型
- `InferSchema<S>` / `InferFieldType<R>`: Schema 定義から TypeScript 型を自動導出するユーティリティ型（`required: true` → 必須、それ以外 → optional）
- `Router` の全ルート登録メソッド（`get / post / put / delete / patch / head / options`）が `ExtractRouteParams<Path>` を自動推論し `ctx.params` を型付け
- `EnvResult<S>` を `EnvValueOf<R>` ヘルパー型ベースに刷新。`required` なし・`default` なしのフィールドは `T | undefined` を返す（**破壊的変更**）

### 機能改良

- `logger()`: `LogInfo` 型 + `format?: (info: LogInfo) => string` オプション追加。カスタムフォーマッターをサポート
- `rateLimit()`: `RateLimitStore` インターフェース追加。`store?` オプションでカスタムストアに差し替え可能（デフォルト: インメモリ Map）

### 破壊的変更

- `EnvResult<S>`: `required` なし・`default` なしのフィールドの型が `string` / `number` / `boolean` から `string | undefined` / `number | undefined` / `boolean | undefined` に変更。`loadEnv()` の実装も `undefined` を返すよう更新。

---

## Ver.1.1-3 — セキュリティ強化・型安全強化

**日付**: 2026-04-11
**種別**: 追加機能・機能改良

### セキュリティ強化

- `secureHeaders()` に `contentSecurityPolicy` オプション追加（`ContentSecurityPolicy` 型 / camelCase ディレクティブ定義 / CSP 文字列ビルダー）
- `csrfProtection()`: Double Submit Cookie パターンによる CSRF 保護ミドルウェア（256bit トークン / `X-CSRF-Token` ヘッダー照合）
- `sanitizeHtml()`: HTML 特殊文字エスケープヘルパー（`& < > " '` → エンティティ変換）

### 型安全強化

- `QueryResult<S>` の `enum` 型推論を強化：`values: readonly string[]` から要素リテラル Union 型を導出（例: `["asc","desc"]` → `"asc" | "desc"`）
- `QueryValueOf<R>` ヘルパー型を追加（内部使用）
- `assertBody<T>(body, schema)`: バリデーション後に型付きボディを返す関数（失敗時 HTTPError(400)）
- `ContentSecurityPolicy` インターフェースを `types.ts` / `mod.ts` に追加

---

## Ver.1.1-2 — Phase 2: ミドルウェア強化・CLI・型安全強化

**日付**: 2026-04-11
**種別**: 追加機能

### 新規ミドルウェア

- `bodyLimit()`: ボディサイズ制限ミドルウェア（Content-Length ベース / 413 Payload Too Large）
- `requestId()`: リクエスト ID ミドルウェア（X-Request-ID 自動付与 / `ctx.state.requestId`）
- `timeout()`: タイムアウトミドルウェア（Promise.race / デフォルト 503）
- `secureHeaders()`: セキュリティヘッダーミドルウェア（X-Content-Type-Options / X-Frame-Options / Referrer-Policy 等）

### 型安全強化

- `parseQuery<S>()`: クエリ文字列スキーマパース（`QuerySchema` / `QueryResult<S>`型変換・バリデーション）
- `parseParam()`: パスパラメータ型変換（`"number"` / `"int"` / `"uuid"`、変換失敗時 HTTPError(400)）
- `QueryRule` / `QuerySchema` / `QueryResult<S>` 型を `types.ts` / `mod.ts` に追加

### CLI ツール（`cli.ts` / `@adlaire/fw/cli`）

- `adlaire-fw routes [entry]`: 登録ルート一覧をカラー表示
- `adlaire-fw dev [entry]`: ファイル変更監視付き開発サーバー起動
- `adlaire-fw new <name>`: プロジェクトテンプレート生成（main.ts / deno.json / .env）
- `adlaire-fw check [entry]`: 型検証（deno check ラッパー）

### その他

- `deno.json` version を `1.1.0` に更新
- `deno.json` exports を `{ ".": "./mod.ts", "./cli": "./cli.ts" }` に変更

---

## Ver.1.0-1 — Phase 1: コア実装

**日付**: 2026-04-11
**種別**: 追加機能（初版）

### コア実装

- `Core/types.ts`: 全型定義（Context / Handler / Middleware / Rule / HttpStatus / HTTPError / EnvRule 等）
- `Core/server.ts`: App クラス / createServer() / loadEnv() / parseBody()
- `Core/router.ts`: Router / RouteGroup / パスマッチング（固定・動的・ワイルドカード）
- `Core/middleware.ts`: validate() / cors()
- `Core/response.ts`: json() / text() / html() / send() / redirect()
- `mod.ts` / `deno.json`（@adlaire/fw）

### 改良

- `listen()` → `Deno.HttpServer` を返す
- `close()`: グレースフルシャットダウン
- `testRequest()`: サーバー起動なしでルートテスト
- `accepts()`: Content-Negotiation（Accept ヘッダーパース）

### 追加機能

- ルートレベルミドルウェア: `router.get(path, ...middlewares, handler)`
- グループレベルミドルウェア: `group.use(middleware)`
- 名前付きルート + `router.url()` リバース URL 生成
- `logger()`: リクエストログミドルウェア
- `rateLimit()`: レートリミッターミドルウェア（429 + Retry-After）
- `etag()`: ETag ミドルウェア（SHA-256 / 304 Not Modified）
- `compress()`: 応答圧縮ミドルウェア（gzip / deflate）
- `serveStatic()`: 静的ファイル配信（MIME 自動判定 / トラバーサル防御）
- `getCookie()` / `setCookie()` / `deleteCookie()`: Cookie ヘルパー

### バグ修正

- 精査55件実施（致命的1件・重大11件・中程度2件・軽微7件を修正）

---

## Ver.1.0-0 — Phase 0: ルールブック策定

**日付**: 2026-04-11
**種別**: Phase 0

- `FRAMEWORK_RULEBOOK.md` Ver.1.0 策定完了

---
