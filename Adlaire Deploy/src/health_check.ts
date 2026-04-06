/**
 * Adlaire Deploy — Worker ヘルスチェック & 自動再起動
 *
 * Worker プロセスの死活監視と異常時の自動回復
 */

import type { ProcessManager } from "./process_manager.ts";

/** デフォルト設定値 */
const DEFAULT_CHECK_INTERVAL = 30;
const DEFAULT_CHECK_THRESHOLD = 3;
const DEFAULT_MAX_RESTART_ATTEMPTS = 5;
const HEALTH_CHECK_TIMEOUT_MS = 5000;

/** プロジェクト別ヘルスチェック追跡 */
interface HealthTracker {
  projectId: string;
  consecutive_failures: number;
  restart_attempts: number;
  restart_backoff_ms: number;
  restart_timer: number | null;
}

export class WorkerHealthChecker {
  private manager: ProcessManager;
  private trackers: Map<string, HealthTracker> = new Map();
  private checkTimer: number | null = null;

  constructor(manager: ProcessManager) {
    this.manager = manager;
  }

  /** ヘルスチェックを開始する */
  start(): void {
    if (this.checkTimer !== null) return;

    // 初回チェックは 10 秒後に開始（Worker 起動完了を待つ）
    setTimeout(() => {
      this.runChecks();
      this.checkTimer = setInterval(
        () => this.runChecks(),
        DEFAULT_CHECK_INTERVAL * 1000,
      );
    }, 10_000);
  }

  /** ヘルスチェックを停止する */
  stop(): void {
    if (this.checkTimer !== null) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    // 再起動タイマーもクリア
    for (const tracker of this.trackers.values()) {
      if (tracker.restart_timer !== null) {
        clearTimeout(tracker.restart_timer);
        tracker.restart_timer = null;
      }
    }
  }

  /** 全 Worker に対してヘルスチェックを実行する */
  private async runChecks(): Promise<void> {
    const statuses = this.manager.listStatus();

    const checks = statuses
      .filter((s) => s.state === "running")
      .map((s) => this.checkProject(s.id, s.port));

    await Promise.allSettled(checks);
  }

  /** 単一プロジェクトのヘルスチェック */
  private async checkProject(
    projectId: string,
    port: number,
  ): Promise<void> {
    const config = this.manager.getConfig();
    const projectConfig = config.projects[projectId];
    if (!projectConfig) return;

    // health_check_enabled が false なら skip
    if (projectConfig.health_check_enabled === false) return;

    let tracker = this.trackers.get(projectId);
    if (!tracker) {
      tracker = {
        projectId,
        consecutive_failures: 0,
        restart_attempts: 0,
        restart_backoff_ms: 1000,
        restart_timer: null,
      };
      this.trackers.set(projectId, tracker);
    }

    const threshold = projectConfig.health_check_threshold ?? DEFAULT_CHECK_THRESHOLD;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

      const response = await fetch(`http://127.0.0.1:${port}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        tracker.consecutive_failures = 0;
        tracker.restart_attempts = 0;
        tracker.restart_backoff_ms = 1000;
        return;
      }

      tracker.consecutive_failures++;
    } catch {
      tracker.consecutive_failures++;
    }

    if (tracker.consecutive_failures >= threshold) {
      await this.handleUnhealthy(projectId, tracker);
    }
  }

  /** unhealthy 判定された Worker の自動再起動 */
  private async handleUnhealthy(
    projectId: string,
    tracker: HealthTracker,
  ): Promise<void> {
    const projectConfig = this.manager.getConfig().projects[projectId];
    if (!projectConfig) return;

    // auto_restart が無効なら skip
    if (projectConfig.auto_restart === false) return;

    const maxAttempts = projectConfig.max_restart_attempts ?? DEFAULT_MAX_RESTART_ATTEMPTS;

    if (tracker.restart_attempts >= maxAttempts) {
      console.error(
        `[deploy] Worker "${projectId}" failed after ${maxAttempts} restart attempts. Auto-restart stopped.`,
      );
      return;
    }

    // 再起動タイマーが既にある場合は skip
    if (tracker.restart_timer !== null) return;

    tracker.restart_attempts++;
    const delay = tracker.restart_backoff_ms;

    console.log(
      `[deploy] Worker "${projectId}" unhealthy. Auto-restart attempt ${tracker.restart_attempts}/${maxAttempts} in ${delay}ms`,
    );

    tracker.restart_timer = setTimeout(async () => {
      tracker.restart_timer = null;
      try {
        await this.manager.restart(projectId);
        console.log(`[deploy] Worker "${projectId}" auto-restart succeeded`);
        tracker.consecutive_failures = 0;
      } catch (e) {
        console.error(
          `[deploy] Worker "${projectId}" auto-restart failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }, delay);

    // 指数バックオフ（最大 60 秒）
    tracker.restart_backoff_ms = Math.min(tracker.restart_backoff_ms * 2, 60_000);
  }

  /** 特定プロジェクトのトラッカーをリセットする */
  resetTracker(projectId: string): void {
    const tracker = this.trackers.get(projectId);
    if (tracker) {
      if (tracker.restart_timer !== null) {
        clearTimeout(tracker.restart_timer);
      }
      this.trackers.delete(projectId);
    }
  }
}
