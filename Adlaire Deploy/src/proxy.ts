/**
 * Adlaire Deploy — リバースプロキシ
 *
 * Host ヘッダーベースのリクエストルーティング
 */

import { getAuditLogs, recordAudit } from "./audit.ts";
import type { ClusterManager } from "./cluster.ts";
import { handleSyncConfig, verifyClusterAuth } from "./cluster.ts";
import { loadConfig, saveConfig } from "./config.ts";
import { removeCredential, setPatCredential, setSshCredential } from "./credential.ts";
import type { Deployer } from "./deployer.ts";
import { deleteProjectKv, getKvStats } from "./kv.ts";
import { getLogTail } from "./logger.ts";
import { validateEnv } from "./process_manager.ts";
import type { ProcessManager } from "./process_manager.ts";
import { listSnapshots } from "./rollback.ts";
import { createSseStream } from "./sse.ts";
import type { ProjectConfig, ProjectStatus } from "./types.ts";
import { handleWebhook } from "./webhook.ts";

/** エラーレスポンスを生成する */
function errorResponse(
  status: number,
  error: string,
  message: string,
): Response {
  return new Response(
    JSON.stringify({ error, message }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/** リバースプロキシを起動する */
export function startProxy(
  manager: ProcessManager,
  host: string,
  port: number,
): Deno.HttpServer {
  const server = Deno.serve(
    { hostname: host, port },
    async (request: Request): Promise<Response> => {
      const url = new URL(request.url);
      const hostname = request.headers.get("host")?.split(":")[0] ?? "";

      // ホスト名からプロジェクトを検索
      const resolved = manager.resolveHostname(hostname);

      if (!resolved) {
        return errorResponse(
          502,
          "no_route",
          "No project found for this hostname",
        );
      }

      if (resolved.state !== "running") {
        return errorResponse(
          502,
          "worker_unavailable",
          "Worker is not running",
        );
      }

      // Worker への転送 URL を構築
      const targetUrl = new URL(url.pathname + url.search, `http://127.0.0.1:${resolved.port}`);

      // 転送用ヘッダーを構築
      const forwardHeaders = new Headers(request.headers);
      const clientIp = request.headers.get("x-forwarded-for") ??
        request.headers.get("cf-connecting-ip") ?? "unknown";
      forwardHeaders.set("X-Forwarded-For", clientIp);
      forwardHeaders.set("X-Forwarded-Host", hostname);
      forwardHeaders.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

      try {
        const response = await fetch(targetUrl.toString(), {
          method: request.method,
          headers: forwardHeaders,
          body: request.body,
          redirect: "manual",
        });

        // レスポンスヘッダーをコピー
        const responseHeaders = new Headers(response.headers);
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch {
        return errorResponse(
          502,
          "proxy_error",
          "Failed to connect to worker",
        );
      }
    },
  );

  console.log(`[deploy] Reverse proxy listening on ${host}:${port}`);
  return server;
}

/** deploy_state を付与した ProjectStatus を生成する */
function enrichStatus(
  base: Omit<ProjectStatus, "deploy_state"> | null,
  deployer: Deployer,
): ProjectStatus | null {
  if (!base) return null;
  return {
    ...base,
    deploy_state: deployer.getState(base.id),
  };
}

/** 管理 API サーバーを起動する */
export function startAdminApi(
  manager: ProcessManager,
  deployer: Deployer,
  port: number,
  cluster?: ClusterManager | null,
): Deno.HttpServer {
  const ID_PATTERN = "([a-z0-9][a-z0-9-]*[a-z0-9])";

  const server = Deno.serve(
    { hostname: "127.0.0.1", port },
    async (request: Request): Promise<Response> => {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // JSON レスポンスヘルパー
      const json = (data: unknown, status = 200) =>
        new Response(JSON.stringify(data, null, 2), {
          status,
          headers: { "Content-Type": "application/json" },
        });

      // GET /api/projects — プロジェクト一覧
      if (method === "GET" && path === "/api/projects") {
        const list = manager.listStatus().map((s) => ({
          ...s,
          deploy_state: deployer.getState(s.id),
        }));
        return json({ ok: true, data: list });
      }

      // GET /api/projects/{id} — プロジェクト詳細
      const detailMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}$`));
      if (method === "GET" && detailMatch) {
        const id = detailMatch[1];
        const status = enrichStatus(manager.getStatus(id), deployer);
        if (!status) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        return json({ ok: true, data: status });
      }

      // POST /api/projects/{id}/start
      const startMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/start$`));
      if (method === "POST" && startMatch) {
        const id = startMatch[1];
        try {
          await manager.start(id);
          recordAudit("start", "api", "success", "", id);
          return json({ ok: true, data: enrichStatus(manager.getStatus(id), deployer) });
        } catch (e) {
          recordAudit("start", "api", "failure", e instanceof Error ? e.message : String(e), id);
          return json(
            { ok: false, error: "start_failed", message: e instanceof Error ? e.message : String(e) },
            400,
          );
        }
      }

      // POST /api/projects/{id}/stop
      const stopMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/stop$`));
      if (method === "POST" && stopMatch) {
        const id = stopMatch[1];
        try {
          await manager.stop(id);
          recordAudit("stop", "api", "success", "", id);
          return json({ ok: true, data: enrichStatus(manager.getStatus(id), deployer) });
        } catch (e) {
          recordAudit("stop", "api", "failure", e instanceof Error ? e.message : String(e), id);
          return json(
            { ok: false, error: "stop_failed", message: e instanceof Error ? e.message : String(e) },
            400,
          );
        }
      }

      // POST /api/projects/{id}/restart
      const restartMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/restart$`));
      if (method === "POST" && restartMatch) {
        const id = restartMatch[1];
        try {
          await manager.restart(id);
          recordAudit("restart", "api", "success", "", id);
          return json({ ok: true, data: enrichStatus(manager.getStatus(id), deployer) });
        } catch (e) {
          recordAudit("restart", "api", "failure", e instanceof Error ? e.message : String(e), id);
          return json(
            { ok: false, error: "restart_failed", message: e instanceof Error ? e.message : String(e) },
            400,
          );
        }
      }

      // POST /api/webhook/{id} — Git push Webhook 受信
      const webhookMatch = path.match(new RegExp(`^/api/webhook/${ID_PATTERN}$`));
      if (method === "POST" && webhookMatch) {
        const id = webhookMatch[1];
        return handleWebhook(request, id, manager, deployer);
      }

      // GET /api/projects/{id}/deploys — デプロイ履歴一覧
      const deploysMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/deploys$`));
      if (method === "GET" && deploysMatch) {
        const id = deploysMatch[1];
        if (!manager.getProjectConfig(id)) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        return json({ ok: true, data: await deployer.getHistory(id) });
      }

      // POST /api/projects/{id}/deploy — 手動デプロイ実行
      const manualDeployMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/deploy$`));
      if (method === "POST" && manualDeployMatch) {
        const id = manualDeployMatch[1];
        const projectConfig = manager.getProjectConfig(id);
        if (!projectConfig) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        if (!projectConfig.git) {
          return json(
            { ok: false, error: "not_configured", message: "Git not configured for this project" },
            400,
          );
        }
        const result = await deployer.requestDeploy(
          id,
          "manual",
          projectConfig.git.branch,
          "manual",
        );
        if (result === "queued") {
          return json({ ok: true, data: { message: "Deploy queued" } }, 202);
        }
        return json({ ok: true, data: { message: "Deploy started" } }, 202);
      }

      // GET /api/projects/{id}/kv/stats — KV 統計情報
      const kvStatsMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/kv/stats$`));
      if (method === "GET" && kvStatsMatch) {
        const id = kvStatsMatch[1];
        if (!manager.getProjectConfig(id)) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        const stats = await getKvStats(manager.getConfig(), id);
        return json({ ok: true, data: stats });
      }

      // DELETE /api/projects/{id}/kv — KV データベース削除
      const kvDeleteMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/kv$`));
      if (method === "DELETE" && kvDeleteMatch) {
        const id = kvDeleteMatch[1];
        if (!manager.getProjectConfig(id)) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        const state = manager.getState(id);
        if (state === "running") {
          return json(
            { ok: false, error: "worker_running", message: "Stop the worker before deleting KV" },
            400,
          );
        }
        await deleteProjectKv(manager.getConfig(), id);
        return json({ ok: true, data: { message: "KV database deleted" } });
      }

      // GET/PUT /api/projects/{id}/env — 環境変数
      const envMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/env$`));
      if (method === "GET" && envMatch) {
        const id = envMatch[1];
        const pc = manager.getProjectConfig(id);
        if (!pc) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        const masked: Record<string, string> = {};
        for (const [k, v] of Object.entries(pc.env)) {
          masked[k] = v.length > 3 ? v.slice(0, 3) + "***" : "***";
        }
        return json({ ok: true, data: masked });
      }

      if (method === "PUT" && envMatch) {
        const id = envMatch[1];
        const pc = manager.getProjectConfig(id);
        if (!pc) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        let body: Record<string, string>;
        try {
          body = await request.json() as Record<string, string>;
        } catch {
          return json({ ok: false, error: "bad_request", message: "Invalid JSON body" }, 400);
        }
        const envError = validateEnv(body);
        if (envError) {
          return json({ ok: false, error: "validation_error", message: envError }, 400);
        }
        // deploy.json を更新
        const config = await loadConfig();
        if (config.projects[id]) {
          config.projects[id].env = body;
          await saveConfig(config);
          manager.updateConfig(config);
        }
        return json({ ok: true, data: { message: "Environment variables updated", count: Object.keys(body).length } });
      }

      // GET /api/projects/{id}/logs — ログ取得
      const logsMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/logs$`));
      if (method === "GET" && logsMatch) {
        const id = logsMatch[1];
        if (!manager.getProjectConfig(id)) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        const tailParam = url.searchParams.get("tail");
        const tail = tailParam ? parseInt(tailParam, 10) : 100;
        return json({ ok: true, data: getLogTail(id, isNaN(tail) ? 100 : tail) });
      }

      // GET /api/audit — 監査ログ一覧（Phase 10）
      if (method === "GET" && path === "/api/audit") {
        const limitParam = url.searchParams.get("limit");
        const projectId = url.searchParams.get("project_id");
        const limit = limitParam ? parseInt(limitParam, 10) : 50;
        const logs = await getAuditLogs(
          isNaN(limit) ? 50 : limit,
          projectId ?? undefined,
        );
        return json({ ok: true, data: logs });
      }

      // GET /api/health — ノードヘルス
      if (method === "GET" && path === "/api/health") {
        const config = manager.getConfig();
        const statuses = manager.listStatus();
        const running = statuses.filter((s) => s.state === "running").length;
        const startTime = performance.now();
        return json({
          ok: true,
          data: {
            node_id: config.cluster?.node_id ?? "standalone",
            role: config.cluster?.role ?? "standalone",
            uptime_seconds: Math.floor(startTime / 1000),
            projects_count: statuses.length,
            running_workers: running,
          },
        });
      }

      // GET /api/cluster/nodes — ノード一覧（origin のみ）
      if (method === "GET" && path === "/api/cluster/nodes") {
        if (!cluster) {
          return json({ ok: false, error: "not_configured", message: "Cluster not configured" }, 400);
        }
        return json({ ok: true, data: cluster.getNodeStatuses() });
      }

      // POST /api/cluster/sync — 全 edge に設定を手動同期（origin のみ）
      if (method === "POST" && path === "/api/cluster/sync") {
        if (!cluster) {
          return json({ ok: false, error: "not_configured", message: "Cluster not configured" }, 400);
        }
        const results = await cluster.syncConfigToEdges();
        return json({ ok: true, data: results });
      }

      // PUT /api/cluster/sync-config — 設定同期受信（edge のみ）
      if (method === "PUT" && path === "/api/cluster/sync-config") {
        const config = manager.getConfig();
        if (!config.cluster || config.cluster.role !== "edge") {
          return json({ ok: false, error: "forbidden", message: "Not an edge node" }, 403);
        }
        const body = await request.text();
        const valid = await verifyClusterAuth(request, path, body, config.cluster.secret);
        if (!valid) {
          return json({ ok: false, error: "forbidden", message: "Invalid cluster auth" }, 403);
        }
        const projects = JSON.parse(body) as Record<string, ProjectConfig>;
        await handleSyncConfig(projects);
        const newConfig = await loadConfig();
        manager.updateConfig(newConfig);
        return json({ ok: true, data: { message: "Config synced" } });
      }

      // POST /api/cluster/deploy/{id} — デプロイ伝播受信（edge のみ）
      const clusterDeployMatch = path.match(new RegExp(`^/api/cluster/deploy/${ID_PATTERN}$`));
      if (method === "POST" && clusterDeployMatch) {
        const id = clusterDeployMatch[1];
        const config = manager.getConfig();
        if (!config.cluster || config.cluster.role !== "edge") {
          return json({ ok: false, error: "forbidden", message: "Not an edge node" }, 403);
        }
        const body = await request.text();
        const valid = await verifyClusterAuth(request, path, body, config.cluster.secret);
        if (!valid) {
          return json({ ok: false, error: "forbidden", message: "Invalid cluster auth" }, 403);
        }
        const { commit, branch } = JSON.parse(body) as { commit: string; branch: string };
        const result = await deployer.requestDeploy(id, commit, branch, "cluster-sync");
        return json({ ok: true, data: { message: result === "queued" ? "Deploy queued" : "Deploy started" } }, 202);
      }

      // POST /api/projects/{id}/rollback — ロールバック（Phase 6）
      const rollbackMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/rollback$`));
      if (method === "POST" && rollbackMatch) {
        const id = rollbackMatch[1];
        if (!manager.getProjectConfig(id)) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        const deployIdParam = url.searchParams.get("deploy_id") ?? undefined;
        try {
          await deployer.rollback(id, deployIdParam);
          return json({ ok: true, data: { message: "Rollback completed" } });
        } catch (e) {
          return json(
            { ok: false, error: "rollback_failed", message: e instanceof Error ? e.message : String(e) },
            400,
          );
        }
      }

      // GET /api/projects/{id}/history — デプロイスナップショット一覧（Phase 6）
      const historyMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/history$`));
      if (method === "GET" && historyMatch) {
        const id = historyMatch[1];
        if (!manager.getProjectConfig(id)) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        const snapshots = await listSnapshots(id);
        return json({ ok: true, data: snapshots });
      }

      // GET /internal/logs/{id}/stream — ログ SSE ストリーミング（Phase 6）
      const sseMatch = path.match(new RegExp(`^/internal/logs/${ID_PATTERN}/stream$`));
      if (method === "GET" && sseMatch) {
        const id = sseMatch[1];
        if (!manager.getProjectConfig(id)) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        const expectedToken = manager.getConfig().sse_token ?? "";
        if (!expectedToken) {
          return json({ ok: false, error: "not_configured", message: "SSE token not configured" }, 400);
        }
        return createSseStream(id, token, expectedToken);
      }

      // POST /api/projects/{id}/credential — 認証情報設定（Phase 6）
      const credentialSetMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/credential$`));
      if (method === "POST" && credentialSetMatch) {
        const id = credentialSetMatch[1];
        if (!manager.getProjectConfig(id)) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        let body: { type: string; value: string };
        try {
          body = await request.json() as { type: string; value: string };
        } catch {
          return json({ ok: false, error: "bad_request", message: "Invalid JSON body" }, 400);
        }
        try {
          if (body.type === "pat") {
            await setPatCredential(id, body.value);
          } else if (body.type === "ssh") {
            await setSshCredential(id, body.value);
          } else {
            return json({ ok: false, error: "bad_request", message: "type must be 'pat' or 'ssh'" }, 400);
          }
          return json({ ok: true, data: { message: "Credential saved" } });
        } catch (e) {
          return json(
            { ok: false, error: "credential_error", message: e instanceof Error ? e.message : String(e) },
            400,
          );
        }
      }

      // DELETE /api/projects/{id}/credential — 認証情報削除（Phase 6）
      const credentialDeleteMatch = path.match(new RegExp(`^/api/projects/${ID_PATTERN}/credential$`));
      if (method === "DELETE" && credentialDeleteMatch) {
        const id = credentialDeleteMatch[1];
        if (!manager.getProjectConfig(id)) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        await removeCredential(id);
        return json({ ok: true, data: { message: "Credential removed" } });
      }

      return json({ ok: false, error: "not_found", message: "Unknown endpoint" }, 404);
    },
  );

  console.log(`[deploy] Admin API listening on 127.0.0.1:${port}`);
  return server;
}
