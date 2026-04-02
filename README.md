# Adlaire Platform（略：AP , 翻訳：アドレイル・プラットホーム）

**現在のバージョン: Ver.2.3-35**

APは、フラットファイルベースのCMSフレームワークです。データベース不要で、ブロックエディタによるコンテンツ編集、Markdown対応、多言語化、静的サイト生成を備えています。

## 主な機能

- **ブロックエディタ** — Editor.js ライクなブロック単位編集（7ブロック型）
- **Markdown対応** — ブロック ↔ Markdown の format 切替
- **管理ツール専用UI** — 公開ページから分離された管理ダッシュボード
- **フラットファイルCMS** — データベース不要、JSONベースのデータ管理
- **静的サイト生成** — `dist/` に HTML/CSS/JS を出力
- **REST API** — ページ CRUD、検索、リビジョン、エクスポート/インポート
- **多言語化（i18n）** — 日本語 / 英語対応
- **リビジョン管理** — 最大30世代の自動保存・復元
- **下書き / 公開** — ページステータス管理
- **セキュリティ** — bcrypt認証、CSRFワンタイムトークン、レートリミット

## Requirements

- PHP 8.3+
- Apache（mod_rewrite）
- Node.js 18+（ビルド時のみ / TypeScriptコンパイル用）

## インストール

```bash
npm install       # TypeScript依存のインストール
npm run build     # TypeScript → JavaScript コンパイル
```

1. ファイルをWebサーバーにアップロード
2. `files/` ディレクトリに書き込み権限(755)を設定
3. ブラウザでアクセスし、`?login` からログイン（初期パスワード: `admin`）
4. パスワードを速やかに変更
5. `?admin` から管理ダッシュボードにアクセス

## バージョン規則

`Ver.{Major}.{Minor}-{Build}` 形式。

- **Major**: 後方互換性のない変更。Minor を 0 にリセット。
- **Minor**: 後方互換性のある機能追加・改善。
- **Build**: 累積リビジョン番号。**リセット禁止**。すべてのリリースで単調増加。

## LICENSE

Licensed under Adlaire License, see [LICENSE](Licenses/LICENSE_Ver.1.0)

## Copyright

Copyright (c) 2014 - 2026 IEAS Group & AIZM All Rights Reserved.
