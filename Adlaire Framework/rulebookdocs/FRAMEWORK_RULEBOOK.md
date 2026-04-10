# Adlaire Framework — フレームワーク仕様ルールブック

> **文書バージョン: Ver.1.24**
> **最終更新: 2026-04-10**

---

# 1. 製品定義

## 1.1 概要

**Adlaire Framework** は、Adlaire Group の全プロジェクトに共通して適用する TypeScript 製 Web フレームワークである。

本フレームワークは **3 つの絶対原則** を柱とする。絶対原則はいかなる設計変更・機能追加においても損なってはならない。

| 絶対原則 | 概要 |
|---------|------|
| **§1.2 型安全** | 型安全はフレームワークが決める。開発者が決めることはできない |
| **§1.3 npm 全面禁止** | `npm:` プレフィックスのインポートを全面禁止する |
| **§1.4 Deno ランタイム** | Deno ランタイムで動作する。Deno ランタイムベースの Deploy および Adlaire Deploy の双方に対応する |

## 1.2 絶対原則: 型安全

> **Adlaire Framework を採用したとき、型安全はフレームワークが決める。開発者が決めることはできない。**

Adlaire Framework が型安全を強制する。開発者はいかなる手段によっても型安全を迂回・緩和・上書きできない。

### 強制事項

| 対象 | 強制内容 |
|------|---------|
| **ルートパラメータ** | ファイル名（`[id].ts` 等）からフレームワークが型を自動生成する。開発者が手書きで上書き禁止 |
| **ハンドラー引数** | `defineHandler` を必ず経由する。直接 `Request` / `Response` を扱う実装を禁止 |
| **ミドルウェア状態** | `defineMiddleware` の型引数でフレームワークが `ctx.state` の型を決定する。`any` による型消去を禁止 |
| **レスポンス** | `ctx.json()` 等のフレームワーク提供メソッドのみ使用する。`new Response()` の直接生成を禁止 |

### 禁止事項（コンパイルエラーまたはビルドエラー）

| 禁止 | 理由 |
|------|------|
| `any` 型の使用 | 型情報を消去するため |
| `as unknown as T` 等の強制キャスト | 型安全を迂回するため |
| `ctx.params` の手動型定義 | フレームワークが自動提供するため |
| `defineHandler` を経由しないハンドラー実装 | フレームワークの型付けが適用されないため |
| `@ts-ignore` / `@ts-expect-error` の使用 | 型エラーを隠蔽するため |

## 1.3 絶対原則: npm 全面禁止

> **Adlaire Framework を採用したとき、`npm:` プレフィックスのインポートを全面禁止する。いかなる例外も認めない。**

サプライチェーン攻撃・依存関係混乱攻撃対策として、Deno の npm 互換機能を含む `npm:` 経由のすべてのインポートを禁止する。

### 許可するインポート形式

| 形式 | 用途 |
|------|------|
| `jsr:@scope/package` | JSR パッケージ |
| `https://deno.land/x/package/mod.ts` | Deno Land パッケージ |
| `./local.ts` / `../local.ts` | 相対インポート（内部モジュール） |

### 禁止するインポート形式（ビルドエラー）

| 形式 | 禁止理由 |
|------|---------|
| `npm:react` | npm パッケージ |
| `npm:express` | npm パッケージ |
| `npm:*`（すべての npm: 形式） | サプライチェーンリスク |

## 1.4 絶対原則: Deno ランタイム

> **Adlaire Framework は Deno ランタイムで動作する。Deno ランタイムベースの Deploy および Adlaire Deploy の双方に対応する。**

### 強制事項

| 対象 | 内容 |
|------|------|
| **TypeScript ソース実行** | **Deno ランタイム専用**。TypeScript コードを直接実行する場合、Deno 2.x 以上のみ対象とする。Node.js・Bun 等の他ランタイムでの TypeScript ソース実行は対象外 |
| **HTTP サーバー** | `Deno.serve` を使用する。Express 等の Node.js フレームワークは使用禁止 |
| **デプロイターゲット** | Deno ランタイムベースの Deploy と Adlaire Deploy の双方で動作することを保証する |
| **標準ライブラリ** | Deno 標準ライブラリ（`jsr:@std/*`）を優先して使用する |

> **注**: TypeScript をコンパイルした JavaScript 出力（§10.3）は Deno ランタイム専用ではない。JavaScript 実行環境が利用可能な共用サーバを対象とする。

### デプロイターゲット

| ターゲット | 方式 |
|-----------|------|
| **Deno ランタイムベースの Deploy** | エントリポイント（`main.ts`）を指定してデプロイ。Deno ランタイム上のエッジ・サーバー環境と完全互換 |
| **Adlaire Deploy** | `entry_point: main.ts` を設定。Adlaire Deploy の暗号化環境変数機能を使用 |

## 1.5 適用範囲

- Adlaire Group が開発するすべての Web アプリケーション
- Adlaire Static CMS 管理画面（採用計画なし）
- Adlaire Deploy ダッシュボード（将来的な移行）
- Adlaire BaaS 管理 UI
- その他 Adlaire Group が開発する Web アプリケーション

