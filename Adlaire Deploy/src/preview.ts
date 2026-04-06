/**
 * Adlaire Deploy — デプロイプレビュー URL
 * 仕様: DEPLOY_PLATFORM_RULEBOOK.md P13.3
 *
 * ブランチ単位の一時的なプレビュー環境。
 * TTL 経過後に自動削除。ポート自動割り当て。
 */

import { recordAudit } from "./audit.ts";
import { getPlatformKv } from "./kv.ts";
import type { DeployConfig, PreviewEnv } from "./types.ts";

let counter = 0;

function generatePreviewId(): string {
  counter++;
  return `preview_${String(counter).padStart(4, "0")}`;
}

function sanitizeBranch(branch: string): string {
  return branch.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

/** 使用中のプレビューポートを取得する */
async function getUsedPorts(): Promise<Set<number>> {
  const kv = getPlatformKv();
  const ports = new Set<number>();
  for await (const entry of kv.list<PreviewEnv>({ prefix: ["preview"] })) {
    ports.add(entry.value.port);
  }
  return ports;
}

/** ポート自動割り当て */
async function allocatePort(config: DeployConfig): Promise<number> {
  const start = config.preview_port_range_start ?? 10000;
  const end = config.preview_port_range_end ?? 19999;
  const used = await getUsedPorts();

  for (let port = start; port <= end; port++) {
    if (!used.has(port)) return port;
  }

  throw new Error("No available preview ports");
}

/** プレビュー環境を作成する */
export async function createPreview(
  projectId: string,
  branch: string,
  config: DeployConfig,
): Promise<PreviewEnv> {
  if (!config.preview_base_domain) {
    throw new Error("preview_base_domain is not configured");
  }

  const kv = getPlatformKv();
  const id = generatePreviewId();
  const port = await allocatePort(config);
  const sanitized = sanitizeBranch(branch);
  const hostname = `${sanitized}-${id}.preview.${config.preview_base_domain}`;
  const ttl = config.preview_ttl_seconds ?? 86400;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl * 1000);

  const preview: PreviewEnv = {
    id,
    project_id: projectId,
    branch,
    hostname,
    port,
    status: "running",
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  await kv.set(["preview", projectId, id], preview);
  recordAudit("preview_create", "api", "success", `branch: ${branch}, port: ${port}`, projectId);

  return preview;
}

/** プレビュー環境を削除する */
export async function removePreview(
  projectId: string,
  previewId: string,
): Promise<boolean> {
  const kv = getPlatformKv();
  const key = ["preview", projectId, previewId];
  const entry = await kv.get<PreviewEnv>(key);
  if (!entry.value) return false;
  await kv.delete(key);
  recordAudit("preview_remove", "api", "success", `id: ${previewId}`, projectId);
  return true;
}

/** プレビュー環境一覧を取得する */
export async function listPreviews(
  projectId: string,
): Promise<PreviewEnv[]> {
  const kv = getPlatformKv();
  const results: PreviewEnv[] = [];
  for await (const entry of kv.list<PreviewEnv>({ prefix: ["preview", projectId] })) {
    results.push(entry.value);
  }
  return results;
}

/**
 * 期限切れプレビュー環境の自動削除チェッカーを開始する。
 * 60 秒間隔で実行。
 */
export function startPreviewCleaner(): number {
  return setInterval(async () => {
    await cleanExpiredPreviews();
  }, 60_000);
}

async function cleanExpiredPreviews(): Promise<void> {
  const kv = getPlatformKv();
  if (!kv) return;

  const now = new Date();

  for await (const entry of kv.list<PreviewEnv>({ prefix: ["preview"] })) {
    const preview = entry.value;
    const expires = new Date(preview.expires_at);
    if (now > expires) {
      await kv.delete(entry.key);
      console.log(`[preview] Expired preview "${preview.id}" (${preview.hostname}) removed`);
      recordAudit("preview_expired", "system", "success", `id: ${preview.id}`, preview.project_id);
    }
  }
}
