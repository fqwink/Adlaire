# Adlaire Platform - 開発規約

> **`RULEBOOK`（ルールブック / 仕様書）は絶対原則である。**
> すべての実装は RULEBOOK の仕様に基づいて行うこと。
> **RULEBOOK に記載のない機能を実装してはならない。**
> 新機能・変更は、**まず RULEBOOK に仕様を策定・記載してから実装に着手すること。**

## ドキュメント配置

- `CLAUDE.md` — 開発規約（プロジェクトルート）
- `README.md` — プロジェクト説明（プロジェクトルート）
- `rulebookdocs/` — ルールブックドキュメントフォルダ（プロジェクトルート）
  - `rulebookdocs/CHARTER.md` — ルールブック憲章（全バージョン共通の最上位原則）
  - `rulebookdocs/RULEBOOK_Ver1.md` — ルールブック Ver.1.x 系（凍結）
  - `rulebookdocs/RULEBOOK_Ver2.md` — ルールブック Ver.2.x 系（現行）
  - `rulebookdocs/ADLAIRE_DIRECTION_RULEBOOK.md` — 製品方向性ルールブック
  - `rulebookdocs/ADLAIRE_EDITOR_RULEBOOK.md` — エディタルールブック
  - `rulebookdocs/ADLAIRE_LIFECYCLE_SYSTEM_RULEBOOK.md` — ライフサイクルシステムルールブック
  - `rulebookdocs/ADLAIRE_ARCHITECTURE_RULEBOOK.md` — アーキテクチャルールブック
  - `rulebookdocs/ADLAIRE_API_RULEBOOK.md` — API・データルールブック
  - ※ `rulebookdocs/` 内に README.md は作成しない（CHARTER.md が構成を管理）
- `docs/` — ドキュメントフォルダ
  - `docs/CHANGES.md` — 変更履歴
  - `docs/RELEASENOTES.md` — リリースノート

## ドキュメント命名規則

- ドキュメントファイル名は**正式名称を大文字**で記述する。
- 区切り文字は**アンダースコア（_）のみ許可**。ハイフン等その他の記号は使用禁止。
- バージョン付きファイルは `Ver` を使用する（`V` 単体は禁止）。
- 例: `CLAUDE.md`, `README.md`, `CHARTER.md`, `CHANGES.md`, `RELEASENOTES.md`, `RULEBOOK_Ver1.md`

## ルールブック管理方針

- **分類/機能ベースのルールブック（`ADLAIRE_*_RULEBOOK.md`）が正式な仕様管理方式**である。
- 技術仕様の参照・変更は分類ベースルールブックに対して行うこと。
- バージョンベースのルールブック（`RULEBOOK_Ver2.md`）は**リリース計画の管理のみ**に使用する。
- 移行完了後の旧バージョンルールブックは削除する。
- **ルールブックの策定が完了するまで、実装に着手してはならない。**

## 技術規約

> 詳細は `rulebookdocs/ADLAIRE_ARCHITECTURE_RULEBOOK.md` を参照。

- **PHP 8.3+**（`declare(strict_types=1)`）、9ファイル Core 基盤（フラット構成）
- **TypeScript 5 系固定**（`~5.8`）、JS 直接記述禁止、`ts/` → `js/` コンパイル生成
- ビルド: `npm install` → `npm run build`（`tsc`）
- `js/` 内の手動編集禁止

> バージョン規則・廃止ポリシーは `rulebookdocs/CHARTER.md` §5-6 を参照。
