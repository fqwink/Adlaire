# Adlaire Platform - ルールブック（仕様書）

**バージョン**: Ver.1.3-14
**最終更新**: 2026-03-31

> 本ドキュメントは Adlaire Platform の公式仕様書である。
> すべての実装は本仕様に基づいて行うこと。

---

## 1. アーキテクチャ仕様

### 1.1 PHP ファイル構成

| ファイル | 役割 | 直接HTTPアクセス |
|---------|------|:---:|
| `index.php` | エントリーポイント。セッション初期化・require・ブートストラップ | 許可 |
| `core.php` | コア基盤。FileStorage クラス、ヘルパー関数 | **禁止** |
| `admin.php` | 管理ツール。App クラス、handleEdit、REST API | **禁止** |

### 1.2 TypeScript 開発規約

- **TypeScript を全面的に採用する**。JavaScript の直接記述は禁止。
- すべての JavaScript は **TypeScript からのコンパイル生成を義務化** する。
- TypeScript ソースは `ts/` ディレクトリに配置する。
- コンパイル済み JavaScript は `js/dist/` に出力される。
- `npm run build`（`tsc`）でコンパイルを実行する。
- `js/dist/` 内のファイルを手動で編集してはならない。
- TypeScript バージョン: **5.x**（メジャーバージョン5固定）。
- ターゲット: ES2021。ライブラリ: ES2021, DOM, DOM.Iterable。

### 1.3 ビルド手順

```bash
npm install       # 初回のみ
npm run build     # TypeScript → JavaScript コンパイル
```

### 1.4 バージョン規則

`Ver.{Major}.{Minor}-{Build}` 形式。

- **Major**: 後方互換性のない変更。Minor を 0 にリセット。
- **Minor**: 後方互換性のある機能追加・改善。
- **Build**: 累積リビジョン番号。**リセット禁止**。すべてのリリースで単調増加。

---

## 2. プロジェクト構成

```
Adlaire/
├── index.php                  # エントリーポイント
├── core.php                   # コア基盤（FileStorage・ヘルパー関数）
├── admin.php                  # 管理ツール（App クラス・handleEdit・REST API）
├── .htaccess                  # Apache URL書き換え・アクセス制御
├── ts/                        # TypeScript ソース
│   ├── globals.d.ts           #   グローバル型定義
│   ├── autosize.ts            #   textarea自動リサイズ
│   ├── editor.ts              #   実装済 ブロックエディタ
│   ├── editInplace.ts         #   インプレース編集・AJAX保存
│   ├── i18n.ts                #   多言語化モジュール
│   ├── markdown.ts            #   Markdown→HTMLコンバーター
│   └── api.ts                 #   REST APIクライアント
├── js/dist/                   # コンパイル済み JavaScript（自動生成）
├── data/lang/                 # 翻訳ファイル（JSON）
│   ├── ja.json                #   日本語
│   └── en.json                #   英語
├── themes/                    # テーマディレクトリ
│   ├── AP-Default/            #   theme.php + style.css
│   └── AP-Adlaire/            #   theme.php + style.css
├── files/                     # [実行時生成] データストレージ
│   ├── config.json            #   サイト設定
│   ├── .config.lock           #   設定書き込み排他ロック
│   ├── pages/{slug}.json      #   ページデータ
│   ├── revisions/{slug}/      #   リビジョン履歴（最大30世代）
│   └── backups/               #   設定バックアップ（最大9世代）
├── plugins/                   # [実行時生成] プラグインディレクトリ
├── package.json               # npm設定・ビルドスクリプト
├── tsconfig.json              # TypeScript設定
├── CLAUDE.md                  # 開発規約
├── RULEBOOK.md                # 本ファイル（ルールブック / 仕様書）
├── README.md / CHANGES.md / RELEASE-NOTES.md
└── Licenses/
```

---

## 3. データ仕様

### 3.1 サイト設定 (`files/config.json`)

| キー | 型 | 説明 |
|-----|-----|------|
| `password` | string | bcryptハッシュ化された管理者パスワード |
| `themeSelect` | string | 現在のテーマ名 |
| `language` | string | 言語コード（`ja` / `en`） |
| `menu` | string | メニュー項目（`<br />\n` 区切り） |
| `title` | string | サイトタイトル |
| `subside` | string | サイドバーコンテンツ |
| `description` | string | サイト説明 |
| `keywords` | string | キーワード |
| `copyright` | string | 著作権表示 |

