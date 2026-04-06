# Adlaire Architecture RULEBOOK

- 文書名: Adlaire Architecture RULEBOOK
- 文書バージョン: Ver.3.0
- 作成日: 2026-04-02
- 最終更新: 2026-04-06
- 対象製品: Adlaire Static CMS
- 文書種別: アーキテクチャ・ファイル構成・ビルド・セキュリティを定義する技術規範文書
- 文書目的: Adlaire のコアアーキテクチャ、ファイル構成、TypeScript/JS 規約、ビルドプロセス、セキュリティ基盤を恒常的規範として定義する

---

# 1. 基本宣言

## 1.1 位置づけ

本 RULEBOOK は、Adlaire Static CMS のコアアーキテクチャに関する恒常的規範文書である。
特定バージョンに従属せず、すべての開発判断に適用される。

## 1.2 設計原則

- 「**複雑性より整合性を優先する**」
- 「**利便性より壊れにくさを優先する**」
- コアは小さく保つ（DIRECTION_RULEBOOK.md §5.7）
- 共有サーバーで成立する構成を維持する

---

# 2. PHP 基盤

## 2.1 バージョン要件

- **PHP 8.3 以上を必須**とする。
- すべての PHP ファイルに `declare(strict_types=1)` を記述する。

## 2.2 ファイル構成

ルート配置2ファイル + `Core/` ディレクトリ8ファイルで構成する。

### ルート配置（直接HTTPアクセス許可）

| ファイル | 責務 |
|---------|------|
| `index.php` | エントリーポイント + ルーティング |
| `bundle-installer.php` | セットアップツール（初期導入後に削除） |

### Core ディレクトリ（直接HTTPアクセス禁止）

| ファイル | 責務 |
|---------|------|
| `Core/helpers.php` | ヘルパー関数（esc, csrf, rate_limit） |
| `Core/core.php` | FileStorage クラス（データ層） |
| `Core/license.php` | LicenseValidator クラス（API キー認証） |
| `Core/app.php` | App クラス（設定, 認証, 翻訳, シェル HTML 出力, プラグイン） |
| `Core/renderer.php` | サーバーサイド描画関数（renderBlocksToHtml, renderMarkdownToHtml） |
| `Core/api.php` | REST API ルーター + 全ハンドラー |
| `Core/generator.php` | 静的サイト生成（handleApiGenerate, generatePageHtml） |
| ~~`Core/admin-ui.php`~~ | **廃止**（§11 参照）。管理 UI は TypeScript SPA に全移管 |

> **設計判断**: 認証メソッドは App クラスのプライベートメソッドとして密結合しているため、
> 分離せず app.php に統合。「複雑性より整合性」の原則に基づく。
> `admin-ui.php` の廃止により PHP の責務は REST API・認証・静的生成・ファイルストレージに純化される。

## 2.3 require 順序（index.php）

```php
require 'Core/helpers.php';    // esc, csrf（依存なし）
require 'Core/license.php';    // ライセンス検証（helpers に依存）
require 'Core/core.php';       // FileStorage（helpers に依存）
require 'Core/app.php';        // App クラス（helpers, core に依存）
require 'Core/renderer.php';   // 描画関数（helpers に依存）
require 'Core/api.php';        // API ハンドラー（全てに依存）
require 'Core/generator.php';  // 静的生成（全てに依存）
// Core/admin-ui.php は廃止（§11 参照）
```

## 2.4 .htaccess アクセス制御

- `Core/` ディレクトリへの直接HTTPアクセスをディレクトリ単位で禁止する。
- `data/` ディレクトリは `data/lang/` のみアクセス許可（翻訳 JSON）。それ以外は禁止。
- `release-manifest.json`, `VERSION` ファイルへの直接アクセスは禁止する。
- クリーン URL は `RewriteRule` で実現する。
- インデックス表示は無効化する（`-Indexes`）。

---

# 3. データディレクトリ

すべてのデータファイルは `data/` ディレクトリに格納する。

## 3.1 ディレクトリ構成

