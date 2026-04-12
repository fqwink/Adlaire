// ============================================================
// Adlaire Framework — static.ts
// 静的ファイル配信
// ============================================================

import type { Handler } from "./types.ts";
import { json } from "./response.ts";

// ------------------------------------------------------------
// §9.2 静的ファイル配信
// ------------------------------------------------------------

export interface StaticOptions {
  root: string;           // 配信ルートディレクトリ（絶対パスまたは実行ディレクトリ相対パス）
  index?: string;         // ディレクトリ URL アクセス時のデフォルトファイル（例: "index.html"）
  cacheControl?: string;  // Cache-Control ヘッダー値（デフォルト: "no-cache"）
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".mjs": "application/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=UTF-8",
  ".map": "application/json",
  ".wasm": "application/wasm",
  ".ts": "text/typescript; charset=UTF-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".avif": "image/avif",
};

export function getMimeType(path: string): string {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

export function serveStatic(options: StaticOptions): Handler {
  const root = options.root.replace(/\/$/, "");
  const cacheControl = options.cacheControl ?? "no-cache";

  return async (ctx) => {
    const filePath = ctx.params.path ?? "";

    // ディレクトリトラバーサル防御
    if (filePath.includes("..") || filePath.startsWith("/")) {
      return json({ error: "Forbidden" }, 403);
    }
    const normalized = filePath.replace(/\\/g, "/");
    if (normalized.includes("..")) {
      return json({ error: "Forbidden" }, 403);
    }

    // index ファイル解決（パスが空またはディレクトリ末尾スラッシュ）
    let resolved = normalized;
    if (options.index !== undefined && (resolved === "" || resolved.endsWith("/"))) {
      resolved = resolved === "" ? options.index : `${resolved}${options.index}`;
    }

    const fullPath = `${root}/${resolved}`;

    try {
      const content = await Deno.readFile(fullPath);
      const contentType = getMimeType(fullPath);
      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": cacheControl,
        },
      });
    } catch {
      return json({ error: "Not Found" }, 404);
    }
  };
}
