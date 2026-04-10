/**
 * Adlaire Framework — Cookie ヘルパー
 * FRAMEWORK_RULEBOOK §6.7 準拠
 */

/** Cookie の属性オプション（§6.7） */
export interface CookieOptions {
  /** Cookie の有効期限（秒）。0 で即時削除 */
  maxAge?: number;
  /** Cookie の有効期限（Date） */
  expires?: Date;
  /** JavaScript からのアクセスを禁止する */
  httpOnly?: boolean;
  /** HTTPS のみで送信する */
  secure?: boolean;
  /** SameSite ポリシー */
  sameSite?: "Strict" | "Lax" | "None";
  /** Cookie のパス（デフォルト: "/"） */
  path?: string;
  /** Cookie のドメイン */
  domain?: string;
}

/** Cookie 操作インターフェース（§6.7） */
export interface Cookies {
  /** リクエストの Cookie ヘッダーから値を取得する */
  get(name: string): string | undefined;
  /** レスポンスに Set-Cookie ヘッダーを予約する */
  set(name: string, value: string, options?: CookieOptions): void;
  /** Cookie を削除する（maxAge: 0 で上書き） */
  delete(name: string, options?: Omit<CookieOptions, "maxAge" | "expires">): void;
}

/** 内部: 予約された Set-Cookie エントリ */
interface CookieEntry {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * リクエストの Cookie ヘッダーをパースして Record に変換する。
 */
function parseCookieHeader(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const name = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (name && !(name in result)) {
      try {
        result[name] = decodeURIComponent(value);
      } catch {
        result[name] = value;
      }
    }
  }
  return result;
}

/**
 * Set-Cookie ヘッダー文字列を生成する。
 */
function serializeCookie(
  name: string,
  value: string,
  options?: CookieOptions,
): string {
  // RFC 6265: Cookie名はトークン文字のみ（エンコード不要）、値のみエンコード
  let str = `${name}=${encodeURIComponent(value)}`;
  str += `; Path=${options?.path ?? "/"}`;
  if (options?.maxAge !== undefined) str += `; Max-Age=${options.maxAge}`;
  if (options?.expires) str += `; Expires=${options.expires.toUTCString()}`;
  if (options?.domain) str += `; Domain=${options.domain}`;
  if (options?.httpOnly) str += `; HttpOnly`;
  if (options?.secure) str += `; Secure`;
  if (options?.sameSite) str += `; SameSite=${options.sameSite}`;
  return str;
}

/**
 * Cookie ストアを生成する。
 * createContext() が内部で使用する。
 */
export function createCookieStore(cookieHeader: string): {
  cookies: Cookies;
  getEntries: () => CookieEntry[];
} {
  const parsed = parseCookieHeader(cookieHeader);
  const entries: CookieEntry[] = [];

  const cookies: Cookies = {
    get(name: string): string | undefined {
      return parsed[name];
    },
    set(name: string, value: string, options?: CookieOptions): void {
      entries.push({ name, value, options });
    },
    delete(name: string, options?: Omit<CookieOptions, "maxAge" | "expires">): void {
      entries.push({ name, value: "", options: { ...options, maxAge: 0 } });
    },
  };

  return { cookies, getEntries: () => entries };
}

/**
 * 予約済み Cookie エントリを Response の Set-Cookie ヘッダーに適用する。
 * ctx の全レスポンスヘルパーが呼び出す。
 */
export function applySetCookies(res: Response, entries: CookieEntry[]): Response {
  if (entries.length === 0) return res;
  const headers = new Headers(res.headers);
  for (const entry of entries) {
    headers.append(
      "Set-Cookie",
      serializeCookie(entry.name, entry.value, entry.options),
    );
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
