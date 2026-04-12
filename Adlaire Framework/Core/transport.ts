// ============================================================
// Adlaire Framework — transport.ts
// トランスポート層ミドルウェア
// logger / rateLimit / etag / compress / bodyLimit / requestId / timeout
// ============================================================

import type { Context, Middleware } from "./types.ts";

// ------------------------------------------------------------
// §8.3 ロガーミドルウェア
// ------------------------------------------------------------

export interface LogInfo {
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

export interface LoggerOptions {
  level?: "silent" | "info" | "debug";
  format?: (info: LogInfo) => string;
  onLog?: (info: LogInfo) => void;
}

export function logger(options?: LoggerOptions): Middleware {
  const level = options?.level ?? "info";
  const fmt = options?.format;
  const onLog = options?.onLog;

  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    if (level === "silent") return await next();

    const start = performance.now();
    const method = ctx.req.method;
    let path = ctx.req.url;
    try {
      path = new URL(ctx.req.url).pathname;
    } catch {
      // URL パースに失敗した場合は生の URL をそのまま使用する
    }

    if (level === "debug" && fmt === undefined && onLog === undefined) {
      const headers: Record<string, string> = {};
      ctx.req.headers.forEach((v, k) => { headers[k] = v; });
      console.log(`→ ${method} ${path}`, headers);
    }

    const response = await next();
    const durationMs = Math.round(performance.now() - start);
    const info: LogInfo = { method, path, status: response.status, durationMs };

    if (onLog !== undefined) {
      onLog(info);
    } else if (fmt !== undefined) {
      console.log(fmt(info));
    } else {
      console.log(`${method} ${path} ${response.status} ${durationMs}ms`);
    }

    return response;
  };
}

// ------------------------------------------------------------
// §8.4 レートリミッター
// ------------------------------------------------------------

export interface RateLimitStore {
  increment(key: string, windowMs: number): { count: number; resetAt: number } | Promise<{ count: number; resetAt: number }>;
  reset(key: string): void | Promise<void>;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  key?: (ctx: Context) => string;
  message?: string;
  store?: RateLimitStore;
  skip?: (ctx: Context) => boolean | Promise<boolean>;
}

function createInMemoryStore(): RateLimitStore {
  const map = new Map<string, { count: number; resetAt: number }>();

  return {
    increment(key: string, windowMs: number) {
      const now = Date.now();
      let entry = map.get(key);

      if (!entry || now >= entry.resetAt) {
        for (const [k, v] of map) {
          if (now >= v.resetAt) map.delete(k);
        }
        entry = { count: 0, resetAt: now + windowMs };
        map.set(key, entry);
      }

      entry.count++;
      return { count: entry.count, resetAt: entry.resetAt };
    },
    reset(key: string) {
      map.delete(key);
    },
  };
}

