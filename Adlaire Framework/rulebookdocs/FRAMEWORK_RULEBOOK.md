# Adlaire Framework — フレームワーク仕様ルールブック

> **文書バージョン: Ver.1.2**
> **最終更新: 2026-04-06**

---

# 1. 製品定義

## 1.1 概要

**Adlaire Framework** は、Adlaire Group の全プロジェクトに適用する TypeScript 製 Web フレームワークである。
**Deno ランタイム**（Deno Deploy・Adlaire Deploy）と **PHP ランタイム**（Apache + PHP 8.3+、共用ホスティング）の双方を**ファーストクラスで正式サポート**する。
全ソースコードは TypeScript 単一ソースで開発し、**TypeScript → PHP トランスパイラ**が PHP 成果物を自動生成する。
Deno の Web フレームワーク **Fresh** にインスパイアされつつ、Adlaire Group 独自の仕様を採用する。

## 1.2 設計原則

| 原則 | 説明 |
|------|------|
| **型安全ファースト** | ルートパラメータ・ハンドラーデータ・ミドルウェア状態のすべてをフレームワークが型付けする。開発者が型を手書きする必要をなくす |
| **ファイルベースルーティング** | `routes/` ディレクトリの構造がそのままルートになる。設定ファイル不要 |
| **ゼロ npm** | `npm:` プレフィックスのインポートを全面禁止する。`jsr:` / `https://deno.land/x/` / 相対インポートのみ使用 |
| **Deno ネイティブ** | Deno 標準ライブラリ・標準 API を優先して使用する |
| **軽量・最小依存** | フレームワークコア自体の外部依存を最小限に抑える |
| **デュアルランタイム** | Deno ランタイムと PHP ランタイムを対等なファーストクラスとして正式サポートする。Deno Deploy・Adlaire Deploy・共用ホスティング（PHP）の 3 プラットフォームに対応する |
| **TypeScript 単一ソース** | 全ソースコードを TypeScript で開発する。PHP は TypeScript からトランスパイルして生成する。開発者が PHP を手書きする必要をなくす |

## 1.3 Fresh との比較

| 特性 | Fresh | Adlaire Framework |
|------|-------|-------------------|
| 型安全 | 手動（開発者が型定義） | **フレームワークが自動型付け** |
| UI レイヤー | Preact（必須） | **未定（検討中）** |
| Islands | `islands/` ディレクトリ | **未定（検討中）** |
| ルーティング | ファイルベース | **ファイルベース（Fresh 準拠）** |
| npm 禁止 | 禁止なし | **全面禁止（Adlaire 規約）** |
| デプロイ対象 | Deno Deploy 専用 | **Deno Deploy + Adlaire Deploy + 共用ホスティング（PHP）** |
| PHP トランスパイル | なし | **TypeScript → PHP 自動変換（付随機能）** |
| CSS | Tailwind（推奨） | **Adlaire Style** |
| ライセンス | MIT（オープンソース） | **クローズドソース（Adlaire Group 専用）** |

## 1.4 保留事項

以下の仕様は現時点で**未確定**であり、追加 RULEBOOK 改訂で策定する。

| 項目 | 現状 |
|------|------|
| UI レンダリング層（Preact / JSX テンプレート / その他） | 検討中 |
| Islands アーキテクチャ（採用可否・仕様） | 検討中 |

## 1.5 適用範囲

- Adlaire Group が開発するすべての Web アプリケーション
- Adlaire Static CMS の管理画面（将来的な移行）
- Adlaire Deploy ダッシュボード（将来的な移行）
- Adlaire BaaS 管理 UI
- その他 Adlaire Group が開発する Web アプリケーション

---

# 2. 技術スタック

