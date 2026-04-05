# Adlaire License Server — 変更履歴

## Ver.1.0 (2026-04-04)

- 初期実装
  - API ルーター（public/index.php）: register, verify, renew, third-party の4エンドポイント
  - 管理ダッシュボード（public/admin.php）: 登録一覧・詳細・失効・契約管理・監査ログ
  - Database.php: SQLite ラッパー（licenses, contracts, audit_log テーブル）
  - KeyGenerator.php: ASCMS-PRI / ASCMS-SEC / ASCMS-TPK キー生成
  - KeyValidator.php: リクエスト検証（システムキー形式・タイムスタンプ・JSON パース）
  - ApiHandler.php: API ハンドラー（レート制限・監査ログ付き）
  - Auth.php: 管理者認証（セッション + bcrypt）
