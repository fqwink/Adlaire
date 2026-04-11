// ============================================================
// Adlaire Framework — middleware.ts
// バリデーター・CORS ミドルウェア
// ============================================================

import type {
  Context,
  Method,
  Middleware,
  Rule,
  Schema,
  ValidationError,
} from "./types.ts";

// ------------------------------------------------------------
// §8.1 バリデーター
// ------------------------------------------------------------

function validateValue(
  field: string,
  value: unknown,
  rule: Rule,
  errors: ValidationError[],
): void {
  const absent = value === undefined || value === null;

  if (absent) {
    if (value === null && rule.nullable) return;
    if (rule.required) {
      errors.push({ field, message: rule.message ?? `${field} は必須です` });
    }
    return;
  }

  switch (rule.type) {
    case "string": {
      if (typeof value !== "string") {
        errors.push({ field, message: rule.message ?? `${field} は文字列である必要があります` });
        return;
      }
      if (rule.min !== undefined && value.length < rule.min) {
        errors.push({ field, message: rule.message ?? `${field} は ${rule.min} 文字以上である必要があります` });
      }
      if (rule.max !== undefined && value.length > rule.max) {
        errors.push({ field, message: rule.message ?? `${field} は ${rule.max} 文字以下である必要があります` });
      }
      if (rule.pattern !== undefined) {
        rule.pattern.lastIndex = 0; // g フラグ付き RegExp 対策
      }
      if (rule.pattern !== undefined && !rule.pattern.test(value)) {
        errors.push({ field, message: rule.message ?? `${field} の形式が正しくありません` });
      }
      if (rule.enum !== undefined && !rule.enum.includes(value)) {
        errors.push({ field, message: rule.message ?? `${field} は ${rule.enum.join(", ")} のいずれかである必要があります` });
      }
      break;
    }
    case "number": {
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors.push({ field, message: rule.message ?? `${field} は数値である必要があります` });
        return;
      }
      if (rule.integer && !Number.isInteger(value)) {
        errors.push({ field, message: rule.message ?? `${field} は整数である必要があります` });
      }
      if (rule.min !== undefined && value < rule.min) {
        errors.push({ field, message: rule.message ?? `${field} は ${rule.min} 以上である必要があります` });
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push({ field, message: rule.message ?? `${field} は ${rule.max} 以下である必要があります` });
      }
      break;
    }
    case "boolean": {
      if (typeof value !== "boolean") {
        errors.push({ field, message: rule.message ?? `${field} は真偽値である必要があります` });
      }
      break;
    }
    case "email": {
      if (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push({ field, message: rule.message ?? `${field} は有効なメールアドレスである必要があります` });
      }
      break;
    }
    case "url": {
      if (typeof value !== "string") {
        errors.push({ field, message: rule.message ?? `${field} は文字列である必要があります` });
        return;
      }
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        errors.push({ field, message: rule.message ?? `${field} は有効な URL である必要があります` });
        return;
      }
      const allowed = rule.allowedProtocols ?? ["http:", "https:"];
      // URL.protocol には末尾コロンが付く（例: "https:"）
      const normalizedAllowed = allowed.map((p) => p.endsWith(":") ? p : `${p}:`);
      if (!normalizedAllowed.includes(parsed.protocol)) {
        const displayProtocols = normalizedAllowed.map((p) => p.replace(/:$/, ""));
        errors.push({ field, message: rule.message ?? `${field} のプロトコルは ${displayProtocols.join(", ")} である必要があります` });
      }
      break;
    }
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        errors.push({ field, message: rule.message ?? `${field} はオブジェクトである必要があります` });
        return;
      }
      if (rule.fields) {
        // typeof + null + !Array チェック済みのため Record として安全に扱える
        const obj: Record<string, unknown> = value;
        for (const [key, subRule] of Object.entries(rule.fields)) {
          validateValue(`${field}.${key}`, obj[key], subRule, errors);
        }
      }
      break;
    }
    case "array": {
      if (!Array.isArray(value)) {
        errors.push({ field, message: rule.message ?? `${field} は配列である必要があります` });
        return;
      }
      if (rule.min !== undefined && value.length < rule.min) {
        errors.push({ field, message: rule.message ?? `${field} は ${rule.min} 件以上である必要があります` });
      }
      if (rule.max !== undefined && value.length > rule.max) {
        errors.push({ field, message: rule.message ?? `${field} は ${rule.max} 件以下である必要があります` });
      }
      if (rule.items) {
        for (let i = 0; i < value.length; i++) {
          validateValue(`${field}[${i}]`, value[i], rule.items, errors);
        }
      }
      break;
    }
    case "custom": {
      const result = rule.validate(value);
      if (result !== true) {
        errors.push({ field, message: rule.message ?? result });
      }
      break;
    }
  }
}

