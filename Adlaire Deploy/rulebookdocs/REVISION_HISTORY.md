# Adlaire Deploy — 改訂履歴

> ルールブック改訂履歴を管理する文書。

---

## DEPLOY_PLATFORM_RULEBOOK.md（プラットフォーム仕様）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.1.0 | 2026-04-05 | 初版: 製品定義、Deno Deploy 比較、エコシステム関係、コア機能5件（Deno ランタイム・ゼロコンフィグデプロイ・KV ストレージ・環境変数管理・ログ監視）、保留項目8件、アーキテクチャ（単一ノード/複数サーバー/エッジ）、技術スタック（Deno/Deno KV/Deno サブプロセス）、開発フェーズ Phase 0-5 を定義 |
| Ver.1.1 | 2026-04-06 | Phase 1 詳細仕様を追記: プラットフォーム設定（deploy.json）、プロジェクト設定（ProjectConfig）、プロジェクト ID 規則、プロセスマネージャ（状態遷移・起動コマンド・停止処理・異常終了検知）、リバースプロキシ（Host ベースルーティング・転送ヘッダー・エラーレスポンス）、CLI コマンド体系（serve/add/remove/list/start/stop/restart/status）、管理 API、ディレクトリ構成、Deno 設定、制約事項を定義 |
| Ver.1.2 | 2026-04-06 | Phase 2 詳細仕様を追記: Git リポジトリ連携（ProjectConfig 拡張・GitConfig）、Webhook 受信（HMAC-SHA256 署名検証・GitHub 互換）、デプロイパイプライン（clone/pull→再起動・排他制御・状態遷移）、デプロイ履歴（メモリ内保持・最大50件）、管理 API 追加（webhook・deploys・手動デプロイ）、CLI 拡張（deploy/deploys コマンド・add オプション拡張）、制約事項を定義 |
| Ver.1.5 | 2026-04-06 | Phase 5 詳細仕様を追記: マルチノード構成（origin/edge ロール・最大10台）、ClusterConfig（ノード登録・共有シークレット）、ノード間 HMAC-SHA256 認証、ヘルスチェック（30秒間隔・healthy/unhealthy/unknown）、設定同期（origin→edge プッシュ・冪等性）、デプロイ伝播（並列非同期・EdgeDeployResult）、管理 API 追加（cluster/nodes・sync・sync-config・deploy）、CLI 拡張（nodes・sync）、制約事項を定義 |
| Ver.1.4 | 2026-04-06 | Phase 4 詳細仕様を追記: 環境変数管理（ProjectConfig 拡張・env フィールド・禁止名・優先順位）、Worker 権限設定（Permissions 型・デフォルト権限・動的フラグ構築）、ログキャプチャ（piped モード・リングバッファ 1000 行・LogEntry）、管理 API 追加（env GET/PUT・logs GET）、CLI 拡張（env/env-set/logs コマンド）、制約事項を定義 |
| Ver.1.3 | 2026-04-06 | Phase 3 詳細仕様を追記: プロジェクト別 KV ストレージ（分離 KV ファイル）、プラットフォーム KV（platform.kv）、DeployConfig 拡張（data_dir）、Worker への KV パス注入（DENO_KV_PATH・--unstable-kv）、デプロイ履歴永続化、管理 API 追加（kv stats・kv reset）、CLI 拡張（kv-stats・kv-reset）、制約事項を定義 |
