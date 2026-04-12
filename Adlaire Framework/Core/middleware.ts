// ============================================================
// Adlaire Framework — middleware.ts
// セキュリティ・ネットワーク制御ミドルウェア
// cors / secureHeaders / hsts / ipFilter / csrfProtection
// ============================================================

import type {
  Context,
  Method,
  Middleware,
} from "./types.ts";

// ------------------------------------------------------------
// §8.10 ContentSecurityPolicy（secureHeaders 専用型）
// Ver.1.3-8 にて types.ts から移動
// ------------------------------------------------------------

export interface ContentSecurityPolicy {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  objectSrc?: string[];
  frameSrc?: string[];
  frameAncestors?: string[];
  formAction?: string[];
  baseUri?: string[];
  upgradeInsecureRequests?: boolean;
  reportUri?: string;
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
  onBlock?: (ctx: Context) => void;
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
      } else {
        opts.onBlock?.(ctx);
      }
      return new Response(null, { status: 204, headers });
    }

    // 通常リクエスト
    const response = await next();

    if (resolvedOrigin === null) {
      opts.onBlock?.(ctx);
      // オリジン拒否時でもオリジン依存設定の場合は Vary: Origin を付与する
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
// §8.10 セキュリティヘッダーミドルウェア
// ------------------------------------------------------------

export interface SecureHeadersOptions {
  xContentTypeOptions?: boolean;
  xFrameOptions?: "DENY" | "SAMEORIGIN" | false;
  xXssProtection?: boolean;
  referrerPolicy?: string | false;
  permissionsPolicy?: string | false;
  contentSecurityPolicy?: ContentSecurityPolicy | false;
  crossOriginOpenerPolicy?: string | false;
  crossOriginEmbedderPolicy?: "require-corp" | "unsafe-none" | false;
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
  const coop = opts.crossOriginOpenerPolicy ?? false;
  const coep = opts.crossOriginEmbedderPolicy ?? false;

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
    if (coop !== false) {
      headers.set("Cross-Origin-Opener-Policy", coop);
    }
    if (coep !== false) {
      headers.set("Cross-Origin-Embedder-Policy", coep);
    }

    return new Response(response.body, {
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

function matchesCidr(ip: string, cidr: string): boolean {
  const slashIdx = cidr.indexOf("/");
  if (slashIdx === -1) {
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
    if (allow !== undefined && allow.length > 0) {
      if (!matchesAnyRule(ip, allow)) {
        return new Response(
          JSON.stringify({ error: message }),
          { status: 403, headers: { "Content-Type": "application/json; charset=UTF-8" } },
        );
      }
    }

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
