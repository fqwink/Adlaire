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
| `Adlaire Static CMS/` | **Adlaire Static CMS** | Ver.3.0-47 | `Adlaire Static CMS/rulebookdocs/` |
| `Adlaire License Server/` | **Adlaire License Server** | 初期実装済 | `Adlaire License Server/rulebookdocs/` |
| `Adlaire BaaS/` | **Adlaire BaaS** | 仕様策定段階 | `Adlaire BaaS/rulebookdocs/` |
| `Adlaire Deploy/` | **Adlaire Deploy** | Phase 0 完了 | `Adlaire Deploy/rulebookdocs/` |

### Adlaire Static CMS (`Adlaire Static CMS/`)

軽量・高セキュリティなフラットファイル型静的 CMS。
PHP 8.3+ / TypeScript (Deno) / JSON フラットファイルストレージ。

- 仕様の正: `Adlaire Static CMS/rulebookdocs/` 内の各ルールブック
- 開発規約: `Adlaire Static CMS/CLAUDE.md`

### Adlaire License Server (`Adlaire License Server/`)

公式サイト API キー認証・認可管理システム。
PHP 8.3+ / SQLite。当面は本リポジトリ内で管理。将来的に別リポジトリへ移行予定。

- 仕様の正: `Adlaire License Server/rulebookdocs/LICENSE_SERVER_RULEBOOK.md`
- 開発規約: `Adlaire License Server/CLAUDE.md`

### Adlaire BaaS (`Adlaire BaaS/`)

Adlaire Static CMS に対する標準 BaaS 連携基盤。
Deno / TypeScript / Deno KV。

- 仕様の正: `Adlaire BaaS/rulebookdocs/Adlaire_BaaS.md`
- 開発規約: `Adlaire BaaS/CLAUDE.md`

### Adlaire Deploy (`Adlaire Deploy/`)

VPS・オンプレミスで構築可能な、Deno ベースのセルフホスト型デプロイプラットフォーム。
Deno / TypeScript。

- 仕様の正: `Adlaire Deploy/rulebookdocs/DEPLOY_PLATFORM_RULEBOOK.md`
- 開発規約: `Adlaire Deploy/CLAUDE.md`

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

### プロジェクト新設規則

新規プロジェクトを本リポジトリに追加する場合は、以下に従うこと。

#### ディレクトリ命名

- ディレクトリ名は**プロジェクト正式名称**をそのまま使用する。
- 例: `Adlaire Static CMS/`, `Adlaire Deploy/`

#### 必須ディレクトリ構成

新規プロジェクトは以下の構成を**初回コミット時に必ず**作成すること。

```
<プロジェクト名>/
├── CLAUDE.md                    # 開発規約（必須）
├── README.md                    # プロジェクト説明（必須）
├── rulebookdocs/                # ルールブックフォルダ（必須）
│   ├── <機能>_RULEBOOK.md       # 仕様書（最低1冊必須）
│   └── REVISION_HISTORY.md      # 改訂履歴（必須）
└── docs/
    └── CHANGES.md               # 変更履歴（必須）
```

#### 新設手順

1. **ルールブック策定**（Phase 0）を最初に行う。実装コードより先にルールブックを作成すること。
2. プロジェクト用 `CLAUDE.md` を作成し、ルールブック規律・技術規約・ドキュメント配置を記載する。
3. 本ファイル（ルート `CLAUDE.md`）のプロジェクト一覧に追加する。
4. ルート `README.md` のプロジェクト一覧に追加する。

#### CLAUDE.md 必須記載事項

各プロジェクトの `CLAUDE.md` には以下を**必ず記載**すること。

- ルールブック規律の宣言（Adlaire 共通規約への準拠明記）
- ドキュメント配置
- 技術規約（使用言語・ランタイム・禁止事項）
- リポジトリ管理（統合リポジトリ内のディレクトリパス）

#### 禁止事項

- **ルールブック未策定のまま実装コードをコミットしてはならない。**
- `rulebookdocs/` 内に `README.md` を作成してはならない。
- 共通規約（npm 禁止・バグ修正ポリシー等）に反するプロジェクト固有規約を定めてはならない。

### バージョン規則

`Ver.{Major}.{Minor}-{Build}` 形式。全プロジェクトに適用する。

- **Major**: 後方互換性のない変更。Minor を 0 にリセット。
- **Minor**: 後方互換性のある機能追加・改善。
- **Build**: 累積リビジョン番号。**リセット禁止**。すべてのリリースで単調増加。

### 廃止ポリシー

- 機能・形式の廃止に伴う変更時、**レガシーソースコードの互換性維持は行わない**。
- 廃止決定後は該当コードを即座に削除する。
- 旧形式データのマイグレーションは廃止時に一度だけ実施し、以降は旧形式を認識しない。

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
- `Distribution/` — 配布専用ディレクトリ（リリース ZIP 等の配布物を集約）
- `.github/` — CI/CD（GitHub Actions）