export function validate(body: unknown, schema: Schema): ValidationError[] {
  const errors: ValidationError[] = [];
  let obj: Record<string, unknown> = {};
  if (typeof body === "object" && body !== null && !Array.isArray(body)) {
    obj = body;
  }
  for (const [field, rule] of Object.entries(schema)) {
    validateValue(field, obj[field], rule, errors);
  }
  return errors;
}

// ------------------------------------------------------------
// §8.2 CORS ミドルウェア
// ------------------------------------------------------------

export interface CorsOptions {
  origin?: string | string[] | RegExp | ((origin: string) => boolean);
  methods?: Method[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

function resolveOrigin(
  requestOrigin: string,
  option: CorsOptions["origin"],
): string | null {
  if (option === undefined || option === "*") return "*";
  if (typeof option === "string") {
    return option === requestOrigin ? option : null;
  }
  if (Array.isArray(option)) {
    return option.includes(requestOrigin) ? requestOrigin : null;
  }
  if (option instanceof RegExp) {
    return option.test(requestOrigin) ? requestOrigin : null;
  }
  // function
  return option(requestOrigin) ? requestOrigin : null;
}

function isRequestDependent(option: CorsOptions["origin"]): boolean {
  return Array.isArray(option) || option instanceof RegExp || typeof option === "function";
}

export function cors(options?: CorsOptions): Middleware {
  const opts = options ?? {};

  // credentials: true + origin: "*"（省略含む）は CORS 仕様違反
  if (
    opts.credentials === true &&
    (opts.origin === undefined || opts.origin === "*")
  ) {
    throw new TypeError(
      'cors(): credentials: true と origin: "*" の組み合わせは禁止です',
    );
  }

  const methods = opts.methods ?? ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"];
  const allowedHeaders = opts.allowedHeaders ?? ["Content-Type", "Authorization"];
  const maxAge = opts.maxAge ?? 5;
  const requestDependent = isRequestDependent(opts.origin);

  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const requestOrigin = ctx.req.headers.get("Origin");

    // Origin ヘッダーなし（非ブラウザ・サーバー間通信）はスルー
    if (requestOrigin === null) {
      return await next();
    }

    const resolvedOrigin = resolveOrigin(requestOrigin, opts.origin);

    // OPTIONS プリフライト
    if (ctx.req.method === "OPTIONS") {
      const headers = new Headers();
      if (resolvedOrigin !== null) {
        headers.set("Access-Control-Allow-Origin", resolvedOrigin);
        headers.set("Access-Control-Allow-Methods", methods.join(", "));
        headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
        headers.set("Access-Control-Max-Age", String(maxAge));
        if (opts.credentials) {
          headers.set("Access-Control-Allow-Credentials", "true");
        }
        if (requestDependent) {
          headers.set("Vary", "Origin");
        }
      }
      return new Response(null, { status: 204, headers });
    }

    // 通常リクエスト
    const response = await next();
    if (resolvedOrigin === null) return response;

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", resolvedOrigin);
    headers.set(
      "Access-Control-Allow-Methods",
      methods.join(", "),
    );
    headers.set(
      "Access-Control-Allow-Headers",
      allowedHeaders.join(", "),
    );
    if (opts.exposedHeaders && opts.exposedHeaders.length > 0) {
      headers.set("Access-Control-Expose-Headers", opts.exposedHeaders.join(", "));
    }
    if (opts.credentials) {
      headers.set("Access-Control-Allow-Credentials", "true");
    }
    if (requestDependent) {
      headers.set("Vary", "Origin");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

// ------------------------------------------------------------
// §8.3 ロガーミドルウェア
// ------------------------------------------------------------

export interface LoggerOptions {
  level?: "silent" | "info" | "debug";
}

export function logger(options?: LoggerOptions): Middleware {
  const level = options?.level ?? "info";

  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    if (level === "silent") return await next();

    const start = performance.now();
    const method = ctx.req.method;
    const url = new URL(ctx.req.url);
    const path = url.pathname;

    if (level === "debug") {
      const headers: Record<string, string> = {};
      ctx.req.headers.forEach((v, k) => { headers[k] = v; });
      console.log(`→ ${method} ${path}`, headers);
    }

    const response = await next();
    const duration = Math.round(performance.now() - start);
    console.log(`${method} ${path} ${response.status} ${duration}ms`);

    return response;
  };
}

// ------------------------------------------------------------
// §8.4 レートリミッター
// ------------------------------------------------------------

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  key?: (ctx: Context) => string;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function rateLimit(options: RateLimitOptions): Middleware {
  const store = new Map<string, RateLimitEntry>();
  const keyFn = options.key ?? ((ctx: Context) =>
    ctx.req.headers.get("x-forwarded-for") ?? "unknown"
  );

  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const clientKey = keyFn(ctx);
    const now = Date.now();
    let entry = store.get(clientKey);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + options.windowMs };
      store.set(clientKey, entry);
    }

    entry.count++;

    if (entry.count > options.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return new Response(
        JSON.stringify({ error: options.message ?? "Too Many Requests" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Retry-After": String(retryAfter),
          },
        },
      );
    }

    return await next();
  };
}

