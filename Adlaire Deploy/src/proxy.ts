/**
 * Adlaire Deploy — リバースプロキシ
 *
 * Host ヘッダーベースのリクエストルーティング
 */

import type { ProcessManager } from "./process_manager.ts";

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

/** 管理 API サーバーを起動する */
export function startAdminApi(
  manager: ProcessManager,
  port: number,
): Deno.HttpServer {
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
        return json({ ok: true, data: manager.listStatus() });
      }

      // GET /api/projects/{id} — プロジェクト詳細
      const detailMatch = path.match(/^\/api\/projects\/([a-z0-9][a-z0-9-]*[a-z0-9])$/);
      if (method === "GET" && detailMatch) {
        const id = detailMatch[1];
        const status = manager.getStatus(id);
        if (!status) {
          return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
        }
        return json({ ok: true, data: status });
      }

      // POST /api/projects/{id}/start
      const startMatch = path.match(
        /^\/api\/projects\/([a-z0-9][a-z0-9-]*[a-z0-9])\/start$/,
      );
      if (method === "POST" && startMatch) {
        const id = startMatch[1];
        try {
          await manager.start(id);
          return json({ ok: true, data: manager.getStatus(id) });
        } catch (e) {
          return json(
            { ok: false, error: "start_failed", message: e instanceof Error ? e.message : String(e) },
            400,
          );
        }
      }

      // POST /api/projects/{id}/stop
      const stopMatch = path.match(
        /^\/api\/projects\/([a-z0-9][a-z0-9-]*[a-z0-9])\/stop$/,
      );
      if (method === "POST" && stopMatch) {
        const id = stopMatch[1];
        try {
          await manager.stop(id);
          return json({ ok: true, data: manager.getStatus(id) });
        } catch (e) {
          return json(
            { ok: false, error: "stop_failed", message: e instanceof Error ? e.message : String(e) },
            400,
          );
        }
      }

      // POST /api/projects/{id}/restart
      const restartMatch = path.match(
        /^\/api\/projects\/([a-z0-9][a-z0-9-]*[a-z0-9])\/restart$/,
      );
      if (method === "POST" && restartMatch) {
        const id = restartMatch[1];
        try {
          await manager.restart(id);
          return json({ ok: true, data: manager.getStatus(id) });
        } catch (e) {
          return json(
            { ok: false, error: "restart_failed", message: e instanceof Error ? e.message : String(e) },
            400,
          );
        }
      }

      return json({ ok: false, error: "not_found", message: "Unknown endpoint" }, 404);
    },
  );

  console.log(`[deploy] Admin API listening on 127.0.0.1:${port}`);
  return server;
}
