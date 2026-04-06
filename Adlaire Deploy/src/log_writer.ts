/**
 * Adlaire Deploy — ログ永続化
 *
 * Worker ログをファイルシステムに日次ローテーションで保存する
 */

import type { LogEntry } from "./types.ts";

/** デフォルトログ保持日数 */
const DEFAULT_RETENTION_DAYS = 30;

/** ログディレクトリのベースパス */
let logBaseDir = "./logs";

/** ログ保持日数（プロジェクト別） */
const retentionDays: Map<string, number> = new Map();

/** ログベースディレクトリを設定する */
export function setLogBaseDir(dir: string): void {
  logBaseDir = dir;
}

/** プロジェクトのログ保持日数を設定する */
export function setRetentionDays(projectId: string, days: number): void {
  retentionDays.set(projectId, days);
}

/** 日付文字列を取得する（YYYY-MM-DD） */
function getDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** ログエントリをファイルに追記する */
export async function writeLogEntry(
  projectId: string,
  entry: LogEntry,
): Promise<void> {
  const date = getDateString(new Date(entry.timestamp));
  const dir = `${logBaseDir}/${projectId}`;
  const filePath = `${dir}/${date}.log`;
  const level = entry.stream === "stderr" ? "error" : "info";
  const line = `${entry.timestamp} [${level}] ${entry.line}\n`;

  try {
    await Deno.mkdir(dir, { recursive: true });
  } catch {
    // ディレクトリが既に存在する場合は無視
  }

  try {
    await Deno.writeTextFile(filePath, line, { append: true });
  } catch (e) {
    console.error(
      `[deploy] Failed to write log for "${projectId}": ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

/** 古いログファイルを削除する（ローテーション） */
export async function rotateProjectLogs(projectId: string): Promise<void> {
  const days = retentionDays.get(projectId) ?? DEFAULT_RETENTION_DAYS;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = getDateString(cutoff);

  const dir = `${logBaseDir}/${projectId}`;
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isFile || !entry.name.endsWith(".log")) continue;
      // ファイル名: YYYY-MM-DD.log
      const fileDate = entry.name.replace(".log", "");
      if (fileDate < cutoffStr) {
        try {
          await Deno.remove(`${dir}/${entry.name}`);
          console.log(`[deploy] Rotated log: ${projectId}/${entry.name}`);
        } catch {
          // 削除失敗は無視
        }
      }
    }
  } catch {
    // ディレクトリが存在しない場合は無視
  }
}

/** 全プロジェクトのログローテーションを実行する */
export async function rotateAllLogs(): Promise<void> {
  try {
    for await (const entry of Deno.readDir(logBaseDir)) {
      if (entry.isDirectory) {
        await rotateProjectLogs(entry.name);
      }
    }
  } catch {
    // ログディレクトリが存在しない場合は無視
  }
}

/** 日次ローテーションタイマーを開始する */
export function startDailyRotation(): number {
  // 次の 00:00 までの時間を計算
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  const delay = next.getTime() - now.getTime();

  // 初回は次の 00:00 に実行し、以降は 24 時間ごとに実行
  const timer = setTimeout(() => {
    rotateAllLogs();
    setInterval(() => rotateAllLogs(), 24 * 60 * 60 * 1000);
  }, delay);

  return timer as unknown as number;
}
