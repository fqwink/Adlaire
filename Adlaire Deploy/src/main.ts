/**
 * Adlaire Deploy — プラットフォームエントリポイント
 *
 * serve コマンド: リバースプロキシ + 管理 API + Worker 自動起動
 * Phase 6: ヘルスチェック + SSE ストリーミング連携
 * Phase 7: ログ永続化 + 環境変数暗号化マイグレーション
 * Phase 9: 管理ダッシュボード
 */

import { ClusterManager } from "./cluster.ts";
import { loadConfig } from "./config.ts";
import { startDashboard } from "./dashboard/server.ts";
import { Deployer } from "./deployer.ts";
import { migrateEnvIfNeeded } from "./env_crypto.ts";
import { WorkerHealthChecker } from "./health_check.ts";
import { closePlatformKv, openPlatformKv } from "./kv.ts";
import { rotateAllLogs, setLogBaseDir, setRetentionDays, startDailyRotation, writeLogEntry } from "./log_writer.ts";
import { addLogCallback } from "./logger.ts";
import { ProcessManager } from "./process_manager.ts";
import { startAdminApi, startProxy } from "./proxy.ts";
import { broadcastLogEntry } from "./sse.ts";

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
  const dashboardPort = config.dashboard_port ?? (port + 2);

  console.log("[deploy] Adlaire Deploy starting...");

  // プラットフォーム KV 初期化
  await openPlatformKv(config);

  // Phase 7: ログ永続化の初期化
  setLogBaseDir("./logs");
  for (const [id, pc] of Object.entries(config.projects)) {
    if (pc.log_retention_days) {
      setRetentionDays(id, pc.log_retention_days);
    }
  }

  // Phase 6 + 7: ログコールバック登録（SSE + 永続化）
  addLogCallback((projectId, entry) => {
    broadcastLogEntry(projectId, entry);
    writeLogEntry(projectId, entry);
  });

  // Phase 7: 起動時ログローテーション + 日次タイマー開始
  await rotateAllLogs();
  const rotationTimer = startDailyRotation();

  // Phase 7: 環境変数暗号化マイグレーション
  for (const [id, pc] of Object.entries(config.projects)) {
    await migrateEnvIfNeeded(id, pc.env);
  }

  // プロセスマネージャ・デプロイヤー初期化
  const manager = new ProcessManager(config);
  const deployer = new Deployer(manager);

  // Phase 6: Worker ヘルスチェッカー初期化
  const healthChecker = new WorkerHealthChecker(manager);

  // クラスタマネージャ初期化
  let cluster: ClusterManager | null = null;
  if (config.cluster) {
    cluster = new ClusterManager(config);
    deployer.setClusterManager(cluster);
    console.log(`[deploy] Cluster mode: ${config.cluster.role} (${config.cluster.node_id})`);
  }

  // リバースプロキシ起動
  const proxyServer = startProxy(manager, host, port);

  // 管理 API 起動
  const adminServer = startAdminApi(manager, deployer, adminPort, cluster);

  // Phase 9: ダッシュボード起動
  const dashboardServer = startDashboard(
    manager,
    deployer,
    dashboardPort,
    cluster,
    config.dashboard_session_ttl,
  );

  // auto_start プロジェクトを起動
  await manager.startAutoStartProjects();

  // Phase 6: Worker ヘルスチェック開始
  healthChecker.start();

  // クラスタヘルスチェック開始
  if (cluster) {
    cluster.startHealthChecks();
  }

  console.log("[deploy] Platform ready");

  // シャットダウンハンドラ
  const shutdown = async () => {
    console.log("\n[deploy] Shutting down...");
    healthChecker.stop();
    if (cluster) cluster.stopHealthChecks();
    clearTimeout(rotationTimer);
    await manager.stopAll();
    proxyServer.shutdown();
    adminServer.shutdown();
    dashboardServer.shutdown();
    closePlatformKv();
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
