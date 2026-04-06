# Adlaire Deploy Platform RULEBOOK

- 文書名: Adlaire Deploy Platform RULEBOOK
- 文書バージョン: Ver.3.0
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
| 6 | **ロールバック・ログ強化・ヘルスチェック・プライベートリポジトリ** |
| 7 | **ビルドステップ・ログ永続化・環境変数暗号化・デプロイ通知** |
| 8 | **edge 自動回復** |
| 9 | **管理ダッシュボード Web UI** |
| 10 | **監査ログ・デプロイパイプライン並列化・モノレポ対応** |
| 11 | **静的サイトホスティング・メトリクス収集** |
| 12 | **Blue-Green デプロイ・カナリアデプロイ** |
| 13 | **デプロイスケジューリング・デプロイプレビュー URL** |
| 14 | **VPS 運用基盤** — インストール・systemd・セルフアップデート・CI/CD・バックアップ・プロビジョニング |

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

# Phase 6 詳細仕様 — ロールバック・ログ強化・ヘルスチェック・プライベートリポジトリ

## P6.1 スコープ

Phase 6 は以下の機能を提供する。

1. **ロールバック機能** — デプロイ履歴の保持と過去バージョンへの復元
2. **ログ SSE ストリーミング** — リアルタイムログを Server-Sent Events で配信
3. **Worker ヘルスチェック & 自動再起動** — Worker 異常終了時の自動回復
4. **プライベートリポジトリ対応** — 認証情報を用いたプライベート Git リポジトリへのアクセス

## P6.2 ロールバック機能

### P6.2.1 デプロイ履歴管理

- デプロイ成功ごとにスナップショットを Deno KV に保存する。
- 保存情報: デプロイ ID（UUID）、Git コミットハッシュ、デプロイ日時、エントリポイント、環境変数スナップショット（暗号化）。
- 保持件数: プロジェクトごとに最大 10 件。超過分は古い順に削除する。

### P6.2.2 ロールバック手順

1. CLI で指定したデプロイ ID のスナップショットを KV から取得する。
2. 対応するコミットを `git checkout` でチェックアウトする。
3. Worker を再起動する（起動・停止手順は P1.4 準拠）。
4. ロールバック完了後、新規デプロイとして履歴に記録する。

### P6.2.3 CLI コマンド

| コマンド | 説明 |
|---------|------|
| `deploy rollback <project-id> [deploy-id]` | 指定デプロイ ID に戻す。省略時は一つ前のデプロイに戻す |
| `deploy history <project-id>` | デプロイ履歴一覧を表示する |

## P6.3 ログ SSE ストリーミング

### P6.3.1 概要

- HTTP エンドポイント `GET /internal/logs/:projectId/stream` を提供する。
- レスポンス形式: `Content-Type: text/event-stream`（SSE 標準準拠）。
- データ形式: `data: {"timestamp": "ISO8601", "level": "info|error", "message": "..."}\n\n`

### P6.3.2 ストリーミング仕様

- Worker の標準出力・標準エラーをリアルタイムに SSE で配信する。
- 接続中のクライアントが存在しない場合でもログは内部バッファ（最新 1,000 行）に保持する。
- 新規接続時にバッファ分を即時送信し、その後リアルタイムに配信する。
- 内部エンドポイントのため、認証トークン（`Authorization: Bearer <token>`）による保護を必須とする。

### P6.3.3 CLI コマンド

| コマンド | 説明 |
|---------|------|
| `deploy logs <project-id> --stream` | リアルタイムログをターミナルに表示する |
| `deploy logs <project-id>` | バッファ分のログを表示して終了する |

## P6.4 Worker ヘルスチェック & 自動再起動

### P6.4.1 ヘルスチェック仕様

- プロセスマネージャが各 Worker に対して定期的に HTTP ヘルスチェックを実施する。
- チェック間隔: 30 秒（設定可能）。
- チェック対象 URL: `http://127.0.0.1:{port}/health`（Worker がこのエンドポイントを実装することを推奨する）。
- タイムアウト: 5 秒。
- 連続失敗回数が閾値（デフォルト: 3 回）を超えた場合、Worker を unhealthy と判定する。

### P6.4.2 自動再起動仕様

- Worker が `failed` または `unhealthy` 状態に遷移した場合、自動再起動を試みる。
- 再起動戦略: 指数バックオフ（初回: 1 秒、最大: 60 秒、最大試行回数: 5 回）。
- 5 回試行後も回復しない場合、状態を `failed` に固定し自動再起動を停止する。
- 自動再起動のたびにログに記録する。

### P6.4.3 プロジェクト設定への追加フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `health_check_enabled` | `boolean` | `true` | ヘルスチェックの有効化 |
| `health_check_interval` | `number` | `30` | チェック間隔（秒） |
| `health_check_threshold` | `number` | `3` | 連続失敗回数の閾値 |
| `auto_restart` | `boolean` | `true` | 自動再起動の有効化 |
| `max_restart_attempts` | `number` | `5` | 最大再起動試行回数 |

## P6.5 プライベートリポジトリ対応

### P6.5.1 対応認証方式

- **HTTPS + Personal Access Token (PAT)**: URL に認証情報を埋め込む方式（`https://<token>@github.com/...`）。
- **SSH 鍵認証**: SSH URL（`git@github.com:...`）を使用する方式。

