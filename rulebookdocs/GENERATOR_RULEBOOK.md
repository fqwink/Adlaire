# Adlaire Generator RULEBOOK

- 文書名: Adlaire Generator RULEBOOK
- 文書バージョン: Ver.1.0
- 作成日: 2026-04-02
- 対象製品: Adlaire Platform
- 文書種別: 静的サイト生成の仕様を定義する技術規範文書
- 文書目的: Adlaire の静的サイト生成機能に関する設計・API・制約を恒常的規範として定義する

---

# 1. 基本宣言

## 1.1 位置づけ

本 RULEBOOK は、Adlaire Platform の静的サイト生成機能に関する恒常的規範文書である。
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
├── style.css                # テーマ CSS
├── js/                      # JS（レンダリング用のみ）
│   ├── markdown.js
│   └── editInplace.js
├── data/lang/               # 翻訳ファイル
│   ├── ja.json
│   └── en.json
├── sitemap.xml              # サイトマップ（公開ページのみ）
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
| `handleApiGenerate(storage)` | `Core/generator.php` | 静的サイト生成 API ハンドラー。ページ一覧取得→変換→テーマ適用→ファイル出力→sitemap 生成 |
| `generatePageHtml(app, slug, contentHtml, theme)` | `Core/generator.php` | テーマテンプレートを適用した完全な HTML ページを生成 |

---

# 8. 制約・非スコープ

以下は本機能のスコープ外とする。

| 項目 | 理由 |
|------|------|
| CDN 連携・自動デプロイ | 外部サービス依存を避ける |
| インクリメンタルビルド（ファイル監視） | サーバーサイドでのファイル監視は不適切 |
| テンプレートエンジン切替 | theme.php による統一を維持 |
| RSS / Atom フィード生成 | 将来拡張として検討可能 |
| 画像最適化・リサイズ | 外部ツールの責務 |

---

# 9. 関連文書

| 文書 | 内容 |
|------|------|
| `ARCHITECTURE_RULEBOOK.md` | Core ファイル構成・セキュリティ基盤 |
| `API_RULEBOOK.md` §3.6 | generator.php 関数一覧 |
| `API_RULEBOOK.md` §4.6 | API エンドポイント一覧 |
| `CHARTER.md` | ルールブック憲章（最上位原則） |
