# Adlaire Architecture RULEBOOK

- 文書名: Adlaire Architecture RULEBOOK
- 文書バージョン: Ver.1.1
- 作成日: 2026-04-02
- 最終更新: 2026-04-02
- 対象製品: Adlaire Platform
- 文書種別: アーキテクチャ・ファイル構成・ビルド・セキュリティを定義する技術規範文書
- 文書目的: Adlaire のコアアーキテクチャ、ファイル構成、TypeScript/JS 規約、ビルドプロセス、セキュリティ基盤を恒常的規範として定義する

---

# 1. 基本宣言

## 1.1 位置づけ

本 RULEBOOK は、Adlaire Platform のコアアーキテクチャに関する恒常的規範文書である。
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

ルート配置2ファイル + `Core/` ディレクトリ7ファイルで構成する。

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
| `Core/app.php` | App クラス（設定, 認証, 翻訳, 描画, プラグイン） |
| `Core/renderer.php` | サーバーサイド描画関数（renderBlocksToHtml, renderMarkdownToHtml） |
| `Core/api.php` | REST API ルーター + 全ハンドラー + handleEdit |
| `Core/generator.php` | 静的サイト生成（handleApiGenerate, generatePageHtml） |
| `Core/admin-ui.php` | 管理 UI テンプレート |

> **設計判断**: 認証メソッドは App クラスのプライベートメソッドとして密結合しているため、
> 分離せず app.php に統合。content() / menu() も App クラスに残留。
> 「複雑性より整合性」の原則に基づく。

## 2.3 require 順序（index.php）

```php
require 'Core/helpers.php';    // esc, csrf（依存なし）
require 'Core/core.php';       // FileStorage（helpers に依存）
require 'Core/app.php';        // App クラス（helpers, core に依存）
require 'Core/renderer.php';   // 描画関数（helpers に依存）
require 'Core/api.php';        // API ハンドラー（全てに依存）
require 'Core/generator.php';  // 静的生成（全てに依存）
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
    └── install.lock           # インストール済みフラグ
```

## 3.2 アクセス制御

- `data/lang/` のみ公開アクセスを許可する（TypeScript i18n モジュールが非同期読み込みするため）。
- それ以外の `data/` 内ファイルは `.htaccess` で保護する。

---

# 4. TypeScript / JavaScript 規約

## 4.1 基本方針

- **TypeScript を全面的に採用する**。JavaScript の直接記述は禁止。
- **TypeScript バージョンは 5 系に固定**（`~5.8`）。メジャーバージョン 6 以降への更新は別途検討。
- すべての JavaScript は **TypeScript からのコンパイル生成を義務化** する。

## 4.2 ディレクトリ配置

- TypeScript ソース: `ts/` ディレクトリ
- コンパイル済み JavaScript: `js/` ディレクトリ（自動生成）
- `js/` 内のファイルを手動編集することを禁止する。

## 4.3 ビルド手順

```bash
npm install       # 初回のみ
npm run build     # TypeScript → JavaScript コンパイル（tsc）
```

- 本番環境に Node.js ビルドを持ち込まない（DIRECTION_RULEBOOK.md §7.3 準拠）。
- ビルド済みリリース物が配置済みであることを前提とする。

---

# 5. プロジェクト構成

```
Adlaire/
├── index.php                  # エントリーポイント
├── bundle-installer.php       # セットアップツール（初回のみ）
├── .htaccess                  # Apache URL書き換え・アクセス制御
├── Core/                      # Core 基盤（直接HTTPアクセス禁止）
│   ├── helpers.php            #   ヘルパー関数
│   ├── core.php               #   FileStorage クラス
│   ├── app.php                #   App クラス
│   ├── renderer.php           #   サーバーサイド描画関数
│   ├── api.php                #   REST API ハンドラー
│   ├── generator.php          #   静的サイト生成
│   └── admin-ui.php           #   管理 UI テンプレート
├── ts/                        # TypeScript ソース
│   ├── globals.d.ts           #   グローバル型定義
│   ├── autosize.ts            #   textarea 自動リサイズ
│   ├── editor.ts              #   ブロックエディタ
│   ├── editInplace.ts         #   インプレース編集・format 切替
│   ├── i18n.ts                #   多言語化モジュール
│   ├── markdown.ts            #   Markdown→HTML コンバーター
│   └── api.ts                 #   REST API クライアント
├── js/                        # コンパイル済み JavaScript（自動生成）
├── data/                      # データストレージ
│   ├── lang/                  #   翻訳ファイル（JSON、公開許可）
│   ├── config.json            #   サイト設定
│   ├── pages/{slug}.json      #   ページデータ
│   ├── pages.index.json       #   ページインデックスキャッシュ
│   ├── revisions/{slug}/      #   リビジョン履歴
│   ├── backups/               #   設定バックアップ
│   └── system/install.lock    #   インストール済みフラグ
├── themes/                    # テーマディレクトリ
│   ├── AP-Default/            #   theme.php + style.css
│   ├── AP-Adlaire/            #   theme.php + style.css
│   └── admin.css              #   管理 UI スタイルシート
├── dist/                      # [生成] 静的サイト出力ディレクトリ
├── plugins/                   # [実行時生成] プラグインディレクトリ
├── package.json / tsconfig.json
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
│   └── RELEASE_PLAN_RULEBOOK.md     # リリース計画
├── docs/                      # ドキュメントフォルダ
│   └── CHANGES.md             #   変更履歴
└── Licenses/
```

---

# 6. セキュリティ基盤

> セキュリティ基盤は **Core の責務** である。
> 本セクションは設計方針・仕組みを定義する。
> 実装状態の一覧は `API_RULEBOOK.md` §7.2 を参照。

## 6.1 認証

- 管理者パスワードは **bcrypt** でハッシュ保存する（`password_hash()`）。
- MD5 レガシーパスワードは初回認証時に bcrypt へ自動移行する。
- パスワード変更時の最低要件: 8文字以上、弱いパスワード（admin, password, 12345678 等）を拒否。

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

# 7. 不採用項目

以下は採用しない。将来必要に応じて再検討。

| 項目 | 理由 |
|------|------|
| Router クラス | 現在の if/match 分岐で十分。複雑性を増やさない |
| StorageInterface | FileStorage 以外の実装予定がない。必要になった時に導入 |
| Config クラス | $config 配列で十分機能している |
| EventDispatcher | $hooks 配列で十分。プラグイン基盤の需要が出てから検討 |
| auth.php 分離 | App クラスの認証メソッドは密結合。分離は整合性を損なう |

---

# 8. バージョン規則・廃止ポリシー

> `CHARTER.md` §5（バージョン規則）および §6（廃止ポリシー）を参照。
> 本 RULEBOOK ではこれらを重複定義しない。

---

# 9. 最終規則

## 9.1 上位規範性

本 RULEBOOK は、Adlaire のアーキテクチャに関する上位規範文書である。

## 9.2 優先適用

アーキテクチャに関して個別提案、実装都合と本 RULEBOOK が衝突する場合、本 RULEBOOK を優先しなければならない。

## 9.3 改訂条件

本 RULEBOOK を改訂する場合は、ファイル構成、セキュリティ、ビルドプロセスへの影響を明示しなければならない。


> 改訂履歴は `REVISION_HISTORY.md` を参照。
