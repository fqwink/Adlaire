// ============================================================
// Adlaire Framework — response.ts
// レスポンスヘルパー・静的ファイル配信・Cookie・Content-Negotiation
// ============================================================

import type { Handler, HttpStatus } from "./types.ts";

type RedirectStatus = 301 | 302 | 307 | 308;

// ------------------------------------------------------------
// §9 レスポンスヘルパー
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// §9.2 静的ファイル配信
// ------------------------------------------------------------

export interface StaticOptions {
  root: string;
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".mjs": "application/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=UTF-8",
  ".map": "application/json",
  ".wasm": "application/wasm",
  ".ts": "text/typescript; charset=UTF-8",
};

function getMimeType(path: string): string {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

export function serveStatic(options: StaticOptions): Handler {
  const root = options.root.replace(/\/$/, "");

  return async (ctx) => {
    const filePath = ctx.params.path ?? "";

    // ディレクトリトラバーサル防御
    const normalized = new URL(filePath, "file:///").pathname;
    if (normalized.includes("..")) {
      return json({ error: "Forbidden" }, 403);
    }

    const fullPath = `${root}/${normalized}`;

    try {
      const content = await Deno.readFile(fullPath);
      const contentType = getMimeType(fullPath);
      return new Response(content, {
        status: 200,
        headers: { "Content-Type": contentType },
      });
    } catch {
      return json({ error: "Not Found" }, 404);
    }
  };
}

// ------------------------------------------------------------
// §9.3 Cookie ヘルパー
// ------------------------------------------------------------

export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export function getCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get("Cookie");
  if (cookieHeader === null) return null;

  for (const pair of cookieHeader.split(";")) {
    const trimmed = pair.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    if (trimmed.slice(0, eqIdx) === name) {
      return decodeURIComponent(trimmed.slice(eqIdx + 1));
    }
  }
  return null;
}

export function setCookie(
  headers: Headers,
  name: string,
  value: string,
  options?: CookieOptions,
): void {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options) {
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.expires !== undefined) parts.push(`Expires=${options.expires.toUTCString()}`);
    if (options.path !== undefined) parts.push(`Path=${options.path}`);
    if (options.domain !== undefined) parts.push(`Domain=${options.domain}`);
    if (options.secure) parts.push("Secure");
    if (options.httpOnly) parts.push("HttpOnly");
    if (options.sameSite !== undefined) parts.push(`SameSite=${options.sameSite}`);
  }
  headers.append("Set-Cookie", parts.join("; "));
}

export function deleteCookie(headers: Headers, name: string): void {
  headers.append("Set-Cookie", `${name}=; Max-Age=0; Path=/`);
}

// ------------------------------------------------------------
// §9.4 Content-Negotiation
// ------------------------------------------------------------

interface AcceptEntry {
  type: string;
  quality: number;
}

function parseAccept(header: string): AcceptEntry[] {
  return header.split(",").map((part) => {
    const trimmed = part.trim();
    const [type, ...params] = trimmed.split(";");
    let quality = 1.0;
    for (const param of params) {
      const kv = param.trim();
      if (kv.startsWith("q=")) {
        quality = parseFloat(kv.slice(2));
        if (Number.isNaN(quality)) quality = 0;
      }
    }
    return { type: type.trim(), quality };
  }).sort((a, b) => b.quality - a.quality);
}

export function accepts(req: Request, ...types: string[]): string | null {
  const header = req.headers.get("Accept");
  if (header === null) return types[0] ?? null;

  const entries = parseAccept(header);
  for (const entry of entries) {
    if (entry.quality === 0) continue;
    for (const t of types) {
      if (entry.type === t || entry.type === "*/*") return t;
      // サブタイプワイルドカード: text/* → text/html にマッチ
      if (entry.type.endsWith("/*") && t.startsWith(entry.type.slice(0, -1))) return t;
    }
  }
  return null;
}
