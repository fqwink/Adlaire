# Adlaire Platform - ルールブック Ver.2.x 系

**現行バージョン**: Ver.2.3-35
**最終更新**: 2026-04-02
**状態**: **Ver.2.3 実装完了** — Ver.2.4（バグ修正）策定待ち。

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

Ver.2.3 現行アーキテクチャ（10ファイル Core 基盤）:

| ファイル | 役割 | 直接HTTPアクセス | 備考 |
|---------|------|:---:|------|
| `index.php` | エントリーポイント + ルーティング | 許可 | |
| `helpers.php` | ヘルパー関数（esc, csrf, rate_limit） | **禁止** | Ver.2.3 で core.php から分離 |
| `core.php` | FileStorage クラス（データ層） | **禁止** | |
| `app.php` | App クラス（設定, 認証, 翻訳, 描画） | **禁止** | Ver.2.3 で admin.php から分離 |
| `renderer.php` | サーバーサイド描画（blocks→HTML, markdown→HTML） | **禁止** | Ver.2.3 で admin.php から分離 |
| `api.php` | REST API ハンドラー + handleEdit | **禁止** | Ver.2.3 で admin.php から分離 |
| `generator.php` | 静的サイト生成（handleApiGenerate, generatePageHtml） | **禁止** | Ver.2.3 で admin.php から分離 |
| `admin-ui.php` | 管理 UI テンプレート | **禁止** | |
| `bundle-installer.php` | セットアップツール（初期導入後に削除） | 許可（初回のみ） | Ver.2.0 新規 |
| `release-manifest.json` | 配布バンドル整合性検証用マニフェスト | **禁止** | Ver.2.0 新規 |
| `VERSION` | バージョン情報ファイル | **禁止** | Ver.2.0 新規 |

> **廃止**: `admin.php` は Ver.2.3 で廃止。上記6ファイルに完全移行済み。

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

- `helpers.php` の `esc()`, `csrf_token()`, `csrf_verify()` ヘルパー関数を利用する
- `core.php` の `FileStorage` クラスを直接利用する
- セットアップ完了後は通常の `index.php` が動作する

### 2.3 アップデートシステム

> 上位原則は `ADLAIRE_LIFECYCLE_SYSTEM_RULEBOOK.md` に従う。

#### 2.3.1 概要

管理 UI からバージョン確認と手動アップデートを実行する機能。
完全自動更新は採用しない（ライフサイクルRULEBOOK原則3: 明示開始）。

#### 2.3.2 画面（管理 UI 内）

- ダッシュボードに現在のバージョン（`VERSION` ファイル）を表示
- 「Check for Updates」ボタンでリモートの最新バージョンを確認（将来拡張）
- Ver.2.0 MVP: ローカルの `VERSION` ファイル表示のみ

#### 2.3.3 REST API

| メソッド | URL | 説明 |
|---------|-----|------|
| `GET` | `?api=version` | 現在のバージョン情報を返す（認証不要） |

レスポンス:
```json
{
    "product": "Adlaire",
    "version": "2.0.0",
    "installed": true,
    "installed_at": "ISO 8601"
}
```

#### 2.3.4 非スコープ（Ver.2.0 MVP）

- リモートバージョンチェック（自動ダウンロード）
- 差分パッチ適用
- ロールバック機能
- コアファイル上書き更新
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
        "index.php", "helpers.php", "core.php", "app.php",
        "renderer.php", "api.php", "generator.php", "admin-ui.php",
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
| 1 | セットアップツール（`bundle-installer.php`） | **実装済** |
| 2 | アップデートシステム（バージョン情報 API + 管理 UI 表示） | **実装済** |

### 3.2 Ver.2.1 — Ver.2.0 バグ修正（30件）

> Ver.2.0 リリース後の品質確定リリース。バグ修正のみ。

#### セキュリティ（10件）

