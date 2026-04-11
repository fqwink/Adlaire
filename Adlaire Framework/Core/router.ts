// ============================================================
// Adlaire Framework — router.ts
// ルート登録・グループ化・パスマッチング・名前付きルート
// ============================================================

import type { Handler, Method, Middleware, Route } from "./types.ts";

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
      params[seg.name] = pathParts.slice(pi).map(decodeURIComponent).join("/");
      return params;
    }
    if (pi >= pathParts.length) return null;
    if (seg.kind === "static") {
      if (seg.value !== pathParts[pi]) return null;
    } else {
      params[seg.name] = decodeURIComponent(pathParts[pi]);
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
    if (options?.name) {
      this.#namedRoutes.set(options.name, route);
    }
    return this;
  }

  get(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("GET", path, fnArgs, options);
  }
  post(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("POST", path, fnArgs, options);
  }
  put(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("PUT", path, fnArgs, options);
  }
  delete(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("DELETE", path, fnArgs, options);
  }
  patch(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("PATCH", path, fnArgs, options);
  }
  head(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    const { fnArgs, options } = splitArgs(args);
    return this.#add("HEAD", path, fnArgs, options);
  }
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
    const sorted = [...this.#routes].sort((a, b) => b.priority - a.priority);

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
      if (seg.kind === "param") return encodeURIComponent(p[seg.name] ?? "");
      if (seg.kind === "wildcard") return p[seg.name] ?? "";
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

function splitArgs(
  args: (Middleware | Handler | RouteOptions)[],
): { fnArgs: (Middleware | Handler)[]; options?: RouteOptions } {
  const last = args[args.length - 1];
  if (typeof last === "object" && last !== null && !("length" in last) && "name" in last) {
    return {
      fnArgs: args.slice(0, -1) as (Middleware | Handler)[],
      options: last as RouteOptions,
    };
  }
  return { fnArgs: args as (Middleware | Handler)[] };
}

export class RouteGroup {
  readonly #prefix: string;
  readonly #router: Router;
  readonly #middlewares: Middleware[];

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

  get(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.get(this.#prefix + path, ...this.#wrap(args)); return this;
  }
  post(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.post(this.#prefix + path, ...this.#wrap(args)); return this;
  }
  put(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.put(this.#prefix + path, ...this.#wrap(args)); return this;
  }
  delete(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.delete(this.#prefix + path, ...this.#wrap(args)); return this;
  }
  patch(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.patch(this.#prefix + path, ...this.#wrap(args)); return this;
  }
  head(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.head(this.#prefix + path, ...this.#wrap(args)); return this;
  }
  options(path: string, ...args: (Middleware | Handler | RouteOptions)[]): this {
    this.#router.options(this.#prefix + path, ...this.#wrap(args)); return this;
  }

  group(prefix: string): RouteGroup {
    return new RouteGroup(this.#prefix + prefix, this.#router, [...this.#middlewares]);
  }
}
