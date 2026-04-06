# Adlaire Deploy Platform RULEBOOK

- 文書名: Adlaire Deploy Platform RULEBOOK
- 文書バージョン: Ver.1.0
- 作成日: 2026-04-05
- 対象製品: Adlaire Deploy
- 文書種別: プラットフォーム設計・アーキテクチャ・機能仕様を定義する技術規範文書
- 文書目的: Adlaire Deploy のコア機能、アーキテクチャ、開発フェーズを恒常的規範として定義する

---

# 1. 基本宣言

## 1.1 位置づけ

本 RULEBOOK は、Adlaire Deploy のプラットフォーム設計に関する恒常的規範文書である。
特定バージョンに従属せず、すべての開発判断に適用される。

## 1.2 製品定義

Adlaire Deploy は、**VPS・オンプレミスで構築可能な、Deno ベースのセルフホスト型デプロイプラットフォーム**である。

Deno Deploy の思想（TypeScript ネイティブ・ゼロコンフィグ・即時デプロイ）を継承しつつ、クラウドに依存しない自前運用を前提とする。

## 1.3 参考モデル

- **Deno Deploy** を主要な参考モデルとする。
- 一部独自仕様を含める予定。独自仕様は本 RULEBOOK に策定後に実装する。

## 1.4 ルールブック規律

- **Adlaire のルールブック規律を全面的に適用する。**
- 上位原則は Adlaire 本体の `CHARTER.md` に従う。
- RULEBOOK に記載のない機能を実装してはならない。
- バグ修正ポリシー・ドキュメント命名規則等もすべて同一基準で適用する。

## 1.5 ソースコード管理

- Adlaire 統合リポジトリ（`fqwink/Adlaire`）内の `Adlaire Deploy/` ディレクトリで管理する。

---

# 2. Deno Deploy との比較

| 比較 | Deno Deploy | Adlaire Deploy |
|------|------------|----------------|
| 運用形態 | Deno 社のクラウド | VPS / オンプレミス自前構築 |
| ランタイム | Deno（エッジ） | Deno（**単一/複数サーバー/エッジ**） |
| 依存 | Deno 社インフラ | **自前サーバーのみ** |
| 課金 | Deno 社の従量課金 | **自前サーバーコストのみ** |
| カスタマイズ | 不可 | **独自仕様可能** |

---

# 3. Adlaire エコシステムとの関係

Adlaire Deploy は、全 Adlaire プロジェクトの実行基盤として機能し、ドッグフーディングの最上位層を担う。

| プロジェクト | Adlaire Deploy 上での役割 |
|-------------|-------------------------|
| Adlaire Static CMS | 公式サイトのホスティング・静的配信 |
| Adlaire License Server | ライセンス API のホスティング |
| Adlaire BaaS | BaaS ランタイム基盤 |
| 外部プロジェクト | 汎用 Deno アプリのデプロイ先 |

---

# 4. コア機能

| 機能 | 概要 |
|------|------|
| **Deno ランタイム** | TypeScript / JavaScript をネイティブ実行 |
| **ゼロコンフィグデプロイ** | Git push → 自動ビルド → 自動デプロイ |
| **KV ストレージ** | Deno KV 互換のキーバリューストア |
| **環境変数管理** | プロジェクト単位の環境変数設定 |
| **ログ・監視** | リアルタイムログストリーム、ヘルスチェック |

---

# 5. 保留項目

以下はコア機能確定後に再評価する。実装着手には本 RULEBOOK への仕様追記が必須。

| 項目 | 備考 |
|------|------|
| TLS 自動化（Let's Encrypt） | 時期未定 |
| 静的サイトホスティング | 独自仕様として将来検討 |
| PHP ランタイム対応 | 独自仕様として将来検討 |
| npm: 禁止の強制 | 独自仕様として将来検討 |
| ライセンス統合 | 独自仕様として将来検討 |
| マルチプロジェクト管理 | 独自仕様として将来検討 |
| 管理ダッシュボード | 独自仕様として将来検討 |
| 監査ログ | 独自仕様として将来検討 |

---

# 6. アーキテクチャ

## 6.1 単一ノード構成

```
┌─────────────────────────────────────┐
│        Adlaire Deploy ノード         │
│                                     │
│  ┌───────────┐  ┌────────────────┐  │
│  │リバースプロキシ│  │プロセスマネージャ│  │
│  └─────┬─────┘  └───────┬────────┘  │
│        │                │           │
│  ┌─────┴────────────────┴────────┐  │
│  │         ランタイム層           │  │
│  │  ┌──────────────────────────┐ │  │
│  │  │      Deno Worker(s)      │ │  │
│  │  └──────────────────────────┘ │  │
│  └───────────────────────────────┘  │
│        │                            │
│  ┌─────┴─────────────────────────┐  │
│  │         ストレージ層           │  │
│  │  ┌────────┐  ┌────────────┐   │  │
│  │  │Deno KV │  │FS (静的)   │   │  │
│  │  └────────┘  └────────────┘   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 6.2 複数サーバー / エッジ構成

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  ノード A  │  │  ノード B  │  │  ノード C  │
│ (origin)  │←→│  (edge)   │←→│  (edge)   │
└──────────┘  └──────────┘  └──────────┘
```

---

# 7. 技術スタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| プラットフォーム本体 | **Deno (TypeScript)** | ランタイムとプラットフォームの一致 |
| リバースプロキシ | **Deno 自前実装** | 外部依存最小化 |
| KV ストレージ | **Deno KV** (SQLite バックエンド) | Deno Deploy 互換 |
| プロセス管理 | **Deno サブプロセス** | 外部依存最小化 |

