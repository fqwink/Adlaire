/**
 * Adlaire Framework — 型付きリクエストコンテキスト
 * FRAMEWORK_RULEBOOK §6.3 / §6.6 / §6.7 / §6.8 / §6.9 / §6.10 / §6.11 準拠
 */

import type {
  Context,
  MiddlewareState,
  NegotiateHandlers,
  RedirectStatus,
  ResponseInit,
  RouteParams,
  SendFileOptions,
  SSEEvent,
  SSEStream,
  WebSocketHandlers,
} from "./types.ts";
import {
  badRequestResponse,
  forbiddenResponse,
  htmlResponse,
  internalErrorResponse,
  jsonResponse,
  notFoundResponse,
  redirectResponse,
  textResponse,
  unauthorizedResponse,
} from "./response.ts";
import { applySetCookies, createCookieStore } from "./cookies.ts";
import { ValidationError } from "./error.ts";

// ─── MIME タイプマップ（§6.10）────────────────────────────────────────────────

const MIME_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".ts": "application/typescript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

function getMimeType(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return "application/octet-stream";
  return MIME_TYPES[filePath.slice(dot).toLowerCase()] ?? "application/octet-stream";
}

// ─── Accept ヘッダーパーサー（§6.11）─────────────────────────────────────────

function parseAccept(accept: string): Array<{ type: string; q: number }> {
  return accept
    .split(",")
    .map((part) => {
      const segments = part.trim().split(";");
      const type = (segments[0] ?? "").trim();
      const qSeg = segments.slice(1).find((s) => s.trim().startsWith("q="));
      const q = qSeg ? parseFloat(qSeg.trim().slice(2)) : 1.0;
      return { type, q: isNaN(q) ? 1.0 : q };
    })
    .sort((a, b) => b.q - a.q);
}

/**
 * Context の実体を生成する。
 * フレームワーク内部でのみ使用。開発者が直接インスタンス化することはない。
 */
export function createContext<
  Params extends RouteParams = Record<string, never>,
  State extends MiddlewareState = Record<string, never>,