```
data/
├── lang/                      # 翻訳ファイル（JSON、公開アクセス許可）
│   ├── ja.json
│   └── en.json
├── config.json                # サイト設定
├── .config.lock               # 設定書き込み排他ロック
├── pages/{slug}.json          # ページデータ
├── pages.index.json           # ページインデックスキャッシュ
├── revisions/{slug}/          # リビジョン履歴（最大30世代）
├── backups/                   # 設定バックアップ（最大9世代）
└── system/
    ├── install.lock           # インストール済みフラグ
    ├── license.key            # API キーファイル
    └── users.json             # マスター管理者データ（権限 0600）
```

## 3.2 アクセス制御

- `data/lang/` のみ公開アクセスを許可する（TypeScript i18n モジュールが非同期読み込みするため）。
- それ以外の `data/` 内ファイルは `.htaccess` で保護する。

---

# 4. TypeScript / JavaScript 規約

## 4.1 基本方針

- **TypeScript を全面的に採用する**。JavaScript の直接記述は禁止。
- **ビルドランタイムは Deno を採用する**（Ver.3.0 以降）。Node.js / npm は使用しない。
- **`npm:` プレフィックスのインポートを全面禁止する**（セキュリティ観点）。`npm:` 経由の依存はサプライチェーン攻撃・依存関係混乱攻撃のリスクを持つため、Deno の npm 互換機能であっても使用してはならない。
- すべての JavaScript は **TypeScript からのコンパイル生成を義務化** する。
- TypeScript バージョンは Deno に組み込まれたものを使用する。Deno のメジャーバージョン更新は別途検討。

## 4.2 ディレクトリ配置

- TypeScript ソース: `ts/` ディレクトリ
- コンパイル済み JavaScript: `js/` ディレクトリ（自動生成）
- ビルドスクリプト: `scripts/build.ts`
- `js/` 内のファイルを手動編集することを禁止する。

## 4.3 ビルド手順

```bash
deno task build   # TypeScript → JavaScript コンパイル
deno task check   # 型チェックのみ（コンパイルなし）
deno task watch   # ウォッチモード（開発時）
```

- 本番環境に Deno ビルドを持ち込まない（DIRECTION_RULEBOOK.md §7.3 準拠）。
- ビルド済みリリース物が配置済みであることを前提とする。
- `deno.json` をプロジェクト設定ファイルとして使用する（`package.json` / `tsconfig.json` は廃止）。
- コンパイラオプションは `deno.json` の `compilerOptions` セクションに定義する。
- ビルドスクリプト（`scripts/build.ts`）は **esbuild バイナリを `Deno.Command` 経由で実行する**。`npm:esbuild` は使用しない。
- esbuild バイナリは GitHub Releases（`https://github.com/evanw/esbuild/releases`）から直接取得する。npm レジストリを経由しない。
- esbuild のバージョンは **`deno.json` の `esbuildVersion` フィールドで一元管理する**。CI/CD は `deno.json` から読み取ること（`jq -r '.esbuildVersion' deno.json`）。バージョン変更は `deno.json` のみを更新すれば全体に反映される。
- `--allow-run` は `esbuild` のみに限定する（`--allow-run=esbuild`）。任意コマンド実行を禁止する。

## 4.4 ES モジュール移行（Ver.3.0）

> Ver.2.x 系の `module: none`（グローバルスクリプト方式）を廃止し、ES モジュールに移行する。

### 4.4.1 基本方針

- TypeScript ソースに `import` / `export` 文を導入する。
- ビルドスクリプトが全モジュールを**単一バンドルファイル `js/main.js`** に結合する。
- PHP テンプレートは `<script>` タグ 1つで `js/main.js` をロードする。
- バンドルは IIFE（即時実行関数式）形式で出力し、モジュールスコープで隔離する。
- PHP 側から参照が必要なグローバル関数は、エントリポイントで明示的に `window` に公開する。

### 4.4.2 エントリポイント

- **管理画面エントリ**: `ts/app.ts`（SPA 初期化・ルーター起動。§4.5 参照）
- **公開ページエントリ**: `ts/public.ts`（`markdown.ts` 等の公開側必要モジュールのみインポート）
- ビルドスクリプトはエントリポイントごとにバンドルを出力する。

