/**
 * Adlaire Deploy — クラスタ管理
 *
 * origin/edge ノード間のヘルスチェック・設定同期・デプロイ伝播
 */

import { loadConfig, saveConfig } from "./config.ts";
import type {
  ClusterConfig,
  DeployConfig,
  EdgeDeployResult,
  NodeHealth,
  NodeStatus,
  ProjectConfig,
} from "./types.ts";

/** ヘルスチェック間隔（ms） */
const HEALTH_CHECK_INTERVAL_MS = 30_000;
/** ヘルスチェックタイムアウト（ms） */
const HEALTH_CHECK_TIMEOUT_MS = 5_000;
/** unhealthy 判定に必要な連続失敗回数 */
const UNHEALTHY_THRESHOLD = 3;
/** タイムスタンプ許容範囲（秒） */
const TIMESTAMP_TOLERANCE_SEC = 60;

/** Edge ノードヘルス追跡 */
interface EdgeHealthTracker {
  node_id: string;
  url: string;
  health: NodeHealth;
  consecutive_failures: number;
  last_check: string | null;
  /** Phase 8: 自動回復タイマー */
  recovery_timer: number | null;
  /** Phase 8: 現在のリカバリー遅延（ms） */
  recovery_delay_ms: number;
  /** Phase 8: 手動削除フラグ（自動回復対象外） */
  manually_removed: boolean;
}

export class ClusterManager {
  private config: DeployConfig;
  private cluster: ClusterConfig;
  private edgeHealth: Map<string, EdgeHealthTracker> = new Map();
  private healthCheckTimer: number | null = null;

  constructor(config: DeployConfig) {
    this.config = config;
    this.cluster = config.cluster!;

    // origin の場合、edge ノードのヘルス追跡を初期化
    if (this.cluster.role === "origin") {
      for (const edge of this.cluster.edges) {
        this.edgeHealth.set(edge.node_id, {
          node_id: edge.node_id,
          url: edge.url,
          health: "unknown",
          consecutive_failures: 0,
          last_check: null,
          recovery_timer: null,
          recovery_delay_ms: (this.cluster.recovery_initial_delay ?? 10) * 1000,
          manually_removed: false,
        });
      }
    }
  }

  /** ヘルスチェックを開始する（origin のみ） */
  startHealthChecks(): void {
    if (this.cluster.role !== "origin") return;
    if (this.cluster.edges.length === 0) return;

    this.runHealthChecks();
    this.healthCheckTimer = setInterval(
      () => this.runHealthChecks(),
      HEALTH_CHECK_INTERVAL_MS,
    );
  }

  /** ヘルスチェックを停止する */
  stopHealthChecks(): void {
    if (this.healthCheckTimer !== null) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    // Phase 8: 回復タイマーもクリア
    for (const tracker of this.edgeHealth.values()) {
      if (tracker.recovery_timer !== null) {
        clearTimeout(tracker.recovery_timer);
        tracker.recovery_timer = null;
      }
    }
  }

  /** 全 edge ノードにヘルスチェックを実行する */
  private async runHealthChecks(): Promise<void> {
    const checks = Array.from(this.edgeHealth.values()).map((tracker) =>
      this.checkEdgeHealth(tracker)
    );
    await Promise.allSettled(checks);
  }

  /** 単一 edge ノードのヘルスチェック */
  private async checkEdgeHealth(tracker: EdgeHealthTracker): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

      const authHeaders = await this.signRequest("/api/health", "");
      const response = await fetch(`${tracker.url}/api/health`, {
        signal: controller.signal,
        headers: authHeaders,
      });

      clearTimeout(timeout);

