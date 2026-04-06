/**
 * Adlaire Deploy — 監査ログ
 * 仕様: DEPLOY_PLATFORM_RULEBOOK.md P10.2
 *
 * 管理 API・ダッシュボード操作の記録・参照。
 * Deno KV に保存し、最大 10,000 件を保持する。
 */

import { getPlatformKv } from "./kv.ts";

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  project_id: string | null;
  actor: string;
  detail: string;
  result: "success" | "failure";
}

const MAX_AUDIT_LOGS = 10_000;

let counter = 0;

function generateAuditId(): string {
  counter++;
  return `audit_${Date.now()}_${counter}`;
}

/**
 * 監査ログを記録する。
 * 非同期・非ブロッキング: 書き込み失敗は主処理に影響させない。
 */
export function recordAudit(
  action: string,
  actor: string,
  result: "success" | "failure",
  detail: string = "",
  project_id: string | null = null,
): void {
  const entry: AuditLog = {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    action,
    project_id,
    actor,
    detail,
    result,
  };

  // 非同期で書き込み（awaitしない）
  writeAuditLog(entry).catch(() => {
    // 書き込み失敗は無視（P10.2.3 仕様）
  });
}

async function writeAuditLog(entry: AuditLog): Promise<void> {
  const kv = getPlatformKv();
  if (!kv) return;

  const timestampReverse = 9999999999999 - Date.now();
  const key = ["audit", timestampReverse, entry.id];

  await kv.set(key, entry);

  // 古いログの削除（10,000 件超過分）
  await pruneOldAuditLogs(kv);
}

async function pruneOldAuditLogs(kv: Deno.Kv): Promise<void> {
  const entries: Deno.KvEntry<AuditLog>[] = [];
  for await (const entry of kv.list<AuditLog>({ prefix: ["audit"] })) {
    entries.push(entry);
  }

  if (entries.length <= MAX_AUDIT_LOGS) return;

  // entries はタイムスタンプ逆順なので末尾が古い
  const toDelete = entries.slice(MAX_AUDIT_LOGS);
  for (const entry of toDelete) {
    await kv.delete(entry.key);
  }
}

/**
 * 監査ログを取得する。
 * @param limit 最大件数（デフォルト 50、最大 100）
 * @param projectId プロジェクト ID でフィルタ（省略時は全件）
 */
export async function getAuditLogs(
  limit: number = 50,
  projectId?: string,
): Promise<AuditLog[]> {
  const kv = getPlatformKv();
  if (!kv) return [];

  const effectiveLimit = Math.min(Math.max(limit, 1), 100);
  const results: AuditLog[] = [];

  for await (const entry of kv.list<AuditLog>({ prefix: ["audit"] })) {
    const log = entry.value;
    if (projectId && log.project_id !== projectId) continue;
    results.push(log);
    if (results.length >= effectiveLimit) break;
  }

  return results;
}
