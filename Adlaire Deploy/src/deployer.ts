/**
 * Adlaire Deploy — デプロイパイプライン
 *
 * Git clone/pull → Worker 再起動の自動化
 * デプロイ履歴はプラットフォーム KV に永続化
 */

import { getPlatformKv } from "./kv.ts";
import type { ProcessManager } from "./process_manager.ts";
import type { DeployRecord, DeployState } from "./types.ts";

/** デプロイ履歴の最大保持件数 */
const MAX_DEPLOY_HISTORY = 50;

/** KV からデプロイ ID カウンターを読み込み、インクリメントして返す */
async function nextDeployId(): Promise<string> {
  const kv = getPlatformKv();
  const key = ["deploy_counter"];
  const entry = await kv.get<number>(key);
  const next = (entry.value ?? 0) + 1;
  await kv.set(key, next);
  return `deploy_${String(next).padStart(4, "0")}`;
}

export class Deployer {
  private manager: ProcessManager;
  /** プロジェクト別デプロイ状態 */
  private states: Map<string, DeployState> = new Map();
  /** プロジェクト別キューフラグ（デプロイ中に次のリクエストが来た場合） */
  private queued: Map<string, { commit: string; branch: string; pusher: string }> = new Map();
  /** プロジェクト別ロック */
  private locks: Set<string> = new Set();

  constructor(manager: ProcessManager) {
    this.manager = manager;
  }

  /** デプロイ状態を取得する */
  getState(projectId: string): DeployState {
    return this.states.get(projectId) ?? "idle";
  }

  /** デプロイ履歴を KV から取得する */
  async getHistory(projectId: string): Promise<DeployRecord[]> {
    const kv = getPlatformKv();
    const records: DeployRecord[] = [];
    const iter = kv.list<DeployRecord>({ prefix: ["deploy", projectId] });
    for await (const entry of iter) {
      records.push(entry.value);
    }
    // started_at の降順でソート
    records.sort((a, b) => b.started_at.localeCompare(a.started_at));
    return records.slice(0, MAX_DEPLOY_HISTORY);
  }

  /** デプロイを実行する（非同期、即座に戻る） */
  async requestDeploy(
    projectId: string,
    commit: string,
    branch: string,
    pusher: string,
  ): Promise<"started" | "queued"> {
    if (this.locks.has(projectId)) {
      // デプロイ中：キューに追加（深さ 1、上書き）
      this.queued.set(projectId, { commit, branch, pusher });
      return "queued";
    }

    // 非同期でデプロイを開始（awaitしない）
    this.executeDeploy(projectId, commit, branch, pusher);
    return "started";
  }

  /** デプロイを実行する */
  private async executeDeploy(
    projectId: string,
    commit: string,
    branch: string,
    pusher: string,
  ): Promise<void> {
    this.locks.add(projectId);
    this.states.set(projectId, "deploying");
    const startedAt = new Date().toISOString();
    const deployId = await nextDeployId();

    console.log(`[deploy] Deploying "${projectId}" (commit: ${commit.slice(0, 7)}, by: ${pusher})`);

    try {
      const config = this.manager.getConfig();
      const projectConfig = this.manager.getProjectConfig(projectId);
      if (!projectConfig?.git) {
        throw new Error("Git not configured for this project");
      }

      const projectDir = `${config.projects_dir}/${projectId}`;

      // .git ディレクトリの存在で初回/更新を判断
      const isCloned = await this.isGitRepo(projectDir);

      if (isCloned) {
        await this.gitPull(projectDir, projectConfig.git.branch);
      } else {
        await this.gitClone(
          projectConfig.git.url,
          projectConfig.git.branch,
          projectDir,
        );
      }

      // Worker 再起動
      try {
        await this.manager.restart(projectId);
      } catch {
        await this.manager.start(projectId);
      }

      this.states.set(projectId, "deployed");
      await this.saveRecord({
        id: deployId,
        project_id: projectId,
        commit,
        branch,
        pusher,
        status: "deployed",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        error: null,
      });

      console.log(`[deploy] Deploy "${projectId}" succeeded`);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      this.states.set(projectId, "deploy_failed");
      await this.saveRecord({
        id: deployId,
        project_id: projectId,
        commit,
        branch,
        pusher,
        status: "deploy_failed",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        error: errorMsg,
      });

      console.error(`[deploy] Deploy "${projectId}" failed: ${errorMsg}`);
    } finally {
      this.locks.delete(projectId);

      // キューに次のデプロイがある場合は実行
      const next = this.queued.get(projectId);
      if (next) {
        this.queued.delete(projectId);
        this.executeDeploy(projectId, next.commit, next.branch, next.pusher);
      }
    }
  }

  /** Git リポジトリかどうかを判定する */
  private async isGitRepo(dir: string): Promise<boolean> {
    try {
      await Deno.stat(`${dir}/.git`);
      return true;
    } catch {
      return false;
    }
  }

  /** git clone を実行する */
  private async gitClone(
    url: string,
    branch: string,
    targetDir: string,
  ): Promise<void> {
    try {
      await Deno.remove(targetDir, { recursive: true });
    } catch {
      // 存在しない場合は無視
    }

    const cmd = new Deno.Command("git", {
      args: ["clone", "--depth", "1", "--branch", branch, url, targetDir],
      stdout: "inherit",
      stderr: "inherit",
    });

    const result = await cmd.output();
    if (!result.success) {
      throw new Error(`git clone failed (exit code: ${result.code})`);
    }
  }

  /** git pull を実行する */
  private async gitPull(dir: string, branch: string): Promise<void> {
    const fetchCmd = new Deno.Command("git", {
      args: ["fetch", "origin", branch],
      cwd: dir,
      stdout: "inherit",
      stderr: "inherit",
    });

    const fetchResult = await fetchCmd.output();
    if (!fetchResult.success) {
      throw new Error(`git fetch failed (exit code: ${fetchResult.code})`);
    }

    const resetCmd = new Deno.Command("git", {
      args: ["reset", "--hard", `origin/${branch}`],
      cwd: dir,
      stdout: "inherit",
      stderr: "inherit",
    });

    const resetResult = await resetCmd.output();
    if (!resetResult.success) {
      throw new Error(`git reset failed (exit code: ${resetResult.code})`);
    }
  }

  /** デプロイレコードを KV に保存する */
  private async saveRecord(record: DeployRecord): Promise<void> {
    const kv = getPlatformKv();
    await kv.set(["deploy", record.project_id, record.id], record);

    // 古いレコードを削除（MAX_DEPLOY_HISTORY 超過分）
    const all: string[] = [];
    const iter = kv.list<DeployRecord>({ prefix: ["deploy", record.project_id] });
    for await (const entry of iter) {
      all.push(entry.value.id);
    }

    if (all.length > MAX_DEPLOY_HISTORY) {
      // ID 昇順（古い順）でソートし、超過分を削除
      all.sort();
      const toDelete = all.slice(0, all.length - MAX_DEPLOY_HISTORY);
      for (const id of toDelete) {
        await kv.delete(["deploy", record.project_id, id]);
      }
    }
  }
}