### 4.4.3 出力ファイル

| 出力ファイル | エントリポイント | 用途 |
|-------------|----------------|------|
| `js/admin.js` | `ts/app.ts` | 管理画面 SPA 用（全機能） |
| `js/public.js` | `ts/public.ts` | 公開ページ用（描画のみ） |

### 4.4.4 PHP 側の変更

- `App::adminShell()`: 管理画面用 Shell HTML を出力する。インラインスクリプトは最小限（CSRF トークンのみ）。
- `App::scriptTags()` は廃止する。Shell HTML 内に直接 `<script>` タグを記述する。
- 管理画面: `<script src="js/admin.js" defer></script>`
- 公開ページ: `<script src="js/public.js" defer></script>`
- `ADMIN_SCRIPTS` / `PUBLIC_SCRIPTS` 定数を廃止する。

### 4.4.5 グローバル公開関数

以下の関数は PHP テンプレートまたはインラインスクリプトから参照されるため、バンドル内でグローバルに公開する。

| 関数 | 用途 |
|------|------|
| `markdownToHtml()` | Markdown → HTML 変換（公開ページ描画） |
| `renderBlocks()` | ブロック → HTML 変換（公開ページ描画） |
| `sanitizeHtml()` | HTML サニタイズ |
| `escHtml()` | HTML エスケープ |

公開方法: エントリポイントで `(window as any).functionName = functionName;` として明示的に代入する。

### 4.4.6 廃止項目（Ver.3.x 対応済み）

- `module: none` によるグローバルスクリプト方式を廃止した。
- 個別 JS ファイルの `<script>` タグ複数読み込みを廃止した。
- `ts/globals.d.ts` のグローバル関数宣言を廃止し、モジュールインポートに置換した。

---

## 4.5 管理 UI SPA アーキテクチャ（完全フロントエンド化）

> **Ver.3.x 新規策定**

### 4.5.1 基本方針

- **管理 UI の全レンダリングを TypeScript に移管する**。PHP は管理 UI の HTML を一切生成しない。
- PHP の責務を **REST API・認証・静的生成・ファイルストレージ** に純化する。
- `Core/admin-ui.php` を**廃止**し、TypeScript SPA が全ての管理画面を描画する。
- **共用ホスティング互換性は絶対に維持する**。実行ランタイムは引き続き Apache + PHP のみ。Deno ランタイムは本番環境に持ち込まない。

### 4.5.2 Shell HTML 方式

`index.php` は管理画面リクエストに対して**最小限の Shell HTML** を返す。Shell HTML は UI を持たず、SPA の起動台座のみを提供する。

**Shell HTML の必須要素:**

```html
<!DOCTYPE html>
<html lang="<?= esc($lang) ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="csrf-token" content="<?= esc(csrf_token()) ?>">
  <title>Adlaire Admin</title>
  <link rel="stylesheet" href="assets/adlaire-style.min.css">
</head>
<body>
  <div id="app"></div>
  <script src="js/admin.js" defer></script>
</body>
</html>
```

- CSRF トークンは `<meta name="csrf-token">` でフロントエンドに渡す。
- `<div id="app">` が SPA のマウントポイントとなる。
- PHP はこれ以上の HTML を生成しない。

### 4.5.3 CSRF トークン管理

- Shell HTML の `<meta name="csrf-token">` から初期トークンを読み取る。
- API レスポンスの `X-CSRF-Token` ヘッダーでトークンを更新し続ける（既存仕様と同一）。
- TypeScript 側: `api.ts` が全リクエストに `X-CSRF-Token` ヘッダーを自動付与する。

### 4.5.4 クライアントサイドルーター

管理画面のページ遷移はクライアントサイドで処理する。History API（`pushState`）を使用。