### P6.5.2 認証情報管理

- 認証情報はプロジェクト設定に含めず、専用の認証情報ストアに保存する。
- 保存先: Deno KV（暗号化必須）。暗号化方式は AES-256-GCM とする。
- 暗号鍵はプラットフォーム設定ファイル（`deploy.json`）に記載せず、環境変数 `ADLAIRE_DEPLOY_SECRET` から取得する。
- SSH 鍵はファイルシステム上の保護されたディレクトリ（`chmod 600`）に保存する。

### P6.5.3 CLI コマンド

| コマンド | 説明 |
|---------|------|
| `deploy credential set <project-id> --token <PAT>` | PAT を設定する |
| `deploy credential set <project-id> --ssh-key <path>` | SSH 鍵ファイルを登録する |
| `deploy credential remove <project-id>` | 認証情報を削除する |

## P6.6 追加ファイル

```
Adlaire Deploy/
├── src/
│   ├── ... (既存ファイル)
│   ├── rollback.ts          # ロールバック管理
│   ├── sse.ts               # SSE ストリーミング
│   ├── health_check.ts      # ヘルスチェック & 自動再起動
│   └── credential.ts        # 認証情報ストア
```

---

# Phase 7 詳細仕様 — ビルドステップ・ログ永続化・環境変数暗号化・デプロイ通知

## P7.1 スコープ

Phase 7 は以下の機能を提供する。

1. **ビルドステップ** — デプロイ前の任意ビルドコマンド実行
2. **ログ永続化** — Worker ログをファイルシステムに保存
3. **環境変数暗号化** — 環境変数を暗号化して Deno KV に保存
4. **デプロイ通知** — Webhook によるデプロイ完了通知

## P7.2 ビルドステップ

### P7.2.1 概要

- デプロイ（Git pull 後・Worker 起動前）に任意のビルドコマンドを実行できる。
- ビルドコマンドはプロジェクト設定に定義する。
- ビルドの標準出力・標準エラーはデプロイログに記録する。
- ビルドが非ゼロ終了コードで終了した場合、デプロイを中止する。

### P7.2.2 プロジェクト設定への追加フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `build_command` | `string \| null` | `null` | デプロイ前に実行するビルドコマンド |
| `build_timeout` | `number` | `300` | ビルドタイムアウト（秒） |

### P7.2.3 実行環境

- ビルドコマンドはプロジェクトディレクトリ（`projects_dir/{id}/`）をカレントディレクトリとして実行する。
- ビルドプロセスには環境変数（復号済み）を渡す。
- シェルインジェクション対策: コマンドは `Deno.Command` でシェルを介さず実行する。コマンド文字列は配列化してシェル解釈を排除する。

## P7.3 ログ永続化

### P7.3.1 概要

- Worker ログ（標準出力・標準エラー）をファイルシステムに追記保存する。
- SSE ストリーミング（P6.3）と共存する（ストリーミングと同時に書き込む）。

### P7.3.2 保存仕様

- 保存先: `logs/{project-id}/{YYYY-MM-DD}.log`
- フォーマット: `{ISO8601タイムスタンプ} [{level}] {message}\n`
- ローテーション: 日付単位でファイルを分割する。30 日以前のファイルは自動削除する。
- ローテーション実行タイミング: プラットフォーム起動時、および毎日 00:00（ローカル時刻）。

### P7.3.3 プロジェクト設定への追加フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `log_retention_days` | `number` | `30` | ログ保持日数 |

## P7.4 環境変数暗号化

### P7.4.1 概要

- プロジェクトの環境変数を暗号化して Deno KV に保存する。
- Phase 4 の環境変数管理を本フェーズで暗号化対応へ移行する。
- 廃止ポリシー適用: 平文保存の旧形式は本 Phase でマイグレーションを一度だけ行い、以降は平文保存を認識しない。

### P7.4.2 暗号化仕様

- 暗号化方式: **AES-256-GCM**
- 暗号鍵: 環境変数 `ADLAIRE_DEPLOY_SECRET`（32 バイト以上の任意文字列）から HKDF で導出する。
- 各値ごとに個別の IV（12 バイト乱数）を生成し、暗号文と一緒に保存する。
- KV 保存形式: `{ iv: Base64, ciphertext: Base64 }`

### P7.4.3 マイグレーション

- プラットフォーム起動時、KV に平文で保存された環境変数を検出した場合、自動的に暗号化して保存し直す。

## P7.5 デプロイ通知

### P7.5.1 概要

- デプロイ完了（成功・失敗）時に、設定済みの Webhook URL へ HTTP POST を送信する。
- Webhook はプロジェクト単位で設定する。

### P7.5.2 Webhook ペイロード

```json
{
  "project_id": "my-app",
  "status": "success | failure",
  "deploy_id": "UUID",
  "commit": "git-sha",
  "timestamp": "ISO8601",
  "message": "Deploy succeeded | Error message"
}
```

### P7.5.3 送信仕様

- Content-Type: `application/json`
- タイムアウト: 10 秒
- リトライ: 3 回（指数バックオフ: 1 秒, 2 秒, 4 秒）
- リトライ失敗時はログに記録し、通知失敗をデプロイ結果には影響させない。

