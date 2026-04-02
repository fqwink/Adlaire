# Adlaire Static CMS - ルールブック憲章

> 本憲章は Adlaire Static CMS の全ルールブックに適用される**最上位原則**である。

## 1. ルールブックの位置付け

- ルールブックは Adlaire Static CMS の**絶対原則（仕様書）**である。
- すべての実装はルールブックの仕様に基づいて行うこと。
- ルールブックに記載のない機能を実装してはならない。
- 新機能・変更は、**まずルールブックに仕様を策定・記載してから実装に着手すること。**

## 2. ルールブックの構成

ルールブックは**機能分類ベース**で分割管理する。
ルールブックドキュメントフォルダ内に README.md（インデックス）は作成しない。

| ファイル | 種別 | 内容 |
|---------|------|------|
| `CHARTER.md` | 憲章 | **本ファイル** — 最上位原則・実装仕様 |
| `DIRECTION_RULEBOOK.md` | 分類ベース | 製品方向性（ポジション・ターゲット・採用方針） |
| `EDITOR_RULEBOOK.md` | 分類ベース | エディタ（設計原則・開発範囲・禁止事項） |
| `LIFECYCLE_SYSTEM_RULEBOOK.md` | 分類ベース | ライフサイクルシステム（Setup/Update統合基盤） |
| `ARCHITECTURE_RULEBOOK.md` | 分類ベース | アーキテクチャ（ファイル構成・ビルド・セキュリティ） |
| `API_RULEBOOK.md` | 分類ベース | API・データ（REST API・PHP API・データ仕様・TS モジュール・管理UI） |
| `GENERATOR_RULEBOOK.md` | 分類ベース | 静的サイト生成（ビルド・出力・差分ビルド） |
| `RELEASE_PLAN_RULEBOOK.md` | 分類ベース | リリース計画・リリース履歴 |
| `LICENSE_SYSTEM_RULEBOOK.md` | 分類ベース | ライセンスシステム（API キー認証・ライセンス管理） |
| `BAAS_HUB_RULEBOOK.md` | 分類ベース | BaaS連携Hub（責務・標準契約・イベント・縮退運転） |
| `REVISION_HISTORY.md` | 管理 | 全ルールブック改訂履歴（統合管理） |

## 3. バージョン管理方針

- ルールブックは**機能分類ベース**（`*_RULEBOOK.md`）で管理する。
- 憲章（`CHARTER.md`）は最上位原則の管理を担う。
- 技術仕様の参照・変更は分類ベースルールブックに対して行うこと。
- **ルールブックの策定が完了するまで、実装に着手してはならない。**

## 4. ドキュメント命名規則

- ドキュメントファイル名は**正式名称を大文字**で記述する。
- 区切り文字は**アンダースコア（_）のみ許可**。ハイフン等その他の記号は使用禁止。
- バージョン付きファイルは `Ver` を使用する（`V` 単体は禁止）。
- 例: `CLAUDE.md`, `README.md`, `CHARTER.md`, `CHANGES.md`

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

> 詳細は `ARCHITECTURE_RULEBOOK.md` を参照。以下は要約。

- **PHP 8.3 以上必須**（`declare(strict_types=1)`）
- **TypeScript 5 系固定**（`~5.8`）、JavaScript 直接記述禁止
- ソース: `ts/` → 出力: `js/`
- ビルド: `npm install` → `npm run build`（`tsc`）

---

## 8. セットアップツール実装仕様（bundle-installer.php）

> 上位原則は `LIFECYCLE_SYSTEM_RULEBOOK.md` に従う。
> データ仕様（install.lock, release-manifest.json）は `API_RULEBOOK.md` §2.5-2.6 を参照。

### 8.1 概要

公式リリースZIP専用の検証付き初期セットアップツール。PHP単一ファイルで完結する。
本番環境に Node.js ビルドを持ち込まない。ビルド済みリリース物が配置済みであることを前提とする。

### 8.2 画面フロー

| Step | 画面 | 処理内容 |
|:----:|------|---------|
| 0 | Welcome / Release Check | `release-manifest.json` 検証、`VERSION` 表示、バンドル整合性確認 |
| 1 | Environment Check | PHP 8.3+ 確認、`data/` 書き込み権限、必須ファイル存在確認、セッション利用可否 |
| 2 | Site Configuration | サイト名、デフォルト言語（ja/en）、管理者パスワード入力、パスワード確認 |
| 3 | Install Execution | `data/` ディレクトリ生成、`config.json` 保存、管理者作成（bcrypt）、`install.lock` 生成 |
| 4 | Finish / Security Notice | 完了通知、`?login` / `?admin` 導線、インストーラー削除案内 |

