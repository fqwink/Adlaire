# CHANGES - 変更履歴

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
