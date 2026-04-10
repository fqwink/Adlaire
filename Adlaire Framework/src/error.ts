/**
 * Adlaire Framework — フレームワーク提供エラークラス
 * FRAMEWORK_RULEBOOK §6.6 準拠
 */

/**
 * リクエストボディ検証失敗時にスローされるエラー（§6.6）。
 *
 * - ctx.body() が JSON パース失敗または型ガード失敗時にスローする。
 * - server.ts がキャッチし 400 Bad Request に変換する。
 * - _error.ts ハンドラーには渡されない。
 */
export class ValidationError extends Error {
  readonly status = 400 as const;

  constructor(message = "Request body validation failed") {
    super(message);
    this.name = "ValidationError";
  }
}
