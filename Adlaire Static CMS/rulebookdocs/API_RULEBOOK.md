# Adlaire API RULEBOOK

- 文書名: Adlaire API RULEBOOK
- 文書バージョン: Ver.1.6
- 作成日: 2026-04-02
- 最終改訂: 2026-04-13
- 対象製品: Adlaire Static CMS
- 文書種別: データ仕様・PHP API・REST API・TypeScript モジュール・管理 UI を定義する技術規範文書
- 文書目的: Adlaire の全 API インターフェース、データスキーマ、TypeScript モジュール仕様、管理 UI 仕様を恒常的規範として定義する
- 移行元: 旧 RULEBOOK_Ver1/Ver2 から移行（統合・削除済み）

---

# 1. 基本宣言

## 1.1 位置づけ

本 RULEBOOK は、Adlaire Static CMS の API・データ・フロントエンドインターフェースに関する恒常的規範文書である。
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
| `themeSelect` | string | 現在のテーマ名 |
| `language` | string | 言語コード（`ja` / `en`） |
| `menu` | string | メニュー項目（`<br />\n` 区切り） |
| `title` | string | サイトタイトル |
| `subside` | string | サイドバーコンテンツ |
| `description` | string | サイト説明 |
| `keywords` | string | キーワード |
| `copyright` | string | 著作権表示 |
| `blog_posts_per_page` | int | ブログ一覧の1ページあたり表示件数（デフォルト: 10） |
| `media_max_size` | int | メディアアップロードの最大ファイルサイズ（バイト、デフォルト: 10485760 = 10MB）（Ver.3.5 以降） |
| `theme_settings` | object | テーマ固有の設定値（キー: テーマ名、値: 設定オブジェクト）（Ver.3.7 以降） |

## 2.2 ページデータ (`data/pages/{slug}.json`)

> **Ver.3.1 以降**: コンテンツ形式を Portable Text（`body` フィールド）に統一。詳細スキーマは §2.9 を参照。
> **Ver.3.5**: 旧 `content` / `format` / `blocks` フィールドを廃止（廃止ポリシー適用）。

```json
{
    "body": [
        {
            "_type": "block",
            "_key": "a3f8b2c1",
            "style": "normal",
            "markDefs": [],
            "children": [
                { "_type": "span", "_key": "b4e9c2d7", "text": "段落テキスト", "marks": [] }
            ]
        }
    ],
    "status": "published | draft",
    "type": "page | post",
    "posted_at": "ISO 8601",
    "category": "カテゴリ名",
    "tags": ["tag1", "tag2"],
    "author": "著者表示名",
    "created_at": "ISO 8601",
    "updated_at": "ISO 8601"
}
```

- **body**: Portable Text 配列（§2.9 スキーマ準拠）。
- **status**: `published`（公開）/ `draft`（下書き、管理者のみ閲覧可）
- **type**: `page`（通常ページ、デフォルト）/ `post`（ブログ投稿）。省略時は `"page"` として扱う（後方互換）。
- **posted_at**: `type: post` のみ有効。投稿の公開日時（管理者が任意に設定可能、`created_at` とは独立）。省略時は `created_at` を代替使用。
- **category**: `type: post` のみ有効。カテゴリ名（単一カテゴリ、空文字許可）。
- **tags**: `type: post` のみ有効。タグ名の配列（空配列許可）。
- **author**: `type: post` のみ有効。著者の表示名（空文字許可）。

## 2.3 リビジョン (`data/revisions/{slug}/{timestamp}_{random}.json`)

ページデータと同一構造。保存時の旧バージョンを自動保存。最大30世代。

## 2.4 ページインデックスキャッシュ (`data/pages.index.json`)