---

# 8. 開発フェーズ

| Phase | 内容 |
|:-----:|------|
| 0 | **ルールブック策定**（本文書。CHARTER.md §1 準拠） |
| 1 | **最小デプロイ基盤** — Deno Worker 起動・停止、リクエストルーティング |
| 2 | **Git 連携** — push → 自動デプロイ（Webhook） |
| 3 | **KV ストレージ** — Deno KV 互換 API |
| 4 | **環境変数・ログ** — プロジェクト単位の設定管理、ログストリーム |
| 5 | **複数サーバー / エッジ** — ノード間同期、リクエスト分散 |

---

# Phase 1 詳細仕様 — 最小デプロイ基盤

## P1.1 スコープ

Phase 1 は以下の機能を提供する。

1. **プロジェクト設定** — JSON ベースのプロジェクト定義
2. **プロセスマネージャ** — Deno サブプロセスの起動・停止・再起動
3. **リバースプロキシ** — ホスト名ベースのリクエストルーティング
4. **CLI** — プラットフォーム操作のコマンドラインインターフェース

Phase 1 では以下を**対象外**とする（Phase 2 以降）。

- Git 連携・自動デプロイ
- KV ストレージ
- 環境変数管理
- ログストリーム
- マルチノード / エッジ
- TLS 自動化
- 管理ダッシュボード

## P1.2 ディレクトリ構成

```
Adlaire Deploy/
├── src/
│   ├── main.ts              # プラットフォームエントリポイント
│   ├── cli.ts               # CLI エントリポイント
│   ├── process_manager.ts   # プロセスマネージャ
│   ├── proxy.ts             # リバースプロキシ
│   ├── config.ts            # 設定管理
│   └── types.ts             # 型定義
├── deno.json                # Deno 設定
├── deploy.json              # プラットフォーム設定（自動生成）
├── projects/                # プロジェクト配置ディレクトリ（自動生成）
├── CLAUDE.md
├── README.md
├── rulebookdocs/
└── docs/
```

## P1.3 プラットフォーム設定

### P1.3.1 設定ファイル（`deploy.json`）

プラットフォーム全体の設定を管理する。初回起動時に自動生成される。

```json
{
  "version": 1,
  "host": "0.0.0.0",
  "port": 8000,
  "projects_dir": "./projects",
  "projects": {}
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|------|:----:|------|
| `version` | `number` | ○ | 設定フォーマットバージョン。固定値 `1` |
| `host` | `string` | ○ | リバースプロキシのバインドアドレス |
| `port` | `number` | ○ | リバースプロキシのバインドポート |
| `projects_dir` | `string` | ○ | プロジェクト配置ディレクトリパス |
| `projects` | `Record<string, ProjectConfig>` | ○ | プロジェクト定義マップ（キー = プロジェクト ID） |

### P1.3.2 プロジェクト設定（`ProjectConfig`）

```json
{
  "projects": {
    "my-app": {
      "hostname": "my-app.example.com",
      "entry": "main.ts",
      "port": 3001,
      "auto_start": true
    }
  }
}
```

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|------|:----:|:----------:|------|
| `hostname` | `string` | ○ | — | ルーティング対象のホスト名 |
| `entry` | `string` | ○ | — | エントリポイントファイル（`projects_dir/{id}/` からの相対パス） |
| `port` | `number` | ○ | — | Worker がリッスンするポート番号 |
| `auto_start` | `boolean` | — | `true` | プラットフォーム起動時に自動起動するか |

### P1.3.3 プロジェクト ID 規則

- 英小文字・数字・ハイフンのみ許可: `/^[a-z0-9][a-z0-9-]*[a-z0-9]$/`
- 最小 2 文字、最大 63 文字
- 先頭・末尾にハイフン禁止

## P1.4 プロセスマネージャ

### P1.4.1 責務

- Deno サブプロセスのライフサイクル管理（起動・停止・再起動）
- プロセス状態の追跡
- 異常終了時の検知

### P1.4.2 プロセス状態

```
stopped → starting → running → stopping → stopped
                 ↘ failed
```

| 状態 | 説明 |
|------|------|
| `stopped` | 停止中 |
| `starting` | 起動処理中 |
| `running` | 正常稼働中 |
| `stopping` | 停止処理中 |
| `failed` | 起動失敗または異常終了 |

### P1.4.3 Worker 起動コマンド

```
deno run --allow-net --allow-read --allow-env {entry}
```

- Worker は指定された `port` で `Deno.serve()` を用いて HTTP サーバーを起動する前提。
- Worker プロセスの標準出力・標準エラーはプラットフォームの標準出力に転送する。

### P1.4.4 停止処理

1. プロセスに SIGTERM を送信する。
2. 5 秒以内に終了しない場合、SIGKILL を送信する。

### P1.4.5 異常終了検知

- Worker プロセスが予期せず終了した場合、状態を `failed` に遷移させる。
- Phase 1 では自動再起動は行わない（手動再起動のみ）。

## P1.5 リバースプロキシ

### P1.5.1 責務

- 受信 HTTP リクエストの `Host` ヘッダーに基づくルーティング
- リクエストの Worker への転送とレスポンスの返却

### P1.5.2 ルーティングロジック

1. 受信リクエストの `Host` ヘッダーを取得する。
2. `projects` 内で一致する `hostname` を検索する。
3. 一致するプロジェクトが見つかり、かつ `running` 状態の場合、`http://127.0.0.1:{port}` に転送する。
4. 一致しない場合、または Worker が `running` でない場合、`502 Bad Gateway` を返す。

### P1.5.3 転送ヘッダー

転送時に以下のヘッダーを付与する。

