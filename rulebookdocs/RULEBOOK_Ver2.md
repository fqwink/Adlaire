# Adlaire Platform - ルールブック Ver.2.x 系

**現行バージョン**: Ver.2.0-30（策定中）
**最終更新**: 2026-04-01
**状態**: **Ver.2.0 策定完了** — 実装着手可。

> 上位原則は `CHARTER.md`（ルールブック憲章）を参照。
> Ver.1.x 系（`RULEBOOK_Ver1.md`）を基盤とし、差分を以下に記載する。

---

## 1. 開発規約・上位規範

Ver.1.x のアーキテクチャ仕様（セクション1）を継承する。
ドキュメント命名規則、廃止ポリシー、バージョン規則は `CHARTER.md` に定義。

### 上位規範ルールブック（全バージョン共通）

| ファイル | 内容 |
|---------|------|
| `ADLAIRE_DIRECTION_RULEBOOK.md` | 製品方向性 — ポジション、ターゲットユーザー、採用/非採用方針 |
| `ADLAIRE_EDITOR_RULEBOOK.md` | エディタ規範 — 開発範囲、禁止事項、安定化原則 |
| `ADLAIRE_LIFECYCLE_SYSTEM_RULEBOOK.md` | ライフサイクルシステム — Setup/Update 統合基盤、検証駆動原則 |

上記ルールブックは特定バージョンに従属しない恒常的規範として、すべての開発判断に適用される。

---

## 2. Ver.2.0 仕様

### 2.1 ファイル構成

Ver.1.x からの継承 + Ver.2.0 追加ファイル:

| ファイル | 役割 | 直接HTTPアクセス |
|---------|------|:---:|
| `index.php` | エントリーポイント | 許可 |
| `core.php` | FileStorage・ヘルパー関数 | **禁止** |
| `admin.php` | App クラス・REST API | **禁止** |
| `admin-ui.php` | 管理 UI テンプレート | **禁止** |
| `bundle-installer.php` | **[Ver.2.0 新規]** セットアップツール（初期導入後に削除） | 許可（初回のみ） |
| `release-manifest.json` | **[Ver.2.0 新規]** 配布バンドル整合性検証用マニフェスト | **禁止** |
| `VERSION` | **[Ver.2.0 新規]** バージョン情報ファイル | **禁止** |

### 2.2 セットアップツール（bundle-installer.php）

> 上位原則は `ADLAIRE_LIFECYCLE_SYSTEM_RULEBOOK.md` に従う。

#### 2.2.1 概要

公式リリースZIP専用の検証付き初期セットアップツール。PHP単一ファイルで完結する。
本番環境に Node.js ビルドを持ち込まない。ビルド済みリリース物が配置済みであることを前提とする。

#### 2.2.2 画面フロー

| Step | 画面 | 処理内容 |
|:----:|------|---------|
| 0 | Welcome / Release Check | `release-manifest.json` 検証、`VERSION` 表示、バンドル整合性確認 |
| 1 | Environment Check | PHP 8.3+ 確認、`files/` 書き込み権限、必須ファイル存在確認、セッション利用可否 |
| 2 | Site Configuration | サイト名、デフォルト言語（ja/en）、管理者パスワード入力、パスワード確認 |
| 3 | Install Execution | `files/` ディレクトリ生成、`config.json` 保存、管理者作成（bcrypt）、`install.lock` 生成 |
| 4 | Finish / Security Notice | 完了通知、`?login` / `?admin` 導線、インストーラー削除案内 |

#### 2.2.3 入力項目

| 項目 | キー | 型 | 必須 | 備考 |
|-----|-----|-----|:----:|------|
| サイト名 | `site_name` | string | Yes | 空不可 |
| デフォルト言語 | `default_locale` | enum | Yes | `ja` / `en` |
| 管理者パスワード | `admin_password` | string | Yes | 最低8文字 |
| パスワード確認 | `admin_password_confirm` | string | Yes | 一致必須 |

#### 2.2.4 処理仕様

**Step 0 — バンドル検証**:
- `release-manifest.json` が存在しなければ即停止
- `required_files` に記載されたファイルの存在を検証
- 検証失敗時は不足ファイル一覧を表示して停止

