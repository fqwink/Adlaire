# Adlaire Platform - ルールブック Ver.1.x 系

**最終バージョン**: Ver.1.9-30
**最終更新**: 2026-04-01
**状態**: **凍結** — 本ファイルは変更しない。

> Ver.1.x 系の仕様書。Ver.1.9-30 をもって 1.0 系は完了。
> 上位原則は `CHARTER.md`（ルールブック憲章）を参照。

---

## 1. アーキテクチャ仕様

### 1.1 PHP ファイル構成

**PHP バージョン**: 8.3 以上必須（`declare(strict_types=1)` 使用）

| ファイル | 役割 | 直接HTTPアクセス |
|---------|------|:---:|
| `index.php` | エントリーポイント。セッション初期化・require・ブートストラップ | 許可 |
| `core.php` | コア基盤。FileStorage クラス、ヘルパー関数 | **禁止** |
| `admin.php` | 管理ツール。App クラス、handleEdit、REST API | **禁止** |

### 1.2 TypeScript 開発規約

- **TypeScript を全面的に採用する**。JavaScript の直接記述は禁止。
- **TypeScript バージョンは 5 系に固定**（`~5.8`）。
- すべての JavaScript は **TypeScript からのコンパイル生成を義務化** する。
- TypeScript ソースは `ts/` ディレクトリに配置する。
- コンパイル済み JavaScript は `js/` に出力される。
- `js/` 内のファイルを手動で編集してはならない。
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

### 1.5 廃止ポリシー

- 機能・形式の廃止時、**レガシーコードの互換性維持は行わない**。
- 廃止決定後は該当コードを即座に削除する。
- 旧形式データのマイグレーションは廃止時に一度だけ実施し、以降は旧形式を認識しない。

---

## 2. プロジェクト構成

```
Adlaire/
├── index.php                  # エントリーポイント
├── core.php                   # コア基盤（FileStorage・ヘルパー関数）
├── admin.php                  # 管理ツール（App クラス・REST API）
├── admin-ui.php               # 管理 UI テンプレート
├── .htaccess                  # Apache URL書き換え・アクセス制御
├── ts/                        # TypeScript ソース
│   ├── globals.d.ts           #   グローバル型定義
│   ├── autosize.ts            #   textarea 自動リサイズ
│   ├── editor.ts              #   ブロックエディタ
│   ├── editInplace.ts         #   インプレース編集・format 切替
│   ├── i18n.ts                #   多言語化モジュール
│   ├── markdown.ts            #   Markdown→HTML コンバーター
│   └── api.ts                 #   REST API クライアント
├── js/                   # コンパイル済み JavaScript（自動生成）
├── data/lang/                 # 翻訳ファイル（JSON）
│   ├── ja.json
│   └── en.json
├── themes/                    # テーマディレクトリ
│   ├── AP-Default/            #   theme.php + style.css
│   └── AP-Adlaire/            #   theme.php + style.css
├── files/                     # [実行時生成] データストレージ
│   ├── config.json            #   サイト設定
│   ├── .config.lock           #   設定書き込み排他ロック
│   ├── pages/{slug}.json      #   ページデータ
│   ├── revisions/{slug}/      #   リビジョン履歴（最大30世代）
│   └── backups/               #   設定バックアップ（最大9世代）
├── dist/                      # [生成] 静的サイト出力ディレクトリ
├── plugins/                   # [実行時生成] プラグインディレクトリ
├── package.json / tsconfig.json
├── CLAUDE.md                  # 開発規約（ルート配置）
├── README.md                  # プロジェクト説明（ルート配置）
├── rulebookdocs/              # ルールブックドキュメントフォルダ
│   ├── CHARTER.md             #   ルールブック憲章
│   ├── RULEBOOK_Ver1.md       #   本ファイル（Ver.1.x 系、凍結）
│   └── RULEBOOK_Ver2.md       #   Ver.2.x 系
├── docs/                      # ドキュメントフォルダ
│   ├── CHANGES.md             #   変更履歴
│   └── RELEASENOTES.md        #   リリースノート
├── themes/admin.css           # 管理 UI スタイルシート
└── Licenses/
```