- ページメタデータ（slug, format, status, type, posted_at, updated_at）をキャッシュする。
- `listPages()` はキャッシュが有効な場合、個別ページ JSON を読み込まずキャッシュを返す。
- `writePage()`, `deletePage()`, `updatePageStatus()` 実行時にキャッシュを再構築する。
- `type` フィールドを含めることで、ブログ投稿一覧取得時に全ページ JSON を読み込まずにフィルタリングできる。

## 2.5 install.lock (`data/system/install.lock`)

```json
{
    "installed": true,
    "product": "Adlaire",
    "version": "Ver.2.5-38",
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
    "version": "Ver.2.5-38",
    "bundle_format": 1,
    "required_files": [
        "index.php",
        "Core/helpers.php", "Core/core.php", "Core/app.php",
        "Core/renderer.php", "Core/api.php", "Core/generator.php", "Core/admin-ui.php",
        ".htaccess", "themes", "data/lang", "js"
    ]
}
```

---

## 2.7 ユーザーデータ (`data/system/users.json`)

```json
{
    "users": {
        "main_admin": {
            "password": "bcrypt hash",
            "role": "master",
            "is_main": true,
            "created_at": "ISO 8601",
            "last_login": "ISO 8601"
        },
        "sub_user_1": {
            "password": "bcrypt hash",
            "role": "master",
            "is_main": false,
            "token": "bcrypt hash of token",
            "enabled": true,
            "created_by": "main_admin",
            "created_at": "ISO 8601",
            "last_login": "ISO 8601"
        }
    },
    "max_users": 3
}
```

- **ユーザー種別**: メインマスター管理者（1名・固定）+ サブマスター管理者（最大2名）。
- **ロール**: `master` のみ。全管理操作の権限を持つ。ただしユーザー管理操作はメインマスターのみ。
- **最大ユーザー数**: 3名まで。
- **メインマスター認証**: ログインID + パスワード（ユーザー自身が設定）。
- **サブマスター認証**: ログインID + パスワード + トークン（3要素、全てメインマスターがランダム生成。合計73文字hex）。
- **パスワード**: PHP `password_hash(PASSWORD_DEFAULT)` で bcrypt ハッシュ化。
- **トークン**: bcrypt ハッシュで保存。平文は生成時に1回のみ表示+ダウンロード。
- **サブマスター生成**: メインマスターが認証情報を一括生成。生成結果は1回のみ表示+認証情報ファイルの1回のみダウンロード（同時実行）。画面遷移後は二度と閲覧・ダウンロード不可。
- **サブマスター無効化**: メインマスターが `enabled: false` に設定。即座にログイン不可。再有効化は不可（空席として再生成）。
- **メインマスター自己削除**: 不可。最低1名のマスターを維持する。
- **マイグレーション**: config.json の `password` キーから users.json への強制移行を行う。移行後 config.json の `password` キーは削除する。
- **単一管理者モード**: 廃止。users.json が存在しない場合は強制マイグレーションを実行する。
- **ファイルロック**: config.json と同様に排他ロック + アトミック書き込みを使用する。
- **ファイル権限**: 0600（owner のみ読み書き可）。

## 2.8 メディアデータ (`data/media/`)

メディアファイル（画像等）はサーバーファイルシステムに保存する（Ver.3.5 以降）。

### 保存先

| パス | 説明 |
|------|------|
| `data/media/{filename}` | アップロードされたメディアファイル本体 |

### 許可拡張子

`jpg`, `jpeg`, `png`, `gif`, `webp`, `svg`

### ファイル名サニタイズ規則

