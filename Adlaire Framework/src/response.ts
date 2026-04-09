/**
 * Adlaire Framework — レスポンスヘルパー
 * FRAMEWORK_RULEBOOK §7.2 / §7.3 準拠
 */

import type { RedirectStatus, ResponseInit } from "./types.ts";

/** JSON レスポンス生成 */
export function jsonResponse<T>(data: T, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

/** テキストレスポンス生成 */
export function textResponse(data: string, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "text/plain; charset=utf-8");
  return new Response(data, { ...init, headers });
}

/** HTML レスポンス生成 */
export function htmlResponse(data: string, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  return new Response(data, { ...init, headers });
}

/** リダイレクトレスポンス生成 */
export function redirectResponse(
  url: string,
  status: RedirectStatus = 302,
): Response {
  return new Response(null, {
    status,
    headers: { Location: url },
  });
}

/** エラー JSON レスポンス生成 */
function errorResponse(
  status: number,
  error: string,
  message?: string,
): Response {
  return jsonResponse(
    { error, ...(message ? { message } : {}) },
    { status },
  );
}

/** 404 Not Found */
export function notFoundResponse(): Response {
  return errorResponse(404, "Not Found");
}

/** 401 Unauthorized */
export function unauthorizedResponse(): Response {
  return errorResponse(401, "Unauthorized");
}

/** 403 Forbidden */
export function forbiddenResponse(): Response {
  return errorResponse(403, "Forbidden");
}

/** 400 Bad Request */
export function badRequestResponse(message?: string): Response {
  return errorResponse(400, "Bad Request", message);
}

/** 500 Internal Server Error */
export function internalErrorResponse(message?: string): Response {
  return errorResponse(500, "Internal Server Error", message);
}
