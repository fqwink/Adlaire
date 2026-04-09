/**
 * Adlaire Framework — 型付きリクエストコンテキスト
 * FRAMEWORK_RULEBOOK §6.3 準拠
 */

import type {
  Context,
  MiddlewareState,
  RedirectStatus,
  ResponseInit,
  RouteParams,
} from "./types.ts";
import {
  badRequestResponse,
  forbiddenResponse,
  htmlResponse,
  internalErrorResponse,
  jsonResponse,
  notFoundResponse,
  redirectResponse,
  textResponse,
  unauthorizedResponse,
} from "./response.ts";

/**
 * Context の実体を生成する。
 * フレームワーク内部でのみ使用。開発者が直接インスタンス化することはない。
 */
export function createContext<
  Params extends RouteParams = Record<string, never>,
  State extends MiddlewareState = Record<string, never>,
>(
  req: Request,
  params: Params,
  state: State,
): Context<Params, State> {
  const url = new URL(req.url);

  return {
    req,
    params: Object.freeze({ ...params }),
    state,
    url,

    json<T>(data: T, init?: ResponseInit): Response {
      return jsonResponse(data, init);
    },
    text(data: string, init?: ResponseInit): Response {
      return textResponse(data, init);
    },
    html(data: string, init?: ResponseInit): Response {
      return htmlResponse(data, init);
    },
    redirect(redirectUrl: string, status?: RedirectStatus): Response {
      return redirectResponse(redirectUrl, status);
    },
    notFound(): Response {
      return notFoundResponse();
    },
    unauthorized(): Response {
      return unauthorizedResponse();
    },
    forbidden(): Response {
      return forbiddenResponse();
    },
    badRequest(message?: string): Response {
      return badRequestResponse(message);
    },
    internalError(message?: string): Response {
      return internalErrorResponse(message);
    },
  };
}
