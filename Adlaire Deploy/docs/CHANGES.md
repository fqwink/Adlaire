# CHANGES - 変更履歴

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
