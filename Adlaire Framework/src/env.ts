/**
 * Adlaire Framework — 型安全な環境変数アクセサ
 * FRAMEWORK_RULEBOOK §10.7 準拠
 *
 * アプリケーションコード内で `Deno.env.get()` を直接使用する代わりに
 * `getEnv()` を使用することで、ターゲット差異の吸収と
 * 必須環境変数の明示的なエラーハンドリングを実現する。
 */

/**
 * 環境変数を取得する（必須・フォールバックなし）。
 * 環境変数が未設定の場合は `Error` をスロー。
 */
export function getEnv(key: string): string;

/**
 * 環境変数を取得する（フォールバックあり）。
 * 環境変数が未設定の場合は `fallback` を返す。
 */
export function getEnv(key: string, fallback: string): string;

export function getEnv(key: string, fallback?: string): string {
  const value = Deno.env.get(key);
  if (value !== undefined) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${key}`);
}
