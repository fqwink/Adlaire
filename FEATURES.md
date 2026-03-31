# Adlaire Platform - 実装機能等一覧

**バージョン**: Ver.1.2-13
**最終更新**: 2026-03-31

---

## 1. プロジェクト構成

```
Adlaire/
├── index.php                  # エントリーポイント（セッション初期化・ブートストラップ）
├── core.php                   # コア（FileStorage クラス・ヘルパー関数）
├── admin.php                  # 管理ツール（App クラス・handleEdit 関数）
├── .htaccess                  # Apache URL書き換え・アクセス制御
├── ts/                        # TypeScript ソース
│   ├── autosize.ts            #   textarea自動リサイズ
│   ├── i18n.ts                #   多言語化モジュール
│   └── editInplace.ts         #   インプレース編集・AJAX保存
├── js/
│   └── dist/                  # コンパイル済み JavaScript（自動生成）
│       ├── autosize.js
│       └── editInplace.js
├── lang/                      # 翻訳ファイル
│   ├── ja.php                 #   日本語
│   └── en.php                 #   英語
├── themes/                    # テーマディレクトリ
│   ├── AP-Default/
│   │   ├── theme.php          #   HTMLテンプレート
│   │   └── style.css          #   スタイルシート
│   └── AP-Adlaire/
│       ├── theme.php          #   HTMLテンプレート
│       └── style.css          #   スタイルシート
├── files/                     # [実行時生成] データストレージ
│   ├── config.json            #   サイト設定（JSON）
│   ├── .config.lock           #   設定書き込み排他ロック
│   ├── pages/                 #   ページデータ（JSON）
│   │   └── {slug}.json        #     { content, created_at, updated_at }
│   └── backups/               #   自動バックアップ（最大9世代）
│       └── config.{timestamp}.json
├── plugins/                   # [実行時生成] プラグインディレクトリ
├── Licenses/
│   ├── LICENSE_Ver.1.0        # Adlaire License
│   └── RELEASE-NOTES.md       # ライセンスリリースノート
├── package.json               # npm設定・ビルドスクリプト
├── package-lock.json          # npm依存ロック
├── tsconfig.json              # TypeScript設定
├── .gitignore                 # Git除外設定
├── CLAUDE.md                  # 開発規約
├── README.md                  # プロジェクト説明
├── CHANGES.md                 # 変更履歴
└── RELEASE-NOTES.md           # リリースノート
```

---

## 2. PHP クラス・関数一覧

### 2.1 FileStorage クラス (`core.php`)

フラットファイルデータ管理レイヤー。

| メソッド | 可視性 | 説明 |
|---------|--------|------|
| `__construct(string $basePath)` | public | ストレージパス初期化 |
| `ensureDirectories()` | public | 必要ディレクトリの作成保証 |
| `validateSlug(string $slug): bool` | public static | スラッグの安全性検証（パス走査防止） |
| `migrate()` | public | 旧フラットファイル形式からの自動マイグレーション |
| `readConfig(): array` | public | config.json から全設定値を読み込み |
| `writeConfig(array $config): bool` | public | 排他ロック付き設定書き込み（マージ・バックアップ・原子的書き込み） |
| `writeConfigValue(string $key, string $value): bool` | public | 単一設定値の書き込み |
| `readPage(string $slug): string\|false` | public | ページコンテンツの読み込み |
| `readPageData(string $slug): array\|false` | public | ページデータ全体（content + metadata）の読み込み |
| `writePage(string $slug, string $content): bool` | public | ページデータのJSON書き込み（メタデータ自動付与） |
| `deletePage(string $slug): bool` | public | ページの安全な削除（バックアップ付き） |
| `listPages(): array` | public | 全ページ一覧をメタデータ付きで取得 |
| `isConfigKey(string $key): bool` | public | フィールド名が設定キーかどうか判定 |
| `atomicWrite(string $path, string $content): bool` | private | 一時ファイル→rename による原子的書き込み |
| `lockedRead(string $path): string\|false` | private | 共有ロック付きファイル読み込み |
| `rotateBackups()` | private | 設定バックアップのローテーション（最大9世代） |

**定数**:
- `CONFIG_KEYS` - 設定ファイルで管理するキー一覧
- `MAX_BACKUPS = 9` - バックアップ最大保持世代数

---

### 2.2 App クラス (`admin.php`)

アプリケーションコア。シングルトンパターン。