| ヘッダー | 値 |
|---------|-----|
| `X-Forwarded-For` | クライアント IP |
| `X-Forwarded-Host` | 元の `Host` ヘッダー値 |
| `X-Forwarded-Proto` | `http` または `https` |

### P1.5.4 エラーレスポンス

| 状況 | ステータス | ボディ |
|------|:----------:|--------|
| ホスト名不一致 | `502` | `{"error": "no_route", "message": "No project found for this hostname"}` |
| Worker 非稼働 | `502` | `{"error": "worker_unavailable", "message": "Worker is not running"}` |
| Worker 転送失敗 | `502` | `{"error": "proxy_error", "message": "Failed to connect to worker"}` |

レスポンスの `Content-Type` は `application/json` とする。

## P1.6 CLI

### P1.6.1 コマンド体系

```
adlaire-deploy <command> [options]
```

| コマンド | 説明 |
|---------|------|
| `serve` | プラットフォームを起動する（リバースプロキシ + auto_start プロジェクト） |
| `add <id>` | 新規プロジェクトを追加する |
| `remove <id>` | プロジェクトを削除する（設定のみ。ファイルは削除しない） |
| `list` | プロジェクト一覧を表示する |
| `start <id>` | 指定プロジェクトの Worker を起動する |
| `stop <id>` | 指定プロジェクトの Worker を停止する |
| `restart <id>` | 指定プロジェクトの Worker を再起動する |
| `status [id]` | プロジェクトの状態を表示する（ID 省略時は全プロジェクト） |

### P1.6.2 `serve` コマンド

```
adlaire-deploy serve [--port <number>] [--host <string>]
```

1. `deploy.json` を読み込む（存在しない場合はデフォルト値で自動生成）。
2. リバースプロキシを起動する。
3. `auto_start: true` のプロジェクトを順次起動する。
4. シグナル（SIGINT / SIGTERM）を受信したら、全 Worker を停止後にプラットフォームを終了する。

### P1.6.3 `add` コマンド

```
adlaire-deploy add <id> --hostname <hostname> --entry <entry> --port <port> [--no-auto-start]
```

1. プロジェクト ID のバリデーション（P1.3.3 準拠）。
2. `projects_dir/{id}/` ディレクトリの存在確認。存在しない場合は作成する。
3. `deploy.json` にプロジェクト設定を追加し保存する。

### P1.6.4 `remove` コマンド

```
adlaire-deploy remove <id>
```

1. `deploy.json` からプロジェクト設定を削除する。
2. プロジェクトディレクトリは**削除しない**（手動削除を要する）。

### P1.6.5 `list` コマンド

テーブル形式で出力する。

```
ID          HOSTNAME              PORT  AUTO_START
my-app      my-app.example.com    3001  true
api-server  api.example.com       3002  true
```

### P1.6.6 `start` / `stop` / `restart` コマンド

- `serve` 実行中のプラットフォームプロセスとの通信は Phase 1 では対象外とする。
- `serve` コマンド内で CLI 引数による直接制御は行わない。
- `start` / `stop` / `restart` は **`serve` プロセス内の管理 API** 経由で実行する。

### P1.6.7 管理 API

`serve` 起動時に管理用 HTTP サーバーを内部ポート（`port + 1`、デフォルト `8001`）で起動する。
外部公開は行わず、`127.0.0.1` のみバインドする。

| メソッド | パス | 説明 |
|---------|------|------|
| `POST` | `/api/projects/{id}/start` | Worker 起動 |
| `POST` | `/api/projects/{id}/stop` | Worker 停止 |
| `POST` | `/api/projects/{id}/restart` | Worker 再起動 |
| `GET` | `/api/projects` | プロジェクト一覧 + 状態 |
| `GET` | `/api/projects/{id}` | プロジェクト詳細 + 状態 |

レスポンス形式:

```json
{
  "ok": true,
  "data": {}
}
```

エラー時:

```json
{
  "ok": false,
  "error": "not_found",
  "message": "Project not found"
}
```

## P1.7 Deno 設定

### P1.7.1 `deno.json`

```json
{
  "tasks": {
    "serve": "deno run --allow-net --allow-read --allow-write --allow-run --allow-env src/main.ts serve",
    "cli": "deno run --allow-net --allow-read --allow-write --allow-run --allow-env src/cli.ts",
    "check": "deno check src/**/*.ts"
  },
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

## P1.8 制約事項

- Phase 1 では HTTPS 終端は行わない。TLS は上位のロードバランサーまたは Phase 5 以降で対応する。
- Worker の権限は `--allow-net --allow-read --allow-env` に固定する。Phase 4 以降で設定可能にする。
- プロジェクト単位の環境変数は Phase 4 で対応する。Phase 1 ではシステム環境変数がそのまま Worker に継承される。

---

# Phase 2 詳細仕様 — Git 連携

## P2.1 スコープ

Phase 2 は以下の機能を提供する。

1. **Git リポジトリ連携** — プロジェクトと Git リポジトリの紐付け
2. **Webhook 受信** — Git push イベントの受信
3. **自動デプロイパイプライン** — clone/pull → 再起動の自動化
4. **デプロイ履歴** — デプロイの実行記録

Phase 2 では以下を**対象外**とする。

- ビルドステップ（TypeScript コンパイル等）のカスタマイズ
- ブランチ別デプロイ（Phase 2 では単一ブランチのみ）
- ロールバック機能
- デプロイプレビュー

## P2.2 追加ディレクトリ構成

Phase 1 のディレクトリ構成に以下を追加する。

```
Adlaire Deploy/
├── src/
│   ├── ... (Phase 1 のファイル)
│   ├── deployer.ts          # デプロイパイプライン
│   └── webhook.ts           # Webhook 受信ハンドラ
```

## P2.3 プロジェクト設定の拡張

### P2.3.1 `ProjectConfig` への追加フィールド

```json
{
  "projects": {
    "my-app": {
      "hostname": "my-app.example.com",
      "entry": "main.ts",
      "port": 3001,
      "auto_start": true,
      "git": {
        "url": "https://github.com/user/my-app.git",
        "branch": "main",
        "webhook_secret": "random-secret-string"
      }
    }
  }
}
```

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|------|:----:|:----------:|------|
| `git` | `GitConfig \| null` | — | `null` | Git 連携設定。`null` の場合は Git 連携無効 |
| `git.url` | `string` | ○ | — | Git リポジトリ URL（HTTPS のみ） |
| `git.branch` | `string` | — | `"main"` | デプロイ対象ブランチ |
| `git.webhook_secret` | `string` | ○ | — | Webhook 検証用シークレット |

### P2.3.2 Git リポジトリ URL 制約

- HTTPS URL のみ許可する（`https://` で始まること）。
- SSH URL（`git@`）は Phase 2 では対象外とする。

