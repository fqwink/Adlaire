# Adlaire Platform - 実装機能等一覧

**バージョン**: Ver.1.3-14
**最終更新**: 2026-03-31

---

## 1. プロジェクト構成

```
Adlaire/
├── index.php                  # エントリーポイント（セッション初期化・require・ブートストラップ）
├── core.php                   # コア基盤（FileStorage クラス・ヘルパー関数）
├── admin.php                  # 管理ツール（App クラス・handleEdit・REST API）
├── .htaccess                  # Apache URL書き換え・アクセス制御
├── ts/                        # TypeScript ソース
│   ├── globals.d.ts           #   グローバル型定義
│   ├── autosize.ts            #   textarea自動リサイズ
│   ├── editInplace.ts         #   インプレース編集・AJAX保存
│   ├── i18n.ts                #   多言語化モジュール
│   ├── markdown.ts            #   Markdown→HTMLコンバーター
│   └── api.ts                 #   REST APIクライアント
├── js/
│   └── dist/                  # コンパイル済み JavaScript（自動生成）
│       ├── autosize.js
│       ├── editInplace.js
│       ├── i18n.js
│       ├── markdown.js
│       └── api.js
├── data/                      # 静的データ
│   └── lang/                  #   翻訳ファイル（JSON）
│       ├── ja.json            #     日本語
│       └── en.json            #     英語
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
│   │   └── {slug}.json        #     { content, format, created_at, updated_at }
│   ├── revisions/             #   ページリビジョン履歴
│   │   └── {slug}/            #     ページ別ディレクトリ
│   │       └── {timestamp}.json
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
├── RELEASE-NOTES.md           # リリースノート
└── FEATURES.md                # 本ファイル（実装機能等一覧）
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
| `readPageData(string $slug): array\|false` | public | ページデータ全体（content + format + metadata）の読み込み |
| `writePage(string $slug, string $content, string $format): bool` | public | ページデータのJSON書き込み（リビジョン自動保存・メタデータ付与） |
| `deletePage(string $slug): bool` | public | ページの安全な削除（バックアップ付き） |
| `listPages(): array` | public | 全ページ一覧をメタデータ付きで取得 |
| `isConfigKey(string $key): bool` | public | フィールド名が設定キーかどうか判定 |
| `listRevisions(string $slug): array` | public | ページのリビジョン一覧取得（新しい順） |
| `restoreRevision(string $slug, string $timestamp): bool` | public | 指定リビジョンにページを復元 |
| `atomicWrite(string $path, string $content): bool` | private | 一時ファイル→rename による原子的書き込み |
| `lockedRead(string $path): string\|false` | private | 共有ロック付きファイル読み込み |
| `rotateBackups()` | private | 設定バックアップのローテーション（最大9世代） |
| `saveRevision(string $slug, array $pageData)` | private | リビジョン保存（最大10世代ローテーション） |

**定数**:
- `CONFIG_KEYS` - 設定ファイルで管理するキー一覧（language 含む）
- `MAX_BACKUPS = 9` - 設定バックアップ最大保持世代数
- `MAX_REVISIONS = 10` - ページリビジョン最大保持世代数

---

### 2.2 App クラス (`admin.php`)

アプリケーションコア。シングルトンパターン。

| メソッド | 可視性 | 説明 |
|---------|--------|------|
| `getInstance(): self` | public static | シングルトンインスタンス取得 |
| `__construct()` | private | 初期化（ホスト解析→デフォルト→設定→言語→翻訳→認証→ページ→プラグイン） |
| `parseHost(): array` | private | リクエストURLからホスト・ページ名を解析 |
| `initDefaults()` | private | デフォルト設定値の初期化 |
| `initTranslatableDefaults()` | private | 翻訳対応デフォルト値の初期化（loadLanguage後） |
| `loadConfig()` | private | FileStorageから設定を読み込み |
| `loadLanguage()` | private | 言語設定に基づきJSONから翻訳データを読み込み |
| `handlePassword(string\|false $fval, string $val)` | private | パスワード初期化処理 |
| `handleAuth()` | private | セッション認証・ログイン/ログアウト処理 |
| `handlePage()` | private | リクエストページの読み込み・404処理 |
| `loadPlugins()` | private | plugins/ ディレクトリからプラグイン自動読み込み |
| `t(string $key, array $params): string` | public | 翻訳ヘルパー（`:name` パラメータ置換対応） |
| `isLoggedIn(): bool` | public | ログイン状態の確認 |
| `getLoginStatus(): string` | public | ログイン/ログアウトリンクHTML生成 |
| `getSlug(string $page): string` | public static | ページ名→スラッグ変換 |
| `login(): string` | public | ログイン認証・パスワード変更処理 |
| `savePassword(string $password): string` | public | bcryptハッシュ生成・保存 |
| `editTags()` | public | 管理者用CSRFトークン・フックスクリプト出力 |
| `content(string $id, string $content)` | public | コンテンツ出力（管理者にはインプレース編集UI） |
| `menu()` | public | ナビゲーションメニューHTML生成 |
| `settings()` | public | 管理者設定パネルHTML生成（テーマ・言語・メニュー・各種設定） |

**定数**: `VERSION = 'Ver.1.3-14'`, `VERSION_MAJOR = 1`, `VERSION_MINOR = 3`, `VERSION_BUILD = 14`

**プロパティ**:
- `config` - 現在の設定値配列
- `defaults` - デフォルト値配列
- `hooks` - フック配列
- `host` - ホストURL (readonly)
- `requestPage` - リクエストページ名 (readonly)
- `language` - 現在の言語コード (readonly)
- `credit` - クレジット表示HTML
- `storage` - FileStorageインスタンス (readonly)

---

### 2.3 グローバル関数

**core.php**:

| 関数 | 説明 |
|------|------|
| `esc(string $value): string` | HTMLエスケープ（ENT_QUOTES, UTF-8） |
| `csrf_token(): string` | CSRFトークン生成・セッション保存 |
| `csrf_verify(): void` | CSRFトークン検証（不一致で403終了） |

**admin.php**:

| 関数 | 説明 |
|------|------|
| `handleEdit(): void` | AJAX編集リクエストの処理（設定/ページ自動判別） |
| `handleApi(): void` | REST APIルーター（?api= パラメータ処理） |
| `handleApiPages(...)` | ページ API ハンドラー（GET/POST/DELETE） |
| `handleApiRevisions(...)` | リビジョン API ハンドラー（GET/POST） |
| `apiPageList(...)` | ページ一覧 API |
| `apiPageGet(...)` | ページ取得 API |
| `apiPageSave(...)` | ページ保存 API |
| `apiPageDelete(...)` | ページ削除 API |
| `apiRevisionList(...)` | リビジョン一覧 API |
| `apiRevisionRestore(...)` | リビジョン復元 API |
| `apiError(int $code, string $msg)` | APIエラーレスポンス |

---

## 3. TypeScript / JavaScript 一覧

### 3.1 globals.d.ts

グローバル型定義（csrfToken, autosize, markdownToHtml）。

### 3.2 autosize.ts → js/dist/autosize.js

| 関数 | 説明 |
|------|------|
| `autosize(textarea): void` | textareaの自動リサイズ。入力・ウィンドウリサイズに追従。box-sizing対応。 |

### 3.3 editInplace.ts → js/dist/editInplace.js

| 関数 | 説明 |
|------|------|
| `nl2br(s): string` | 改行を `<br />` に変換 |
| `fieldSave(key, val): void` | fetch APIでAJAX保存リクエスト送信 |
| `richTextHook(span): void` | リッチテキスト編集フック |
| `plainTextEdit(span): void` | プレーンテキスト編集（blur二重発火防止付き） |
| `initEditInplace(): void` | DOM初期化（`.editText` クリック編集、`.toggle` 表示切替） |

### 3.4 i18n.ts → js/dist/i18n.js

| メンバー | 説明 |
|---------|------|
| `i18n.init(lang): Promise<void>` | 翻訳JSONを非同期読み込み |
| `i18n.t(key, params?): string` | 翻訳キーを解決、`:name` パラメータ置換 |

### 3.5 markdown.ts → js/dist/markdown.js

| 関数 | 説明 |
|------|------|
| `markdownToHtml(md): string` | Markdown→HTML変換。見出し、太字、斜体、コード、リンク、リスト、引用、水平線、段落に対応。 |

### 3.6 api.ts → js/dist/api.js

| メソッド | 説明 |
|---------|------|
| `api.listPages(): Promise<Record<string, PageSummary>>` | ページ一覧取得 |
| `api.getPage(slug): Promise<PageData>` | ページ詳細取得 |
| `api.savePage(slug, content, format?): Promise<void>` | ページ作成・更新 |
| `api.deletePage(slug): Promise<void>` | ページ削除 |
| `api.listRevisions(slug): Promise<Revision[]>` | リビジョン一覧 |
| `api.restoreRevision(slug, timestamp): Promise<void>` | リビジョン復元 |

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
| Markdown対応 | ページコンテンツをMarkdown形式で記述可能 | `markdown.ts`, `FileStorage::writePage()` |

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
| 言語設定 | 日本語/英語の切り替え | `language` |

### 4.3 認証・セキュリティ

| 機能 | 説明 | 実装箇所 |
|------|------|---------|
| パスワード認証 | bcryptハッシュによるログイン認証 | `App::login()` |
| パスワード変更 | ログイン画面からのパスワード変更 | `App::login()` |
| MD5レガシー移行 | 旧MD5パスワードからの自動bcrypt移行 | `App::login()` |
| セッション管理 | httponly, strict_mode, regenerate_id | `session_start()`, `App::login()` |
| CSRF保護 | トークンベースのCSRF対策（json_encodeエスケープ） | `csrf_token()`, `csrf_verify()` |
| パス走査防止 | スラッグ検証・テーマパス検証 | `FileStorage::validateSlug()`, ブートストラップ |
| 入力サニタイズ | htmlspecialchars によるXSS対策 | `esc()` |
| ファイルアクセス制御 | .htaccess による /files/, /data/, core.php, admin.php のブロック | `.htaccess` |

### 4.4 データ管理 (FileStorage)

| 機能 | 説明 |
|------|------|
| JSON統合設定 | 全設定を `config.json` に集約 |
| JSONページデータ | `{slug}.json` に保存（content + format + created_at + updated_at） |
| 原子的書き込み | 一時ファイル→rename() でデータ破損防止 |
| 共有ロック読み込み | flock(LOCK_SH) で読み取り中の書き込みを防止 |
| 排他ロック設定更新 | .config.lock + flock(LOCK_EX) で同時書き込みの競合防止 |
| バックアップローテーション | タイムスタンプ付き最大9世代の自動バックアップ |
| ページ削除バックアップ | 削除前にバックアップを自動作成 |
| 自動マイグレーション | 旧フラットファイル形式からの自動移行 |

### 4.5 リビジョン管理

| 機能 | 説明 |
|------|------|
| 自動リビジョン保存 | ページ保存時に旧バージョンを `files/revisions/{slug}/` に自動保存 |
| リビジョンローテーション | 最大10世代を保持、超過分は自動削除 |
| リビジョン一覧 | `listRevisions(slug)` で新しい順に一覧取得 |
| リビジョン復元 | `restoreRevision(slug, timestamp)` で指定バージョンに復元 |

### 4.6 REST API

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| `GET` | `?api=pages` | ページ一覧（メタデータのみ） |
| `GET` | `?api=pages&slug=xxx` | ページ詳細取得 |
| `POST` | `?api=pages` | ページ作成・更新（slug, content, format, csrf） |
| `DELETE` | `?api=pages&slug=xxx` | ページ削除（csrf） |
| `GET` | `?api=revisions&slug=xxx` | リビジョン一覧 |
| `POST` | `?api=revisions&slug=xxx` | リビジョン復元（timestamp, csrf） |

認証: セッション認証 + CSRF トークン必須

### 4.7 テーマシステム

| テーマ名 | 説明 |
|---------|------|
| AP-Default | デフォルトテーマ（エメラルドグリーン/ダーク系） |
| AP-Adlaire | 代替テーマ |

**テーマ構成**: `theme.php`（HTMLテンプレート）+ `style.css`（スタイルシート）
**テーマ安全性**: `basename()` + ファイル存在チェック + AP-Default フォールバック

### 4.8 プラグインシステム

| 機能 | 説明 |
|------|------|
| 自動読み込み | `plugins/*/index.php` を自動 require |
| フック機構 | `$app->hooks` 配列によるフックポイント提供 |

### 4.9 URL ルーティング

| 機能 | 説明 |
|------|------|
| クリーンURL | `.htaccess` RewriteRule によるクリーンURL |
| スラッグ変換 | ページ名を小文字化・スペース→ハイフン変換 |
| 404ハンドリング | 未存在ページで管理者には作成UI、訪問者には404表示 |

### 4.10 多言語化（i18n）

| 機能 | 説明 |
|------|------|
| 対応言語 | 日本語（ja）、英語（en） |
| 翻訳ファイル | `data/lang/ja.json`, `data/lang/en.json`（JSON形式） |
| 言語切替 | 管理パネルの設定→言語セレクターで切替 |
| PHP翻訳ヘルパー | `App::t(key, params)` - `:name` パラメータ置換対応 |
| TS翻訳モジュール | `i18n.ts` - `i18n.init(lang)` / `i18n.t(key, params)` |
| 言語設定保存 | `config.json` の `language` キーに保存 |
| HTML lang属性 | テーマテンプレートで `<html lang="">` を動的出力 |
| デフォルト言語 | 日本語（ja） |

---

## 5. 開発環境・ビルド

| 項目 | 内容 |
|------|------|
| PHP | 8.3+ (strict_types) |
| TypeScript | 5.4+ |
| ターゲット | ES2021 |
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
