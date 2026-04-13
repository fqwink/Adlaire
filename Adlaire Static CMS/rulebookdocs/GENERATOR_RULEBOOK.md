# Adlaire Generator RULEBOOK

- 文書名: Adlaire Generator RULEBOOK
- 文書バージョン: Ver.1.4
- 作成日: 2026-04-02
- 最終改訂: 2026-04-13
- 対象製品: Adlaire Static CMS
- 文書種別: 静的サイト生成の仕様を定義する技術規範文書
- 文書目的: Adlaire の静的サイト生成機能に関する設計・API・制約を恒常的規範として定義する

---

# 1. 基本宣言

## 1.1 位置づけ

本 RULEBOOK は、Adlaire Static CMS の静的サイト生成機能に関する恒常的規範文書である。
特定バージョンに従属せず、すべての開発判断に適用される。

## 1.2 設計原則

- 公開ページのみを対象とし、下書きは生成対象外とする
- 差分ビルドにより不要な再生成を避ける
- 生成物はテーマ適用済みの完全な HTML とする
- 認証必須（管理者のみ実行可能）

---

# 2. 概要

静的サイト生成は、管理 UI またはAPI 経由で管理者が明示的に実行する機能である。
公開ページを静的 HTML ファイルとして `dist/` ディレクトリに出力し、外部ホスティングや CDN での配信を可能にする。

---

# 3. 出力先・生成物構成

## 3.1 出力ディレクトリ

生成物はプロジェクトルート直下の `dist/` ディレクトリに出力する。

## 3.2 生成物一覧

```
dist/
├── {slug}.html              # 各ページの HTML（テーマ適用済み）
├── blog/                    # ブログ関連（Ver.3.1 以降、type: post が存在する場合）
│   ├── index.html           # ブログ一覧（1ページ目）
│   ├── page/
│   │   ├── 2/index.html     # ページネーション（2ページ目以降）
│   │   └── {n}/index.html
│   ├── category/            # カテゴリアーカイブ（Ver.3.3 以降）
│   │   └── {name}/index.html
│   ├── tag/                 # タグアーカイブ（Ver.3.3 以降）
│   │   └── {name}/index.html
│   └── {year}/              # 日付アーカイブ（Ver.3.3 以降）
│       └── {month}/index.html
├── style.css                # テーマ CSS
├── js/                      # JS（レンダリング用のみ）
│   ├── markdown.js
│   └── editInplace.js
├── data/lang/               # 翻訳ファイル
│   ├── ja.json
│   └── en.json
├── sitemap.xml              # サイトマップ（公開ページ + 公開投稿）
├── search-index.json        # 全文検索インデックス（Ver.3.7 以降）
└── .build_state.json        # ビルド状態（差分ビルド用、内部管理）
```

## 3.3 生成対象

- **対象**: `status: "published"` のページのみ
- **対象外**: `status: "draft"` のページ

---

# 4. 差分ビルド

## 4.1 仕組み

- `dist/.build_state.json` に前回ビルド時刻を記録する。
- 各ページの `updated_at` が前回ビルド時刻より新しい場合のみ再生成する。
- CSS / JS / sitemap / 翻訳ファイルは常に再生成する。

## 4.2 全再生成

- `force=true` パラメータで全ページの再生成を強制できる。

## 4.3 ビルド状態ファイル

```json
{
    "last_build": "ISO 8601",
    "pages_built": ["slug1", "slug2"]
}
```

---

# 5. コンテンツ変換

ページの format に応じて、サーバーサイドで HTML に変換する。

| format | 変換関数 | 定義ファイル |
|--------|---------|------------|
| `blocks` | `renderBlocksToHtml(blocks)` | `Core/renderer.php` |
| `markdown` | `renderMarkdownToHtml(md)` | `Core/renderer.php` |

- 変換後の HTML にテーマテンプレートを適用し、完全な HTML ページとして出力する。
- XSS エスケープは変換関数内で適用済み。

