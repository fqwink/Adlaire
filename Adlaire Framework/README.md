# Adlaire Framework

Adlaire Group 全プロジェクトで共通利用する TypeScript 製フルスタックフレームワーク。

## 概要

- **Deno 2.x / TypeScript 5.x** — npm 依存ゼロ・型安全ファースト
- **明示的 Router API** — `createServer()` / `server.router.get()` / `server.router.group()`
- **ミドルウェアチェーン** — グローバル・ルートレベル・グループレベルで適用可能
- **デュアルデプロイ対応** — Deno Deploy（Fetch ハンドラー）/ Adlaire Deploy（`Deno.serve`）
- **バリデーター** — `Schema` 型 + `validate()` によるボディ検証
- **CORS / Logger / Rate Limiter / ETag / Compress** — 組み込みミドルウェア
- **静的ファイル配信 / Cookie / Content-Negotiation** — ユーティリティ
- **Core 構成** — `Core/` ディレクトリにフラット配置

## 状態

**Ver.1.0 — Phase 1 実装済み**

## 仕様

仕様の正: `rulebookdocs/FRAMEWORK_RULEBOOK.md`

## 使用方法

```typescript
import { createServer, json, validate } from "@adlaire/fw";

const server = createServer();

server.router.get("/", (ctx) => {
  return json({ message: "Hello, Adlaire Framework!" });
});

server.router.post("/users", async (ctx) => {
  const errors = validate(ctx.body, {
    name: { type: "string", required: true, min: 1, max: 50 },
  });
  if (errors.length > 0) return json({ errors }, 400);
  return json({ created: true }, 201);
});

// Deno Deploy
export default server.fetch;

// Adlaire Deploy
if (Deno.env.get("DEPLOY_TARGET") !== "deno-deploy") {
  server.listen(8000);
}
```

## ルートグループ

```typescript
const api = server.router.group("/api");

api.get("/users", (ctx) => json({ users: [] }));
api.get("/users/:id", (ctx) => json({ id: ctx.params.id }));
```

## ルートレベルミドルウェア

```typescript
import { createServer, json, cors } from "@adlaire/fw";

const server = createServer();

// 特定ルートにのみミドルウェアを適用
server.router.get("/admin", authMiddleware, (ctx) => {
  return json({ admin: true });
});
```

## 組み込みミドルウェア

```typescript
import { cors, logger, rateLimit, etag, compress } from "@adlaire/fw";

server.use(logger());
server.use(cors({ origin: "https://example.com", credentials: true }));
server.use(rateLimit({ windowMs: 60_000, max: 100 }));
server.use(etag());
server.use(compress());
```

## バリデーター

```typescript
server.router.post("/submit", async (ctx) => {
  const errors = validate(ctx.body, {
    name:   { type: "string", required: true, min: 1, max: 50 },
    age:    { type: "number", min: 0, max: 150 },
    active: { type: "boolean", nullable: true },
  });
  if (errors.length > 0) {
    return json({ errors }, 400);
  }
  return json({ ok: true });
});
```

## 静的ファイル配信

```typescript
import { serveStatic } from "@adlaire/fw";

server.router.get("/static/*path", serveStatic({ root: "./public" }));
```

## テスト

```typescript
const server = createServer();
server.router.get("/hello", () => json({ msg: "hi" }));

const res = await server.testRequest("GET", "/hello");
const body = await res.json(); // { msg: "hi" }
```

## LICENSE

Licensed under Adlaire License Ver.2.0, see [LICENSE](../Licenses/LICENSE_Ver.2.0)

## Copyright

Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏 All Rights Reserved.
