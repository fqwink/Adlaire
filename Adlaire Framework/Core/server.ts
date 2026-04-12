// ============================================================
// Adlaire Framework — server.ts
// App クラス・サーバー起動・エラーハンドラー
// ============================================================

import type {
  Context,
  ErrorHandler,
  Method,
  Middleware,
} from "./types.ts";
import { HTTPError } from "./types.ts";
import { Router } from "./router.ts";

// JSON エラーレスポンスのインライン構築（response.ts への依存を排除）
function jsonErr(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8" },
  });
}

// ------------------------------------------------------------
// Method 型ガード
// ------------------------------------------------------------

const METHODS: ReadonlySet<string> = new Set<Method>([
  "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS",
]);

function isMethod(s: string): s is Method {
  return METHODS.has(s);
}

// ------------------------------------------------------------
// §6.1 App クラス
// ------------------------------------------------------------

export interface TestRequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
}

// ------------------------------------------------------------
// §6.1 TestResponse
// ------------------------------------------------------------

export class TestResponse {
  readonly status: number;
  readonly ok: boolean;
  readonly headers: Headers;
  readonly #response: Response;

  constructor(response: Response) {
    this.#response = response;
    this.status = response.status;
    this.ok = response.ok;
    this.headers = response.headers;
  }

  async json<T = unknown>(): Promise<T> {
    return this.#response.json() as Promise<T>;
  }

  async text(): Promise<string> {
    return this.#response.text();
  }
}

// ------------------------------------------------------------
// §6.1 App クラス
// ------------------------------------------------------------

export class App {
  readonly router: Router;
  readonly #middlewares: Middleware[] = [];
  readonly #errorHandlers: ErrorHandler[] = [];
  readonly #listenCallbacks: (() => void | Promise<void>)[] = [];
  readonly #closeCallbacks: (() => void | Promise<void>)[] = [];
  #server: Deno.HttpServer | null = null;

  constructor() {
    this.router = new Router();
  }

  use<S extends Record<string, unknown> = Record<string, unknown>>(
    mw: Middleware<S>,
  ): this {
    // S は Record<string, unknown> のサブタイプ。内部では統一型で管理する
    this.#middlewares.push(mw as Middleware);
    return this;
  }

  onError(h: ErrorHandler): this {
    this.#errorHandlers.push(h);
    return this;
  }

  onListen(cb: () => void | Promise<void>): this {
    this.#listenCallbacks.push(cb);
    return this;
  }

  onClose(cb: () => void | Promise<void>): this {
    this.#closeCallbacks.push(cb);
    return this;
  }

  fetch: Deno.ServeHandler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const rawMethod = req.method;

    // 未知のメソッドは 405 を返す
    if (!isMethod(rawMethod)) {
      return jsonErr({ error: "Method Not Allowed" }, 405);
    }

    const method: Method = rawMethod;

    // クエリストリング
    const query: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) {
      query[k] = v;
    }

    // ボディパース（§4.1）
    const body = await parseBody(req, method);

    // ルートマッチング
    const matched = this.router.match(method, req.url);
    if (matched === null) {
      // パスはマッチするがメソッド不一致かを確認（全メソッドで検索）
      if (this.router.hasPath(req.url)) {
        return jsonErr({ error: "Method Not Allowed" }, 405);
      }
      return jsonErr({ error: "Not Found" }, 404);
    }

    const ctx: Context = {
      req,
      params: matched.params,
      query,
      body,
      state: {},
    };

    // ミドルウェアチェーン + ハンドラー実行
    let response: Response;
    try {
      // グローバルミドルウェア → ルートレベルミドルウェア → ハンドラー
      const allMiddlewares = [...this.#middlewares, ...matched.routeMiddlewares];
      response = await runChain(ctx, allMiddlewares, () => matched.handler(ctx));
    } catch (err) {
      return await this.#handleError(err, ctx);
    }

    // HEAD リクエストはボディを除去する（§7.3）
    if (method === "HEAD") {
      return new Response(null, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    return response;
  };

  #handleError = async (err: unknown, ctx: Context): Promise<Response> => {
    for (const handler of this.#errorHandlers) {
      try {
        const res = await handler(err, ctx);
        if (res instanceof Response) return res;
      } catch (handlerErr) {
        // エラーハンドラー自体が失敗した場合はログに残して次へ
        console.error("[Adlaire Framework] onError ハンドラーがエラーをスローしました:", handlerErr);
      }
    }
    // フォールバック
    if (err instanceof HTTPError) {
      const body: { error: string; detail?: unknown } = { error: err.message };
      if (err.detail !== undefined) body.detail = err.detail;
      return jsonErr(body, err.status);
    }
    return jsonErr({ error: "Internal Server Error" }, 500);
  };

  listen(port: number, cb?: () => void): Deno.HttpServer {
    this.#server = Deno.serve({ port }, this.fetch);
    cb?.();
    // onListen コールバックを起動後に実行する（非同期エラーは握りつぶさずにログ出力）
    for (const cb of this.#listenCallbacks) {
      Promise.resolve(cb()).catch((e) =>
        console.error("[Adlaire Framework] onListen コールバックでエラーが発生しました:", e)
      );
    }
    return this.#server;
  }

  async close(): Promise<void> {
    if (this.#server !== null) {
      await this.#server.shutdown();
      this.#server = null;
      for (const cb of this.#closeCallbacks) {
        try {
          await cb();
        } catch (e) {
          console.error("[Adlaire Framework] onClose コールバックでエラーが発生しました:", e);
        }
      }
    }
  }

  async testRequest(
    method: string,
    path: string,
    options?: TestRequestOptions,
  ): Promise<TestResponse> {
    const url = `http://localhost${path}`;
    const headers = new Headers(options?.headers);
    let body: BodyInit | null = null;
    if (options?.body !== undefined) {
      body = JSON.stringify(options.body);
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
    }
    const req = new Request(url, { method, headers, body });
    const response = await this.fetch(req);
    return new TestResponse(response);
  }
}

async function runChain(
  ctx: Context,
  middlewares: Middleware[],
  handler: () => Promise<Response> | Response,
): Promise<Response> {
  let index = 0;
  let handlerCalled = false;

  const next = (): Promise<Response> => {
    if (index < middlewares.length) {
      const mw = middlewares[index++];
      return mw(ctx, next);
    }
    // ハンドラーが二重に呼ばれることを防ぐ
    if (handlerCalled) {
      throw new Error("next() は各ミドルウェアで一度だけ呼び出してください");
    }
    handlerCalled = true;
    return Promise.resolve(handler());
  };

  return next();
}

async function parseBody(req: Request, method: Method): Promise<unknown> {
  // ボディを持たないメソッドはパースしない
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const contentType = req.headers.get("Content-Type") ?? "";
  const baseType = contentType.split(";")[0].trim();

  try {
    if (baseType === "application/json") {
      return await req.json();
    }
    if (baseType === "text/plain") {
      return await req.text();
    }
    if (baseType === "application/x-www-form-urlencoded") {
      const text = await req.text();
      const params = new URLSearchParams(text);
      const result: Record<string, string> = {};
      for (const [k, v] of params.entries()) {
        result[k] = v;
      }
      return result;
    }
    if (baseType === "multipart/form-data") {
      return await req.formData();
    }
    return null;
  } catch {
    return null;
  }
}

export function createServer(): App {
  return new App();
}

// §6.2 loadEnv() は @adlaire/fw/env（Core/env.ts）に移動済み（Ver.1.3-8）
