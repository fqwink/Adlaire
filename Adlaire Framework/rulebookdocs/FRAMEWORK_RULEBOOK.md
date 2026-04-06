# Adlaire Framework — フレームワーク仕様ルールブック

> **文書バージョン: Ver.1.0**
> **最終更新: 2026-04-06**

---

# 1. 製品定義

## 1.1 概要

**Adlaire Framework** は、Adlaire Group の全プロジェクトに共通して適用する TypeScript 製 Web フレームワークである。

開発者は TypeScript のみで記述する。Deno ランタイムで動作する成果物と、Apache + PHP 8.3+ の共用ホスティングで動作する成果物を、同一の TypeScript ソースコードから生成する。

## 1.2 絶対原則

以下の原則は**いかなる設計変更・機能追加においても損なってはならない**。

### 絶対原則① 共用ホスティング対応

Adlaire Framework は Apache + PHP 8.3+ の共用ホスティング環境で動作することを保証する。

### 絶対原則② PHP 自己完結生成

TypeScript → PHP トランスパイル後の成果物は、**PHP ネイティブコードのみで自己完結**しなければならない。外部ライブラリ・フレームワーク・補助ランタイムへの依存を一切持たない純粋な PHP を生成する。

## 1.3 設計の柱

| 柱 | 説明 |
|----|------|
| **TypeScript 単一ソース** | 開発者は TypeScript のみ書く。PHP コードを手書きしない |
| **デュアルデプロイ・ファースト** | Deno と PHP 共用ホスティングを設計の出発点から対等に扱う。PHP 対応は後付けではなくコアアーキテクチャである |
| **PHP 変換可能 API 設計** | すべての Framework API を「PHP にインライン展開できるか」を基準に設計する |
| **型安全ファースト** | ルートパラメータ・ハンドラーデータ・ミドルウェア状態のすべてをフレームワークが型付けする。開発者が型を手書きしない |
| **ゼロ npm** | `npm:` プレフィックスのインポートを全面禁止する |
| **Adlaire Group 専用** | 汎用フレームワークではなく Adlaire Group のプロジェクト群に特化した設計とする |

## 1.4 適用範囲

- Adlaire Group が開発するすべての Web アプリケーション
- Adlaire Static CMS 管理画面（将来的な移行）
- Adlaire Deploy ダッシュボード（将来的な移行）
- Adlaire BaaS 管理 UI
- その他 Adlaire Group が開発する Web アプリケーション

## 1.5 保留事項

以下は現時点で未確定であり、RULEBOOK 追加改訂で策定する。

| 項目 | 現状 |
|------|------|
| UI レンダリング層（Preact / JSX / その他） | 検討中 |
| Islands アーキテクチャ（採用可否・仕様） | 検討中 |

---

# 2. 技術スタック

| 要素 | 仕様 |
|------|------|
| 開発言語 | TypeScript（strict モード必須） |
| 開発ランタイム | Deno 2.x 以上 |
| デプロイターゲット A | Deno Deploy / Adlaire Deploy（Deno ランタイム） |
| デプロイターゲット B | Apache + PHP 8.3+（共用ホスティング、TypeScript → PHP トランスパイル） |
| HTTP サーバー（Deno） | Deno 標準 HTTP サーバー（`Deno.serve`） |
| HTTP サーバー（PHP） | Apache + PHP 8.3+（トランスパイル出力、外部依存ゼロ） |
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
│   ├── types.ts                # 共通型定義
│   └── transpiler/             # TypeScript → PHP トランスパイラ（§11 参照）
│       ├── mod.ts              # 公開 API: transpile(source) → PHP string
│       ├── pipeline.ts         # 4 レイヤー変換パイプライン
│       ├── validator.ts        # ビルド時変換制約チェッカー
│       ├── layers/
│       │   ├── strip_types.ts  # Layer 1: TypeScript 型構文除去
│       │   ├── prefix_vars.ts  # Layer 2: 変数 $ プレフィックス付与
│       │   ├── api_map.ts      # Layer 3: Framework API インライン展開
│       │   └── syntax.ts       # Layer 4: 構文正規化
│       └── router_gen.ts       # ルートテーブル・index.php・.htaccess 生成
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
| `deploy` | `"deno-deploy" \| "adlaire-deploy" \| "php" \| "auto"` | `"auto"` | デプロイターゲット |

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
| `_layout.ts` | レイアウト（UI レイヤー確定後に仕様策定） |

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

