/**
 * Adlaire Deploy — KV ストレージ管理
 *
 * プラットフォーム KV とプロジェクト別 KV のライフサイクル管理
 */

import type { DeployConfig, KvStats } from "./types.ts";

/** プラットフォーム KV インスタンス */
let platformKv: Deno.Kv | null = null;

/** データディレクトリとサブディレクトリを作成する */
async function ensureDataDirs(dataDir: string): Promise<void> {
  await Deno.mkdir(`${dataDir}/projects`, { recursive: true });
}

/** プラットフォーム KV を開く */
export async function openPlatformKv(config: DeployConfig): Promise<Deno.Kv> {
  if (platformKv) return platformKv;
  await ensureDataDirs(config.data_dir);
  platformKv = await Deno.openKv(`${config.data_dir}/platform.kv`);
  return platformKv;
}

/** プラットフォーム KV を取得する（開いていない場合はエラー） */
export function getPlatformKv(): Deno.Kv {
  if (!platformKv) {
    throw new Error("Platform KV is not open");
  }
  return platformKv;
}

/** プラットフォーム KV を閉じる */
export function closePlatformKv(): void {
  if (platformKv) {
    platformKv.close();
    platformKv = null;
  }
}

/** プロジェクト KV のファイルパスを返す */
export function getProjectKvPath(config: DeployConfig, projectId: string): string {
  return `${config.data_dir}/projects/${projectId}.kv`;
}

/** プロジェクト KV の統計情報を取得する */
export async function getKvStats(
  config: DeployConfig,
  projectId: string,
): Promise<KvStats> {
  const path = getProjectKvPath(config, projectId);
  try {
    const stat = await Deno.stat(path);
    return {
      path,
      size_bytes: stat.size,
      exists: true,
    };
  } catch {
    return {
      path,
      size_bytes: 0,
      exists: false,
    };
  }
}

/** プロジェクト KV を削除する */
export async function deleteProjectKv(
  config: DeployConfig,
  projectId: string,
): Promise<void> {
  const path = getProjectKvPath(config, projectId);
  try {
    await Deno.remove(path);
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      throw e;
    }
  }
  // WAL/SHM ファイルも削除
  for (const suffix of ["-wal", "-shm"]) {
    try {
      await Deno.remove(path + suffix);
    } catch {
      // 存在しない場合は無視
    }
  }
}