### P7.5.4 プロジェクト設定への追加フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `webhook_url` | `string \| null` | `null` | デプロイ通知 Webhook URL |
| `webhook_secret` | `string \| null` | `null` | HMAC-SHA256 署名用シークレット（省略可） |

### P7.5.5 Webhook 署名

`webhook_secret` が設定されている場合、ペイロードの HMAC-SHA256 ハッシュを `X-Adlaire-Signature: sha256={hex}` ヘッダーに付与する。

## P7.6 追加ファイル

```
Adlaire Deploy/
├── src/
│   ├── ... (既存ファイル)
│   ├── build.ts             # ビルドステップ実行
│   ├── log_writer.ts        # ログ永続化
│   ├── env_crypto.ts        # 環境変数暗号化
│   └── notify.ts            # デプロイ通知 Webhook
```

---

# Phase 8 詳細仕様 — edge 自動回復

## P8.1 スコープ

Phase 8 は以下の機能を提供する。

1. **edge 自動回復** — ダウンした edge ノードの自動検出と復旧トリガー

## P8.2 edge 自動回復

### P8.2.1 概要

- Phase 5 では、edge ダウン時に `unhealthy` マークのみ行い自動回復は行わなかった。
- Phase 8 では、edge の自動回復（再接続・設定再同期・再有効化）を実装する。

### P8.2.2 回復フロー

1. origin のクラスタ管理（`cluster.ts`）が edge の `unhealthy` 状態を検出する。
2. バックオフ付きで edge への接続を再試行する（初回: 10 秒, 最大: 5 分）。
3. 接続が回復した場合、現在の設定・プロジェクト状態を edge へ再同期する。
4. 同期完了後、edge を `healthy` に復帰させる。
5. 回復ログを記録する。

### P8.2.3 回復条件

- edge プロセス自体のクラッシュ: origin が上記フローで自動回復を試みる。
- ネットワーク断: 接続回復後に自動再同期する。
- edge の手動停止（`deploy node remove`）: 自動回復対象外とする（意図的な操作のため）。

### P8.2.4 クラスタ設定への追加フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `auto_recovery_enabled` | `boolean` | `true` | edge 自動回復の有効化 |
| `recovery_initial_delay` | `number` | `10` | 初回再試行までの遅延（秒） |
| `recovery_max_delay` | `number` | `300` | 最大再試行間隔（秒） |

### P8.2.5 制約事項

- origin 自体のクラッシュ回復は対象外（OS レベルのプロセス監視で対応すること）。
- edge 側の Worker 自動再起動は Phase 6（P6.4）の仕様に委ねる。

---

# Phase 9 詳細仕様 — 管理ダッシュボード Web UI

## P9.1 スコープ

Phase 9 は以下の機能を提供する。

1. **管理ダッシュボード Web UI** — ブラウザベースのプラットフォーム管理画面

## P9.2 管理ダッシュボード

### P9.2.1 概要

- Adlaire Deploy のすべての管理操作を Web ブラウザから実施できる UI を提供する。
- バックエンド: Deno HTTP サーバー（既存プラットフォームに統合）。
- フロントエンド: HTML5 + JavaScript（バニラ）。外部ライブラリ・CDN 依存禁止。
- 認証: セッショントークン方式（ログインフォーム → トークン発行 → Cookie 保存）。

### P9.2.2 提供機能

| 機能 | 概要 |
|------|------|
| プロジェクト一覧 | 全プロジェクトの状態（running / stopped / failed）を一覧表示する |
| プロジェクト操作 | 起動・停止・再起動・デプロイ・ロールバックをボタン操作で実行する |
| ログビューア | SSE ストリーミングを用いたリアルタイムログ表示（P6.3 連携） |
| デプロイ履歴 | プロジェクトごとのデプロイ履歴一覧と詳細表示 |
| プロジェクト設定編集 | プロジェクト設定（hostname・entry・環境変数等）の編集フォーム |
| クラスタ状態 | origin / edge ノードの一覧・ヘルス状態表示 |

### P9.2.3 エンドポイント

| パス | 説明 |
|------|------|
| `GET /dashboard` | ダッシュボードトップ（プロジェクト一覧） |
| `GET /dashboard/projects/:id` | プロジェクト詳細（ログ・履歴・設定） |
| `GET /dashboard/cluster` | クラスタ状態ページ |
| `POST /dashboard/auth/login` | ログイン（セッションを発行） |
| `POST /dashboard/auth/logout` | ログアウト |

### P9.2.4 認証仕様

- ログインフォームで管理者パスワードを入力するとセッショントークンを発行する。
- 管理者パスワード: 環境変数 `ADLAIRE_DEPLOY_ADMIN_PASSWORD` から取得する（平文保存禁止）。
- セッショントークン: 64 バイト乱数を Base64 エンコードした文字列。Deno KV に保存する。
- セッション有効期限: 24 時間（設定可能）。
- CSRF 対策: 状態変更操作（POST）では `X-Requested-With: XMLHttpRequest` ヘッダーを必須とする。

### P9.2.5 セキュリティ要件

