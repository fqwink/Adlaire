# Adlaire Static CMS - 開発規約

> **`RULEBOOK`（ルールブック / 仕様書）は絶対原則である。**
> すべての実装は RULEBOOK の仕様に基づいて行うこと。
> **RULEBOOK に記載のない機能を実装してはならない。**
> 新機能・変更は、**まず RULEBOOK に仕様を策定・記載してから実装に着手すること。**

## ルールブック規律

- **Adlaire のルールブック規律を全面的に適用する。**
- 上位原則は `CHARTER.md` に従う。

## ドキュメント配置

- `CLAUDE.md` — 開発規約（本ファイル）
- `README.md` — プロジェクト説明
- `rulebookdocs/` — ルールブックドキュメントフォルダ
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

## 技術規約

> 詳細は `rulebookdocs/ARCHITECTURE_RULEBOOK.md` を参照。

- **PHP 8.3+**（`declare(strict_types=1)`）、ルート2 + `Core/` 8ファイル構成
- **TypeScript ビルドランタイム: Deno**、JS 直接記述禁止、`ts/` → `js/` バンドル生成
- ビルド: `deno task build`（esbuild IIFE バンドル → `js/admin.js` + `js/public.js`）
- `js/` 内の手動編集禁止

## コミット前チェック義務

- **TypeScript の型チェック（`deno task check`）をコミット前に必ず実行すること。**
- **PHPStan の静的解析（`phpstan analyse --configuration=phpstan.neon`）をコミット前に必ず実行すること。**
- 型エラー・静的解析エラーが残存する状態でのコミットを禁止する。
- CI（GitHub Actions）でも同一チェックを自動実行するが、ローカルでの事前確認を義務とする。

> バージョン規則・廃止ポリシーは `rulebookdocs/CHARTER.md` §5-6 を参照。
