# Adlaire Group — RELEASE_PLAN_RULEBOOK

- 文書名: Adlaire Group Release Plan RULEBOOK
- 文書バージョン: Ver.1.0
- 作成日: 2026-04-06
- 対象: 統合リポジトリ（fqwink/Adlaire）全プロジェクト
- 文書種別: 全プロジェクトのリリース計画・履歴を横断的に管理する規範文書

---

## 1. 基本宣言

本 RULEBOOK は、Adlaire Group 統合リポジトリが管理する全プロジェクトのリリース計画と履歴を横断的に管理する文書である。
各プロジェクトの詳細なリリース計画・変更履歴は、各プロジェクト内の `rulebookdocs/RELEASE_PLAN_RULEBOOK.md` および `docs/CHANGES.md` を参照すること。

---

## 2. 現行バージョン（全プロジェクト）

| プロジェクト | 現行バージョン | リリース日 | 状態 |
|---|---|---|---|
| **Adlaire Static CMS** | Ver.3.0-47 | 2026-04-05 | 本番稼働中 |
| **Adlaire Deploy** | 未リリース | — | Phase 0 完了・初版リリース待ち |
| **Adlaire License Server** | 初期実装済 | — | リリース計画未策定 |
| **Adlaire BaaS** | 未実装 | — | 仕様策定段階 |

---

## 3. リリース履歴

### 3.1 Adlaire Static CMS

詳細: `Adlaire Static CMS/rulebookdocs/RELEASE_PLAN_RULEBOOK.md`

| バージョン | 概要 | リリース日 |
|---|---|---|
| **Ver.3.0-47** | 基盤刷新（APIキー認証必須化・Deno移行・CI/CD整備）+ バグ修正累積 | 2026-04-05 |
| Ver.2.9 | マスター管理者モデル導入 + 全コード品質確定（PHP63件+TS120件 = 448件精査） | — |
| Ver.2.8 | バグ修正（PHP200件+TS100件 = 300件精査） | — |
| Ver.2.7 | 機能拡張・管理UI強化（14件） + バグ修正150件精査 | — |
| Ver.2.6 | バグ修正（70件精査） | — |
| Ver.2.5 | エディタ高度化（Undo/Redo・DnD・コピペ・heading/listトグル・execCommand置換） | — |
| Ver.2.4 | バグ修正（50件精査）+ ARCHITECTURE_RULEBOOK準拠（Core/分離・data/移行） | — |
| Ver.2.3 | アーキテクチャ刷新（機能ベースファイル分離） | — |
| Ver.2.2 | セキュリティ・パフォーマンス改善（ページインデックスキャッシュ・差分ビルド・CSP） | — |
| Ver.2.1 | バグ修正（25件） | — |
| Ver.2.0 | セットアップツール（bundle-installer.php）・アップデートシステム | — |
| Ver.1.9 | 1.0系最終版（バグ修正38件）— 凍結 | — |
| Ver.1.8 | 機能拡張・フロントエンド強化 | — |
| Ver.1.7 | 品質・安全性・管理UI強化 | — |

### 3.2 Adlaire Deploy

詳細: `Adlaire Deploy/rulebookdocs/RELEASE_PLAN_RULEBOOK.md`

（リリース実績なし — Phase 1〜5 実装完了・初版リリース待ち）

### 3.3 Adlaire License Server

（リリース実績なし）

### 3.4 Adlaire BaaS

（リリース実績なし）

---

## 4. リリース計画

### 4.1 Adlaire Static CMS

> 詳細仕様は各分類ベースルールブックに策定後、`Adlaire Static CMS/rulebookdocs/RELEASE_PLAN_RULEBOOK.md` §5 を更新すること。
> **以下は暫定承認済み計画（2026-04-04）であり、今後再検討予定。**