## 1.6 保留事項

以下は現時点で未確定であり、RULEBOOK 追加改訂で策定する。

| 項目 | 現状 |
|------|------|
| UI レンダリング層 | **計画なし（仕様策定・実装ともに対象外）** |
| Islands アーキテクチャ（採用可否・仕様） | **未決定** |
| 共用ホスティング — コンパイル済み JS によるアプローチ | §10.3 に定義済み（共用サーバ出力） |
| デュアルデプロイ対応方針 | §10.6 に定義済み |

---

# 2. 技術スタック

| 要素 | 仕様 |
|------|------|
| 開発言語 | TypeScript（strict モード必須） |
| TypeScript ソース実行 | **Deno ランタイム専用**（Deno 2.x 以上） |
| ビルド出力 | TypeScript ソース / TypeScript からコンパイルした JavaScript（共用サーバ） |
| デプロイターゲット | Deno Deploy / Adlaire Deploy（Deno ランタイム）/ コンパイル済み JS（共用サーバ） |
| HTTP サーバー | Deno 標準 HTTP サーバー（`Deno.serve`） |
| パッケージ管理 | JSR（`jsr:`）/ Deno Land（`https://deno.land/x/`）のみ |
| npm 禁止 | `npm:` プレフィックス全面禁止 |
| 設定ファイル | `deno.json` |

---

# 3. ディレクトリ構成

## 3.1 フレームワーク本体（`Adlaire Framework/`）

```
Adlaire Framework/
├── CLAUDE.md
├── README.md
├── rulebookdocs/
│   ├── FRAMEWORK_RULEBOOK.md    # 本仕様書
│   └── REVISION_HISTORY.md     # 改訂履歴
├── docs/
│   └── CHANGES.md              # 変更履歴
├── src/
│   ├── mod.ts                  # フレームワーク公開 API エントリポイント
│   ├── server.ts               # HTTP サーバー起動・リクエスト処理
│   ├── router.ts               # ルート探索・マッチング・型生成
│   ├── context.ts              # 型付きリクエストコンテキスト
│   ├── middleware.ts           # ミドルウェア実行チェーン
│   ├── handler.ts              # defineHandler ヘルパー
│   ├── response.ts             # レスポンスヘルパー
│   ├── cookies.ts              # Cookie ユーティリティ（§6.7）
│   ├── error.ts                # フレームワーク提供エラークラス（§6.6）
│   ├── builtin_middleware.ts   # 組み込みミドルウェア（§8.5）
│   ├── env.ts                  # 環境変数アクセサ（§10.7）
│   └── types.ts                # 共通型定義
├── cli/
│   └── main.ts                 # CLI ツール（§12 参照）
├── deno.json                   # フレームワーク自体の Deno 設定
└── VERSION                     # 現行バージョン文字列
```

## 3.2 アプリケーション構成（利用側）

```
my-app/
├── deno.json                   # アプリ Deno 設定
├── adlaire.config.ts           # フレームワーク設定（§4 参照）
├── main.ts                     # アプリエントリポイント
├── routes/                     # ファイルベースルーティング（§5 参照）
│   ├── index.ts                # GET /
│   ├── _middleware.ts          # グローバルミドルウェア
│   ├── _error.ts               # エラーページ
│   ├── _404.ts                 # Not Found ページ
│   ├── api/
│   │   └── users.ts            # /api/users
│   └── [id].ts                 # /:id
├── static/                     # 静的ファイル（CSS・画像等）
└── types/
    └── routes.gen.ts           # フレームワーク自動生成ルート型定義
```

---

# 4. フレームワーク設定（`adlaire.config.ts`）

アプリケーションルートに配置するフレームワーク設定ファイル。

```typescript
// adlaire.config.ts
import type { AdlaireConfig } from "adlaire-framework/mod.ts";

export default {
  port: 8000,
  routes_dir: "./routes",
  static_dir: "./static",
  style: {
    adlaire_style: true,
  },
  deploy: "auto",
} satisfies AdlaireConfig;
```

## 4.1 AdlaireConfig 型定義

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `port` | `number` | `8000` | リッスンポート（Deno ランタイム時のみ有効） |
| `routes_dir` | `string` | `"./routes"` | ルートディレクトリパス |
| `static_dir` | `string \| null` | `"./static"` | 静的ファイルディレクトリ |
| `style.adlaire_style` | `boolean` | `false` | Adlaire Style の自動注入 |
| `deploy` | `"deno-deploy" \| "adlaire-deploy" \| "js" \| "auto"` | `"auto"` | デプロイターゲット |

---

# 5. ファイルベースルーティング

## 5.1 ルートファイルと URL のマッピング

`routes/` ディレクトリのファイル構造が URL パターンに直接対応する。