// ------------------------------------------------------------
// §8.5 ETag ミドルウェア
// ------------------------------------------------------------

export function etag(): Middleware {
  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const response = await next();
    const body = response.clone().body;
    if (body === null) return response;

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) chunks.push(result.value);
    }

    if (chunks.length === 0) return response;

    // 全チャンクを結合してハッシュ算出
    let totalLength = 0;
    for (const chunk of chunks) totalLength += chunk.length;
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
    const hashArray = new Uint8Array(hashBuffer);
    let hashHex = "";
    for (const b of hashArray) hashHex += b.toString(16).padStart(2, "0");
    const etagValue = `W/"${hashHex.slice(0, 16)}"`;

    // If-None-Match チェック
    const ifNoneMatch = ctx.req.headers.get("If-None-Match");
    if (ifNoneMatch === etagValue) {
      return new Response(null, { status: 304, headers: { "ETag": etagValue } });
    }

    const headers = new Headers(response.headers);
    headers.set("ETag", etagValue);

    return new Response(combined, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

// ------------------------------------------------------------
// §8.6 応答圧縮ミドルウェア
// ------------------------------------------------------------

export interface CompressOptions {
  threshold?: number;
}

export function compress(options?: CompressOptions): Middleware {
  const threshold = options?.threshold ?? 1024;

  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const response = await next();
    const body = response.clone().body;
    if (body === null) return response;

    const acceptEncoding = ctx.req.headers.get("Accept-Encoding") ?? "";

    let encoding: string | null = null;
    let format: CompressionFormat | null = null;

    if (acceptEncoding.includes("gzip")) {
      encoding = "gzip";
      format = "gzip";
    } else if (acceptEncoding.includes("deflate")) {
      encoding = "deflate";
      format = "deflate";
    }

    if (format === null) return response;

    // Content-Length チェック（ヘッダーがある場合）
    const contentLength = response.headers.get("Content-Length");
    if (contentLength !== null && parseInt(contentLength, 10) < threshold) {
      return response;
    }

    const compressedStream = body.pipeThrough(new CompressionStream(format));
    const headers = new Headers(response.headers);
    headers.set("Content-Encoding", encoding);
    headers.append("Vary", "Accept-Encoding");
    headers.delete("Content-Length");

    return new Response(compressedStream, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
