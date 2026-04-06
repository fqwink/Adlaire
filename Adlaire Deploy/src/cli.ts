/**
 * Adlaire Deploy — CLI エントリポイント
 *
 * プラットフォーム操作のコマンドラインインターフェース
 */

import {
  addProject,
  loadConfig,
  removeProject,
  validateProjectId,
} from "./config.ts";
import type { DeploySnapshot } from "./rollback.ts";
import type { ApiResponse, DeployRecord, KvStats, LogEntry, NodeStatus, ProjectStatus } from "./types.ts";

/** 管理 API のベース URL を取得する */
async function getAdminBaseUrl(): Promise<string> {
  const config = await loadConfig();
  const adminPort = config.port + 1;
  return `http://127.0.0.1:${adminPort}`;
}

/** 管理 API を呼び出す */
async function callAdminApi<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<ApiResponse<T>> {
  const baseUrl = await getAdminBaseUrl();
  const options: RequestInit = { method };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${baseUrl}${path}`, options);
  return await response.json() as ApiResponse<T>;
}

/** serve コマンド */
async function cmdServe(args: string[]): Promise<void> {
  // main.ts に委譲（直接実行）
  const cmd = new Deno.Command("deno", {
    args: [
      "run",
      "--allow-net",
      "--allow-read",
      "--allow-write",
      "--allow-run",
      "--allow-env",
      new URL("./main.ts", import.meta.url).pathname,
      "serve",
      ...args,
    ],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const process = cmd.spawn();
  const status = await process.status;
  Deno.exit(status.code);
}

/** add コマンド */
async function cmdAdd(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("Usage: adlaire-deploy add <id> --hostname <host> --entry <entry> --port <port> [options]");
    Deno.exit(1);
  }

  const validationError = validateProjectId(id);
  if (validationError) {
    console.error(`Error: ${validationError}`);
    Deno.exit(1);
  }

  let hostname = "";
  let entry = "";
  let port = 0;
  let autoStart = true;
  let gitUrl = "";
  let gitBranch = "main";
  let webhookSecret = "";

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--hostname":
        hostname = args[++i] ?? "";
        break;
      case "--entry":
        entry = args[++i] ?? "";
        break;
      case "--port":
        port = parseInt(args[++i] ?? "", 10);
        break;
      case "--no-auto-start":
        autoStart = false;
        break;
      case "--git-url":
        gitUrl = args[++i] ?? "";
        break;
      case "--git-branch":
        gitBranch = args[++i] ?? "main";
        break;
      case "--webhook-secret":
        webhookSecret = args[++i] ?? "";
        break;
    }
  }

  if (!hostname || !entry || !port || isNaN(port)) {
    console.error("Error: --hostname, --entry, and --port are required");
    Deno.exit(1);
  }

  // Git URL 指定時は webhook-secret も必須
  if (gitUrl && !webhookSecret) {
    console.error("Error: --webhook-secret is required when --git-url is specified");
    Deno.exit(1);
  }

  // Git URL は HTTPS のみ
  if (gitUrl && !gitUrl.startsWith("https://")) {
    console.error("Error: Git URL must use HTTPS (https://)");
    Deno.exit(1);
  }

  const git = gitUrl
    ? { url: gitUrl, branch: gitBranch, webhook_secret: webhookSecret }
    : null;

  await addProject(id, { hostname, entry, port, auto_start: autoStart, git, env: {}, permissions: null });
  console.log(`Added project "${id}"`);
  console.log(`  hostname:       ${hostname}`);
  console.log(`  entry:          ${entry}`);
  console.log(`  port:           ${port}`);
  console.log(`  auto_start:     ${autoStart}`);
  if (git) {
    console.log(`  git.url:        ${git.url}`);
    console.log(`  git.branch:     ${git.branch}`);
    console.log(`  webhook_secret: ${"*".repeat(8)}`);
  }
}

/** remove コマンド */
async function cmdRemove(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("Usage: adlaire-deploy remove <id>");
    Deno.exit(1);
  }

  await removeProject(id);
  console.log(`Removed project "${id}" from configuration`);
  console.log("Note: Project directory was not deleted");
}

/** list コマンド */
async function cmdList(): Promise<void> {
  const config = await loadConfig();
  const projects = Object.entries(config.projects);

  if (projects.length === 0) {
    console.log("No projects configured");
    return;
  }

  // テーブルヘッダー
  console.log(
    "ID".padEnd(20) +
    "HOSTNAME".padEnd(30) +
    "PORT".padEnd(8) +
    "AUTO_START",
  );

  for (const [id, project] of projects) {
    console.log(
      id.padEnd(20) +
      project.hostname.padEnd(30) +
      String(project.port).padEnd(8) +
      String(project.auto_start),
    );
  }
}

/** start / stop / restart コマンド */
async function cmdControl(action: string, args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error(`Usage: adlaire-deploy ${action} <id>`);
    Deno.exit(1);
  }

  try {
    const result = await callAdminApi<ProjectStatus>(
      `/api/projects/${id}/${action}`,
      "POST",
    );

    if (result.ok) {
      console.log(`${action} "${id}": ${result.data.state}`);
    } else {
      console.error(`Error: ${result.message}`);
      Deno.exit(1);
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** status コマンド */
async function cmdStatus(args: string[]): Promise<void> {
  const id = args[0];

  try {
    if (id) {
      const result = await callAdminApi<ProjectStatus>(
        `/api/projects/${id}`,
      );

      if (result.ok) {
        const s = result.data;
        console.log(`Project: ${s.id}`);
        console.log(`  hostname:     ${s.hostname}`);
        console.log(`  port:         ${s.port}`);
        console.log(`  auto_start:   ${s.auto_start}`);
        console.log(`  state:        ${s.state}`);
        console.log(`  deploy_state: ${s.deploy_state}`);
        if (s.git) {
          console.log(`  git.url:      ${s.git.url}`);
          console.log(`  git.branch:   ${s.git.branch}`);
        }
      } else {
        console.error(`Error: ${result.message}`);
        Deno.exit(1);
      }
    } else {
      const result = await callAdminApi<ProjectStatus[]>("/api/projects");

      if (result.ok) {
        if (result.data.length === 0) {
          console.log("No projects configured");
          return;
        }

        console.log(
          "ID".padEnd(20) +
          "HOSTNAME".padEnd(30) +
          "PORT".padEnd(8) +
          "STATE",
        );

        for (const s of result.data) {
          console.log(
            s.id.padEnd(20) +
            s.hostname.padEnd(30) +
            String(s.port).padEnd(8) +
            s.state,
          );
        }
      } else {
        console.error(`Error: ${result.message}`);
        Deno.exit(1);
      }
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** deploy コマンド — 手動デプロイ実行 */
async function cmdDeploy(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("Usage: adlaire-deploy deploy <id>");
    Deno.exit(1);
  }

  try {
    const result = await callAdminApi<{ message: string }>(
      `/api/projects/${id}/deploy`,
      "POST",
    );

    if (result.ok) {
      console.log(result.data.message);
    } else {
      console.error(`Error: ${result.message}`);
      Deno.exit(1);
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** deploys コマンド — デプロイ履歴表示 */
async function cmdDeploys(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("Usage: adlaire-deploy deploys <id>");
    Deno.exit(1);
  }

  try {
    const result = await callAdminApi<DeployRecord[]>(
      `/api/projects/${id}/deploys`,
    );

    if (result.ok) {
      if (result.data.length === 0) {
        console.log("No deploy history");
        return;
      }

      console.log(
        "ID".padEnd(16) +
        "COMMIT".padEnd(10) +
        "STATUS".padEnd(16) +
        "STARTED_AT",
      );

      for (const d of result.data) {
        console.log(
          d.id.padEnd(16) +
          d.commit.slice(0, 7).padEnd(10) +
          d.status.padEnd(16) +
          d.started_at,
        );
      }
    } else {
      console.error(`Error: ${result.message}`);
      Deno.exit(1);
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** env コマンド — 環境変数表示 */
async function cmdEnv(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("Usage: adlaire-deploy env <id>");
    Deno.exit(1);
  }

  try {
    const result = await callAdminApi<Record<string, string>>(
      `/api/projects/${id}/env`,
    );

    if (result.ok) {
      const entries = Object.entries(result.data);
      if (entries.length === 0) {
        console.log("No environment variables configured");
        return;
      }
      for (const [key, value] of entries) {
        console.log(`${key}=${value}`);
      }
    } else {
      console.error(`Error: ${result.message}`);
      Deno.exit(1);
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** env-set コマンド — 環境変数設定 */
async function cmdEnvSet(args: string[]): Promise<void> {
  const id = args[0];
  if (!id || args.length < 2) {
    console.error("Usage: adlaire-deploy env-set <id> <KEY=VALUE>...");
    Deno.exit(1);
  }

  // まず現在の環境変数を取得（マージ用に deploy.json から直接読む）
  const config = await loadConfig();
  const existing = config.projects[id]?.env ?? {};

  // 引数をパース
  const merged = { ...existing };
  for (let i = 1; i < args.length; i++) {
    const eq = args[i].indexOf("=");
    if (eq === -1) {
      console.error(`Error: Invalid format "${args[i]}", expected KEY=VALUE`);
      Deno.exit(1);
    }
    const key = args[i].slice(0, eq);
    const value = args[i].slice(eq + 1);
    if (value === "") {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }

  try {
    const result = await callAdminApi<{ message: string; count: number }>(
      `/api/projects/${id}/env`,
      "PUT",
      merged,
    );

    if (result.ok) {
      console.log(`${result.data.message} (${result.data.count} variables)`);
      console.log("Note: Restart the worker to apply changes");
    } else {
      console.error(`Error: ${result.message}`);
      Deno.exit(1);
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** logs コマンド — ログ表示 */
async function cmdLogs(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("Usage: adlaire-deploy logs <id> [--tail <n>] [--stream]");
    Deno.exit(1);
  }

  let tail = 100;
  let stream = false;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--tail" && i + 1 < args.length) {
      tail = parseInt(args[++i], 10);
      if (isNaN(tail)) tail = 100;
    } else if (args[i] === "--stream") {
      stream = true;
    }
  }

  if (stream) {
    // SSE ストリーミング（Phase 6）
    const config = await loadConfig();
    const adminPort = config.port + 1;
    const sseToken = config.sse_token ?? "";
    if (!sseToken) {
      console.error("Error: SSE token not configured (set sse_token in deploy.json)");
      Deno.exit(1);
    }
    try {
      const response = await fetch(
        `http://127.0.0.1:${adminPort}/internal/logs/${id}/stream`,
        {
          headers: { "Authorization": `Bearer ${sseToken}` },
        },
      );
      if (!response.ok) {
        console.error(`Error: SSE connection failed (HTTP ${response.status})`);
        Deno.exit(1);
      }
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        // SSE のデータ行を解析して表示
        for (const line of text.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) as { timestamp: string; level: string; message: string };
              const prefix = data.level === "error" ? "ERR" : "OUT";
              console.log(`${data.timestamp} [${prefix}] ${data.message}`);
            } catch {
              // 不正な JSON は無視
            }
          }
        }
      }
    } catch {
      console.error("Error: Could not connect to platform. Is 'serve' running?");
      Deno.exit(1);
    }
    return;
  }

  try {
    const result = await callAdminApi<LogEntry[]>(
      `/api/projects/${id}/logs?tail=${tail}`,
    );

    if (result.ok) {
      if (result.data.length === 0) {
        console.log("No logs available");
        return;
      }
      for (const entry of result.data) {
        const prefix = entry.stream === "stderr" ? "ERR" : "OUT";
        console.log(`${entry.timestamp} [${prefix}] ${entry.line}`);
      }
    } else {
      console.error(`Error: ${result.message}`);
      Deno.exit(1);
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** kv-stats コマンド — KV 統計情報表示 */
async function cmdKvStats(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("Usage: adlaire-deploy kv-stats <id>");
    Deno.exit(1);
  }

  try {
    const result = await callAdminApi<KvStats>(
      `/api/projects/${id}/kv/stats`,
    );

    if (result.ok) {
      const s = result.data;
      console.log(`KV Stats for "${id}":`);
      console.log(`  path:       ${s.path}`);
      console.log(`  exists:     ${s.exists}`);
      console.log(`  size_bytes: ${s.size_bytes}`);
    } else {
      console.error(`Error: ${result.message}`);
      Deno.exit(1);
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** kv-reset コマンド — KV データベース削除 */
async function cmdKvReset(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("Usage: adlaire-deploy kv-reset <id>");
    Deno.exit(1);
  }

  try {
    const result = await callAdminApi<{ message: string }>(
      `/api/projects/${id}/kv`,
      "DELETE",
    );

    if (result.ok) {
      console.log(result.data.message);
    } else {
      console.error(`Error: ${result.message}`);
      Deno.exit(1);
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** nodes コマンド — クラスタノード一覧 */
async function cmdNodes(): Promise<void> {
  try {
    const result = await callAdminApi<NodeStatus[]>("/api/cluster/nodes");

    if (result.ok) {
      if (result.data.length === 0) {
        console.log("No edge nodes configured");
        return;
      }

      console.log(
        "NODE_ID".padEnd(20) +
        "URL".padEnd(35) +
        "HEALTH".padEnd(12) +
        "LAST_CHECK",
      );

      for (const n of result.data) {
        console.log(
          n.node_id.padEnd(20) +
          n.url.padEnd(35) +
          n.health.padEnd(12) +
          (n.last_check ?? "never"),
        );
      }
    } else {
      console.error(`Error: ${result.message}`);
      Deno.exit(1);
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** sync コマンド — 全 edge に設定を手動同期 */
async function cmdSync(): Promise<void> {
  try {
    const result = await callAdminApi<{ node_id: string; ok: boolean; error?: string }[]>(
      "/api/cluster/sync",
      "POST",
    );

    if (result.ok) {
      for (const r of result.data) {
        const status = r.ok ? "OK" : `FAILED: ${r.error}`;
        console.log(`${r.node_id}: ${status}`);
      }
    } else {
      console.error(`Error: ${result.message}`);
      Deno.exit(1);
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** rollback コマンド — ロールバック実行（Phase 6） */
async function cmdRollback(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("Usage: adlaire-deploy rollback <id> [deploy-id]");
    Deno.exit(1);
  }

  const deployId = args[1];
  const query = deployId ? `?deploy_id=${deployId}` : "";

  try {
    const result = await callAdminApi<{ message: string }>(
      `/api/projects/${id}/rollback${query}`,
      "POST",
    );

    if (result.ok) {
      console.log(result.data.message);
    } else {
      console.error(`Error: ${result.message}`);
      Deno.exit(1);
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** history コマンド — デプロイスナップショット一覧（Phase 6） */
async function cmdHistory(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) {
    console.error("Usage: adlaire-deploy history <id>");
    Deno.exit(1);
  }

  try {
    const result = await callAdminApi<DeploySnapshot[]>(
      `/api/projects/${id}/history`,
    );

    if (result.ok) {
      if (result.data.length === 0) {
        console.log("No deploy snapshots");
        return;
      }

      console.log(
        "DEPLOY_ID".padEnd(16) +
        "COMMIT".padEnd(10) +
        "DEPLOYED_AT",
      );

      for (const s of result.data) {
        console.log(
          s.deploy_id.padEnd(16) +
          s.commit.slice(0, 7).padEnd(10) +
          s.deployed_at,
        );
      }
    } else {
      console.error(`Error: ${result.message}`);
      Deno.exit(1);
    }
  } catch {
    console.error("Error: Could not connect to platform. Is 'serve' running?");
    Deno.exit(1);
  }
}

/** credential コマンド — 認証情報管理（Phase 6） */
async function cmdCredential(args: string[]): Promise<void> {
  const action = args[0];
  const id = args[1];

  if (action === "set" && id) {
    let type = "";
    let value = "";

    for (let i = 2; i < args.length; i++) {
      if (args[i] === "--token" && i + 1 < args.length) {
        type = "pat";
        value = args[++i];
      } else if (args[i] === "--ssh-key" && i + 1 < args.length) {
        type = "ssh";
        value = args[++i];
      }
    }

    if (!type || !value) {
      console.error("Usage: adlaire-deploy credential set <id> --token <PAT> | --ssh-key <path>");
      Deno.exit(1);
    }

    try {
      const result = await callAdminApi<{ message: string }>(
        `/api/projects/${id}/credential`,
        "POST",
        { type, value },
      );

      if (result.ok) {
        console.log(result.data.message);
      } else {
        console.error(`Error: ${result.message}`);
        Deno.exit(1);
      }
    } catch {
      console.error("Error: Could not connect to platform. Is 'serve' running?");
      Deno.exit(1);
    }
  } else if (action === "remove" && id) {
    try {
      const result = await callAdminApi<{ message: string }>(
        `/api/projects/${id}/credential`,
        "DELETE",
      );

      if (result.ok) {
        console.log(result.data.message);
      } else {
        console.error(`Error: ${result.message}`);
        Deno.exit(1);
      }
    } catch {
      console.error("Error: Could not connect to platform. Is 'serve' running?");
      Deno.exit(1);
    }
  } else {
    console.error("Usage:");
    console.error("  adlaire-deploy credential set <id> --token <PAT>");
    console.error("  adlaire-deploy credential set <id> --ssh-key <path>");
    console.error("  adlaire-deploy credential remove <id>");
    Deno.exit(1);
  }
}

/** 監査ログ表示（Phase 10） */
async function cmdAudit(args: string[]): Promise<void> {
  let limit = 20;
  let projectId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--project" && args[i + 1]) {
      projectId = args[i + 1];
      i++;
    }
  }

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (projectId) params.set("project_id", projectId);

  const res = await fetch(`${adminUrl}/api/audit?${params}`);
  const body = await res.json();
  if (!body.ok) {
    console.error(`Error: ${body.message}`);
    Deno.exit(1);
  }

  const logs = body.data as Array<{
    id: string;
    timestamp: string;
    action: string;
    project_id: string | null;
    actor: string;
    detail: string;
    result: "success" | "failure";
  }>;

  if (logs.length === 0) {
    console.log("No audit logs found.");
    return;
  }

  console.log("Audit Logs:");
  console.log("-".repeat(100));
  for (const log of logs) {
    const time = log.timestamp.replace("T", " ").slice(0, 19);
    const proj = log.project_id ?? "(platform)";
    const icon = log.result === "success" ? "OK" : "NG";
    console.log(`[${time}] ${icon} ${log.action.padEnd(15)} ${proj.padEnd(20)} by ${log.actor}  ${log.detail}`);
  }
}

/** ヘルプ表示 */
function showHelp(): void {
  console.log(`Adlaire Deploy — CLI

Usage: adlaire-deploy <command> [options]

Commands:
  serve                    Start the platform (reverse proxy + workers + dashboard)
  add <id>                 Add a new project
  remove <id>              Remove a project (config only, files preserved)
  list                     List all configured projects
  start <id>               Start a project worker
  stop <id>                Stop a project worker
  restart <id>             Restart a project worker
  status [id]              Show project status (all if id omitted)
  deploy <id>              Trigger a manual deploy
  deploys <id>             Show deploy history
  rollback <id> [dep-id]   Rollback to a previous deploy
  history <id>             Show deploy snapshots (rollback targets)
  credential set <id> ...  Set credentials for private repos
  credential remove <id>   Remove credentials
  env <id>                 Show environment variables (masked)
  env-set <id> K=V...      Set environment variables (merge)
  logs <id> [opts]         Show worker logs (--tail n, --stream)
  kv-stats <id>            Show KV database info
  kv-reset <id>            Delete KV database (worker must be stopped)
  audit [opts]             Show audit logs (--limit N, --project <id>)
  nodes                    Show cluster node statuses (origin only)
  sync                     Sync config to all edge nodes (origin only)
  help                     Show this help message

Options for 'serve':
  --host <host>        Bind address (default: 0.0.0.0)
  --port <port>        Bind port (default: 8000)

Options for 'add':
  --hostname <host>    Hostname for routing (required)
  --entry <file>       Entry point file (required)
  --port <port>        Worker port (required)
  --no-auto-start      Disable auto-start on platform startup
  --git-url <url>      Git repository URL (HTTPS only)
  --git-branch <br>    Branch to deploy (default: main)
  --webhook-secret <s> Webhook verification secret (required with --git-url)

Options for 'credential set':
  --token <PAT>        Personal Access Token (HTTPS)
  --ssh-key <path>     SSH key file path`);
}

// エントリポイント
const command = Deno.args[0];
const commandArgs = Deno.args.slice(1);

switch (command) {
  case "serve":
    await cmdServe(commandArgs);
    break;
  case "add":
    await cmdAdd(commandArgs);
    break;
  case "remove":
    await cmdRemove(commandArgs);
    break;
  case "list":
    await cmdList();
    break;
  case "start":
  case "stop":
  case "restart":
    await cmdControl(command, commandArgs);
    break;
  case "status":
    await cmdStatus(commandArgs);
    break;
  case "deploy":
    await cmdDeploy(commandArgs);
    break;
  case "deploys":
    await cmdDeploys(commandArgs);
    break;
  case "env":
    await cmdEnv(commandArgs);
    break;
  case "env-set":
    await cmdEnvSet(commandArgs);
    break;
  case "logs":
    await cmdLogs(commandArgs);
    break;
  case "kv-stats":
    await cmdKvStats(commandArgs);
    break;
  case "kv-reset":
    await cmdKvReset(commandArgs);
    break;
  case "rollback":
    await cmdRollback(commandArgs);
    break;
  case "history":
    await cmdHistory(commandArgs);
    break;
  case "credential":
    await cmdCredential(commandArgs);
    break;
  case "audit":
    await cmdAudit(commandArgs);
    break;
  case "nodes":
    await cmdNodes();
    break;
  case "sync":
    await cmdSync();
    break;
  case "help":
  case "--help":
  case "-h":
    showHelp();
    break;
  default:
    if (command) {
      console.error(`Unknown command: ${command}`);
    }
    showHelp();
    Deno.exit(command ? 1 : 0);
}
