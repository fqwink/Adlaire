# Adlaire API RULEBOOK

- 文書名: Adlaire API RULEBOOK
- 文書バージョン: Ver.1.0
- 作成日: 2026-04-02
- 対象製品: Adlaire Platform
- 文書種別: データ仕様・PHP API・REST API・TypeScript モジュール・管理 UI を定義する技術規範文書
- 文書目的: Adlaire の全 API インターフェース、データスキーマ、TypeScript モジュール仕様、管理 UI 仕様を恒常的規範として定義する
- 移行元: 旧 RULEBOOK_Ver1.md §3-7, 旧 RULEBOOK_Ver2.md §2.2-2.4（CHARTER.md に統合後、削除済み）

---

# 1. 基本宣言

## 1.1 位置づけ

本 RULEBOOK は、Adlaire Platform の API・データ・フロントエンドインターフェースに関する恒常的規範文書である。
特定バージョンに従属せず、すべての開発判断に適用される。

## 1.2 認証方式

- API はセッション認証 + CSRF ワンタイムトークンを基盤とする。
- 公開 API（search, sitemap, version）は認証不要。
- その他の API は管理者セッション必須。

---

# 2. データ仕様

## 2.1 サイト設定 (`data/config.json`)

| キー | 型 | 説明 |
|-----|-----|------|
| `password` | string | bcrypt ハッシュ化された管理者パスワード |
| `themeSelect` | string | 現在のテーマ名 |
| `language` | string | 言語コード（`ja` / `en`） |
| `menu` | string | メニュー項目（`<br />\n` 区切り） |
| `title` | string | サイトタイトル |
| `subside` | string | サイドバーコンテンツ |
| `description` | string | サイト説明 |
| `keywords` | string | キーワード |
| `copyright` | string | 著作権表示 |

## 2.2 ページデータ (`data/pages/{slug}.json`)

```json
{
    "content": "テキスト（Markdown時）またはブロックJSON文字列",
    "format": "blocks | markdown",
    "status": "published | draft",
    "blocks": [
        { "type": "paragraph", "data": { "text": "..." } },
        { "type": "heading", "data": { "text": "...", "level": 2 } }
    ],
    "created_at": "ISO 8601",
    "updated_at": "ISO 8601"
}
```

- **format**: `blocks`（ブロックエディタ JSON、デフォルト）/ `markdown`（Markdown テキスト）
- **status**: `published`（公開）/ `draft`（下書き、管理者のみ閲覧可）
- **blocks**: format が `blocks` の場合のみ。ブロック配列。

## 2.3 リビジョン (`data/revisions/{slug}/{timestamp}_{random}.json`)

ページデータと同一構造。保存時の旧バージョンを自動保存。最大30世代。

## 2.4 ページインデックスキャッシュ (`data/pages.index.json`)

- ページメタデータ（slug, format, status, updated_at）をキャッシュする。
- `listPages()` はキャッシュが有効な場合、個別ページ JSON を読み込まずキャッシュを返す。
- `writePage()`, `deletePage()`, `updatePageStatus()` 実行時にキャッシュを再構築する。

## 2.5 install.lock (`data/system/install.lock`)

```json
{
    "installed": true,
    "product": "Adlaire",
    "version": "Ver.2.3-35",
    "installed_at": "ISO 8601",
    "installer": "bundle-installer.php",
    "installer_version": "1.0.0"
}
```

## 2.6 release-manifest.json

```json
{
    "product": "Adlaire",
    "channel": "release",
    "version": "Ver.2.3-35",
    "bundle_format": 1,
    "required_files": [
        "index.php", "helpers.php", "core.php", "app.php",
        "renderer.php", "api.php", "generator.php", "admin-ui.php",
        ".htaccess", "themes", "data/lang", "js"
    ]
}
```

---

# 3. PHP API 仕様

## 3.1 FileStorage (`Core/core.php`)

