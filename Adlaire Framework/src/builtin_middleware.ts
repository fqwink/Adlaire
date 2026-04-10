/**
 * Adlaire Framework — 組み込みミドルウェア
 * FRAMEWORK_RULEBOOK §8.5〜§8.10 準拠
 */

import type {
  Context,
  MiddlewareFunction,
  MiddlewareState,
  RouteParams,
} from "./types.ts";

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
    // §8.5: credentials: true のときは "*" を使えない（RFC 違反）
    // リクエストオリジンをそのまま返す
    if (origins === "*") {
      if (credentials && requestOrigin) return requestOrigin;
      return "*";
    }
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

/** logger() オプション（§8.5） */
export interface LoggerOptions {
  /** 出力フォーマット（デフォルト: "text"） */
  format?: "text" | "json";
}

/**
 * リクエストログを出力するミドルウェア（§8.5）。
 * format: "text"（デフォルト）: `${METHOD} ${PATH} ${STATUS} — ${ms}ms` 形式。
 * format: "json": JSON Lines 形式（{ method, path, status, ms, timestamp }）。
 */
export function logger(options: LoggerOptions = {}): MiddlewareFunction<MiddlewareState> {
  const { format = "text" } = options;

  return async (ctx, next) => {
    const start = performance.now();
    const res = await next();
    const ms = parseFloat((performance.now() - start).toFixed(1));

    if (format === "json") {
      console.log(JSON.stringify({
        method: ctx.req.method,
        path: ctx.url.pathname,
        status: res.status,
        ms,
        timestamp: new Date().toISOString(),
      }));
    } else {
      console.log(`${ctx.req.method} ${ctx.url.pathname} ${res.status} — ${ms}ms`);
    }

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

      // 期限切れエントリの定期パージ（メモリリーク防止）
      if (store.size > max * 2) {
        for (const [key, val] of store) {
          if (val.reset <= now) store.delete(key);
        }
      }
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

    // 既に圧縮済みのレスポンスはスキップ
    if (res.headers.get("Content-Encoding")) return res;

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

// ─── JWT AUTH ─────────────────────────────────────────────────────────────────

/** jwtAuth() オプション（§8.6） */
export interface JwtAuthOptions {
  /** HS256 署名シークレット */
  secret: string;
  /** 許可アルゴリズム（デフォルト: ["HS256"]） */
  algorithms?: Array<"HS256" | "RS256">;
  /** ctx.state への注入キー（デフォルト: "jwtPayload"） */
  stateKey?: string;
  /** トークン取得関数（デフォルト: Authorization: Bearer ヘッダー） */
  getToken?: (ctx: Context<RouteParams, MiddlewareState>) => string | undefined;
}

/** base64url → Uint8Array */
function base64urlDecode(input: string): Uint8Array {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * JWT を HS256 で検証し、ペイロードを返す。
 * 検証失敗（形式不正・署名不一致・期限切れ）時は null を返す。
 */
async function verifyJwt(
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  // アルゴリズム確認
  try {
    const headerJson = new TextDecoder().decode(base64urlDecode(headerB64));
    const header = JSON.parse(headerJson) as Record<string, unknown>;
    if (header["alg"] !== "HS256") return null;
  } catch {
    return null;
  }

  // 署名検証
  const encoder = new TextEncoder();
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
  } catch {
    return null;
  }
  const sigInput = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = base64urlDecode(signatureB64);
  const valid = await crypto.subtle.verify("HMAC", key, signature, sigInput);
  if (!valid) return null;

  // ペイロード解析
  try {
    const payloadJson = new TextDecoder().decode(base64urlDecode(payloadB64));
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    // exp クレーム検証
    if (typeof payload["exp"] === "number" && Date.now() / 1000 > payload["exp"]) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

const JSON_CONTENT_TYPE = { "Content-Type": "application/json; charset=utf-8" };

/**
 * JWT Bearer 認証ミドルウェア（§8.6）。
 * Authorization: Bearer <token> ヘッダーを検証し、ペイロードを ctx.state[stateKey] に注入する。
 * 検証失敗時は 401 Unauthorized を返す。
 */
export function jwtAuth(options: JwtAuthOptions): MiddlewareFunction<MiddlewareState> {
  const { secret, algorithms = ["HS256"], stateKey = "jwtPayload", getToken } = options;

  // algorithms に HS256 が含まれていなければ設定ミス
  if (!algorithms.includes("HS256")) {
    throw new Error("jwtAuth: currently only HS256 is supported");
  }

  return async (ctx, next) => {
    // トークン取得
    let token: string | undefined;
    if (getToken) {
      token = getToken(ctx);
    } else {
      const auth = ctx.req.headers.get("Authorization");
      if (auth?.startsWith("Bearer ")) token = auth.slice(7);
    }

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: JSON_CONTENT_TYPE },
      );
    }

    const payload = await verifyJwt(token, secret);
    if (!payload) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: JSON_CONTENT_TYPE },
      );
    }

    ctx.state[stateKey] = payload;
    return next();
  };
}

