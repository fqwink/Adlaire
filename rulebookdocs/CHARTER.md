# Adlaire Platform - ルールブック憲章

> 本憲章は Adlaire Platform の全ルールブックに適用される**最上位原則**である。

## 1. ルールブックの位置付け

- ルールブックは Adlaire Platform の**絶対原則（仕様書）**である。
- すべての実装はルールブックの仕様に基づいて行うこと。
- ルールブックに記載のない機能を実装してはならない。
- 新機能・変更は、**まずルールブックに仕様を策定・記載してから実装に着手すること。**

## 2. ルールブックの構成

### 2.1 現行構成

ルールブックドキュメントフォルダ内に README.md（インデックス）は作成しない。

| ファイル | 種別 | 内容 |
|---------|------|------|
| `rulebookdocs/CHARTER.md` | 憲章 | **本ファイル** — 全バージョン共通の最上位原則 |
| `rulebookdocs/RULEBOOK_Ver1.md` | バージョンベース | Ver.1.x 系（**削除予定** — 技術仕様は分類ベースに移行済み） |
| `rulebookdocs/RULEBOOK_Ver2.md` | バージョンベース | Ver.2.x 系（現行 — Ver.2.3 実装完了） |
| `rulebookdocs/ADLAIRE_DIRECTION_RULEBOOK.md` | 分類ベース | 製品方向性（ポジション・ターゲット・採用方針） |
| `rulebookdocs/ADLAIRE_EDITOR_RULEBOOK.md` | 分類ベース | エディタ（設計原則・開発範囲・禁止事項） |
| `rulebookdocs/ADLAIRE_LIFECYCLE_SYSTEM_RULEBOOK.md` | 分類ベース | ライフサイクルシステム（Setup/Update統合基盤） |
| `rulebookdocs/ADLAIRE_ARCHITECTURE_RULEBOOK.md` | 分類ベース | アーキテクチャ（ファイル構成・ビルド・セキュリティ） |
| `rulebookdocs/ADLAIRE_API_RULEBOOK.md` | 分類ベース | API・データ（REST API・PHP API・データ仕様・TS モジュール・管理UI） |

### 2.2 ルールブック移行方針

- **Ver.2.3 以降**、ルールブックは**分類ベースまたは機能ベース**で策定・更新する方針に移行する。
- バージョンベースのルールブック（`RULEBOOK_Ver1.md`, `RULEBOOK_Ver2.md`）は**いずれ廃止**する。
- 分類/機能ベースのルールブック（`ADLAIRE_*_RULEBOOK.md`）が正式な仕様管理方式となる。
- 移行完了まではバージョンベースと分類ベースが併存する。
- 憲章（`CHARTER.md`）は移行後も最上位原則として存続する。

#### 移行状況（Ver.2.3 時点）

| 移行元 | 移行先 | 状態 |
|--------|--------|:----:|
| `RULEBOOK_Ver1.md` §1-2（アーキテクチャ・構成） | `ADLAIRE_ARCHITECTURE_RULEBOOK.md` | **移行済** |
| `RULEBOOK_Ver1.md` §3-7（データ・API・TS・UI） | `ADLAIRE_API_RULEBOOK.md` | **移行済** |
| `RULEBOOK_Ver1.md` §8（機能仕様） | `ADLAIRE_API_RULEBOOK.md` §7 | **移行済** |
| `RULEBOOK_Ver1.md` §9-10（リリース計画） | `RULEBOOK_Ver2.md`（継続管理） | 移行対象外 |
| `RULEBOOK_Ver2.md` §2.1（ファイル構成） | `ADLAIRE_ARCHITECTURE_RULEBOOK.md` §2 | **移行済** |
| `RULEBOOK_Ver2.md` §2.2-2.3（Setup/Update） | `ADLAIRE_LIFECYCLE_SYSTEM_RULEBOOK.md`（既存） | 参照維持 |
| `RULEBOOK_Ver2.md` §3.3（セキュリティ） | `ADLAIRE_ARCHITECTURE_RULEBOOK.md` §5 | **移行済** |
| `RULEBOOK_Ver2.md` §3.4（アーキテクチャ刷新） | `ADLAIRE_ARCHITECTURE_RULEBOOK.md` §2 | **移行済** |

バージョンベースのルールブックは**リリース計画の管理**のみに責務を縮小し、技術仕様は分類ベースに完全移行済み。

## 3. バージョン管理方針

- メジャーバージョンごとにルールブックファイルを新設する。
- 技術仕様が分類ベースルールブックに完全移行された旧バージョンのルールブックは**削除**する。
- 新バージョンのルールブックは旧版を基盤として策定し、差分を明記する。
- 現行開発バージョンのルールブックのみ編集可能。

## 4. ドキュメント命名規則

- ドキュメントファイル名は**正式名称を大文字**で記述する。
- 区切り文字は**アンダースコア（_）のみ許可**。ハイフン等その他の記号は使用禁止。
- バージョン付きファイルは `Ver` を使用する（`V` 単体は禁止）。
- 例: `CLAUDE.md`, `README.md`, `CHARTER.md`, `CHANGES.md`, `RELEASENOTES.md`, `RULEBOOK_Ver1.md`

## 5. バージョン規則

`Ver.{Major}.{Minor}-{Build}` 形式。

- **Major**: 後方互換性のない変更。Minor を 0 にリセット。
- **Minor**: 後方互換性のある機能追加・改善。
- **Build**: 累積リビジョン番号。**リセット禁止**。すべてのリリースで単調増加。

## 6. 廃止ポリシー

- 機能・形式の廃止に伴う変更時、**レガシーソースコードの互換性維持は行わない**。
- 廃止決定後は該当コードを即座に削除する。
- 旧形式データのマイグレーションは廃止時に一度だけ実施し、以降は旧形式を認識しない。

## 7. 開発基盤（全バージョン共通）

> 詳細は `ADLAIRE_ARCHITECTURE_RULEBOOK.md` を参照。以下は要約。

- **PHP 8.3 以上必須**（`declare(strict_types=1)`）
- **TypeScript 5 系固定**（`~5.8`）、JavaScript 直接記述禁止
- ソース: `ts/` → 出力: `js/`
- ビルド: `npm install` → `npm run build`（`tsc`）