| ファイルパス | URL パターン | パラメータ |
|-------------|-------------|----------|
| `routes/index.ts` | `/` | なし |
| `routes/about.ts` | `/about` | なし |
| `routes/blog/index.ts` | `/blog` | なし |
| `routes/blog/[slug].ts` | `/blog/:slug` | `{ slug: string }` |
| `routes/users/[id]/posts.ts` | `/users/:id/posts` | `{ id: string }` |
| `routes/api/[...path].ts` | `/api/*` | `{ path: string[] }` |

## 5.2 ルートマッチング優先度

1. **静的ルート**（`/about`）が最優先
2. **動的ルート**（`/[id]`）は静的ルートより後
3. **ワイルドカードルート**（`/[...path]`）は最低優先度

## 5.3 特殊ファイル

`_` で始まるファイルはルートとして登録されない。

| ファイル名 | 説明 |
|-----------|------|
| `_middleware.ts` | 配置ディレクトリ以下の全ルートに適用するミドルウェア |
| `_error.ts` | エラーページ（当該ディレクトリ以下のエラーに対応） |
| `_404.ts` | Not Found ページ |
| `_layout.ts` | レイアウト（UI レンダリング層は計画なしのため対象外） |

## 5.4 HTTP メソッドハンドラー

各ルートファイルは HTTP メソッド別のハンドラーをエクスポートする。

```typescript
// routes/api/users.ts
import { defineHandler } from "adlaire-framework/mod.ts";

export const handler = defineHandler({
  async GET(ctx) {
    return ctx.json({ users: [] });
  },
  async POST(ctx) {
    const body = await ctx.req.json();
    return ctx.json({ created: true }, { status: 201 });
  },
});
```

## 5.5 エラーハンドラー / Not Found ハンドラー

`_error.ts` と `_404.ts` はルーターに組み込まれ、実際に呼び出される。

### エクスポート名

| ファイル | エクスポート名 | 型 |
|---------|-------------|-----|
| `_404.ts` | `notFoundHandler` | `NotFoundHandler` |
| `_error.ts` | `errorHandler` | `ErrorHandler` |

### `_404.ts` — Not Found ハンドラー

ルートが見つからない場合に呼び出される。ルートディレクトリに配置した `_404.ts` は全ルートに適用される。サブディレクトリに配置した場合は当該プレフィックス以下のリクエストに適用され、最も特定的なもの（最長プレフィックス）が優先される。

```typescript
import { defineNotFoundHandler } from "adlaire-framework/mod.ts";

export const notFoundHandler = defineNotFoundHandler((ctx) => {
  return ctx.html("<h1>404 Not Found</h1>", { status: 404 });
});
```

### `_error.ts` — エラーハンドラー

ハンドラーまたはミドルウェアで未捕捉の例外が発生した場合に呼び出される。スコープルールは `_404.ts` と同様。

```typescript
import { defineErrorHandler } from "adlaire-framework/mod.ts";

export const errorHandler = defineErrorHandler((error, ctx) => {
  console.error(error);
  return ctx.json({ error: "Internal Server Error" }, { status: 500 });
});
```

### ErrorHandler / NotFoundHandler 型定義

```typescript
type NotFoundHandler = (
  ctx: Context<RouteParams, MiddlewareState>,
) => Response | Promise<Response>;

type ErrorHandler = (
  error: unknown,
  ctx: Context<RouteParams, MiddlewareState>,
) => Response | Promise<Response>;
```

### フォールバック動作

| ケース | 動作 |
|--------|------|
| `_404.ts` が存在しない | フレームワーク標準の JSON 404 レスポンス |
| `_error.ts` が存在しない | フレームワーク標準の JSON 500 レスポンス |
| `_error.ts` 自身が例外を出した | フレームワーク標準の JSON 500 レスポンスにフォールバック |

## 5.6 ルートグループ

`(group-name)` 形式のディレクトリは **URL パスに影響しない**（透過的）。ルートを論理的にまとめるために使用し、`_middleware.ts` をグループ内のルートにスコープすることができる。

### 命名規則

- 丸括弧で囲んだ名前: `(group-name)` — URL に含まれない
- 丸括弧なし: `admin/` — URL に含まれる（通常のサブディレクトリ）

### URL マッピング例

```
routes/
├── (marketing)/         ← ルートグループ（URL には含まれない）
│   ├── index.ts         → /
│   └── about.ts         → /about
└── (app)/
    ├── _middleware.ts   → /dashboard、/profile に適用
    ├── dashboard.ts     → /dashboard
    └── profile.ts       → /profile
```

### ミドルウェアのスコープ

ルートグループ内の `_middleware.ts` は、グループ内のすべてのルートに適用される。ただし URL プレフィックスはグループ親ディレクトリのプレフィックスを引き継ぐ。

### 仕様

| 項目 | 内容 |
|------|------|
| ディレクトリ名パターン | `^\(.*\)$`（正規表現） |
| URL への影響 | なし（親ディレクトリのプレフィックスを継承） |
| `_middleware.ts` | グループ内ルートに適用（プレフィックスは親継承） |
| `_404.ts` / `_error.ts` | グループ内ルートに適用（プレフィックスは親継承） |
| ネスト | 可能（ルートグループ内にルートグループを配置できる） |

---

# 6. 型安全システム

## 6.1 設計思想