- ダッシュボードは内部ネットワーク向けに設計する。公開インターネットへの直接露出は推奨しない。
- XSS 対策: ユーザー入力・サーバーデータをすべて HTML エスケープして出力する。
- クリックジャッキング対策: `X-Frame-Options: DENY` ヘッダーを全レスポンスに付与する。
- セキュアな Cookie: `HttpOnly; SameSite=Strict` を必須とする。HTTPS 環境では `Secure` も付与する。

### P9.2.6 ポート設定

- ダッシュボードはリバースプロキシとは**別ポート**で動作する（デフォルト: 8001）。
- ポートはプラットフォーム設定（`deploy.json`）で変更可能とする。

```json
{
  "dashboard_port": 8001,
  "dashboard_session_ttl": 86400
}
```

### P9.2.7 追加ファイル

```
Adlaire Deploy/
├── src/
│   ├── ... (既存ファイル)
│   └── dashboard/
│       ├── server.ts        # ダッシュボード HTTP サーバー
│       ├── auth.ts          # 認証・セッション管理
│       ├── api.ts           # ダッシュボード内部 API
│       └── static/
│           ├── index.html   # ダッシュボード UI
│           ├── project.html # プロジェクト詳細ページ
│           ├── cluster.html # クラスタ状態ページ
│           └── dashboard.js # フロントエンド JS
```

---

# Phase 10 詳細仕様 — 監査ログ・デプロイパイプライン並列化・モノレポ対応

## P10.1 スコープ

Phase 10 は以下の機能を提供する。

1. **監査ログ** — 管理 API・ダッシュボード操作の記録・参照
2. **デプロイパイプライン並列化** — 複数プロジェクトの同時デプロイ
3. **モノレポ対応** — 単一 Git リポジトリ内のサブディレクトリ単位のプロジェクト定義

## P10.2 監査ログ

### P10.2.1 概要

- 管理 API およびダッシュボードからの状態変更操作を Deno KV に記録する。
- 記録対象: プロジェクトの起動・停止・再起動・デプロイ・ロールバック・設定変更・認証情報操作。
- 参照: API および CLI で最新 N 件の監査ログを取得できる。

### P10.2.2 監査ログ構造

```typescript
interface AuditLog {
  id: string;          // 監査ログ ID（audit_NNNN）
  timestamp: string;   // ISO8601
  action: string;      // 操作種別（start / stop / restart / deploy / rollback / env_update / credential_set / ...）
  project_id: string | null;  // 対象プロジェクト ID（プラットフォーム操作の場合 null）
  actor: string;       // 実行者（"cli" / "api" / "dashboard" / "webhook" / "cluster-sync"）
  detail: string;      // 操作詳細（コミット SHA・エラーメッセージ等）
  result: "success" | "failure";
}
```

### P10.2.3 KV 保存仕様

- KV キー: `["audit", timestamp_reverse, id]`（降順ソート用に `timestamp_reverse = 9999999999999 - Date.now()`）
- 保持件数: 最大 10,000 件（超過分は古い順に削除）
- 書き込み失敗はデプロイ等の主処理に影響させない（非同期・非ブロッキング）

### P10.2.4 管理 API エンドポイント

| エンドポイント | 説明 |
|---|---|
| `GET /api/audit?limit=N&project_id=X` | 監査ログ一覧（最大 100 件、プロジェクト絞り込み可） |

### P10.2.5 CLI コマンド

| コマンド | 説明 |
|---------|------|
| `deploy audit [--limit N] [--project <id>]` | 監査ログを表示する |

## P10.3 デプロイパイプライン並列化

### P10.3.1 概要

- 現状は各プロジェクトが独立した直列キューを持つ（Phase 2 実装）。
- Phase 10 では複数プロジェクトのデプロイを並列実行できるようにする。

### P10.3.2 並列化仕様

- 並列度: デプロイ設定（`deploy.json`）の `max_parallel_deploys` フィールドで制御する。デフォルト: `4`。
- 同一プロジェクトのデプロイは引き続き直列（Phase 2 のロック機構を維持）。
- 異なるプロジェクト間は `max_parallel_deploys` の範囲内で並列実行する。
- セマフォ実装: `Deployer` 内で並列実行中カウンターを管理し、上限に達した場合は待機する。

### P10.3.3 DeployConfig への追加フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `max_parallel_deploys` | `number` | `4` | 同時デプロイ数の上限 |

## P10.4 モノレポ対応

### P10.4.1 概要

- 単一 Git リポジトリ内の特定サブディレクトリをプロジェクトルートとして扱う。
- 例: `monorepo/packages/api/` を `my-api` プロジェクトのルートに指定する。

### P10.4.2 ProjectConfig への追加フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `root_dir` | `string \| null` | `null` | Git リポジトリルートからの相対パス。null の場合はリポジトリルートを使用 |

### P10.4.3 動作仕様

- `root_dir` が設定されている場合、エントリポイントのパス解決は `projects_dir/{id}/{root_dir}/{entry}` となる。
- ビルドステップ（P7.2）の CWD も `projects_dir/{id}/{root_dir}/` に変更する。
- Git の clone/pull はリポジトリ全体を対象とする（部分クローンは行わない）。

### P10.5 追加ファイル

```
Adlaire Deploy/
├── src/
│   ├── ... (既存ファイル)
│   └── audit.ts             # 監査ログ
```

---

# Phase 11 詳細仕様 — 静的サイトホスティング・メトリクス収集

## P11.1 スコープ