// ─── CSRF ─────────────────────────────────────────────────────────────────────

/** csrf() オプション（§8.7） */
export interface CsrfOptions {
  /** CSRF Cookie 名（デフォルト: "_csrf"） */
  cookieName?: string;
  /** CSRF ヘッダー名（デフォルト: "X-CSRF-Token"） */
  headerName?: string;
  /** 検証をスキップする HTTP メソッド（デフォルト: ["GET", "HEAD", "OPTIONS"]） */
  ignoreMethods?: string[];
}

/** 暗号学的に安全な hex トークンを生成する */
function generateCsrfToken(): string {
  return Array.from(
    crypto.getRandomValues(new Uint8Array(32)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * CSRF 保護ミドルウェア（§8.7）。
 * Double-submit Cookie パターンにより CSRF 攻撃を防ぐ。
 * すべてのリクエストで Cookie が未設定の場合はトークンを生成して設定する。
 * ignoreMethods 以外のメソッドでは X-CSRF-Token ヘッダーと Cookie を照合する。
 */
export function csrf(options: CsrfOptions = {}): MiddlewareFunction<MiddlewareState> {
  const {
    cookieName = "_csrf",
    headerName = "X-CSRF-Token",
    ignoreMethods = ["GET", "HEAD", "OPTIONS"],
  } = options;

  return async (ctx, next) => {
    // Cookie が未設定の場合は新規生成して設定
    let cookieToken = ctx.cookies.get(cookieName);
    if (!cookieToken) {
      cookieToken = generateCsrfToken();
      ctx.cookies.set(cookieName, cookieToken, { sameSite: "Strict", path: "/" });
    }

    // 安全メソッドは検証をスキップ
    if (ignoreMethods.includes(ctx.req.method)) {
      return next();
    }

    // ヘッダーと Cookie を照合
    const headerToken = ctx.req.headers.get(headerName);
    if (!headerToken || headerToken !== cookieToken) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: JSON_CONTENT_TYPE },
      );
    }

    return next();
  };
}

// ─── SECURITY HEADERS ────────────────────────────────────────────────────────

/** securityHeaders() オプション（§8.8） */
export interface SecurityHeadersOptions {
  /** X-Content-Type-Options: nosniff を付与するか（デフォルト: true） */
  xContentTypeOptions?: boolean;
  /** X-Frame-Options の値。false で付与しない（デフォルト: "SAMEORIGIN"） */
  xFrameOptions?: "DENY" | "SAMEORIGIN" | false;
  /** Referrer-Policy の値（デフォルト: "strict-origin-when-cross-origin"） */
  referrerPolicy?: string;
  /** Permissions-Policy の値（空文字でヘッダーなし、デフォルト: ""） */
  permissionsPolicy?: string;
}