## 5.1 ブロック型レンダリング（Ver.3.5 以降追加）

`renderBlocksToHtml()` は以下のブロック型を追加で処理する。

| type | レンダリング結果 | 備考 |
|------|--------------|------|
| `table` | `<table>` + `<thead>`（withHeadings=true 時）+ `<tbody>` + `<td>` | セル内テキストは `esc()` 適用 |
| `accordion` | `<details class="ce-accordion"><summary>{title}</summary><div>{content}</div></details>` | title は `esc()`、content はサニタイズ済みインライン HTML |

- `table` の制約: 最大 20列 / 100行（EDITOR_RULEBOOK.md §14.1 準拠）。
- `accordion` の content はエディタ保存時にサニタイズ済みとして扱う。サーバーサイドで追加エスケープは行わない。

---

# 6. REST API

## 6.1 エンドポイント

| メソッド | URL | 認証 | 説明 |
|---------|-----|:----:|------|
| `POST` | `?api=generate` | 必須 | 静的サイト生成を実行 |

## 6.2 リクエストパラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|:----:|------|
| `csrf` | string | Yes | CSRF トークン |
| `force` | boolean | No | `true` で全再生成を強制 |

## 6.3 レスポンス

```json
{
    "status": "ok",
    "pages": 5,
    "output": "dist/"
}
```

---

# 7. PHP 関数仕様

| 関数 | ファイル | 説明 |
|------|---------|------|
| `handleApiGenerate(storage)` | `Core/generator.php` | 静的サイト生成 API ハンドラー。ページ一覧取得→変換→テーマ適用→ファイル出力→sitemap 生成→ブログ生成（Ver.3.1 以降） |
| `generatePageHtml(app, slug, contentHtml, theme, meta)` | `Core/generator.php` | テーマテンプレートを適用した完全な HTML ページを生成。`meta` は投稿メタデータ配列（Ver.3.1 以降、省略可） |
| `generateBlogListHtml(app, posts, page, totalPages, theme)` | `Core/generator.php` | ブログ一覧ページ HTML 生成（テーマの `blog.php` / `theme.php` を適用）（Ver.3.1 以降） |
| `generateBlogPages(app, storage, theme)` | `Core/generator.php` | ブログ一覧・ページネーションページを `dist/blog/` に一括生成（Ver.3.1 以降） |
| `generateArchivePages(app, storage, theme)` | `Core/generator.php` | カテゴリ・タグ・日付アーカイブページを `dist/blog/` に生成（Ver.3.3 以降） |
| `generateSearchIndex(storage)` | `Core/generator.php` | 全文検索インデックスファイル `dist/search-index.json` を生成（Ver.3.7 以降） |

---

# 8. 制約・非スコープ

以下は本機能のスコープ外とする。

| 項目 | 理由 |
|------|------|
| CDN 連携・自動デプロイ | 外部サービス依存を避ける |
| インクリメンタルビルド（ファイル監視） | サーバーサイドでのファイル監視は不適切 |
| テンプレートエンジン切替 | theme.php による統一を維持 |
| RSS / Atom フィード生成 | DIRECTION_RULEBOOK.md §7.11 により不採用確定（今後も計画なし） |
| 画像最適化・リサイズ | 外部ツールの責務 |

---

# 9. ブログ機能（Ver.3.1 以降）

## 9.1 基本方針

- `type: post` かつ `status: published` の投稿のみがブログ生成の対象。
- ブログ関連ページは `dist/blog/` 以下に出力する。
- ブログ投稿が1件も存在しない場合、`dist/blog/` は生成しない。
- ブログ生成は `handleApiGenerate()` の実行に含まれる（個別のエンドポイントではない）。

## 9.2 ブログ一覧ページ生成（Ver.3.1）

### 9.2.1 概要

`type: post` かつ `status: published` の投稿を `posted_at` 降順（未設定時は `created_at` 降順）で一覧表示する静的ページを生成する。

### 9.2.2 生成物