| メソッド | 説明 |
|---------|------|
| `__construct(basePath)` | ストレージパス初期化 |
| `ensureDirectories()` | ディレクトリ作成保証 |
| `validateSlug(slug): bool` | スラッグ安全性検証（static） |
| `migrate()` | 旧形式マイグレーション（blocks 形式に変換） |
| `readConfig(): array` | 設定読み込み |
| `writeConfig(config): bool` | 排他ロック付き設定書き込み |
| `writeConfigValue(key, value): bool` | 単一設定値書き込み |
| `readPageData(slug): array\|false` | ページデータ全体読み込み |
| `writePage(slug, content, format, blocks?, status?): bool` | ページ書き込み（リビジョン自動保存） |
| `deletePage(slug): bool` | ページ削除（バックアップ + リビジョン削除） |
| `listPages(): array` | 全ページ一覧（キャッシュ対応） |
| `listPublishedPages(): array` | 公開ページのみ一覧 |
| `updatePageStatus(slug, status): bool` | ステータス変更 |
| `isConfigKey(key): bool` | 設定キー判定 |
| `listRevisions(slug): array` | リビジョン一覧（新しい順） |
| `restoreRevision(slug, timestamp): bool` | リビジョン復元 |
| `invalidatePageCache(): void` | ページインデックスキャッシュ無効化 |

**定数**: `MAX_BACKUPS = 9`, `MAX_REVISIONS = 30`

## 3.2 ヘルパー関数 (`Core/helpers.php`)

| 関数 | 説明 |
|------|------|
| `esc(value): string` | HTML エスケープ |
| `csrf_token(): string` | CSRF トークン生成（ワンタイム） |
| `csrf_verify(): void` | CSRF トークン検証（使用後再生成） |
| `login_rate_check(): bool` | ログイン試行回数制限（5回/5分） |

## 3.3 App (`Core/app.php`)

| メソッド | 説明 |
|---------|------|
| `getInstance(): self` | シングルトン取得 |
| `t(key, params): string` | 翻訳ヘルパー（`:name` パラメータ置換） |
| `isLoggedIn(): bool` | ログイン状態 |
| `getLoginStatus(): string` | ログイン/ログアウトリンク生成 |
| `getSlug(page): string` | スラッグ変換（小文字化・スペース→ハイフン、static） |
| `login(): string` | 認証処理（レートリミット付き） |
| `savePassword(password): string` | パスワード bcrypt 保存 |
| `editTags(): void` | 管理者用スクリプト変数出力（CSRF, 言語, format） |
| `scriptTags(adminMode): void` | JS script タグ出力（admin=全JS, public=レンダリングのみ） |
| `content(id, content): void` | コンテンツ出力（ブロック / Markdown / フィールド） |
| `menu(): void` | ナビメニュー生成 |

## 3.4 描画関数 (`Core/renderer.php`)

| 関数 | 説明 |
|------|------|
| `renderBlocksToHtml(blocks): string` | ブロック配列→HTML（サーバーサイド、XSS エスケープ付き） |
| `renderMarkdownToHtml(md): string` | Markdown→HTML（サーバーサイド） |

## 3.5 API 関数 (`Core/api.php`)

| 関数 | 説明 |
|------|------|
| `handleEdit(): void` | インプレース AJAX 編集ハンドラー |
| `handleApi(): void` | REST API ルーター |
| `handleApiPages(...)` | ページ CRUD |
| `handleApiRevisions(...)` | リビジョン一覧・復元 |
| `handleApiSearch(...)` | 全文検索（公開・認証不要） |
| `handleApiSitemap(...)` | サイトマップ XML（公開・認証不要） |
| `handleApiExport(...)` | エクスポート（パスワード除外） |
| `handleApiImport(...)` | インポート（パスワード保護） |
| `handleApiVersion()` | バージョン情報（公開・認証不要） |
| `apiError(code, message)` | API エラーレスポンス |

## 3.6 生成関数 (`Core/generator.php`)

> 詳細仕様は `GENERATOR_RULEBOOK.md` を参照。

