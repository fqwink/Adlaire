/**
 * Adlaire Deploy — ダッシュボード認証・セッション管理
 */

import { getPlatformKv } from "../kv.ts";

/** デフォルトセッション有効期限（秒） */
const DEFAULT_SESSION_TTL = 86400; // 24 時間

/** セッション情報 */
interface Session {
  token: string;
  created_at: string;
  expires_at: string;
}

/** セッション有効期限（設定可能） */
let sessionTtl = DEFAULT_SESSION_TTL;

/** セッション TTL を設定する */
export function setSessionTtl(ttl: number): void {
  sessionTtl = ttl;
}

/** 64 バイト乱数 Base64 トークンを生成する */
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return btoa(String.fromCharCode(...bytes));
}

/** 管理者パスワードを検証する */
export function verifyAdminPassword(password: string): boolean {
  const expected = Deno.env.get("ADLAIRE_DEPLOY_ADMIN_PASSWORD");
  if (!expected) {
    console.error("[dashboard] ADLAIRE_DEPLOY_ADMIN_PASSWORD is not set");
    return false;
  }

  // 定数時間比較
  if (password.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < password.length; i++) {
    mismatch |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

/** セッションを作成する */
export async function createSession(): Promise<{ token: string; cookie: string }> {
  const token = generateToken();
  const now = new Date();
  const expires = new Date(now.getTime() + sessionTtl * 1000);

  const session: Session = {
    token,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
  };

  const kv = getPlatformKv();
  await kv.set(["session", token], session);

  const secure = Deno.env.get("ADLAIRE_DEPLOY_HTTPS") === "1" ? "; Secure" : "";
  const cookie = `adlaire_session=${token}; HttpOnly; SameSite=Strict; Path=/dashboard; Max-Age=${sessionTtl}${secure}`;

  return { token, cookie };
}

/** セッションを検証する */
export async function validateSession(token: string): Promise<boolean> {
  if (!token) return false;

  const kv = getPlatformKv();
  const entry = await kv.get<Session>(["session", token]);
  if (!entry.value) return false;

  // 有効期限チェック
  if (new Date() > new Date(entry.value.expires_at)) {
    await kv.delete(["session", token]);
    return false;
  }

  return true;
}

/** セッションを削除する */
export async function deleteSession(token: string): Promise<void> {
  const kv = getPlatformKv();
  await kv.delete(["session", token]);
}

/** Cookie からセッショントークンを取得する */
export function getSessionToken(request: Request): string {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/adlaire_session=([^;]+)/);
  return match?.[1] ?? "";
}
