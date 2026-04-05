# Adlaire Deploy

VPS・オンプレミスで構築可能な、Deno ベースのセルフホスト型デプロイプラットフォーム。

Deno Deploy の思想（TypeScript ネイティブ・ゼロコンフィグ・即時デプロイ）を継承しつつ、クラウドに依存しない自前運用を前提とする。

## コア機能

| 機能 | 概要 |
|------|------|
| Deno ランタイム | TypeScript / JavaScript をネイティブ実行 |
| ゼロコンフィグデプロイ | Git push → 自動ビルド → 自動デプロイ |
| KV ストレージ | Deno KV 互換のキーバリューストア |
| 環境変数管理 | プロジェクト単位の環境変数設定 |
| ログ・監視 | リアルタイムログストリーム、ヘルスチェック |

## 技術スタック

| 項目 | 採用 |
|------|------|
| ランタイム | Deno |
| 言語 | TypeScript |
| KV ストレージ | Deno KV (SQLite バックエンド) |

## 仕様

詳細は `rulebookdocs/DEPLOY_PLATFORM_RULEBOOK.md` を参照。

## Copyright

Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏 All Rights Reserved.