§1.2 絶対原則「型安全」の具体的実装。**型安全はフレームワークが決め、開発者は変更できない**。

フレームワークが `routes/` ディレクトリを解析し、ルートパラメータ・ハンドラー引数・ミドルウェア状態の型を自動生成する。開発者がこれらの型を手書きする必要はなく、上書きもできない。

## 6.2 ルートパラメータの自動型付け

```typescript
// routes/users/[id].ts
import { defineHandler } from "adlaire-framework/mod.ts";

export const handler = defineHandler({
  async GET(ctx) {
    // ctx.params.id は string 型（フレームワークが保証）
    // ctx.params.unknown はコンパイルエラー
    const { id } = ctx.params;
    return ctx.json({ id });
  },
});
```

## 6.3 Context 型定義

```typescript
interface Context<
  Params extends Record<string, string | string[]> = Record<string, never>,
  State extends Record<string, unknown> = Record<string, never>,
> {
  req: Request;
  params: Readonly<Params>;
  state: State;
  url: URL;
  query: Readonly<Record<string, string>>; // §6.5
  cookies: Cookies;                        // §6.7
  body<T>(guard?: (data: unknown) => data is T): Promise<T>; // §6.6
  upgradeWebSocket(handlers: WebSocketHandlers): Response;   // §6.8
  sse(callback: (stream: SSEStream) => void | Promise<void>): Response; // §6.9
  // レスポンスヘルパー（§7 参照）
  json<T>(data: T, init?: ResponseInit): Response;
  text(data: string, init?: ResponseInit): Response;
  html(data: string, init?: ResponseInit): Response;
  redirect(url: string, status?: 301 | 302 | 307 | 308): Response;
  notFound(): Response;
  unauthorized(): Response;
  forbidden(): Response;
  badRequest(message?: string): Response;
  internalError(message?: string): Response;
}
```

## 6.4 ミドルウェア状態の型安全

```typescript
// routes/_middleware.ts
import { defineMiddleware } from "adlaire-framework/mod.ts";

export const middleware = defineMiddleware<{ user: User | null }>(
  async (ctx, next) => {
    ctx.state.user = await getUser(ctx.req);
    return next();
  }
);

// routes/dashboard.ts
import { defineHandler } from "adlaire-framework/mod.ts";

export const handler = defineHandler<Record<string, never>, { user: User | null }>({
  GET(ctx) {
    const { user } = ctx.state; // User | null 型（コンパイル時検証）
    if (!user) return ctx.redirect("/login");
    return ctx.json({ user });
  },
});
```

## 6.5 クエリパラメータアクセス

`ctx.query` でクエリパラメータに型安全にアクセスできる。`Record<string, string>` 型であり、キーを文字列で指定する。

```typescript
// GET /users?page=2&limit=10
export const handler = defineHandler({
  GET(ctx) {
    const page = ctx.query["page"];    // string | undefined
    const limit = ctx.query["limit"]; // string | undefined
    return ctx.json({ page, limit });
  },
});
```

### 仕様

| 項目 | 内容 |
|------|------|
| 型 | `Readonly<Record<string, string>>` |
| 同名キーが複数ある場合 | 最初の値のみを保持する |
| 複数値が必要な場合 | `ctx.url.searchParams.getAll(key)` を使用する |

## 6.6 リクエストボディ検証 — ctx.body\<T\>()

`ctx.body<T>(guard?)` でリクエストボディを JSON としてパースし、オプションで型ガードを適用する。

```typescript
// 型定義
ctx.body<T>(guard?: (data: unknown) => data is T): Promise<T>
```

### 動作

| 条件 | 動作 |
|------|------|
| `guard` あり・検証成功 | パース済みデータを `T` 型として返す |
| `guard` あり・検証失敗 | `ValidationError` をスロー → フレームワークが 400 Bad Request に変換 |
| `guard` なし | JSON をパースして `T` として返す（開発者が型安全性に責任を持つ） |
| JSON パース失敗 | `ValidationError` をスロー → 400 Bad Request |

### ValidationError

フレームワーク提供のエラークラス。`ctx.body()` がスローし、`server.ts` がキャッチして 400 Bad Request に変換する。`_error.ts` ハンドラーには渡されない。

```typescript
// 使用例
export const handler = defineHandler({
  async POST(ctx) {
    const body = await ctx.body(
      (d): d is { name: string; age: number } =>
        typeof d === "object" && d !== null &&
        typeof (d as Record<string, unknown>).name === "string" &&
        typeof (d as Record<string, unknown>).age === "number",
    );
    return ctx.json({ created: body.name });
  },
});
```

## 6.7 Cookie ヘルパー — ctx.cookies

`ctx.cookies` で Cookie の読み書きを行う。

