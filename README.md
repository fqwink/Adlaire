# Adlaire Static CMS（略：ASCMS / アドレイル・スタティックCMS）

**現在のバージョン: Ver.3.0-47**

Adlaire は、日本語圏で扱いやすい軽量フラットファイル CMS であり、編集のしやすさと静的配信の安全性を両立することを目的とする。

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
- **セキュリティ** — bcrypt認証、CSRFワンタイムトークン、レートリミット、APIキー認証
- **CI/CD** — GitHub Actions による自動品質チェック・自動リリース

## Requirements

- PHP 8.3+
- Apache（mod_rewrite）
- Deno 2.x（ビルド時のみ / TypeScript コンパイル・バンドル用）

## ビルド

```bash
deno task build   # TypeScript → JavaScript バンドル（js/admin.js + js/public.js）
deno task check   # 型チェックのみ
deno task watch   # ウォッチモード（開発時）
```

## インストール

1. 公式サイトからリリース ZIP をダウンロード
2. ファイルを Web サーバーにアップロード
3. `data/` ディレクトリに書き込み権限(755)を設定
4. ブラウザでアクセスすると `bundle-installer.php` が起動
5. セットアップウィザードに従いサイト名・管理者アカウントを設定
6. `?admin` から管理ダッシュボードにアクセス

## バージョン規則

`Ver.{Major}.{Minor}-{Build}` 形式。

- **Major**: 後方互換性のない変更。Minor を 0 にリセット。
- **Minor**: 後方互換性のある機能追加・改善。
- **Build**: 累積リビジョン番号。**リセット禁止**。すべてのリリースで単調増加。

## LICENSE

Licensed under Adlaire License Ver.2.0, see [LICENSE](Licenses/LICENSE_Ver.2.0)

## Copyright

Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏 All Rights Reserved.