Adlaire Framework の核心的独自仕様。開発者がルートパラメータ・ハンドラーデータの型を手書きしないことを目標とする。フレームワークが `routes/` ディレクトリを解析し、TypeScript の型を自動的に提供する。

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

## 10.1 Deno Deploy

- エントリポイント（`main.ts`）を指定してデプロイする。
- `Deno.serve` 使用のため Deno Deploy のエッジランタイムと完全互換。
- 環境変数は Deno Deploy ダッシュボードで管理する。

## 10.2 Adlaire Deploy

- プロジェクト設定の `entry_point` を `main.ts` に指定する。
- 環境変数は Adlaire Deploy の暗号化環境変数機能を使用する。
- `adlaire.config.ts` で `deploy: "adlaire-deploy"` を指定すると固有の最適化を適用する。

## 10.3 PHP 共用ホスティング

> §11 TypeScript → PHP トランスパイラ参照。

- `adlaire build --target=php` で PHP 成果物を `build/php/` に生成する。
- 成果物を Apache + PHP 8.3+ 環境にそのまま配置する。
- 生成物は外部依存ゼロの自己完結 PHP（絶対原則②）。

## 10.4 デプロイターゲット設定

| `deploy` 値 | 動作 |
|------------|------|
| `"deno-deploy"` | Deno Deploy 向けビルド |
| `"adlaire-deploy"` | Adlaire Deploy 向けビルド |
| `"php"` | 共用ホスティング（PHP）向けビルド（§11 トランスパイル） |
| `"auto"` | 環境変数から自動判定（ローカル開発時のデフォルト） |

## 10.5 デプロイ自動判定（`deploy: "auto"`）

| 環境変数 | 判定 |
|---------|------|
| `DENO_DEPLOYMENT_ID` が存在する | Deno Deploy として動作 |
| `ADLAIRE_DEPLOY` が存在する | Adlaire Deploy として動作 |
| どちらも存在しない | ローカル開発モード |

---

# 11. TypeScript → PHP トランスパイラ

## 11.1 設計原則

絶対原則②（PHP 自己完結生成）に基づく設計。

- 変換後 PHP は **外部依存ゼロ**。補助ライブラリ・フレームワークを一切生成・参照しない
- Framework API 呼び出しは **PHP ネイティブコードにインライン展開**する
- 変換は **4 レイヤーパイプライン**で順次処理する
- 変換対象を **Framework API 範囲の TypeScript** に限定する（任意 TypeScript の完全変換は目標としない）

## 11.2 変換対象と制約

### 変換対象

| ファイル | 変換後 |
|---------|--------|
| `routes/*.ts`（ハンドラー） | 自己完結 PHP ハンドラー |
| `routes/_middleware.ts` | PHP 前処理ロジック |
| `services/*.ts`（サービスクラス） | PHP クラスファイル |

### 非対象

| ファイル | 扱い |
|---------|------|
| フロントエンド TypeScript | esbuild → JS（ブラウザ実行） |
| 型定義ファイル（`.d.ts`） | 除去 |

### 変換制約（ビルド時チェック）

ルートハンドラーは以下の制約に従う。違反はビルドエラーとする。

| 許可 | 禁止（ビルドエラー） |
|------|---------------------|
| `ctx.*` Framework API | Web API（`fetch`・`WebSocket` 等） |
| 標準制御フロー（`if`/`for`/`while`/`switch`） | `Generator` / `yield` |
| 標準データ操作（配列・文字列・数値・オブジェクト） | `Symbol` / `Proxy` / `WeakMap` / `WeakRef` |
| クラス定義・メソッド呼び出し | DOM API |
| `async` / `await`（除去して処理） | `Promise`（Framework API 以外） |

