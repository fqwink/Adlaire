# Adlaire Framework — 変更履歴

> 各バージョンの変更内容を記録する文書。
> 詳細仕様は `rulebookdocs/FRAMEWORK_RULEBOOK.md` を参照。

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