| メソッド | 可視性 | 説明 |
|---------|--------|------|
| `getInstance(): self` | public static | シングルトンインスタンス取得 |
| `__construct()` | private | 初期化（ホスト解析→デフォルト→ディレクトリ→マイグレーション→設定→プラグイン） |
| `parseHost(): array` | private | リクエストURLからホスト・ページ名を解析 |
| `initDefaults()` | private | デフォルト設定値・ページ内容の初期化 |
| `loadConfig()` | private | FileStorageから設定を読み込み、認証・ページ処理を実行 |
| `handlePassword(string\|false $fval, string $val)` | private | パスワード初期化処理 |
| `handleAuth()` | private | セッション認証・ログイン/ログアウト処理 |
| `handlePage()` | private | リクエストページの読み込み・404処理 |
| `loadPlugins()` | private | plugins/ ディレクトリからプラグイン自動読み込み |
| `isLoggedIn(): bool` | public | ログイン状態の確認 |
| `getLoginStatus(): string` | public | ログイン/ログアウトリンクHTML生成 |
| `getSlug(string $page): string` | public static | ページ名→スラッグ変換（小文字化・スペース→ハイフン） |
| `login(): string` | public | ログイン認証・パスワード変更処理 |
| `savePassword(string $password): string` | public | bcryptハッシュ生成・保存 |
| `editTags()` | public | 管理者用CSRFトークン・フックスクリプト出力 |
| `content(string $id, string $content)` | public | コンテンツ出力（管理者にはインプレース編集UI） |
| `menu()` | public | ナビゲーションメニューHTML生成 |
| `settings()` | public | 管理者設定パネルHTML生成 |

**定数**:
- `VERSION_MAJOR = 1`
- `VERSION_MINOR = 1`
- `VERSION_BUILD = 10`
- `VERSION = 'Ver.1.1-10'`

**プロパティ**:
- `config` - 現在の設定値配列
- `defaults` - デフォルト値配列
- `hooks` - フック配列
- `host` - ホストURL (readonly)
- `requestPage` - リクエストページ名 (readonly)
- `credit` - クレジット表示HTML
- `storage` - FileStorageインスタンス (readonly)

---

### 2.3 グローバル関数 (`core.php`, `admin.php`)

| 関数 | 説明 |
|------|------|
| `esc(string $value): string` | HTMLエスケープ（ENT_QUOTES, UTF-8） |
| `csrf_token(): string` | CSRFトークン生成・セッション保存 |
| `csrf_verify(): void` | CSRFトークン検証（不一致で403終了） |
| `handleEdit(): void` | AJAX編集リクエストの処理（設定/ページ自動判別） |

---

## 3. TypeScript / JavaScript 一覧

### 3.1 autosize.ts → js/dist/autosize.js

| 関数 | 説明 |
|------|------|
| `autosize(textarea: HTMLTextAreaElement): void` | textareaの自動リサイズ。入力・ウィンドウリサイズに追従。box-sizing対応。`autosize:destroy` カスタムイベントでクリーンアップ。 |

### 3.2 editInplace.ts → js/dist/editInplace.js

| 関数 | 説明 |
|------|------|
| `nl2br(s: string): string` | 改行を `<br />` に変換 |
| `fieldSave(key: string, val: string): void` | fetch APIでAJAX保存リクエスト送信。CSRF対応。テーマ変更時はリロード。 |
| `richTextHook(span: HTMLElement): void` | リッチテキスト編集フック（プレースホルダー、プラグインで上書き可能） |
| `plainTextEdit(span: HTMLElement): void` | プレーンテキスト編集。textarea生成→autosize適用→blur時に保存。 |
| `initEditInplace(): void` | DOM初期化。`.editText` クリックで編集開始、`.toggle` クリックで `.hide` 要素の表示切替。 |

---

## 4. 機能一覧

### 4.1 コンテンツ管理

| 機能 | 説明 | 実装箇所 |
|------|------|---------|
| ページ表示 | URLスラッグに基づくページコンテンツの表示 | `App::handlePage()` |
| ページ作成 | 管理者がアクセスした未存在ページを自動作成 | `App::handlePage()`, `FileStorage::writePage()` |
| インプレース編集 | クリックでテキスト/リッチテキストを直接編集 | `editInplace.ts`, `App::content()` |
| AJAX保存 | 編集内容をfetch APIで非同期保存 | `fieldSave()`, `handleEdit()` |
| ページ一覧取得 | 全ページのメタデータ付き一覧 | `FileStorage::listPages()` |
| ページ削除 | バックアップ付き安全削除 | `FileStorage::deletePage()` |

### 4.2 サイト設定