## P2.4 デプロイパイプライン

### P2.4.1 デプロイフロー

```
Webhook 受信 → 検証 → clone/pull → Worker 再起動
```

1. **Webhook 検証**: シークレットによる署名検証
2. **ブランチ確認**: push 対象ブランチが設定と一致するか確認
3. **ソースコード取得**:
   - 初回: `git clone --depth 1 --branch {branch} {url}` を `projects_dir/{id}/` に実行
   - 2回目以降: `git pull origin {branch}` を `projects_dir/{id}/` で実行
4. **Worker 再起動**: プロセスマネージャの `restart` を呼び出す

### P2.4.2 デプロイ状態

```
idle → deploying → deployed
              ↘ deploy_failed
```

| 状態 | 説明 |
|------|------|
| `idle` | デプロイ待機中（初期状態） |
| `deploying` | デプロイ処理中 |
| `deployed` | 最後のデプロイが成功 |
| `deploy_failed` | 最後のデプロイが失敗 |

### P2.4.3 排他制御

- 同一プロジェクトに対する同時デプロイは禁止する。
- デプロイ中に新しい Webhook を受信した場合、現在のデプロイ完了後に再デプロイを実行する（キュー深さ 1）。

### P2.4.4 Git 操作コマンド

初回 clone:

```
git clone --depth 1 --branch {branch} {url} {projects_dir}/{id}
```

更新 pull:

```
cd {projects_dir}/{id} && git fetch origin {branch} && git reset --hard origin/{branch}
```

- `--depth 1` で履歴を最小化する。
- `git reset --hard` で強制的に最新コミットに合わせる（ローカル変更は破棄）。

## P2.5 Webhook

### P2.5.1 エンドポイント

管理 API（内部ポート `port + 1`）に以下を追加する。

| メソッド | パス | 説明 |
|---------|------|------|
| `POST` | `/api/webhook/{id}` | Git push Webhook 受信 |

### P2.5.2 署名検証

GitHub 互換の HMAC-SHA256 署名検証を行う。

1. リクエストヘッダー `X-Hub-Signature-256` を取得する。
2. リクエストボディと `webhook_secret` で HMAC-SHA256 を計算する。
3. `sha256={hex_digest}` 形式で比較する。
4. 不一致の場合は `403 Forbidden` を返す。

### P2.5.3 ペイロード解析

GitHub push イベントペイロードから以下を抽出する。

| フィールド | 用途 |
|-----------|------|
| `ref` | push 対象ブランチ（`refs/heads/{branch}` 形式） |
| `after` | コミット SHA |
| `pusher.name` | push 実行者 |

### P2.5.4 レスポンス

| 状況 | ステータス | ボディ |
|------|:----------:|--------|
| デプロイ開始 | `202` | `{"ok": true, "data": {"message": "Deploy started", "commit": "{sha}"}}` |
| 署名不正 | `403` | `{"ok": false, "error": "forbidden", "message": "Invalid signature"}` |
| ブランチ不一致 | `200` | `{"ok": true, "data": {"message": "Branch ignored", "ref": "{ref}"}}` |
| Git 未設定 | `400` | `{"ok": false, "error": "not_configured", "message": "Git not configured for this project"}` |
| デプロイ中 | `202` | `{"ok": true, "data": {"message": "Deploy queued"}}` |

## P2.6 デプロイ履歴

### P2.6.1 デプロイレコード

各デプロイの結果をメモリ内に保持する（最大 50 件/プロジェクト）。

```json
{
  "id": "deploy_001",
  "project_id": "my-app",
  "commit": "abc1234",
  "branch": "main",
  "pusher": "user",
  "status": "deployed",
  "started_at": "2026-04-06T12:00:00Z",
  "finished_at": "2026-04-06T12:00:05Z",
  "error": null
}
```

### P2.6.2 管理 API 追加

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/projects/{id}/deploys` | デプロイ履歴一覧 |
| `POST` | `/api/projects/{id}/deploy` | 手動デプロイ実行 |

## P2.7 CLI 拡張

### P2.7.1 追加コマンド

| コマンド | 説明 |
|---------|------|
| `deploy <id>` | 手動デプロイを実行する（管理 API 経由） |
| `deploys <id>` | デプロイ履歴を表示する（管理 API 経由） |

### P2.7.2 `add` コマンドのオプション拡張

```
adlaire-deploy add <id> --hostname <host> --entry <entry> --port <port> \
  [--git-url <url>] [--git-branch <branch>] [--webhook-secret <secret>]
