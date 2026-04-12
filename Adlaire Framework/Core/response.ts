// ============================================================
// Adlaire Framework — response.ts
// レスポンスヘルパー（json / text / html / send / redirect）
// ストリーミング（sse / upgradeWebSocket）
// ============================================================

import type { HttpStatus, SSEMessage, WebSocketUpgradeOptions } from "./types.ts";
import { HTTPError } from "./types.ts";

type RedirectStatus = 301 | 302 | 307 | 308;

// ------------------------------------------------------------
// §9.1 レスポンスヘルパー
// ------------------------------------------------------------

export function json(data: unknown, status: HttpStatus = 200): Response {
  let body: string;
  try {
    body = JSON.stringify(data);
  } catch {
    // 循環参照・BigInt 等で stringify に失敗した場合
    return new Response('{"error":"Internal Server Error"}', {
      status: 500,
      headers: { "Content-Type": "application/json; charset=UTF-8" },
    });
  }
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8" },
  });
}

export function text(body: string, status: HttpStatus = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=UTF-8" },
  });
}

export function html(body: string, status: HttpStatus = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

export function send(status: HttpStatus, body?: string): Response {
  return new Response(body ?? null, { status });
}

export function redirect(url: string | URL, status: RedirectStatus = 302): Response {
  return new Response(null, {
    status,
    headers: { "Location": String(url) },
  });
}

// ------------------------------------------------------------
// §9.8 Server-Sent Events
// ------------------------------------------------------------

export class SSEWriter {
  readonly #controller: ReadableStreamDefaultController<Uint8Array>;
  readonly #encoder = new TextEncoder();

  constructor(controller: ReadableStreamDefaultController<Uint8Array>) {
    this.#controller = controller;
  }

  send(message: SSEMessage): void {
    let chunk = "";

    if (message.event !== undefined) {
      chunk += `event: ${message.event}\n`;
    }
    if (message.id !== undefined) {
      chunk += `id: ${message.id}\n`;
    }
    if (message.retry !== undefined) {
      chunk += `retry: ${message.retry}\n`;
    }
    // data フィールドは複数行対応（各行に data: プレフィックスを付与）
    for (const line of message.data.split("\n")) {
      chunk += `data: ${line}\n`;
    }
    chunk += "\n";

    this.#controller.enqueue(this.#encoder.encode(chunk));
  }

  close(): void {
    try {
      this.#controller.close();
    } catch {
      // すでに閉じられている場合は無視
    }
  }
}

export function sse(
  handler: (writer: SSEWriter) => void | Promise<void>,
): Response {
  let writer: SSEWriter;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      writer = new SSEWriter(controller);
      Promise.resolve(handler(writer)).catch(() => {
        try { controller.close(); } catch { /* ignore */ }
      });
    },
    cancel() {
      // クライアント切断時: writer.close() が呼ばれていない場合でも安全
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

// ------------------------------------------------------------
// §9.9 WebSocket アップグレード
// ------------------------------------------------------------

export function upgradeWebSocket(
  req: Request,
  handler: (ws: WebSocket) => void,
  options?: WebSocketUpgradeOptions,
): Response {
  let upgrade: { socket: WebSocket; response: Response };
  try {
    upgrade = Deno.upgradeWebSocket(req, { protocol: options?.protocol });
  } catch {
    throw new HTTPError(400, "WebSocket upgrade failed");
  }

  handler(upgrade.socket);
  return upgrade.response;
}