| 要素 | 仕様 |
|------|------|
| 開発言語 | TypeScript（strict モード必須）— 全ソースコード |
| **ランタイム① — Deno**（ファーストクラス） | Deno 2.x 以上 / Deno Deploy・Adlaire Deploy 向け |
| **ランタイム② — PHP**（ファーストクラス） | PHP 8.3+ / Apache / 共用ホスティング向け（TypeScript からトランスパイル生成） |
| HTTP サーバー（Deno） | Deno 標準 HTTP サーバー（`Deno.serve`） |
| HTTP サーバー（PHP） | Apache + PHP 8.3+（トランスパイル出力） |
| パッケージ管理 | JSR（`jsr:`）/ Deno Land（`https://deno.land/x/`） |
| npm 禁止 | `npm:` プレフィックス全面禁止 |
| 設定ファイル | `deno.json` |
| PHP トランスパイラ | TypeScript → PHP 自動変換（正式採用機能）— `adlaire build --target=php` / `adlaire transpile --dry-run` |

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
│   ├── handler.ts              # ハンドラー定義ヘルパー
│   ├── response.ts             # レスポンスヘルパー
│   ├── types.ts                # 共通型定義
│   └── transpiler/             # TypeScript → PHP トランスパイラ（§12 参照）
│       ├── mod.ts              # トランスパイラ公開 API
│       ├── ast.ts              # TypeScript AST 解析（Deno 組み込み TS API）
│       ├── emitter.ts          # PHP コード生成
│       ├── mapping.ts          # TypeScript → PHP 変換ルールテーブル
│       ├── router_gen.ts       # ルーティング変換・index.php / .htaccess 生成
│       └── php-runtime/        # トランスパイル出力が依存する PHP ミニフレームワーク
│           ├── router.php      # PHP ルーター（リクエストディスパッチ）
│           ├── context.php     # $ctx 相当の PHP コンテキスト実装
│           └── helpers.php     # json_response / redirect 等のヘルパー関数
├── cli/
│   └── main.ts                 # CLI ツール（new / dev / build / check）
├── deno.json                   # フレームワーク自体の Deno 設定
└── VERSION                     # 現行バージョン文字列
```

## 3.2 アプリケーション構成（利用側）

Adlaire Framework を使用して構築するアプリケーションの標準ディレクトリ構成。

```
my-app/
├── deno.json                   # アプリ Deno 設定（フレームワークをインポート）
├── adlaire.config.ts           # フレームワーク設定ファイル
├── main.ts                     # アプリエントリポイント
├── routes/                     # ファイルベースルーティング（§5 参照）
│   ├── index.ts(x)             # GET /
│   ├── _middleware.ts          # グローバルミドルウェア
│   ├── _layout.ts(x)           # グローバルレイアウト（UI 確定後）
│   ├── api/
│   │   └── users.ts            # /api/users
│   └── [id].ts(x)              # /:id
├── components/                 # 共有コンポーネント（UI 確定後）
├── islands/                    # Islands コンポーネント（Islands 確定後）
├── static/                     # 静的ファイル（CSS・画像等）
└── types/
    └── routes.gen.ts           # フレームワーク自動生成ルート型定義（§6 参照）
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
    adlaire_style: true,           // Adlaire Style 自動注入
  },
} satisfies AdlaireConfig;
```

### 4.1 AdlaireConfig 型定義

| フィールド | 型 | デフォルト | 説明 |
|-----------|------|:----------:|------|
| `port` | `number` | `8000` | リッスンポート |
| `routes_dir` | `string` | `"./routes"` | ルートディレクトリパス |
| `static_dir` | `string \| null` | `"./static"` | 静的ファイルディレクトリ |
| `style.adlaire_style` | `boolean` | `false` | Adlaire Style の自動注入 |
| `deploy` | `"deno-deploy" \| "adlaire-deploy" \| "auto"` | `"auto"` | デプロイターゲット |

---

# 5. ファイルベースルーティング

## 5.1 ルートファイルと URL のマッピング

`routes/` ディレクトリ内のファイル構造が URL パターンに直接対応する。

| ファイルパス | URL パターン | パラメータ |
|-------------|-------------|----------|
| `routes/index.ts` | `/` | なし |
| `routes/about.ts` | `/about` | なし |
| `routes/blog/index.ts` | `/blog` | なし |
| `routes/blog/[slug].ts` | `/blog/:slug` | `{ slug: string }` |
| `routes/users/[id]/posts.ts` | `/users/:id/posts` | `{ id: string }` |
| `routes/api/[...path].ts` | `/api/*` | `{ path: string[] }` |
| `routes/api/users.ts` | `/api/users` | なし |

## 5.2 ルートマッチング優先度

1. **静的ルート**（`/about`）が最優先
2. **動的ルート**（`/[id]`）は静的ルートより後
3. **ワイルドカードルート**（`/[...path]`）は最低優先度
4. 同一レベルで複数の動的ルートが競合する場合、ファイル名の辞書順で解決する

## 5.3 特殊ファイル

| ファイル名 | 説明 |
|-----------|------|
| `_middleware.ts` | 配置ディレクトリ以下の全ルートに適用するミドルウェア |
| `_layout.ts(x)` | 配置ディレクトリ以下の全ページに適用するレイアウト（UI 確定後） |
| `_error.ts(x)` | エラーページ（当該ディレクトリ以下のエラーに対応） |
| `_404.ts(x)` | Not Found ページ |

`_` で始まるファイルはルートとして登録されない。

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

---

# 6. 型安全システム

## 6.1 設計思想

Adlaire Framework の最重要独自仕様。
**開発者がルートパラメータ・ハンドラーデータの型を手書きしなくてよい**ことを目標とする。
フレームワークが `routes/` ディレクトリを解析し、TypeScript の型を自動的に提供する。

## 6.2 ルートパラメータの自動型付け

ファイル名の動的セグメント（`[id]`）から、コンテキスト型が自動的に決定される。

```typescript
// routes/users/[id].ts
import { defineHandler } from "adlaire-framework/mod.ts";

export const handler = defineHandler({
  async GET(ctx) {
    // ctx.params.id は string 型（フレームワークが保証）
    // ctx.params.unknown はコンパイルエラー（存在しないパラメータ）
    const { id } = ctx.params;
    return ctx.json({ id });
  },
});
```

## 6.3 型付きコンテキスト（`Context<Params, State>`）

```typescript
interface Context<
  Params extends Record<string, string | string[]> = Record<string, never>,
  State extends Record<string, unknown> = Record<string, never>,
> {
  req: Request;                        // Deno 標準 Request
  params: Readonly<Params>;            // ルートパラメータ（型付き）
  state: State;                        // ミドルウェア累積状態（型付き）
  url: URL;                            // パースされた URL
  json<T>(data: T, init?: ResponseInit): Response;
  text(data: string, init?: ResponseInit): Response;
  html(data: string, init?: ResponseInit): Response;
  redirect(url: string, status?: 301 | 302 | 307 | 308): Response;
  render(data?: unknown): Response;    // UI 確定後に型付け
}
```

## 6.4 `defineHandler` ヘルパー

```typescript
// フレームワーク内部型（概念）
type RouteParams<Path extends string> =
  Path extends `${string}[${infer Param}]${infer Rest}`
    ? { [K in Param]: string } & RouteParams<Rest>
    : Path extends `${string}[...${infer Param}]`
    ? { [K in Param]: string[] }
    : Record<string, never>;

// 公開 API
function defineHandler<
  Params extends Record<string, string | string[]> = Record<string, never>,
>(
  handlers: {
    [Method in "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"]?:
      (ctx: Context<Params>) => Response | Promise<Response>;
  }
): Handler<Params>;
```

## 6.5 ミドルウェア状態の型安全

ミドルウェアが `ctx.state` に追加した値は、後続ハンドラーで型安全にアクセスできる。

```typescript
// routes/_middleware.ts
import { defineMiddleware } from "adlaire-framework/mod.ts";

export const middleware = defineMiddleware<{ user: User | null }>(
  async (ctx, next) => {
    const user = await getUser(ctx.req);
    ctx.state.user = user;        // user: User | null として型付け
    return next();
  }
);

// routes/dashboard.ts
import { defineHandler } from "adlaire-framework/mod.ts";

export const handler = defineHandler<Record<string, never>, { user: User | null }>({
  GET(ctx) {
    const { user } = ctx.state;  // User | null 型（コンパイル時検証）
    if (!user) return ctx.redirect("/login");
    return ctx.render({ user });
  },
});
```

## 6.6 型チェックコマンド

```bash
deno task check     # ルート型整合性チェック（フレームワーク統合）
deno task dev       # 開発サーバー起動（型エラーはコンソールに表示）
```

---

# 7. ハンドラー仕様

## 7.1 ハンドラーエクスポート形式

各ルートファイルは以下のいずれかの形式でハンドラーをエクスポートする。

### 形式 A: メソッド別ハンドラー（推奨）

```typescript
export const handler = defineHandler({
  GET(ctx) { ... },
  POST(ctx) { ... },
});
```

### 形式 B: 全メソッド共通ハンドラー

```typescript
export const handler = defineHandler(
  (ctx) => {
    if (ctx.req.method === "GET") { ... }
    return new Response("Method Not Allowed", { status: 405 });
  }
);
```

## 7.2 レスポンスヘルパー

| メソッド | 説明 |
|---------|------|
| `ctx.json(data, init?)` | JSON レスポンス（`Content-Type: application/json`） |
| `ctx.text(data, init?)` | テキストレスポンス |
| `ctx.html(data, init?)` | HTML レスポンス |
| `ctx.redirect(url, status?)` | リダイレクトレスポンス |
| `ctx.render(data?)` | UI レンダリング（UI 確定後に詳細仕様策定） |

## 7.3 エラーレスポンス

| ヘルパー | 説明 |
|---------|------|
| `ctx.notFound()` | 404 Not Found |
| `ctx.unauthorized()` | 401 Unauthorized |
| `ctx.forbidden()` | 403 Forbidden |
| `ctx.badRequest(message?)` | 400 Bad Request |
| `ctx.internalError(message?)` | 500 Internal Server Error |

---

# 8. ミドルウェア仕様

## 8.1 概要

`_middleware.ts` ファイルをルートディレクトリ内に配置することで、同ディレクトリ以下の全ルートにミドルウェアを適用する。

```
routes/
├── _middleware.ts          # 全ルートに適用
├── index.ts
└── admin/
    ├── _middleware.ts      # /admin/* のみに適用
    └── index.ts
```

## 8.2 ミドルウェア定義

```typescript
// routes/_middleware.ts
import { defineMiddleware } from "adlaire-framework/mod.ts";

export const middleware = defineMiddleware(async (ctx, next) => {
  console.log(`[${ctx.req.method}] ${ctx.url.pathname}`);
  const res = await next();
  return res;
});
```

## 8.3 ミドルウェアチェーン

- `next()` を呼び出すことで次のミドルウェア（または最終ハンドラー）に処理を委譲する。
- `next()` を呼び出さずに `Response` を返すと、後続処理をスキップして即時レスポンスする。
- ミドルウェアは外側から順に実行される（最も上位ディレクトリのミドルウェアが最初）。

## 8.4 複数ミドルウェア

単一ファイルに複数のミドルウェアを配列でエクスポートできる。

```typescript
export const middleware = [authMiddleware, logMiddleware];
```

---

# 9. レスポンスと静的ファイル配信

## 9.1 静的ファイル

`static/` ディレクトリに配置したファイルは URL から直接アクセスできる。

| ファイルパス | URL |
|------------|-----|
| `static/style.css` | `/style.css` |
| `static/assets/logo.png` | `/assets/logo.png` |

静的ファイルのルートは、動的ルートより優先される（ルートマッチング最優先）。

## 9.2 Adlaire Style 統合

`adlaire.config.ts` で `style.adlaire_style: true` を指定すると、フレームワークが全 HTML レスポンスに Adlaire Style の `<link>` タグを自動注入する。

---

# 10. デプロイ対応

## 10.1 Deno Deploy

- エントリポイント（`main.ts`）を指定してデプロイする。
- `Deno.serve` 使用のため、Deno Deploy のエッジランタイムと完全互換。
- 環境変数は Deno Deploy のダッシュボードで管理する。

## 10.2 Adlaire Deploy

- プロジェクト設定（`deploy.json`）の `entry_point` を `main.ts` に指定する。
- フレームワーク起動コマンドをビルドステップとして設定可能（`deno task build`）。
- 環境変数は Adlaire Deploy の暗号化環境変数機能を使用する。
- `adlaire.config.ts` で `deploy: "adlaire-deploy"` を指定すると、Adlaire Deploy 固有の最適化を適用する。

## 10.3 共用ホスティング（PHP）デプロイ

> §12 TypeScript → PHP トランスパイラ参照。

- `adlaire build --target=php` で PHP 変換済み成果物を `build/php/` に生成する。
- 生成物を Apache + PHP 8.3+ 環境にそのまま配置する。
- `build/php/index.php` がエントリポイントとなり、`.htaccess` で全リクエストをルーティングする。
- `adlaire.config.ts` で `deploy: "php"` を指定すると PHP ターゲット向け設定を適用する。
- **Deno ランタイムは本番環境に不要**。成果物（PHP ファイル）のみ配置する。

## 10.4 デプロイターゲット設定

| `deploy` 値 | 動作 |
|------------|------|
| `"deno-deploy"` | Deno Deploy 向けビルド |
| `"adlaire-deploy"` | Adlaire Deploy 向けビルド |
| `"php"` | 共用ホスティング（PHP）向けビルド（§12 トランスパイル） |
| `"auto"` | 環境変数から自動判定（ローカル開発時のデフォルト） |

## 10.5 デプロイ判定ロジック（`deploy: "auto"`）

| 環境変数 | 判定 |
|---------|------|
| `DENO_DEPLOYMENT_ID` が存在する | Deno Deploy として動作 |
| `ADLAIRE_DEPLOY` が存在する | Adlaire Deploy として動作 |
| どちらも存在しない | ローカル開発モード |

---

# 11. CLI ツール

## 11.1 コマンド一覧

| コマンド | 説明 |
|---------|------|
| `adlaire new <app-name>` | 新規アプリケーションを作成（テンプレートから） |
| `adlaire dev` | 開発サーバーを起動（ファイル変更を監視してリロード） |
| `adlaire build` | 本番ビルドを生成（デフォルト: Deno ターゲット） |
| `adlaire build --target=php` | PHP トランスパイル + 成果物生成（`build/php/`） |
| `adlaire build --target=deno` | Deno Deploy / Adlaire Deploy 向けビルド（`build/deno/`） |
| `adlaire check` | ルート型整合性・設定ファイルのバリデーション |
| `adlaire routes` | 登録済みルート一覧を表示 |
| `adlaire transpile --dry-run` | PHP 変換のプレビュー（ファイル出力なし） |

## 11.2 `adlaire new` テンプレート

新規プロジェクト生成時に以下のファイルを生成する。

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

# 13. インポート規則

## 13.1 npm 禁止

Adlaire Group 共通規約に基づき、`npm:` プレフィックスのインポートを**全面禁止**する。

```typescript
// 禁止
import React from "npm:react";

// 許可
import { something } from "jsr:@scope/package";
import { something } from "https://deno.land/x/package/mod.ts";
import { something } from "./local.ts";
```

## 13.2 フレームワーク自身のインポート

フレームワーク本体が使用できるインポート:

| 種別 | 形式 | 用途 |
|------|------|------|
| Deno 標準ライブラリ | `jsr:@std/*` | HTTP・パス操作・ストリーム等 |
| Deno Land | `https://deno.land/x/*` | 必要に応じて |
| 相対インポート | `./`, `../` | 内部モジュール |

---

# 12. TypeScript → PHP トランスパイラ

## 12.1 概要と目的

Adlaire Framework に付随する **TypeScript → PHP トランスパイラ**は、TypeScript で記述したソースコードを PHP に自動変換し、Apache + PHP 環境（共用ホスティング）に展開可能な成果物を生成する機能である。

これにより以下を実現する:

- **TypeScript 単一ソース**: 開発者は TypeScript のみで記述し、PHP を手書きしない
- **共用ホスティング対応**: 変換後の PHP を shared hosting にそのまま配置して動作させる
- **型安全の維持**: TypeScript の型システムを活かした開発フロー

## 12.2 変換対象と非対象

### 変換対象（TypeScript → PHP）

| TypeScript ファイル | 変換後 | 説明 |
|---|---|---|
| `routes/*.ts`（ハンドラー） | PHP ルーターロジック | GET/POST 等のハンドラー |
| `routes/_middleware.ts` | PHP 前処理ロジック | 認証・ログ等 |
| ビジネスロジック（サーバーサイド） | PHP 関数・クラス | |

### 非対象（変換しない）

| TypeScript ファイル | 扱い | 説明 |
|---|---|---|
| フロントエンドコード | esbuild → JS | ブラウザで実行するコード |
| 型定義ファイル（`.d.ts`） | 除去 | PHP には型注釈なし |
| `adlaire.config.ts` | PHP 設定ファイルに変換 | |

## 12.3 TypeScript → PHP 変換規則

### 12.3.1 基本構文マッピング

| TypeScript | PHP | 備考 |
|---|---|---|
| `async function f() {}` | `function f() {}` | async/await を除去（PHP は同期） |
| `await expr` | `expr` | await キーワードを除去 |
| `const x = ...` | `$x = ...` | 変数に `$` プレフィックス |
| `let x = ...` | `$x = ...` | |
| `type T = ...` | （除去） | 型定義は PHP に存在しない |
| `interface I {}` | （除去または docblock） | |
| `class Foo {}` | `class Foo {}` | PHP クラスに変換 |
| `export function f` | `function f` | PHP に export なし（ファイルスコープ） |
| `import { x } from "./y"` | `require_once './y.php'` | |
| `export default` | 末尾に `return` | |

### 12.3.2 型注釈の扱い

- TypeScript の型注釈（`: string`・`<T>`・`as Type` 等）は PHP 変換時に**除去**する。
- PHP 8.3 の型ヒント（`string $x`・`int $x`・`array $x`）には一部マッピングする（プリミティブ型のみ）。
- `unknown`・`any`・ユニオン型等は PHP 型ヒントなしに変換する。

### 12.3.3 API マッピング（Adlaire Framework 固有）

| TypeScript（フレームワーク API） | PHP 変換後 |
|---|---|
| `ctx.json(data)` | `header('Content-Type: application/json'); echo json_encode($data); exit;` |
| `ctx.html(html)` | `header('Content-Type: text/html'); echo $html; exit;` |
| `ctx.redirect(url)` | `header('Location: ' . $url); http_response_code(302); exit;` |
| `ctx.req.method` | `$_SERVER['REQUEST_METHOD']` |
| `ctx.url.pathname` | `parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)` |
| `ctx.params.id` | `$params['id']`（ルーターが注入） |
| `ctx.state.user` | `$state['user']` |
| `await ctx.req.json()` | `json_decode(file_get_contents('php://input'), true)` |
| `new Response(body, {status})` | `http_response_code($status); echo $body; exit;` |

### 12.3.4 JavaScript 組み込み API マッピング

| TypeScript/JavaScript | PHP 変換後 |
|---|---|
| `JSON.parse(s)` | `json_decode($s, true)` |
| `JSON.stringify(v)` | `json_encode($v)` |
| `` `Hello ${name}` `` | `"Hello {$name}"` または `sprintf("Hello %s", $name)` |
| `arr.map(fn)` | `array_map($fn, $arr)` |
| `arr.filter(fn)` | `array_filter($arr, $fn)` |
| `arr.find(fn)` | `array_values(array_filter(...))[0] ?? null` |
| `arr.length` | `count($arr)` |
| `Object.keys(obj)` | `array_keys($obj)` |
| `Object.values(obj)` | `array_values($obj)` |
| `str.includes(sub)` | `str_contains($str, $sub)` |
| `str.startsWith(pre)` | `str_starts_with($str, $pre)` |
| `str.endsWith(suf)` | `str_ends_with($str, $suf)` |
| `str.trim()` | `trim($str)` |
| `str.split(sep)` | `explode($sep, $str)` |
| `arr.join(sep)` | `implode($sep, $arr)` |
| `Math.floor(n)` | `(int)floor($n)` |
| `Date.now()` | `(int)(microtime(true) * 1000)` |
| `x ?? y`（nullish） | `$x ?? $y`（PHP 7+ ネイティブ対応） |
| `x?.y`（optional chain） | `$x !== null ? $x->y : null` |
| 分割代入 `const {a, b} = obj` | `$a = $obj['a']; $b = $obj['b'];` |
| 配列分割代入 `const [a, b] = arr` | `[$a, $b] = $arr;` |
| アロー関数 `(x) => x + 1` | `fn($x) => $x + 1`（PHP 7.4+）または `function($x) { return $x + 1; }` |

### 12.3.5 クラス変換

```typescript
// TypeScript 入力
class UserService {
  private name: string;
  constructor(name: string) {
    this.name = name;
  }
  greet(): string {
    return `Hello, ${this.name}`;
  }
}
```

```php
// PHP 出力
class UserService {
  private string $name;
  public function __construct(string $name) {
    $this->name = $name;
  }
  public function greet(): string {
    return "Hello, {$this->name}";
  }
}
```

## 12.4 ルーティング変換（`routes/` → PHP ルーター）

ファイルベースルーティング（§5）の構造を PHP のルーターファイルに変換する。

**変換方式:**

- `routes/index.ts` → `index.php`（エントリポイントがルーティング）
- `routes/api/users.ts` → PHP ルーターが `/api/users` を検出してディスパッチ
- `routes/[id].ts` → PHP 正規表現マッチ + `$params['id']` 注入

**生成物構成（`build/php/`）:**

```
build/php/
├── index.php          # フレームワーク生成ルーター（エントリポイント）
├── .htaccess          # Apache リライトルール（全リクエストを index.php へ）
├── _routes/           # 変換済みルートハンドラー
│   ├── index.php
│   ├── api/
│   │   └── users.php
│   └── [id].php
└── _middleware/       # 変換済みミドルウェア
    └── global.php
```

## 12.5 変換スコープ（限定事項）

以下の TypeScript 機能は**変換対象外**とする。現時点では使用を禁止する。

| 機能 | 理由 |
|------|------|
| `Promise`（フレームワーク API 以外） | PHP は同期処理のため意味論が異なる |
| `Generator` / `yield` | PHP Generator とセマンティクスが異なる |
| `Symbol` | PHP に対応する概念がない |
| `Proxy` / `Reflect` | PHP に対応する概念がない |
| `WeakMap` / `WeakRef` | PHP に対応する概念がない |
| Web API（`fetch`・`WebSocket`等） | PHP の HTTP クライアントに別途マッピングが必要 |
| DOM API | フロントエンドコードは変換対象外のため問題なし |

## 12.6 ビルドコマンド

```bash
# PHP 向けビルド（共用ホスティング用）
adlaire build --target=php

# Deno 向けビルド（Deno Deploy / Adlaire Deploy 用）
adlaire build --target=deno

# 出力ディレクトリ指定
adlaire build --target=php --out=./dist/php
```

## 12.7 トランスパイラの実装方針

- トランスパイラは **Deno + TypeScript** で実装する（`npm:` 禁止原則に従う）。
- TypeScript の AST（抽象構文木）解析は Deno 組み込みの TypeScript コンパイラ API を使用する。
- 外部の AST ライブラリ（babel・swc 等）は `npm:` 経由になるため**使用禁止**。
- 変換精度は「Adlaire Framework の API 範囲内での TypeScript」に限定する（任意 TypeScript の完全変換は目標としない）。

---

# 14. 開発フェーズ

| Phase | 内容 | 状態 |
|:-----:|------|:----:|
| 0 | **ルールブック策定**（本文書） | 策定済 |
| 1 | **コア HTTP サーバー** — `Deno.serve` ラッパー・リクエスト/レスポンス抽象化 | 計画 |
| 2 | **ファイルベースルーティング** — `routes/` ディレクトリ探索・URL マッチング・動的パラメータ | 計画 |
| 3 | **型安全システム** — `defineHandler` / `Context<Params>` / パラメータ型推論 | 計画 |
| 4 | **ミドルウェア** — `_middleware.ts` チェーン・`defineMiddleware` / 状態型付け | 計画 |
| 5 | **静的ファイル配信** — `static/` ディレクトリ対応 | 計画 |
| 6 | **CLI ツール** — `adlaire new` / `adlaire dev` / `adlaire routes` | 計画 |
| 7 | **Adlaire Style 統合** — 自動 CSS 注入 | 計画 |
| 8 | **Adlaire Deploy 統合** — デプロイ設定生成・環境変数連携 | 計画 |
| 9 | **UI レンダリング層** — UIレイヤー確定後に仕様策定・実装 | 保留 |
| 10 | **Islands アーキテクチャ** — Islands 採否確定後に仕様策定・実装 | 保留 |
| 11 | **本番ビルド最適化** — `adlaire build --target=deno` / コード分割 / 静的生成 | 計画 |
| 12 | **TypeScript → PHP トランスパイラ** — AST 解析・構文マッピング・ルーター生成（§12） | 計画 |
| 13 | **PHP デプロイ対応** — `adlaire build --target=php` / `.htaccess` 生成 / Adlaire Static CMS 統合 | 計画 |

---

# 15. 最終規則

## 15.1 上位規範性

本 RULEBOOK は、Adlaire Framework の設計に関する上位規範文書である。

## 15.2 優先適用

フレームワーク設計に関して個別提案と本 RULEBOOK が衝突する場合、本 RULEBOOK を優先しなければならない。

## 15.3 保留事項の解決

§1.4 に記載の保留事項（UIレイヤー・Islands）が確定した際は、**本 RULEBOOK を先行改訂してから実装に着手すること**。

## 15.4 改訂条件

本 RULEBOOK を改訂する場合は、型システムへの影響・既存アプリケーションとの互換性・デプロイ動作への影響を明示しなければならない。

---

# 16. 関連文書

| 文書 | 内容 |
|------|------|
| `REVISION_HISTORY.md` | 本プロジェクトの改訂履歴 |
| `CLAUDE.md`（統合ルート） | 共通開発規約 |
| `rulebookdocs/RELEASE_PLAN_RULEBOOK.md`（統合ルート） | リリース計画 |
| `Adlaire Style/rulebookdocs/STYLE_RULEBOOK.md` | CSS フレームワーク仕様 |
| `Adlaire Deploy/rulebookdocs/DEPLOY_PLATFORM_RULEBOOK.md` | デプロイプラットフォーム仕様 |
