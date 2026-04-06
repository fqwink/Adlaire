/**
 * Adlaire Deploy — 型定義
 */

/** プロセス状態 */
export type ProcessState =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "failed";

/** Git 連携設定 */
export interface GitConfig {
  /** Git リポジトリ URL（HTTPS のみ） */
  url: string;
  /** デプロイ対象ブランチ */
  branch: string;
  /** Webhook 検証用シークレット */
  webhook_secret: string;
}

/** Worker 権限設定 */
export interface Permissions {
  allow_net: boolean;
  allow_read: boolean;
  allow_write: boolean;
  allow_env: boolean;
  allow_ffi: boolean;
  allow_run: boolean;
}

/** プロジェクト設定 */
export interface ProjectConfig {
  /** ルーティング対象のホスト名 */
  hostname: string;
  /** エントリポイントファイル（projects_dir/{id}/ からの相対パス） */
  entry: string;
  /** Worker がリッスンするポート番号 */
  port: number;
  /** プラットフォーム起動時に自動起動するか */
  auto_start: boolean;
  /** Git 連携設定（null の場合は Git 連携無効） */
  git: GitConfig | null;
  /** Worker に注入する環境変数 */
  env: Record<string, string>;
  /** Worker の Deno パーミッション設定（null はデフォルト値を使用） */
  permissions: Permissions | null;
}

/** ログエントリ */
export interface LogEntry {
  timestamp: string;
  stream: "stdout" | "stderr";
  line: string;
}

/** デプロイ状態 */
export type DeployState =
  | "idle"
  | "deploying"
  | "deployed"
  | "deploy_failed";

/** デプロイレコード */
export interface DeployRecord {
  /** デプロイ ID */
  id: string;
  /** プロジェクト ID */
  project_id: string;
  /** コミット SHA */
  commit: string;
  /** ブランチ */
  branch: string;
  /** push 実行者 */
  pusher: string;
  /** デプロイ結果 */
  status: "deployed" | "deploy_failed";
  /** 開始時刻 */
  started_at: string;
  /** 完了時刻 */
  finished_at: string;
  /** エラーメッセージ（成功時 null） */
  error: string | null;
  /** Edge デプロイ結果（origin のみ） */
  edge_results?: EdgeDeployResult[];
}

/** プラットフォーム設定（deploy.json） */
export interface DeployConfig {
  /** 設定フォーマットバージョン */
  version: 1;
  /** リバースプロキシのバインドアドレス */
  host: string;
  /** リバースプロキシのバインドポート */
  port: number;
  /** プロジェクト配置ディレクトリパス */
  projects_dir: string;
  /** データディレクトリパス（KV ファイル格納先） */
  data_dir: string;
  /** クラスタ設定（null はスタンドアロンモード） */
  cluster: ClusterConfig | null;
  /** プロジェクト定義マップ（キー = プロジェクト ID） */
  projects: Record<string, ProjectConfig>;
}

/** Edge ノード定義 */
export interface EdgeNode {
  node_id: string;
  url: string;
}

/** クラスタ設定 */
export interface ClusterConfig {
  role: "origin" | "edge";
  node_id: string;
  secret: string;
  edges: EdgeNode[];
  origin_url?: string;
}

/** Edge ノード状態 */
export type NodeHealth = "healthy" | "unhealthy" | "unknown";

/** Edge ノードステータス */
export interface NodeStatus {
  node_id: string;
  url: string;
  health: NodeHealth;
  last_check: string | null;
}

/** Edge デプロイ結果 */
export interface EdgeDeployResult {
  node_id: string;
  status: "success" | "failed" | "unreachable";
  error?: string;
}

/** KV 統計情報 */
export interface KvStats {
  path: string;
  size_bytes: number;
  exists: boolean;
}

/** プロセス情報（ランタイム） */
export interface ProcessInfo {
  /** プロジェクト ID */
  id: string;
  /** 現在の状態 */
  state: ProcessState;
  /** Deno サブプロセス（running 時のみ） */
  process: Deno.ChildProcess | null;
  /** 設定 */
  config: ProjectConfig;
}

/** 管理 API レスポンス（成功） */
export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data: T;
}

/** 管理 API レスポンス（エラー） */
export interface ApiErrorResponse {
  ok: false;
  error: string;
  message: string;
}

/** 管理 API レスポンス */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/** プロジェクト状態（API レスポンス用） */
export interface ProjectStatus {
  id: string;
  hostname: string;
  port: number;
  auto_start: boolean;
  state: ProcessState;
  git: GitConfig | null;
  deploy_state: DeployState;
}