### 8.3 入力項目

| 項目 | キー | 型 | 必須 | 備考 |
|-----|-----|-----|:----:|------|
| サイト名 | `site_name` | string | Yes | 空不可 |
| デフォルト言語 | `default_locale` | enum | Yes | `ja` / `en` |
| 管理者パスワード | `admin_password` | string | Yes | 最低8文字 |
| パスワード確認 | `admin_password_confirm` | string | Yes | 一致必須 |

### 8.4 処理仕様

**Step 0 — バンドル検証**:
- `release-manifest.json` が存在しなければ即停止
- `required_files` に記載されたファイルの存在を検証
- 検証失敗時は不足ファイル一覧を表示して停止

**Step 1 — 環境チェック**:
- `PHP_VERSION >= 8.3` を検証。不足時は停止
- `data/` ディレクトリの書き込み可否を検証。不可なら作成を試行
- `password_hash()` 関数の存在を確認
- HTTPS 未使用時は警告表示（停止はしない）

**Step 2 — 設定入力**:
- 各ステップで CSRF トークンを検証（`csrf_token()` / `csrf_verify()` を利用）
- バリデーション失敗時は再入力画面を表示

**Step 3 — インストール実行**:
- `FileStorage::ensureDirectories()` でディレクトリ生成
- `config.json` にサイト名、言語を保存（`FileStorage::writeConfig()`）
- 管理者パスワードを `password_hash()` で bcrypt 化して保存
- `data/system/install.lock` を生成（JSON形式、`installed_at` タイムスタンプ付き）
- 処理失敗時はエラー表示して停止（部分的初期化のロールバックは行わない）

**Step 4 — 完了**:
- `?login` と `?admin` のリンクを表示
- `bundle-installer.php` の削除案内を表示
- 自己削除を試行（`unlink(__FILE__)`）。失敗時は手動削除方法を表示

### 8.5 再実行防止

- `install.lock` が存在する場合、セットアップを即停止する
- 「既にインストール済みです」メッセージを表示

### 8.6 セキュリティ要件

| 要件 | 優先度 |
|------|:------:|
| 全 POST ステップで CSRF 対策 | MUST |
| パスワードは bcrypt ハッシュ保存（平文保存禁止） | MUST |
| HTML 出力はエスケープ（`htmlspecialchars`） | MUST |
| `install.lock` による再実行防止 | MUST |
| 完了後のインストーラー削除案内 | MUST |
| HTTPS 未使用時の警告表示 | SHOULD |
| エラーやログに機密値を出力しない | MUST |

### 8.7 内部構成（1ファイル内）

```
bundle-installer.php
├── detect_*()    — 環境検査関数群
├── load_*()      — manifest / version 読込関数群
├── validate_*()  — 入力検証関数群
├── install_*()   — 初期化処理関数群
├── render_*()    — HTML描画関数群
└── security_*()  — CSRF / escape / password 関数群
```

### 8.8 既存コードとの連携

- `Core/helpers.php` の `esc()`, `csrf_token()`, `csrf_verify()` ヘルパー関数を利用する
- `Core/core.php` の `FileStorage` クラスを直接利用する
- セットアップ完了後は通常の `index.php` が動作する

---

## 9. アップデートシステム実装仕様

> 上位原則は `LIFECYCLE_SYSTEM_RULEBOOK.md` に従う。

### 9.1 概要

管理 UI からバージョン確認と手動アップデートを実行する機能。
完全自動更新は採用しない（ライフサイクルRULEBOOK原則3: 明示開始）。

### 9.2 画面（管理 UI 内）

- ダッシュボードに現在のバージョン（`VERSION` ファイル）を表示
- 「Check for Updates」ボタンでリモートの最新バージョンを確認（将来拡張）
- 現行 MVP: ローカルの `VERSION` ファイル表示のみ

### 9.3 REST API

| メソッド | URL | 説明 |
|---------|-----|------|
| `GET` | `?api=version` | 現在のバージョン情報を返す（認証不要） |

レスポンス:
```json
{
    "product": "Adlaire",
    "version": "(現在のバージョン)",
    "installed": true,
    "installed_at": "ISO 8601"
}
```

### 9.4 非スコープ（現行 MVP）

- リモートバージョンチェック（自動ダウンロード）
- 差分パッチ適用
- ロールバック機能
- コアファイル上書き更新
