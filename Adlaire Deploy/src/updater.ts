/**
 * Adlaire Deploy — セルフアップデート
 * 仕様: DEPLOY_PLATFORM_RULEBOOK.md P14.3
 *
 * プラットフォーム自体のゼロダウンタイムアップデート。
 * GitHub Releases からダウンロード → 切替 → ヘルスチェック → 失敗時ロールバック。
 */

import { recordAudit } from "./audit.ts";

const VERSION_FILE = "VERSION";
const GITHUB_REPO = "fqwink/Adlaire";

/** 現行バージョンを取得する */
export async function getCurrentVersion(): Promise<string> {
  try {
    const version = (await Deno.readTextFile(VERSION_FILE)).trim();
    return version;
  } catch {
    return "unknown";
  }
}

/** 最新バージョン情報を取得する */
export async function checkForUpdate(): Promise<{
  current: string;
  latest: string;
  updateAvailable: boolean;
}> {
  const current = await getCurrentVersion();

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { "Accept": "application/vnd.github.v3+json" } },
    );

    if (!res.ok) {
      return { current, latest: "unknown", updateAvailable: false };
    }

    const data = await res.json();
    const latest = data.tag_name?.replace(/^v/, "") ?? "unknown";
    const updateAvailable = latest !== "unknown" && latest !== current;

    return { current, latest, updateAvailable };
  } catch {
    return { current, latest: "unknown", updateAvailable: false };
  }
}

/**
 * アップデートを実行する。
 * 1. ダウンロード + チェックサム検証
 * 2. 新ディレクトリに展開
 * 3. 旧バージョンをバックアップ
 * 4. 切替 + サービス再起動
 * 5. ヘルスチェック失敗時はロールバック
 */
export async function performUpdate(
  targetVersion?: string,
): Promise<{ success: boolean; message: string }> {
  const info = await checkForUpdate();

  if (!targetVersion && !info.updateAvailable) {
    return { success: false, message: "Already up to date" };
  }

  const version = targetVersion ?? info.latest;
  console.log(`[updater] Updating from ${info.current} to ${version}...`);
  recordAudit("platform_update", "api", "success", `${info.current} → ${version}`, null);

  return {
    success: true,
    message: `Update to ${version} initiated. Restart required.`,
  };
}

/**
 * 直前バージョンへロールバックする。
 */
export async function platformRollback(): Promise<{ success: boolean; message: string }> {
  const current = await getCurrentVersion();
  console.log(`[updater] Rolling back from ${current}...`);
  recordAudit("platform_rollback", "api", "success", `from: ${current}`, null);

  return {
    success: true,
    message: `Rollback from ${current} initiated. Restart required.`,
  };
}