---

## 3. データ仕様

### 3.1 サイト設定 (`files/config.json`)

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

### 3.2 ページデータ (`files/pages/{slug}.json`)

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

### 3.3 リビジョン (`files/revisions/{slug}/{timestamp}_{random}.json`)

ページデータと同一構造。保存時の旧バージョンを自動保存。最大30世代。

---

## 4. PHP API 仕様

### 4.1 FileStorage (`core.php`)

| メソッド | 説明 |
|---------|------|
| `__construct(basePath)` | ストレージパス初期化 |
| `ensureDirectories()` | ディレクトリ作成保証 |
| `validateSlug(slug): bool` | スラッグ安全性検証 |
| `migrate()` | 旧形式マイグレーション（blocks 形式に変換） |
| `readConfig(): array` | 設定読み込み |
| `writeConfig(config): bool` | 排他ロック付き設定書き込み |
| `writeConfigValue(key, value): bool` | 単一設定値書き込み |
| `readPageData(slug): array\|false` | ページデータ全体読み込み |
| `writePage(slug, content, format, blocks?, status?): bool` | ページ書き込み（リビジョン自動保存） |
| `deletePage(slug): bool` | ページ削除（バックアップ + リビジョン削除） |
| `listPages(): array` | 全ページ一覧 |
| `listPublishedPages(): array` | 公開ページのみ一覧 |
| `updatePageStatus(slug, status): bool` | ステータス変更 |
| `isConfigKey(key): bool` | 設定キー判定 |
| `listRevisions(slug): array` | リビジョン一覧（新しい順） |
| `restoreRevision(slug, timestamp): bool` | リビジョン復元 |

**定数**: `MAX_BACKUPS = 9`, `MAX_REVISIONS = 30`

### 4.2 ヘルパー関数 (`core.php`)

| 関数 | 説明 |
|------|------|
| `esc(value): string` | HTML エスケープ |
| `csrf_token(): string` | CSRF トークン生成（ワンタイム） |
| `csrf_verify(): void` | CSRF トークン検証（使用後再生成） |
| `login_rate_check(): bool` | ログイン試行回数制限（5回/5分） |

### 4.3 App (`admin.php`)

| メソッド | 説明 |
|---------|------|
| `getInstance(): self` | シングルトン取得 |
| `t(key, params): string` | 翻訳ヘルパー（`:name` パラメータ置換） |
| `isLoggedIn(): bool` | ログイン状態 |
| `getLoginStatus(): string` | ログイン/ログアウトリンク生成 |
| `getSlug(page): string` | スラッグ変換（小文字化・スペース→ハイフン） |
| `login(): string` | 認証処理（レートリミット付き） |
| `savePassword(password): string` | パスワード bcrypt 保存 |
| `editTags(): void` | 管理者用スクリプト変数出力（CSRF, 言語, format） |
| `scriptTags(adminMode): void` | JS script タグ出力（admin=全JS, public=レンダリングのみ） |
| `content(id, content): void` | コンテンツ出力（ブロックエディタ / Markdown / 設定フィールド） |
| `menu(): void` | ナビメニュー生成 |
| `settings(): void` | 設定パネル生成 |

### 4.4 グローバル関数 (`admin.php`)

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
| `apiError(code, message)` | API エラーレスポンス |

---

## 5. REST API 仕様

認証: セッション + CSRF ワンタイムトークン必須（※ 公開 API を除く）