      if (response.ok) {
        if (tracker.health === "unhealthy") {
          console.log(`[deploy] Edge "${tracker.node_id}" recovered to healthy`);
          // 回復時にリカバリー遅延をリセット
          tracker.recovery_delay_ms = (this.cluster.recovery_initial_delay ?? 10) * 1000;
          if (tracker.recovery_timer !== null) {
            clearTimeout(tracker.recovery_timer);
            tracker.recovery_timer = null;
          }
        }
        tracker.health = "healthy";
        tracker.consecutive_failures = 0;
      } else {
        tracker.consecutive_failures++;
      }
    } catch {
      tracker.consecutive_failures++;
    }

    if (tracker.consecutive_failures >= UNHEALTHY_THRESHOLD) {
      const wasHealthy = tracker.health !== "unhealthy";
      tracker.health = "unhealthy";

      // Phase 8: 自動回復トリガー
      if (wasHealthy) {
        this.triggerAutoRecovery(tracker);
      }
    }

    tracker.last_check = new Date().toISOString();
  }

  /** Phase 8: edge 自動回復を開始する */
  private triggerAutoRecovery(tracker: EdgeHealthTracker): void {
    // 自動回復が無効または手動削除された場合は skip
    if (this.cluster.auto_recovery_enabled === false) return;
    if (tracker.manually_removed) return;
    if (tracker.recovery_timer !== null) return;

    const maxDelay = (this.cluster.recovery_max_delay ?? 300) * 1000;

    console.log(
      `[deploy] Edge "${tracker.node_id}" unhealthy. Auto-recovery in ${tracker.recovery_delay_ms}ms`,
    );

    tracker.recovery_timer = setTimeout(async () => {
      tracker.recovery_timer = null;

      try {
        // 接続テスト
        const authHeaders = await this.signRequest("/api/health", "");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

        const response = await fetch(`${tracker.url}/api/health`, {
          signal: controller.signal,
          headers: authHeaders,
        });

        clearTimeout(timeout);

        if (response.ok) {
          // 接続回復 → 設定再同期
          console.log(`[deploy] Edge "${tracker.node_id}" reconnected. Syncing config...`);

          const body = JSON.stringify(this.config.projects);
          const path = "/api/cluster/sync-config";
          const syncHeaders = await this.signRequest(path, body);

          await fetch(`${tracker.url}${path}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...syncHeaders },
            body,
          });

          tracker.health = "healthy";
          tracker.consecutive_failures = 0;
          tracker.recovery_delay_ms = (this.cluster.recovery_initial_delay ?? 10) * 1000;
          console.log(`[deploy] Edge "${tracker.node_id}" auto-recovery completed`);
          return;
        }
      } catch {
        // 接続失敗
      }

      // 回復失敗 → バックオフ付きで再試行
      tracker.recovery_delay_ms = Math.min(tracker.recovery_delay_ms * 2, maxDelay);
      console.log(
        `[deploy] Edge "${tracker.node_id}" recovery failed. Next attempt in ${tracker.recovery_delay_ms}ms`,
      );
      this.triggerAutoRecovery(tracker);
    }, tracker.recovery_delay_ms) as unknown as number;
  }

  /** ノード一覧とヘルス状態を取得する */
  getNodeStatuses(): NodeStatus[] {
    return Array.from(this.edgeHealth.values()).map((t) => ({
      node_id: t.node_id,
      url: t.url,
      health: t.health,
      last_check: t.last_check,
    }));
  }

  /** 全 edge に設定を同期する */
  async syncConfigToEdges(): Promise<{ node_id: string; ok: boolean; error?: string }[]> {
    const results: { node_id: string; ok: boolean; error?: string }[] = [];
    const body = JSON.stringify(this.config.projects);
    const path = "/api/cluster/sync-config";

    const tasks = Array.from(this.edgeHealth.values()).map(async (tracker) => {
      try {
        const authHeaders = await this.signRequest(path, body);
        const response = await fetch(`${tracker.url}${path}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body,
        });

        if (response.ok) {
          results.push({ node_id: tracker.node_id, ok: true });
        } else {
          const text = await response.text();
          results.push({ node_id: tracker.node_id, ok: false, error: text });
        }
      } catch (e) {
        results.push({
          node_id: tracker.node_id,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    });

    await Promise.allSettled(tasks);
    return results;
  }

  /** 全 edge にデプロイを伝播する */
  async propagateDeploy(
    projectId: string,
    commit: string,
    branch: string,
  ): Promise<EdgeDeployResult[]> {
    const results: EdgeDeployResult[] = [];
    const body = JSON.stringify({ commit, branch });
    const path = `/api/cluster/deploy/${projectId}`;

    const tasks = Array.from(this.edgeHealth.values()).map(async (tracker) => {
      try {
        const authHeaders = await this.signRequest(path, body);
        const response = await fetch(`${tracker.url}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body,
        });

        if (response.ok) {
          results.push({ node_id: tracker.node_id, status: "success" });
        } else {
          const text = await response.text();
          results.push({ node_id: tracker.node_id, status: "failed", error: text });
        }
      } catch (e) {
        results.push({
          node_id: tracker.node_id,
          status: "unreachable",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    });

    await Promise.allSettled(tasks);
    return results;
  }

  /** リクエストに HMAC 署名を付与する */
  async signRequest(
    path: string,
    body: string,
  ): Promise<Record<string, string>> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const message = `${this.cluster.node_id}:${timestamp}:${path}:${body}`;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.cluster.secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(message),
    );

    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return {
      "X-Deploy-Node-Id": this.cluster.node_id,
      "X-Deploy-Timestamp": timestamp,
      "X-Deploy-Signature": `sha256=${hex}`,
    };
  }

  /** クラスタ設定を返す */
  getClusterConfig(): ClusterConfig {
    return this.cluster;
  }

  /** 設定を更新する */
  updateConfig(config: DeployConfig): void {
    this.config = config;
  }
}

/** 受信リクエストの HMAC 署名を検証する */
export async function verifyClusterAuth(
  request: Request,
  path: string,
  body: string,
  secret: string,
): Promise<boolean> {
  const nodeId = request.headers.get("x-deploy-node-id") ?? "";
  const timestamp = request.headers.get("x-deploy-timestamp") ?? "";
  const signature = request.headers.get("x-deploy-signature") ?? "";

  if (!nodeId || !timestamp || !signature) return false;

  // タイムスタンプ検証
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(ts) || Math.abs(now - ts) > TIMESTAMP_TOLERANCE_SEC) return false;

  // HMAC 検証
  if (!signature.startsWith("sha256=")) return false;
  const expectedHex = signature.slice(7);

  const message = `${nodeId}:${timestamp}:${path}:${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );

  const actualHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // 定数時間比較
  if (expectedHex.length !== actualHex.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ actualHex.charCodeAt(i);
  }
  return mismatch === 0;
}

/** edge: 受信した設定で deploy.json を更新する */
export async function handleSyncConfig(
  projects: Record<string, ProjectConfig>,
): Promise<void> {
  const config = await loadConfig();
  config.projects = projects;
  await saveConfig(config);
}
