# Adlaire Deploy - 開発規約

> **`RULEBOOK`（ルールブック / 仕様書）は絶対原則である。**
> すべての実装は RULEBOOK の仕様に基づいて行うこと。
> **RULEBOOK に記載のない機能を実装してはならない。**
> 新機能・変更は、**まず RULEBOOK に仕様を策定・記載してから実装に着手すること。**

## ルールブック規律

- **Adlaire のルールブック規律を全面的に適用する。**
- 上位原則は Adlaire 本体の `CHARTER.md` に従う。

## ドキュメント配置

- `CLAUDE.md` — 開発規約（本ファイル）
- `README.md` — プロジェクト説明
- `rulebookdocs/` — ルールブックドキュメントフォルダ
  - `rulebookdocs/DEPLOY_PLATFORM_RULEBOOK.md` — プラットフォーム仕様（仕様の正）
  - `rulebookdocs/REVISION_HISTORY.md` — 改訂履歴
  - ※ `rulebookdocs/` 内に README.md は作成しない
- `docs/` — ドキュメントフォルダ
  - `docs/CHANGES.md` — 変更履歴

## 技術規約

- **ランタイム: Deno (TypeScript)**
- **`npm:` プレフィックスのインポートを全面禁止**（セキュリティ観点。サプライチェーン攻撃・依存関係混乱攻撃対策）
- 詳細は `rulebookdocs/DEPLOY_PLATFORM_RULEBOOK.md` を参照
