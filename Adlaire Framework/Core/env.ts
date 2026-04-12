// ============================================================
// Adlaire Framework — env.ts
// 環境変数管理
// EnvRule / EnvSchema / EnvResult / loadEnv
// ============================================================

// ------------------------------------------------------------
// §5.6 EnvRule / EnvSchema / EnvResult
// ------------------------------------------------------------

export type EnvRule =
  | { type: "string"; required?: boolean; default?: string }
  | { type: "number"; required?: boolean; default?: number }
  | { type: "boolean"; required?: boolean; default?: boolean }
  | { type: "port"; required?: boolean; default?: number }
  | { type: "enum"; values: readonly string[]; required?: boolean; default?: string };

export type EnvSchema = Record<string, EnvRule>;

// ルール単体から値の TypeScript 型を導出するヘルパー型
// enum は values の要素リテラル Union 型を生成する
type EnvValueOf<R extends EnvRule> =
  R extends { type: "number" | "port" } ? number :
  R extends { type: "boolean" } ? boolean :
  R extends { type: "enum"; values: infer V extends readonly string[] } ? V[number] :
  string;

// required: true または default 指定があれば非 undefined。それ以外は T | undefined
export type EnvResult<S extends EnvSchema> = {
  readonly [K in keyof S]:
    S[K] extends ({ required: true } | { default: unknown })
      ? EnvValueOf<S[K]>
      : EnvValueOf<S[K]> | undefined
};

// ------------------------------------------------------------
// §6.2 loadEnv()
// ------------------------------------------------------------

// オーバーロード: スキーマなし（単一ファイル）
export function loadEnv(path?: string): Promise<void>;
// オーバーロード: スキーマあり（単一ファイル）
export function loadEnv<S extends EnvSchema>(options: {
  path?: string;
  schema: S;
}): Promise<EnvResult<S>>;
// オーバーロード: スキーマなし（複数ファイルマージ）
export function loadEnv(options: { paths: string[] }): Promise<void>;
// オーバーロード: スキーマあり（複数ファイルマージ）
export function loadEnv<S extends EnvSchema>(options: {
  paths: string[];
  schema: S;
}): Promise<EnvResult<S>>;

export async function loadEnv<S extends EnvSchema>(
  pathOrOptions?: string | { path?: string; schema?: S } | { paths: string[]; schema?: S },
): Promise<void | EnvResult<S>> {
  let filePaths: string[];
  let schema: S | undefined;

  if (typeof pathOrOptions === "string" || pathOrOptions === undefined) {
    filePaths = [pathOrOptions ?? ".env"];
    schema = undefined;
  } else if ("paths" in pathOrOptions) {
    filePaths = pathOrOptions.paths;
    schema = pathOrOptions.schema;
  } else {
    filePaths = [pathOrOptions.path ?? ".env"];
    schema = pathOrOptions.schema;
  }

  // 複数ファイルを順番に読み込み、後発ファイルが優先でマージする
  let raw = "";
  for (const filePath of filePaths) {
    let fileContent: string;
    try {
      fileContent = await Deno.readTextFile(filePath);
    } catch {
      fileContent = "";
    }
    raw += (raw.length > 0 ? "\n" : "") + fileContent;
  }

  // パース（インラインコメント除去・クォート除去）
  const envMap: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // 前後が同じクォートの場合のみ除去（"val" → val、'val' → val）
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    } else {
      // クォートされていない値のインラインコメントを除去（PORT=8000 # comment → 8000）
      const commentIdx = val.indexOf(" #");
      if (commentIdx !== -1) {
        val = val.slice(0, commentIdx).trimEnd();
      }
    }
    envMap[key] = val;
  }

  // スキーマバリデーション完了後に Deno.env.set を行うため、まず全キーを収集する
  // （バリデーション失敗時に環境変数が部分的に汚染されることを防ぐ）
  if (schema === undefined) {
    // スキーマなし: そのまま全キーを環境変数に設定
    for (const [k, v] of Object.entries(envMap)) {
      Deno.env.set(k, v);
    }
    return;
  }

  // スキーマあり: 型変換・バリデーション
  const result: Record<string, string | number | boolean | undefined> = {};

  for (const [key, rule] of Object.entries(schema)) {
    const rawVal = envMap[key] ?? Deno.env.get(key);

    if (rawVal === undefined) {
      if (rule.required && !("default" in rule)) {
        throw new Error(`loadEnv: 必須の環境変数 "${key}" が設定されていません`);
      }
      if (rule.default !== undefined) {
        result[key] = rule.default;
      } else {
        // required でなく default もない場合: undefined を設定（T-4）
        result[key] = undefined;
      }
      continue;
    }

    switch (rule.type) {
      case "string":
        result[key] = rawVal;
        break;
      case "number": {
        const n = Number(rawVal);
        if (Number.isNaN(n)) {
          throw new Error(`loadEnv: "${key}" を数値に変換できません: "${rawVal}"`);
        }
        result[key] = n;
        break;
      }
      case "port": {
        const p = Number(rawVal);
        if (!Number.isInteger(p) || p < 1 || p > 65535) {
          throw new Error(
            `loadEnv: "${key}" は 1〜65535 の整数である必要があります: "${rawVal}"`,
          );
        }
        result[key] = p;
        break;
      }
      case "boolean":
        result[key] = rawVal === "true";
        break;
      case "enum": {
        if (!(rule.values as readonly string[]).includes(rawVal)) {
          throw new Error(
            `loadEnv: "${key}" は ${(rule.values as readonly string[]).join(", ")} のいずれかである必要があります: "${rawVal}"`,
          );
        }
        result[key] = rawVal;
        break;
      }
    }
  }

  // バリデーション完了後に環境変数を反映する（途中失敗時の部分汚染を防ぐ）
  for (const [k, v] of Object.entries(envMap)) {
    Deno.env.set(k, v);
  }

  return result as EnvResult<S>;
}