| パス | 説明 |
|------|------|
| `dist/blog/index.html` | ブログ一覧（1ページ目） |
| `dist/blog/page/{n}/index.html` | ページネーション（n ≥ 2） |

### 9.2.3 ページネーション

- 1ページあたりの表示件数: `config.json` の `blog_posts_per_page`（デフォルト 10）。
- 総ページ数: `ceil(総投稿数 / blog_posts_per_page)`。
- 1ページしかない場合、`dist/blog/page/` は生成しない。

### 9.2.4 テーマテンプレート

テーマの `blog.php` を使用する。`blog.php` が存在しない場合は `theme.php` を使用する（フォールバック）。

テンプレートに渡す変数（PHP 変数として展開）:

| 変数 | 型 | 説明 |
|------|----|------|
| `$posts` | array | 投稿データ配列（各要素: `slug`, `posted_at`, `category`, `tags`, `author`, `excerpt`, `format`, `status`） |
| `$currentPage` | int | 現在のページ番号（1 起算） |
| `$totalPages` | int | 総ページ数 |
| `$totalPosts` | int | 総投稿数 |
| `$config` | array | サイト設定 |

### 9.2.5 抜粋（excerpt）生成ルール

| format | 生成方法 |
|--------|---------|
| `blocks` | 最初の `paragraph` ブロックのテキストを先頭 120文字で切り出し。paragraph が存在しない場合は空文字。 |
| `markdown` | Markdown を平文に変換した先頭 120文字。HTML タグは除去。 |

### 9.2.6 投稿ページの追加メタデータ変数（Ver.3.1）

`type: post` の個別ページを `generatePageHtml()` で生成する際、テーマ `theme.php` に以下の変数を追加で渡す:

| 変数 | 型 | 説明 |
|------|----|------|
| `$postMeta` | array | `{ posted_at, category, tags, author }` |
| `$pageType` | string | `"post"` |

---

## 9.3 アーカイブページ生成（Ver.3.3）

### 9.3.1 概要

カテゴリ・タグ・年月別のアーカイブページを静的生成する。

### 9.3.2 生成物

| パス | 説明 | 条件 |
|------|------|------|
| `dist/blog/category/{name}/index.html` | カテゴリアーカイブ | `category` フィールドが空でない投稿が存在する場合 |
| `dist/blog/tag/{name}/index.html` | タグアーカイブ | `tags` 配列が空でない投稿が存在する場合 |
| `dist/blog/{year}/{month}/index.html` | 日付アーカイブ | 投稿が存在する年月ごとに生成 |

- `{name}` はカテゴリ名・タグ名を `rawurlencode()` したもの（URL セーフ）。
- `{year}` は4桁の年、`{month}` は2桁の月（例: `2026/04/`）。

### 9.3.3 テーマテンプレート

テーマの `blog-archive.php` を使用する。存在しない場合は `blog.php` → `theme.php` の順でフォールバック。

テンプレートに渡す変数（ブログ一覧と同様＋追加）:

| 変数 | 型 | 説明 |
|------|----|------|
| `$posts` | array | フィルタ済み投稿データ配列 |
| `$currentPage` | int | 1（アーカイブはページネーションなし） |
| `$totalPages` | int | 1 |
| `$totalPosts` | int | フィルタ済み件数 |
| `$config` | array | サイト設定 |
| `$archiveType` | string | `"category"` / `"tag"` / `"date"` |
| `$archiveLabel` | string | カテゴリ名 / タグ名 / `"YYYY年MM月"` 形式 |

---

## 9.4 前後ナビ（Ver.3.3）

`type: post` の個別ページを `generatePageHtml()` で生成する際、テーマ `theme.php` に以下の変数を追加で渡す:

| 変数 | 型 | 説明 |
|------|----|------|
| `$prevPost` | array\|null | 前の投稿（`posted_at` がより古い最近の投稿）。`slug`, `title`, `posted_at` を含む。存在しない場合は `null`。 |
| `$nextPost` | array\|null | 次の投稿（`posted_at` がより新しい最近の投稿）。同上。存在しない場合は `null`。 |

