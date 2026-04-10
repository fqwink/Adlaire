/**
 * Adlaire Framework — HTTP サーバー
 * FRAMEWORK_RULEBOOK §1.4 / §4.2 / §10 準拠
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
import { ValidationError } from "./error.ts";
import { Router } from "./router.ts";
import { serveStaticFile } from "./static.ts";
import { badRequestResponse, notFoundResponse } from "./response.ts";

/** ライフサイクルフックを除く解決済み設定型 */
interface ResolvedBaseConfig {
  port: number;
  routes_dir: string;
  static_dir: string | null;
  style: { adlaire_style: boolean };
  deploy: "deno-deploy" | "adlaire-deploy" | "js" | "auto";
}

/** デフォルト設定 */
const DEFAULT_CONFIG: ResolvedBaseConfig = {
  port: 8000,
  routes_dir: "./routes",
  static_dir: "./static",
  style: { adlaire_style: false },
  deploy: "auto",
};

/**
 * 設定をマージする（ライフサイクルフックを除く）。
 */
function mergeConfig(userConfig: AdlaireConfig): ResolvedBaseConfig {
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
  const { onStart, onStop } = userConfig;
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

  const server = Deno.serve({ port: config.port }, async (req: Request): Promise<Response> => {
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
      // §6.6: ValidationError は 400 に変換し _error.ts には渡さない
      if (error instanceof ValidationError) {
        return badRequestResponse(error.message);
      }
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

  console.log(`Adlaire Framework listening on http://localhost:${config.port}`);

  // §4.2: onStart フック
  if (onStart) {
    try {
      await onStart(config.port);
    } catch (err) {
      console.error("onStart hook failed:", err);
      await server.shutdown();
      Deno.exit(1);
    }
  }

  // §4.2: シグナル受信時の onStop フック + シャットダウン
  const handleStop = async () => {
    if (onStop) {
      try {
        await onStop();
      } catch (err) {
        console.error("onStop hook error:", err);
      }
    }
    await server.shutdown();
  };

  try {
    Deno.addSignalListener("SIGTERM", handleStop);
    Deno.addSignalListener("SIGINT", handleStop);
  } catch {
    // シグナルリスナー非対応環境（Deno Deploy 等）では無視する
  }

  await server.finished;
}
