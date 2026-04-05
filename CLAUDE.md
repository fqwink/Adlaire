# Adlaire Static CMS - 開発規約

> **`RULEBOOK`（ルールブック / 仕様書）は絶対原則である。**
> すべての実装は RULEBOOK の仕様に基づいて行うこと。
> **RULEBOOK に記載のない機能を実装してはならない。**
> 新機能・変更は、**まず RULEBOOK に仕様を策定・記載してから実装に着手すること。**

## リポジトリ方針

- 本リポジトリ（`fqwink/Adlaire`）は、**Adlaire Group 及び 倉田和宏が関わる全てのプロジェクト開発の統合リポジトリ**である。
- 各プロジェクトはプロジェクトルート直下のディレクトリで管理する（例: `adlaire-license-server/`）。
- 各プロジェクトにも Adlaire のルールブック規律を全面適用する。

## ドキュメント配置

- `CLAUDE.md` — 開発規約（プロジェクトルート）
- `README.md` — プロジェクト説明（プロジェクトルート）
- `rulebookdocs/` — ルールブックドキュメントフォルダ（プロジェクトルート）
  - `rulebookdocs/CHARTER.md` — ルールブック憲章（最上位原則・実装仕様）
  - `rulebookdocs/DIRECTION_RULEBOOK.md` — 製品方向性ルールブック
  - `rulebookdocs/EDITOR_RULEBOOK.md` — エディタルールブック
  - `rulebookdocs/LIFECYCLE_SYSTEM_RULEBOOK.md` — ライフサイクルシステムルールブック
  - `rulebookdocs/ARCHITECTURE_RULEBOOK.md` — アーキテクチャルールブック
  - `rulebookdocs/API_RULEBOOK.md` — API・データルールブック
  - `rulebookdocs/GENERATOR_RULEBOOK.md` — 静的サイト生成ルールブック
  - `rulebookdocs/RELEASE_PLAN_RULEBOOK.md` — リリース計画ルールブック
  - `rulebookdocs/LICENSE_SYSTEM_RULEBOOK.md` — ライセンスシステムルールブック
  - `rulebookdocs/LICENSE_SERVER_RULEBOOK.md` — ライセンスサーバールールブック
  - `rulebookdocs/BAAS_HUB_RULEBOOK.md` — BaaS連携Hubルールブック
  - `rulebookdocs/REVISION_HISTORY.md` — 全ルールブック改訂履歴
  - ※ `rulebookdocs/` 内に README.md は作成しない（CHARTER.md が構成を管理）
- `docs/` — ドキュメントフォルダ
  - `docs/CHANGES.md` — 変更履歴
- `Licenses/` — ライセンスフォルダ（プロジェクトルート）
  - `Licenses/LICENSE_Ver.2.0` — Adlaire License Ver.2.0
- `adlaire-license-server/` — ライセンスサーバー（プロジェクトルート）
  - 当面は Adlaire 本体リポジトリ内で管理。将来的に別リポジトリへ移行予定。
  - 仕様は `rulebookdocs/LICENSE_SERVER_RULEBOOK.md` に従う。
- `Adlaire_BaaS/` — Adlaire BaaS（プロジェクトルート）
  - Adlaire 統合リポジトリ内で管理。
  - 仕様は `Adlaire_BaaS/rulebookdocs/Adlaire_BaaS.md` に従う。

## ドキュメント命名規則

- ドキュメントファイル名は**正式名称を大文字**で記述する。
- 区切り文字は**アンダースコア（_）のみ許可**。ハイフン等その他の記号は使用禁止。
- バージョン付きファイルは `Ver` を使用する（`V` 単体は禁止）。
- 例: `CLAUDE.md`, `README.md`, `CHARTER.md`, `CHANGES.md`

## ルールブック管理方針

- **機能分類ベースのルールブック（`*_RULEBOOK.md`）が正式な仕様管理方式**である。
- 技術仕様の参照・変更は分類ベースルールブックに対して行うこと。
- リリース計画は `RELEASE_PLAN_RULEBOOK.md` に集約。
- セットアップ・アップデート実装仕様は `CHARTER.md` §8-9 に記載。
- **ルールブックの策定が完了するまで、実装に着手してはならない。**
- **`adlaire-license-server/` にも Adlaire のルールブック規律を全面適用する。**
  - `LICENSE_SERVER_RULEBOOK.md` が仕様の正とする。
  - RULEBOOK に記載のない機能を実装してはならない。
  - バグ修正ポリシー・ドキュメント命名規則等もすべて同一基準で適用する。

## 技術規約

> 詳細は `rulebookdocs/ARCHITECTURE_RULEBOOK.md` を参照。

- **PHP 8.3+**（`declare(strict_types=1)`）、ルート2 + `Core/` 8ファイル構成
- **TypeScript ビルドランタイム: Deno**、JS 直接記述禁止、`ts/` → `js/` バンドル生成
- ビルド: `deno task build`（esbuild IIFE バンドル → `js/admin.js` + `js/public.js`）
- `js/` 内の手動編集禁止

> バージョン規則・廃止ポリシーは `rulebookdocs/CHARTER.md` §5-6 を参照。

## コミット前チェック義務

- **TypeScript の型チェック（`deno task check`）をコミット前に必ず実行すること。**
- **PHPStan の静的解析（`phpstan analyse --configuration=phpstan.neon`）をコミット前に必ず実行すること。**
- 型エラー・静的解析エラーが残存する状態でのコミットを禁止する。
- CI（GitHub Actions）でも同一チェックを自動実行するが、ローカルでの事前確認を義務とする。

## バグ修正ポリシー

- バグ修正を行う場合は、**50件以上の精査**を実施してからバグ修正に着手すること。
- 精査結果は `RELEASE_PLAN_RULEBOOK.md` の該当バージョンに全件記載すること。
- **致命的・重大・中程度のバグ修正を最優先**とする。軽微なバグ修正はこれらの後に対応すること。
- バグ修正の**先送り（延期）は許可する**が、**理由なき先送りは禁止**とする。
- 先送りする場合は、延期先バージョンと延期理由を明記すること。
- **マイナーバージョン x.3, x.4, x.6, x.8 はバグ修正を主目的とするバージョン**と定める。