| パス | 画面 | TypeScript モジュール |
|------|------|----------------------|
| `/admin` または `/?admin` | ダッシュボード | `ts/pages/dashboard.ts` |
| `/admin/pages` | ページ一覧 | `ts/pages/page-list.ts` |
| `/admin/pages/{slug}/edit` | ページ編集 | `ts/pages/page-edit.ts` |
| `/admin/settings` | サイト設定 | `ts/pages/settings.ts` |
| `/admin/users` | ユーザー管理 | `ts/pages/users.ts` |
| `/admin/login` | ログイン | `ts/pages/login.ts` |

- ルーターは `ts/router.ts` に実装する。
- ページコンポーネントは `ts/pages/` ディレクトリに配置する。
- **ログインページも TypeScript が描画する**。PHP はログイン API（`POST /api/auth/login`）のみを担当する。

### 4.5.5 認証状態管理

- SPA 起動時に `GET /api/auth/status` を呼び出し、ログイン状態を確認する。
- 未ログイン: ログインページ（`ts/pages/login.ts`）にリダイレクト。
- ログイン済み: ダッシュボードを表示。
- PHP セッションは変更なし（`httponly`・`SameSite=Strict` 維持）。
- Shell HTML はログイン状態に関係なく常に返す（セッション確認は JS が行う）。

### 4.5.6 TypeScript モジュール構成（新規追加分）

| ファイル | 責務 |
|---------|------|
| `ts/app.ts` | SPA エントリポイント。ルーター初期化・認証チェック・初期レンダリング |
| `ts/router.ts` | クライアントサイドルーター（History API ベース） |
| `ts/pages/dashboard.ts` | ダッシュボードページ |
| `ts/pages/page-list.ts` | ページ一覧ページ |
| `ts/pages/page-edit.ts` | ページ編集ページ（既存 `editor.ts` を内包） |
| `ts/pages/settings.ts` | サイト設定ページ |
| `ts/pages/users.ts` | ユーザー管理ページ |
| `ts/pages/login.ts` | ログインページ |

- 既存の `ts/editor.ts`・`ts/i18n.ts`・`ts/markdown.ts`・`ts/api.ts`・`ts/autosize.ts` は継続使用する。
- `ts/editInplace.ts` の責務は `ts/app.ts` に統合し、廃止する（§11 参照）。

### 4.5.7 Adlaire Style 統合

- 管理 UI のスタイルシートを `themes/admin.css` から **Adlaire Style** に移行する。
- Shell HTML は `assets/adlaire-style.min.css` を読み込む。
- `themes/admin.css` は廃止する（§11 参照）。
- Adlaire Style の CSS クラス（`STYLE_RULEBOOK.md` 準拠）を TypeScript 生成 HTML 内で使用する。

### 4.5.8 PHP の最終責務範囲（完全フロントエンド化後）

| 責務 | 担当 |
|------|------|
| Shell HTML 配信（管理画面） | PHP（`App::adminShell()`） |
| 公開ページ HTML 生成 | PHP（`renderer.php`・`generator.php`） |
| 認証・セッション管理 | PHP（`app.php`） |
| REST API | PHP（`api.php`） |
| ファイルストレージ | PHP（`core.php`） |
| 静的サイト生成 | PHP（`generator.php`） |
| ライセンス検証 | PHP（`license.php`） |
| **管理 UI レンダリング** | **TypeScript（`js/admin.js`）** |
| **クライアントルーティング** | **TypeScript（`ts/router.ts`）** |

---

# 5. プロジェクト構成

