# Adlaire BaaS - 開発規約

> **`RULEBOOK`（ルールブック / 仕様書）は絶対原則である。**
> すべての実装は RULEBOOK の仕様に基づいて行うこと。
> **RULEBOOK に記載のない機能を実装してはならない。**
> 新機能・変更は、**まず RULEBOOK に仕様を策定・記載してから実装に着手すること。**

## Adlaire Static CMS 準拠方針

**Adlaire BaaS の機能・仕様・契約を策定する際は、[Adlaire Static CMS](https://github.com/fqwink/Adlaire) の最新版の機能・構造・設計方針に準拠することを原則とする。**

- Adlaire Static CMS の機能追加・変更・廃止が生じた場合は、Adlaire BaaS 側の仕様を追従して改訂する
- **策定作業を行う前に、必ず https://github.com/fqwink/Adlaire を参照し、最新版の機能・構造を確認してから着手すること。この参照を省略してはならない。**

## ルールブック規律

- **Adlaire のルールブック規律を全面的に適用する。**
- 上位原則は Adlaire 本体の `CHARTER.md` に従う。

## ドキュメント配置

- `CLAUDE.md` — 開発規約（本ファイル）
- `README.md` — プロジェクト説明
- `rulebookdocs/` — ルールブックドキュメントフォルダ
  - `rulebookdocs/BAAS_SPEC.md` — Adlaire BaaS 仕様書（仕様の正）
  - `rulebookdocs/REVISION_HISTORY.md` — 改訂履歴
  - ※ `rulebookdocs/` 内に README.md は作成しない
- `docs/` — ドキュメントフォルダ
  - `docs/CHANGES.md` — 変更履歴

## ドキュメント命名規則

- ドキュメントファイル名は**正式名称を大文字**で記述する。
- 区切り文字は**アンダースコア（_）のみ許可**。ハイフン等その他の記号は使用禁止。
- バージョン付きファイルは `Ver` を使用する（`V` 単体は禁止）。

## 技術規約

| 項目 | 採用 |
|---|---|
| ランタイム | **Deno** |
| 言語 | **TypeScript** |
| フレームワーク | **独自（内製のみ）** |
| DB | **Deno.openKv（Deno組み込み）** |
| Deno標準ライブラリ（jsr:@std/） | **禁止** |
| npmパッケージ | **禁止** |
| 外部JSRパッケージ | **禁止** |
| Node.js | **禁止** |

## コミット前チェック義務

- **TypeScript の型チェックをコミット前に必ず実行すること。**
- 型エラーが残存する状態でのコミットを禁止する。

## バグ修正ポリシー

- バグ修正を行う場合は、**50件以上の精査**を実施してからバグ修正に着手すること。
- **致命的・重大・中程度のバグ修正を最優先**とする。
- バグ修正の**先送り（延期）は許可する**が、**理由なき先送りは禁止**とする。

## リポジトリ管理

- Adlaire 統合リポジトリ（`fqwink/Adlaire`）の `Adlaire_BaaS/` ディレクトリで管理する。