```typescript
// インターフェース定義
interface CookieOptions {
  maxAge?: number;                        // 有効期限（秒）
  expires?: Date;                         // 有効期限（Date）
  httpOnly?: boolean;                     // JavaScript からのアクセスを禁止
  secure?: boolean;                       // HTTPS のみで送信
  sameSite?: "Strict" | "Lax" | "None";  // SameSite ポリシー
  path?: string;                          // Cookie パス（デフォルト: "/"）
  domain?: string;                        // Cookie ドメイン
}

interface Cookies {
  get(name: string): string | undefined;
  set(name: string, value: string, options?: CookieOptions): void;
  delete(name: string, options?: Omit<CookieOptions, "maxAge" | "expires">): void;
}
```

### 動作規則

| 操作 | 内容 |
|------|------|
| `cookies.get(name)` | リクエストの `Cookie` ヘッダーから値を取得する |
| `cookies.set(name, value, options?)` | `Set-Cookie` を予約する |
| `cookies.delete(name, options?)` | `maxAge: 0` で上書きし Cookie を削除する |

`cookies.set()` / `cookies.delete()` で予約した Cookie は、`ctx.json()` / `ctx.html()` / `ctx.text()` 等の**レスポンスヘルパー呼び出し時に自動で `Set-Cookie` ヘッダーに反映**される。

```typescript
// 使用例
export const handler = defineHandler({
  async POST(ctx) {
    const token = generateToken();
    ctx.cookies.set("session", token, { httpOnly: true, secure: true });
    return ctx.json({ ok: true });
  },
  GET(ctx) {
    const session = ctx.cookies.get("session");
    if (!session) return ctx.unauthorized();
    return ctx.json({ session });
  },
});
```

## 6.8 WebSocket サポート

`ctx.upgradeWebSocket(handlers)` で HTTP リクエストを WebSocket にアップグレードする。Deno 標準の `Deno.upgradeWebSocket` を型安全にラップする。

```typescript
// 型定義
interface WebSocketHandlers {
  onOpen?: (ws: WebSocket) => void;
  onMessage?: (ws: WebSocket, event: MessageEvent) => void;
  onClose?: (ws: WebSocket, event: CloseEvent) => void;
  onError?: (ws: WebSocket, event: Event | ErrorEvent) => void;
}

ctx.upgradeWebSocket(handlers: WebSocketHandlers): Response
```

```typescript
// 使用例
export const handler = defineHandler({
  GET(ctx) {
    return ctx.upgradeWebSocket({
      onOpen(ws) {
        ws.send(JSON.stringify({ type: "connected" }));
      },
      onMessage(ws, event) {
        const data = JSON.parse(event.data as string);
        ws.send(JSON.stringify({ echo: data }));
      },
      onClose() {
        console.log("WebSocket closed");
      },
    });
  },
});
```

WebSocket アップグレードリクエストではない通常リクエストに対して `ctx.upgradeWebSocket()` を呼び出すと、Deno がエラーをスローする。

## 6.9 SSE（Server-Sent Events）サポート

`ctx.sse(callback)` で Server-Sent Events レスポンスを生成する。コールバック関数が `SSEStream` オブジェクトを受け取り、イベントを送信する。

```typescript
// 型定義
interface SSEEvent {
  data: string | object; // object の場合は JSON.stringify される
  event?: string;        // イベント名（省略時は無名イベント）
  id?: string;           // イベント ID
  retry?: number;        // 再接続間隔（ミリ秒）
}

interface SSEStream {
  send(event: SSEEvent): void; // イベントを送信する
  close(): void;               // ストリームを閉じる
}

ctx.sse(callback: (stream: SSEStream) => void | Promise<void>): Response
```

### レスポンスヘッダー

| ヘッダー | 値 |
|---------|---|
| `Content-Type` | `text/event-stream; charset=utf-8` |
| `Cache-Control` | `no-cache` |
| `Connection` | `keep-alive` |

### SSE フォーマット

各イベントは RFC 8895 に従い以下の形式で送信される。

```
id: <id>\n           （省略可）
event: <event>\n     （省略可）
retry: <ms>\n        （省略可）
data: <data>\n\n
```

`data` フィールドが `object` 型の場合は `JSON.stringify()` して文字列に変換する。

### 動作規則

| 規則 | 内容 |
|------|------|
| ストリーム | `ReadableStream<Uint8Array>` を内部で生成し `Response` に渡す |
| コールバック非同期 | `callback` が `Promise` を返す場合、エラーはキャッチしてストリームを閉じる |
| Cookie 反映 | `ctx.sse()` はレスポンスヘルパーではないため Set-Cookie は**反映されない** |

```typescript
// 使用例
export const handler = defineHandler({
  async GET(ctx) {
    return ctx.sse(async (stream) => {
      for (let i = 0; i < 5; i++) {
        stream.send({ data: { count: i }, event: "tick" });
        await new Promise((r) => setTimeout(r, 1000));
      }
      stream.close();
    });
  },
});
```

---

# 7. ハンドラー仕様

## 7.1 エクスポート形式

### 形式 A: メソッド別ハンドラー（推奨）

```typescript
export const handler = defineHandler({
  GET(ctx) { ... },
  POST(ctx) { ... },
});
```

### 形式 B: 全メソッド共通ハンドラー

