/**
 * Adlaire Deploy — 静的サイトホスティング
 * 仕様: DEPLOY_PLATFORM_RULEBOOK.md P11.2
 *
 * type: "static" プロジェクトの静的ファイル配信。
 * SPA フォールバック・ディレクトリトラバーサル防止。
 */

import { join, normalize, extname } from "jsr:@std/path";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
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
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".pdf": "application/pdf",
  ".wasm": "application/wasm",
};

function getMimeType(path: string): string {
  const ext = extname(path).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

/**
 * 静的ファイルをサーブする。
 * @param baseDir 静的ファイルのルートディレクトリ（絶対パス）
 * @param requestPath URL パス（例: "/assets/style.css"）
 */
export async function serveStaticFile(
  baseDir: string,
  requestPath: string,
): Promise<Response> {
  // パス正規化・トラバーサル防止
  const normalized = normalize(decodeURIComponent(requestPath));
  const safePath = normalized.replace(/^\/+/, "");

  const filePath = join(baseDir, safePath);

  // baseDir 外へのアクセスを拒否
  if (!filePath.startsWith(baseDir)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const stat = await Deno.stat(filePath);

    if (stat.isDirectory) {
      // ディレクトリの場合は index.html を試行
      const indexPath = join(filePath, "index.html");
      try {
        const indexContent = await Deno.readFile(indexPath);
        return new Response(indexContent, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      } catch {
        return new Response("Not Found", { status: 404 });
      }
    }

    const content = await Deno.readFile(filePath);
    return new Response(content, {
      headers: { "content-type": getMimeType(filePath) },
    });
  } catch {
    // SPA フォールバック: index.html を返す
    try {
      const indexPath = join(baseDir, "index.html");
      const indexContent = await Deno.readFile(indexPath);
      return new Response(indexContent, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  }
}