```

- `--git-url` 指定時、`--webhook-secret` も必須とする。
- `--git-branch` 省略時は `"main"` をデフォルトとする。

## P2.8 制約事項

- Phase 2 では HTTPS の Git URL のみ対応する。SSH は Phase 5 以降で検討する。
- 認証付き Git リポジトリ（プライベートリポジトリ）は Phase 2 では対象外とする。公開リポジトリのみ。
- ビルドステップのカスタマイズは Phase 2 では対象外とする。エントリポイントは直接実行可能な TypeScript/JavaScript ファイルであること。
- デプロイ履歴はメモリ内保持のみ。プラットフォーム再起動で消失する。永続化は Phase 3 以降で KV ストレージ導入後に対応する。

---

# Phase 3 詳細仕様 — KV ストレージ

## P3.1 スコープ

Phase 3 は以下の機能を提供する。

1. **プロジェクト別 KV ストレージ** — プロジェクトごとに分離された Deno KV データベース
2. **KV 管理** — プラットフォームによる KV ファイルのライフサイクル管理
3. **デプロイ履歴の永続化** — Phase 2 のメモリ内デプロイ履歴を KV に永続化

Phase 3 では以下を**対象外**とする。

- KV のリモートバックアップ・レプリケーション
- KV のブラウザ管理 UI
- KV のクエリ API（プロジェクトは直接 `Deno.openKv()` を使用する）

## P3.2 設計方針

### P3.2.1 Deno KV の活用

Deno KV は Deno ランタイムに組み込まれた KV ストアであり、SQLite をバックエンドとして使用する。
Adlaire Deploy では以下の方針で KV を提供する。

- **プロジェクト Worker** は `Deno.openKv()` を通常通り使用する。プラットフォームが KV ファイルのパスを環境変数で注入する。
- **プラットフォーム自身** も内部状態（デプロイ履歴等）の永続化に KV を使用する。

### P3.2.2 ストレージ分離

プロジェクトごとに独立した KV データベースファイルを使用する。

```
data/
├── platform.kv          # プラットフォーム内部用 KV
└── projects/
    ├── my-app.kv         # my-app プロジェクト用 KV
    └── api-server.kv     # api-server プロジェクト用 KV