### 3.2 ページデータ (`files/pages/{slug}.json`)

```json
{
    "content": "HTML/Markdownテキスト、またはブロックJSON文字列",
    "format": "html | markdown | blocks",
    "blocks": [
        { "type": "paragraph", "data": { "text": "..." } },
        { "type": "heading", "data": { "text": "...", "level": 2 } }
    ],
    "created_at": "ISO 8601",
    "updated_at": "ISO 8601"
}
```

**format**: `html`（HTMLテキスト）, `markdown`（Markdownテキスト）, `blocks`（ブロックエディタJSON）

---

## 4. PHP API 仕様

### 4.1 FileStorage (`core.php`)

| メソッド | 説明 |
|---------|------|
| `ensureDirectories()` | ディレクトリ作成保証 |
| `validateSlug(slug): bool` | スラッグ安全性検証 |
| `migrate()` | 旧形式マイグレーション |
| `readConfig(): array` | 設定読み込み |
| `writeConfig(config): bool` | 排他ロック付き設定書き込み |
| `writeConfigValue(key, value): bool` | 単一設定値書き込み |
| `readPage(slug): string\|false` | ページコンテンツ読み込み |
| `readPageData(slug): array\|false` | ページデータ全体読み込み |
| `writePage(slug, content, format): bool` | ページ書き込み（リビジョン自動保存） |
| `deletePage(slug): bool` | ページ削除（バックアップ付き） |
| `listPages(): array` | ページ一覧 |
| `listRevisions(slug): array` | リビジョン一覧 |
| `restoreRevision(slug, timestamp): bool` | リビジョン復元 |

**定数**: `MAX_BACKUPS = 9`, `MAX_REVISIONS = 30`

### 4.2 App (`admin.php`)

| メソッド | 説明 |
|---------|------|
| `getInstance(): self` | シングルトン取得 |
| `t(key, params): string` | 翻訳ヘルパー |
| `isLoggedIn(): bool` | ログイン状態 |
| `getLoginStatus(): string` | ログインリンク生成 |
| `getSlug(page): string` | スラッグ変換 |
| `login(): string` | 認証処理 |
| `savePassword(password): string` | パスワード保存 |
| `editTags(): void` | 管理者スクリプト出力 |
| `content(id, content): void` | コンテンツ出力 |
| `menu(): void` | ナビメニュー生成 |
| `settings(): void` | 設定パネル生成 |

---

## 5. REST API 仕様

認証: セッション + CSRF トークン必須

### 5.1 ページ API

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=pages` | `{ pages: { slug: { format, created_at, updated_at } } }` |
| `GET` | `?api=pages&slug=xxx` | `{ page, data: { content, format, ... } }` |
| `POST` | `?api=pages` | `{ status: "ok", slug }` |
| `DELETE` | `?api=pages&slug=xxx&csrf=xxx` | `{ status: "ok", deleted }` |

### 5.2 リビジョン API

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=revisions&slug=xxx` | `{ slug, revisions: [{ timestamp }] }` |
| `POST` | `?api=revisions&slug=xxx` | `{ status: "ok", restored, timestamp }` |

---

## 6. TypeScript モジュール仕様

### 6.1 既存モジュール

| モジュール | 説明 |
|-----------|------|
| `autosize.ts` | textarea自動リサイズ |
| `editInplace.ts` | インプレース編集・Markdown対応・AJAX保存 |
| `i18n.ts` | 多言語化（JSON翻訳ファイル読み込み） |
| `markdown.ts` | Markdown→HTML変換（拡張構文対応） |
| `api.ts` | REST APIクライアント |
| `globals.d.ts` | グローバル型定義 |
| `editor.ts` | ブロックエディタ（Editor.js ライク） |

### 6.2 markdown.ts — Markdown 対応構文