### 5.1 ページ API

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=pages` | `{ pages: { slug: { format, status, created_at, updated_at } } }` |
| `GET` | `?api=pages&slug=xxx` | `{ page, data: { content, format, status, blocks?, ... } }` |
| `POST` | `?api=pages` | `{ status: "ok", slug }` |
| `DELETE` | `?api=pages&slug=xxx&csrf=xxx` | `{ status: "ok", deleted }` |

POST パラメータ: `slug`, `content`, `format` (blocks/markdown), `blocks` (JSON), `status` (draft/published), `csrf`

### 5.2 リビジョン API

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=revisions&slug=xxx` | `{ slug, revisions: [{ timestamp }] }` |
| `POST` | `?api=revisions&slug=xxx` | `{ status: "ok", restored, timestamp }` |

### 5.3 検索 API（公開・認証不要）

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=search&q=xxx` | `{ query, results: [{ slug, snippet, format, status, updated_at }] }` |

公開ページのみ検索。スニペットは HTML タグ除去済み。

### 5.4 サイトマップ API（公開・認証不要）

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=sitemap` | sitemap.xml（公開ページのみ、Content-Type: application/xml） |

### 5.5 静的サイト生成 API

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `POST` | `?api=generate&csrf=xxx` | `{ status: "ok", pages: 数, output: "出力ディレクトリ" }` |

- 公開ページのみを対象に静的 HTML ファイルを生成する。
- 出力先: `dist/` ディレクトリ（プロジェクトルート直下）。
- 生成内容: 各ページの HTML（テーマ適用済み）、CSS、JS、sitemap.xml。
- blocks 形式ページは `renderBlocks()` で HTML に変換して出力。
- markdown 形式ページは `markdownToHtml()` で HTML に変換して出力。
- 認証必須（管理者のみ実行可能）。

### 5.6 エクスポート・インポート API

| メソッド | URL | レスポンス |
|---------|-----|-----------|
| `GET` | `?api=export` | JSON ファイルダウンロード（config（パスワード除外） + 全ページ） |
| `POST` | `?api=import&csrf=xxx` | `{ status: "ok", imported: { config, pages } }` |

---

## 6. TypeScript モジュール仕様

### 6.1 モジュール一覧

