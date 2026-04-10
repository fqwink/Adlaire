# Adlaire Framework

Adlaire Group の全プロジェクトに適用する TypeScript 製 Web フレームワーク。

Deno をランタイムとし、Deno Deploy および Adlaire Deploy の双方に対応する。
Deno の Web フレームワーク Fresh にインスパイアされつつ、Adlaire Group 独自の仕様（型安全ファースト・npm 禁止）を採用する。

## 特徴

- **型安全ファースト** — ルートパラメータ・ハンドラーデータの型をフレームワークが自動提供
- **ファイルベースルーティング** — `routes/` ディレクトリ構造が URL に直接対応
- **ルートグループ** — `(group)` 形式ディレクトリで URL に影響しない論理グループを作成
- **ゼロ npm** — `npm:` インポート全面禁止（Adlaire Group 規約）
- **デュアルデプロイ対応** — Deno Deploy / Adlaire Deploy 両対応
- **組み込みミドルウェア** — CORS / ロガー / レートリミット / gzip 圧縮
- **WebSocket / SSE** — `ctx.upgradeWebSocket()` / `ctx.sse()` でリアルタイム通信
- **Cookie ヘルパー** — `ctx.cookies` で型安全な Cookie の読み書き
- **Adlaire Style 統合** — Adlaire Style の自動注入

## 状態

**Ver.1.5-7**（実装済み）

| バージョン | 内容 |
|-----------|------|
| Ver.1.0-1 | Phase 1: HTTP サーバー・ルーティング・ハンドラー・レスポンスヘルパー |
| Ver.1.1-2 | Phase 2: CLI ツール（new / dev / build / check / routes） |
| Ver.1.1-3 | バグ修正 3件（ミドルウェアプレフィックス・file:// URL エンコード・import map） |
| Ver.1.2-4 | `_error.ts` / `_404.ts` ルーター組み込み・`ctx.query` / `ctx.body<T>()` / `ctx.cookies` |
| Ver.1.3-5 | 組み込みミドルウェア（cors / logger / rateLimit / compress）・WebSocket サポート |
| Ver.1.4-6 | SSE（`ctx.sse()`）・`adlaire deploy` CLI |
| Ver.1.5-7 | ルートグループ（`(group)`）・`getEnv()` 型安全環境変数アクセサ |

## 仕様

`rulebookdocs/FRAMEWORK_RULEBOOK.md` を参照。

## LICENSE

Copyright (c) 2026 Adlaire Group & 倉田和宏 All Rights Reserved.
Licensed under Adlaire License Ver.2.0
