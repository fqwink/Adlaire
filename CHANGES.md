# CHANGES - 変更履歴

## Ver.1.2-13 (2026-03-31)

### 3ファイル分割
* index.php を core.php（コア）、admin.php（管理ツール）、index.php（エントリーポイント）に分割
* core.php: FileStorage クラス、ヘルパー関数（esc, csrf_token, csrf_verify）
* admin.php: App クラス、handleEdit 関数
* index.php: セッション初期化、require、ブートストラップのみ
* .htaccess で core.php, admin.php, data/ への直接アクセスをブロック

### i18n TypeScript 再実装・JSONデータ移動
* 翻訳ファイルを PHP アレイから JSON に変換
* ts/i18n.ts TypeScript モジュール追加（fetch + t() ヘルパー）
* 翻訳ファイルを data/lang/ に移動

### バグ修正（7件）
* settings() の chdir による cwd 破損を修正
* handleEdit() のエラーメッセージを HTTP 500 に修正
* plainTextEdit の blur 二重発火を防止
* i18n.ts のコメント旧パス参照を修正
* 空文字パスワードハッシュを未初期化として処理
* メニュー項目の空白・空エントリをスキップ
* CSRF トークンを json_encode でエスケープ

## Ver.1.2-11 (2026-03-31)

### 多言語化（i18n）・レガシーコード削除
* 日本語（ja）・英語（en）の2言語対応を実装
* 翻訳ファイル: lang/ja.php, lang/en.php（PHPアレイ形式）
* App::t() 翻訳ヘルパーメソッド（:name パラメータ置換対応）
* 管理パネルに言語切替セレクターを追加（設定→言語）
* 全ユーザー向け文字列を翻訳キーに置換
* テーマの `<html lang="">` 属性を動的化
* FileStorage CONFIG_KEYS に `language` を追加
* レガシーファイル削除: js/editInplace.php, js/rte.php

## Ver.1.1-10 (2026-03-31)

### jQuery廃止・TypeScript採用
* jQuery依存を完全廃止、vanilla JavaScriptに移行
* TypeScriptを全面採用、コンパイル済みJSのみを配信
* autosize: jQuery プラグインを vanilla TS で書き直し（ts/autosize.ts）
* editInplace: jQuery ベースのインプレース編集を vanilla TS で書き直し（ts/editInplace.ts）
* fieldSave: $.post を fetch API に置換
* テーマテンプレートからjQuery CDN読み込みを削除
* tsconfig.json / package.json によるビルド環境整備
* コンパイル出力: js/dist/autosize.js, js/dist/editInplace.js

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
