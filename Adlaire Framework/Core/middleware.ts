// ============================================================
// Adlaire Framework — middleware.ts
// バリデーター・各種ミドルウェア
// ============================================================

import type {
  ContentSecurityPolicy,
  Context,
  Method,
  Middleware,
  Rule,
  Schema,
  ValidationError,
} from "./types.ts";
import { HTTPError } from "./types.ts";

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

    if (resolvedOrigin === null) {
      // オリジン拒否時でもオリジン依存設定の場合は Vary: Origin を付与する
      // （プロキシが正しいオリジン別キャッシュを行えるよう）
      if (requestDependent) {
        const headers = new Headers(response.headers);
        headers.set("Vary", "Origin");
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
      return response;
    }

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", resolvedOrigin);
    // Access-Control-Allow-Methods / Allow-Headers はプリフライト専用ヘッダー
    // 通常レスポンスには付与しない（CORS 仕様準拠）
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

export interface LogInfo {
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

export interface LoggerOptions {
  level?: "silent" | "info" | "debug";
  format?: (info: LogInfo) => string;
}

export function logger(options?: LoggerOptions): Middleware {
  const level = options?.level ?? "info";
  const fmt = options?.format;

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

    if (level === "debug" && fmt === undefined) {
      const headers: Record<string, string> = {};
      ctx.req.headers.forEach((v, k) => { headers[k] = v; });
      console.log(`→ ${method} ${path}`, headers);
    }

    const response = await next();
    const durationMs = Math.round(performance.now() - start);
    const info: LogInfo = { method, path, status: response.status, durationMs };

    if (fmt !== undefined) {
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
}

// デフォルトのインメモリストア実装
function createInMemoryStore(): RateLimitStore {
  const map = new Map<string, { count: number; resetAt: number }>();

  return {
    increment(key: string, windowMs: number) {
      const now = Date.now();
      let entry = map.get(key);

      if (!entry || now >= entry.resetAt) {
        // 期限切れエントリを清掃（メモリリーク防止）
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

    // ボディ全体を一度だけ読み取る
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

    // If-None-Match チェック
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

// ------------------------------------------------------------
// §8.10 セキュリティヘッダーミドルウェア
// ------------------------------------------------------------

export interface SecureHeadersOptions {
  xContentTypeOptions?: boolean;
  xFrameOptions?: "DENY" | "SAMEORIGIN" | false;
  xXssProtection?: boolean;
  referrerPolicy?: string | false;
  permissionsPolicy?: string | false;
  contentSecurityPolicy?: ContentSecurityPolicy | false;
}

function buildCsp(csp: ContentSecurityPolicy): string {
  const parts: string[] = [];
  const list = (name: string, values: string[] | undefined): void => {
    if (values && values.length > 0) parts.push(`${name} ${values.join(" ")}`);
  };
  list("default-src", csp.defaultSrc);
  list("script-src", csp.scriptSrc);
  list("style-src", csp.styleSrc);
  list("img-src", csp.imgSrc);
  list("connect-src", csp.connectSrc);
  list("font-src", csp.fontSrc);
  list("object-src", csp.objectSrc);
  list("frame-src", csp.frameSrc);
  list("frame-ancestors", csp.frameAncestors);
  list("form-action", csp.formAction);
  list("base-uri", csp.baseUri);
  if (csp.upgradeInsecureRequests) parts.push("upgrade-insecure-requests");
  if (csp.reportUri) parts.push(`report-uri ${csp.reportUri}`);
  return parts.join("; ");
}

export function secureHeaders(options?: SecureHeadersOptions): Middleware {
  const opts = options ?? {};
  const xContentTypeOptions = opts.xContentTypeOptions !== false;
  const xFrameOptions = opts.xFrameOptions !== undefined ? opts.xFrameOptions : "SAMEORIGIN";
  const xXssProtection = opts.xXssProtection !== false;
  const referrerPolicy = opts.referrerPolicy !== undefined
    ? opts.referrerPolicy
    : "strict-origin-when-cross-origin";
  const permissionsPolicy = opts.permissionsPolicy ?? false;
  const csp = opts.contentSecurityPolicy ?? false;
  const cspValue = csp !== false ? buildCsp(csp) : false;

  return async (_ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const response = await next();
    const headers = new Headers(response.headers);

    if (xContentTypeOptions) {
      headers.set("X-Content-Type-Options", "nosniff");
    }
    if (xFrameOptions !== false) {
      headers.set("X-Frame-Options", xFrameOptions);
    }
    if (xXssProtection) {
      headers.set("X-XSS-Protection", "0");
    }
    if (referrerPolicy !== false) {
      headers.set("Referrer-Policy", referrerPolicy);
    }
    if (permissionsPolicy !== false) {
      headers.set("Permissions-Policy", permissionsPolicy);
    }
    if (cspValue !== false && cspValue.length > 0) {
      headers.set("Content-Security-Policy", cspValue);
    }

    return new Response(response.body, {
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
    // append ではなく set で重複を防ぐ（すでに Vary があれば上書き）
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
// §8.11 CSRF 保護ミドルウェア
// ------------------------------------------------------------

export interface CsrfOptions {
  cookie?: string;
  header?: string;
  methods?: Method[];
  secure?: boolean;
}

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

function readCsrfCookie(req: Request, cookieName: string): string | null {
  const cookieHeader = req.headers.get("Cookie");
  if (cookieHeader === null) return null;
  for (const pair of cookieHeader.split(";")) {
    const trimmed = pair.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    if (trimmed.slice(0, eqIdx).trim() === cookieName) {
      return trimmed.slice(eqIdx + 1);
    }
  }
  return null;
}

export function csrfProtection(options?: CsrfOptions): Middleware {
  const cookieName = options?.cookie ?? "csrf_token";
  const headerName = options?.header ?? "X-CSRF-Token";
  const protectedMethods: ReadonlySet<string> = new Set(
    options?.methods ?? ["POST", "PUT", "PATCH", "DELETE"],
  );
  const secureCookie = options?.secure ?? false;

  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const method = ctx.req.method;

    if (protectedMethods.has(method)) {
      // 保護対象メソッド: トークン照合
      const cookieToken = readCsrfCookie(ctx.req, cookieName);
      if (cookieToken === null) {
        return new Response(
          JSON.stringify({ error: "CSRF token missing" }),
          { status: 403, headers: { "Content-Type": "application/json; charset=UTF-8" } },
        );
      }
      const requestToken = ctx.req.headers.get(headerName);
      if (requestToken === null || requestToken !== cookieToken) {
        return new Response(
          JSON.stringify({ error: "CSRF token mismatch" }),
          { status: 403, headers: { "Content-Type": "application/json; charset=UTF-8" } },
        );
      }
      return await next();
    }

    // セーフメソッド: トークン未設定の場合のみ新規生成して Set-Cookie
    const response = await next();
    const existingToken = readCsrfCookie(ctx.req, cookieName);
    if (existingToken !== null) return response;

    const token = generateCsrfToken();
    const cookieParts = [
      `${cookieName}=${token}`,
      "Path=/",
      "SameSite=Strict",
    ];
    if (secureCookie) cookieParts.push("Secure");

    const headers = new Headers(response.headers);
    headers.append("Set-Cookie", cookieParts.join("; "));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

// ------------------------------------------------------------
// §8.12 型付きボディアサーション
// ------------------------------------------------------------

export function assertBody<T>(body: unknown, schema: Schema): T {
  const errors: ValidationError[] = validate(body, schema);
  if (errors.length > 0) {
    throw new HTTPError(400, "Validation Failed", errors);
  }
  // 実行時バリデーション済みのため型アサーションを使用する（§8.12 仕様に定める例外）
  return body as T;
}

// ------------------------------------------------------------
// §8.13 HSTS ミドルウェア
// ------------------------------------------------------------

export interface HstsOptions {
  maxAge?: number;
  includeSubDomains?: boolean;
  preload?: boolean;
}

export function hsts(options?: HstsOptions): Middleware {
  const maxAge = options?.maxAge ?? 31536000;
  const includeSubDomains = options?.includeSubDomains !== false;
  const preload = options?.preload ?? false;

  // preload: true は includeSubDomains: true かつ maxAge >= 31536000 (1年) が必須
  if (preload) {
    if (!includeSubDomains) {
      throw new TypeError(
        "hsts(): preload: true を使用するには includeSubDomains: true が必要です",
      );
    }
    if (maxAge < 31536000) {
      throw new TypeError(
        "hsts(): preload: true を使用するには maxAge >= 31536000 (1年) が必要です",
      );
    }
  }

  let headerValue = `max-age=${maxAge}`;
  if (includeSubDomains) headerValue += "; includeSubDomains";
  if (preload) headerValue += "; preload";

  return async (_ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const response = await next();
    const headers = new Headers(response.headers);
    headers.set("Strict-Transport-Security", headerValue);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

// ------------------------------------------------------------
// §8.14 IP フィルタリングミドルウェア
// ------------------------------------------------------------

export interface IpFilterOptions {
  allow?: string[];
  deny?: string[];
  getIp?: (ctx: Context) => string;
  message?: string;
}

// IPv4 アドレスを 32bit 数値に変換する
function parseIpv4(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (Number.isNaN(n) || n < 0 || n > 255) return null;
    num = (num * 256) + n;
  }
  return num;
}

// IPv4 CIDR マッチング（例: "192.168.0.0/24"）
function matchesCidr(ip: string, cidr: string): boolean {
  const slashIdx = cidr.indexOf("/");
  if (slashIdx === -1) {
    // CIDR 記法なし: 完全一致
    return ip === cidr;
  }
  const network = cidr.slice(0, slashIdx);
  const prefixLen = parseInt(cidr.slice(slashIdx + 1), 10);
  if (Number.isNaN(prefixLen) || prefixLen < 0 || prefixLen > 32) return false;

  const ipNum = parseIpv4(ip);
  const netNum = parseIpv4(network);
  if (ipNum === null || netNum === null) return false;

  const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
  return (ipNum >>> 0 & mask) === (netNum >>> 0 & mask);
}

function matchesAnyRule(ip: string, rules: string[]): boolean {
  return rules.some((rule) => matchesCidr(ip, rule));
}

export function ipFilter(options: IpFilterOptions): Middleware {
  const allow = options.allow;
  const deny = options.deny;
  const getIpFn = options.getIp ?? ((ctx: Context) =>
    ctx.req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  );
  const message = options.message ?? "Forbidden";

  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const ip = getIpFn(ctx);

    // IPv6 アドレスは現在 IPv4 CIDR ルールの対象外（完全一致のみ評価）
    // IPv4 CIDR ルールは IPv6 クライアントにはマッチしない（意図的な制限）

    // allow リストが指定されている場合: 一致しない場合は拒否
    if (allow !== undefined && allow.length > 0) {
      if (!matchesAnyRule(ip, allow)) {
        return new Response(
          JSON.stringify({ error: message }),
          { status: 403, headers: { "Content-Type": "application/json; charset=UTF-8" } },
        );
      }
    }

    // deny リストが指定されている場合: 一致する場合は拒否
    if (deny !== undefined && deny.length > 0) {
      if (matchesAnyRule(ip, deny)) {
        return new Response(
          JSON.stringify({ error: message }),
          { status: 403, headers: { "Content-Type": "application/json; charset=UTF-8" } },
        );
      }
    }

    return await next();
  };
}
