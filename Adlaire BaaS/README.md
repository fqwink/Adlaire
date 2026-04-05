# Adlaire BaaS

Adlaire Static CMS に対する標準 BaaS 連携基盤。

会員認証、会員管理、業務データ、ストレージ、イベント、監査、再生成連携、健全性監視を外部基盤として標準化することを目的とする。

## 8 機能領域

| 領域 | 責務 |
|---|---|
| **Identity** | エンドユーザー向け会員認証 |
| **Members** | 会員プロフィール・状態管理 |
| **Data** | アプリケーションデータ CRUD |
| **Storage** | ファイル・画像管理 |
| **Events** | 標準イベント配送 |
| **Generate** | 静的サイト再生成連携 |
| **Audit** | 監査ログ基盤 |
| **Health & Degrade** | 接続健全性・縮退運転 |

## 技術スタック

| 項目 | 採用 |
|---|---|
| ランタイム | Deno |
| 言語 | TypeScript |
| フレームワーク | 独自（内製のみ） |
| DB | Deno.openKv |

## 仕様

詳細は `rulebookdocs/Adlaire_BaaS.md` を参照。

## Copyright

Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏 All Rights Reserved.
