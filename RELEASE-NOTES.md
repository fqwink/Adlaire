# RELEASE-NOTES - リリースノート

### Ver.1.2-13 (2026-03-31)

* index.php を core.php / admin.php / index.php の3ファイルに分割
* i18n を TypeScript + JSON で再実装、data/lang/ に移動
* バグ修正7件（cwd破損、二重保存、XSS対策強化 等）

### Ver.1.2-11 (2026-03-31)

* 多言語化（日本語・英語）を実装
* 管理パネルから言語切替可能
* レガシーjQuery JSファイルを削除

### Ver.1.1-10 (2026-03-31)

* jQuery完全廃止、TypeScript全面採用
* autosize, editInplace, fieldSave を vanilla TypeScript で再実装
* fetch API によるAJAX通信、DOM API によるUI操作
* TypeScriptコンパイル→JavaScript生成の開発フロー確立

### Ver.1.0-9 (2026-03-31)

* バージョン規則 `Ver.{Major}.{Minor}-{Build}` を導入
* App::VERSION 定数を追加
* Build番号は累積のみ（リセット禁止）

### Ver.1.0-8 (2026-03-31)

* バグ修正3件: テーマパス走査、マイグレーション誤移行、cwd破損

### Ver.1.0-5 (2026-03-31)

* ドキュメント全面改訂、CLAUDE.md作成

### Ver.1.0-4 (2026-03-31)

* ページデータをJSON形式に変更、バックアップ9世代

### Ver.1.0-3 (2026-03-31)

* 排他ロック、バックアップローテーション、ページメタデータ、ページ一覧・削除

### Ver.1.0-2 (2026-03-31)

* FileStorageクラスによるフラットファイルデータ管理レイヤーを導入

### Ver.1.0-1 (2026-03-31)

* PHP 8.3+対応、セキュリティ強化リファクタリング

### Ver.0.1-0 (2014-10-10)

* Initial release 初期リリース