```

## P3.3 プラットフォーム設定の拡張

### P3.3.1 `DeployConfig` への追加フィールド

```json
{
  "version": 1,
  "host": "0.0.0.0",
  "port": 8000,
  "projects_dir": "./projects",
  "data_dir": "./data",
  "projects": {}
}
```

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|------|:----:|:----------:|------|
| `data_dir` | `string` | — | `"./data"` | データディレクトリパス（KV ファイル格納先） |

## P3.4 Worker への KV パス注入

### P3.4.1 環境変数

Worker 起動時に以下の環境変数を設定する。

| 環境変数 | 値 | 説明 |
|---------|-----|------|
| `DENO_KV_PATH` | `{data_dir}/projects/{id}.kv` | プロジェクト専用 KV ファイルパス |

Worker は `Deno.openKv()` を引数なしで呼び出すか、`Deno.openKv(Deno.env.get("DENO_KV_PATH"))` で明示的にパスを指定する。

### P3.4.2 Worker 起動コマンドの変更

Phase 1 の起動コマンドを拡張する。

```
deno run --allow-net --allow-read --allow-env --unstable-kv {entry}
```

- `--unstable-kv` フラグを追加し、Deno KV API を有効化する。

## P3.5 プラットフォーム KV

### P3.5.1 用途

プラットフォーム内部の永続データを `{data_dir}/platform.kv` に保存する。

Phase 3 で永続化する対象:

| キープレフィックス | 用途 |
|-------------------|------|
| `["deploy", "{project_id}", "{deploy_id}"]` | デプロイ履歴レコード |
| `["deploy_counter"]` | デプロイ ID カウンター |

### P3.5.2 デプロイ履歴の永続化

- Phase 2 のメモリ内デプロイ履歴を KV に永続化する。
- `Deployer` クラスがプラットフォーム KV を使用してデプロイレコードを保存・取得する。
- 取得時はプレフィックス `["deploy", "{project_id}"]` で `list` し、`started_at` の降順で返す。
- 最大保持件数は引き続き 50 件/プロジェクトとする。古いレコードは新規保存時に削除する。

## P3.6 管理 API の拡張

### P3.6.1 KV 管理エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| `DELETE` | `/api/projects/{id}/kv` | プロジェクトの KV データベースを削除する |
| `GET` | `/api/projects/{id}/kv/stats` | KV データベースのファイルサイズを返す |

### P3.6.2 `/api/projects/{id}/kv/stats` レスポンス

```json
{
  "ok": true,
  "data": {
    "path": "./data/projects/my-app.kv",
    "size_bytes": 40960,
    "exists": true
  }
}
```

### P3.6.3 `/api/projects/{id}/kv` DELETE レスポンス

```json
{
  "ok": true,
  "data": {
    "message": "KV database deleted"
  }
}
```

- Worker が稼働中の場合は `400` エラーを返す（Worker を停止してから削除すること）。

## P3.7 CLI の拡張

### P3.7.1 追加コマンド

| コマンド | 説明 |
|---------|------|
| `kv-stats <id>` | プロジェクトの KV データベース情報を表示する |
| `kv-reset <id>` | プロジェクトの KV データベースを削除する |

## P3.8 制約事項

- KV のバックアップ・リストア機能は Phase 3 では対象外とする。
- KV のサイズ制限は Phase 3 では設けない。将来的にクォータ制御を検討する。
- `Deno.openKv()` を引数なしで使用した場合、Deno ランタイムのデフォルト動作（一時ファイル）となる。プロジェクトが永続 KV を必要とする場合は `DENO_KV_PATH` 環境変数を使用すること。
- プラットフォーム KV（`platform.kv`）はプラットフォームプロセスのみが使用する。プロジェクト Worker からのアクセスは禁止。

---

# Phase 4 詳細仕様 — 環境変数・ログ

## P4.1 スコープ

Phase 4 は以下の機能を提供する。

1. **プロジェクト単位の環境変数管理** — Worker に注入する環境変数の設定・取得・削除
2. **ログキャプチャ** — Worker の stdout/stderr をキャプチャしバッファリング
3. **ログストリーム API** — リアルタイムログ取得エンドポイント
4. **Worker 権限設定** — プロジェクト単位の Deno パーミッション設定

Phase 4 では以下を**対象外**とする。

- ログの永続化（KV やファイルへの保存）
- ログのフィルタリング・検索
- メトリクス収集・ヘルスチェック

## P4.2 追加ディレクトリ構成

```
Adlaire Deploy/
├── src/
│   ├── ... (既存ファイル)
│   └── logger.ts           # ログキャプチャ・バッファ管理
```

## P4.3 環境変数管理

### P4.3.1 `ProjectConfig` への追加フィールド

```json
{
  "projects": {
    "my-app": {
      "hostname": "my-app.example.com",
      "entry": "main.ts",
      "port": 3001,
      "auto_start": true,
      "git": null,
      "env": {
        "DATABASE_URL": "postgres://localhost/mydb",
        "API_KEY": "secret-key"
      },
      "permissions": {
        "allow_net": true,
        "allow_read": true,
        "allow_write": false,
        "allow_env": true,
        "allow_ffi": false,
        "allow_run": false
      }
    }
  }
}
```

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|------|:----:|:----------:|------|
| `env` | `Record<string, string>` | — | `{}` | Worker に注入する環境変数 |
| `permissions` | `Permissions \| null` | — | `null` | Worker の Deno パーミッション設定（null はデフォルト値を使用） |

### P4.3.2 環境変数の優先順位

Worker 起動時の環境変数は以下の優先順位で適用する（後のものが上書き）。

1. システム環境変数（Deno.env）
2. プロジェクト設定の `env` フィールド
3. プラットフォーム注入変数（`PORT`, `DENO_KV_PATH`）

### P4.3.3 禁止環境変数名

以下の環境変数名はプラットフォームが予約する。プロジェクト設定での上書きは禁止する。

- `PORT` — Worker ポート番号
- `DENO_KV_PATH` — KV ファイルパス

設定保存時にバリデーションを行い、予約名が含まれる場合はエラーとする。

## P4.4 Worker 権限設定

### P4.4.1 `Permissions` 型

```typescript
interface Permissions {
  allow_net: boolean;
  allow_read: boolean;
  allow_write: boolean;
  allow_env: boolean;
  allow_ffi: boolean;
  allow_run: boolean;
}
```

### P4.4.2 デフォルト権限

`permissions` が `null` の場合、以下のデフォルト値を使用する。

| 権限 | デフォルト |
|------|:----------:|
| `allow_net` | `true` |
| `allow_read` | `true` |
| `allow_write` | `false` |
| `allow_env` | `true` |
| `allow_ffi` | `false` |
| `allow_run` | `false` |

### P4.4.3 Worker 起動コマンドの変更

権限設定に基づいてフラグを動的に構築する。

```
deno run [--allow-net] [--allow-read] [--allow-write] [--allow-env] [--allow-ffi] [--allow-run] --unstable-kv {entry}
```

- `true` の権限のみフラグとして付与する。

## P4.5 ログキャプチャ

### P4.5.1 設計方針

- Worker の stdout/stderr を `"piped"` モードでキャプチャする。
- キャプチャしたログをリングバッファに保持する（最大 1000 行/プロジェクト）。
- 同時にプラットフォームの stdout にも転送する（従来動作の維持）。

### P4.5.2 ログエントリ

```typescript
interface LogEntry {
  timestamp: string;  // ISO 8601
  stream: "stdout" | "stderr";
  line: string;
}
```

### P4.5.3 リングバッファ

- プロジェクトごとに最大 **1000 行**を保持する。
- バッファが満杯の場合、最も古いエントリを破棄する。
- Worker 再起動時にバッファはクリアしない（累積）。
- プラットフォーム再起動時にバッファは消失する（メモリ内のみ）。

## P4.6 管理 API の拡張

### P4.6.1 環境変数エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/projects/{id}/env` | 環境変数一覧を取得する |
| `PUT` | `/api/projects/{id}/env` | 環境変数を一括設定する（全置換） |

#### `GET /api/projects/{id}/env` レスポンス

```json
{
  "ok": true,
  "data": {
    "DATABASE_URL": "postgres://localhost/mydb",
    "API_KEY": "***"
  }
}
```

- 値が 4 文字以上の場合、先頭 3 文字 + `***` でマスクする。
- 値が 3 文字以下の場合、`***` のみ表示する。

#### `PUT /api/projects/{id}/env` リクエスト・レスポンス

リクエストボディ:

```json
{
  "DATABASE_URL": "postgres://localhost/mydb",
  "API_KEY": "new-secret-key"
}
```

レスポンス:

```json
{
  "ok": true,
  "data": {
    "message": "Environment variables updated",
    "count": 2
  }
}
```

- 設定後、Worker の再起動は**自動で行わない**。手動で `restart` が必要。

