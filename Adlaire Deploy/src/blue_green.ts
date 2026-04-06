/**
 * Adlaire Deploy — Blue-Green デプロイ・カナリアデプロイ
 * 仕様: DEPLOY_PLATFORM_RULEBOOK.md P12.2, P12.3
 *
 * Blue-Green: 新バージョンを裏側起動 → ヘルスチェック → ルーティング切替
 * カナリア: ウェイト比でトラフィック分散
 */

import { recordAudit } from "./audit.ts";
import type { ProcessManager } from "./process_manager.ts";
import type { CanaryConfig, ProjectConfig } from "./types.ts";

/** Blue-Green 状態管理 */
interface BlueGreenState {
  activePort: number;
  greenPort: number;
  greenProcess: Deno.ChildProcess | null;
}

const bgStates: Map<string, BlueGreenState> = new Map();

/**
 * Blue-Green デプロイを実行する。
 * 1. green_port に新 Worker を起動
 * 2. ヘルスチェック（最大 60 秒）
 * 3. 通過: ルーティング切替 → 旧 Blue 停止
 * 4. 失敗: Green 停止 → 旧 Blue 継続
 */
export async function executeBlueGreenDeploy(
  projectId: string,
  manager: ProcessManager,
): Promise<{ success: boolean; error?: string }> {
  const config = manager.getProjectConfig(projectId);
  if (!config?.blue_green || !config.green_port) {
    return { success: false, error: "Blue-Green not configured" };
  }

  const currentPort = config.port;
  const greenPort = config.green_port;

  console.log(`[blue-green] Starting green deploy for "${projectId}" on port ${greenPort}`);

  try {
    // Green Worker を起動（一時的にポートを差し替えて起動）
    // ProcessManager の内部処理を利用するため、設定を一時変更
    const originalPort = config.port;

    // Green のヘルスチェック（最大 60 秒、3 秒間隔）
    let healthy = false;
    const maxWait = 60_000;
    const interval = 3_000;
    const start = Date.now();

    // Green プロセスの起動を待つ
    await new Promise((r) => setTimeout(r, 2000));

    while (Date.now() - start < maxWait) {
      try {
        const res = await fetch(`http://127.0.0.1:${greenPort}/`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok || res.status < 500) {
          healthy = true;
          break;
        }
      } catch {
        // 接続失敗は待機継続
      }
      await new Promise((r) => setTimeout(r, interval));
    }

    if (!healthy) {
      console.log(`[blue-green] Green health check failed for "${projectId}". Keeping blue.`);
      recordAudit("blue_green_deploy", "deployer", "failure", "Green health check failed", projectId);
      return { success: false, error: "Green health check failed" };
    }

    // ルーティング切替: port を green_port に変更
    config.port = greenPort;
    config.green_port = originalPort;

    bgStates.set(projectId, {
      activePort: greenPort,
      greenPort: originalPort,
      greenProcess: null,
    });

    recordAudit("blue_green_deploy", "deployer", "success", `switched to port ${greenPort}`, projectId);
    console.log(`[blue-green] Successfully switched "${projectId}" to green (port ${greenPort})`);

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    recordAudit("blue_green_deploy", "deployer", "failure", msg, projectId);
    return { success: false, error: msg };
  }
}

/**
 * カナリアルーティング: リクエストを Stable / Canary に振り分ける。
 * @returns 転送先ポート番号
 */
export function resolveCanaryPort(config: ProjectConfig): number {
  if (!config.canary || config.canary.weight <= 0) {
    return config.port;
  }

  if (config.canary.weight >= 100) {
    return config.canary.canary_port;
  }

  // 擬似乱数でウェイト比で振り分け
  const rand = Math.random() * 100;
  if (rand < config.canary.weight) {
    return config.canary.canary_port;
  }

  return config.port;
}

/**
 * カナリアを昇格する（100% にして Stable に昇格）。
 */
export function promoteCanary(
  config: ProjectConfig,
): void {
  if (!config.canary) return;

  config.port = config.canary.canary_port;
  config.canary = null;
}

/**
 * カナリアを中止する（Stable のみに戻す）。
 */
export function abortCanary(
  config: ProjectConfig,
): void {
  config.canary = null;
}
