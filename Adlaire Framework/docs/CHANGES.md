# Adlaire Framework — 変更履歴

> 各バージョンの変更内容を記録する文書。
> 詳細仕様は `rulebookdocs/FRAMEWORK_RULEBOOK.md` を参照。

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
