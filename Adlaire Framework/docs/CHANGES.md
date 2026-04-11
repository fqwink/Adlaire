# Adlaire Framework — 変更履歴

> 各バージョンの変更内容を記録する文書。
> 詳細仕様は `rulebookdocs/FRAMEWORK_RULEBOOK.md` を参照。

---

## Ver.1.12-14 — バグ修正（56件精査・10件修正）

**日付**: 2026-04-10
**種別**: バグ修正

全12ファイル56項目精査（重大3件・中程度4件・軽微3件）

| # | 深刻度 | 対象 | 概要 |
|:-:|:------:|------|------|
| 1 | 重大 | `builtin_middleware.ts` | CORS credentials + wildcard origin RFC 違反を修正 |
| 2 | 重大 | `builtin_middleware.ts` | rateLimit Map メモリリーク修正（定期クリーンアップ実装） |
| 3 | 重大 | `context.ts` | SSE data マルチライン未対応（RFC 8895 違反）を修正 |
| 4 | 中程度 | `cookies.ts` | Cookie name の不正な encodeURIComponent を修正 |
| 5 | 中程度 | `context.ts` | sendFile Content-Disposition filename 未エスケープを修正 |
| 6 | 中程度 | `server.ts` | handleStop 二重呼び出しを修正 |
| 7 | 中程度 | `builtin_middleware.ts` | jwtAuth algorithms オプション未使用を修正 |
| 8 | 軽微 | `env_schema.ts` | 空文字列が number 0 に暗黙変換される問題を修正 |
| 9 | 軽微 | `context.ts` | formData 同名フィールド上書きを修正（配列として返す） |
| 10 | 軽微 | `builtin_middleware.ts` | compress 二重圧縮を修正 |

---

## Ver.1.11-13 — onStart / onStop フック + WebSocketRoom

**日付**: 2026-04-10
**種別**: 追加機能

| # | 概要 |
|:-:|------|
| 34 | `onStart(port)` / `onStop()` ライフサイクルフック（`adlaire.config.ts` 設定） |
| 35 | `WebSocketRoom` — WebSocket 接続グループ管理・ブロードキャスト |

---

## Ver.1.10-12 — ctx.formData\<T\>() + defineEnvSchema()

**日付**: 2026-04-10
**種別**: 追加機能

| # | 概要 |
|:-:|------|
| 32 | `ctx.formData<T>(guard?)` — multipart/form-data・urlencoded 型安全パース |
| 33 | `defineEnvSchema(schema)` — 複数環境変数の一括スキーマ定義・型変換・バリデーション |

---

## Ver.1.9-11 — ctx.sendFile() + ctx.negotiate()

**日付**: 2026-04-10
**種別**: 追加機能

| # | 概要 |
|:-:|------|
| 30 | `ctx.sendFile(path, options?)` — 任意ファイル配信（MIME 自動判定） |
| 31 | `ctx.negotiate(handlers)` — Accept ヘッダーによるコンテンツネゴシエーション |

---

## Ver.1.8-10 — logger format 拡張 + cache()

**日付**: 2026-04-10
**種別**: 機能改良 + 追加機能

| # | 種別 | 概要 |
|:-:|------|------|
| 28 | 機能改良 | `logger(options?)` — `format: "json"` オプション追加（JSON Lines 出力） |
| 29 | 追加機能 | `cache(options?)` — `Cache-Control` ヘッダー設定ミドルウェア |

---

## Ver.1.7-9 — securityHeaders() + requestId()

**日付**: 2026-04-10
**種別**: 追加機能

| # | 概要 |
|:-:|------|
| 26 | `securityHeaders(options?)` — セキュリティヘッダー一括付与ミドルウェア |
| 27 | `requestId(options?)` — リクエスト ID 生成・ctx.state 注入・レスポンスヘッダー付与 |

---

## Ver.1.6-8 — jwtAuth() + csrf()

**日付**: 2026-04-10
**種別**: 追加機能

| # | 概要 |
|:-:|------|
| 24 | `jwtAuth(options)` — JWT Bearer 認証ミドルウェア（WebCrypto API / HS256） |
| 25 | `csrf(options?)` — CSRF 二重送信 Cookie 保護ミドルウェア |

