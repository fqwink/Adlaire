/**
 * Adlaire Framework — 共通型定義
 * FRAMEWORK_RULEBOOK §6.3 / §6.6 / §6.7 / §7 / §8 準拠
 */

import type { CookieOptions, Cookies } from "./cookies.ts";
export type { CookieOptions, Cookies };

/** ルートパラメータの基底型 */
export type RouteParams = Record<string, string | string[]>;

/** ミドルウェア状態の基底型 */
export type MiddlewareState = Record<string, unknown>;

/** HTTP メソッド */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

/** レスポンス初期化オプション */
export type ResponseInit = globalThis.ResponseInit;

/** リダイレクトステータスコード */
export type RedirectStatus = 301 | 302 | 307 | 308;

/**
 * 型付きリクエストコンテキスト（§6.3）
 *
 * フレームワークが自動生成する型パラメータにより、
 * ルートパラメータとミドルウェア状態が型安全に参照できる。
 */
export interface Context<
  Params extends RouteParams = Record<string, never>,
  State extends MiddlewareState = Record<string, never>,
> {
  /** 生の Request オブジェクト */
  readonly req: Request;
  /** ルートパラメータ（フレームワークが自動型付け） */
  readonly params: Readonly<Params>;
  /** ミドルウェア状態 */
  state: State;
  /** パース済み URL */
  readonly url: URL;
  /** クエリパラメータ（§6.5）— 同名キーは最初の値のみ保持 */
  readonly query: Readonly<Record<string, string>>;
  /** Cookie の読み書き（§6.7） */
  readonly cookies: Cookies;
  /** リクエストボディの JSON パース + 型ガード（§6.6） */
  body<T>(guard?: (data: unknown) => data is T): Promise<T>;

  // --- レスポンスヘルパー（§7.2） ---
  json<T>(data: T, init?: ResponseInit): Response;
  text(data: string, init?: ResponseInit): Response;
  html(data: string, init?: ResponseInit): Response;
  redirect(url: string, status?: RedirectStatus): Response;

  // --- エラーレスポンス（§7.3） ---
  notFound(): Response;
  unauthorized(): Response;
  forbidden(): Response;
  badRequest(message?: string): Response;
  internalError(message?: string): Response;
}

/**
 * メソッド別ハンドラーマップ（§7.1 形式A）
 */
export type MethodHandlers<
  Params extends RouteParams = Record<string, never>,
  State extends MiddlewareState = Record<string, never>,
> = {
  [M in HttpMethod]?: (
    ctx: Context<Params, State>,
  ) => Response | Promise<Response>;
};

/**
 * 単一ハンドラー関数（§7.1 形式B）
 */
export type SingleHandler<
  Params extends RouteParams = Record<string, never>,
  State extends MiddlewareState = Record<string, never>,
> = (ctx: Context<Params, State>) => Response | Promise<Response>;

/**
 * ハンドラー型（形式A または 形式B）
 */
export type Handler<
  Params extends RouteParams = Record<string, never>,
  State extends MiddlewareState = Record<string, never>,
> = MethodHandlers<Params, State> | SingleHandler<Params, State>;

/**
 * ミドルウェア next 関数
 */
export type NextFunction = () => Response | Promise<Response>;

/**
 * ミドルウェア関数
 */
export type MiddlewareFunction<
  State extends MiddlewareState = Record<string, never>,
> = (
  ctx: Context<RouteParams, State>,
  next: NextFunction,
) => Response | Promise<Response>;

/**
 * 解決済みルート情報（内部用）
 */
export interface ResolvedRoute {
  /** マッチしたファイルパス */
  filePath: string;
  /** 抽出されたパラメータ */
  params: Record<string, string | string[]>;
  /** ハンドラーモジュール */
  handler: Handler;
  /** 適用されるミドルウェアチェーン */
  middleware: MiddlewareFunction[];
}

/**
 * Not Found ハンドラー（§5.5）
 * `routes/_404.ts` から `notFoundHandler` としてエクスポートする。
 */
export type NotFoundHandler = (
  ctx: Context<RouteParams, MiddlewareState>,
) => Response | Promise<Response>;

/**
 * エラーハンドラー（§5.5）
 * `routes/_error.ts` から `errorHandler` としてエクスポートする。
 */
export type ErrorHandler = (
  error: unknown,
  ctx: Context<RouteParams, MiddlewareState>,
) => Response | Promise<Response>;

/**
 * フレームワーク設定（§4）
 */
export interface AdlaireConfig {
  /** リッスンポート（デフォルト: 8000） */
  port?: number;
  /** ルートディレクトリ（デフォルト: "./routes"） */
  routes_dir?: string;
  /** 静的ファイルディレクトリ（デフォルト: "./static"、null で無効化） */
  static_dir?: string | null;
  /** Adlaire Style 設定 */
  style?: {
    adlaire_style?: boolean;
  };
  /** デプロイターゲット */
  deploy?: "deno-deploy" | "adlaire-deploy" | "js" | "auto";
}
