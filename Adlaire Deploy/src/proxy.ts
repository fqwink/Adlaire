/**
 * Adlaire Deploy — リバースプロキシ
 *
 * Host ヘッダーベースのリクエストルーティング
 */

import type { Deployer } from "./deployer.ts";
import { deleteProjectKv, getKvStats } from "./kv.ts";
import type { ProcessManager } from "./process_manager.ts";
import type { ProjectStatus } from "./types.ts";
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
          return json({ ok: true, data: enrichStatus(manager.getStatus(id), deployer) });
        } catch (e) {
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
          return json({ ok: true, data: enrichStatus(manager.getStatus(id), deployer) });
        } catch (e) {
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
          return json({ ok: true, data: enrichStatus(manager.getStatus(id), deployer) });
        } catch (e) {
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

      return json({ ok: false, error: "not_found", message: "Unknown endpoint" }, 404);
    },
  );

  console.log(`[deploy] Admin API listening on 127.0.0.1:${port}`);
  return server;
}
