// ============================================================
// Adlaire Framework — router.ts
// ルート登録・グループ化・パスマッチング・名前付きルート
// ============================================================

import type { ExtractRouteParams, Handler, Method, Middleware, Route } from "./types.ts";

export interface MatchResult {
  handler: Handler;
  params: Record<string, string>;
  routeMiddlewares: Middleware[];
}

export interface RouteOptions {
  name?: string;
}

// パスセグメントを解析してパターン種別を判定する
type Segment =
  | { kind: "static"; value: string }
  | { kind: "param"; name: string }
  | { kind: "wildcard"; name: string };

function parseSegments(path: string): Segment[] {
  const parts = path.split("/").filter((s) => s !== "");
  return parts.map((s, i) => {
    if (s.startsWith("*")) {
      if (i !== parts.length - 1) {
        throw new Error(
          `ルートパス "${path}": ワイルドカード "*" は最後のセグメントにのみ使用できます`,
        );
      }
      return { kind: "wildcard", name: s.slice(1) || "wildcard" };
    }
    if (s.startsWith(":")) return { kind: "param", name: s.slice(1) };
    return { kind: "static", value: s };
  });
}

function segmentPriority(seg: Segment): number {
  if (seg.kind === "static") return 2;
  if (seg.kind === "param") return 1;
  return 0;
}

function routePriority(segments: Segment[]): number {
  return segments.reduce((acc, s) => acc * 3 + segmentPriority(s), 0);
}

function matchPath(
  segments: Segment[],
  pathParts: string[],
): Record<string, string> | null {
  const params: Record<string, string> = {};
  let pi = 0;

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    if (seg.kind === "wildcard") {
      try {
        params[seg.name] = pathParts.slice(pi).map(decodeURIComponent).join("/");
      } catch {
        return null;
      }
      return params;
    }
    if (pi >= pathParts.length) return null;
    if (seg.kind === "static") {
      if (seg.value !== pathParts[pi]) return null;
    } else {
      try {
        params[seg.name] = decodeURIComponent(pathParts[pi]);
      } catch {
        return null;
      }
    }
    pi++;
  }

  return pi === pathParts.length ? params : null;
}

interface StoredRoute {
  method: Method;
  segments: Segment[];
  priority: number;
  handler: Handler;
  middlewares: Middleware[];
  rawPath: string;
  name?: string;
}

export class Router {
  readonly #routes: StoredRoute[] = [];
  readonly #namedRoutes: Map<string, StoredRoute> = new Map();
  // ソート済みルートキャッシュ（ルート追加時に無効化）
  #sortedRoutes: StoredRoute[] | null = null;