Phase 11 は以下の機能を提供する。

1. **静的サイトホスティング** — ビルド済み静的ファイルの HTTP 配信（Worker 不要）
2. **メトリクス収集** — リクエスト数・レスポンスタイム・エラー率の計測とダッシュボード表示

## P11.2 静的サイトホスティング

### P11.2.1 概要

- Worker プロセスを起動せず、ファイルシステム上の静的ファイルをリバースプロキシが直接配信する。
- 対象: HTML・CSS・JavaScript・画像等の静的成果物。
- ビルドステップ（P7.2）と組み合わせて、デプロイ時にビルドし成果物を配信する用途を想定する。

### P11.2.2 ProjectConfig への追加フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `type` | `"worker" \| "static"` | `"worker"` | プロジェクト種別 |
| `static_dir` | `string \| null` | `null` | 配信する静的ファイルのディレクトリ（`projects_dir/{id}/` からの相対パス） |

### P11.2.3 配信仕様

- `type: "static"` の場合、リバースプロキシは Worker へ転送せず、`static_dir` 内のファイルを直接返す。
- `index.html` フォールバック: ファイルが存在しない場合は `index.html` を返す（SPA 対応）。
- MIME タイプ: 拡張子から自動判定する。
- ディレクトリトラバーサル防止: リクエストパスを正規化し、`static_dir` 外へのアクセスを拒否する。
- `type: "static"` のプロジェクトは `port` フィールドを省略可能とする（Worker が不要なため）。

### P11.2.4 制約事項

- Range リクエスト・圧縮・ETag は Phase 11 の対象外（将来の改良項目）。
- `type: "static"` のプロジェクトには `start` / `stop` / `restart` 操作を禁止する。

## P11.3 メトリクス収集

### P11.3.1 概要

- リバースプロキシ層でリクエスト統計をメモリ内に収集する。
- ダッシュボードで折れ線グラフ（リクエスト数・エラー率・平均レスポンスタイム）を表示する。

### P11.3.2 収集する指標

| 指標 | 説明 |
|------|------|
| `request_count` | 総リクエスト数 |
| `error_count` | 4xx/5xx レスポンス数 |
| `total_response_time_ms` | 累計レスポンスタイム（平均計算用） |
| `p99_response_time_ms` | 99パーセンタイルレスポンスタイム（リングバッファで計算） |

### P11.3.3 保存仕様

- 保存先: メモリ内（再起動でリセット）。
- 粒度: 1 分単位のバケツ（最新 60 分分を保持）。
- プロジェクト単位で独立して管理する。

### P11.3.4 管理 API エンドポイント

| エンドポイント | 説明 |
|---|---|
| `GET /api/projects/{id}/metrics` | 直近 60 分のメトリクスデータを返す |
| `GET /api/metrics` | 全プロジェクトのサマリーメトリクスを返す |

### P11.3.5 追加ファイル

```
Adlaire Deploy/
├── src/
│   ├── ... (既存ファイル)
│   └── metrics.ts           # メトリクス収集
```

---

# Phase 12 詳細仕様 — Blue-Green デプロイ・カナリアデプロイ

## P12.1 スコープ

Phase 12 は以下の機能を提供する。

1. **Blue-Green デプロイ** — 新バージョンを裏側で起動し、ヘルスチェック通過後にルーティングを切り替える
2. **カナリアデプロイ** — 一部トラフィックを新バージョンに段階的に分散する

## P12.2 Blue-Green デプロイ

### P12.2.1 概要

- 同一プロジェクトに「blue（現行）」と「green（新バージョン）」の 2 つの Worker スロットを持つ。
- デプロイ時: green スロットに新バージョンを起動 → ヘルスチェック通過 → blue/green を切り替え → 旧 blue を停止。
- ダウンタイムゼロの更新を実現する。

### P12.2.2 ProjectConfig への追加フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `blue_green` | `boolean` | `false` | Blue-Green デプロイの有効化 |
| `green_port` | `number \| null` | `null` | Green スロット用ポート（`port` とは別に指定する） |

### P12.2.3 デプロイフロー

1. Green スロットのポートに新バージョンの Worker を起動する。
2. `health_check_enabled` が true の場合、Green に対してヘルスチェックを実施する（最大 60 秒待機）。
3. ヘルスチェック通過後、リバースプロキシのルーティングを Green ポートに切り替える。
4. 旧 Blue Worker を停止する（SIGTERM → SIGKILL P1.4.4 準拠）。
5. Green を新たな Blue として記録する。
6. ヘルスチェック失敗時: Green を停止し、旧 Blue を継続稼働させる（自動ロールバック）。

### P12.2.4 制約事項

- Blue-Green 有効時は `auto_restart`（P6.4）は Blue スロットのみに適用する。
- `green_port` は他プロジェクトの `port` / `green_port` と重複してはならない。

## P12.3 カナリアデプロイ

### P12.3.1 概要

- リバースプロキシが同一プロジェクトの Stable（旧）と Canary（新）にリクエストをウェイト比で振り分ける。
- トラフィックを段階的に移行し、問題なければ 100% を Canary に切り替える。

### P12.3.2 ProjectConfig への追加フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `canary` | `CanaryConfig \| null` | `null` | カナリア設定（null は無効） |

