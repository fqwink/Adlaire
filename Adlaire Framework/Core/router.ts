// ============================================================
// Adlaire Framework — router.ts
// ルート登録・グループ化・パスマッチング
// ============================================================

import type { Handler, Method, Route } from "./types.ts";

export interface MatchResult {
  handler: Handler;
  params: Record<string, string>;
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
      // ワイルドカードは最後のセグメントにのみ使用可
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

// 優先度: static=2, param=1, wildcard=0
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
      // ワイルドカードは残りのパス全体を吸収する（最後のセグメントのみ許可）
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

  // すべてのセグメントを消費し、かつパスパーツも消費し切っている場合のみ一致
  return pi === pathParts.length ? params : null;
}

interface StoredRoute {
  method: Method;
  segments: Segment[];
  priority: number;
  handler: Handler;
  rawPath: string;
}

export class Router {
  readonly #routes: StoredRoute[] = [];

  #add(method: Method, path: string, handler: Handler): this {
    if (!path.startsWith("/")) {
      throw new Error(`ルートパスは "/" で始まる必要があります: "${path}"`);
    }
    const segments = parseSegments(path);
    this.#routes.push({
      method,
      segments,
      priority: routePriority(segments),
      handler,
      rawPath: path,
    });
    return this;
  }

  get(path: string, handler: Handler): this { return this.#add("GET", path, handler); }
  post(path: string, handler: Handler): this { return this.#add("POST", path, handler); }
  put(path: string, handler: Handler): this { return this.#add("PUT", path, handler); }
  delete(path: string, handler: Handler): this { return this.#add("DELETE", path, handler); }
  patch(path: string, handler: Handler): this { return this.#add("PATCH", path, handler); }
  head(path: string, handler: Handler): this { return this.#add("HEAD", path, handler); }
  options(path: string, handler: Handler): this { return this.#add("OPTIONS", path, handler); }

  group(prefix: string): RouteGroup {
    return new RouteGroup(prefix, this);
  }

  match(method: Method, url: string): MatchResult | null {
    const parsedUrl = new URL(url, "http://localhost");
    const pathParts = parsedUrl.pathname.split("/").filter((s) => s !== "");

    // 優先度降順でソートして最初にマッチしたルートを返す
    const sorted = [...this.#routes].sort((a, b) => b.priority - a.priority);

    // HEAD の場合: 明示 HEAD ルートを先に探し、なければ GET フォールバック
    let headFallback: { handler: Handler; params: Record<string, string> } | null = null;

    for (const route of sorted) {
      if (route.method === method) {
        const params = matchPath(route.segments, pathParts);
        if (params !== null) return { handler: route.handler, params };
      } else if (method === "HEAD" && route.method === "GET") {
        // GET フォールバック候補: 最優先のものを保存
        if (headFallback === null) {
          const params = matchPath(route.segments, pathParts);
          if (params !== null) {
            headFallback = { handler: route.handler, params };
          }
        }
      }
    }

    // HEAD フォールバック（params を正しく引き継ぐ）
    if (method === "HEAD" && headFallback !== null) {
      return headFallback;
    }

    return null;
  }

  /** パスにマッチするルートが（メソッド不問で）存在するか確認する（405 判定用） */
  hasPath(url: string): boolean {
    const parsedUrl = new URL(url, "http://localhost");
    const pathParts = parsedUrl.pathname.split("/").filter((s) => s !== "");
    return this.#routes.some((r) => matchPath(r.segments, pathParts) !== null);
  }

  routes(): ReadonlyArray<Route> {
    return this.#routes.map((r) => ({
      method: r.method,
      path: r.rawPath,
      handler: r.handler,
    }));
  }
}

export class RouteGroup {
  readonly #prefix: string;
  readonly #router: Router;

  constructor(prefix: string, router: Router) {
    this.#prefix = prefix;
    this.#router = router;
  }

  get(path: string, handler: Handler): this { this.#router.get(this.#prefix + path, handler); return this; }
  post(path: string, handler: Handler): this { this.#router.post(this.#prefix + path, handler); return this; }
  put(path: string, handler: Handler): this { this.#router.put(this.#prefix + path, handler); return this; }
  delete(path: string, handler: Handler): this { this.#router.delete(this.#prefix + path, handler); return this; }
  patch(path: string, handler: Handler): this { this.#router.patch(this.#prefix + path, handler); return this; }
  head(path: string, handler: Handler): this { this.#router.head(this.#prefix + path, handler); return this; }
  options(path: string, handler: Handler): this { this.#router.options(this.#prefix + path, handler); return this; }

  group(prefix: string): RouteGroup {
    return new RouteGroup(this.#prefix + prefix, this.#router);
  }
}
