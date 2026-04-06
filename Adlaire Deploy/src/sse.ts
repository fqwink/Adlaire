/**
 * Adlaire Deploy — ログ SSE ストリーミング
 *
 * Server-Sent Events でリアルタイムログを配信する
 */

import { getLogBuffer } from "./logger.ts";
import type { LogEntry } from "./types.ts";

/** SSE クライアント */
interface SseClient {
  controller: ReadableStreamDefaultController<Uint8Array>;
  projectId: string;
}

/** プロジェクト別 SSE クライアントリスト */
const clients: Map<string, Set<SseClient>> = new Map();

/** SSE データ行をフォーマットする */
function formatSseData(entry: LogEntry): string {
  const data = JSON.stringify({
    timestamp: entry.timestamp,
    level: entry.stream === "stderr" ? "error" : "info",
    message: entry.line,
  });
  return `data: ${data}\n\n`;
}

/** SSE クライアントを追加する */
function addClient(client: SseClient): void {
  let set = clients.get(client.projectId);
  if (!set) {
    set = new Set();
    clients.set(client.projectId, set);
  }
  set.add(client);
}

/** SSE クライアントを削除する */
function removeClient(client: SseClient): void {
  const set = clients.get(client.projectId);
  if (set) {
    set.delete(client);
    if (set.size === 0) {
      clients.delete(client.projectId);
    }
  }
}

/** 新しいログエントリを全 SSE クライアントに配信する */
export function broadcastLogEntry(projectId: string, entry: LogEntry): void {
  const set = clients.get(projectId);
  if (!set || set.size === 0) return;

  const encoder = new TextEncoder();
  const data = encoder.encode(formatSseData(entry));

  for (const client of set) {
    try {
      client.controller.enqueue(data);
    } catch {
      removeClient(client);
    }
  }
}

/** SSE ストリーミングレスポンスを作成する */
export function createSseStream(
  projectId: string,
  token: string,
  expectedToken: string,
): Response {
  // Bearer トークン検証
  if (token !== expectedToken) {
    return new Response(
      JSON.stringify({ ok: false, error: "forbidden", message: "Invalid token" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const client: SseClient = { controller, projectId };
      addClient(client);

      // バッファ済みログを即時送信
      const buffer = getLogBuffer(projectId);
      for (const entry of buffer) {
        try {
          controller.enqueue(encoder.encode(formatSseData(entry)));
        } catch {
          removeClient(client);
          return;
        }
      }
    },
    cancel() {
      // クライアントは cancel 時にクリーンアップ済み
      // (broadcastLogEntry の try/catch で削除される)
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