| 構文 | 記法 | HTML出力 |
|------|-----|---------|
| 見出し | `# / ## / ###` | `<h1>` / `<h2>` / `<h3>` |
| 太字 | `**text**` | `<strong>` |
| 斜体 | `*text*` | `<em>` |
| 太字斜体 | `***text***` | `<strong><em>` |
| インラインコード | `` `code` `` | `<code>` |
| コードブロック（言語指定） | ` ```lang ... ``` ` | `<pre><code class="language-xxx">` |
| リンク | `[text](url)` | `<a href>` |
| 画像 | `![alt](url)` | `<img src alt>` |
| 非順序リスト | `- item` | `<ul><li>` |
| 順序リスト | `1. item` | `<ol><li>` |
| タスクリスト | `- [x]` / `- [ ]` | `<li><input type="checkbox">` |
| テーブル | `\| h \| h \|` + `\|---\|` | `<table><thead><tbody>` |
| 引用 | `> text` | `<blockquote>` |
| 水平線 | `---` | `<hr>` |
| 脚注定義 | `[^id]: text` | `<section class="footnotes">` |
| 脚注参照 | `[^id]` | `<sup><a href="#fn-id">` |
| 段落 | 通常テキスト | `<p>` |

### 6.3 editor.ts — ブロックエディタ仕様

Editor.js ライクなブロックエディタを TypeScript で独自実装する。
外部ライブラリ（Editor.js 本体）は使用しない。

#### 6.2.1 コンセプト

- **ブロックベース**: コンテンツを独立したブロック単位で管理
- **JSON出力**: ブロックデータを構造化JSONとして保存
- **プラグイン型**: ブロックタイプは Tool インターフェースで追加可能
- **外部依存なし**: 純粋 TypeScript のみ

#### 6.2.2 ブロック型

| type | 説明 | data |
|------|------|------|
| `paragraph` | テキスト段落 | `{ text: string }` |
| `heading` | 見出し | `{ text: string, level: 1\|2\|3 }` |
| `list` | リスト | `{ style: "unordered"\|"ordered", items: string[] }` |
| `code` | コードブロック | `{ code: string, language?: string }` |
| `quote` | 引用 | `{ text: string, caption?: string }` |
| `delimiter` | 水平線 | `{}` |
| `image` | 画像 | `{ url: string, caption?: string }` |

#### 6.2.3 ブロックJSON構造

```json
{
    "time": 1711843200000,
    "version": "1.0",
    "blocks": [
        { "type": "heading", "data": { "text": "タイトル", "level": 1 } },
        { "type": "paragraph", "data": { "text": "本文" } },
        { "type": "list", "data": { "style": "unordered", "items": ["A", "B"] } }
    ]
}
```

#### 6.2.4 エディタ API

| クラス/メソッド | 説明 |
|---------------|------|
| `Editor` | メインエディタクラス |
| `Editor.create(el, config)` | エディタ初期化 |
| `Editor.save(): BlockData` | ブロックデータ取得 |
| `Editor.render(data)` | データからエディタ復元 |
| `Editor.destroy()` | エディタ破棄 |
| `BlockTool` | ブロックツールインターフェース |
| `BlockTool.render(): HTMLElement` | ブロックDOM生成 |
| `BlockTool.save(el): object` | DOMからデータ抽出 |
| `renderBlocks(blocks): string` | ブロック→HTML変換（閲覧用） |

#### 6.2.5 エディタ UI

- ブロック間の `+` ボタンでツールボックス表示（ブロック追加）
- ブロック左側: ドラッグハンドル + 設定メニュー（移動・削除・型変更）
- インラインツールバー: テキスト選択時に太字/斜体/リンクツール
- Enter: 新規段落ブロック追加
- Backspace: 空ブロック削除または前ブロックと結合

---

## 7. 機能仕様

### 7.1 コンテンツ管理

| 機能 | 状態 |
|------|------|
| ページ表示・作成・削除 | 実装済 |
| インプレース編集 | 実装済 |
| Markdown対応 | 実装済 |
| ブロックエディタ | **計画** |
| AJAX保存 | 実装済 |
| リビジョン管理（最大30世代） | 実装済 |
| REST API | 実装済 |

### 7.2 認証・セキュリティ

| 機能 | 状態 |
|------|------|
| bcrypt認証・MD5移行 | 実装済 |
| セッション管理 | 実装済 |
| CSRF保護 | 実装済 |
| パス走査防止 | 実装済 |
| XSS対策 | 実装済 |
| .htaccess アクセス制御 | 実装済 |

### 7.3 多言語化（i18n）

| 機能 | 状態 |
|------|------|
| 日本語 / 英語 | 実装済 |
| PHP / TypeScript 翻訳 | 実装済 |
| 管理パネル言語切替 | 実装済 |

### 7.4 テーマ・プラグイン

| 機能 | 状態 |
|------|------|
| テーマ切替（AP-Default / AP-Adlaire） | 実装済 |
| プラグイン自動読み込み | 実装済 |
