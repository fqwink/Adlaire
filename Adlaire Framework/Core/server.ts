// ============================================================
// Adlaire Framework — server.ts
// App クラス・サーバー起動・エラーハンドラー・env 管理
// ============================================================

import type {
  Context,
  EnvResult,
  EnvSchema,
  ErrorHandler,
  Method,
  Middleware,
} from "./types.ts";
import { HTTPError } from "./types.ts";
import { Router } from "./router.ts";
import { json } from "./response.ts";

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

export class App {
  readonly router: Router;
  readonly #middlewares: Middleware[] = [];
  readonly #errorHandlers: ErrorHandler[] = [];
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

  fetch = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const rawMethod = req.method;

    // 未知のメソッドは 405 を返す
    if (!isMethod(rawMethod)) {
      return json({ error: "Method Not Allowed" }, 405);
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
        return json({ error: "Method Not Allowed" }, 405);
      }
      return json({ error: "Not Found" }, 404);
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
      } catch {
        // このエラーハンドラーが失敗した場合は次へ
      }
    }
    // フォールバック
    if (err instanceof HTTPError) {
      const body: { error: string; detail?: unknown } = { error: err.message };
      if (err.detail !== undefined) body.detail = err.detail;
      return json(body, err.status);
    }
    return json({ error: "Internal Server Error" }, 500);
  };

  listen(port: number, cb?: () => void): Deno.HttpServer {
    this.#server = Deno.serve({ port }, this.fetch);
    cb?.();
    return this.#server;
  }

  async close(): Promise<void> {
    if (this.#server !== null) {
      await this.#server.shutdown();
      this.#server = null;
    }
  }

  async testRequest(
    method: string,
    path: string,
    options?: TestRequestOptions,
  ): Promise<Response> {
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
    return this.fetch(req);
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
    // multipart/form-data は Phase 3 実装予定
    return null;
  } catch {
    return null;
  }
}

export function createServer(): App {
  return new App();
}

// ------------------------------------------------------------
// §6.2 loadEnv()
// ------------------------------------------------------------

// オーバーロード: スキーマなし
export function loadEnv(path?: string): Promise<void>;
// オーバーロード: スキーマあり
export function loadEnv<S extends EnvSchema>(options: {
  path?: string;
  schema: S;
}): Promise<EnvResult<S>>;

export async function loadEnv<S extends EnvSchema>(
  pathOrOptions?: string | { path?: string; schema: S },
): Promise<void | EnvResult<S>> {
  let filePath: string;
  let schema: S | undefined;

  if (typeof pathOrOptions === "string" || pathOrOptions === undefined) {
    filePath = pathOrOptions ?? ".env";
    schema = undefined;
  } else {
    filePath = pathOrOptions.path ?? ".env";
    schema = pathOrOptions.schema;
  }

  // .env ファイルを読み込む
  let raw: string;
  try {
    raw = await Deno.readTextFile(filePath);
  } catch {
    raw = "";
  }

  // パース（インラインコメント対応・クォート除去）
  const envMap: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // 前後が同じクォートの場合のみ除去（"val" → val、'val' → val）
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    envMap[key] = val;
    Deno.env.set(key, val);
  }

  if (schema === undefined) return;

  // スキーマあり: 型変換・バリデーション
  const result: Record<string, string | number | boolean> = {};

  for (const [key, rule] of Object.entries(schema)) {
    const rawVal = envMap[key] ?? Deno.env.get(key);

    if (rawVal === undefined) {
      if (rule.required && rule.default === undefined) {
        throw new Error(`loadEnv: 必須の環境変数 "${key}" が設定されていません`);
      }
      if (rule.default !== undefined) {
        result[key] = rule.default;
      } else {
        // required でなく default もない場合: 型に応じたゼロ値を設定
        switch (rule.type) {
          case "number":
          case "port":
            result[key] = 0;
            break;
          case "boolean":
            result[key] = false;
            break;
          default:
            result[key] = "";
        }
      }
      continue;
    }

    switch (rule.type) {
      case "string":
        result[key] = rawVal;
        break;
      case "number": {
        const n = Number(rawVal);
        if (Number.isNaN(n)) {
          throw new Error(`loadEnv: "${key}" を数値に変換できません: "${rawVal}"`);
        }
        result[key] = n;
        break;
      }
      case "port": {
        const p = Number(rawVal);
        if (!Number.isInteger(p) || p < 1 || p > 65535) {
          throw new Error(
            `loadEnv: "${key}" は 1〜65535 の整数である必要があります: "${rawVal}"`,
          );
        }
        result[key] = p;
        break;
      }
      case "boolean":
        result[key] = rawVal === "true";
        break;
    }
  }

  return result as EnvResult<S>;
}