```
Adlaire Static CMS/
├── index.php                  # エントリーポイント + ルーティング（Shell HTML 配信含む）
├── bundle-installer.php       # セットアップツール（初回のみ）
├── .htaccess                  # Apache URL書き換え・アクセス制御
├── Core/                      # Core 基盤（直接HTTPアクセス禁止）
│   ├── helpers.php            #   ヘルパー関数（esc, csrf, rate_limit）
│   ├── core.php               #   FileStorage クラス（データ層）
│   ├── license.php            #   LicenseValidator（API キー認証）
│   ├── app.php                #   App クラス（設定, 認証, 翻訳, Shell HTML 出力）
│   ├── renderer.php           #   サーバーサイド描画関数（公開ページ用）
│   ├── api.php                #   REST API ルーター + 全ハンドラー
│   └── generator.php          #   静的サイト生成
│   # admin-ui.php は廃止（§11 参照）
├── ts/                        # TypeScript ソース
│   ├── globals.d.ts           #   グローバル型定義
│   ├── app.ts                 #   管理画面 SPA エントリポイント（§4.5.6）
│   ├── router.ts              #   クライアントサイドルーター（History API ベース）
│   ├── public.ts              #   公開ページエントリポイント（描画のみ）
│   ├── editor.ts              #   ブロックエディタ
│   ├── autosize.ts            #   textarea 自動リサイズ
│   ├── i18n.ts                #   多言語化モジュール
│   ├── markdown.ts            #   Markdown→HTML コンバーター
│   ├── api.ts                 #   REST API クライアント
│   └── pages/                 #   ページコンポーネント（§4.5.4）
│       ├── login.ts           #     ログインページ
│       ├── dashboard.ts       #     ダッシュボード
│       ├── page-list.ts       #     ページ一覧
│       ├── page-edit.ts       #     ページ編集（editor.ts を内包）
│       ├── settings.ts        #     サイト設定
│       └── users.ts           #     ユーザー管理
│   # editInplace.ts は廃止（§11 参照）
├── js/                        # バンドル済み JavaScript（自動生成・手動編集禁止）
│   ├── admin.js               #   管理画面 SPA IIFE バンドル
│   └── public.js              #   公開ページ用 IIFE バンドル
├── assets/                    # 静的アセット（直接HTTPアクセス許可）
│   └── adlaire-style.min.css  #   Adlaire Style（管理 UI 用 CSS）
├── scripts/                   # ビルドスクリプト
│   └── build.ts               #   esbuild IIFE バンドル生成
├── data/                      # データストレージ
│   ├── lang/                  #   翻訳ファイル（JSON、公開許可）
│   ├── config.json            #   サイト設定
│   ├── pages/{slug}.json      #   ページデータ
│   ├── pages.index.json       #   ページインデックスキャッシュ
│   ├── revisions/{slug}/      #   リビジョン履歴（最大30世代）
│   ├── backups/               #   設定バックアップ（最大9世代）
│   ├── system/install.lock    #   インストール済みフラグ
│   └── system/license.json    #   ライセンスデータ（JSON）
├── themes/                    # テーマディレクトリ（公開ページ用）
│   ├── AP-Default/            #   theme.php + style.css
│   └── AP-Adlaire/            #   theme.php + style.css
│   # admin.css は廃止（§11 参照）。管理 UI は Adlaire Style を使用する
├── dist/                      # [生成] 静的サイト出力ディレクトリ
├── plugins/                   # [実行時生成] プラグインディレクトリ
├── .github/                   # CI/CD
│   └── workflows/             #   GitHub Actions ワークフロー
├── deno.json                  # Deno 設定・タスク定義
├── phpstan.neon               # PHPStan 静的解析設定
├── release-manifest.json      # 配布バンドル整合性検証用
├── VERSION                    # バージョン情報ファイル
├── CLAUDE.md                  # 開発規約
├── README.md                  # プロジェクト説明
├── rulebookdocs/              # ルールブックドキュメントフォルダ
│   ├── CHARTER.md             #   憲章（最上位原則）
│   ├── DIRECTION_RULEBOOK.md  #   製品方向性
│   ├── EDITOR_RULEBOOK.md     #   エディタ
│   ├── LIFECYCLE_SYSTEM_RULEBOOK.md  # ライフサイクルシステム
│   ├── ARCHITECTURE_RULEBOOK.md     # 本ファイル
│   ├── API_RULEBOOK.md        #   API・データ
│   ├── GENERATOR_RULEBOOK.md  #   静的サイト生成
│   │   # RELEASE_PLAN_RULEBOOK.md は統合リポジトリルートの rulebookdocs/ で管理
│   ├── LICENSE_SYSTEM_RULEBOOK.md   # ライセンスシステム
│   ├── LICENSE_SERVER_RULEBOOK.md   # ライセンスサーバー
│   └── REVISION_HISTORY.md   #   改訂履歴
├── docs/                      # ドキュメントフォルダ
│   └── CHANGES.md             #   変更履歴
└── Licenses/
    └── LICENSE_Ver.2.0        #   Adlaire License Ver.2.0
```

