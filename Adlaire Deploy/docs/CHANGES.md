# CHANGES - 変更履歴

## Ver.1.9-10 (2026-04-06)

### Phase 10: 監査ログ・デプロイパイプライン並列化・モノレポ対応

* `src/audit.ts` — 監査ログ（AuditLog 型、KV 永続化、最大 10,000 件保持、非同期・非ブロッキング）
* `src/deployer.ts` — グローバルセマフォ並列化（max_parallel_deploys、デフォルト 4）、モノレポ root_dir 対応、監査ログ連携
* `src/proxy.ts` — `GET /api/audit` エンドポイント追加、start/stop/restart に監査ログ記録
* `src/cli.ts` — `audit` コマンド追加（--limit N, --project <id>）
* `src/types.ts` — ProjectConfig に root_dir 追加、DeployConfig に max_parallel_deploys 追加
* `src/config.ts` — Phase 10 マイグレーション（root_dir / max_parallel_deploys デフォルト値設定）

## Ver.1.8-9 (2026-04-06)

### Phase 9: 管理ダッシュボード Web UI

* `src/dashboard/server.ts` — ダッシュボード HTTP サーバー（ポート 8001、静的ファイル配信、セキュリティヘッダー、ログインページ）
* `src/dashboard/auth.ts` — セッション認証（64バイトトー���ン、24時間TTL、Cookie: HttpOnly/SameSite=Strict）
* `src/dashboard/api.ts` — ダッシュボード内部 API（CSRF 対策 X-Requested-With 必須）
* `src/dashboard/static/index.html` — プロジェクト一覧（状態表示・起動/停止/再起動操作）
* `src/dashboard/static/project.html` — プロジェクト詳細（ログビューア・デプロイ履歴・設定表示）
* `src/dashboard/static/cluster.html` — クラスタ状態（origin/edge ノード一覧・ヘルス状態）
* `src/types.ts` — DeployConfig に dashboard_port / dashboard_session_ttl 追加
* `src/main.ts` — ダッシュボードサーバー起動統合

## Ver.1.7-8 (2026-04-06)

### Phase 8: edge 自動回復

* `src/cluster.ts` — edge 自動回復（バックオフ付き再接続 10秒〜5分、設定再同期、自動再有効化）
* `src/types.ts` — ClusterConfig に auto_recovery_enabled / recovery_initial_delay / recovery_max_delay 追加
* EdgeHealthTracker に recovery_timer / recovery_delay_ms / manually_removed 追加

## Ver.1.6-7 (2026-04-06)

### Phase 7: ビルドステップ・ログ永続化・環境変数暗号化・デプロイ通知

* `src/build.ts` — ビルドステップ実行（シェルインジェクション対策、タイムアウト制御）
* `src/log_writer.ts` — ログ永続化（logs/{project-id}/{YYYY-MM-DD}.log、30日ローテーション）
* `src/env_crypto.ts` — 環境変数 AES-256-GCM 暗号化（HKDF 鍵導出、平文マイグレーション対応）
* `src/notify.ts` — デプロイ通知 Webhook（HMAC-SHA256 署名、3回リトライ）
* `src/deployer.ts` — ビルドステップ統合、デプロイ通知送信（成功/失敗）
* `src/types.ts` — ProjectConfig に build_command / build_timeout / log_retention_days / webhook_url / webhook_secret 追加
* `src/main.ts` — ログ永続化初期化・ローテーション・環境変数マイグレーション統合
* `src/logger.ts` — ログコールバック機構追加（SSE/永続化連携）

## Ver.1.5-6 (2026-04-06)

### Phase 6: ロールバック・ログ強化・ヘルスチェック・プライベートリポジトリ

* `src/rollback.ts` — ロールバック管理（スナップショット KV 保存・最大10件・git checkout）
* `src/sse.ts` — ログ SSE ストリーミング（Server-Sent Events、Bearer トークン認証、バッファ即時送信）
* `src/health_check.ts` — Worker ヘルスチェック & 自動再起動（30秒間隔、指数バックオフ 1〜60秒、最大5回）
* `src/credential.ts` — 認証情報ストア（PAT/SSH 鍵、AES-256-GCM 暗号化、HKDF 鍵導出）
* `src/deployer.ts` — ロールバック機能、スナップショット保存、プライベートリポジトリ認証統合
* `src/proxy.ts` — 管理 API に rollback / history / SSE stream / credential エンドポイント追加
* `src/cli.ts` — rollback / history / credential / logs --stream コマンド追加
* `src/types.ts` — ProjectConfig に health_check_* / auto_restart / max_restart_attempts 追加、DeployConfig に sse_token 追加

## Ver.1.4-5 (2026-04-06)

### Phase 5: 複数サーバー / エッジ

