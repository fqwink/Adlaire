/**
 * Adlaire Framework — 環境変数スキーマ定義
 * FRAMEWORK_RULEBOOK §10.8 準拠
 */

// ─── 型定義 ──────────────────────────────────────────────────────────────────

/** 環境変数フィールドの定義 */
export interface EnvFieldDef {
  /** 必須フラグ（デフォルト: true） */
  required?: boolean;
  /** フォールバック値（required: false の場合に有効） */
  default?: string;
  /** 型変換（デフォルト: "string"） */
  type?: "string" | "number" | "boolean";
}

/**
 * スキーマから型変換後の結果型を導出するユーティリティ型。
 * type: "number" → number、type: "boolean" → boolean、その他 → string。
 */
type EnvFieldType<F extends EnvFieldDef> = F["type"] extends "number"
  ? number
  : F["type"] extends "boolean"
  ? boolean
  : string;

/** defineEnvSchema の戻り値型 */
export type EnvSchemaResult<T extends Record<string, EnvFieldDef>> = {
  readonly [K in keyof T]: EnvFieldType<T[K]>;
};

// ─── 実装 ────────────────────────────────────────────────────────────────────

/** "true" / "1" / "yes" を true、それ以外を false に変換する */
function toBoolean(raw: string): boolean {
  return raw === "true" || raw === "1" || raw === "yes";
}

/** raw 文字列を EnvFieldDef.type に従い変換する */
function convertValue(raw: string, type: EnvFieldDef["type"]): string | number | boolean {
  if (type === "number") {
    if (raw === "") {
      throw new Error(
        `Environment variable value "" cannot be converted to number`,
      );
    }
    const n = Number(raw);
    if (isNaN(n)) {
      throw new Error(
        `Environment variable value "${raw}" cannot be converted to number`,
      );
    }
    return n;
  }
  if (type === "boolean") return toBoolean(raw);
  return raw;
}

/** type が未指定の場合のデフォルト値 */
function defaultValueFor(type: EnvFieldDef["type"]): string | number | boolean {
  if (type === "number") return 0;
  if (type === "boolean") return false;
  return "";
}

/**
 * 複数の環境変数をスキーマ定義に基づいて一括検証・型変換する（§10.8）。
 * モジュール評価時（`defineEnvSchema()` 呼び出し時）に実行される。
 *
 * @param schema - 環境変数スキーマ定義
 * @returns 型変換済みの環境変数オブジェクト
 * @throws Error - 必須変数が未設定の場合
 */
export function defineEnvSchema<T extends Record<string, EnvFieldDef>>(
  schema: T,
): EnvSchemaResult<T> {
  const result: Record<string, string | number | boolean> = {};

  for (const [key, def] of Object.entries(schema)) {
    const {
      required = true,
      default: fallback,
      type = "string",
    } = def;

    const raw = Deno.env.get(key);

    if (raw !== undefined) {
      // 値が設定されている場合は型変換して格納
      result[key] = convertValue(raw, type);
    } else if (!required && fallback !== undefined) {
      // 任意フィールドでフォールバック値がある場合
      result[key] = convertValue(fallback, type);
    } else if (!required) {
      // 任意フィールドでフォールバック値もない場合 → 型のデフォルト値
      result[key] = defaultValueFor(type);
    } else {
      // 必須フィールドが未設定
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return Object.freeze(result) as EnvSchemaResult<T>;
}
