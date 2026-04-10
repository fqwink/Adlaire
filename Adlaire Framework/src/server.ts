/**
 * Adlaire Framework — HTTP サーバー
 * FRAMEWORK_RULEBOOK §1.4 / §10 準拠
 *
 * Deno.serve ベースの HTTP サーバー起動・リクエスト処理。
 */

import type {
  AdlaireConfig,
  Context,
  Handler,
  HttpMethod,
  MiddlewareState,
  RouteParams,
} from "./types.ts";
import { createContext } from "./context.ts";
import { isMethodHandlers, isSingleHandler, SUPPORTED_METHODS } from "./handler.ts";
import { executeMiddlewareChain } from "./middleware.ts";
import { Router } from "./router.ts";
import { serveStaticFile } from "./static.ts";
import { notFoundResponse } from "./response.ts";

/** デフォルト設定 */
const DEFAULT_CONFIG: Required<AdlaireConfig> = {
  port: 8000,
  routes_dir: "./routes",
  static_dir: "./static",
  style: { adlaire_style: false },
  deploy: "auto",
};

/**
 * 設定をマージする。
 */
function mergeConfig(userConfig: AdlaireConfig): Required<AdlaireConfig> {
  return {
    port: userConfig.port ?? DEFAULT_CONFIG.port,
    routes_dir: userConfig.routes_dir ?? DEFAULT_CONFIG.routes_dir,
    static_dir: userConfig.static_dir ?? DEFAULT_CONFIG.static_dir,
    style: {
      adlaire_style: userConfig.style?.adlaire_style ?? DEFAULT_CONFIG.style.adlaire_style,
    },
    deploy: userConfig.deploy ?? DEFAULT_CONFIG.deploy,
  };
}

/**
 * ハンドラーを実行して Response を得る。
 */
function invokeHandler(
  handler: Handler<RouteParams, MiddlewareState>,
  method: string,
  ctx: Context<RouteParams, MiddlewareState>,
): Response | Promise<Response> {
  if (isSingleHandler<RouteParams, MiddlewareState>(handler)) {
    return handler(ctx);
  }

  if (isMethodHandlers<RouteParams, MiddlewareState>(handler)) {
    const methodHandler = handler[method as HttpMethod];
    if (methodHandler) {
      return methodHandler(ctx);
    }
    // メソッドが対応していない
    const allowed = Object.keys(handler)
      .filter((m) => SUPPORTED_METHODS.has(m as HttpMethod))
      .join(", ");
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: allowed },
    });
  }

  return notFoundResponse();
}

/**
 * Adlaire Framework サーバーを起動する。
 *
 * ```typescript
 * import { serve } from "adlaire-framework/mod.ts";
 * await serve({ port: 8000 });
 * ```
 */
export async function serve(userConfig: AdlaireConfig = {}): Promise<void> {
  const config = mergeConfig(userConfig);
  const router = new Router();

  // ルート探索
  const routesDir = config.routes_dir.startsWith("/")
    ? config.routes_dir
    : `${Deno.cwd()}/${config.routes_dir}`;

  await router.scanRoutes(routesDir);

  // 静的ファイルディレクトリの解決
  const staticDir = config.static_dir !== null
    ? (config.static_dir.startsWith("/")
      ? config.static_dir
      : `${Deno.cwd()}/${config.static_dir}`)
    : null;

  console.log(`Adlaire Framework listening on http://localhost:${config.port}`);

  Deno.serve({ port: config.port }, async (req: Request): Promise<Response> => {
    const url = new URL(req.url);

    // §9: 静的ファイルはルートマッチングより優先
    if (staticDir) {
      const staticResponse = await serveStaticFile(staticDir, url.pathname);
      if (staticResponse) return staticResponse;
    }

    // ルートマッチング
    const match = router.match(url);
    if (!match) {
      // §5.5: _404.ts ハンドラーが存在すれば呼び出す
      const notFoundHandler = router.getNotFoundHandler(url.pathname);
      if (notFoundHandler) {
        try {
          const ctx404 = createContext<RouteParams, MiddlewareState>(req, {}, {});
          return await notFoundHandler(ctx404);
        } catch (_e) {
          // _404.ts 自体がエラーを出した場合はデフォルトにフォールバック
        }
      }
      return notFoundResponse();
    }

    // Context 生成
    const ctx = createContext<RouteParams, MiddlewareState>(
      req,
      match.params,
      {},
    );

    try {
      // ミドルウェアチェーン + ハンドラー実行
      if (match.middleware.length > 0) {
        return await executeMiddlewareChain(
          ctx,
          match.middleware,
          () => invokeHandler(match.handler, req.method, ctx),
        );
      }

      return await invokeHandler(match.handler, req.method, ctx);
    } catch (error) {
      console.error("Unhandled error:", error);
      // §5.5: _error.ts ハンドラーが存在すれば呼び出す
      const errorHandler = router.getErrorHandler(url.pathname);
      if (errorHandler) {
        try {
          return await errorHandler(error, ctx);
        } catch (_e) {
          // _error.ts 自体がエラーを出した場合はデフォルトにフォールバック
        }
      }
      return new Response(
        JSON.stringify({ error: "Internal Server Error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        },
      );
    }
  });
}