- 拡張子を小文字に正規化する。
- アルファベット・数字・ハイフン・アンダースコア・ドット以外の文字を除去する。
- ファイル名の重複時は `{name}-{timestamp}.{ext}` 形式にリネームする。
- パストラバーサルを防ぐため、ディレクトリセパレータ（`/`, `\`）を除去する。

### 最大ファイルサイズ

`config.json` の `media_max_size`（デフォルト: 10,485,760 バイト = 10MB）。

---

## 2.9 Portable Text スキーマ仕様（Ver.3.1 以降）

Adlaire は [Sanity Portable Text](https://github.com/portabletext/portabletext) 仕様に準拠した構造化 JSON 形式を採用する。

> **廃止スケジュール**: 旧ブロック JSON（`format: "blocks"`）および Markdown（`format: "markdown"`）形式は **Ver.3.5 で廃止**。Ver.3.1 起動時に旧形式データを Portable Text へ自動マイグレーション（一度のみ実施）。以降、旧形式は認識しない。

### コンテンツ配列型

`body` フィールドは以下の型の配列:

`Array<PTBlock | PTImage | PTCode | PTDelimiter | PTTable | PTAccordion>`

### PTBlock（テキストブロック）

```json
{
  "_type": "block",
  "_key": "a3f8b2c1",
  "style": "normal",
  "markDefs": [],
  "children": [
    { "_type": "span", "_key": "b4e9c2d7", "text": "通常テキスト", "marks": [] },
    { "_type": "span", "_key": "c5fa3e12", "text": "太字テキスト", "marks": ["strong"] }
  ]
}
```

| フィールド | 型 | 説明 |
|----------|-----|------|
| `_type` | `"block"` | 固定値 |
| `_key` | string | 8 文字ランダム 16 進数（配列内一意） |
| `style` | string | `"normal"` / `"h1"` / `"h2"` / `"h3"` / `"blockquote"` |
| `markDefs` | PTMarkDef[] | リンク等の参照定義（空配列可） |
| `children` | PTSpan[] | インラインテキスト配列（1 つ以上） |
| `listItem` | string | ※省略可。`"bullet"` / `"number"` |
| `level` | number | ※省略可。リストネストレベル（Adlaire は `1` 固定） |

### PTSpan（インラインテキスト）

| フィールド | 型 | 説明 |
|----------|-----|------|
| `_type` | `"span"` | 固定値 |
| `_key` | string | 8 文字ランダム 16 進数 |
| `text` | string | テキスト文字列 |
| `marks` | string[] | 適用マーク種別キーまたは `markDefs._key` |

### 組み込みマーク種別

| mark | HTML 出力 | 管理 UI |
|------|---------|--------|
| `"strong"` | `<strong>` | インラインツールバー B |
| `"em"` | `<em>` | インラインツールバー I |
| `"code"` | `<code>` | インラインツールバー（Ver.4.5 以降） |

### PTMarkDef（リンク定義）

| フィールド | 型 | 説明 |
|----------|-----|------|
| `_key` | string | 8 文字ランダム 16 進数 |
| `_type` | `"link"` | 固定値 |
| `href` | string | リンク URL |

### カスタムオブジェクト型

| `_type` | 追加フィールド | 説明 |
|---------|-------------|------|
| `"image"` | `url: string`, `caption?: string` | 画像 |
| `"code"` | `code: string` | コードブロック |
| `"delimiter"` | —（`_key` のみ） | 水平線 |
| `"table"` | `withHeadings: boolean`, `content: string[][]` | テーブル（Ver.3.5 以降） |
| `"accordion"` | `title: string`, `content: string` | アコーディオン（Ver.3.5 以降） |

すべてのカスタム型は `_key` フィールド（8 文字ランダム 16 進数）を持つ。

### _key 生成規則

`crypto.getRandomValues()` を用いた 8 文字ランダム 16 進数文字列（例: `"a3f8b2c1"`）。同一コンテンツ配列内での一意性を保証する。

### マイグレーション仕様（Ver.3.1 起動時・廃止ポリシー準拠）

Ver.3.1 の初回アクセス時（`migrate()` 実行時）、全ページデータを走査し旧形式を検出した場合に変換する。

| 旧フィールド | 変換内容 |
|------------|---------|
| `format: "blocks"` + `blocks[]` | 旧ブロック配列を PT 形式に変換し `body` に格納 |
| `format: "markdown"` + `content` | Markdown 文字列を PT 形式に変換し `body` に格納 |
| `content`, `format`, `blocks` | 変換後に削除 |

#### 旧ブロック型 → PT 変換規則

| 旧 `type` | PT 変換 |
|----------|---------|
| `paragraph` | `PTBlock(style: "normal")` + `text` をインライン Markdown パースして `children` 生成 |
| `heading` | `PTBlock(style: "h{level}")` + `text` を `children` 生成 |
| `list` (unordered) | `items` を展開し各 `PTBlock(listItem: "bullet", level: 1)` に変換 |
| `list` (ordered) | `items` を展開し各 `PTBlock(listItem: "number", level: 1)` に変換 |
| `quote` | `PTBlock(style: "blockquote")` + `text` を `children` 生成 |
| `code` | `{ _type: "code", _key, code }` |
| `delimiter` | `{ _type: "delimiter", _key }` |
| `image` | `{ _type: "image", _key, url, caption? }` |

インライン Markdown パース（`**bold**` → `"strong"` マーク、`*italic*` → `"em"` マーク、`` `code` `` → `"code"` マーク、`[text](url)` → `markDefs` + `_key` 参照）を実施する。認識外の記法は plain text として処理する。

---

# 3. PHP API 仕様

## 3.1 FileStorage (`Core/core.php`)

| メソッド | 説明 |
|---------|------|
| `__construct(basePath)` | ストレージパス初期化 |
| `ensureDirectories()` | ディレクトリ作成保証 |
| `validateSlug(slug): bool` | スラッグ安全性検証（static） |
| `migrate()` | 旧形式マイグレーション（旧 blocks/markdown → Portable Text 自動変換。Ver.3.1 起動時に全ページ走査・一度のみ実施） |
| `readConfig(): array` | 設定読み込み |
| `writeConfig(config): bool` | 排他ロック付き設定書き込み |
| `writeConfigValue(key, value): bool` | 単一設定値書き込み |
| `readPageData(slug): array\|false` | ページデータ全体読み込み |
| `writePage(slug, body, status?, type?, meta?): bool` | ページ書き込み（Portable Text `body` 配列を受け取り保存。リビジョン自動保存） |
| `deletePage(slug): bool` | ページ削除（バックアップ + リビジョン削除） |
| `listPages(): array` | 全ページ一覧（キャッシュ対応） |
| `listPublishedPages(): array` | 公開ページのみ一覧（type: page に限定） |
| `listPublishedPosts(): array` | 公開投稿一覧（type: post, status: published、posted_at 降順） |
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
| `renderPortableTextToHtml(body): string` | Portable Text 配列→HTML（サーバーサイド、XSS エスケープ付き、Ver.3.1 以降） |
| `renderMarkdownToHtml(md): string` | Markdown→HTML（サーバーサイド、**Ver.3.5 廃止予定**） |
| `renderBlocksToHtml(blocks): string` | 旧ブロック配列→HTML（**Ver.3.5 廃止予定**、マイグレーション補助用） |

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
| `GET` | `?api=pages` | `{ pages: { slug: { format, status, type, updated_at } } }` |
| `GET` | `?api=pages&type=post` | type フィルタ: `"page"` または `"post"` でフィルタリング |
| `GET` | `?api=pages&slug=xxx` | `{ page, data: { body, status, type, posted_at?, category?, tags?, author?, ... } }` |
| `POST` | `?api=pages` | `{ status: "ok", slug }` |
| `DELETE` | `?api=pages&slug=xxx` | `{ status: "ok", deleted }` |

POST パラメータ: `slug`, `body` (Portable Text JSON), `status` (draft/published), `type` (page/post), `posted_at` (ISO 8601、type=post のみ), `category` (type=post のみ), `tags` (JSON 配列文字列、type=post のみ), `author` (type=post のみ), `csrf`

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

## 4.8 ユーザー管理 API

> メインマスター管理者のみ操作可能。

| メソッド | URL | 説明 |
|---------|-----|------|
| `GET` | `?api=users` | ユーザー一覧（ログインID・role・is_main・enabled・created_at・last_login） |
| `POST` | `?api=users&action=generate` | サブマスター生成（ID・パスワード・トークンを自動生成、レスポンスに平文を1回のみ返却） |
| `POST` | `?api=users&action=disable&user={id}` | サブマスター無効化（enabled=false、即ログイン不可） |
| `DELETE` | `?api=users&user={id}` | サブマスター削除（メインマスター自身は削除不可） |
| `POST` | `?api=users&action=password` | メインマスター自身のパスワード変更 |

- 全操作に CSRF + メインマスター認証必須。
- サブマスター生成時のレスポンスに平文の ID・パスワード・トークンを含む。この情報はサーバー側にハッシュのみ保存され、以後取得不可。
- クライアント側は生成レスポンス受信時に認証情報ファイルを自動ダウンロード（1回のみ）。

## 4.9 メディア管理 API（Ver.3.5 以降）

> 認証必須。

| メソッド | URL | 説明 |
|---------|-----|------|
| `GET` | `?api=media` | メディアファイル一覧（ファイル名・サイズ・更新日時） |
| `POST` | `?api=media&action=upload` | ファイルアップロード（multipart/form-data） |
| `DELETE` | `?api=media&file={filename}` | ファイル削除 |

POST パラメータ: `file`（ファイルフィールド）、`csrf`

レスポンス（一覧）:
```json
{ "files": [{ "name": "example.jpg", "size": 102400, "updated_at": "ISO 8601" }] }
```

レスポンス（アップロード成功）:
```json
{ "status": "ok", "filename": "example.jpg", "url": "/data/media/example.jpg" }
```

- アップロード時はファイル名をサニタイズしてから保存する（§2.8 参照）。
- 許可拡張子以外はアップロードを拒否する（§2.8 参照）。
- ファイルサイズが `media_max_size` を超える場合はエラーを返す。

## 4.10 テーマ設定 API（Ver.3.7 以降）

> 認証必須。

| メソッド | URL | 説明 |
|---------|-----|------|
| `POST` | `?api=theme-settings` | テーマ設定を保存 |
| `GET` | `?api=theme-settings&theme={name}` | 指定テーマの設定を取得 |

POST パラメータ: `theme`（テーマ名）、`settings`（JSON オブジェクト文字列）、`csrf`

レスポンス（取得）:
```json
{ "theme": "AP-Default", "settings": { "key": "value" } }
```

レスポンス（保存成功）:
```json
{ "status": "ok", "theme": "AP-Default" }
```

- 保存先は `config.json` の `theme_settings[{theme}]`（§2.1 参照）。
- テーマ名は `basename()` でサニタイズし、実在テーマのみ許可する。

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
| `markdown.ts` | Markdown→HTML 変換（17構文、コードブロックプレースホルダー方式）。**Ver.3.5 廃止予定**（コンテンツ形式 Portable Text 一本化に伴い削除） |
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

### 5.3.2 Portable Text ブロック型（Ver.3.1 以降）

エディタは Portable Text 形式（§2.9 スキーマ準拠）で保存する。`EditorData` は `Array<PTBlock | PTImage | PTCode | PTDelimiter | PTTable | PTAccordion>` 型。

#### テキストブロック（PTBlock）

| `style` | 説明 | `listItem` |
|--------|------|-----------|
| `"normal"` | テキスト段落 | — |
| `"h1"` / `"h2"` / `"h3"` | 見出し | — |
| `"blockquote"` | 引用 | — |
| `"normal"` | リスト項目 | `"bullet"` / `"number"` |

#### カスタムオブジェクト型

| `_type` | 説明 | フィールド |
|---------|------|-----------|
| `"image"` | 画像 | `url: string`, `caption?: string` |
| `"code"` | コードブロック | `code: string` |
| `"delimiter"` | 水平線 | —（`_key` のみ） |
| `"table"` | テーブル（Ver.3.5 以降） | `withHeadings: boolean`, `content: string[][]` |
| `"accordion"` | アコーディオン（Ver.3.5 以降） | `title: string`, `content: string` |

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
- **コンテンツタイプフィルタ**: ページ一覧の上部に「全件 / ページ / 投稿」の切替フィルタを設置（Ver.3.1 以降）
- ページ一覧テーブル: slug, type, format, status, updated_at, 操作（編集 / 削除）
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
- **投稿メタデータパネル**（`type: post` の場合のみ表示、Ver.3.1 以降）:
  - 投稿日時 (`posted_at`): datetime-local 入力。未設定時は作成日時を使用。
  - カテゴリ (`category`): テキスト入力。
  - タグ (`tags`): テキスト入力（カンマ区切り複数入力 → 配列に変換）。
  - 著者 (`author`): テキスト入力。

## 6.4 新規ページ作成 (`?admin=new`)

- スラッグ入力フィールド
- **コンテンツタイプ選択**: ページ（`page`） / 投稿（`post`）（Ver.3.1 以降）
- format 選択（Blocks / Markdown）
- 作成ボタン → 編集画面へ遷移

## 6.5 ファイル構成

| ファイル | 役割 | 直接HTTPアクセス |
|---------|------|:---:|
| `Core/admin-ui.php` | 管理 UI テンプレート | **禁止** |
| `themes/admin.css` | 管理 UI スタイルシート（ダークモード・レスポンシブ対応） | 許可 |

- 管理 UI は `admin-ui.php` で描画する。テーマの `theme.php` には管理コードを含めない。
- 公開ページ（`theme.php`）からは設定パネル・エディタ・format バーを完全に除去する。
- JS / CSS は管理 UI 専用に読み込む（公開ページには不要な管理用 JS を配信しない）。

---

# 7. 機能仕様（Core 機能）

> Core 機能は Adlaire Static CMS の基本構成要素であり、常に利用可能でなければならない。

## 7.1 コンテンツ管理

| 機能 | 状態 |
|------|:----:|
| ブロックエディタによるページ編集 | 実装済 |
| Markdown ページ対応 | **Ver.3.5 廃止予定** |
| format 切替（Blocks ↔ Markdown） | **Ver.3.5 廃止予定** |
| Portable Text コンテンツ形式 | 計画（Ver.3.1） |
| 旧形式（blocks/markdown）→ Portable Text 自動マイグレーション | 計画（Ver.3.1） |
| 旧形式コード全廃（廃止ポリシー適用） | 計画（Ver.3.5） |
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
| ブログ投稿タイプ（type: post）・投稿メタデータ | 計画（Ver.3.1） |
| 管理UI コンテンツタイプフィルタ | 計画（Ver.3.1） |
| テーブルブロック（table） | 計画（Ver.3.5） |
| アコーディオンブロック（accordion） | 計画（Ver.3.5） |
| メディア管理（アップロード・一覧・削除） | 計画（Ver.3.5） |
| テーマ設定 UI / API | 計画（Ver.3.7） |
| 全文検索インデックスファイル生成（search-index.json） | 計画（Ver.3.7） |

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

---

# 9. 関連文書

| 文書 | 内容 |
|------|------|
| `CHARTER.md` | ルールブック憲章（最上位原則・セットアップ/アップデート実装仕様） |
| `ARCHITECTURE_RULEBOOK.md` | Core ファイル構成・セキュリティ基盤 |
| `GENERATOR_RULEBOOK.md` | 静的サイト生成（§3.6, §4.6 の詳細仕様） |
| `EDITOR_RULEBOOK.md` | エディタ設計原則（§5.3 エディタ仕様の上位方針） |
| `REVISION_HISTORY.md` | 全ルールブック改訂履歴 |
