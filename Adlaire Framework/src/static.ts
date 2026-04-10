/**
 * Adlaire Framework — 静的ファイル配信
 * FRAMEWORK_RULEBOOK §9 準拠
 *
 * static/ ディレクトリに配置したファイルを URL から直接配信する。
 * 静的ファイルはルートマッチングより優先される。
 */

/** Content-Type マッピング */
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
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
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".map": "application/json",
};

/**
 * ファイルパスから Content-Type を推定する。
 */
function getContentType(path: string): string {
  const ext = path.substring(path.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

/**
 * 静的ファイルの配信を試みる。
 *
 * ファイルが存在すれば Response を返す。
 * 存在しなければ null を返す（後続のルーティングに委譲）。
 */
export async function serveStaticFile(
  staticDir: string,
  pathname: string,
): Promise<Response | null> {
  // パストラバーサル防止
  const normalized = pathname.replace(/\\/g, "/");
  if (normalized.includes("..") || normalized.includes("//")) {
    return null;
  }

  const filePath = `${staticDir}${normalized}`;

  try {
    const stat = await Deno.stat(filePath);
    if (!stat.isFile) return null;

    const file = await Deno.open(filePath, { read: true });
    const contentType = getContentType(filePath);

    return new Response(file.readable, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stat.size),
      },
    });
  } catch {
    return null;
  }
}