**Step 1 — 環境チェック**:
- `PHP_VERSION >= 8.3` を検証。不足時は停止
- `files/` ディレクトリの書き込み可否を検証。不可なら作成を試行
- `password_hash()` 関数の存在を確認
- HTTPS 未使用時は警告表示（停止はしない）

**Step 2 — 設定入力**:
- 各ステップで CSRF トークンを検証（`csrf_token()` / `csrf_verify()` を利用）
- バリデーション失敗時は再入力画面を表示

**Step 3 — インストール実行**:
- `FileStorage::ensureDirectories()` でディレクトリ生成
- `config.json` にサイト名、言語を保存（`FileStorage::writeConfig()`）
- 管理者パスワードを `password_hash()` で bcrypt 化して保存
- `files/system/install.lock` を生成（JSON形式、`installed_at` タイムスタンプ付き）
- 処理失敗時はエラー表示して停止（部分的初期化のロールバックは行わない）

**Step 4 — 完了**:
- `?login` と `?admin` のリンクを表示
- `bundle-installer.php` の削除案内を表示
- 自己削除を試行（`unlink(__FILE__)`）。失敗時は手動削除方法を表示

#### 2.2.5 再実行防止

- `install.lock` が存在する場合、セットアップを即停止する
- 「既にインストール済みです」メッセージを表示

#### 2.2.6 セキュリティ要件

| 要件 | 優先度 |
|------|:------:|
| 全 POST ステップで CSRF 対策 | MUST |
| パスワードは bcrypt ハッシュ保存（平文保存禁止） | MUST |
| HTML 出力はエスケープ（`htmlspecialchars`） | MUST |
| `install.lock` による再実行防止 | MUST |
| 完了後のインストーラー削除案内 | MUST |
| HTTPS 未使用時の警告表示 | SHOULD |
| エラーやログに機密値を出力しない | MUST |

#### 2.2.7 内部構成（1ファイル内）

```
bundle-installer.php
├── detect_*()    — 環境検査関数群
├── load_*()      — manifest / version 読込関数群
├── validate_*()  — 入力検証関数群
├── install_*()   — 初期化処理関数群
├── render_*()    — HTML描画関数群
└── security_*()  — CSRF / escape / password 関数群
```

#### 2.2.8 既存コードとの連携

- `core.php` の `FileStorage` クラスを直接利用する（`require __DIR__ . '/core.php'`）
- `esc()`, `csrf_token()`, `csrf_verify()` ヘルパー関数を利用する
- セットアップ完了後は通常の `index.php` が動作する

### 2.3 アップデートシステム

> 上位原則は `ADLAIRE_LIFECYCLE_SYSTEM_RULEBOOK.md` に従う。
> **Ver.2.0 MVP には含めない。** Ver.2.0 リリース後に詳細を策定する。

**方針**（暫定）:
- 管理 UI (`?admin`) からバージョン確認・更新を実行
- `VERSION` ファイルで現在のバージョンを管理
- 更新は `release-manifest.json` で整合性検証
- コアファイルの上書き + マイグレーション実行
- 更新前に自動バックアップ

**非スコープ（Ver.2.0 MVP）**:
- 自動ダウンロード
- 差分パッチ
- ロールバック機能

### 2.4 データ仕様（Ver.1.x からの差分）

Ver.1.x のデータ仕様を継承し、以下を追加:

#### install.lock (`files/system/install.lock`)

```json
{
    "installed": true,
    "product": "Adlaire",
    "version": "2.0.0",
    "installed_at": "ISO 8601",
    "installer": "bundle-installer.php",
    "installer_version": "1.0.0"
}
```

#### release-manifest.json

```json
{
    "product": "Adlaire",
    "channel": "release",
    "version": "2.0.0",
    "bundle_format": 1,
    "required_files": [
        "index.php", "core.php", "admin.php", "admin-ui.php",
        ".htaccess", "themes", "data/lang", "js"
    ],
    "checksums": {
        "index.php": "sha256:...",
        "core.php": "sha256:..."
    }
}
```

#### VERSION