```typescript
interface CanaryConfig {
  /** カナリアスロットのポート番号 */
  canary_port: number;
  /** カナリアへのトラフィック割合（0〜100） */
  weight: number;
}
```

### P12.3.3 ルーティング仕様

- `weight: 10` の場合、リクエスト 10 件に 1 件をカナリアポートへ転送する（擬似乱数で判定）。
- カナリアが `failed` または `stopped` 状態の場合、全トラフィックを Stable に転送する（安全フォールバック）。

### P12.3.4 CLI コマンド

| コマンド | 説明 |
|---------|------|
| `deploy canary set <id> --port <port> --weight <0-100>` | カナリア設定を更新する |
| `deploy canary promote <id>` | カナリアを 100% にして Stable に昇格する |
| `deploy canary abort <id>` | カナリアを停止し Stable のみに戻す |

### P12.3.5 制約事項

- Blue-Green と Canary は同一プロジェクトで同時に有効にしてはならない。
- `canary_port` は他プロジェクトの `port` / `green_port` / `canary_port` と重複してはならない。

---

# Phase 13 詳細仕様 — デプロイスケジューリング・デプロイプレビュー URL

## P13.1 スコープ

Phase 13 は以下の機能を提供する。

1. **デプロイスケジューリング** — cron 式または日時指定による予約デプロイ
2. **デプロイプレビュー URL** — ブランチ単位の一時的なプレビュー環境の自動発行

## P13.2 デプロイスケジューリング

### P13.2.1 概要

- プロジェクトごとにデプロイのスケジュールを設定し、指定時刻に自動デプロイを実行する。
- cron 式（5 フィールド形式）または ISO8601 日時（1 回限り）で指定する。

### P13.2.2 スケジュール設定

```typescript
interface ScheduledDeploy {
  id: string;              // スケジュール ID（sched_NNNN）
  project_id: string;      // 対象プロジェクト ID
  cron: string | null;     // cron 式（例: "0 3 * * *"）
  run_at: string | null;   // ISO8601 日時（1 回限り実行）
  branch: string;          // デプロイするブランチ
  enabled: boolean;        // 有効フラグ
  last_run: string | null; // 最終実行日時
  next_run: string | null; // 次回実行予定日時（計算値）
}
```

### P13.2.3 cron 仕様

- フィールド: `分 時 日 月 曜日`（標準 5 フィールド cron）
- 外部ライブラリ不使用: プラットフォーム内部で次回実行時刻を計算する。
- タイムゾーン: UTC で評価する。
- 精度: 1 分単位。プラットフォームは 60 秒間隔でスケジュールをチェックする。

### P13.2.4 スケジュール保存

- 保存先: Deno KV（`["schedule", project_id, schedule_id]`）。
- 1 回限り実行（`run_at` 指定）は実行後に自動削除する。

### P13.2.5 管理 API エンドポイント

| エンドポイント | 説明 |
|---|---|
| `GET /api/projects/{id}/schedules` | スケジュール一覧 |
| `POST /api/projects/{id}/schedules` | スケジュール追加 |
| `DELETE /api/projects/{id}/schedules/{schedule-id}` | スケジュール削除 |

### P13.2.6 CLI コマンド

| コマンド | 説明 |
|---------|------|
| `deploy schedule add <id> --cron "<expr>" --branch <br>` | cron スケジュールを追加する |
| `deploy schedule add <id> --at <ISO8601> --branch <br>` | 1 回限りスケジュールを追加する |
| `deploy schedule list <id>` | スケジュール一覧を表示する |
| `deploy schedule remove <id> <schedule-id>` | スケジュールを削除する |

## P13.3 デプロイプレビュー URL

### P13.3.1 概要

- Git ブランチ単位で一時的なプレビュー環境を自動作成し、専用 URL でアクセスできるようにする。
- プレビュー環境は TTL（デフォルト 24 時間）経過後に自動削除する。

### P13.3.2 プレビュー環境の構造

```typescript
interface PreviewEnv {
  id: string;              // プレビュー ID（preview_NNNN）
  project_id: string;      // 親プロジェクト ID
  branch: string;          // デプロイするブランチ
  hostname: string;        // プレビュー用ホスト名（自動生成: {branch}-{id}.{base_domain}）
  port: number;            // プレビュー用ポート（自動割り当て）
  status: "running" | "stopped" | "failed";
  created_at: string;      // ISO8601
  expires_at: string;      // ISO8601（TTL 経過後に自動削除）
}
```

### P13.3.3 プレビュー用ホスト名

- 形式: `{sanitized-branch}-{preview-id}.preview.{base_domain}`
- `base_domain`: プラットフォーム設定（`deploy.json`）の `preview_base_domain` フィールドで指定する。
- ブランチ名のサニタイズ: 英数字・ハイフン以外の文字を `-` に変換する。

### P13.3.4 ポート自動割り当て

- プレビュー用ポートは `preview_port_range_start`〜`preview_port_range_end` の範囲から自動割り当てする（デフォルト: 10000〜19999）。
- 使用中のポートは Deno KV で管理し、重複を防ぐ。