| バージョン | 種別 | 概要 | 状態 |
|---|---|---|---|
| **Ver.3.1** | 追加機能 | ブログ基盤（投稿タイプ・メタデータ・一覧ページ・ダッシュボードフィルタ） | 計画 |
| **Ver.3.2** | 追加機能 | ブログ機能拡充（カテゴリ/タグ/日付アーカイブ・前後ナビ） | 計画 |
| **Ver.3.3** | バグ修正 | 50件以上精査（Ver.3.1〜3.2ブログ機能含む） | 計画 |
| **Ver.3.4** | バグ修正 | 50件以上精査（3.0系追加セキュリティ精査） | 計画 |
| **Ver.3.5** | 追加機能・機能改良 | エディタ強化（新ブロックタイプ・画像管理基盤） | 計画 |
| **Ver.3.6** | バグ修正 | 50件以上精査 | 計画 |
| **Ver.3.7** | 追加機能・機能改良 | テーマ設定UI強化・全文検索最適化・BaaS連携Hub基盤着手 | 計画 |
| **Ver.3.8** | バグ修正 | 50件以上精査 | 計画 |

### 4.2 Adlaire Deploy

> Phase 1〜5 の実装はすべて完了済み。初版リリースに向けて整備中。
> 詳細: `Adlaire Deploy/rulebookdocs/RELEASE_PLAN_RULEBOOK.md`

| バージョン | 種別 | 概要 | 状態 |
|---|---|---|---|
| **Ver.1.0-1** | 追加機能（初版） | Phase 1: 最小デプロイ基盤（設定管理・プロセスマネージャ・リバースプロキシ・CLI・管理API） | 実装済・リリース待ち |
| **Ver.1.1-2** | 追加機能 | Phase 2: Git連携（Webhook・デプロイパイプライン・デプロイ履歴） | 実装済・リリース待ち |
| **Ver.1.2-3** | 追加機能 | Phase 3: KVストレージ（プロジェクト別分離KV・プラットフォームKV） | 実装済・リリース待ち |
| **Ver.1.3-4** | 追加機能・機能改良 | Phase 4: 環境変数・ログ（Worker権限設定・ログキャプチャ・リングバッファ） | 実装済・リリース待ち |
| **Ver.1.4-5** | 追加機能 | Phase 5: マルチノードクラスター（origin/edgeロール・HMAC認証・設定同期・デプロイ伝播） | 実装済・リリース待ち |

### 4.3 Adlaire License Server

> リリース計画未策定。`Adlaire License Server/rulebookdocs/LICENSE_SERVER_RULEBOOK.md` に基づき策定すること。
> 詳細仕様: `Adlaire License Server/rulebookdocs/LICENSE_SERVER_RULEBOOK.md`

| バージョン | 種別 | 概要 | 状態 |
|---|---|---|---|
| **Ver.1.0-（未定）** | 追加機能（初版） | 初版リリース（APIエンドポイント4本・管理ダッシュボード・SQLite） | 計画未策定 |

### 4.4 Adlaire BaaS

> 仕様策定段階。ルールブック策定完了まで実装・リリース計画の策定は行わない。
> 詳細仕様: `Adlaire BaaS/rulebookdocs/Adlaire_BaaS.md`
> Adlaire Static CMS Ver.3.7 にて BaaS連携Hub 基盤着手予定（暫定）。

| バージョン | 種別 | 概要 | 状態 |
|---|---|---|---|
| **Ver.1.0-（未定）** | 追加機能（初版） | 初版リリース（Identity・Members・Data・Storage・Events・Generate・Audit・Health） | 仕様策定段階 |

---

## 5. リリース判定基準（全プロジェクト共通）

以下の基準を満たさない限り、いかなるプロジェクトもリリースしてはならない。

- **致命的バグが残存する状態でリリースしてはならない。**
- バグ修正 → 機能改良 → 追加機能 の実装順序（共通規約）を遵守していること。
- ルールブックに未記載の機能が含まれていないこと。
- バグ修正を含む場合は精査件数と深刻度内訳を `RELEASE_PLAN_RULEBOOK.md` に全件記載していること。

---

## 6. 配布物管理

- リリース配布物（ZIP 等）は統合リポジトリルートの `Distribution/` ディレクトリに集約する。
- 配布物のファイル名にはバージョン番号を含めること。
- GitHub Actions `release.yml` により、`VERSION` ファイル変更を検知して自動ビルド・ZIP生成を行う（Adlaire Static CMS）。
