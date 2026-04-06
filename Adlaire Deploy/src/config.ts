/**
 * Adlaire Deploy — 設定管理
 */

import type { DeployConfig, ProjectConfig } from "./types.ts";

const CONFIG_FILE = "deploy.json";

/** プロジェクト ID バリデーション */
const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const PROJECT_ID_MIN = 2;
const PROJECT_ID_MAX = 63;

/** デフォルト設定 */
function createDefaultConfig(): DeployConfig {
  return {
    version: 1,
    host: "0.0.0.0",
    port: 8000,
    projects_dir: "./projects",
    projects: {},
  };
}

/** deploy.json を読み込む。存在しない場合はデフォルト設定で生成する */
export async function loadConfig(): Promise<DeployConfig> {
  try {
    const text = await Deno.readTextFile(CONFIG_FILE);
    const config: DeployConfig = JSON.parse(text);
    if (config.version !== 1) {
      throw new Error(`Unsupported config version: ${config.version}`);
    }
    return config;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      const config = createDefaultConfig();
      await saveConfig(config);
      return config;
    }
    throw e;
  }
}

/** deploy.json を保存する */
export async function saveConfig(config: DeployConfig): Promise<void> {
  const text = JSON.stringify(config, null, 2) + "\n";
  await Deno.writeTextFile(CONFIG_FILE, text);
}

/** プロジェクト ID のバリデーション */
export function validateProjectId(id: string): string | null {
  if (id.length < PROJECT_ID_MIN) {
    return `Project ID must be at least ${PROJECT_ID_MIN} characters`;
  }
  if (id.length > PROJECT_ID_MAX) {
    return `Project ID must be at most ${PROJECT_ID_MAX} characters`;
  }
  if (!PROJECT_ID_PATTERN.test(id)) {
    return "Project ID must contain only lowercase letters, digits, and hyphens (no leading/trailing hyphens)";
  }
  return null;
}

/** プロジェクトを設定に追加する */
export async function addProject(
  id: string,
  project: ProjectConfig,
): Promise<void> {
  const config = await loadConfig();
  if (config.projects[id]) {
    throw new Error(`Project "${id}" already exists`);
  }
  config.projects[id] = project;
  await saveConfig(config);

  // プロジェクトディレクトリを作成
  const dir = `${config.projects_dir}/${id}`;
  try {
    await Deno.mkdir(dir, { recursive: true });
  } catch {
    // ディレクトリが既に存在する場合は無視
  }
}

/** プロジェクトを設定から削除する */
export async function removeProject(id: string): Promise<void> {
  const config = await loadConfig();
  if (!config.projects[id]) {
    throw new Error(`Project "${id}" not found`);
  }
  delete config.projects[id];
  await saveConfig(config);
}