### P4.6.2 ログエンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/projects/{id}/logs` | ログバッファを取得する |
| `GET` | `/api/projects/{id}/logs?tail={n}` | 末尾 n 行を取得する（デフォルト 100） |

#### レスポンス

```json
{
  "ok": true,
  "data": [
    {
      "timestamp": "2026-04-06T12:00:00.000Z",
      "stream": "stdout",
      "line": "Listening on port 3001"
    }
  ]
}
```

## P4.7 CLI の拡張

### P4.7.1 追加コマンド

| コマンド | 説明 |
|---------|------|
| `env <id>` | プロジェクトの環境変数を表示する（マスク済み） |
| `env-set <id> <KEY=VALUE>...` | 環境変数を設定する |
| `logs <id> [--tail <n>]` | ログを表示する（デフォルト 100 行） |

### P4.7.2 `env-set` コマンド

```
adlaire-deploy env-set my-app DATABASE_URL=postgres://localhost/mydb API_KEY=secret
```

- 既存の環境変数とマージする（指定したキーのみ上書き）。
- キーを空値にすると削除: `API_KEY=`

## P4.8 制約事項

- ログはメモリ内リングバッファのみ。永続化は対象外。
- 環境変数の値は暗号化しない。`deploy.json` にプレーンテキストで保存する。機密値の管理はプラットフォーム外のシークレット管理を推奨する。
- 環境変数の変更後は手動で Worker を再起動する必要がある。ホットリロードは対象外。
- Worker 権限の変更後も手動で Worker を再起動する必要がある。
- `--allow-write` はデフォルト `false`。Worker が KV 以外のファイル書き込みを行う場合は明示的に有効化すること。

---

# Phase 5 詳細仕様 — 複数サーバー / エッジ

## P5.1 スコープ

Phase 5 は以下の機能を提供する。

1. **ノード管理** — origin / edge ノードの登録・ヘルスチェック・状態管理
2. **設定同期** — origin → edge への `deploy.json` 設定の自動同期
3. **デプロイ伝播** — origin でのデプロイ成功時に edge ノードへ自動伝播
4. **リクエスト分散** — origin がエッジノードの存在を認識し、クライアントを誘導可能にする

Phase 5 では以下を**対象外**とする。

- ロードバランサー機能（外部 LB に委譲）
- ノード間 KV レプリケーション
- ノード自動スケーリング
- 地理ベースルーティング

## P5.2 アーキテクチャ

### P5.2.1 ノードロール

| ロール | 説明 |
|--------|------|
| `origin` | 設定の正。deploy.json の管理、Webhook 受信、CLI 操作のすべてを受け付ける |
| `edge` | origin から設定・コードを受信し、Worker を実行する。読み取り専用 |

### P5.2.2 トポロジ

```
                ┌──────────┐
                │  origin  │
                │ (master) │
                └────┬─────┘
              ┌──────┼──────┐
              ▼      ▼      ▼
         ┌────────┐┌────────┐┌────────┐
         │ edge-1 ││ edge-2 ││ edge-3 │
         └────────┘└────────┘└────────┘
```

- origin は 1 台のみ。
- edge は 0 台以上（Phase 5 では最大 10 台）。
- origin がダウンした場合、edge は最後に同期された設定で稼働を継続する。

### P5.2.3 通信プロトコル

ノード間通信は **HTTP(S) の管理 API** を使用する。
origin の管理 API が edge からのリクエストを受け付け、edge の管理 API が origin からの指示を受け付ける。

## P5.3 プラットフォーム設定の拡張

### P5.3.1 `DeployConfig` への追加フィールド

```json
{
  "version": 1,
  "host": "0.0.0.0",
  "port": 8000,
  "projects_dir": "./projects",
  "data_dir": "./data",
  "cluster": {
    "role": "origin",
    "node_id": "origin-01",
    "secret": "cluster-shared-secret",
    "edges": [
      {
        "node_id": "edge-01",
        "url": "http://192.168.1.10:8001"
      },
      {
        "node_id": "edge-02",
        "url": "http://192.168.1.11:8001"
      }
    ]
  },
  "projects": {}
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|------|:----:|------|
| `cluster` | `ClusterConfig \| null` | — | クラスタ設定。`null` の場合はスタンドアロンモード（Phase 1〜4 の動作） |

### P5.3.2 `ClusterConfig` 型

```typescript
interface ClusterConfig {
  role: "origin" | "edge";
  node_id: string;
  secret: string;
  edges: EdgeNode[];         // origin のみ使用
  origin_url?: string;       // edge のみ使用
}

interface EdgeNode {
  node_id: string;
  url: string;               // edge の管理 API URL
}
```

| フィールド | ロール | 説明 |
|-----------|:------:|------|
| `role` | 両方 | ノードロール |
| `node_id` | 両方 | ノード識別子（クラスタ内で一意） |
| `secret` | 両方 | ノード間認証用共有シークレット |
| `edges` | origin | edge ノード一覧 |
| `origin_url` | edge | origin の管理 API URL |

### P5.3.3 ノード ID 規則

- プロジェクト ID と同一規則（P1.3.3 準拠）。

## P5.4 ノード間認証

### P5.4.1 HMAC 認証

ノード間通信はリクエストごとに HMAC-SHA256 で署名検証する。

| ヘッダー | 値 |
|---------|-----|
| `X-Deploy-Node-Id` | 送信元ノード ID |
| `X-Deploy-Timestamp` | UNIX タイムスタンプ（秒） |
| `X-Deploy-Signature` | `sha256=` + HMAC-SHA256(`{node_id}:{timestamp}:{path}:{body}`, secret) |

### P5.4.2 タイムスタンプ検証

- リクエストのタイムスタンプが ±60 秒以内であることを検証する。
- 範囲外の場合は `403` を返す。

## P5.5 ヘルスチェック

### P5.5.1 origin → edge ヘルスチェック

origin は登録された edge ノードに対して定期的にヘルスチェックを行う。

- **間隔**: 30 秒
- **エンドポイント**: `GET /api/health`（edge の管理 API）
- **タイムアウト**: 5 秒

### P5.5.2 ノード状態

| 状態 | 説明 |
|------|------|
| `healthy` | 直近のヘルスチェック成功 |
| `unhealthy` | 直近 3 回連続でヘルスチェック失敗 |
| `unknown` | ヘルスチェック未実行（初期状態） |

### P5.5.3 ヘルスエンドポイント

管理 API に以下を追加する。

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/health` | ノード自身のヘルス情報を返す |