---

## Ver.1.5-7 — ルートグループ + getEnv()

**日付**: 2026-04-10
**種別**: 追加機能

| # | 概要 |
|:-:|------|
| 22 | ルートグループ `(group-name)` — URL に影響しない透過ディレクトリ |
| 23 | `getEnv(key, fallback?)` — 型安全環境変数アクセサ |

---

## Ver.1.4-6 — SSE サポート + adlaire deploy CLI

**日付**: 2026-04-10
**種別**: 追加機能

| # | 概要 |
|:-:|------|
| 20 | `ctx.sse(callback)` — Server-Sent Events レスポンス生成 |
| 21 | `adlaire deploy --host=<URL> --project=<ID>` — Adlaire Deploy API トリガー |

---

## Ver.1.3-5 — 組み込みミドルウェア + WebSocket サポート

**日付**: 2026-04-10
**種別**: 追加機能

| # | 概要 |
|:-:|------|
| 15 | `cors(options?)` — CORS ヘッダー設定・Preflight 204 応答 |
| 16 | `logger()` — リクエストログ |
| 17 | `rateLimit(options?)` — IP ベースのレートリミット・429 応答 |
| 18 | `compress()` — gzip / deflate 圧縮 |
| 19 | `ctx.upgradeWebSocket(handlers)` — WebSocket アップグレード |

---

## Ver.1.2-4 — エラーハンドラー + ctx.query / ctx.body / ctx.cookies

**日付**: 2026-04-10
**種別**: 追加機能

| # | 概要 |
|:-:|------|
| 11 | `_error.ts` / `_404.ts` ルーター組み込み（最長プレフィックスマッチ） |
| 12 | `ctx.query` — クエリパラメータ型安全アクセス |
| 13 | `ctx.body<T>(guard?)` — JSON ボディパース + 型ガード・`ValidationError` |
| 14 | `ctx.cookies` — Cookie 読み書き・レスポンス自動反映 |

---

## Ver.1.1-3 — バグ修正（3件）

**日付**: 2026-04-10
**種別**: バグ修正

| # | 深刻度 | 概要 |
|:-:|:------:|------|
| 1 | 重大 | `router.ts`: ミドルウェアプレフィックスが `/admin` と `/administrator` を区別しない問題を修正 |
| 2 | 重大 | `router.ts`: `file://` URL 生成でスペース含むパスが失敗する問題を修正 |
| 3 | 中程度 | `cli/cmd_new.ts`: 生成プロジェクトの import map が存在しないパスを参照する問題を修正 |

---

## Ver.1.1-2 — Phase 2: ミドルウェア・CLI

**日付**: 2026-04-10
**種別**: 追加機能

| # | 概要 |
|:-:|------|
| 6 | ミドルウェア（`_middleware.ts` チェーン・`defineMiddleware` / 状態型付け） |
| 7 | CLI: `adlaire new`（プロジェクトテンプレート生成） |
| 8 | CLI: `adlaire dev`（開発サーバー・ファイル監視リロード） |
| 9 | CLI: `adlaire check` / `adlaire routes`（型検証・ルート一覧） |
| 10 | CLI: `adlaire build --target=deno` / `--target=js` |

---

## Ver.1.0-1 — Phase 1: コア実装

**日付**: 2026-04-10
**種別**: 追加機能（初版）

| # | 概要 |
|:-:|------|
| 1 | HTTP サーバー起動（`Deno.serve` ベース） |
| 2 | ファイルベースルーティング（`routes/` 探索・URL マッチング・動的パラメータ） |
| 3 | 型安全システム（`defineHandler` / `Context<Params>` / ルートパラメータ自動型付け） |
| 4 | レスポンスヘルパー（`ctx.json()` / `ctx.html()` / エラーレスポンス） |
| 5 | 静的ファイル配信（`static/` ディレクトリ対応） |

---

## Ver.1.0-0 — Phase 0: ルールブック策定

**日付**: —
**種別**: Phase 0

- `FRAMEWORK_RULEBOOK.md` 初版策定