### P13.3.5 DeployConfig への追加フィールド

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `preview_base_domain` | `string \| null` | `null` | プレビュー URL のベースドメイン |
| `preview_ttl_seconds` | `number` | `86400` | プレビュー環境の TTL（秒） |
| `preview_port_range_start` | `number` | `10000` | プレビュー用ポート範囲の開始 |
| `preview_port_range_end` | `number` | `19999` | プレビュー用ポート範囲の終了 |

### P13.3.6 管理 API エンドポイント

| エンドポイント | 説明 |
|---|---|
| `GET /api/projects/{id}/previews` | プレビュー環境一覧 |
| `POST /api/projects/{id}/previews` | プレビュー環境を作成する（`{ branch: string }` を受け取る） |
| `DELETE /api/projects/{id}/previews/{preview-id}` | プレビュー環境を削除する |

### P13.3.7 CLI コマンド

| コマンド | 説明 |
|---------|------|
| `deploy preview create <id> --branch <br>` | プレビュー環境を作成する |
| `deploy preview list <id>` | プレビュー環境一覧を表示する |
| `deploy preview remove <id> <preview-id>` | プレビュー環境を削除する |

### P13.3.8 追加ファイル

```
Adlaire Deploy/
├── src/
│   ├── ... (既存ファイル)
│   ├── scheduler.ts         # デプロイスケジューリング
│   └── preview.ts           # プレビュー環境管理
```

### P13.3.9 制約事項

- `preview_base_domain` が未設定の場合、プレビュー機能は無効とする。
- プレビュー環境は本番プロジェクトの環境変数をコピーしない（セキュリティ上）。独立した空の環境変数で起動する。
- 同一ブランチのプレビューを複数同時に作成できる（各 preview_id で区別）。

---

## Phase 14: VPS 運用基盤

**対象バージョン: Ver.1.9-14**

VPS（仮想プライベートサーバー）へのインストール・セットアップ・アップデート・CI/CD 連携・バックアップ・リストアを提供する運用基盤フェーズ。

---

## P14.1 インストールスクリプト

### P14.1.1 概要

- `install.sh` をリポジトリに同梱し、1コマンドでセットアップを完了する。
- 冪等性を保証する（再実行しても副作用がない）。
- Ubuntu 22.04 LTS / Debian 12 / Rocky Linux 9 をサポート対象とする。

### P14.1.2 インストール先

| パス | 内容 |
|------|------|
| `/opt/adlaire-deploy/` | アプリケーションルート |
| `/etc/adlaire-deploy/` | 設定ファイル（`deploy.json`） |
| `/var/lib/adlaire-deploy/` | KV ストア・ログ・スナップショット |
| `/usr/local/bin/adlaire-deploy` | CLI シンボリックリンク |

### P14.1.3 インストール処理フロー

1. OS・アーキテクチャ検出（`uname -m`）
2. Deno インストール確認・未インストール時は公式スクリプトで自動インストール
3. 実行ユーザー `adlaire` を作成（既存の場合はスキップ）
4. アプリケーションファイルを `/opt/adlaire-deploy/` に展開
5. `DEPLOY_SECRET`・`ADMIN_PASSWORD_HASH`・`SESSION_SECRET` を `openssl rand -hex 32` で自動生成し `/etc/adlaire-deploy/.env` に書き込む
6. systemd ユニットファイルをインストール・有効化
7. ファイアウォール設定（ufw が存在する場合: ポート 8000/8001/8002 を許可）
8. `systemctl start adlaire-deploy` でサービス起動
9. ヘルスチェック（`curl -sf http://localhost:8000/health`）で起動確認

### P14.1.4 インストールスクリプトのオプション

| オプション | 説明 |
|-----------|------|
| `--prefix <path>` | インストール先を変更（デフォルト: `/opt/adlaire-deploy`） |
| `--no-systemd` | systemd セットアップをスキップ |
| `--no-firewall` | ファイアウォール設定をスキップ |
| `--user <name>` | 実行ユーザー名を変更（デフォルト: `adlaire`） |

### P14.1.5 追加ファイル

```
Adlaire Deploy/
└── install.sh               # VPS インストールスクリプト
```

---

## P14.2 systemd サービス化

### P14.2.1 ユニットファイル仕様

```ini
[Unit]
Description=Adlaire Deploy Platform
Documentation=https://github.com/fqwink/adlaire
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=adlaire
Group=adlaire
WorkingDirectory=/opt/adlaire-deploy
EnvironmentFile=-/etc/adlaire-deploy/.env
ExecStart=/usr/local/bin/deno run --allow-all src/main.ts serve
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
KillMode=mixed
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/adlaire-deploy /etc/adlaire-deploy

[Install]
WantedBy=multi-user.target
```

### P14.2.2 追加ファイル

```
Adlaire Deploy/
└── systemd/
    └── adlaire-deploy.service   # systemd ユニットファイルテンプレート
```

---

## P14.3 セルフアップデート

### P14.3.1 概要

- CLI コマンド・管理 API の双方からプラットフォーム自体をアップデートできる。
- アップデートは **ゼロダウンタイム** で行う（新バージョンを別ディレクトリに展開し、切り替え後に旧バージョンを削除）。
- アップデート失敗時は旧バージョンへ自動ロールバックする。

### P14.3.2 アップデートフロー