## 11.3 変換パイプライン

```
TypeScript ソース
      ↓ Layer 1: 型構文除去
      ↓ Layer 2: 変数 $ プレフィックス付与
      ↓ Layer 3: Framework API インライン展開（核心・AST 解析）
      ↓ Layer 4: 構文正規化
自己完結 PHP
```

Layer 3 のみ AST 解析を使用。Layer 1・2・4 はテキスト変換（正規表現ベース）。各レイヤーは独立して単体テスト可能。

## 11.4 変換ルール

### Layer 1: 型構文除去

| TypeScript | PHP |
|---|---|
| `: Type` 型注釈 | 除去 |
| `<T>` ジェネリクス | 除去 |
| `interface I {}` / `type T = ...` | 除去 |
| `as Type` キャスト | 除去 |
| `import type ...` | 除去 |
| `async function f()` | `function f()` |
| `await expr` | `expr` |

### Layer 2: 変数 $ プレフィックス付与

| TypeScript | PHP |
|---|---|
| `const x = ...` | `$x = ...` |
| `let x = ...` | `$x = ...` |
| 変数参照 `x` | `$x`（関数名・メソッド名・プロパティ名を除く） |
| `export const handler = ...` | 除去 |
| `export function f` | `function f` |
| `import { x } from './y'` | `require_once __DIR__ . '/_y.php';` |

### Layer 3: Framework API インライン展開

Framework API 呼び出しを PHP ネイティブコードに直接展開する。外部依存なし。

**レスポンス系:**

| TypeScript | PHP インライン展開 |
|---|---|
| `ctx.json(data)` | `header('Content-Type: application/json; charset=utf-8'); echo json_encode($data); exit;` |
| `ctx.json(data, {status: n})` | `http_response_code(n); header('Content-Type: application/json; charset=utf-8'); echo json_encode($data); exit;` |
| `ctx.html(body)` | `header('Content-Type: text/html; charset=utf-8'); echo $body; exit;` |
| `ctx.html(body, {status: n})` | `http_response_code(n); header('Content-Type: text/html; charset=utf-8'); echo $body; exit;` |
| `ctx.text(body)` | `header('Content-Type: text/plain; charset=utf-8'); echo $body; exit;` |
| `ctx.redirect(url)` | `http_response_code(302); header('Location: ' . $url); exit;` |
| `ctx.redirect(url, n)` | `http_response_code(n); header('Location: ' . $url); exit;` |
| `ctx.notFound()` | `http_response_code(404); echo '404 Not Found'; exit;` |
| `ctx.unauthorized()` | `http_response_code(401); header('Content-Type: application/json; charset=utf-8'); echo json_encode(['error' => 'Unauthorized']); exit;` |
| `ctx.forbidden()` | `http_response_code(403); header('Content-Type: application/json; charset=utf-8'); echo json_encode(['error' => 'Forbidden']); exit;` |
| `ctx.badRequest(msg)` | `http_response_code(400); header('Content-Type: application/json; charset=utf-8'); echo json_encode(['error' => $msg]); exit;` |
| `ctx.internalError(msg)` | `http_response_code(500); header('Content-Type: application/json; charset=utf-8'); echo json_encode(['error' => $msg]); exit;` |

**リクエスト系:**

| TypeScript | PHP インライン展開 |
|---|---|
| `ctx.req.method` | `$_SERVER['REQUEST_METHOD']` |
| `ctx.url.pathname` | `parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)` |
| `ctx.url.searchParams.get('k')` | `($_GET['k'] ?? null)` |
| `ctx.params.x` | `$_route_params['x']` |
| `ctx.state.x` | `$_route_state['x']` |
| `await ctx.req.json()` | `json_decode(file_get_contents('php://input'), true)` |
| `await ctx.req.text()` | `file_get_contents('php://input')` |
| `ctx.req.headers.get('k')` | `($_SERVER['HTTP_' . strtoupper(str_replace('-', '_', 'k'))] ?? null)` |