| モジュール | 説明 |
|-----------|------|
| `globals.d.ts` | グローバル型定義（csrfToken, autosize, markdownToHtml, HTMLElement.__editor） |
| `autosize.ts` | textarea 自動リサイズ（input/resize 追従、autosize:destroy でクリーンアップ） |
| `editor.ts` | ブロックエディタ本体（Editor クラス + ブロックツール + インラインツールバー） |
| `editInplace.ts` | インプレース編集統合（ブロックエディタ起動、format 切替、保存インジケーター） |
| `i18n.ts` | 多言語化（data/lang/*.json 非同期読み込み、i18n.ready Promise） |
| `markdown.ts` | Markdown→HTML 変換（17構文、コードブロックプレースホルダー方式） |
| `api.ts` | REST API クライアント（型付きメソッド、res.ok チェック優先） |

### 6.2 markdown.ts — 対応構文

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

### 6.3 editor.ts — ブロックエディタ仕様

#### 6.3.1 コンセプト

- **ブロックベース**: コンテンツを独立したブロック単位で管理
- **JSON 出力**: ブロックデータを構造化 JSON として保存
- **プラグイン型**: BlockToolFactory インターフェースでブロック追加可能
- **外部依存なし**: 純粋 TypeScript のみ

#### 6.3.2 ブロック型

| type | 説明 | data |
|------|------|------|
| `paragraph` | テキスト段落 | `{ text: string }` |
| `heading` | 見出し（h1-h3） | `{ text: string, level: 1\|2\|3 }` |
| `list` | リスト | `{ style: "unordered"\|"ordered", items: string[] }` |
| `code` | コードブロック | `{ code: string }` |
| `quote` | 引用 | `{ text: string }` |
| `delimiter` | 水平線 | `{}` |
| `image` | 画像（URL入力 + キャプション） | `{ url: string, caption?: string }` |

#### 6.3.3 エディタ API

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

#### 6.3.4 エディタ UI

- `+` ボタン: ツールボックス表示（i18n 対応ラベル）
- `▲▼` ボタン: ブロック上下移動
- `×` ボタン: ブロック削除
- **インラインツールバー**: テキスト選択時に太字(B) / 斜体(I) / リンク(🔗)
- **Enter**: 新規段落ブロック追加（リスト内では新 li）
- **Backspace**: 空ブロック削除、前ブロックにフォーカス
- **保存インジケーター**: ✓ 保存成功 / ✗ エラー（2秒後フェード）
- **レスポンシブ**: モバイルでツールバー横並び、インラインツールバー画面下部固定

---

## 7. 管理 UI 仕様

管理ツールは公開ページから完全に分離した専用 UI で提供する。

### 7.1 ルーティング

| URL | 画面 | 認証 |
|-----|------|:----:|
| `?admin` | ダッシュボード（ページ一覧 + サイト設定） | 必須 |
| `?admin=edit&page={slug}` | ページ編集（ブロックエディタ） | 必須 |
| `?admin=new` | 新規ページ作成 | 必須 |
| `?login` | ログイン画面 | 不要 |
| `?logout` | ログアウト処理 | 必須 |
| 通常 URL | 訪問者向け公開ページ（管理 UI なし） | 不要 |

### 7.2 ファイル構成

| ファイル | 役割 | 直接HTTPアクセス |
|---------|------|:---:|
| `admin-ui.php` | 管理 UI テンプレート | **禁止** |
| `themes/admin.css` | 管理 UI スタイルシート（ダークモード・レスポンシブ対応） | 許可 |

- 管理 UI は `admin-ui.php` で描画する。テーマの `theme.php` には管理コードを含めない。
- 公開ページ（`theme.php`）からは設定パネル・エディタ・format バーを完全に除去する。
- JS / CSS は管理 UI 専用に読み込む（公開ページには不要な管理用 JS を配信しない）。

### 7.3 ダッシュボード (`?admin`)

- **バージョン情報表示**: ヘッダーに `App::VERSION` を表示
- ページ一覧テーブル: slug, format, status, updated_at, 操作（編集 / 削除）
- 新規ページ作成ボタン
- サイト設定パネル: タイトル, 説明, キーワード, コピーライト, メニュー, テーマ, 言語
- エクスポート / インポートボタン
- 静的サイト生成ボタン（`dist/` に HTML 出力）

### 7.4 ページ編集 (`?admin=edit&page={slug}`)

- ブロックエディタ全画面表示
- format 切替バー（Blocks / Markdown）
- ステータス切替（公開 / 下書き）
- 保存ボタン + 自動保存インジケーター
- リビジョン一覧サイドバー（復元ボタン付き）
- ダッシュボードへの戻りリンク

### 7.5 新規ページ作成 (`?admin=new`)

- スラッグ入力フィールド
- format 選択（Blocks / Markdown）
- 作成ボタン → 編集画面へ遷移

---

## 8. 機能仕様

> 本セクションに記載の機能はすべて **Core 機能** とする。
> Core 機能は Adlaire Platform の基本構成要素であり、常に利用可能でなければならない。

### 8.1 コンテンツ管理

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
| 管理ツール専用 UI（専用テンプレート + CSS + ダークモード） | 実装済 |
| 静的サイト生成（dist/ 出力、サーバーサイド Markdown 変換） | 実装済 |

### 8.2 認証・セキュリティ

| 機能 | 状態 |
|------|:----:|
| bcrypt 認証（MD5 レガシー自動移行） | 実装済 |
| セッション管理（httponly, strict_mode, regenerate_id） | 実装済 |
| CSRF 保護（ワンタイムトークン） | 実装済 |
| ログイン試行回数制限（5回/5分） | 実装済 |
| ホスト名ホワイトリスト検証 | 実装済 |
| パス走査防止（validateSlug + basename） | 実装済 |
| XSS 対策（esc + json_encode エスケープ） | 実装済 |
| CORS 制限 | 実装済 |
| .htaccess アクセス制御（files/, data/, core.php, admin.php） | 実装済 |

### 8.3 多言語化（i18n）

| 機能 | 状態 |
|------|:----:|
| 日本語 (ja) / 英語 (en) | 実装済 |
| PHP 翻訳: `App::t(key, params)` | 実装済 |
| TypeScript 翻訳: `i18n.init()` / `i18n.t()` | 実装済 |
| エディタ UI ラベル i18n | 実装済 |
| 管理パネル言語切替 | 実装済 |

### 8.4 テーマ・プラグイン

| 機能 | 状態 |
|------|:----:|
| テーマ切替（AP-Default / AP-Adlaire） | 実装済 |
| テーマ安全性（basename + 存在チェック + フォールバック） | 実装済 |
| JS 一括読み込み（`$app->scriptTags()`） | 実装済 |
| プラグイン自動読み込み（`plugins/*/index.php`） | 実装済 |

### 8.5 URL ルーティング

| 機能 | 状態 |
|------|:----:|
| クリーン URL（.htaccess RewriteRule） | 実装済 |
| スラッグ変換（小文字化・スペース→ハイフン） | 実装済 |
| 404 ハンドリング（管理者は作成 UI、訪問者は 404） | 実装済 |

---

## 9. リリース計画

### 9.1 Ver.1.7 — 品質・安全性・管理UI強化

| # | カテゴリ | 改良点 | 状態 |
|---|---------|--------|:----:|
| 1 | バグ | ステータス保存ロジック修正（二重 API 呼び出し解消） | 実装済 |
| 2 | バグ | 「View Site」リンクの言語判定を `$app->language` ベースに変更 | 実装済 |
| 3 | バグ | `renderAdminNewPage` の不要な `csrf_token()` 呼び出し削除 | 実装済 |
| 4 | バグ | 静的生成のメニューリンクを正しい相対パスに修正 | 実装済 |
| 5 | バグ | `renderBlocksToHtml` の heading タグ計算を簡素化 | 実装済 |
| 6 | バグ | 管理 UI settings の CSRF ワンタイム問題を修正（トークン更新） | 実装済 |
| 7 | セキュリティ | ブロックデータの data 属性出力を安全なエンコーディングに変更 | 実装済 |
| 8 | 管理UI | ダッシュボードにページ削除ボタン追加 | 実装済 |
| 9 | 管理UI | ページ一覧のソート機能（更新日順） | 実装済 |
| 10 | 管理UI | インポート UI 追加（ファイルアップロード） | 実装済 |
| 11 | 管理UI | 設定フォームの保存フィードバック表示 | 実装済 |
| 12 | 管理UI | admin CSS を外部ファイルに分離 | 実装済 |
| 13 | コード品質 | `handleEdit` と `apiPageSave` の重複ロジック統一 | 実装済 |
| 14 | コード品質 | admin.php から不要な `settings()` メソッド削除 | 実装済 |
| 15 | コード品質 | `listPages()` にページインデックスキャッシュ導入 | Ver.2.3 延期 |

### 9.2 Ver.1.8 — 機能拡張・フロントエンド強化

| # | カテゴリ | 改良点 | 状態 |
|---|---------|--------|:----:|
| 16 | 新機能 | ページ並び順のドラッグ&ドロップ管理 | Ver.2.2 延期 |
| 17 | 新機能 | 管理 UI ダークモード対応 | 実装済 |
| 18 | 新機能 | ページプレビュー機能（下書きを公開レイアウトで確認） | Ver.2.2 延期 |
| 19 | 新機能 | サイドバー（subside）もブロックエディタで編集 | Ver.2.2 延期 |
| 20 | 新機能 | 静的生成で Markdown をサーバーサイド HTML 変換 | 実装済 |
| 21 | エディタ | ブロックのコピー＆ペースト（Ctrl+C/V） | Ver.2.1 延期 |
| 22 | エディタ | Undo/Redo 機能（Ctrl+Z/Y） | Ver.2.1 延期 |
| 23 | エディタ | ブロックのドラッグ&ドロップ並び替え | Ver.2.1 延期 |
| 24 | エディタ | heading ブロックのレベル変更 UI（h1/h2/h3 切替） | 実装済 |
| 25 | エディタ | list ブロックの順序/非順序切替 UI | 実装済 |
| 26 | フロント | 公開ページから管理用 JS を除外 | 実装済 |
| 27 | フロント | 静的サイト用軽量 CSS（エディタ CSS 除外） | Ver.2.2 延期 |
| 28 | データ | エクスポートにリビジョンを含むオプション | Ver.2.2 延期 |
| 29 | i18n | 管理 UI ラベル（Dashboard, Pages, Edit 等）の翻訳対応 | 実装済 |
| 30 | ドキュメント | RULEBOOK を Ver.1.7/1.8 の実装結果で更新 | 実装済 |

### 9.3 Ver.1.9 — 1.0系最終版（バグ修正38件）

バグ修正38件（Ver.1.9-29 で32件 + Ver.1.9-30 で6件）を実施し、1.0系の品質を確定。
詳細は `docs/CHANGES.md` を参照。

---

## 10. Ver.2.0 系リリース計画

### 10.1 Ver.2.0 — アーキテクチャ刷新（検討中）

> Ver.2.0 のアーキテクチャ刷新は方針として採用するが、具体的な設計は後日検討する。

| # | 改良点 | 状態 |
|---|--------|:----:|
| 1 | admin.php を App クラス（app.php）と API 関数（api.php）に分離 | 検討中 |
| 2 | ルーティングクラスの導入（Router） | 検討中 |
| 3 | FileStorage をインターフェース化（StorageInterface） | 検討中 |
| 4 | 設定クラスの導入（Config） | 検討中 |
| 5 | イベントフック基盤の刷新（EventDispatcher） | 検討中 |

### 10.2 Ver.2.1 — エディタ高度化

| # | 改良点 | 状態 |
|---|--------|:----:|
| 6 | Undo/Redo（Ctrl+Z/Y、履歴スタック） | 計画 |
| 7 | ブロック ドラッグ&ドロップ並び替え | 計画 |
| 8 | ブロック コピー&ペースト（Ctrl+C/V） | 計画 |
| 9 | heading レベルクリック切替（prompt → サイクル） | 計画 |
| 10 | list 順序/非順序トグルボタン（confirm → 即切替） | 計画 |

### 10.3 Ver.2.2 — 機能拡張

| # | 改良点 | 状態 |
|---|--------|:----:|
| 11 | ページ並び順管理（ダッシュボードでドラッグ、menu 反映） | 計画 |
| 12 | ページプレビュー（`?preview=slug` で下書きを公開レイアウト確認） | 計画 |
| 13 | サイドバー（subside）をブロックエディタで編集 | 計画 |
| 14 | エクスポートにリビジョンを含むオプション | 計画 |
| 15 | 静的サイト用軽量 CSS（エディタ CSS 除外の minimal.css） | 計画 |

### 10.4 Ver.2.3 — セキュリティ・パフォーマンス

| # | 改良点 | 状態 |
|---|--------|:----:|
| 16 | ページインデックスキャッシュ（pages.index.json） | 計画 |
| 17 | 静的生成の差分ビルド（変更ページのみ再生成） | 計画 |
| 18 | Content-Security-Policy ヘッダー | 計画 |
| 19 | セッション有効期限（自動ログアウト） | 計画 |
| 20 | パスワード強度検証 | 計画 |

### 10.5 Ver.2.4 — 品質・拡張性

| # | 改良点 | 状態 |
|---|--------|:----:|
| 21 | テスト基盤導入（PHPUnit + TS テスト） | 計画 |
| 22 | エラーハンドリング統一（カスタム例外 + JSON エラー） | 計画 |
| 23 | 言語ファイルのホットリロード | 計画 |
| 24 | 管理 UI の完全翻訳（全テキスト） | 計画 |
| 25 | テーマ設定ファイル（theme.json メタデータ） | 計画 |