/**
 * セキュリティヘッダーを一括付与するミドルウェア（§8.8）。
 * デフォルトで X-Content-Type-Options / X-Frame-Options / Referrer-Policy を設定する。
 */
export function securityHeaders(
  options: SecurityHeadersOptions = {},
): MiddlewareFunction<MiddlewareState> {
  const {
    xContentTypeOptions = true,
    xFrameOptions = "SAMEORIGIN",
    referrerPolicy = "strict-origin-when-cross-origin",
    permissionsPolicy = "",
  } = options;

  return async (_ctx, next) => {
    const res = await next();
    const headers = new Headers(res.headers);

    if (xContentTypeOptions) headers.set("X-Content-Type-Options", "nosniff");
    if (xFrameOptions !== false) headers.set("X-Frame-Options", xFrameOptions);
    if (referrerPolicy) headers.set("Referrer-Policy", referrerPolicy);
    if (permissionsPolicy) headers.set("Permissions-Policy", permissionsPolicy);

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  };
}

// ─── REQUEST ID ──────────────────────────────────────────────────────────────

/** requestId() オプション（§8.9） */
export interface RequestIdOptions {
  /** リクエスト ID ヘッダー名（デフォルト: "X-Request-ID"） */
  headerName?: string;
  /** ctx.state への注入キー（デフォルト: "requestId"） */
  stateKey?: string;
  /** ID 生成関数（デフォルト: crypto.randomUUID()） */
  generate?: () => string;
}

/**
 * リクエスト ID ミドルウェア（§8.9）。
 * リクエストヘッダーに X-Request-ID が存在すればその値を使用し、
 * なければ generate() で新規生成する。
 * ctx.state[stateKey] に注入し、レスポンスヘッダーにも付与する。
 */
export function requestId(
  options: RequestIdOptions = {},
): MiddlewareFunction<MiddlewareState> {
  const {
    headerName = "X-Request-ID",
    stateKey = "requestId",
    generate = () => crypto.randomUUID(),
  } = options;

  return async (ctx, next) => {
    const id = ctx.req.headers.get(headerName) ?? generate();
    ctx.state[stateKey] = id;

    const res = await next();
    const headers = new Headers(res.headers);
    headers.set(headerName, id);

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  };
}

// ─── CACHE ───────────────────────────────────────────────────────────────────

/** cache() オプション（§8.10） */
export interface CacheOptions {
  /** max-age=<n>（秒） */
  maxAge?: number;
  /** stale-while-revalidate=<n>（秒） */
  staleWhileRevalidate?: number;
  /** private ディレクティブ（デフォルト: false → public） */
  private?: boolean;
  /** no-store ディレクティブ。true の場合は他のオプションを無視（デフォルト: false） */
  noStore?: boolean;
  /** no-cache ディレクティブ（デフォルト: false） */
  noCache?: boolean;
}

/**
 * Cache-Control ヘッダーを設定するミドルウェア（§8.10）。
 * noStore: true の場合は "no-store" のみを設定し、他のオプションをすべて無視する。
 */
export function cache(options: CacheOptions = {}): MiddlewareFunction<MiddlewareState> {
  const {
    maxAge,
    staleWhileRevalidate,
    private: isPrivate = false,
    noStore = false,
    noCache = false,
  } = options;

  let cacheControl: string;
  if (noStore) {
    cacheControl = "no-store";
  } else {
    const directives: string[] = [];
    directives.push(isPrivate ? "private" : "public");
    if (noCache) directives.push("no-cache");
    if (maxAge !== undefined) directives.push(`max-age=${maxAge}`);
    if (staleWhileRevalidate !== undefined) {
      directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
    }
    cacheControl = directives.join(", ");
  }

  return async (_ctx, next) => {
    const res = await next();
    const headers = new Headers(res.headers);
    headers.set("Cache-Control", cacheControl);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  };
}
