/**
 * Adlaire Deploy — ロールバック管理
 *
 * デプロイ履歴の保持と過去バージョンへの復元
 */

import { getPlatformKv } from "./kv.ts";

/** ロールバック用スナップショットの最大保持件数 */
const MAX_SNAPSHOTS = 10;

/** デプロイスナップショット */
export interface DeploySnapshot {
  /** デプロイ ID */
  deploy_id: string;
  /** Git コミットハッシュ */
  commit: string;
  /** デプロイ日時 */
  deployed_at: string;
  /** エントリポイント */
  entry: string;
  /** 環境変数スナップショット（暗号化済みの場合はそのまま保持） */
  env_snapshot: Record<string, string>;
}

/** スナップショットを保存する */
export async function saveSnapshot(
  projectId: string,
  snapshot: DeploySnapshot,
): Promise<void> {
  const kv = getPlatformKv();
  await kv.set(["snapshot", projectId, snapshot.deploy_id], snapshot);

  // 超過分を削除
  const all: { key: string; deployed_at: string }[] = [];
  const iter = kv.list<DeploySnapshot>({ prefix: ["snapshot", projectId] });
  for await (const entry of iter) {
    all.push({
      key: entry.value.deploy_id,
      deployed_at: entry.value.deployed_at,
    });
  }

  if (all.length > MAX_SNAPSHOTS) {
    all.sort((a, b) => a.deployed_at.localeCompare(b.deployed_at));
    const toDelete = all.slice(0, all.length - MAX_SNAPSHOTS);
    for (const item of toDelete) {
      await kv.delete(["snapshot", projectId, item.key]);
    }
  }
}

/** スナップショット一覧を取得する（新しい順） */
export async function listSnapshots(
  projectId: string,
): Promise<DeploySnapshot[]> {
  const kv = getPlatformKv();
  const snapshots: DeploySnapshot[] = [];
  const iter = kv.list<DeploySnapshot>({ prefix: ["snapshot", projectId] });
  for await (const entry of iter) {
    snapshots.push(entry.value);
  }
  snapshots.sort((a, b) => b.deployed_at.localeCompare(a.deployed_at));
  return snapshots;
}

/** 指定デプロイ ID のスナップショットを取得する */
export async function getSnapshot(
  projectId: string,
  deployId: string,
): Promise<DeploySnapshot | null> {
  const kv = getPlatformKv();
  const entry = await kv.get<DeploySnapshot>(["snapshot", projectId, deployId]);
  return entry.value;
}

/** Git コミットをチェックアウトする */
export async function gitCheckout(
  projectDir: string,
  commit: string,
): Promise<void> {
  // まず fetch して最新のコミットを取得
  const fetchCmd = new Deno.Command("git", {
    args: ["fetch", "origin"],
    cwd: projectDir,
    stdout: "piped",
    stderr: "piped",
  });
  const fetchResult = await fetchCmd.output();
  if (!fetchResult.success) {
    throw new Error(`git fetch failed (exit code: ${fetchResult.code})`);
  }

  const checkoutCmd = new Deno.Command("git", {
    args: ["checkout", commit],
    cwd: projectDir,
    stdout: "piped",
    stderr: "piped",
  });
  const checkoutResult = await checkoutCmd.output();
  if (!checkoutResult.success) {
    const stderr = new TextDecoder().decode(checkoutResult.stderr);
    throw new Error(`git checkout failed: ${stderr}`);
  }
}