* DEPLOY_PLATFORM_RULEBOOK.md に Phase 5 詳細仕様を追記（P5.1〜P5.11）
* RELEASE_PLAN_RULEBOOK.md に Ver.1.4-5 計画を追加
* `src/types.ts` — EdgeNode, ClusterConfig, NodeHealth, NodeStatus, EdgeDeployResult 型追加、DeployConfig に cluster 追加、DeployRecord に edge_results 追加
* `src/cluster.ts` — クラスタ管理モジュール（ヘルスチェック 30 秒間隔・HMAC-SHA256 ノード間認証・設定同期・デプロイ伝播）
* `src/deployer.ts` — origin デプロイ成功時に edge 伝播を実行、ClusterManager 連携
* `src/proxy.ts` — 管理 API に /api/health・cluster/nodes・cluster/sync・cluster/sync-config・cluster/deploy エンドポイント追加
* `src/main.ts` — ClusterManager 初期化・ヘルスチェック開始・シャットダウン停止
* `src/config.ts` — デフォルト cluster: null、マイグレーション対応
* `src/cli.ts` — nodes / sync コマンド追加

## Ver.1.3-4 (2026-04-06)

### Phase 4: 環境変数・ログ

* DEPLOY_PLATFORM_RULEBOOK.md に Phase 4 詳細仕様を追記（P4.1〜P4.8）
* RELEASE_PLAN_RULEBOOK.md に Ver.1.3-4 計画を追加
* `src/types.ts` — Permissions, LogEntry 型追加、ProjectConfig に env/permissions 追加
* `src/logger.ts` — ログキャプチャモジュール（リングバッファ 1000 行、stdout/stderr 転送）
* `src/process_manager.ts` — 環境変数注入・動的権限フラグ構築・stdout/stderr piped + キャプチャ
* `src/proxy.ts` — 管理 API に env GET/PUT・logs GET エンドポイント追加
* `src/cli.ts` — env / env-set / logs コマンド追加
* `src/config.ts` — Phase 4 マイグレーション（env/permissions デフォルト値）
* `deno.json` — 変更なし（--unstable-kv は Phase 3 で追加済み）

## Ver.1.2-3 (2026-04-06)

### Phase 3: KV ストレージ

* DEPLOY_PLATFORM_RULEBOOK.md に Phase 3 詳細仕様を追記（P3.1〜P3.8）
* RELEASE_PLAN_RULEBOOK.md に Ver.1.2-3 計画を追加
* `src/types.ts` — DeployConfig に `data_dir` 追加、KvStats 型追加
* `src/config.ts` — デフォルト設定に `data_dir` 追加、マイグレーション対応
* `src/kv.ts` — KV 管理モジュール（プラットフォーム KV 開閉・プロジェクト KV 統計/削除）
* `src/deployer.ts` — デプロイ履歴を KV に永続化（メモリ → Deno KV）
* `src/process_manager.ts` — Worker 起動時に `DENO_KV_PATH` 環境変数と `--unstable-kv` を追加
* `src/proxy.ts` — 管理 API に KV stats/delete エンドポイント追加
* `src/cli.ts` — `kv-stats` / `kv-reset` コマンド追加
* `src/main.ts` — プラットフォーム KV 初期化・シャットダウン時クリーンアップ
* `deno.json` — serve/cli タスクに `--unstable-kv` フラグ追加

## Ver.1.1-2 (2026-04-06)

### Phase 2: Git 連携

* DEPLOY_PLATFORM_RULEBOOK.md に Phase 2 詳細仕様を追記（P2.1〜P2.8）
* RELEASE_PLAN_RULEBOOK.md に Ver.1.1-2 計画を追加
* `src/types.ts` — GitConfig, DeployState, DeployRecord 型を追加、ProjectStatus 拡張
* `src/deployer.ts` — デプロイパイプライン（git clone/pull → Worker 再起動・排他制御・履歴管理）
* `src/webhook.ts` — Webhook 受信ハンドラ（HMAC-SHA256 署名検証・GitHub push イベント解析）
* `src/proxy.ts` — 管理 API に webhook / deploys / 手動デプロイエンドポイントを追加
* `src/cli.ts` — deploy / deploys コマンド追加、add コマンドに --git-url / --git-branch / --webhook-secret オプション追加
* `src/main.ts` — Deployer 初期化統合
* `src/process_manager.ts` — ProjectStatus に git フィールドを追加

## Ver.1.0-1 (2026-04-06)

### Phase 1: 最小デプロイ基盤

* DEPLOY_PLATFORM_RULEBOOK.md に Phase 1 詳細仕様を追記（P1.1〜P1.8）
* RELEASE_PLAN_RULEBOOK.md を新設
* `src/types.ts` — 型定義（ProcessState, ProjectConfig, DeployConfig 等）
* `src/config.ts` — 設定管理（deploy.json 読み書き、プロジェクト追加・削除）
* `src/process_manager.ts` — プロセスマネージャ（Worker 起動・停止・再起動・状態管理）
* `src/proxy.ts` — リバースプロキシ（Host ベースルーティング）+ 管理 API
* `src/main.ts` — プラットフォームエントリポイント（serve コマンド）
* `src/cli.ts` — CLI エントリポイント（serve/add/remove/list/start/stop/restart/status）
* `deno.json` — Deno 設定・タスク定義

## Ver.1.0 (2026-04-05)

### 初版

* DEPLOY_PLATFORM_RULEBOOK.md を新設（Phase 0: ルールブック策定）
* プロジェクト構造を新設（CLAUDE.md, README.md, docs/, rulebookdocs/）