```
2.0.0
```

---

## 3. リリース計画

### 3.1 Ver.2.0 — セットアップツール・アップデートシステム

| # | 新機能 | 状態 |
|---|--------|:----:|
| 1 | セットアップツール（`bundle-installer.php`） | **仕様策定完了** |
| 2 | アップデートシステム（バージョン更新機能） | 方針策定済（詳細はMVP後） |

### 3.2 Ver.2.1 — Ver.2.0 機能改良・バグ修正

> Ver.2.0 リリース後に策定する。

### 3.3 Ver.2.2 — セキュリティ・パフォーマンス

| # | 改良点 | 状態 |
|---|--------|:----:|
| 3 | ページインデックスキャッシュ（pages.index.json） | 計画 |
| 4 | 静的生成の差分ビルド（変更ページのみ再生成） | 計画 |
| 5 | Content-Security-Policy ヘッダー | 計画 |
| 6 | セッション有効期限（自動ログアウト） | 計画 |
| 7 | パスワード強度検証 | 計画 |

### 3.4 Ver.2.3 — アーキテクチャ刷新

> 検討中。Ver.2.2 リリース後に再検討。
> **Ver.2.3 以降、ルールブックは分類/機能ベースに移行する。**
> バージョンベースのルールブック（本ファイル含む）はいずれ廃止予定。
> 詳細は `CHARTER.md` セクション 2.2「ルールブック移行方針」を参照。

| # | 改良点 | 状態 |
|---|--------|:----:|
| 8 | admin.php を App クラス（app.php）と API 関数（api.php）に分離 | 再検討予定 |
| 9 | ルーティングクラスの導入（Router） | 再検討予定 |
| 10 | FileStorage をインターフェース化（StorageInterface） | 再検討予定 |
| 11 | 設定クラスの導入（Config） | 再検討予定 |
| 12 | イベントフック基盤の刷新（EventDispatcher） | 再検討予定 |

### 3.5 Ver.2.4 — エディタ高度化

> 上位原則は `ADLAIRE_EDITOR_RULEBOOK.md` に従う。

| # | 改良点 | 状態 |
|---|--------|:----:|
| 13 | Undo/Redo（Ctrl+Z/Y、履歴スタック） | 計画 |
| 14 | ブロック ドラッグ&ドロップ並び替え | 計画 |
| 15 | ブロック コピー&ペースト（Ctrl+C/V） | 計画 |
| 16 | heading レベルクリック切替（prompt → サイクル） | 計画 |
| 17 | list 順序/非順序トグルボタン（confirm → 即切替） | 計画 |

### 3.6 Ver.2.5 — 機能拡張

| # | 改良点 | 状態 |
|---|--------|:----:|
| 18 | ページ並び順管理（ダッシュボードでドラッグ、menu 反映） | 計画 |
| 19 | ページプレビュー（`?preview=slug` で下書きを公開レイアウト確認） | 計画 |
| 20 | サイドバー（subside）をブロックエディタで編集 | 計画 |
| 21 | エクスポートにリビジョンを含むオプション | 計画 |
| 22 | 静的サイト用軽量 CSS（エディタ CSS 除外の minimal.css） | 計画 |

### 3.7 Ver.2.6 — 品質・拡張性

| # | 改良点 | 状態 |
|---|--------|:----:|
| 23 | エラーハンドリング統一（カスタム例外 + JSON エラー） | 計画 |
| 24 | 言語ファイルのホットリロード | 計画 |
| 25 | 管理 UI の完全翻訳（全テキスト） | 計画 |
| 26 | テーマ設定ファイル（theme.json メタデータ） | 計画 |

---

## 4. 仕様（Ver.1.x からの継承）

Ver.2.x のベース仕様は Ver.1.x（`RULEBOOK_Ver1.md`）を継承する。
以下のセクションは Ver.1.x と同一:

- PHP API 仕様（セクション4）
- REST API 仕様（セクション5）
- TypeScript モジュール仕様（セクション6）
- 管理 UI 仕様（セクション7）
- Core 機能仕様（セクション8）

各バージョンの実装完了後、差分を本ファイルに追記する。