- 前後の判定は公開投稿のみを対象とする。
- 前後ナビのレンダリングはテーマの責務。CMS は変数を渡すのみ。

---

# 10. ブログテーマ要件（Ver.3.1 以降）

## 10.1 テーマファイル一覧

| ファイル | 必須/任意 | 説明 |
|---------|:--------:|------|
| `theme.php` | **必須** | 通常ページ・投稿ページ共通テンプレート（既存） |
| `blog.php` | 任意 | ブログ一覧テンプレート。未存在時は `theme.php` を使用。 |
| `blog-archive.php` | 任意 | アーカイブテンプレート（Ver.3.3）。未存在時は `blog.php` → `theme.php` を使用。 |

## 10.2 フォールバック順位

- ブログ一覧: `blog.php` → `theme.php`
- アーカイブ: `blog-archive.php` → `blog.php` → `theme.php`

## 10.3 制約

- テーマが `blog.php` / `blog-archive.php` を提供しない場合でも、CMS は正常に動作しなければならない（フォールバックで継続）。
- 既存テーマ（AP-Default / AP-Adlaire）の `theme.php` は Ver.3.1 以降も変更なしで動作する（後方互換）。

---

# 11. 検索インデックス生成（Ver.3.7 以降）

## 11.1 概要

静的サイト生成時に、全文検索用のインデックスファイル `dist/search-index.json` を生成する。
フロントエンド JavaScript から読み込んで使用する。

## 11.2 生成タイミング

`handleApiGenerate()` の実行に含まれる（個別のエンドポイントではない）。
CSS / sitemap と同様に、常に全件再生成する（差分ビルドの対象外）。

## 11.3 対象コンテンツ

- `status: "published"` のページ・投稿を対象とする（下書きは除外）。

## 11.4 出力フォーマット

```json
[
    {
        "slug": "about",
        "title": "About",
        "excerpt": "This is a short excerpt...",
        "type": "page",
        "updated_at": "ISO 8601"
    },
    {
        "slug": "post-slug",
        "title": "Post Title",
        "excerpt": "Post excerpt...",
        "type": "post",
        "updated_at": "ISO 8601"
    }
]
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `slug` | string | ページスラッグ |
| `title` | string | ページタイトル（最初の heading ブロックのテキスト、または Markdown の先頭 `#` 見出し） |
| `excerpt` | string | 抜粋（先頭 120文字、HTML タグ除去済み。§9.2.5 の excerpt 生成ルールに準拠） |
| `type` | string | `"page"` または `"post"` |
| `updated_at` | string | 最終更新日時（ISO 8601） |

## 11.5 title 抽出規則

| format | 抽出方法 |
|--------|---------|
| `blocks` | 最初の `heading` ブロックの `text` を使用。存在しない場合は slug をタイトルとする。 |
| `markdown` | 先頭の `# 見出し` を使用。存在しない場合は slug をタイトルとする。 |

## 11.6 PHP 関数

`generateSearchIndex(storage): void`

- `storage->listPublishedPages()` + `storage->listPublishedPosts()` から全公開コンテンツを取得。
- 各コンテンツの title・excerpt を生成し、`dist/search-index.json` に JSON 出力する。
- JSON 出力は `json_encode()` の `JSON_UNESCAPED_UNICODE` を使用する。

---

# 12. 関連文書

| 文書 | 内容 |
|------|------|
| `ARCHITECTURE_RULEBOOK.md` | Core ファイル構成・セキュリティ基盤 |
| `API_RULEBOOK.md` §2.2 | ページデータスキーマ（type, posted_at, category, tags, author） |
| `API_RULEBOOK.md` §3.6 | generator.php 関数一覧 |
| `API_RULEBOOK.md` §4.6 | API エンドポイント一覧 |
| `CHARTER.md` | ルールブック憲章（最上位原則） |
