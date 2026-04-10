/**
 * Adlaire Framework — 組み込みミドルウェア
 * FRAMEWORK_RULEBOOK §8.5 準拠
 */

import type { MiddlewareFunction, MiddlewareState } from "./types.ts";

// ─── CORS ────────────────────────────────────────────────────────────────────

/** cors() オプション（§8.5） */
export interface CorsOptions {
  /** 許可オリジン。"*" で全許可、文字列配列で特定オリジンのみ許可（デフォルト: "*"） */
  origins?: string | string[];
  /** 許可 HTTP メソッド（デフォルト: 主要メソッド一覧） */
  methods?: string[];
  /** 許可リクエストヘッダー（デフォルト: ["Content-Type", "Authorization"]） */
  allowedHeaders?: string[];
  /** 認証情報（Cookie / Authorization ヘッダー等）の送信を許可するか（デフォルト: false） */
  credentials?: boolean;
  /** Preflight レスポンスのキャッシュ秒数 */
  maxAge?: number;
}

const DEFAULT_METHODS = ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"];
const DEFAULT_HEADERS = ["Content-Type", "Authorization"];

/**
 * CORS ヘッダーを設定するミドルウェア（§8.5）。
 * Preflight（OPTIONS）リクエストは 204 で即時応答する。
 */
export function cors(options: CorsOptions = {}): MiddlewareFunction<MiddlewareState> {
  const {
    origins = "*",
    methods = DEFAULT_METHODS,
    allowedHeaders = DEFAULT_HEADERS,
    credentials = false,
    maxAge,
  } = options;

  const allowMethods = methods.join(", ");
  const allowHeaders = allowedHeaders.join(", ");

  function getAllowOrigin(requestOrigin: string | null): string | null {
    if (origins === "*") return "*";
    if (!requestOrigin) return null;
    const list = Array.isArray(origins) ? origins : [origins];
    return list.includes(requestOrigin) ? requestOrigin : null;
  }

  return async (ctx, next) => {
    const requestOrigin = ctx.req.headers.get("Origin");
    const allowOrigin = getAllowOrigin(requestOrigin);

    // Preflight リクエスト
    if (ctx.req.method === "OPTIONS") {
      const headers = new Headers();
      if (allowOrigin) {
        headers.set("Access-Control-Allow-Origin", allowOrigin);
        if (allowOrigin !== "*") headers.set("Vary", "Origin");
      }
      headers.set("Access-Control-Allow-Methods", allowMethods);
      headers.set("Access-Control-Allow-Headers", allowHeaders);
      if (credentials) headers.set("Access-Control-Allow-Credentials", "true");
      if (maxAge !== undefined) headers.set("Access-Control-Max-Age", String(maxAge));
      return new Response(null, { status: 204, headers });
    }

    const res = await next();
    if (!allowOrigin) return res;

    const newHeaders = new Headers(res.headers);
    newHeaders.set("Access-Control-Allow-Origin", allowOrigin);
    if (allowOrigin !== "*") newHeaders.set("Vary", "Origin");
    if (credentials) newHeaders.set("Access-Control-Allow-Credentials", "true");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  };
}

// ─── LOGGER ──────────────────────────────────────────────────────────────────

/**
 * リクエストログを出力するミドルウェア（§8.5）。
 * `${METHOD} ${PATH} ${STATUS} — ${ms}ms` 形式でコンソールに出力する。
 */
export function logger(): MiddlewareFunction<MiddlewareState> {
  return async (ctx, next) => {
    const start = performance.now();
    const res = await next();
    const ms = (performance.now() - start).toFixed(1);
    console.log(`${ctx.req.method} ${ctx.url.pathname} ${res.status} — ${ms}ms`);
    return res;
  };
}

// ─── RATE LIMIT ──────────────────────────────────────────────────────────────

/** rateLimit() オプション（§8.5） */
export interface RateLimitOptions {
  /** ウィンドウ内の最大リクエスト数（デフォルト: 100） */
  max?: number;
  /** レートリミットウィンドウ（秒、デフォルト: 60） */
  window?: number;
}

/**
 * IP ベースのレートリミットミドルウェア（§8.5）。
 * `X-Forwarded-For` / `CF-Connecting-IP` ヘッダーから IP を取得する。
 * 制限超過時は 429 Too Many Requests を返す。
 */
export function rateLimit(
  options: RateLimitOptions = {},
): MiddlewareFunction<MiddlewareState> {
  const { max = 100, window: windowSec = 60 } = options;
  const store = new Map<string, { count: number; reset: number }>();

  return async (ctx, next) => {
    const ip =
      ctx.req.headers.get("X-Forwarded-For")?.split(",")[0].trim() ??
      ctx.req.headers.get("CF-Connecting-IP") ??
      "unknown";

    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowSec * 1000 };
      store.set(ip, entry);
    }
    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.reset - now) / 1000);
      return new Response(
        JSON.stringify({ error: "Too Many Requests" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Retry-After": String(retryAfter),
          },
        },
      );
    }

    return next();
  };
}

// ─── COMPRESS ────────────────────────────────────────────────────────────────

/** 圧縮対象の Content-Type プレフィックス／キーワード */
const COMPRESSIBLE = ["text/", "application/json", "application/javascript"];

/**
 * gzip / deflate 圧縮ミドルウェア（§8.5）。
 * テキスト系コンテンツのみ圧縮対象。Accept-Encoding に応じてエンコーディングを選択する。
 */
export function compress(): MiddlewareFunction<MiddlewareState> {
  return async (ctx, next) => {
    const res = await next();

    if (!res.body) return res;

    const contentType = res.headers.get("Content-Type") ?? "";
    const isCompressible = COMPRESSIBLE.some((p) => contentType.includes(p));
    if (!isCompressible) return res;

    const accept = ctx.req.headers.get("Accept-Encoding") ?? "";
    let encoding: "gzip" | "deflate" | null = null;
    if (accept.includes("gzip")) encoding = "gzip";
    else if (accept.includes("deflate")) encoding = "deflate";
    if (!encoding) return res;

    const compressed = res.body.pipeThrough(new CompressionStream(encoding));
    const headers = new Headers(res.headers);
    headers.set("Content-Encoding", encoding);
    headers.delete("Content-Length");

    return new Response(compressed, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  };
}