| # | 修正内容 | 深刻度 |
|---|---------|:------:|
| 1 | DELETE リクエストの CSRF トークンをURLからヘッダーに移行 | 高 |
| 2 | import API の CSRF 検証タイミング修正 | 高 |
| 3 | DELETE レスポンスに X-CSRF-Token ヘッダー追加 | 高 |
| 4 | App::VERSION の出力をエスケープ | 中 |
| 5 | MD5 レガシーパスワード検出時に強制リセットフラグ | 中 |
| 6 | セッション cookie に SameSite=Strict 追加 | 中 |
| 7 | editor.ts のブロック innerHTML を安全化 | 高 |
| 8 | HTTPS 非使用時の管理画面警告表示 | 低 |
| 9 | atomicWrite の chmod 失敗チェック追加 | 低 |
| 10 | install.lock JSON パース失敗のハンドリング | 低 |

#### データ整合性（8件）

| # | 修正内容 | 深刻度 |
|---|---------|:------:|
| 11 | VERSION ファイルと App::VERSION の値を統一 | 高 |
| 12 | package.json version を 2.0.0 に更新 | 中 |
| 13 | release-manifest.json に bundle-installer.php 追加 | 中 |
| 14 | pageFormat デフォルト 'html' フォールバック除去 | 中 |
| 15 | PHP サーバーサイド Markdown のリスト正規表現修正 | 中 |
| 16 | rotateBackups を新バックアップ作成後に実行 | 中 |
| 17 | admin-ui.php の閉じタグ重複修正（section 二重閉じ） | 低 |
| 18 | handleApiVersion の lock ファイル null チェック | 低 |

#### コード品質（7件）

| # | 修正内容 | 深刻度 |
|---|---------|:------:|
| 19 | login() の未使用変数 $newPass 整理 | 低 |
| 20 | listRevisions に limit パラメータ追加 | 中 |
| 21 | 著作権年を 2014-2026 に更新 | 低 |
| 22 | admin-ui.php の System セクション version API 連携 | 中 |
| 23 | bundle-installer.php の RewriteEngine 位置修正 | 低 |
| 24 | tsconfig.json の include パターン確認 | 低 |
| 25 | .htaccess の data/ ルール明確化 | 低 |

#### ドキュメント（5件）

| # | 修正内容 | 深刻度 |
|---|---------|:------:|
| 26 | RULEBOOK_Ver2.md の Ver.2.1 状態を「実装済」に | 低 |
| 27 | docs/CHANGES.md に Ver.2.0-31, Ver.2.1 追加 | 低 |
| 28 | docs/RELEASENOTES.md に Ver.2.0-31, Ver.2.1 追加 | 低 |
| 29 | README.md のバージョン更新 | 低 |
| 30 | CHARTER.md の Ver.2.x 状態更新 | 低 |

### 3.3 Ver.2.2 — セキュリティ・パフォーマンス

| # | 改良点 | 状態 |
|---|--------|:----:|
| 3 | ページインデックスキャッシュ（pages.index.json） | **実装済** |
| 4 | 静的生成の差分ビルド（変更ページのみ再生成） | **実装済** |
| 5 | Content-Security-Policy ヘッダー | **実装済** |
| 6 | セッション有効期限（自動ログアウト） | **実装済** |
| 7 | パスワード強度検証 | **実装済** |

#### 3.3.1 ページインデックスキャッシュ

- `files/pages.index.json` にページメタデータ（slug, format, status, updated_at）をキャッシュする。
- `listPages()` はキャッシュが存在し有効な場合、個別ページ JSON を読み込まずキャッシュを返す。
- `writePage()`, `deletePage()`, `updatePageStatus()` 実行時にキャッシュを再構築する。
- キャッシュ無効化: キャッシュファイルが存在しない場合、またはページディレクトリの mtime がキャッシュの mtime より新しい場合。

#### 3.3.2 静的生成の差分ビルド