レスポンス:

```json
{
  "ok": true,
  "data": {
    "node_id": "edge-01",
    "role": "origin",
    "uptime_seconds": 3600,
    "projects_count": 3,
    "running_workers": 2
  }
}
```

## P5.6 設定同期

### P5.6.1 同期タイミング

origin は以下のタイミングで edge に設定を同期する。

- プロジェクトの追加・削除時
- 環境変数の変更時
- `deploy.json` の手動変更後

### P5.6.2 同期エンドポイント

origin → edge への設定プッシュ:

| メソッド | パス | 説明 |
|---------|------|------|
| `PUT` | `/api/cluster/sync-config` | 設定全体を同期する |

リクエストボディ: `deploy.json` の `projects` セクション全体（cluster 設定を除く）。

edge は受信した設定で自身の `deploy.json` を更新し、Worker 状態を調整する。

### P5.6.3 同期の冪等性

- 同一設定の再送信は副作用を持たない。
- edge は受信した設定が既存と同一の場合、Worker の再起動は行わない。

## P5.7 デプロイ伝播

### P5.7.1 伝播フロー

```
Webhook → origin デプロイ成功 → 各 edge に伝播指示
                                   ├→ edge-01: git pull + restart
                                   └→ edge-02: git pull + restart
```

### P5.7.2 伝播エンドポイント

origin → edge:

| メソッド | パス | 説明 |
|---------|------|------|
| `POST` | `/api/cluster/deploy/{id}` | プロジェクトのデプロイを実行する |

リクエストボディ:

```json
{
  "commit": "abc1234",
  "branch": "main"
}
```

edge は受信後、自身の deployer で git pull + Worker 再起動を実行する。

### P5.7.3 伝播の非同期性

- origin は各 edge に並列でデプロイ指示を送信する。
- 各 edge の結果は非同期で収集する。
- 一部の edge が失敗しても、他の edge へのデプロイは継続する。

### P5.7.4 伝播結果の記録

origin のデプロイレコードに edge 伝播結果を含める。

```typescript
interface DeployRecord {
  // ... (既存フィールド)
  edge_results?: EdgeDeployResult[];
}

interface EdgeDeployResult {
  node_id: string;
  status: "success" | "failed" | "unreachable";
  error?: string;
}
```

## P5.8 管理 API の拡張

### P5.8.1 クラスタエンドポイント（origin 用）

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/cluster/nodes` | ノード一覧 + ヘルス状態 |
| `POST` | `/api/cluster/sync` | 全 edge に設定を手動同期 |

### P5.8.2 クラスタエンドポイント（edge 受信用）

| メソッド | パス | 説明 |
|---------|------|------|
| `PUT` | `/api/cluster/sync-config` | 設定同期受信 |
| `POST` | `/api/cluster/deploy/{id}` | デプロイ伝播受信 |

## P5.9 CLI の拡張

### P5.9.1 追加コマンド

| コマンド | 説明 |
|---------|------|
| `nodes` | クラスタノード一覧 + ヘルス状態を表示する |
| `sync` | 全 edge に設定を手動同期する |

## P5.10 追加ファイル

```
Adlaire Deploy/
├── src/
│   ├── ... (既存ファイル)
│   └── cluster.ts          # クラスタ管理（ヘルスチェック・同期・伝播）
```

## P5.11 制約事項

- origin は 1 台のみ。マルチマスターは対象外。
- edge ノードは最大 10 台。
- ノード間通信は HTTP(S) のみ。専用プロトコル（WebSocket 等）は対象外。
- KV データはノード間で共有しない。各ノードのプロジェクト KV は独立。
- edge がダウンした場合、origin は unhealthy とマークするのみ。自動回復は行わない。
- SSH URL の Git リポジトリは Phase 5 でも対象外（HTTPS のみ）。
- edge ノードには git がインストールされている前提。
- TLS はノード間通信に必須ではない（プライベートネットワーク前提）。本番環境では TLS の使用を推奨する。

---

# 9. 最終規則

## 9.1 上位規範性

本 RULEBOOK は、Adlaire Deploy のプラットフォーム設計に関する上位規範文書である。

## 9.2 優先適用

プラットフォーム設計に関して個別提案と本 RULEBOOK が衝突する場合、本 RULEBOOK を優先しなければならない。

## 9.3 改訂条件

本 RULEBOOK を改訂する場合は、アーキテクチャ、コア機能、互換性への影響を明示しなければならない。

---

# 10. 関連文書

| 文書 | 内容 |
|------|------|
| `CHARTER.md`（Adlaire 本体） | ルールブック憲章（最上位原則） |
| `DIRECTION_RULEBOOK.md`（Adlaire 本体） | 製品方向性 |
| `REVISION_HISTORY.md` | 本プロジェクトの改訂履歴 |
