/**
 * Adlaire Deploy — ダッシュボード HTTP サーバー
 *
 * ブラウザベースの管理画面を提供する
 */

import type { ClusterManager } from "../cluster.ts";
import type { Deployer } from "../deployer.ts";
import type { ProcessManager } from "../process_manager.ts";
import { handleDashboardApi } from "./api.ts";
import {
  createSession,
  deleteSession,
  getSessionToken,
  setSessionTtl,
  validateSession,
  verifyAdminPassword,
} from "./auth.ts";

/** 静的ファイルの MIME タイプ */
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

/** セキュリティヘッダーを追加する */
function addSecurityHeaders(headers: Headers): void {
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
}

/** ダッシュボードサーバーを起動する */
export function startDashboard(
  manager: ProcessManager,
  deployer: Deployer,
  port: number,
  cluster: ClusterManager | null,
  sessionTtlConfig?: number,
): Deno.HttpServer {
  if (sessionTtlConfig) {
    setSessionTtl(sessionTtlConfig);
  }

  // 静的ファイルのベースディレクトリ
  const staticDir = new URL("./static", import.meta.url).pathname;

  const server = Deno.serve(
    { hostname: "127.0.0.1", port },
    async (request: Request): Promise<Response> => {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;
      const headers = new Headers();
      addSecurityHeaders(headers);

      // ログインページは認証不要
      if (method === "POST" && path === "/dashboard/auth/login") {
        let body: { password: string };
        try {
          body = await request.json() as { password: string };
        } catch {
          headers.set("Content-Type", "application/json");
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid request body" }),
            { status: 400, headers },
          );
        }

        if (!verifyAdminPassword(body.password)) {
          headers.set("Content-Type", "application/json");
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid password" }),
            { status: 401, headers },
          );
        }

        const { cookie } = await createSession();
        headers.set("Set-Cookie", cookie);
        headers.set("Content-Type", "application/json");
        return new Response(
          JSON.stringify({ ok: true }),
          { status: 200, headers },
        );
      }

      // ログアウト
      if (method === "POST" && path === "/dashboard/auth/logout") {
        const token = getSessionToken(request);
        if (token) {
          await deleteSession(token);
        }
        headers.set(
          "Set-Cookie",
          "adlaire_session=; HttpOnly; SameSite=Strict; Path=/dashboard; Max-Age=0",
        );
        headers.set("Content-Type", "application/json");
        return new Response(
          JSON.stringify({ ok: true }),
          { status: 200, headers },
        );
      }

      // ログインページの静的ファイルは認証不要で提供
      if (path === "/dashboard/login" || path === "/dashboard/login.html") {
        return serveLoginPage(headers);
      }

      // 認証チェック（/dashboard 以下すべて）
      if (path.startsWith("/dashboard")) {
        const token = getSessionToken(request);
        const valid = await validateSession(token);

        if (!valid) {
          // API リクエストには 401 を返す
          if (path.startsWith("/dashboard/api/")) {
            headers.set("Content-Type", "application/json");
            return new Response(
              JSON.stringify({ ok: false, error: "Unauthorized" }),
              { status: 401, headers },
            );
          }
          // HTML リクエストにはログインページへリダイレクト
          headers.set("Location", "/dashboard/login");
          return new Response(null, { status: 302, headers });
        }

        // API エンドポイント
        if (path.startsWith("/dashboard/api/")) {
          const apiResponse = await handleDashboardApi(
            request,
            path,
            manager,
            deployer,
            cluster,
          );
          if (apiResponse) {
            // セキュリティヘッダーを追加
            for (const [k, v] of headers) {
              apiResponse.headers.set(k, v);
            }
            return apiResponse;
          }
          headers.set("Content-Type", "application/json");
          return new Response(
            JSON.stringify({ ok: false, error: "Not found" }),
            { status: 404, headers },
          );
        }

        // 静的ファイル配信
        return serveStaticFile(path, staticDir, headers);
      }

      // /dashboard 以外は 404
      headers.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({ ok: false, error: "Not found" }),
        { status: 404, headers },
      );
    },
  );

  console.log(`[deploy] Dashboard listening on 127.0.0.1:${port}`);
  return server;
}

/** 静的ファイルを配信する */
async function serveStaticFile(
  path: string,
  staticDir: string,
  headers: Headers,
): Promise<Response> {
  // パスの正規化
  let filePath: string;

  if (path === "/dashboard" || path === "/dashboard/") {
    filePath = `${staticDir}/index.html`;
  } else if (path.startsWith("/dashboard/projects/")) {
    filePath = `${staticDir}/project.html`;
  } else if (path === "/dashboard/cluster") {
    filePath = `${staticDir}/cluster.html`;
  } else {
    // /dashboard/xxx.js のような静的リソース
    const relative = path.replace("/dashboard/", "");
    filePath = `${staticDir}/${relative}`;
  }

  try {
    const content = await Deno.readTextFile(filePath);
    const ext = filePath.match(/\.[^.]+$/)?.[0] ?? ".html";
    headers.set("Content-Type", MIME_TYPES[ext] ?? "text/plain");
    return new Response(content, { status: 200, headers });
  } catch {
    headers.set("Content-Type", "text/html; charset=utf-8");
    return new Response("<h1>404 Not Found</h1>", { status: 404, headers });
  }
}

/** ログインページを返す */
function serveLoginPage(headers: Headers): Response {
  headers.set("Content-Type", "text/html; charset=utf-8");
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Adlaire Deploy - Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh}
.login-box{background:#fff;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.1);padding:40px;width:360px}
h1{font-size:1.2em;color:#333;margin-bottom:24px;text-align:center}
.logo{text-align:center;margin-bottom:16px;font-size:1.4em;font-weight:700;color:#2563eb}
label{display:block;margin-bottom:6px;font-size:.9em;color:#666}
input{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:4px;font-size:1em;margin-bottom:16px}
input:focus{outline:none;border-color:#2563eb}
button{width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:4px;font-size:1em;cursor:pointer}
button:hover{background:#1d4ed8}
.error{color:#dc2626;font-size:.85em;margin-bottom:12px;display:none}
</style>
</head>
<body>
<div class="login-box">
  <div class="logo">Adlaire Deploy</div>
  <h1>Management Dashboard</h1>
  <div class="error" id="error"></div>
  <form id="form">
    <label for="password">Admin Password</label>
    <input type="password" id="password" name="password" autocomplete="current-password" required>
    <button type="submit">Login</button>
  </form>
</div>
<script>
document.getElementById("form").addEventListener("submit",async function(e){
  e.preventDefault();
  var err=document.getElementById("error");
  err.style.display="none";
  try{
    var r=await fetch("/dashboard/auth/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({password:document.getElementById("password").value})
    });
    if(r.ok){location.href="/dashboard"}
    else{err.textContent="Invalid password";err.style.display="block"}
  }catch(ex){err.textContent="Connection error";err.style.display="block"}
});
</script>
</body>
</html>`;
  return new Response(html, { status: 200, headers });
}