- `handleApiGenerate()` で `dist/.build_state.json` に前回ビルド時刻を記録する。
- 各ページの `updated_at` が前回ビルド時刻より新しい場合のみ再生成する。
- `force=true` パラメータで全ページ再生成を強制できる。
- CSS/JS/sitemap は常に再生成する。

#### 3.3.3 Content-Security-Policy ヘッダー

- `index.php` で以下の CSP ヘッダーを出力する:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'
  ```
- 管理 UI（`admin-ui.php`）では `script-src 'self' 'unsafe-inline'` を許可する（インラインスクリプト使用のため）。
- API レスポンスには CSP を付与しない。

#### 3.3.4 セッション有効期限

- セッションに `last_activity` タイムスタンプを記録する。
- 各リクエストで `last_activity` から30分以上経過している場合、セッションを破棄してログアウトする。
- ログイン時に `last_activity` を設定する。
- `handleAuth()` 内でチェックする。

#### 3.3.5 パスワード強度検証

- パスワード変更時（`login()` の新パスワード処理）に以下を検証する:
  - 最低8文字以上（MUST）
  - `admin`, `password`, `12345678` などの弱いパスワードを拒否（SHOULD）
- `bundle-installer.php` の初期パスワード設定でも同じ検証を適用する。
- 検証失敗時は翻訳済みエラーメッセージを返す。

### 3.4 Ver.2.3 — アーキテクチャ刷新（機能ベース10ファイル分離）

> **Ver.2.3 以降、ルールブックは分類/機能ベースに移行する。**
> 詳細は `CHARTER.md` セクション 2.2「ルールブック移行方針」を参照。

#### 3.4.1 設計原則

- 「複雑性より整合性を優先する」
- 「利便性より壊れにくさを優先する」
- ディレクトリ追加なし（フラット構成）
- 新しいパターン（Router クラス、Interface、EventDispatcher）は導入しない
- admin.php の責務を機能ベースで分離するのみ

#### 3.4.2 ファイル構成（9ファイル）

全ファイルは **Core 基盤** とする。

| ファイル | 責務 | 直接HTTPアクセス |
|---------|------|:---:|
| `index.php` | エントリーポイント + ルーティング | 許可 |
| `helpers.php` | ヘルパー関数（esc, csrf, rate_limit） | **禁止** |
| `core.php` | FileStorage クラス（データ層） | **禁止** |
| `app.php` | App クラス（設定, 認証, 翻訳, 描画, プラグイン） | **禁止** |
| `renderer.php` | サーバーサイド描画関数（renderBlocksToHtml, renderMarkdownToHtml） | **禁止** |
| `api.php` | REST API ルーター + 全ハンドラー + handleEdit | **禁止** |
| `generator.php` | 静的サイト生成（handleApiGenerate, generatePageHtml） | **禁止** |
| `admin-ui.php` | 管理 UI テンプレート | **禁止** |
| `bundle-installer.php` | セットアップツール（初期導入後に削除） | 許可（初回のみ） |

> **設計判断**: 当初 auth.php（認証分離）を計画したが、認証メソッドは App クラスの
> プライベートメソッドとして密結合しているため、分離せず app.php に統合した。
> content() / menu() も App クラスのメソッドとして app.php に残留。
> renderBlocksToHtml() / renderMarkdownToHtml() はグローバル関数として renderer.php に分離。
> 「複雑性より整合性」の原則に基づく判断。

#### 3.4.3 require 順序（index.php）

```php
require 'helpers.php';    // esc, csrf（依存なし）
require 'core.php';       // FileStorage（helpers に依存）
require 'app.php';        // App クラス（helpers, core に依存）
require 'renderer.php';   // 描画関数（helpers に依存）
require 'api.php';        // API ハンドラー（全てに依存）
require 'generator.php';  // 静的生成（全てに依存）
```

#### 3.4.4 分離ルール

| 元ファイル | 移動先 | 対象 |
|-----------|--------|------|
| `core.php` ヘルパー関数 | `helpers.php` | `esc()`, `csrf_token()`, `csrf_verify()`, `login_rate_check()` |
| `admin.php` App クラス全体 | `app.php` | App クラス（認証・描画・設定・翻訳を含む全メソッド） |
| `admin.php` グローバル関数（描画） | `renderer.php` | `renderBlocksToHtml()`, `renderMarkdownToHtml()` |
| `admin.php` グローバル関数（API） | `api.php` | `handleApi()`, `handleEdit()`, 全 API ハンドラー, `apiError()` |
| `admin.php` 静的生成関数 | `generator.php` | `handleApiGenerate()`, `generatePageHtml()` |
| `core.php` | `core.php`（維持） | FileStorage クラスのみ |

#### 3.4.5 廃止

- `admin.php` は **廃止**。分離先の5ファイル（app.php, renderer.php, api.php, generator.php, helpers.php）に完全移行。
- 廃止ポリシーに従い、互換性維持は行わない。

#### 3.4.6 不採用項目

以下は Ver.2.3 では採用しない。将来必要に応じて再検討。

| 項目 | 理由 |
|------|------|
| Router クラス | 現在の if/match 分岐で十分。複雑性を増やさない |
| StorageInterface | FileStorage 以外の実装予定がない。必要になった時に導入 |
| Config クラス | $config 配列で十分機能している |
| EventDispatcher | $hooks 配列で十分。プラグイン基盤の需要が出てから検討 |

| # | 改良点 | 状態 |
|---|--------|:----:|
| 8 | admin.php を機能ベース5ファイルに分離 | **実装済** |
| 9 | ルーティングクラスの導入（Router） | **不採用** |
| 10 | FileStorage をインターフェース化（StorageInterface） | **不採用** |
| 11 | 設定クラスの導入（Config） | **不採用** |
| 12 | イベントフック基盤の刷新（EventDispatcher） | **不採用** |

### 3.5 Ver.2.4 — バグ修正

| # | 改良点 | 状態 |
|---|--------|:----:|
| 13 | Ver.2.3 アーキテクチャ刷新後のバグ修正・精査 | 計画 |

### 3.6 Ver.2.5 — エディタ高度化

> 上位原則は `ADLAIRE_EDITOR_RULEBOOK.md` に従う。

| # | 改良点 | 状態 |
|---|--------|:----:|
| 14 | Undo/Redo（Ctrl+Z/Y、履歴スタック） | 計画 |
| 15 | ブロック ドラッグ&ドロップ並び替え | 計画 |
| 16 | ブロック コピー&ペースト（Ctrl+C/V） | 計画 |
| 17 | heading レベルクリック切替（prompt → サイクル） | 計画 |
| 18 | list 順序/非順序トグルボタン（confirm → 即切替） | 計画 |

### 3.7 Ver.2.6 — 機能拡張

| # | 改良点 | 状態 |
|---|--------|:----:|
| 19 | ページ並び順管理（ダッシュボードでドラッグ、menu 反映） | 計画 |
| 20 | ページプレビュー（`?preview=slug` で下書きを公開レイアウト確認） | 計画 |
| 21 | サイドバー（subside）をブロックエディタで編集 | 計画 |
| 22 | エクスポートにリビジョンを含むオプション | 計画 |
| 23 | 静的サイト用軽量 CSS（エディタ CSS 除外の minimal.css） | 計画 |

### 3.8 Ver.2.7 — 品質・拡張性

| # | 改良点 | 状態 |
|---|--------|:----:|
| 24 | エラーハンドリング統一（カスタム例外 + JSON エラー） | 計画 |
| 25 | 言語ファイルのホットリロード | 計画 |
| 26 | 管理 UI の完全翻訳（全テキスト） | 計画 |
| 27 | テーマ設定ファイル（theme.json メタデータ） | 計画 |

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
