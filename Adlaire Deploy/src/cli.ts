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
import type { ApiResponse, ProjectStatus } from "./types.ts";

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
): Promise<ApiResponse<T>> {
  const baseUrl = await getAdminBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, { method });
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
    console.error("Usage: adlaire-deploy add <id> --hostname <host> --entry <entry> --port <port> [--no-auto-start]");
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
    }
  }

  if (!hostname || !entry || !port || isNaN(port)) {
    console.error("Error: --hostname, --entry, and --port are required");
    Deno.exit(1);
  }

  await addProject(id, { hostname, entry, port, auto_start: autoStart });
  console.log(`Added project "${id}"`);
  console.log(`  hostname:   ${hostname}`);
  console.log(`  entry:      ${entry}`);
  console.log(`  port:       ${port}`);
  console.log(`  auto_start: ${autoStart}`);
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
        console.log(`  hostname:   ${s.hostname}`);
        console.log(`  port:       ${s.port}`);
        console.log(`  auto_start: ${s.auto_start}`);
        console.log(`  state:      ${s.state}`);
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

/** ヘルプ表示 */
function showHelp(): void {
  console.log(`Adlaire Deploy — CLI

Usage: adlaire-deploy <command> [options]

Commands:
  serve                Start the platform (reverse proxy + workers)
  add <id>             Add a new project
  remove <id>          Remove a project (config only, files preserved)
  list                 List all configured projects
  start <id>           Start a project worker
  stop <id>            Stop a project worker
  restart <id>         Restart a project worker
  status [id]          Show project status (all if id omitted)
  help                 Show this help message

Options for 'serve':
  --host <host>        Bind address (default: 0.0.0.0)
  --port <port>        Bind port (default: 8000)

Options for 'add':
  --hostname <host>    Hostname for routing (required)
  --entry <file>       Entry point file (required)
  --port <port>        Worker port (required)
  --no-auto-start      Disable auto-start on platform startup`);
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
