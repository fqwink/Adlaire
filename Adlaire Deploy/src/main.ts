/**
 * Adlaire Deploy — プラットフォームエントリポイント
 *
 * serve コマンド: リバースプロキシ + 管理 API + Worker 自動起動
 */

import { loadConfig } from "./config.ts";
import { ProcessManager } from "./process_manager.ts";
import { startAdminApi, startProxy } from "./proxy.ts";

async function serve(args: string[]): Promise<void> {
  // コマンドライン引数の解析
  let hostOverride: string | undefined;
  let portOverride: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--host" && i + 1 < args.length) {
      hostOverride = args[++i];
    } else if (args[i] === "--port" && i + 1 < args.length) {
      portOverride = parseInt(args[++i], 10);
      if (isNaN(portOverride)) {
        console.error("[deploy] Invalid port number");
        Deno.exit(1);
      }
    }
  }

  // 設定読み込み
  const config = await loadConfig();
  const host = hostOverride ?? config.host;
  const port = portOverride ?? config.port;
  const adminPort = port + 1;

  console.log("[deploy] Adlaire Deploy starting...");

  // プロセスマネージャ初期化
  const manager = new ProcessManager(config);

  // リバースプロキシ起動
  const proxyServer = startProxy(manager, host, port);

  // 管理 API 起動
  const adminServer = startAdminApi(manager, adminPort);

  // auto_start プロジェクトを起動
  await manager.startAutoStartProjects();

  console.log("[deploy] Platform ready");

  // シャットダウンハンドラ
  const shutdown = async () => {
    console.log("\n[deploy] Shutting down...");
    await manager.stopAll();
    proxyServer.shutdown();
    adminServer.shutdown();
    console.log("[deploy] Shutdown complete");
  };

  Deno.addSignalListener("SIGINT", () => {
    shutdown().then(() => Deno.exit(0));
  });
  Deno.addSignalListener("SIGTERM", () => {
    shutdown().then(() => Deno.exit(0));
  });
}

// エントリポイント
const command = Deno.args[0];

if (command === "serve") {
  await serve(Deno.args.slice(1));
} else {
  console.error("Usage: adlaire-deploy serve [--host <host>] [--port <port>]");
  console.error("  For other commands, use: deno task cli <command>");
  Deno.exit(1);
}
