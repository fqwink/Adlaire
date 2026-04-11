// ============================================================
// Adlaire Framework — response.ts
// レスポンスヘルパー・静的ファイル配信・Cookie・Content-Negotiation
// パースヘルパー（parseQuery / parseParam）
// ============================================================

import type { Handler, HttpStatus, QueryResult, QuerySchema } from "./types.ts";
import { HTTPError } from "./types.ts";

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
    if (filePath.includes("..") || filePath.startsWith("/")) {
      return json({ error: "Forbidden" }, 403);
    }
    const normalized = filePath.replace(/\\/g, "/");
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
      try {
        return decodeURIComponent(trimmed.slice(eqIdx + 1));
      } catch {
        return trimmed.slice(eqIdx + 1);
      }
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
      if (entry.type.endsWith("/*")) {
        const baseType = entry.type.slice(0, entry.type.indexOf("/"));
        if (t.startsWith(baseType + "/")) return t;
      }
    }
  }
  return null;
}

// ------------------------------------------------------------
// §9.5 クエリ文字列スキーマパース
// ------------------------------------------------------------

export function parseQuery<S extends QuerySchema>(
  query: Record<string, string>,
  schema: S,
): QueryResult<S> {
  const result: Record<string, string | number | boolean | undefined> = {};

  for (const [key, rule] of Object.entries(schema)) {
    const raw = query[key];

    if (raw === undefined) {
      if (rule.required) {
        throw new HTTPError(400, `クエリパラメータ "${key}" は必須です`);
      }
      if ("default" in rule && rule.default !== undefined) {
        result[key] = rule.default;
      } else {
        result[key] = undefined;
      }
      continue;
    }

    switch (rule.type) {
      case "string":
        result[key] = raw;
        break;
      case "number": {
        const n = Number(raw);
        if (Number.isNaN(n)) {
          throw new HTTPError(400, `クエリパラメータ "${key}" は数値である必要があります`);
        }
        if (rule.integer && !Number.isInteger(n)) {
          throw new HTTPError(400, `クエリパラメータ "${key}" は整数である必要があります`);
        }
        if (rule.min !== undefined && n < rule.min) {
          throw new HTTPError(400, `クエリパラメータ "${key}" は ${rule.min} 以上である必要があります`);
        }
        if (rule.max !== undefined && n > rule.max) {
          throw new HTTPError(400, `クエリパラメータ "${key}" は ${rule.max} 以下である必要があります`);
        }
        result[key] = n;
        break;
      }
      case "boolean":
        result[key] = raw === "true" || raw === "1";
        break;
      case "enum":
        if (!(rule.values as readonly string[]).includes(raw)) {
          throw new HTTPError(
            400,
            `クエリパラメータ "${key}" は ${(rule.values as readonly string[]).join(", ")} のいずれかである必要があります`,
          );
        }
        result[key] = raw;
        break;
    }
  }

  return result as QueryResult<S>;
}

// ------------------------------------------------------------
// §9.6 パスパラメータ型変換
// ------------------------------------------------------------

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseParam(value: string, type: "number"): number;
export function parseParam(value: string, type: "int"): number;
export function parseParam(value: string, type: "uuid"): string;
export function parseParam(
  value: string,
  type: "number" | "int" | "uuid",
): number | string {
  switch (type) {
    case "number": {
      const n = Number(value);
      if (Number.isNaN(n)) {
        throw new HTTPError(400, `パスパラメータが数値ではありません: "${value}"`);
      }
      return n;
    }
    case "int": {
      const n = Number(value);
      if (Number.isNaN(n) || !Number.isInteger(n)) {
        throw new HTTPError(400, `パスパラメータが整数ではありません: "${value}"`);
      }
      return n;
    }
    case "uuid": {
      if (!UUID_PATTERN.test(value)) {
        throw new HTTPError(400, `パスパラメータが UUID 形式ではありません: "${value}"`);
      }
      return value;
    }
  }
}