### 5.1 ZIP リリースへの反映

§7.3.3 の ZIP パッケージ構成に以下の変更を加える。

**追加（含める）:**
- `assets/` ディレクトリ（`adlaire-style.min.css`）

**削除（含めない）:**
- `ts/editInplace.ts`（廃止）
- `Core/admin-ui.php`（廃止）
- `themes/admin.css`（廃止）

---

# 6. セキュリティ基盤

> セキュリティ基盤は **Core の責務** である。
> 本セクションは設計方針・仕組みを定義する。
> 実装状態の一覧は `API_RULEBOOK.md` §7.2 を参照。

## 6.1 認証

### 6.1.1 ユーザーモデル
- 管理UIへのアクセスは**マスター管理者のみ**に許可する。
- **メインマスター管理者**（1名・固定）: セットアップ時に作成。自己削除不可。
- **サブマスター管理者**（最大2名）: メインマスターが認証情報を生成。無効化可能。
- 合計最大3名。ユーザーデータは `data/system/users.json` に保存する（権限 0600）。
- `config.json` にパスワードは保存しない。

### 6.1.2 認証方式
- **メインマスター**: ログインID + パスワード（ユーザー自身が設定）。
- **サブマスター**: ログインID + パスワード + トークン（3要素、全てメインマスターがランダム生成、合計73文字hex）。
- パスワードは **bcrypt** でハッシュ保存する（`password_hash()`）。
- サブマスターのトークンは bcrypt ハッシュで保存する。
- パスワード最低要件: 8文字以上、弱いパスワード（admin, password, 12345678 等）を拒否。

### 6.1.3 サブマスター生成・無効化
- メインマスターがサブマスターの認証情報（ID・パスワード・トークン）を一括生成する。
- 生成結果は **1回のみ表示** + **認証情報ファイルの1回のみダウンロード**（同時実行）。
- 画面遷移・リロード後は二度と閲覧・ダウンロード不可。
- メインマスターがサブマスターを無効化すると即座にログイン不可となる。
- 再有効化は不可。空席がある場合にメインマスターが新たに生成可能。

### 6.1.4 マイグレーション
- config.json の `password` キーから `users.json` への強制移行を行う。
- 移行後 config.json の `password` キーは削除する。
- MD5 レガシーパスワードの互換性は廃止済み（CHARTER.md §6 廃止ポリシー準拠）。

## 6.2 セッション

- セッション cookie: `httponly=1`, `use_strict_mode=1`, `cookie_samesite=Strict`。
- セッション有効期限: 30分間の無操作で自動ログアウト（`last_activity` タイムスタンプ）。
- ログイン成功時に `session_regenerate_id(true)` を実行する。

## 6.3 CSRF 保護

- **ワンタイムトークン方式**: `csrf_token()` で生成、`csrf_verify()` で検証後に再生成。
- API レスポンスに `X-CSRF-Token` ヘッダーでトークンを返却し、クライアント側で更新する。
- `handleEdit()` のレスポンスにも `X-CSRF-Token` ヘッダーを付与する。

## 6.4 レートリミット

- ログイン試行: 5回/5分（`login_rate_check()`）。

## 6.5 Content-Security-Policy

