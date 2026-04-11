// ============================================================
// Adlaire Framework — response.ts
// レスポンスヘルパー。すべて Response オブジェクトを返す。
// ============================================================

import type { HttpStatus } from "./types.ts";

type RedirectStatus = 301 | 302 | 307 | 308;

export function json(data: unknown, status: HttpStatus = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8" },
  });
}

export function text(body: string, status: HttpStatus = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=UTF-8" },
  });
}

export function html(body: string, status: HttpStatus = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

export function send(status: HttpStatus, body?: string): Response {
  return new Response(body ?? null, { status });
}

export function redirect(url: string | URL, status: RedirectStatus = 302): Response {
  return new Response(null, {
    status,
    headers: { "Location": String(url) },
  });
}
