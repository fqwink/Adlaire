/**
 * Adlaire Deploy — デプロイ通知
 *
 * Webhook による デプロイ完了通知（HMAC-SHA256 署名対応）
 */

/** 通知ペイロード */
interface NotifyPayload {
  project_id: string;
  status: "success" | "failure";
  deploy_id: string;
  commit: string;
  timestamp: string;
  message: string;
}

/** リトライ設定 */
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const NOTIFY_TIMEOUT_MS = 10_000;

/** HMAC-SHA256 署名を生成する */
async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `sha256=${hex}`;
}

/** デプロイ通知を送信する */
export async function sendDeployNotification(
  webhookUrl: string,
  webhookSecret: string | null,
  projectId: string,
  deployId: string,
  commit: string,
  status: "success" | "failure",
  message: string,
): Promise<void> {
  const payload: NotifyPayload = {
    project_id: projectId,
    status,
    deploy_id: deployId,
    commit,
    timestamp: new Date().toISOString(),
    message,
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (webhookSecret) {
    headers["X-Adlaire-Signature"] = await sign(body, webhookSecret);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        console.log(`[deploy] Deploy notification sent for "${projectId}" (${status})`);
        return;
      }

      // 非 2xx レスポンス
      if (attempt < MAX_RETRIES) {
        console.log(`[deploy] Deploy notification retry ${attempt + 1}/${MAX_RETRIES} (HTTP ${response.status})`);
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
    } catch (e) {
      if (attempt < MAX_RETRIES) {
        console.log(
          `[deploy] Deploy notification retry ${attempt + 1}/${MAX_RETRIES}: ${e instanceof Error ? e.message : String(e)}`,
        );
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
    }
  }

  console.error(
    `[deploy] Deploy notification failed for "${projectId}" after ${MAX_RETRIES} retries`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
