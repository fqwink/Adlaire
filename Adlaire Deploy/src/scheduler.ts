/**
 * Adlaire Deploy — デプロイスケジューリング
 * 仕様: DEPLOY_PLATFORM_RULEBOOK.md P13.2
 *
 * cron 式 / ISO8601 日時指定による予約デプロイ。
 * 60 秒間隔でスケジュールをチェック。UTC で評価。
 */

import { recordAudit } from "./audit.ts";
import type { Deployer } from "./deployer.ts";
import { getPlatformKv } from "./kv.ts";
import type { ScheduledDeploy } from "./types.ts";

let counter = 0;

function generateScheduleId(): string {
  counter++;
  return `sched_${String(counter).padStart(4, "0")}`;
}

/** スケジュールを追加する */
export async function addSchedule(
  projectId: string,
  branch: string,
  cron: string | null,
  runAt: string | null,
): Promise<ScheduledDeploy> {
  const kv = getPlatformKv();
  const id = generateScheduleId();

  const schedule: ScheduledDeploy = {
    id,
    project_id: projectId,
    cron,
    run_at: runAt,
    branch,
    enabled: true,
    last_run: null,
    next_run: cron ? computeNextCron(cron) : runAt,
  };

  await kv.set(["schedule", projectId, id], schedule);
  recordAudit("schedule_add", "api", "success", `id: ${id}, branch: ${branch}`, projectId);
  return schedule;
}

/** スケジュールを削除する */
export async function removeSchedule(
  projectId: string,
  scheduleId: string,
): Promise<boolean> {
  const kv = getPlatformKv();
  const key = ["schedule", projectId, scheduleId];
  const entry = await kv.get<ScheduledDeploy>(key);
  if (!entry.value) return false;
  await kv.delete(key);
  recordAudit("schedule_remove", "api", "success", `id: ${scheduleId}`, projectId);
  return true;
}

/** スケジュール一覧を取得する */
export async function listSchedules(
  projectId: string,
): Promise<ScheduledDeploy[]> {
  const kv = getPlatformKv();
  const results: ScheduledDeploy[] = [];
  for await (const entry of kv.list<ScheduledDeploy>({ prefix: ["schedule", projectId] })) {
    results.push(entry.value);
  }
  return results;
}

/**
 * スケジュールチェッカーを開始する（60 秒間隔）。
 */
export function startScheduleChecker(deployer: Deployer): number {
  return setInterval(async () => {
    await checkSchedules(deployer);
  }, 60_000);
}

async function checkSchedules(deployer: Deployer): Promise<void> {
  const kv = getPlatformKv();
  if (!kv) return;

  const now = new Date();

  for await (const entry of kv.list<ScheduledDeploy>({ prefix: ["schedule"] })) {
    const schedule = entry.value;
    if (!schedule.enabled) continue;
    if (!schedule.next_run) continue;

    const nextRun = new Date(schedule.next_run);
    if (now < nextRun) continue;

    // 実行
    console.log(`[scheduler] Executing scheduled deploy for "${schedule.project_id}" (${schedule.id})`);

    try {
      await deployer.requestDeploy(
        schedule.project_id,
        "HEAD",
        schedule.branch,
        "scheduler",
      );
      schedule.last_run = now.toISOString();

      if (schedule.run_at) {
        // 1 回限り: 削除
        await kv.delete(entry.key);
        recordAudit("scheduled_deploy", "scheduler", "success", `one-time: ${schedule.id}`, schedule.project_id);
      } else if (schedule.cron) {
        // cron: 次回実行時刻を再計算
        schedule.next_run = computeNextCron(schedule.cron);
        await kv.set(entry.key, schedule);
        recordAudit("scheduled_deploy", "scheduler", "success", `cron: ${schedule.id}`, schedule.project_id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      recordAudit("scheduled_deploy", "scheduler", "failure", msg, schedule.project_id);
    }
  }
}

/**
 * 簡易 cron 次回実行時刻計算。
 * フォーマット: "分 時 日 月 曜日"（5 フィールド）
 * ワイルドカード (*) のみサポート。
 */
export function computeNextCron(cron: string): string | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minSpec, hourSpec, daySpec, monthSpec, _dowSpec] = parts;

  const now = new Date();
  const candidate = new Date(now);
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);

  // 最大 1 年先まで探索
  const maxIterations = 525960; // 365 * 24 * 60
  for (let i = 0; i < maxIterations; i++) {
    const m = candidate.getUTCMinutes();
    const h = candidate.getUTCHours();
    const d = candidate.getUTCDate();
    const mo = candidate.getUTCMonth() + 1;

    const matchMin = minSpec === "*" || parseInt(minSpec) === m;
    const matchHour = hourSpec === "*" || parseInt(hourSpec) === h;
    const matchDay = daySpec === "*" || parseInt(daySpec) === d;
    const matchMonth = monthSpec === "*" || parseInt(monthSpec) === mo;

    if (matchMin && matchHour && matchDay && matchMonth) {
      return candidate.toISOString();
    }

    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }

  return null;
}
