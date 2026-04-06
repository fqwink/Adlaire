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