```typescript
export const handler = defineHandler((ctx) => {
  if (ctx.req.method === "GET") { ... }
  return new Response("Method Not Allowed", { status: 405 });
});
```

## 7.2 レスポンスヘルパー

| メソッド | 説明 |
|---------|------|
| `ctx.json(data, init?)` | JSON レスポンス（`Content-Type: application/json; charset=utf-8`） |
| `ctx.text(data, init?)` | テキストレスポンス（`Content-Type: text/plain; charset=utf-8`） |
| `ctx.html(data, init?)` | HTML レスポンス（`Content-Type: text/html; charset=utf-8`） |
| `ctx.redirect(url, status?)` | リダイレクトレスポンス（デフォルト 302） |

## 7.3 エラーレスポンス

| メソッド | ステータス | 説明 |
|---------|:--------:|------|
| `ctx.notFound()` | 404 | Not Found |
| `ctx.unauthorized()` | 401 | Unauthorized（JSON レスポンス） |
| `ctx.forbidden()` | 403 | Forbidden（JSON レスポンス） |
| `ctx.badRequest(message?)` | 400 | Bad Request（JSON レスポンス） |
| `ctx.internalError(message?)` | 500 | Internal Server Error（JSON レスポンス） |

---

# 8. ミドルウェア仕様

## 8.1 概要

`_middleware.ts` をルートディレクトリに配置することで、同ディレクトリ以下の全ルートにミドルウェアを適用する。

```
routes/
├── _middleware.ts      # 全ルートに適用
├── index.ts
└── admin/
    ├── _middleware.ts  # /admin/* のみに適用
    └── index.ts
```

## 8.2 ミドルウェア定義

```typescript
import { defineMiddleware } from "adlaire-framework/mod.ts";

export const middleware = defineMiddleware(async (ctx, next) => {
  // 前処理
  const res = await next();
  // 後処理
  return res;
});
```

## 8.3 ミドルウェアチェーン

- `next()` を呼び出すことで次のミドルウェア（または最終ハンドラー）に処理を委譲する。
- `next()` を呼び出さずに `Response` を返すと、後続処理をスキップして即時レスポンスする。
- ミドルウェアは外側から順に実行される（最も上位ディレクトリが最初）。

## 8.4 複数ミドルウェア

```typescript
export const middleware = [authMiddleware, logMiddleware];
```

## 8.5 組み込みミドルウェア

フレームワーク提供の組み込みミドルウェア。`adlaire-framework/mod.ts` からインポートして使用する。

| 関数 | 説明 |
|------|------|
| `cors(options?)` | CORS ヘッダー設定 |
| `logger()` | リクエストログ（メソッド・パス・ステータス・応答時間） |
| `rateLimit(options?)` | IP ベースのレートリミット |
| `compress()` | gzip / deflate 圧縮（テキスト系コンテンツのみ） |

```typescript
// 使用例: routes/_middleware.ts
import { cors, logger, rateLimit } from "adlaire-framework/mod.ts";

export const middleware = [
  cors({ origins: ["https://example.com"], credentials: true }),
  rateLimit({ max: 100, window: 60 }),
  logger(),
];
```

### cors(options?)

| オプション | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `origins` | `string \| string[]` | `"*"` | 許可オリジン（`"*"` で全許可） |
| `methods` | `string[]` | 主要 HTTP メソッド | 許可メソッド |
| `allowedHeaders` | `string[]` | `["Content-Type", "Authorization"]` | 許可ヘッダー |
| `credentials` | `boolean` | `false` | 認証情報の送信を許可 |
| `maxAge` | `number` | — | Preflight キャッシュ秒数 |

Preflight（OPTIONS）リクエストは 204 で即時応答する。

### logger()

`${METHOD} ${PATH} ${STATUS} — ${ms}ms` 形式でコンソールに出力する。

### rateLimit(options?)

| オプション | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `max` | `number` | `100` | ウィンドウ内の最大リクエスト数 |
| `window` | `number` | `60` | レートリミットウィンドウ（秒） |

`X-Forwarded-For` / `CF-Connecting-IP` ヘッダーから IP を取得する。制限超過時は 429 Too Many Requests を返す。

### compress()

`Accept-Encoding` ヘッダーに応じて gzip または deflate でレスポンスを圧縮する。テキスト系（`text/*` / `application/json` / `application/javascript`）のみ圧縮対象。

---

# 9. 静的ファイル配信

`static/` ディレクトリに配置したファイルは URL から直接アクセスできる。静的ファイルはルートマッチングより優先される。

| ファイルパス | URL |
|------------|-----|
| `static/style.css` | `/style.css` |
| `static/assets/logo.png` | `/assets/logo.png` |

`adlaire.config.ts` で `style.adlaire_style: true` を指定すると、全 HTML レスポンスに Adlaire Style の `<link>` タグを自動注入する。

---

# 10. デプロイ対応

> 絶対原則§1.4「Deno ランタイム」に基づき、Deno ランタイムベースの Deploy と Adlaire Deploy の双方への対応を保証する。

## 10.1 Deno ランタイムベースの Deploy

