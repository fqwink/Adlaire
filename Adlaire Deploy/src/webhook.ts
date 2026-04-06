/**
 * Adlaire Deploy — Webhook 受信ハンドラ
 *
 * GitHub 互換の HMAC-SHA256 署名検証 + push イベント処理
 */

import type { Deployer } from "./deployer.ts";
import type { ProcessManager } from "./process_manager.ts";

/** HMAC-SHA256 署名を検証する */
async function verifySignature(
  body: string,
  secret: string,
  signature: string,
): Promise<boolean> {
  if (!signature.startsWith("sha256=")) {
    return false;
  }
  const expectedHex = signature.slice(7);

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
    new TextEncoder().encode(body),
  );

  const actualHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // 定数時間比較
  if (expectedHex.length !== actualHex.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ actualHex.charCodeAt(i);
  }
  return mismatch === 0;
}

/** GitHub push ペイロードを解析する */
interface PushPayload {
  ref: string;
  after: string;
  pusher: { name: string };
}

/** Webhook リクエストを処理する */
export async function handleWebhook(
  request: Request,
  projectId: string,
  manager: ProcessManager,
  deployer: Deployer,
): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  // プロジェクト設定を取得
  const projectConfig = manager.getProjectConfig(projectId);
  if (!projectConfig) {
    return json({ ok: false, error: "not_found", message: "Project not found" }, 404);
  }
  if (!projectConfig.git) {
    return json(
      { ok: false, error: "not_configured", message: "Git not configured for this project" },
      400,
    );
  }

  // リクエストボディを取得
  const body = await request.text();

  // 署名検証
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const valid = await verifySignature(body, projectConfig.git.webhook_secret, signature);
  if (!valid) {
    return json({ ok: false, error: "forbidden", message: "Invalid signature" }, 403);
  }

  // ペイロード解析
  let payload: PushPayload;
  try {
    payload = JSON.parse(body) as PushPayload;
  } catch {
    return json({ ok: false, error: "bad_request", message: "Invalid JSON payload" }, 400);
  }

  // ブランチ確認
  const expectedRef = `refs/heads/${projectConfig.git.branch}`;
  if (payload.ref !== expectedRef) {
    return json({
      ok: true,
      data: { message: "Branch ignored", ref: payload.ref },
    });
  }

  // デプロイ実行
  const commit = payload.after ?? "unknown";
  const pusher = payload.pusher?.name ?? "unknown";
  const result = await deployer.requestDeploy(
    projectId,
    commit,
    projectConfig.git.branch,
    pusher,
  );

  if (result === "queued") {
    return json({ ok: true, data: { message: "Deploy queued" } }, 202);
  }

  return json(
    { ok: true, data: { message: "Deploy started", commit } },
    202,
  );
}
