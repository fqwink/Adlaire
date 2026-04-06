/**
 * Adlaire Deploy — 認証情報ストア
 *
 * プライベートリポジトリ用の認証情報を暗号化して管理する
 */

import { getPlatformKv } from "./kv.ts";

/** 暗号化された認証情報 */
interface EncryptedCredential {
  type: "pat" | "ssh";
  /** AES-256-GCM IV (Base64) */
  iv: string;
  /** 暗号文 (Base64) */
  ciphertext: string;
  /** SSH 鍵の場合のファイルパス */
  ssh_key_path?: string;
}

/** 復号された認証情報 */
export interface Credential {
  type: "pat" | "ssh";
  /** PAT: トークン文字列 / SSH: 鍵ファイルパス */
  value: string;
}

/** 環境変数から暗号鍵を導出する */
async function deriveKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("ADLAIRE_DEPLOY_SECRET");
  if (!secret) {
    throw new Error("ADLAIRE_DEPLOY_SECRET environment variable is not set");
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "HKDF",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode("adlaire-deploy-credential"),
      info: new TextEncoder().encode("credential-encryption"),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** 値を暗号化する */
async function encrypt(plaintext: string): Promise<{ iv: string; ciphertext: string }> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );

  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
  };
}

/** 値を復号する */
async function decrypt(iv: string, ciphertext: string): Promise<string> {
  const key = await deriveKey();
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const ctBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    ctBytes,
  );

  return new TextDecoder().decode(decrypted);
}

/** PAT 認証情報を保存する */
export async function setPatCredential(
  projectId: string,
  token: string,
): Promise<void> {
  const { iv, ciphertext } = await encrypt(token);
  const kv = getPlatformKv();
  const credential: EncryptedCredential = {
    type: "pat",
    iv,
    ciphertext,
  };
  await kv.set(["credential", projectId], credential);
}

/** SSH 鍵ファイルを登録する */
export async function setSshCredential(
  projectId: string,
  sourcePath: string,
): Promise<void> {
  // 鍵ファイルを保護されたディレクトリにコピー
  const destDir = "./data/ssh_keys";
  await Deno.mkdir(destDir, { recursive: true });
  const destPath = `${destDir}/${projectId}.key`;
  await Deno.copyFile(sourcePath, destPath);
  await Deno.chmod(destPath, 0o600);

  const { iv, ciphertext } = await encrypt(destPath);
  const kv = getPlatformKv();
  const credential: EncryptedCredential = {
    type: "ssh",
    iv,
    ciphertext,
    ssh_key_path: destPath,
  };
  await kv.set(["credential", projectId], credential);
}

/** 認証情報を取得する */
export async function getCredential(
  projectId: string,
): Promise<Credential | null> {
  const kv = getPlatformKv();
  const entry = await kv.get<EncryptedCredential>(["credential", projectId]);
  if (!entry.value) return null;

  const { type, iv, ciphertext } = entry.value;
  const value = await decrypt(iv, ciphertext);

  return { type, value };
}

/** 認証情報を削除する */
export async function removeCredential(
  projectId: string,
): Promise<void> {
  const kv = getPlatformKv();
  const entry = await kv.get<EncryptedCredential>(["credential", projectId]);

  if (entry.value?.ssh_key_path) {
    try {
      await Deno.remove(entry.value.ssh_key_path);
    } catch {
      // ファイルが存在しない場合は無視
    }
  }

  await kv.delete(["credential", projectId]);
}

/** Git URL に PAT を埋め込む */
export function embedPatInUrl(url: string, token: string): string {
  // https://github.com/... → https://<token>@github.com/...
  const parsed = new URL(url);
  parsed.username = token;
  return parsed.toString();
}

/** SSH 用の Git 環境変数を取得する */
export function getSshGitEnv(sshKeyPath: string): Record<string, string> {
  return {
    GIT_SSH_COMMAND: `ssh -i ${sshKeyPath} -o StrictHostKeyChecking=accept-new`,
  };
}
