/**
 * Adlaire Deploy — プロセスマネージャ
 *
 * Deno サブプロセスのライフサイクル管理（起動・停止・再起動）
 */

import type {
  DeployConfig,
  ProcessInfo,
  ProcessState,
  ProjectConfig,
  ProjectStatus,
} from "./types.ts";

/** 停止タイムアウト（ms） — SIGTERM 後 SIGKILL までの猶予 */
const STOP_TIMEOUT_MS = 5000;

export class ProcessManager {
  private processes: Map<string, ProcessInfo> = new Map();
  private config: DeployConfig;

  constructor(config: DeployConfig) {
    this.config = config;

    // 全プロジェクトの初期状態を登録
    for (const [id, projectConfig] of Object.entries(config.projects)) {
      this.processes.set(id, {
        id,
        state: "stopped",
        process: null,
        config: projectConfig,
      });
    }
  }

  /** プロジェクトの状態を取得する */
  getState(id: string): ProcessState | null {
    return this.processes.get(id)?.state ?? null;
  }

  /** 全プロジェクトの状態一覧を取得する */
  listStatus(): Omit<ProjectStatus, "deploy_state">[] {
    return Array.from(this.processes.values()).map((info) => ({
      id: info.id,
      hostname: info.config.hostname,
      port: info.config.port,
      auto_start: info.config.auto_start,
      state: info.state,
      git: info.config.git,
    }));
  }

  /** 指定プロジェクトの状態を取得する */
  getStatus(id: string): Omit<ProjectStatus, "deploy_state"> | null {
    const info = this.processes.get(id);
    if (!info) return null;
    return {
      id: info.id,
      hostname: info.config.hostname,
      port: info.config.port,
      auto_start: info.config.auto_start,
      state: info.state,
      git: info.config.git,
    };
  }

  /** hostname から running 状態のプロジェクトのポートを取得する */
  resolveHostname(hostname: string): { port: number; state: ProcessState } | null {
    for (const info of this.processes.values()) {
      if (info.config.hostname === hostname) {
        return { port: info.config.port, state: info.state };
      }
    }
    return null;
  }

  /** Worker を起動する */
  async start(id: string): Promise<void> {
    const info = this.processes.get(id);
    if (!info) {
      throw new Error(`Project "${id}" not found`);
    }
    if (info.state === "running" || info.state === "starting") {
      throw new Error(`Project "${id}" is already ${info.state}`);
    }

    info.state = "starting";
    const entryPath = `${this.config.projects_dir}/${id}/${info.config.entry}`;

    try {
      // エントリファイルの存在確認
      await Deno.stat(entryPath);
    } catch {
      info.state = "failed";
      throw new Error(`Entry file not found: ${entryPath}`);
    }

    const kvPath = `${this.config.data_dir}/projects/${id}.kv`;
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-net",
        "--allow-read",
        "--allow-env",
        "--unstable-kv",
        entryPath,
      ],
      env: {
        ...Deno.env.toObject(),
        PORT: String(info.config.port),
        DENO_KV_PATH: kvPath,
      },
      stdout: "inherit",
      stderr: "inherit",
    });

    try {
      const process = command.spawn();
      info.process = process;
      info.state = "running";

      console.log(`[deploy] Started "${id}" (pid: ${process.pid}, port: ${info.config.port})`);

      // 異常終了監視
      process.status.then((status) => {
        if (info.state === "running") {
          info.state = "failed";
          info.process = null;
          console.error(`[deploy] Worker "${id}" exited unexpectedly (code: ${status.code})`);
        } else {
          info.process = null;
        }
      });
    } catch (e) {
      info.state = "failed";
      throw new Error(`Failed to start "${id}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Worker を停止する */
  async stop(id: string): Promise<void> {
    const info = this.processes.get(id);
    if (!info) {
      throw new Error(`Project "${id}" not found`);
    }
    if (info.state !== "running") {
      throw new Error(`Project "${id}" is not running (state: ${info.state})`);
    }

    info.state = "stopping";
    const process = info.process;
    if (!process) {
      info.state = "stopped";
      return;
    }

    try {
      // SIGTERM を送信
      process.kill("SIGTERM");
    } catch {
      // プロセスが既に終了している場合
      info.state = "stopped";
      info.process = null;
      return;
    }

    // タイムアウト付きで終了を待つ
    const timeout = new Promise<"timeout">((resolve) =>
      setTimeout(() => resolve("timeout"), STOP_TIMEOUT_MS)
    );
    const exited = process.status.then(() => "exited" as const);

    const result = await Promise.race([timeout, exited]);

    if (result === "timeout") {
      // SIGKILL を送信
      try {
        process.kill("SIGKILL");
      } catch {
        // 既に終了
      }
      await process.status;
      console.log(`[deploy] Force killed "${id}" after ${STOP_TIMEOUT_MS}ms timeout`);
    } else {
      console.log(`[deploy] Stopped "${id}"`);
    }

    info.state = "stopped";
    info.process = null;
  }

  /** Worker を再起動する */
  async restart(id: string): Promise<void> {
    const info = this.processes.get(id);
    if (!info) {
      throw new Error(`Project "${id}" not found`);
    }

    if (info.state === "running") {
      await this.stop(id);
    }
    await this.start(id);
  }

  /** auto_start が true の全プロジェクトを起動する */
  async startAutoStartProjects(): Promise<void> {
    for (const [id, info] of this.processes) {
      if (info.config.auto_start) {
        try {
          await this.start(id);
        } catch (e) {
          console.error(
            `[deploy] Failed to auto-start "${id}": ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }
  }

  /** 全 Worker を停止する */
  async stopAll(): Promise<void> {
    const running = Array.from(this.processes.entries()).filter(
      ([_, info]) => info.state === "running",
    );

    await Promise.allSettled(
      running.map(([id]) => this.stop(id)),
    );
  }

  /** 設定を再読み込みしてプロジェクト一覧を更新する */
  updateConfig(config: DeployConfig): void {
    this.config = config;

    // 新しいプロジェクトを追加
    for (const [id, projectConfig] of Object.entries(config.projects)) {
      if (!this.processes.has(id)) {
        this.processes.set(id, {
          id,
          state: "stopped",
          process: null,
          config: projectConfig,
        });
      } else {
        // 設定を更新（プロセスはそのまま）
        const info = this.processes.get(id)!;
        info.config = projectConfig;
      }
    }

    // 削除されたプロジェクトを除去（停止中のみ）
    for (const [id, info] of this.processes) {
      if (!(id in config.projects) && info.state === "stopped") {
        this.processes.delete(id);
      }
    }
  }

  /** 設定への参照を返す */
  getConfig(): DeployConfig {
    return this.config;
  }

  /** プロジェクト設定を取得する */
  getProjectConfig(id: string): ProjectConfig | null {
    return this.processes.get(id)?.config ?? null;
  }
}