- エントリポイント（`main.ts`）を指定してデプロイする。
- `Deno.serve` 使用のため Deno ランタイム上のエッジ・サーバー環境と完全互換。
- 環境変数は各 Deploy サービスのダッシュボードで管理する。

## 10.2 Adlaire Deploy

- プロジェクト設定の `entry_point` を `main.ts` に指定する。
- 環境変数は Adlaire Deploy の暗号化環境変数機能を使用する。
- `adlaire.config.ts` で `deploy: "adlaire-deploy"` を指定すると固有の最適化を適用する。

## 10.3 コンパイル済み JavaScript 出力（共用サーバ）

TypeScript ソースを JavaScript にコンパイルした出力も有効なデプロイ成果物とする。`adlaire build --target=js` を実行すると `build/js/` に出力を生成する。

TypeScript 型情報はコンパイル時に除去される。§1.2 絶対原則「型安全」の検証はコンパイル前に実施する（ビルドエラーとして報告）。

- JavaScript 実行環境が利用可能な共用サーバで動作するケースを可能にする。
- Node.js 等の他ランタイム向け汎用対応は計画しない。共用サーバ上で動作するケースを可能にするものであり、他ランタイムの完全サポートとは異なる。
- ブラウザ SPA 出力モードは計画しない。

## 10.4 デプロイターゲット設定

| `deploy` 値 | 動作 |
|------------|------|
| `"deno-deploy"` | Deno Deploy 向けビルド |
| `"adlaire-deploy"` | Adlaire Deploy 向けビルド |
| `"js"` | TypeScript → JavaScript コンパイル出力（`build/js/`）。共用サーバ向け |
| `"auto"` | 環境変数から自動判定（ローカル開発時のデフォルト） |

## 10.5 デプロイ自動判定（`deploy: "auto"`）

| 環境変数 | 判定 |
|---------|------|
| `DENO_DEPLOYMENT_ID` が存在する | Deno Deploy として動作 |
| `ADLAIRE_DEPLOY` が存在する | Adlaire Deploy として動作 |
| どちらも存在しない | ローカル開発モード |

## 10.6 デュアルデプロイ対応方針

> 絶対原則§1.4「Deno ランタイム」に定める通り、Deno ランタイムベースの Deploy と Adlaire Deploy の双方への対応を保証する。

### 基本方針

**1 つの TypeScript コードベースを変更なしで両ターゲットにデプロイできることを保証する。**

### 原則

| 原則 | 内容 |
|------|------|
| **コードベース単一化** | アプリケーションコードにターゲット固有の条件分岐を記述してはならない。ターゲット差異はすべてフレームワークが吸収する |
| **フレームワーク抽象化** | ターゲット固有機能（Adlaire Deploy の暗号化環境変数等）はフレームワーク提供の API 経由でのみアクセスする |
| **ビルド成果物の共通化** | `adlaire build --target=deno` の出力物は Deno Deploy・Adlaire Deploy の双方にそのままデプロイできる |
| **自動判定による透過動作** | `deploy: "auto"` 設定時、フレームワークが実行環境を自動検出して最適動作する（§10.5 参照） |

### ターゲット別機能差異

| 機能 | Deno ランタイムベースの Deploy | Adlaire Deploy |
|------|-------------------------------|----------------|
| 環境変数管理 | Deploy サービスのダッシュボード | 暗号化環境変数機能 |
| エッジ配信 | 対応（サービス依存） | Adlaire Deploy の設定に従う |
| `entry_point` 設定 | 不要（URL 指定） | `entry_point: main.ts` を設定 |

### 禁止事項

```typescript
// 禁止: アプリケーションコード内でのターゲット判定
if (Deno.env.get("ADLAIRE_DEPLOY")) {
  // Adlaire Deploy 固有処理
}

// 許可: フレームワーク API 経由でのアクセス
import { getEnv } from "adlaire-framework/mod.ts";
const value = getEnv("KEY"); // フレームワークがターゲット差異を吸収
```

## 10.7 型安全な環境変数アクセサ — getEnv()

`getEnv()` は環境変数を型安全に取得するフレームワーク提供の関数。`Deno.env.get()` を直接使用せず、`getEnv()` を介することでターゲット差異を吸収する。

```typescript
// シグネチャ（オーバーロード）
function getEnv(key: string): string;
function getEnv(key: string, fallback: string): string;
```

### 動作

| 呼び出し形式 | 動作 |
|-------------|------|
| `getEnv("KEY")` | 環境変数 `KEY` の値を返す。未設定の場合は `Error` をスロー |
| `getEnv("KEY", "default")` | 環境変数 `KEY` の値を返す。未設定の場合は `"default"` を返す |

### エラーメッセージ

未設定の環境変数を fallback なしで取得しようとした場合、次のメッセージで `Error` をスローする。

```
Missing required environment variable: KEY
```

### 使用例

```typescript
import { getEnv } from "adlaire-framework/mod.ts";

// 必須の環境変数（未設定時はエラー）
const dbUrl = getEnv("DATABASE_URL");

// オプションの環境変数（未設定時はデフォルト値）
const port = getEnv("PORT", "8000");
```