**JavaScript 組み込み API:**

| TypeScript | PHP |
|---|---|
| `JSON.parse(s)` | `json_decode($s, true)` |
| `JSON.stringify(v)` | `json_encode($v)` |
| `arr.map(fn)` | `array_map($fn, $arr)` |
| `arr.filter(fn)` | `array_filter($arr, $fn)` |
| `arr.find(fn)` | `(array_values(array_filter($arr, $fn))[0] ?? null)` |
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

### Layer 4: 構文正規化

| TypeScript | PHP |
|---|---|
| `` `Hello ${name}` `` | `"Hello {$name}"` |
| `x ?? y` | `$x ?? $y`（PHP 7.4+ ネイティブ） |
| `x?.y` | `$x?->y`（PHP 8.0+ ネイティブ） |
| `const {a, b} = obj` | `$a = $obj['a']; $b = $obj['b'];` |
| `const [a, b] = arr` | `[$a, $b] = $arr;` |
| `(x) => expr` | `fn($x) => expr`（PHP 7.4+） |
| `(x) => { ... }` | `function($x) { ... }` |

## 11.5 ルーティング変換

ビルド時にルートテーブルを PHP 配列として生成する。

**ルートテーブル（`_routes_table.php`、ビルド時自動生成）:**

```php
<?php
return [
    ['GET',  '/',              __DIR__ . '/_routes/index.php'],
    ['GET',  '/users/[id]',   __DIR__ . '/_routes/users/[id].php'],
    ['POST', '/api/users',    __DIR__ . '/_routes/api/users.php'],
    ['ALL',  '/api/[...path]',__DIR__ . '/_routes/api/[...path].php'],
];
```

**エントリポイント（`index.php`、自己完結ルーター）:**

```php
<?php
$_routes = include __DIR__ . '/_routes_table.php';
$_method = $_SERVER['REQUEST_METHOD'];
$_path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

foreach ($_routes as [$_m, $_pattern, $_file]) {
    if ($_m !== $_method && $_m !== 'ALL') continue;
    $_regex = preg_replace('/\[\.\.\.([^\]]+)\]/', '(?P<$1>.+)',    $_pattern);
    $_regex = preg_replace('/\[([^\]]+)\]/',          '(?P<$1>[^/]+)', $_regex);
    if (preg_match('#^' . $_regex . '$#', $_path, $_matches)) {
        $_route_params = array_filter($_matches, 'is_string', ARRAY_FILTER_USE_KEY);
        $_route_state  = [];
        require $_file;
        return;
    }
}
http_response_code(404);
echo '404 Not Found';
```

**`.htaccess`（全リクエストを `index.php` に集約）:**

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.php [QSA,L]
```

## 11.6 ビルド出力構造

```
build/php/
├── index.php              # 自己完結ルーター（外部依存ゼロ）
├── .htaccess              # Apache リライトルール
├── _routes_table.php      # ビルド時自動生成ルートテーブル
└── _routes/               # 変換済みハンドラー（PHP ネイティブのみ）
    ├── index.php
    ├── users/
    │   └── [id].php
    └── api/
        └── users.php
```

`_runtime/`・`php-runtime/` は存在しない。全ファイルが外部依存ゼロの自己完結 PHP。

## 11.7 ビルドコマンド

```bash
# PHP 向けビルド（共用ホスティング用）
adlaire build --target=php

# Deno 向けビルド（Deno Deploy / Adlaire Deploy 用）
adlaire build --target=deno

# PHP 変換プレビュー（ファイル出力なし）
adlaire transpile --dry-run

