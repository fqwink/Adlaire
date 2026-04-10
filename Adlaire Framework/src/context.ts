/**
 * Adlaire Framework — 型付きリクエストコンテキスト
 * FRAMEWORK_RULEBOOK §6.3 / §6.6 / §6.7 準拠
 */

import type {
  Context,
  MiddlewareState,
  RedirectStatus,
  ResponseInit,
  RouteParams,
  WebSocketHandlers,
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
import { applySetCookies, createCookieStore } from "./cookies.ts";
import { ValidationError } from "./error.ts";

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

  // §6.5: クエリパラメータを Record<string, string> に変換（同名キーは最初の値のみ）
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    if (!(key in query)) {
      query[key] = value;
    }
  }

  // §6.7: Cookie ストアを初期化
  const { cookies, getEntries } = createCookieStore(
    req.headers.get("Cookie") ?? "",
  );

  /** Set-Cookie を適用したレスポンスを返す共通ラッパー */
  function withCookies(res: Response): Response {
    return applySetCookies(res, getEntries());
  }

  return {
    req,
    params: Object.freeze({ ...params }),
    state,
    url,
    query: Object.freeze(query),
    cookies,

    // §6.6: リクエストボディの JSON パース + 型ガード
    async body<T>(guard?: (data: unknown) => data is T): Promise<T> {
      let data: unknown;
      try {
        data = await req.json();
      } catch {
        throw new ValidationError("Invalid JSON body");
      }
      if (guard !== undefined && !guard(data)) {
        throw new ValidationError("Request body validation failed");
      }
      return data as T;
    },

    // §7.2 レスポンスヘルパー — Set-Cookie を自動適用
    json<T>(data: T, init?: ResponseInit): Response {
      return withCookies(jsonResponse(data, init));
    },
    text(data: string, init?: ResponseInit): Response {
      return withCookies(textResponse(data, init));
    },
    html(data: string, init?: ResponseInit): Response {
      return withCookies(htmlResponse(data, init));
    },
    redirect(redirectUrl: string, status?: RedirectStatus): Response {
      return withCookies(redirectResponse(redirectUrl, status));
    },
    notFound(): Response {
      return withCookies(notFoundResponse());
    },
    unauthorized(): Response {
      return withCookies(unauthorizedResponse());
    },
    forbidden(): Response {
      return withCookies(forbiddenResponse());
    },
    badRequest(message?: string): Response {
      return withCookies(badRequestResponse(message));
    },
    internalError(message?: string): Response {
      return withCookies(internalErrorResponse(message));
    },

    // §6.8: WebSocket へのアップグレード
    upgradeWebSocket(handlers: WebSocketHandlers): Response {
      const { socket, response } = Deno.upgradeWebSocket(req);
      if (handlers.onOpen) {
        socket.addEventListener("open", () => handlers.onOpen!(socket));
      }
      if (handlers.onMessage) {
        socket.addEventListener("message", (e) =>
          handlers.onMessage!(socket, e as MessageEvent)
        );
      }
      if (handlers.onClose) {
        socket.addEventListener("close", (e) =>
          handlers.onClose!(socket, e as CloseEvent)
        );
      }
      if (handlers.onError) {
        socket.addEventListener("error", (e) =>
          handlers.onError!(socket, e)
        );
      }
      return response;
    },
  };
}
