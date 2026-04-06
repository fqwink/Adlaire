/**
 * Adlaire Deploy — 環境変数暗号化
 *
 * AES-256-GCM による環境変数の暗号化・復号
 * 旧平文形式からの自動マイグレーション対応
 */

import { getPlatformKv } from "./kv.ts";

/** 暗号化された環境変数値 */
interface EncryptedEnvValue {
  /** AES-256-GCM IV (Base64) */
  iv: string;
  /** 暗号文 (Base64) */
  ciphertext: string;
}

/** 暗号化された環境変数セット */
interface EncryptedEnvSet {
  /** 暗号化フラグ */
  encrypted: true;
  /** 暗号化された環境変数 */
  values: Record<string, EncryptedEnvValue>;
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
      salt: new TextEncoder().encode("adlaire-deploy-env"),
      info: new TextEncoder().encode("env-encryption"),
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** 単一値を暗号化する */
async function encryptValue(plaintext: string): Promise<EncryptedEnvValue> {
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

/** 単一値を復号する */
async function decryptValue(encrypted: EncryptedEnvValue): Promise<string> {
  const key = await deriveKey();
  const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ct,
  );

  return new TextDecoder().decode(decrypted);
}

/** 環境変数セットを暗号化して KV に保存する */
export async function saveEncryptedEnv(
  projectId: string,
  env: Record<string, string>,
): Promise<void> {
  const values: Record<string, EncryptedEnvValue> = {};
  for (const [k, v] of Object.entries(env)) {
    values[k] = await encryptValue(v);
  }

  const kv = getPlatformKv();
  const envSet: EncryptedEnvSet = { encrypted: true, values };
  await kv.set(["env", projectId], envSet);
}

/** KV から暗号化された環境変数を復号して取得する */
export async function loadDecryptedEnv(
  projectId: string,
): Promise<Record<string, string> | null> {
  const kv = getPlatformKv();
  const entry = await kv.get<EncryptedEnvSet>(["env", projectId]);
  if (!entry.value) return null;

  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(entry.value.values)) {
    result[k] = await decryptValue(v);
  }
  return result;
}

/** 平文環境変数を検出して暗号化マイグレーションを実行する */
export async function migrateEnvIfNeeded(
  projectId: string,
  plainEnv: Record<string, string>,
): Promise<void> {
  if (Object.keys(plainEnv).length === 0) return;

  const kv = getPlatformKv();
  const existing = await kv.get<EncryptedEnvSet>(["env", projectId]);

  // 既に暗号化済みなら skip
  if (existing.value?.encrypted) return;

  // ADLAIRE_DEPLOY_SECRET が設定されていない場合は skip（暗号化不可）
  if (!Deno.env.get("ADLAIRE_DEPLOY_SECRET")) return;

  console.log(`[deploy] Migrating environment variables for "${projectId}" to encrypted storage`);
  await saveEncryptedEnv(projectId, plainEnv);
}

/** 環境変数を削除する */
export async function deleteEncryptedEnv(
  projectId: string,
): Promise<void> {
  const kv = getPlatformKv();
  await kv.delete(["env", projectId]);
}

/**
 * プロジェクトの環境変数を取得する
 * 暗号化 KV → deploy.json 平文の優先順位で取得
 */
export async function resolveEnv(
  projectId: string,
  plainEnv: Record<string, string>,
): Promise<Record<string, string>> {
  // ADLAIRE_DEPLOY_SECRET が設定されていない場合は平文をそのまま返す
  if (!Deno.env.get("ADLAIRE_DEPLOY_SECRET")) {
    return plainEnv;
  }

  const encrypted = await loadDecryptedEnv(projectId);
  if (encrypted) {
    return encrypted;
  }

  return plainEnv;
}
