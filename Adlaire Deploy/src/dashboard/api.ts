/**
 * Adlaire Deploy — ダッシュボード内部 API
 *
 * ダッシュボード UI からの操作を受け付ける内部 API
 */

import type { ClusterManager } from "../cluster.ts";
import type { Deployer } from "../deployer.ts";
import { getLogTail } from "../logger.ts";
import type { ProcessManager } from "../process_manager.ts";

/** JSON レスポンスヘルパー */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** ダッシュボード API リクエストを処理する */
export async function handleDashboardApi(
  request: Request,
  path: string,
  manager: ProcessManager,
  deployer: Deployer,
  cluster: ClusterManager | null,
): Promise<Response | null> {
  const method = request.method;
  const ID_PATTERN = "([a-z0-9][a-z0-9-]*[a-z0-9])";

  // CSRF 対策: 状態変更操作には X-Requested-With が必須
  if (method === "POST" || method === "PUT" || method === "DELETE") {
    const xrw = request.headers.get("x-requested-with");
    if (xrw !== "XMLHttpRequest") {
      return json({ ok: false, error: "csrf", message: "Missing X-Requested-With header" }, 403);
    }
  }

  // GET /dashboard/api/projects — プロジェクト一覧
  if (method === "GET" && path === "/dashboard/api/projects") {
    const list = manager.listStatus().map((s) => ({
      ...s,
      deploy_state: deployer.getState(s.id),
    }));
    return json({ ok: true, data: list });
  }

  // GET /dashboard/api/projects/{id} — プロジェクト詳細
  const detailMatch = path.match(new RegExp(`^/dashboard/api/projects/${ID_PATTERN}$`));
  if (method === "GET" && detailMatch) {
    const id = detailMatch[1];
    const status = manager.getStatus(id);
    if (!status) {
      return json({ ok: false, error: "not_found" }, 404);
    }
    return json({
      ok: true,
      data: {
        ...status,
        deploy_state: deployer.getState(id),
      },
    });
  }

  // GET /dashboard/api/projects/{id}/deploys — デプロイ履歴
  const deploysMatch = path.match(new RegExp(`^/dashboard/api/projects/${ID_PATTERN}/deploys$`));
  if (method === "GET" && deploysMatch) {
    const id = deploysMatch[1];
    const history = await deployer.getHistory(id);
    return json({ ok: true, data: history });
  }

  // GET /dashboard/api/projects/{id}/logs — ログ取得
  const logsMatch = path.match(new RegExp(`^/dashboard/api/projects/${ID_PATTERN}/logs$`));
  if (method === "GET" && logsMatch) {
    const id = logsMatch[1];
    const url = new URL(request.url);
    const tail = parseInt(url.searchParams.get("tail") ?? "200", 10);
    return json({ ok: true, data: getLogTail(id, isNaN(tail) ? 200 : tail) });
  }

  // POST /dashboard/api/projects/{id}/start
  const startMatch = path.match(new RegExp(`^/dashboard/api/projects/${ID_PATTERN}/start$`));
  if (method === "POST" && startMatch) {
    const id = startMatch[1];
    try {
      await manager.start(id);
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
    }
  }

  // POST /dashboard/api/projects/{id}/stop
  const stopMatch = path.match(new RegExp(`^/dashboard/api/projects/${ID_PATTERN}/stop$`));
  if (method === "POST" && stopMatch) {
    const id = stopMatch[1];
    try {
      await manager.stop(id);
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
    }
  }

  // POST /dashboard/api/projects/{id}/restart
  const restartMatch = path.match(new RegExp(`^/dashboard/api/projects/${ID_PATTERN}/restart$`));
  if (method === "POST" && restartMatch) {
    const id = restartMatch[1];
    try {
      await manager.restart(id);
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
    }
  }

  // POST /dashboard/api/projects/{id}/deploy — 手動デプロイ
  const deployMatch = path.match(new RegExp(`^/dashboard/api/projects/${ID_PATTERN}/deploy$`));
  if (method === "POST" && deployMatch) {
    const id = deployMatch[1];
    const pc = manager.getProjectConfig(id);
    if (!pc?.git) {
      return json({ ok: false, error: "Git not configured" }, 400);
    }
    const result = await deployer.requestDeploy(id, "manual", pc.git.branch, "dashboard");
    return json({ ok: true, data: { message: result === "queued" ? "Queued" : "Started" } }, 202);
  }

  // POST /dashboard/api/projects/{id}/rollback — ロールバック
  const rollbackMatch = path.match(new RegExp(`^/dashboard/api/projects/${ID_PATTERN}/rollback$`));
  if (method === "POST" && rollbackMatch) {
    const id = rollbackMatch[1];
    let body: { deploy_id?: string };
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    // ロールバックは Admin API 経由で実行
    const config = manager.getConfig();
    const adminPort = config.port + 1;
    const rollbackUrl = body.deploy_id
      ? `http://127.0.0.1:${adminPort}/api/projects/${id}/rollback?deploy_id=${body.deploy_id}`
      : `http://127.0.0.1:${adminPort}/api/projects/${id}/rollback`;
    try {
      const resp = await fetch(rollbackUrl, { method: "POST" });
      const data = await resp.json();
      return json(data, resp.status);
    } catch (e) {
      return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
    }
  }

  // GET /dashboard/api/cluster — クラスタ状態
  if (method === "GET" && path === "/dashboard/api/cluster") {
    if (!cluster) {
      return json({ ok: true, data: { mode: "standalone", nodes: [] } });
    }
    return json({ ok: true, data: { mode: "cluster", nodes: cluster.getNodeStatuses() } });
  }

  return null;
}
