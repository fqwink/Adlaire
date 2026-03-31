# CHANGES - 変更履歴

## Adlaire Platform (2026-03-31)

### FileStorage データ管理レイヤー導入
* JSONベースのデータ管理システムを導入
* ページデータをJSON形式（content, created_at, updated_at）で保存
* サイト設定をconfig.jsonに統合
* 原子的書き込み（一時ファイル→rename）によるデータ破損防止
* 排他ロック付き設定更新（.config.lockによる同時書き込み保護）
* タイムスタンプ付き最大9世代のバックアップローテーション
* ページ一覧取得（listPages）・安全な削除（deletePage）機能追加
* スラッグ検証の集約（validateSlug）
* 旧フラットファイル形式からの自動マイグレーション

### コードベース近代化
* PHP 8.3+ strict_types対応
* セッションセキュリティ強化（httponly, strict_mode）
* CSRF保護の実装
* bcryptパスワードハッシュ（MD5レガシーからの自動移行付き）
* 入力サニタイズの強化

## AdlairePlatform Ver.β (2014-10-10)

* DolphinsValley-Ver.β RELEASE