  #add(
    method: Method,
    path: string,
    args: (Middleware | Handler)[],
    options?: RouteOptions,
  ): this {
    if (!path.startsWith("/")) {
      throw new Error(`ルートパスは "/" で始まる必要があります: "${path}"`);
    }
    // 最後の引数が handler、それ以前が middleware
    const handler = args[args.length - 1] as Handler;
    const middlewares = args.slice(0, -1) as Middleware[];
    const segments = parseSegments(path);
    const route: StoredRoute = {
      method,
      segments,
      priority: routePriority(segments),
      handler,
      middlewares,
      rawPath: path,
      name: options?.name,
    };
    this.#routes.push(route);
    this.#sortedRoutes = null; // キャッシュを無効化
    if (options?.name) {
      this.#namedRoutes.set(options.name, route);
    }
    return this;
  }

  get<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  get<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  get(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("GET", path, fnArgs, options);
  }

  post<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  post<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  post(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("POST", path, fnArgs, options);
  }

  put<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  put<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  put(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("PUT", path, fnArgs, options);
  }

  delete<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  delete<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  delete(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("DELETE", path, fnArgs, options);
  }

  patch<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  patch<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  patch(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("PATCH", path, fnArgs, options);
  }

  head<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  head<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  head(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("HEAD", path, fnArgs, options);
  }

  options<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  options<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  options(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("OPTIONS", path, fnArgs, options);
  }

  group(prefix: string): RouteGroup {
    return new RouteGroup(prefix, this, []);
  }

  match(method: Method, url: string): MatchResult | null {
    const parsedUrl = new URL(url, "http://localhost");
    const pathParts = parsedUrl.pathname.split("/").filter((s) => s !== "");
    // ソート済みキャッシュを使用（リクエストごとの O(n log n) ソートを回避）
    if (this.#sortedRoutes === null) {
      this.#sortedRoutes = [...this.#routes].sort((a, b) => b.priority - a.priority);
    }
    const sorted = this.#sortedRoutes;

    let headFallback: MatchResult | null = null;

    for (const route of sorted) {
      if (route.method === method) {
        const params = matchPath(route.segments, pathParts);
        if (params !== null) {
          return { handler: route.handler, params, routeMiddlewares: route.middlewares };
        }
      } else if (method === "HEAD" && route.method === "GET") {
        if (headFallback === null) {
          const params = matchPath(route.segments, pathParts);
          if (params !== null) {
            headFallback = { handler: route.handler, params, routeMiddlewares: route.middlewares };
          }
        }
      }
    }

    if (method === "HEAD" && headFallback !== null) {
      return headFallback;
    }
    return null;
  }

  hasPath(url: string): boolean {
    const parsedUrl = new URL(url, "http://localhost");
    const pathParts = parsedUrl.pathname.split("/").filter((s) => s !== "");
    return this.#routes.some((r) => matchPath(r.segments, pathParts) !== null);
  }

  url(name: string, params?: Record<string, string>): string {
    const route = this.#namedRoutes.get(name);
    if (!route) throw new Error(`名前付きルート "${name}" は登録されていません`);
    const p = params ?? {};
    return "/" + route.segments.map((seg) => {
      if (seg.kind === "static") return seg.value;
      if (seg.kind === "param") {
        const v = p[seg.name];
        if (v === undefined) throw new Error(`パラメータ "${seg.name}" が指定されていません`);
        return encodeURIComponent(v);
      }
      if (seg.kind === "wildcard") {
        const v = p[seg.name];
        if (v === undefined) throw new Error(`パラメータ "${seg.name}" が指定されていません`);
        return v;
      }
      return "";
    }).join("/");
  }

  routes(): ReadonlyArray<Route> {
    return this.#routes.map((r) => ({
      method: r.method,
      path: r.rawPath,
      handler: r.handler,
    }));
  }
}

function isRouteOptions(v: unknown): v is RouteOptions {
  return typeof v === "object" && v !== null && typeof (v as Record<string, unknown>).name === "string";
}

function splitArgs(
  args: (Middleware | Handler | RouteOptions)[],
): { fnArgs: (Middleware | Handler)[]; options?: RouteOptions } {
  const last = args[args.length - 1];
  if (isRouteOptions(last)) {
    return {
      fnArgs: args.slice(0, -1) as (Middleware | Handler)[],
      options: { name: last.name },
    };
  }
  return { fnArgs: args as (Middleware | Handler)[] };
}

export class RouteGroup {
  readonly #prefix: string;
  readonly #router: Router;
  readonly #middlewares: Middleware[];

  /** @internal router.group() 経由でのみ生成すること */
  constructor(prefix: string, router: Router, middlewares: Middleware[]) {
    this.#prefix = prefix;
    this.#router = router;
    this.#middlewares = middlewares;
  }

  use(mw: Middleware): this {
    this.#middlewares.push(mw);
    return this;
  }

  #wrap(args: (Middleware | Handler | RouteOptions)[]): (Middleware | Handler | RouteOptions)[] {
    const { fnArgs, options } = splitArgs(args);
    // グループミドルウェアをルートミドルウェアの前に挿入
    return [...this.#middlewares, ...fnArgs, ...(options ? [options] : [])];
  }

  get<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  get<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  get(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.get(this.#prefix + path, ...this.#wrap(args)); return this;
  }

  post<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  post<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  post(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.post(this.#prefix + path, ...this.#wrap(args)); return this;
  }

  put<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  put<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  put(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.put(this.#prefix + path, ...this.#wrap(args)); return this;
  }

  delete<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  delete<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  delete(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.delete(this.#prefix + path, ...this.#wrap(args)); return this;
  }

  patch<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  patch<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  patch(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.patch(this.#prefix + path, ...this.#wrap(args)); return this;
  }

  head<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  head<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  head(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.head(this.#prefix + path, ...this.#wrap(args)); return this;
  }

  options<Path extends string>(path: Path, handler: Handler<ExtractRouteParams<Path>>, options?: RouteOptions): this;
  options<Path extends string>(path: Path, ...args: (Middleware | Handler<ExtractRouteParams<Path>> | RouteOptions)[]): this;
  options(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.options(this.#prefix + path, ...this.#wrap(args)); return this;
  }

  group(prefix: string): RouteGroup {
    return new RouteGroup(this.#prefix + prefix, this.#router, [...this.#middlewares]);
  }
}