>(
  req: Request,
  params: Params,
  state: State,
): Context<Params, State> {
  const url = new URL(req.url);

  // §6.5: クエリパラメータを Record<string, string> に変換（同名キーは最初の値のみ）
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    if (!(key in query)) {
      query[key] = value;
    }
  }

  // §6.7: Cookie ストアを初期化
  const { cookies, getEntries } = createCookieStore(
    req.headers.get("Cookie") ?? "",
  );

  /** Set-Cookie を適用したレスポンスを返す共通ラッパー */
  function withCookies(res: Response): Response {
    return applySetCookies(res, getEntries());
  }

  return {
    req,
    params: Object.freeze({ ...params }),
    state,
    url,
    query: Object.freeze(query),
    cookies,

    // §6.6: リクエストボディの JSON パース + 型ガード
    async body<T>(guard?: (data: unknown) => data is T): Promise<T> {
      let data: unknown;
      try {
        data = await req.json();
      } catch {
        throw new ValidationError("Invalid JSON body");
      }
      if (guard !== undefined && !guard(data)) {
        throw new ValidationError("Request body validation failed");
      }
      return data as T;
    },

    // §7.2 レスポンスヘルパー — Set-Cookie を自動適用
    json<T>(data: T, init?: ResponseInit): Response {
      return withCookies(jsonResponse(data, init));
    },
    text(data: string, init?: ResponseInit): Response {
      return withCookies(textResponse(data, init));
    },
    html(data: string, init?: ResponseInit): Response {
      return withCookies(htmlResponse(data, init));
    },
    redirect(redirectUrl: string, status?: RedirectStatus): Response {
      return withCookies(redirectResponse(redirectUrl, status));
    },
    notFound(): Response {
      return withCookies(notFoundResponse());
    },
    unauthorized(): Response {
      return withCookies(unauthorizedResponse());
    },
    forbidden(): Response {
      return withCookies(forbiddenResponse());
    },
    badRequest(message?: string): Response {
      return withCookies(badRequestResponse(message));
    },
    internalError(message?: string): Response {
      return withCookies(internalErrorResponse(message));
    },

    // §6.8: WebSocket へのアップグレード
    upgradeWebSocket(handlers: WebSocketHandlers): Response {
      const { socket, response } = Deno.upgradeWebSocket(req);
      if (handlers.onOpen) {
        socket.addEventListener("open", () => handlers.onOpen!(socket));
      }
      if (handlers.onMessage) {
        socket.addEventListener("message", (e) =>
          handlers.onMessage!(socket, e as MessageEvent)
        );
      }
      if (handlers.onClose) {
        socket.addEventListener("close", (e) =>
          handlers.onClose!(socket, e as CloseEvent)
        );
      }
      if (handlers.onError) {
        socket.addEventListener("error", (e) =>
          handlers.onError!(socket, e)
        );
      }
      return response;
    },

    // §6.9: SSE レスポンスの生成
    sse(callback: (stream: SSEStream) => void | Promise<void>): Response {
      const encoder = new TextEncoder();
      let controller!: ReadableStreamDefaultController<Uint8Array>;

      const readable = new ReadableStream<Uint8Array>({
        start(ctrl) {
          controller = ctrl;
        },
      });

      const sseStream: SSEStream = {
        send(event: SSEEvent): void {
          let chunk = "";
          if (event.id !== undefined) chunk += `id: ${event.id}\n`;
          if (event.event !== undefined) chunk += `event: ${event.event}\n`;
          if (event.retry !== undefined) chunk += `retry: ${event.retry}\n`;
          const data =
            typeof event.data === "string"
              ? event.data
              : JSON.stringify(event.data);
          chunk += `data: ${data}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        },
        close(): void {
          try {
            controller.close();
          } catch {
            // already closed
          }
        },
      };

      const result = callback(sseStream);
      if (result instanceof Promise) {
        result.catch((err) => {
          console.error("SSE callback error:", err);
          try {
            controller.close();
          } catch {
            // already closed
          }
        });
      }

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    },

    // §6.10: 任意ファイルの配信
    async sendFile(filePath: string, options?: SendFileOptions): Promise<Response> {
      const { disposition = "inline", fileName, contentType } = options ?? {};

      // ファイル情報確認
      let stat: Deno.FileInfo;
      try {
        stat = await Deno.stat(filePath);
      } catch {
        return withCookies(notFoundResponse());
      }

      if (stat.isDirectory) {
        return withCookies(forbiddenResponse());
      }

      // ファイルオープン
      let file: Deno.FsFile;
      try {
        file = await Deno.open(filePath, { read: true });
      } catch {
        return withCookies(notFoundResponse());
      }

      const mimeType = contentType ?? getMimeType(filePath);
      const name = fileName ?? filePath.split("/").pop() ?? "file";

      const headers = new Headers();
      headers.set("Content-Type", mimeType);
      if (disposition === "attachment") {
        headers.set("Content-Disposition", `attachment; filename="${name}"`);
      } else {
        headers.set("Content-Disposition", "inline");
      }
      if (stat.size !== null && stat.size > 0) {
        headers.set("Content-Length", String(stat.size));
      }

      return withCookies(new Response(file.readable, { headers }));
    },

    // §6.11: コンテンツネゴシエーション
    async negotiate(handlers: NegotiateHandlers): Promise<Response> {
      const acceptHeader = req.headers.get("Accept") ?? "*/*";
      const accepted = parseAccept(acceptHeader);

      for (const { type } of accepted) {
        if (type === "*/*") {
          // 登録済みの最初のハンドラーを選択
          const keys = Object.keys(handlers);
          for (const key of keys) {
            const h = handlers[key];
            if (h) return await h();
          }
          break;
        }
        const h = handlers[type];
        if (h) return await h();
      }

      return new Response(
        JSON.stringify({ error: "Not Acceptable" }),
        {
          status: 406,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        },
      );
    },
  };
}
