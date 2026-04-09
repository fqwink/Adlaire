/**
 * Adlaire Framework — ファイルベースルーティング
 * FRAMEWORK_RULEBOOK §5 準拠
 *
 * routes/ ディレクトリのファイル構造を URL パターンに変換し、
 * リクエストをマッチングする。
 */

import type {
  Handler,
  MiddlewareFunction,
  MiddlewareState,
  RouteParams,
} from "./types.ts";

/** ルート定義（内部用） */
interface RouteEntry {
  /** URL パターン（例: /users/:id） */
  pattern: URLPattern;
  /** 元のファイルパス */
  filePath: string;
  /** パラメータ名一覧 */
  paramNames: string[];
  /** ワイルドカードルートかどうか */
  isWildcard: boolean;
  /** 静的ルートかどうか */
  isStatic: boolean;
  /** ハンドラーモジュール */
  handler: Handler<RouteParams, MiddlewareState>;
}

/** ミドルウェアエントリ（内部用） */
interface MiddlewareEntry {
  /** 適用パスプレフィックス */
  prefix: string;
  /** ミドルウェア関数 */
  fn: MiddlewareFunction<MiddlewareState>;
}

/** マッチ結果 */
export interface RouteMatch {
  handler: Handler<RouteParams, MiddlewareState>;
  params: RouteParams;
  middleware: MiddlewareFunction<MiddlewareState>[];
}

/**
 * ルーター本体
 */
export class Router {
  private routes: RouteEntry[] = [];
  private middlewares: MiddlewareEntry[] = [];

  /**
   * routes/ ディレクトリを探索してルートを登録する。
   */
  async scanRoutes(routesDir: string): Promise<void> {
    this.routes = [];
    this.middlewares = [];

    await this.scanDirectory(routesDir, "/");

    // §5.2 優先度ソート: 静的 > 動的 > ワイルドカード
    this.routes.sort((a, b) => {
      if (a.isStatic && !b.isStatic) return -1;
      if (!a.isStatic && b.isStatic) return 1;
      if (!a.isWildcard && b.isWildcard) return -1;
      if (a.isWildcard && !b.isWildcard) return 1;
      return 0;
    });
  }

  /**
   * ディレクトリを再帰的に探索する。
   */
  private async scanDirectory(dir: string, urlPrefix: string): Promise<void> {
    let entries: Deno.DirEntry[];
    try {
      entries = [];
      for await (const entry of Deno.readDir(dir)) {
        entries.push(entry);
      }
    } catch {
      return;
    }

    // ファイルをソートして処理順を安定させる
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = `${dir}/${entry.name}`;

      if (entry.isDirectory) {
        // サブディレクトリを再帰探索
        const subPrefix = urlPrefix === "/"
          ? `/${entry.name}`
          : `${urlPrefix}/${entry.name}`;
        await this.scanDirectory(fullPath, subPrefix);
        continue;
      }

      if (!entry.name.endsWith(".ts")) continue;

      // §5.3 特殊ファイル（_ プレフィックス）
      if (entry.name === "_middleware.ts") {
        await this.loadMiddleware(fullPath, urlPrefix);
        continue;
      }

      if (entry.name.startsWith("_")) continue;

      // 通常ルートファイル
      await this.loadRoute(fullPath, urlPrefix, entry.name);
    }
  }

  /**
   * ミドルウェアファイルをロードする。
   */
  private async loadMiddleware(
    filePath: string,
    prefix: string,
  ): Promise<void> {
    const mod = await import(`file://${Deno.realPathSync(filePath)}`);
    const mw = mod.middleware;

    if (Array.isArray(mw)) {
      // §8.4 複数ミドルウェア
      for (const fn of mw) {
        this.middlewares.push({ prefix, fn });
      }
    } else if (typeof mw === "function") {
      this.middlewares.push({ prefix, fn: mw });
    }
  }

  /**
   * ルートファイルをロードしてパターンを登録する。
   */
  private async loadRoute(
    filePath: string,
    urlPrefix: string,
    fileName: string,
  ): Promise<void> {
    const mod = await import(`file://${Deno.realPathSync(filePath)}`);
    const handler = mod.handler;
    if (!handler) return;

    const baseName = fileName.replace(/\.ts$/, "");
    const urlPath = this.fileNameToUrlPattern(urlPrefix, baseName);
    const paramNames = this.extractParamNames(urlPath);
    const isWildcard = urlPath.includes("*");
    const isStatic = paramNames.length === 0 && !isWildcard;

    const pattern = new URLPattern({ pathname: urlPath });

    this.routes.push({
      pattern,
      filePath,
      paramNames,
      isWildcard,
      isStatic,
      handler,
    });
  }

  /**
   * ファイル名を URL パターンに変換する（§5.1）。
   *
   * - index.ts → /
   * - about.ts → /about
   * - [id].ts → /:id
   * - [...path].ts → /*
   */
  private fileNameToUrlPattern(prefix: string, baseName: string): string {
    if (baseName === "index") {
      return prefix === "/" ? "/" : prefix;
    }

    // [...path] → ワイルドカード
    const wildcardMatch = baseName.match(/^\[\.\.\.(\w+)\]$/);
    if (wildcardMatch) {
      return prefix === "/" ? "/*" : `${prefix}/*`;
    }

    // [id] → :id
    const paramMatch = baseName.match(/^\[(\w+)\]$/);
    if (paramMatch) {
      const segment = `:${paramMatch[1]}`;
      return prefix === "/" ? `/${segment}` : `${prefix}/${segment}`;
    }

    // 通常のファイル名
    return prefix === "/" ? `/${baseName}` : `${prefix}/${baseName}`;
  }

  /**
   * URL パターンからパラメータ名を抽出する。
   */
  private extractParamNames(urlPath: string): string[] {
    const names: string[] = [];
    for (const segment of urlPath.split("/")) {
      if (segment.startsWith(":")) {
        names.push(segment.slice(1));
      }
    }
    return names;
  }

  /**
   * リクエスト URL にマッチするルートを探す。
   */
  match(url: URL): RouteMatch | null {
    for (const route of this.routes) {
      const result = route.pattern.exec({ pathname: url.pathname });
      if (!result) continue;

      const params: RouteParams = {};
      const groups = result.pathname.groups;

      for (const name of route.paramNames) {
        const value = groups[name];
        if (value !== undefined) {
          params[name] = value;
        }
      }

      // ワイルドカードパラメータ
      if (route.isWildcard && groups["0"] !== undefined) {
        const wildcardValue = groups["0"];
        // [...path] の場合、ファイルパスからパラメータ名を取得
        const wildcardName = this.getWildcardParamName(route.filePath);
        params[wildcardName] = wildcardValue.split("/").filter(Boolean);
      }

      // 適用対象のミドルウェアを収集（§8.3: 外側から順に）
      const applicableMiddleware = this.middlewares
        .filter((mw) => url.pathname.startsWith(mw.prefix) || mw.prefix === "/")
        .map((mw) => mw.fn);

      return {
        handler: route.handler,
        params,
        middleware: applicableMiddleware,
      };
    }

    return null;
  }

  /**
   * ワイルドカードルートのパラメータ名を取得する。
   */
  private getWildcardParamName(filePath: string): string {
    const fileName = filePath.split("/").pop() ?? "";
    const match = fileName.match(/^\[\.\.\.(\w+)\]\.ts$/);
    return match ? match[1] : "path";
  }
}