- 公開ページ（`index.php`）:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'
  ```

## 6.6 入力サニタイズ

- HTML 出力は `esc()`（`htmlspecialchars`）でエスケープする。
- スラッグは `FileStorage::validateSlug()` で検証する。
- ホスト名はホワイトリスト正規表現で検証する。
- `renderBlocksToHtml()` は全テキストフィールドに `esc()` を適用する。

---

# 7. CI/CD・リリース規約

> DIRECTION_RULEBOOK.md §8.4（テスト・CI 整備は優先課題）に準拠する。
> ただし CI/CD を **本番運用条件にしてはならない**（DIRECTION_RULEBOOK.md §7.4 準拠）。
> CI/CD は開発品質保証として導入する。

## 7.1 基本方針

- **リリース成果物は ZIP 形式**とする。
- **リリースは全自動**（main push → CI チェック → 自動タグ → ZIP 生成 → リリース作成）。
- 品質チェック不合格時はリリースを自動中止する。

## 7.2 CI パイプライン（品質チェック）

PR・push のたびに以下の品質チェックを自動実行する。

| チェック | ツール | 対象 |
|---------|--------|------|
| TypeScript 型チェック | `deno check` | `ts/` |
| PHP 静的解析 | PHPStan | `*.php`（`index.php`, `bundle-installer.php`, `Core/*.php`） |

### 7.2.1 不採用チェック（現段階）

以下は現段階では CI に含めない。将来必要に応じて追加を検討する。

| チェック | 理由 |
|---------|------|
| PHP ユニットテスト | テストコードが未作成。テスト基盤策定後に導入 |
| TS ユニットテスト | テストコードが未作成。テスト基盤策定後に導入 |
| E2E テスト | 環境構築が複雑。導入コストが現段階では過大 |

## 7.3 CD パイプライン（全自動リリース）

### 7.3.1 リリーストリガー

- `main` ブランチへの push で全自動リリースを実行する。
- `VERSION` ファイルの内容を読み取り、リリースバージョンを決定する。
- 品質チェック（§7.2）が全て合格した場合のみリリースを実行する。

### 7.3.2 リリースフロー

```
main push
  → CI 品質チェック（deno check + PHPStan）
  → 合格: TypeScript ビルド（deno task build）
  → ZIP パッケージング（§7.3.3 準拠）
  → Git タグ作成（v{VERSION}）
  → リリース作成 + ZIP 添付
  → 不合格: リリース中止
```

### 7.3.3 ZIP パッケージ構成

リリース ZIP には以下を含める。`release-manifest.json` の `required_files` と整合すること。

**含めるもの:**
- `index.php`, `bundle-installer.php`
- `Core/` ディレクトリ（全 PHP ファイル）
- `js/` ディレクトリ（ビルド済み JavaScript）
- `themes/` ディレクトリ
- `data/lang/` ディレクトリ
- `release-manifest.json`, `VERSION`, `.htaccess`
- `Licenses/`
- `README.md`

**含めないもの:**
- `ts/` ディレクトリ（TypeScript ソース）
- `scripts/` ディレクトリ（ビルドスクリプト）
- `deno.json`
- `rulebookdocs/`, `docs/`, `CLAUDE.md`
- `.git/`, `.github/`
- `dist/`, `data/`（`data/lang/` 以外）
- `node_modules/`

### 7.3.4 リリース命名

- ZIP ファイル名: `adlaire-{VERSION}.zip`（例: `adlaire-3.0-47.zip`）
- Git タグ: `v{VERSION}`（例: `v3.0-47`）
- リリースタイトル: `Adlaire Ver.{VERSION}`

## 7.4 配布チャンネル

- **唯一の配布チャンネルは公式サイトとする**。GitHub Releases 等での配布は行わない。
- 公式サイトは **Adlaire CMS 自身で構築・静的生成した静的サイト** とする（ドッグフーディング）。
- 公式サイトは **自前サーバー** で管理・ホスティングする。
- CI/CD パイプラインが生成した ZIP を、SFTP 等で公式サイトのダウンロードディレクトリに自動配置する。
- 公式サイトは製品紹介・ダウンロードページ・ドキュメントを提供する。
- 公式サイト自体が Adlaire の動作実績（共有サーバーでの静的配信）を体現する。

## 7.5 制約事項

- CI/CD は **GitHub Actions** で実装する。
- CI/CD 環境には **Deno** と **PHP 8.3+** を使用する。
- CI/CD の障害がエンドユーザーの本番運用に影響してはならない。
- リリース ZIP はビルド済みであり、エンドユーザーにビルド作業を要求しない。

---

# 8. 不採用項目

以下は採用しない。将来必要に応じて再検討。

| 項目 | 理由 |
|------|------|
| Router クラス | 現在の if/match 分岐で十分。複雑性を増やさない |
| StorageInterface | FileStorage 以外の実装予定がない。必要になった時に導入 |
| Config クラス | $config 配列で十分機能している |
| EventDispatcher | $hooks 配列で十分。プラグイン基盤の需要が出てから検討 |
| auth.php 分離 | App クラスの認証メソッドは密結合。分離は整合性を損なう |

---

## 4.6 将来方針 — Adlaire Framework 採用（時期未定）

> 本セクションは**将来の計画**を記録する。現行 Ver.3.x の実装要件ではない。

### 4.6.1 Adlaire Framework 採用方針

Adlaire Static CMS は将来的に **Adlaire Framework** を採用する方針とする。時期は未定。

採用により、以下の変化が生じる:

| 項目 | 現行 Ver.3.x | Adlaire Framework 採用後 |
|------|-------------|------------------------|
| バックエンド開発言語 | PHP（手動実装） | TypeScript（全ソース） |
| バックエンドデプロイ | PHP（直接） | TypeScript → PHP 自動変換（Framework 付随機能） |
| フロントエンド | TypeScript SPA（esbuild） | TypeScript（Adlaire Framework） |
| 共用ホスティング対応 | **維持** | **維持**（PHP 変換により互換性継続） |

### 4.6.2 TypeScript → PHP 変換

Adlaire Framework は **TypeScript → PHP 自動変換機能**を付随する（Adlaire Framework RULEBOOK に仕様を定義する）。  
これにより、全ソースコードを TypeScript で開発し、ビルド時に PHP に変換してデプロイすることが可能になる。

### 4.6.3 現行 Ver.3.x との整合

現行 Ver.3.x アーキテクチャ（§4.5）は Adlaire Framework 採用への**適切な中間状態**として設計する。

- PHP の責務を REST API・認証・静的生成・ファイルストレージに純化しておく（§4.5.8）ことで、将来の TypeScript 置換が容易になる。
- 管理 UI は TypeScript SPA として独立しているため、Framework 採用時の移行影響を最小化できる。
- データフォーマット（JSON フラットファイル）・API 設計は変更しない。

---

# 11. 廃止項目（Ver.3.x 以降）

以下は完全フロントエンド化（§4.5）に伴い廃止する。廃止ポリシー（`CHARTER.md` §6）に従い、レガシーソースコードの互換性維持は行わない。

| 廃止ファイル / 機能 | 廃止理由 | 代替 |
|---|---|---|
| `Core/admin-ui.php` | 管理 UI のレンダリング責務を TypeScript SPA に全移管 | `ts/pages/*.ts` |
| `ts/editInplace.ts` | SPA エントリポイントが `ts/app.ts` に統合 | `ts/app.ts` |
| `themes/admin.css` | Adlaire Style に移行 | `assets/adlaire-style.min.css` |
| `App::scriptTags()` メソッド | Shell HTML 内に直接 `<script>` タグを記述 | `App::adminShell()` |
| `ADMIN_SCRIPTS` / `PUBLIC_SCRIPTS` 定数 | 不要 | 削除 |
| PHP による管理 UI HTML 文字列生成 | 全機能を TypeScript に移管 | `ts/pages/*.ts` |

---

# 9. バージョン規則・廃止ポリシー

> `CHARTER.md` §5（バージョン規則）および §6（廃止ポリシー）を参照。
> 本 RULEBOOK ではこれらを重複定義しない。

---

# 10. 最終規則

## 10.1 上位規範性

本 RULEBOOK は、Adlaire のアーキテクチャに関する上位規範文書である。

## 10.2 優先適用

アーキテクチャに関して個別提案、実装都合と本 RULEBOOK が衝突する場合、本 RULEBOOK を優先しなければならない。

## 10.3 改訂条件

本 RULEBOOK を改訂する場合は、ファイル構成、セキュリティ、ビルドプロセスへの影響を明示しなければならない。


> 改訂履歴は `REVISION_HISTORY.md` を参照。
