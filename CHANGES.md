# CHANGES - 変更履歴

## Ver.1.0-9 (2026-03-31)

* バージョン規則 `Ver.{Major}.{Minor}-{Build}` を導入

## Ver.1.0-8 (2026-03-31)

### バグ修正
* テーマ選択のパス走査脆弱性を修正（basename + 存在チェック + フォールバック）
* マイグレーションで内部管理ファイル（pages.meta.json, .htaccess）が誤移行される問題を修正
* loadPlugins() の getcwd() 失敗時に作業ディレクトリが破損する問題を修正

## Ver.1.0-5 (2026-03-31)

### ドキュメント更新
* README.md をアーキテクチャ・データ管理・要件に合わせて全面改訂
* CHANGES.md, RELEASE-NOTES.md を更新
* CLAUDE.md を作成

## Ver.1.0-4 (2026-03-31)

### JSONベースページデータ
* ページデータをJSON形式（content, created_at, updated_at）で保存
* 個別メタデータファイル（pages.meta.json）を廃止、各ページJSONに統合
* バックアップローテーションを最大9世代に変更

## Ver.1.0-3 (2026-03-31)

### FileStorage 強化
* 排他ロック付き設定更新（.config.lockによる同時書き込み保護）
* タイムスタンプ付きバックアップローテーション
* ページメタデータ追跡（created_at / updated_at）
* ページ一覧取得（listPages）・安全な削除（deletePage）機能追加
* スラッグ検証の集約（validateSlug）

## Ver.1.0-2 (2026-03-31)

### FileStorage データ管理レイヤー導入
* JSONベースのデータ管理システムを導入
* サイト設定をconfig.jsonに統合
* 原子的書き込み（一時ファイル→rename）によるデータ破損防止
* ページコンテンツをfiles/pages/に分離
* 旧フラットファイル形式からの自動マイグレーション

## Ver.1.0-1 (2026-03-31)

### コードベース近代化
* PHP 8.3+ strict_types対応
* セッションセキュリティ強化（httponly, strict_mode）
* CSRF保護の実装
* bcryptパスワードハッシュ（MD5レガシーからの自動移行付き）
* 入力サニタイズの強化

## Ver.0.1-0 (2014-10-10)

* DolphinsValley-Ver.β 初期リリース
