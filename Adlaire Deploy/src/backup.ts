/**
 * Adlaire Deploy — バックアップ・リストア
 * 仕様: DEPLOY_PLATFORM_RULEBOOK.md P14.5
 *
 * プラットフォームの全状態を tar.gz アーカイブにバックアップ・リストア。
 */

import { recordAudit } from "./audit.ts";

/**
 * バックアップを作成する。
 * @param outputPath 出力先パス（省略時は ./adlaire-backup-{timestamp}.tar.gz）
 */
export async function createBackup(
  outputPath?: string,
): Promise<{ path: string; success: boolean; error?: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outFile = outputPath ?? `./adlaire-backup-${timestamp}.tar.gz`;

  // バックアップ対象ディレクトリ
  const targets = [
    "deploy.json",
    "data/",
  ];

  // 存在するターゲットのみ含める
  const existingTargets: string[] = [];
  for (const t of targets) {
    try {
      await Deno.stat(t);
      existingTargets.push(t);
    } catch {
      // 存在しない場合はスキップ
    }
  }

  if (existingTargets.length === 0) {
    return { path: outFile, success: false, error: "No backup targets found" };
  }

  try {
    const cmd = new Deno.Command("tar", {
      args: ["czf", outFile, ...existingTargets],
      stdout: "inherit",
      stderr: "inherit",
    });

    const result = await cmd.output();
    if (!result.success) {
      return { path: outFile, success: false, error: `tar exited with code ${result.code}` };
    }

    const stat = await Deno.stat(outFile);
    console.log(`[backup] Created backup: ${outFile} (${stat.size} bytes)`);
    recordAudit("backup_create", "cli", "success", `path: ${outFile}, size: ${stat.size}`, null);

    return { path: outFile, success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    recordAudit("backup_create", "cli", "failure", msg, null);
    return { path: outFile, success: false, error: msg };
  }
}

/**
 * バックアップからリストアする。
 * @param archivePath tar.gz アーカイブパス
 * @param dryRun true の場合、内容を確認のみ（適用しない）
 */
export async function restoreBackup(
  archivePath: string,
  dryRun: boolean = false,
): Promise<{ success: boolean; files?: string[]; error?: string }> {
  try {
    await Deno.stat(archivePath);
  } catch {
    return { success: false, error: `Archive not found: ${archivePath}` };
  }

  if (dryRun) {
    // 内容一覧のみ表示
    const cmd = new Deno.Command("tar", {
      args: ["tzf", archivePath],
      stdout: "piped",
      stderr: "piped",
    });

    const result = await cmd.output();
    if (!result.success) {
      return { success: false, error: "Failed to list archive contents" };
    }

    const files = new TextDecoder().decode(result.stdout).trim().split("\n");
    return { success: true, files };
  }

  // 実際のリストア
  try {
    const cmd = new Deno.Command("tar", {
      args: ["xzf", archivePath, "--overwrite"],
      stdout: "inherit",
      stderr: "inherit",
    });

    const result = await cmd.output();
    if (!result.success) {
      return { success: false, error: `tar exited with code ${result.code}` };
    }

    console.log(`[backup] Restored from: ${archivePath}`);
    recordAudit("backup_restore", "cli", "success", `from: ${archivePath}`, null);

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    recordAudit("backup_restore", "cli", "failure", msg, null);
    return { success: false, error: msg };
  }
}
