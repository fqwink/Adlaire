# Adlaire Framework — 改訂履歴

> ルールブック改訂履歴を管理する文書。

---

## FRAMEWORK_RULEBOOK.md（フレームワーク仕様）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.1.30 | 2026-04-10 | **Ver.1.12-14 対応**: `onStart`/`onStop` ライフサイクルフック（§4.2）、`WebSocketRoom`（§6.13）、`ctx.formData<T>()`（§6.12）、`defineEnvSchema()`（§10.8）、`ctx.sendFile()`（§6.10）、`ctx.negotiate()`（§6.11）、`logger(format:"json")`（§8.5）、`cache()`（§8.10）、`securityHeaders()`（§8.8）、`requestId()`（§8.9）、`jwtAuth()`（§8.6）、`csrf()`（§8.7）、`getEnv()`（§10.7）、ルートグループ（§5.6）、SSE マルチライン RFC 8895 準拠（§6.9）、バグ修正 10件反映。エラー型表（§12）追加 |
| Ver.1.20 | 2026-04-10 | **Ver.1.9-11 対応**: `ctx.sendFile()`（§6.10）・`ctx.negotiate()`（§6.11）仕様追加 |
| Ver.1.19 | 2026-04-10 | **Ver.1.8-10 対応**: `logger(options?)` の `format: "json"` オプション（§8.5）・`cache(options?)`（§8.10）仕様追加 |
| Ver.1.18 | 2026-04-10 | **Ver.1.7-9 対応**: `securityHeaders(options?)`（§8.8）・`requestId(options?)`（§8.9）仕様追加 |
| Ver.1.17 | 2026-04-10 | **Ver.1.6-8 対応**: `jwtAuth(options)`（§8.6）・`csrf(options?)`（§8.7）仕様追加 |
| Ver.1.16 | 2026-04-10 | **Ver.1.5-7 対応**: ルートグループ `(group-name)`（§5.6）・`getEnv()`（§10.7）仕様追加 |
| Ver.1.15 | 2026-04-10 | **Ver.1.4-6 対応**: `ctx.sse()`（§6.9）・`adlaire deploy` CLI（§11.3）仕様追加 |
| Ver.1.14 | 2026-04-10 | **Ver.1.3-5 対応**: 組み込みミドルウェア（cors/logger/rateLimit/compress）（§8.5）・`ctx.upgradeWebSocket()`（§6.8）・`WebSocketRoom`（§6.13）仕様追加 |
| Ver.1.13 | 2026-04-10 | **Ver.1.2-4 対応**: `_error.ts`/`_404.ts`（§5.5）・`ctx.query`（§6.5）・`ctx.body<T>()`（§6.6）・`ctx.cookies`（§6.7）仕様追加 |
| Ver.1.12 | 2026-04-10 | **Ver.1.1-2 対応**: CLI（adlaire new/dev/build/check/routes）全コマンド仕様追加（§11） |
| Ver.1.11 | 2026-04-10 | **バグ修正 3件反映**: ミドルウェアプレフィックス区別・file:// URL エンコード・import map パス |
| Ver.1.10 | 2026-04-10 | **Ver.1.0-1 対応**: HTTP サーバー（§1.4）・ファイルベースルーティング（§5）・`defineHandler`（§7.1）・レスポンスヘルパー（§7.2）・静的ファイル配信（§9）仕様策定 |
| Ver.1.0 | — | 初版: 製品定義（§1）・設計原則・ディレクトリ構成（§2）・動作要件（§3）・設定（§4）・ルーティング基礎（§5.1〜5.4）・ミドルウェア基礎（§8.1〜8.4）・ビルド構成（§10）を策定 |