### 禁止事項

```typescript
// 禁止: Deno.env.get() の直接使用（アプリケーションコード内）
const key = Deno.env.get("MY_KEY"); // 未設定時 undefined — 型エラーが発生しない

// 許可: getEnv() を使用する
const key = getEnv("MY_KEY"); // 未設定時に明示的な Error をスロー
```

---

# 11. CLI ツール

## 11.1 コマンド一覧

| コマンド | 説明 |
|---------|------|
| `adlaire new <app-name>` | 新規アプリケーションをテンプレートから作成 |
| `adlaire dev` | 開発サーバーを起動（ファイル変更を監視してリロード） |
| `adlaire build` | 本番ビルドを生成 |
| `adlaire build --target=deno` | Deno Deploy / Adlaire Deploy 向けビルド（`build/deno/`） |
| `adlaire build --target=js` | TypeScript → 共用サーバ向け JavaScript 出力（`build/js/`） |
| `adlaire check` | ルート型整合性・設定ファイルのバリデーション |
| `adlaire routes` | 登録済みルート一覧を表示 |
| `adlaire deploy --host=<URL> --project=<ID>` | Adlaire Deploy 管理 API にデプロイをトリガーする |

## 11.3 `adlaire deploy` — Adlaire Deploy トリガー

Adlaire Deploy の管理 API（`POST /api/projects/{id}/deploy`）を呼び出してデプロイをトリガーする。

### オプション

| オプション | 必須 | 説明 |
|-----------|:----:|------|
| `--host=<URL>` | ✓ | Adlaire Deploy 管理 API のベース URL（例: `http://localhost:8001`） |
| `--project=<ID>` | ✓ | プロジェクト ID |

### 動作

1. `{host}/api/projects/{project}/deploy` に `POST` リクエストを送信する。
2. レスポンスが 2xx の場合、成功メッセージを表示して終了コード 0 で終了する。
3. レスポンスが 2xx 以外の場合、エラーメッセージ（ステータスコード含む）を表示して終了コード 1 で終了する。
4. ネットワークエラーの場合、エラーメッセージを表示して終了コード 1 で終了する。

```sh
# 使用例
adlaire deploy --host=http://localhost:8001 --project=my-app
```

## 11.2 `adlaire new` テンプレート

新規プロジェクト生成時に以下のファイルを作成する。

```
my-app/
├── deno.json
├── adlaire.config.ts
├── main.ts
├── routes/
│   ├── index.ts
│   └── _middleware.ts
└── static/
```

---

# 12. インポート規則

## 12.1 npm 禁止（絶対原則§1.3 参照）

§1.3 絶対原則「npm 全面禁止」に基づき、`npm:` プレフィックスのインポートを**全面禁止**する。許可形式・禁止形式の詳細は §1.3 に定める。

```typescript
// 禁止
import React from "npm:react";

// 許可
import { something } from "jsr:@scope/package";
import { something } from "https://deno.land/x/package/mod.ts";
import { something } from "./local.ts";
```

## 12.2 フレームワーク自身のインポート

| 種別 | 形式 | 用途 |
|------|------|------|
| Deno 標準ライブラリ | `jsr:@std/*` | HTTP・パス操作・ストリーム等 |
| Deno Land | `https://deno.land/x/*` | 必要に応じて |
| 相対インポート | `./`, `../` | 内部モジュール |

---

# 13. 最終規則

## 13.1 上位規範性

本 RULEBOOK は、Adlaire Framework の設計に関する上位規範文書である。

## 13.2 優先適用

フレームワーク設計に関して個別提案と本 RULEBOOK が衝突する場合、本 RULEBOOK を優先しなければならない。

## 13.3 絶対原則の不可侵

§1.2〜§1.4 に定める絶対原則①②③は RULEBOOK 改訂によっても廃止・緩和できない。変更が必要な場合は上位の意思決定を経ること。

## 13.4 保留事項の解決

§1.6 に記載の保留事項（UI レイヤー・Islands・共用ホスティング等）が確定した際は、**本 RULEBOOK を先行改訂してから実装に着手すること**。

## 13.5 改訂条件

本 RULEBOOK を改訂する場合は、型システムへの影響・デプロイ動作への影響・絶対原則との整合性を明示しなければならない。

---

# 14. 関連文書

| 文書 | 内容 |
|------|------|
| `REVISION_HISTORY.md` | 本プロジェクトの改訂履歴 |
| `CLAUDE.md`（統合ルート） | 共通開発規約 |
| `rulebookdocs/RELEASE_PLAN_RULEBOOK.md`（統合ルート） | リリース計画 |
| `Adlaire Style/rulebookdocs/STYLE_RULEBOOK.md` | CSS フレームワーク仕様 |
| `Adlaire Deploy/rulebookdocs/DEPLOY_PLATFORM_RULEBOOK.md` | デプロイプラットフォーム仕様 |
| `Adlaire Static CMS/rulebookdocs/ARCHITECTURE_RULEBOOK.md` | Static CMS アーキテクチャ仕様 |