| 機能 | 説明 | 設定キー |
|------|------|---------|
| サイトタイトル | サイト全体のタイトル | `title` |
| メタ説明 | SEO用 meta description | `description` |
| メタキーワード | SEO用 meta keywords | `keywords` |
| コピーライト | フッターの著作権表示 | `copyright` |
| ナビメニュー | ページナビゲーション（改行区切り） | `menu` |
| サイドバー | 全ページ共通サイドバーコンテンツ | `subside` |
| テーマ選択 | テーマの切り替え | `themeSelect` |

### 4.3 認証・セキュリティ

| 機能 | 説明 | 実装箇所 |
|------|------|---------|
| パスワード認証 | bcryptハッシュによるログイン認証 | `App::login()` |
| パスワード変更 | ログイン画面からのパスワード変更 | `App::login()` |
| MD5レガシー移行 | 旧MD5パスワードからの自動bcrypt移行 | `App::login()` |
| セッション管理 | httponly, strict_mode, regenerate_id | `session_start()`, `App::login()` |
| CSRF保護 | トークンベースのCSRF対策 | `csrf_token()`, `csrf_verify()` |
| パス走査防止 | スラッグ検証・テーマパス検証 | `FileStorage::validateSlug()`, ブートストラップ |
| 入力サニタイズ | htmlspecialchars によるXSS対策 | `esc()` |
| ファイルアクセス制御 | .htaccess による /files/ 直接アクセスブロック | `.htaccess` |

### 4.4 データ管理 (FileStorage)

| 機能 | 説明 |
|------|------|
| JSON統合設定 | 全設定を `config.json` に集約 |
| JSONページデータ | 各ページを `{slug}.json` に保存（content + created_at + updated_at） |
| 原子的書き込み | 一時ファイル→rename() でデータ破損防止 |
| 共有ロック読み込み | flock(LOCK_SH) で読み取り中の書き込みを防止 |
| 排他ロック設定更新 | .config.lock + flock(LOCK_EX) で同時書き込みの競合防止 |
| バックアップローテーション | タイムスタンプ付き最大9世代の自動バックアップ |
| ページ削除バックアップ | 削除前にバックアップを自動作成 |
| 自動マイグレーション | 旧フラットファイル形式からの自動移行 |

### 4.5 テーマシステム

| テーマ名 | 説明 |
|---------|------|
| AP-Default | デフォルトテーマ（エメラルドグリーン/ダーク系） |
| AP-Adlaire | 代替テーマ |

**テーマ構成**: `theme.php`（HTMLテンプレート）+ `style.css`（スタイルシート）
**テーマ安全性**: `basename()` + ファイル存在チェック + AP-Default フォールバック

### 4.6 プラグインシステム

| 機能 | 説明 |
|------|------|
| 自動読み込み | `plugins/*/index.php` を自動 require |
| フック機構 | `$app->hooks` 配列によるフックポイント提供 |

### 4.7 URL ルーティング

| 機能 | 説明 |
|------|------|
| クリーンURL | `.htaccess` RewriteRule によるクリーンURL |
| スラッグ変換 | ページ名を小文字化・スペース→ハイフン変換 |
| 404ハンドリング | 未存在ページで管理者には作成UI、訪問者には404表示 |

---

### 4.8 多言語化（i18n）

| 機能 | 説明 |
|------|------|
| 対応言語 | 日本語（ja）、英語（en） |
| 翻訳ファイル | `lang/ja.php`, `lang/en.php`（PHPアレイ形式） |
| 言語切替 | 管理パネルの設定→言語セレクターで切替 |
| 翻訳ヘルパー | `App::t(key, params)` - `:name` パラメータ置換対応 |
| 言語設定保存 | `config.json` の `language` キーに保存（FileStorage経由） |
| HTML lang属性 | テーマテンプレートで `<html lang="">` を動的出力 |
| デフォルト言語 | 日本語（ja） |

---

## 5. 開発環境・ビルド

| 項目 | 内容 |
|------|------|
| PHP | 8.3+ (strict_types) |
| TypeScript | 5.4+ |
| ターゲット | ES2020 |
| ビルド | `npm run build` (tsc) |
| TSソース | `ts/` |
| JS出力 | `js/dist/` |
| jQuery | **廃止済み**（Ver.1.1-10で完全削除） |

---

## 6. バージョン規則

`Ver.{Major}.{Minor}-{Build}`

- **Major**: 後方互換性のない変更。Minor を 0 にリセット。
- **Minor**: 後方互換性のある機能追加・改善。
- **Build**: 累積リビジョン番号。**リセット禁止**。すべてのリリースで単調増加。
