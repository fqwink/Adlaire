// ============================================================
// Adlaire Framework — helpers.ts
// リクエスト・レスポンスユーティリティ
// parseQuery / parseParam / getCookie / setCookie / deleteCookie / accepts / sanitizeHtml
// ============================================================

import type { QueryResult, QuerySchema } from "./types.ts";
import { HTTPError } from "./types.ts";

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
  headers.append("Set-Cookie", `${name}=; Max-Age=0; Path=/; SameSite=Lax`);
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

export interface ParseQueryOptions {
  /** true の場合、"true"/"false" を boolean に、数字文字列を number に自動変換（デフォルト: false） */
  coerce?: boolean;
}

export function parseQuery<S extends QuerySchema>(
  query: Record<string, string>,
  schema: S,
  options?: ParseQueryOptions,
): QueryResult<S> {
  const result: Record<string, string | number | boolean | undefined> = {};
  const coerce = options?.coerce ?? false;

  for (const [key, rule] of Object.entries(schema)) {
    const rawValue = query[key];

    if (rawValue === undefined) {
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
      case "string": {
        result[key] = rawValue;
        break;
      }
      case "number": {
        const n = Number(rawValue);
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
      case "boolean": {
        result[key] = rawValue === "true" || rawValue === "1";
        break;
      }
      case "enum": {
        if (coerce) {
          // coerce: true の場合は大文字小文字を無視してマッチング
          const lower = rawValue.toLowerCase();
          const matched = (rule.values as readonly string[]).find(
            (v) => v.toLowerCase() === lower,
          );
          if (matched === undefined) {
            throw new HTTPError(
              400,
              `クエリパラメータ "${key}" は ${(rule.values as readonly string[]).join(", ")} のいずれかである必要があります`,
            );
          }
          result[key] = matched;
        } else {
          if (!(rule.values as readonly string[]).includes(rawValue)) {
            throw new HTTPError(
              400,
              `クエリパラメータ "${key}" は ${(rule.values as readonly string[]).join(", ")} のいずれかである必要があります`,
            );
          }
          result[key] = rawValue;
        }
        break;
      }
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
      if (!Number.isFinite(n)) {
        throw new HTTPError(400, `パスパラメータが有限の数値ではありません: "${value}"`);
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

// ------------------------------------------------------------
// §9.7 HTML サニタイズ
// ------------------------------------------------------------

export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