| 関数 | 説明 |
|------|------|
| `handleApiGenerate(storage): void` | 静的サイト生成 API ハンドラー |
| `generatePageHtml(app, slug, contentHtml, theme): string` | テーマ適用済み HTML 生成 |

---

# 4. REST API 仕様

認証: セッション + CSRF ワンタイムトークン必須（※ 公開 API を除く）

## 4.1 ページ API

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=pages` | `{ pages: { slug: { format, status, created_at, updated_at } } }` |
| `GET` | `?api=pages&slug=xxx` | `{ page, data: { content, format, status, blocks?, ... } }` |
| `POST` | `?api=pages` | `{ status: "ok", slug }` |
| `DELETE` | `?api=pages&slug=xxx` | `{ status: "ok", deleted }` |

POST パラメータ: `slug`, `content`, `format` (blocks/markdown), `blocks` (JSON), `status` (draft/published), `csrf`

## 4.2 リビジョン API

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=revisions&slug=xxx` | `{ slug, revisions: [{ timestamp }] }` |
| `POST` | `?api=revisions&slug=xxx` | `{ status: "ok", restored, timestamp }` |

## 4.3 検索 API（公開・認証不要）

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=search&q=xxx` | `{ query, results: [{ slug, snippet, format, status, updated_at }] }` |

公開ページのみ検索。スニペットは HTML タグ除去済み。

## 4.4 サイトマップ API（公開・認証不要）

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=sitemap` | sitemap.xml（公開ページのみ、Content-Type: application/xml） |

## 4.5 バージョン API（公開・認証不要）

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=version` | `{ product, version, app_version, installed, installed_at }` |

## 4.6 静的サイト生成 API

> 詳細仕様は `GENERATOR_RULEBOOK.md` を参照。

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `POST` | `?api=generate` | `{ status: "ok", pages: 数, output: "dist/" }` |

- 認証必須。

## 4.7 エクスポート・インポート API

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=export` | JSON ファイルダウンロード（config（パスワード除外） + 全ページ） |
| `POST` | `?api=import` | `{ status: "ok", imported: { config, pages } }` |

---

# 5. TypeScript モジュール仕様

## 5.1 モジュール一覧

