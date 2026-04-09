/**
 * Adlaire Framework — ミドルウェア定義・実行チェーン
 * FRAMEWORK_RULEBOOK §8 準拠
 *
 * Phase 1 では defineMiddleware と executeMiddlewareChain を提供する。
 */

import type {
  Context,
  MiddlewareFunction,
  MiddlewareState,
  NextFunction,
  RouteParams,
} from "./types.ts";

/**
 * 型安全なミドルウェアを定義する（§8.2）。
 *
 * ```typescript
 * export const middleware = defineMiddleware<{ user: User | null }>(
 *   async (ctx, next) => {
 *     ctx.state.user = await getUser(ctx.req);
 *     return next();
 *   }
 * );
 * ```
 */
export function defineMiddleware<
  State extends MiddlewareState = Record<string, never>,
>(
  fn: MiddlewareFunction<State>,
): MiddlewareFunction<State> {
  return fn;
}

/**
 * ミドルウェアチェーンを実行する（§8.3）。
 *
 * ミドルウェアは外側（上位ディレクトリ）から順に実行される。
 * next() を呼び出さずに Response を返すと後続処理をスキップする。
 */
export function executeMiddlewareChain(
  ctx: Context<RouteParams, MiddlewareState>,
  middlewares: MiddlewareFunction<MiddlewareState>[],
  finalHandler: () => Response | Promise<Response>,
): Response | Promise<Response> {
  let index = 0;

  const next: NextFunction = (): Response | Promise<Response> => {
    if (index < middlewares.length) {
      const mw = middlewares[index++];
      return mw(ctx, next);
    }
    return finalHandler();
  };

  return next();
}
