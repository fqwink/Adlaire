/**
 * Adlaire Framework — defineHandler ヘルパー
 * FRAMEWORK_RULEBOOK §7.1 準拠
 *
 * §1.2 絶対原則「型安全」: defineHandler を経由しないハンドラー実装を禁止する。
 */

import type {
  Handler,
  HttpMethod,
  MethodHandlers,
  MiddlewareState,
  RouteParams,
  SingleHandler,
} from "./types.ts";

/**
 * 型安全なルートハンドラーを定義する。
 *
 * 形式A: メソッド別ハンドラー（推奨）
 * ```typescript
 * export const handler = defineHandler({
 *   GET(ctx) { return ctx.json({ ok: true }); },
 *   POST(ctx) { return ctx.json({ created: true }, { status: 201 }); },
 * });
 * ```
 *
 * 形式B: 単一ハンドラー
 * ```typescript
 * export const handler = defineHandler((ctx) => {
 *   return ctx.json({ ok: true });
 * });
 * ```
 */
export function defineHandler<
  Params extends RouteParams = Record<string, never>,
  State extends MiddlewareState = Record<string, never>,
>(
  handlerOrMap: Handler<Params, State>,
): Handler<Params, State> {
  return handlerOrMap;
}

/**
 * ハンドラーがメソッド別マップかどうかを判定する。
 */
export function isMethodHandlers<
  Params extends RouteParams,
  State extends MiddlewareState,
>(
  handler: Handler<Params, State>,
): handler is MethodHandlers<Params, State> {
  return typeof handler !== "function";
}

/**
 * ハンドラーが単一関数かどうかを判定する。
 */
export function isSingleHandler<
  Params extends RouteParams,
  State extends MiddlewareState,
>(
  handler: Handler<Params, State>,
): handler is SingleHandler<Params, State> {
  return typeof handler === "function";
}

/** サポートされる HTTP メソッド一覧 */
export const SUPPORTED_METHODS: ReadonlySet<HttpMethod> = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);
