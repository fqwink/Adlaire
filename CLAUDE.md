# Adlaire Group 統合リポジトリ — 開発規約

> **`RULEBOOK`（ルールブック / 仕様書）は絶対原則である。**
> すべての実装は RULEBOOK の仕様に基づいて行うこと。
> **RULEBOOK に記載のない機能を実装してはならない。**
> 新機能・変更は、**まず RULEBOOK に仕様を策定・記載してから実装に着手すること。**

---

## リポジトリ方針

- 本リポジトリ（`fqwink/Adlaire`）は、**Adlaire Group 及び 倉田和宏が関わる全てのプロジェクト開発の統合リポジトリ**である。
- 各プロジェクトはプロジェクトルート直下のディレクトリで管理する。
- 各プロジェクトにも本規約の共通規律を全面適用する。

---

## プロジェクト一覧

| ディレクトリ | プロジェクト | 状態 | 仕様 |
|-------------|------------|------|------|
| `adlaire-cms/` | **Adlaire Static CMS** | Ver.3.0-47 | `adlaire-cms/rulebookdocs/` |
| `adlaire-license-server/` | **Adlaire License Server** | 初期実装済 | `adlaire-license-server/rulebookdocs/` |
| `Adlaire_BaaS/` | **Adlaire BaaS** | 仕様策定段階 | `Adlaire_BaaS/rulebookdocs/` |
| `adlaire-deploy/` | **Adlaire Deploy** | Phase 0 完了 | `adlaire-deploy/rulebookdocs/` |

### Adlaire Static CMS (`adlaire-cms/`)

軽量・高セキュリティなフラットファイル型静的 CMS。
PHP 8.3+ / TypeScript (Deno) / JSON フラットファイルストレージ。

- 仕様の正: `adlaire-cms/rulebookdocs/` 内の各ルールブック
- 開発規約: `adlaire-cms/CLAUDE.md`

### Adlaire License Server (`adlaire-license-server/`)

公式サイト API キー認証・認可管理システム。
PHP 8.3+ / SQLite。当面は本リポジトリ内で管理。将来的に別リポジトリへ移行予定。

- 仕様の正: `adlaire-license-server/rulebookdocs/LICENSE_SERVER_RULEBOOK.md`
- 開発規約: `adlaire-license-server/CLAUDE.md`

### Adlaire BaaS (`Adlaire_BaaS/`)

Adlaire Static CMS に対する標準 BaaS 連携基盤。
Deno / TypeScript / Deno KV。

- 仕様の正: `Adlaire_BaaS/rulebookdocs/Adlaire_BaaS.md`
- 開発規約: `Adlaire_BaaS/CLAUDE.md`

### Adlaire Deploy (`adlaire-deploy/`)

VPS・オンプレミスで構築可能な、Deno ベースのセルフホスト型デプロイプラットフォーム。
Deno / TypeScript。

- 仕様の正: `adlaire-deploy/rulebookdocs/DEPLOY_PLATFORM_RULEBOOK.md`
- 開発規約: `adlaire-deploy/CLAUDE.md`

---

## 共通規約

以下の規約は**全プロジェクトに適用**される。

### ドキュメント命名規則

- ドキュメントファイル名は**正式名称を大文字**で記述する。
- 区切り文字は**アンダースコア（_）のみ許可**。ハイフン等その他の記号は使用禁止。
- バージョン付きファイルは `Ver` を使用する（`V` 単体は禁止）。
- 例: `CLAUDE.md`, `README.md`, `CHARTER.md`, `CHANGES.md`

### ルールブック管理方針

- **機能分類ベースのルールブック（`*_RULEBOOK.md`）が正式な仕様管理方式**である。
- 技術仕様の参照・変更は分類ベースルールブックに対して行うこと。
- **ルールブックの策定が完了するまで、実装に着手してはならない。**
- **RULEBOOK に記載のない機能を実装してはならない。**

### npm 禁止

- **`npm:` プレフィックスのインポートを全面禁止する**（セキュリティ観点）。
- サプライチェーン攻撃・依存関係混乱攻撃対策として、Deno の npm 互換機能であっても使用してはならない。
- 全プロジェクトに適用する。

### バグ修正ポリシー

- バグ修正を行う場合は、**50件以上の精査**を実施してからバグ修正に着手すること。
- 精査結果はリリース計画ルールブックの該当バージョンに全件記載すること。
- **致命的・重大・中程度のバグ修正を最優先**とする。軽微なバグ修正はこれらの後に対応すること。
- バグ修正の**先送り（延期）は許可する**が、**理由なき先送りは禁止**とする。
- 先送りする場合は、延期先バージョンと延期理由を明記すること。

---

## ルート配置

- `CLAUDE.md` — 統合リポジトリ開発規約（本ファイル）
- `README.md` — 統合リポジトリ説明
- `Licenses/` — 共通ライセンスフォルダ
  - `Licenses/LICENSE_Ver.2.0` — Adlaire License Ver.2.0
- `.github/` — CI/CD（GitHub Actions）