# 出力ディレクトリ指定
adlaire build --target=php --out=./dist/php
```

## 11.8 実装方針

- トランスパイラは **Deno + TypeScript** で実装する（`npm:` 禁止原則に従う）
- Layer 1・2・4 は**テキスト変換**（正規表現ベース）で実装する
- Layer 3 のみ **AST 解析**を使用する（Framework API 呼び出しパターンの正確な検出のため）
- AST 解析は Deno 組み込みの TypeScript コンパイラ API を使用する（外部 AST ライブラリ禁止）

---

# 12. CLI ツール

## 12.1 コマンド一覧

| コマンド | 説明 |
|---------|------|
| `adlaire new <app-name>` | 新規アプリケーションをテンプレートから作成 |
| `adlaire dev` | 開発サーバーを起動（ファイル変更を監視してリロード） |
| `adlaire build` | 本番ビルドを生成（デフォルト: Deno ターゲット） |
| `adlaire build --target=php` | PHP トランスパイル + 成果物生成（`build/php/`） |
| `adlaire build --target=deno` | Deno Deploy / Adlaire Deploy 向けビルド（`build/deno/`） |
| `adlaire check` | ルート型整合性・設定ファイルのバリデーション |
| `adlaire routes` | 登録済みルート一覧を表示 |
| `adlaire transpile --dry-run` | PHP 変換のプレビュー（ファイル出力なし） |

## 12.2 `adlaire new` テンプレート

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

| 種別 | 形式 | 用途 |
|------|------|------|
| Deno 標準ライブラリ | `jsr:@std/*` | HTTP・パス操作・ストリーム等 |
| Deno Land | `https://deno.land/x/*` | 必要に応じて |
| 相対インポート | `./`, `../` | 内部モジュール |

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
| 9 | **UI レンダリング層** — UI レイヤー確定後に仕様策定・実装 | 保留 |
| 10 | **Islands アーキテクチャ** — Islands 採否確定後に仕様策定・実装 | 保留 |
| 11 | **本番ビルド最適化** — `adlaire build --target=deno` / コード分割 | 計画 |
| 12 | **TypeScript → PHP トランスパイラ** — 4 レイヤーパイプライン・AST 解析・ルーター生成（§11） | 計画 |
| 13 | **PHP デプロイ対応** — `adlaire build --target=php` / `.htaccess` 生成 / 共用ホスティング検証 | 計画 |

---

# 15. 最終規則

## 15.1 上位規範性

本 RULEBOOK は、Adlaire Framework の設計に関する上位規範文書である。

## 15.2 優先適用

フレームワーク設計に関して個別提案と本 RULEBOOK が衝突する場合、本 RULEBOOK を優先しなければならない。

## 15.3 絶対原則の不可侵

§1.2 に定める絶対原則①②は RULEBOOK 改訂によっても廃止・緩和できない。変更が必要な場合は上位の意思決定を経ること。

## 15.4 保留事項の解決

§1.5 に記載の保留事項（UI レイヤー・Islands）が確定した際は、**本 RULEBOOK を先行改訂してから実装に着手すること**。

## 15.5 改訂条件

本 RULEBOOK を改訂する場合は、型システムへの影響・デプロイ動作への影響・絶対原則との整合性を明示しなければならない。

---

# 16. 関連文書

| 文書 | 内容 |
|------|------|
| `REVISION_HISTORY.md` | 本プロジェクトの改訂履歴 |
| `CLAUDE.md`（統合ルート） | 共通開発規約 |
| `rulebookdocs/RELEASE_PLAN_RULEBOOK.md`（統合ルート） | リリース計画 |
| `Adlaire Style/rulebookdocs/STYLE_RULEBOOK.md` | CSS フレームワーク仕様 |
| `Adlaire Deploy/rulebookdocs/DEPLOY_PLATFORM_RULEBOOK.md` | デプロイプラットフォーム仕様 |
| `Adlaire Static CMS/rulebookdocs/ARCHITECTURE_RULEBOOK.md` | Static CMS アーキテクチャ仕様 |