export function rateLimit(options: RateLimitOptions): Middleware {
  const store = options.store ?? createInMemoryStore();
  const keyFn = options.key ?? ((ctx: Context) =>
    ctx.req.headers.get("x-forwarded-for") ?? "unknown"
  );

  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    // skip 関数が true を返した場合はレート制限をバイパスする
    if (options.skip !== undefined && await options.skip(ctx)) {
      return await next();
    }

    const clientKey = keyFn(ctx);
    const { count, resetAt } = await store.increment(clientKey, options.windowMs);

    if (count > options.max) {
      const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
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

    // エラーレスポンス（4xx/5xx）には ETag を付与しない
    if (response.status >= 400) return response;

    const bodyBytes = new Uint8Array(await response.arrayBuffer());
    if (bodyBytes.length === 0) {
      return new Response(bodyBytes, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    const hashBuffer = await crypto.subtle.digest("SHA-256", bodyBytes);
    const hashArray = new Uint8Array(hashBuffer);
    let hashHex = "";
    for (const b of hashArray) hashHex += b.toString(16).padStart(2, "0");
    const etagValue = `W/"${hashHex.slice(0, 16)}"`;

    const ifNoneMatch = ctx.req.headers.get("If-None-Match");
    if (ifNoneMatch === etagValue) {
      // RFC 7232: 304 は Cache-Control / Content-Location / Date / ETag / Expires / Vary を含めること
      const headers304 = new Headers();
      headers304.set("ETag", etagValue);
      for (const name of ["Cache-Control", "Content-Location", "Date", "Expires", "Vary"]) {
        const val = response.headers.get(name);
        if (val !== null) headers304.set(name, val);
      }
      return new Response(null, { status: 304, headers: headers304 });
    }

    const headers = new Headers(response.headers);
    headers.set("ETag", etagValue);

    return new Response(bodyBytes, {
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
  // threshold: 0 は「常に圧縮する」を意味する
  const threshold = options?.threshold ?? 1024;

  // 圧縮不要な MIME タイプ（画像・動画・音声・圧縮済みフォーマット）
  const SKIP_COMPRESS_RE =
    /^(image\/(?!svg\+xml)|video\/|audio\/|application\/(zip|gzip|x-gzip|x-compress|x-bzip2|x-7z-compressed|zstd|pdf|wasm))/i;

  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const response = await next();
    if (response.body === null) return response;

    // すでに Content-Encoding が付いている場合はスキップ
    if (response.headers.has("Content-Encoding")) return response;

    // 圧縮済みコンテンツタイプはスキップ
    const contentType = response.headers.get("Content-Type") ?? "";
    if (SKIP_COMPRESS_RE.test(contentType)) return response;

    const acceptEncoding = ctx.req.headers.get("Accept-Encoding") ?? "";

    // Accept-Encoding をトークン単位でパースして正確に照合する
    const encodingTokens = acceptEncoding.split(",").map((s) => s.trim().split(";")[0].trim().toLowerCase());

    let encoding: string | null = null;
    let format: CompressionFormat | null = null;

    if (encodingTokens.includes("gzip")) {
      encoding = "gzip";
      format = "gzip";
    } else if (encodingTokens.includes("deflate")) {
      encoding = "deflate";
      format = "deflate";
    }

    if (format === null) return response;

    // Content-Length チェック（ヘッダーがある場合）
    const contentLength = response.headers.get("Content-Length");
    if (contentLength !== null) {
      const len = parseInt(contentLength, 10);
      if (!Number.isNaN(len) && len < threshold) return response;
    }

    const compressedStream = response.body.pipeThrough(new CompressionStream(format));
    const headers = new Headers(response.headers);
    headers.set("Content-Encoding", encoding);
    headers.set("Vary", "Accept-Encoding");
    headers.delete("Content-Length");

    return new Response(compressedStream, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

// ------------------------------------------------------------
// §8.7 ボディサイズ制限ミドルウェア
// ------------------------------------------------------------

export interface BodyLimitOptions {
  maxBytes: number;
  message?: string;
}

export function bodyLimit(options: BodyLimitOptions): Middleware {
  const message = options.message ?? "Payload Too Large";

  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const contentLength = ctx.req.headers.get("Content-Length");
    if (contentLength !== null) {
      const len = parseInt(contentLength, 10);
      if (!Number.isNaN(len) && len > options.maxBytes) {
        return new Response(
          JSON.stringify({ error: message }),
          {
            status: 413,
            headers: { "Content-Type": "application/json; charset=UTF-8" },
          },
        );
      }
    }
    return await next();
  };
}

// ------------------------------------------------------------
// §8.8 リクエスト ID ミドルウェア
// ------------------------------------------------------------

export interface RequestIdOptions {
  header?: string;
  generator?: () => string;
}

export function requestId(
  options?: RequestIdOptions,
): Middleware<{ requestId: string }> {
  const headerName = options?.header ?? "X-Request-ID";
  const generate = options?.generator ?? (() => crypto.randomUUID());

  return async (
    ctx: Context<Record<string, string>, unknown, Record<string, string>, { requestId: string }>,
    next: () => Promise<Response>,
  ): Promise<Response> => {
    const rawId = ctx.req.headers.get(headerName);
    // 制御文字・改行を除去してヘッダーインジェクションを防ぐ
    const sanitized = rawId !== null ? rawId.replace(/[\x00-\x1f\x7f]/g, "") : "";
    const id = sanitized.length > 0 ? sanitized : generate();
    ctx.state.requestId = id;

    const response = await next();
    const headers = new Headers(response.headers);
    headers.set(headerName, id);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

// ------------------------------------------------------------
// §8.9 タイムアウトミドルウェア
// ------------------------------------------------------------

export interface TimeoutOptions {
  ms: number;
  message?: string;
  status?: 408 | 503 | 504;
}

export function timeout(options: TimeoutOptions): Middleware {
  const message = options.message ?? "Request Timeout";
  const status = options.status ?? 503;

  return async (_ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    let timerId: number | undefined;
    const timeoutPromise = new Promise<Response>((resolve) => {
      timerId = setTimeout(() => {
        resolve(
          new Response(
            JSON.stringify({ error: message }),
            {
              status,
              headers: { "Content-Type": "application/json; charset=UTF-8" },
            },
          ),
        );
      }, options.ms);
    });

    try {
      const result = await Promise.race([next(), timeoutPromise]);
      return result;
    } finally {
      // next() が reject した場合でも必ずタイマーをクリアする
      clearTimeout(timerId);
    }
  };
}