1. 最新バージョン情報を取得（GitHub Releases API）
2. 現行バージョンと比較し、新バージョンが存在する場合のみ続行
3. アーカイブをダウンロードし SHA-256 チェックサムを検証
4. `/opt/adlaire-deploy-new/` に展開
5. 設定・KVデータのバックアップを自動取得（P14.5 バックアップ仕様に準拠）
6. `systemctl stop adlaire-deploy`
7. `/opt/adlaire-deploy/` を `/opt/adlaire-deploy-prev/` にリネーム
8. `/opt/adlaire-deploy-new/` を `/opt/adlaire-deploy/` にリネーム
9. `systemctl start adlaire-deploy`
10. ヘルスチェック（3回リトライ、5秒間隔）
11. 失敗時: `/opt/adlaire-deploy-prev/` を復元して旧バージョンで起動

### P14.3.3 CLI コマンド

| コマンド | 説明 |
|---------|------|
| `deploy platform update` | 最新バージョンにアップデート |
| `deploy platform update --check` | アップデート有無を確認のみ（適用しない） |
| `deploy platform update --version <ver>` | 特定バージョンにアップデート |
| `deploy platform rollback` | 直前のバージョンに戻す |
| `deploy platform version` | 現行バージョンを表示 |

### P14.3.4 管理 API エンドポイント

| エンドポイント | 説明 |
|---|---|
| `GET /api/platform/version` | 現行バージョン情報を取得 |
| `POST /api/platform/update` | アップデートを実行（`{ version?: string }` を受け取る） |
| `POST /api/platform/rollback` | 直前バージョンへロールバック |

### P14.3.5 VERSION ファイル

- リポジトリルートに `VERSION` ファイルを配置し、現行バージョン文字列（例: `1.9-14`）を記録する。
- 全プロジェクト共通のバージョン管理規則（`Ver.{Major}.{Minor}-{Build}`）に準拠する。

### P14.3.6 追加ファイル

```
Adlaire Deploy/
├── src/
│   └── updater.ts           # セルフアップデート処理
└── VERSION                  # 現行バージョン文字列
```

---

## P14.4 GitHub Actions CI/CD テンプレート

### P14.4.1 概要

- Adlaire Deploy 自体の自動デプロイ用 GitHub Actions ワークフローを提供する。
- 管理対象プロジェクトの Webhook トリガー用ワークフローテンプレートを提供する。

### P14.4.2 プラットフォーム自動アップデートワークフロー

- ファイル: `.github/workflows/self-deploy.yml`
- トリガー: `Adlaire Deploy/` 以下の変更を `main` ブランチに push した時
- 処理: 管理 API `POST /api/platform/update` を呼び出す
- 認証: GitHub Secrets に `ADLAIRE_DEPLOY_URL`・`ADLAIRE_ADMIN_TOKEN` を設定する

### P14.4.3 管理対象プロジェクト Webhook ワークフローテンプレート

- ファイル: `docs/ci-templates/webhook-deploy.yml`
- トリガー: 指定ブランチへの push
- 処理: Adlaire Deploy の Webhook エンドポイントを HMAC-SHA256 署名付きで呼び出す

### P14.4.4 追加ファイル

```
Adlaire Deploy/
├── .github/
│   └── workflows/
│       └── self-deploy.yml          # プラットフォーム自動デプロイ
└── docs/
    └── ci-templates/
        └── webhook-deploy.yml       # Webhook トリガーテンプレート
```

---

## P14.5 バックアップ・リストア

### P14.5.1 概要

- CLI コマンドでプラットフォームの全状態を単一アーカイブにバックアップ・リストアできる。
- アーカイブ形式: `.tar.gz`

### P14.5.2 バックアップ対象

| 対象 | パス | 説明 |
|------|------|------|
| 設定ファイル | `/etc/adlaire-deploy/deploy.json` | プロジェクト設定 |
| 環境変数ファイル | `/etc/adlaire-deploy/.env` | プラットフォームシークレット |
| KV データ | `/var/lib/adlaire-deploy/kv/` | デプロイ履歴・認証情報等 |
| ログ | `/var/lib/adlaire-deploy/logs/` | デプロイログ |

### P14.5.3 CLI コマンド

| コマンド | 説明 |
|---------|------|
| `deploy platform backup` | バックアップを作成（`./adlaire-backup-{timestamp}.tar.gz`） |
| `deploy platform backup --output <path>` | 出力先を指定 |
| `deploy platform restore <archive>` | バックアップからリストア |
| `deploy platform restore <archive> --dry-run` | リストア内容を確認のみ（適用しない） |

### P14.5.4 追加ファイル

```
Adlaire Deploy/
└── src/
    └── backup.ts            # バックアップ・リストア処理
```

---

## P14.6 マルチVPS プロビジョニング

### P14.6.1 概要

- Origin + Edge 複数VPS 構成のための設定配布を行うシェルスクリプトを提供する。
- 純粋なシェルスクリプト（`provision.sh`）で実装する（外部ツール依存なし）。

### P14.6.2 機能

- `provision.sh` は `deploy.json` の `cluster` 設定を読み込み、各 Edge ノードへ SSH で設定を配布する。
- 配布処理: `scp` で `deploy.json` を転送 → `ssh` で `systemctl reload adlaire-deploy` を実行する。

### P14.6.3 追加ファイル

```
Adlaire Deploy/
└── provision.sh             # マルチVPS プロビジョニングスクリプト
```

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
