# Adlaire Framework — フレームワーク仕様ルールブック

> **文書バージョン: Ver.1.5**
> **最終更新: 2026-04-06**

---

# 1. 製品定義

## 1.1 概要

**Adlaire Framework** は、Adlaire Group の全プロジェクトに共通して適用する TypeScript 製 Web フレームワークである。

開発者は TypeScript のみで記述する。Deno をプライマリランタイムとし、ファイルベースルーティング・型安全ハンドラー・ミドルウェアチェーンを提供する。

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
| **実行ランタイム** | Deno 2.x 以上。Node.js・Bun 等の他ランタイムは対象外 |
| **HTTP サーバー** | `Deno.serve` を使用する。Express 等の Node.js フレームワークは使用禁止 |
| **デプロイターゲット** | Deno ランタイムベースの Deploy と Adlaire Deploy の双方で動作することを保証する |
| **標準ライブラリ** | Deno 標準ライブラリ（`jsr:@std/*`）を優先して使用する |

### デプロイターゲット

| ターゲット | 方式 |
|-----------|------|
| **Deno ランタイムベースの Deploy** | エントリポイント（`main.ts`）を指定してデプロイ。Deno ランタイム上のエッジ・サーバー環境と完全互換 |
| **Adlaire Deploy** | `entry_point: main.ts` を設定。Adlaire Deploy の暗号化環境変数機能を使用 |

## 1.5 設計の柱

| 柱 | 説明 |
|----|------|
| **TypeScript 単一ソース** | 開発者は TypeScript のみ書く |
| **Adlaire Group 専用** | 汎用フレームワークではなく Adlaire Group のプロジェクト群に特化した設計とする |

## 1.6 適用範囲

- Adlaire Group が開発するすべての Web アプリケーション
- Adlaire Static CMS 管理画面（将来的な移行）
- Adlaire Deploy ダッシュボード（将来的な移行）
- Adlaire BaaS 管理 UI
- その他 Adlaire Group が開発する Web アプリケーション

## 1.7 保留事項

以下は現時点で未確定であり、RULEBOOK 追加改訂で策定する。

| 項目 | 現状 |
|------|------|
| UI レンダリング層（Preact / JSX / その他） | 検討中 |
| Islands アーキテクチャ（採用可否・仕様） | 検討中 |
| 共用ホスティング（Apache + PHP）対応の採否 | **未決定** |
| TypeScript → PHP トランスパイラの採否 | **未決定** |
| デュアルデプロイ対応方針 | **未決定** |

---

# 2. 技術スタック

| 要素 | 仕様 |
|------|------|
| 開発言語 | TypeScript（strict モード必須） |
| 開発ランタイム | Deno 2.x 以上 |
| デプロイターゲット | Deno Deploy / Adlaire Deploy（Deno ランタイム） |
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
| `deploy` | `"deno-deploy" \| "adlaire-deploy" \| "auto"` | `"auto"` | デプロイターゲット |

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

> 絶対原則§1.4「Deno ランタイム」に基づき、Deno ランタイムベースの Deploy と Adlaire Deploy の双方への対応を保証する。

## 10.1 Deno ランタイムベースの Deploy

- エントリポイント（`main.ts`）を指定してデプロイする。
- `Deno.serve` 使用のため Deno ランタイム上のエッジ・サーバー環境と完全互換。
- 環境変数は各 Deploy サービスのダッシュボードで管理する。

## 10.2 Adlaire Deploy

- プロジェクト設定の `entry_point` を `main.ts` に指定する。
- 環境変数は Adlaire Deploy の暗号化環境変数機能を使用する。
- `adlaire.config.ts` で `deploy: "adlaire-deploy"` を指定すると固有の最適化を適用する。

## 10.3 デプロイターゲット設定

| `deploy` 値 | 動作 |
|------------|------|
| `"deno-deploy"` | Deno Deploy 向けビルド |
| `"adlaire-deploy"` | Adlaire Deploy 向けビルド |
| `"auto"` | 環境変数から自動判定（ローカル開発時のデフォルト） |

## 10.4 デプロイ自動判定（`deploy: "auto"`）

| 環境変数 | 判定 |
|---------|------|
| `DENO_DEPLOYMENT_ID` が存在する | Deno Deploy として動作 |
| `ADLAIRE_DEPLOY` が存在する | Adlaire Deploy として動作 |
| どちらも存在しない | ローカル開発モード |

---

# 11. TypeScript → PHP トランスパイラ

> **未確定（§1.4 保留事項）**
> 共用ホスティング（Apache + PHP）対応の採否・方針が未決定のため、本セクションの仕様は策定していない。
> 採否が決定した後、RULEBOOK を先行改訂してから実装に着手すること。

---

# 12. CLI ツール

## 12.1 コマンド一覧

| コマンド | 説明 |
|---------|------|
| `adlaire new <app-name>` | 新規アプリケーションをテンプレートから作成 |
| `adlaire dev` | 開発サーバーを起動（ファイル変更を監視してリロード） |
| `adlaire build` | 本番ビルドを生成 |
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

## 13.1 npm 禁止（絶対原則§1.3 参照）

§1.3 絶対原則「npm 全面禁止」に基づき、`npm:` プレフィックスのインポートを**全面禁止**する。許可形式・禁止形式の詳細は §1.3 に定める。

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
| 12 | **TypeScript → PHP トランスパイラ** — §11 参照。共用ホスティング対応採否の決定後に策定 | 未確定 |

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
