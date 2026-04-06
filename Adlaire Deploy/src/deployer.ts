/**
 * Adlaire Deploy — デプロイパイプライン
 *
 * Git clone/pull → ビルドステップ → Worker 再起動の自動化
 * デプロイ履歴はプラットフォーム KV に永続化
 * Phase 6: ロールバック・プライベートリポジトリ対応
 * Phase 7: ビルドステップ・デプロイ通知
 * Phase 10: デプロイ並列化セマフォ・モノレポ対応・監査ログ
 */

import { recordAudit } from "./audit.ts";
import { runBuildStep } from "./build.ts";
import type { ClusterManager } from "./cluster.ts";
import { embedPatInUrl, getCredential, getSshGitEnv } from "./credential.ts";
import { resolveEnv } from "./env_crypto.ts";
import { getPlatformKv } from "./kv.ts";
import { sendDeployNotification } from "./notify.ts";
import type { ProcessManager } from "./process_manager.ts";
import { getSnapshot, gitCheckout, listSnapshots, saveSnapshot } from "./rollback.ts";
import type { DeployRecord, DeployState, EdgeDeployResult } from "./types.ts";

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
  private cluster: ClusterManager | null = null;
  /** プロジェクト別デプロイ状態 */
  private states: Map<string, DeployState> = new Map();
  /** プロジェクト別キューフラグ（デプロイ中に次のリクエストが来た場合） */
  private queued: Map<string, { commit: string; branch: string; pusher: string }> = new Map();
  /** プロジェクト別ロック */
  private locks: Set<string> = new Set();
  /** グローバル並列デプロイカウンター（Phase 10） */
  private parallelCount = 0;
  /** グローバル並列上限超過時の待機キュー（Phase 10） */
  private globalWaiters: Array<() => void> = [];

  constructor(manager: ProcessManager) {
    this.manager = manager;
  }

  /** 並列デプロイの最大同時実行数を取得する（Phase 10） */
  private getMaxParallel(): number {
    return this.manager.getConfig().max_parallel_deploys ?? 4;
  }

  /** グローバルセマフォを取得する（Phase 10） */
  private async acquireGlobalSemaphore(): Promise<void> {
    if (this.parallelCount < this.getMaxParallel()) {
      this.parallelCount++;
      return;
    }
    // 上限に達した場合は待機
    await new Promise<void>((resolve) => {
      this.globalWaiters.push(resolve);
    });
    this.parallelCount++;
  }

  /** グローバルセマフォを解放する（Phase 10） */
  private releaseGlobalSemaphore(): void {
    this.parallelCount--;
    const next = this.globalWaiters.shift();
    if (next) next();
  }

  /** クラスタマネージャを設定する */
  setClusterManager(cluster: ClusterManager): void {
    this.cluster = cluster;
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

  /** ロールバックを実行する */
  async rollback(
    projectId: string,
    deployId?: string,
  ): Promise<void> {
    const config = this.manager.getConfig();
    const projectDir = `${config.projects_dir}/${projectId}`;

    let snapshot;
    if (deployId) {
      snapshot = await getSnapshot(projectId, deployId);
      if (!snapshot) {
        throw new Error(`Snapshot not found: ${deployId}`);
      }
    } else {
      // 直前のスナップショットを取得
      const snapshots = await listSnapshots(projectId);
      if (snapshots.length < 2) {
        throw new Error("No previous snapshot available for rollback");
      }
      snapshot = snapshots[1]; // 現在の次に新しいもの
    }

    console.log(`[deploy] Rolling back "${projectId}" to ${snapshot.commit.slice(0, 7)} (${snapshot.deploy_id})`);

    // git checkout
    await gitCheckout(projectDir, snapshot.commit);

    // Worker 再起動
    try {
      await this.manager.restart(projectId);
    } catch {
      await this.manager.start(projectId);
    }

    // ロールバック完了を新規デプロイとして記録
    const rollbackDeployId = await nextDeployId();
    const now = new Date().toISOString();

    await this.saveRecord({
      id: rollbackDeployId,
      project_id: projectId,
      commit: snapshot.commit,
      branch: "rollback",
      pusher: "rollback",
      status: "deployed",
      started_at: now,
      finished_at: now,
      error: null,
    });

    // スナップショットも保存
    await saveSnapshot(projectId, {
      deploy_id: rollbackDeployId,
      commit: snapshot.commit,
      deployed_at: now,
      entry: snapshot.entry,
      env_snapshot: snapshot.env_snapshot,
    });

    recordAudit("rollback", "cli", "success", `to: ${snapshot.commit.slice(0, 7)}`, projectId);
    console.log(`[deploy] Rollback "${projectId}" completed`);
  }

  /** デプロイを実行する */
  private async executeDeploy(
    projectId: string,
    commit: string,
    branch: string,
    pusher: string,
  ): Promise<void> {
    // グローバルセマフォ取得（Phase 10: 並列デプロイ数制限）
    await this.acquireGlobalSemaphore();
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

      // プライベートリポジトリ認証情報の取得
      const credential = await getCredential(projectId).catch(() => null);
      let gitUrl = projectConfig.git.url;
      let gitEnv: Record<string, string> = {};

      if (credential) {
        if (credential.type === "pat") {
          gitUrl = embedPatInUrl(gitUrl, credential.value);
        } else if (credential.type === "ssh") {
          gitEnv = getSshGitEnv(credential.value);
        }
      }

      // .git ディレクトリの存在で初回/更新を判断
      const isCloned = await this.isGitRepo(projectDir);

      if (isCloned) {
        await this.gitPull(projectDir, projectConfig.git.branch, gitEnv);
      } else {
        await this.gitClone(gitUrl, projectConfig.git.branch, projectDir, gitEnv);
      }

      // モノレポ対応: root_dir がある場合はサブディレクトリをプロジェクトルートとする（Phase 10）
      const effectiveDir = projectConfig.root_dir
        ? `${projectDir}/${projectConfig.root_dir}`
        : projectDir;

      // ビルドステップの実行（Phase 7）
      if (projectConfig.build_command) {
        const env = await resolveEnv(projectId, projectConfig.env);
        await runBuildStep(
          effectiveDir,
          projectConfig.build_command,
          projectConfig.build_timeout,
          env,
        );
      }

      // Worker 再起動
      try {
        await this.manager.restart(projectId);
      } catch {
        await this.manager.start(projectId);
      }

      // Edge 伝播（origin のみ）
      let edgeResults: EdgeDeployResult[] | undefined;
      if (this.cluster && this.cluster.getClusterConfig().role === "origin") {
        console.log(`[deploy] Propagating deploy "${projectId}" to edge nodes...`);
        edgeResults = await this.cluster.propagateDeploy(projectId, commit, branch);
        for (const r of edgeResults) {
          console.log(`[deploy]   ${r.node_id}: ${r.status}${r.error ? ` (${r.error})` : ""}`);
        }
      }

      this.states.set(projectId, "deployed");
      const record: DeployRecord = {
        id: deployId,
        project_id: projectId,
        commit,
        branch,
        pusher,
        status: "deployed",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        error: null,
        edge_results: edgeResults,
      };
      await this.saveRecord(record);

      // デプロイスナップショットの保存（Phase 6）
      await saveSnapshot(projectId, {
        deploy_id: deployId,
        commit,
        deployed_at: record.finished_at,
        entry: projectConfig.entry,
        env_snapshot: projectConfig.env,
      });

      // デプロイ通知の送信（Phase 7）
      if (projectConfig.webhook_url) {
        sendDeployNotification(
          projectConfig.webhook_url,
          projectConfig.webhook_secret ?? null,
          projectId,
          deployId,
          commit,
          "success",
          "Deploy succeeded",
        ).catch(() => {}); // 非同期、エラーは無視
      }

      // 監査ログ記録（Phase 10）
      recordAudit("deploy", pusher, "success", `commit: ${commit.slice(0, 7)}`, projectId);

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

      // デプロイ失敗通知の送信（Phase 7）
      const projectConfig = this.manager.getProjectConfig(projectId);
      if (projectConfig?.webhook_url) {
        sendDeployNotification(
          projectConfig.webhook_url,
          projectConfig.webhook_secret ?? null,
          projectId,
          deployId,
          commit,
          "failure",
          errorMsg,
        ).catch(() => {});
      }

      // 監査ログ記録（Phase 10）
      recordAudit("deploy", pusher, "failure", errorMsg, projectId);

      console.error(`[deploy] Deploy "${projectId}" failed: ${errorMsg}`);
    } finally {
      this.locks.delete(projectId);
      this.releaseGlobalSemaphore();

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
    extraEnv: Record<string, string> = {},
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
      env: { ...Deno.env.toObject(), ...extraEnv },
    });

    const result = await cmd.output();
    if (!result.success) {
      throw new Error(`git clone failed (exit code: ${result.code})`);
    }
  }

  /** git pull を実行する */
  private async gitPull(
    dir: string,
    branch: string,
    extraEnv: Record<string, string> = {},
  ): Promise<void> {
    const env = { ...Deno.env.toObject(), ...extraEnv };

    const fetchCmd = new Deno.Command("git", {
      args: ["fetch", "origin", branch],
      cwd: dir,
      stdout: "inherit",
      stderr: "inherit",
      env,
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
      env,
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