| モジュール | 説明 |
|-----------|------|
| `globals.d.ts` | グローバル型定義（csrfToken, autosize, markdownToHtml, HTMLElement.__editor） |
| `autosize.ts` | textarea 自動リサイズ（input/resize 追従、autosize:destroy でクリーンアップ） |
| `editor.ts` | ブロックエディタ本体（Editor クラス + ブロックツール + インラインツールバー） |
| `editInplace.ts` | インプレース編集統合（ブロックエディタ起動、format 切替、保存インジケーター） |
| `i18n.ts` | 多言語化（data/lang/*.json 非同期読み込み、i18n.ready Promise） |
| `markdown.ts` | Markdown→HTML 変換（17構文、コードブロックプレースホルダー方式） |
| `api.ts` | REST API クライアント（型付きメソッド、res.ok チェック優先） |

## 5.2 markdown.ts — 対応構文

| 構文 | 記法 |
|------|-----|
| 見出し | `# / ## / ###` |
| 太字 / 斜体 / 太字斜体 | `**` / `*` / `***` |
| インラインコード | `` ` `` |
| コードブロック（言語指定） | ` ```lang ``` ` |
| リンク / 画像 | `[text](url)` / `![alt](url)` |
| 非順序 / 順序リスト | `- item` / `1. item` |
| タスクリスト | `- [x]` / `- [ ]` |
| テーブル | `\| h \| h \|` + `\|---\|` |
| 引用（連続行結合） | `> text` |
| 水平線 | `---` |
| 脚注 | `[^id]` + `[^id]: text` |

## 5.3 editor.ts — ブロックエディタ仕様

### 5.3.1 コンセプト

- **ブロックベース**: コンテンツを独立したブロック単位で管理
- **JSON 出力**: ブロックデータを構造化 JSON として保存
- **プラグイン型**: BlockToolFactory インターフェースでブロック追加可能
- **外部依存なし**: 純粋 TypeScript のみ

### 5.3.2 ブロック型

| type | 説明 | data |
|------|------|------|
| `paragraph` | テキスト段落 | `{ text: string }` |
| `heading` | 見出し（h1-h3） | `{ text: string, level: 1\|2\|3 }` |
| `list` | リスト | `{ style: "unordered"\|"ordered", items: string[] }` |
| `code` | コードブロック | `{ code: string }` |
| `quote` | 引用 | `{ text: string }` |
| `delimiter` | 水平線 | `{}` |
| `image` | 画像（URL入力 + キャプション） | `{ url: string, caption?: string }` |

### 5.3.3 エディタ API

| メソッド | 説明 |
|---------|------|
| `Editor.create(el, config)` | エディタ初期化 |
| `Editor.save(): EditorData` | ブロックデータ取得 |
| `Editor.render(data)` | データからエディタ復元 |
| `Editor.destroy()` | エディタ破棄 |
| `Editor.insertBlock(type, data, index)` | ブロック挿入 |
| `Editor.removeBlock(index)` | ブロック削除 |
| `Editor.moveBlock(from, to)` | ブロック移動 |
| `Editor.focusBlock(index)` | ブロックにフォーカス |
| `renderBlocks(blocks): string` | ブロック→HTML 変換（閲覧用、XSS エスケープ付き） |

### 5.3.4 エディタ UI

- `+` ボタン: ツールボックス表示（i18n 対応ラベル）
- `▲▼` ボタン: ブロック上下移動
- `×` ボタン: ブロック削除
- **インラインツールバー**: テキスト選択時に太字(B) / 斜体(I) / リンク(🔗)
- **Enter**: 新規段落ブロック追加（リスト内では新 li）
- **Backspace**: 空ブロック削除、前ブロックにフォーカス
- **保存インジケーター**: ✓ 保存成功 / ✗ エラー（2秒後フェード）
- **レスポンシブ**: モバイルでツールバー横並び、インラインツールバー画面下部固定

---

# 6. 管理 UI 仕様

管理ツールは公開ページから完全に分離した専用 UI で提供する。

## 6.1 ルーティング

| URL | 画面 | 認証 |
|-----|------|:----:|
| `?admin` | ダッシュボード（ページ一覧 + サイト設定） | 必須 |
| `?admin=edit&page={slug}` | ページ編集（ブロックエディタ） | 必須 |
| `?admin=new` | 新規ページ作成 | 必須 |
| `?login` | ログイン画面 | 不要 |
| `?logout` | ログアウト処理 | 必須 |
| 通常 URL | 訪問者向け公開ページ（管理 UI なし） | 不要 |

## 6.2 ダッシュボード (`?admin`)

- **バージョン情報表示**: ヘッダーに `App::VERSION` を表示
- ページ一覧テーブル: slug, format, status, updated_at, 操作（編集 / 削除）
- 新規ページ作成ボタン
- サイト設定パネル: タイトル, 説明, キーワード, コピーライト, メニュー, テーマ, 言語
- エクスポート / インポートボタン
- 静的サイト生成ボタン（`dist/` に HTML 出力）

## 6.3 ページ編集 (`?admin=edit&page={slug}`)

- ブロックエディタ全画面表示
- format 切替バー（Blocks / Markdown）
- ステータス切替（公開 / 下書き）
- 保存ボタン + 自動保存インジケーター
- リビジョン一覧サイドバー（復元ボタン付き）
- ダッシュボードへの戻りリンク

## 6.4 新規ページ作成 (`?admin=new`)

- スラッグ入力フィールド
- format 選択（Blocks / Markdown）
- 作成ボタン → 編集画面へ遷移

## 6.5 ファイル構成

| ファイル | 役割 | 直接HTTPアクセス |
|---------|------|:---:|
| `admin-ui.php` | 管理 UI テンプレート | **禁止** |
| `themes/admin.css` | 管理 UI スタイルシート（ダークモード・レスポンシブ対応） | 許可 |

- 管理 UI は `admin-ui.php` で描画する。テーマの `theme.php` には管理コードを含めない。
- 公開ページ（`theme.php`）からは設定パネル・エディタ・format バーを完全に除去する。
- JS / CSS は管理 UI 専用に読み込む（公開ページには不要な管理用 JS を配信しない）。

---

# 7. 機能仕様（Core 機能）

> Core 機能は Adlaire Platform の基本構成要素であり、常に利用可能でなければならない。

## 7.1 コンテンツ管理

| 機能 | 状態 |
|------|:----:|
| ブロックエディタによるページ編集（デフォルト） | 実装済 |
| Markdown ページ対応 | 実装済 |
| format 切替（Blocks ↔ Markdown） | 実装済 |
| ページ表示・作成・削除 | 実装済 |
| 下書き / 公開ワークフロー | 実装済 |
| リビジョン管理（最大30世代、復元） | 実装済 |
| REST API（ページ CRUD / リビジョン） | 実装済 |
| サイト内検索 | 実装済 |
| サイトマップ自動生成 | 実装済 |
| エクスポート / インポート | 実装済 |
| 管理ツール専用 UI | 実装済 |
| 静的サイト生成（差分ビルド対応） | 実装済 |
| ページインデックスキャッシュ | 実装済 |

## 7.2 認証・セキュリティ

| 機能 | 状態 |
|------|:----:|
| bcrypt 認証（MD5 レガシー自動移行） | 実装済 |
| セッション管理（httponly, strict_mode, regenerate_id） | 実装済 |
| CSRF 保護（ワンタイムトークン + X-CSRF-Token ヘッダー） | 実装済 |
| ログイン試行回数制限（5回/5分） | 実装済 |
| セッション有効期限（30分自動ログアウト） | 実装済 |
| パスワード強度検証（8文字以上 + 弱パスワード拒否） | 実装済 |
| Content-Security-Policy ヘッダー | 実装済 |
| ホスト名ホワイトリスト検証 | 実装済 |
| XSS 対策（esc + json_encode エスケープ） | 実装済 |
| CORS 制限 | 実装済 |
| .htaccess アクセス制御 | 実装済 |

## 7.3 多言語化（i18n）

| 機能 | 状態 |
|------|:----:|
| 日本語 (ja) / 英語 (en) | 実装済 |
| PHP 翻訳: `App::t(key, params)` | 実装済 |
| TypeScript 翻訳: `i18n.init()` / `i18n.t()` | 実装済 |
| エディタ UI ラベル i18n | 実装済 |
| 管理パネル言語切替 | 実装済 |

## 7.4 テーマ・プラグイン

| 機能 | 状態 |
|------|:----:|
| テーマ切替（AP-Default / AP-Adlaire） | 実装済 |
| テーマ安全性（basename + 存在チェック + フォールバック） | 実装済 |
| JS 一括読み込み（`$app->scriptTags()`） | 実装済 |
| プラグイン自動読み込み（`plugins/*/index.php`） | 実装済 |

## 7.5 URL ルーティング

| 機能 | 状態 |
|------|:----:|
| クリーン URL（.htaccess RewriteRule） | 実装済 |
| スラッグ変換（小文字化・スペース→ハイフン） | 実装済 |
| 404 ハンドリング（管理者は作成 UI、訪問者は 404） | 実装済 |

---

# 8. 最終規則

## 8.1 上位規範性

本 RULEBOOK は、Adlaire の API・データ・フロントエンドインターフェースに関する上位規範文書である。

## 8.2 優先適用

API 仕様、データスキーマ、モジュール仕様に関して個別提案と本 RULEBOOK が衝突する場合、本 RULEBOOK を優先しなければならない。

## 8.3 改訂条件

本 RULEBOOK を改訂する場合は、API 互換性、データマイグレーション、クライアント影響を明示しなければならない。
