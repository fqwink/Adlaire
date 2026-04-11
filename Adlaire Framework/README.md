# Adlaire Framework

Adlaire Group 全プロジェクトで共通利用する TypeScript 製バックエンドフレームワーク。

## 概要

- **Deno 2.x / TypeScript 5.x** — npm 依存ゼロ・型安全ファースト
- **明示的 Router API** — `createServer()` / `server.get()` / `server.group()`
- **ミドルウェアチェーン** — `server.use()` による登録順処理
- **デュアルデプロイ対応** — Deno Deploy（Fetch ハンドラー）/ Adlaire Deploy（`Deno.serve`）
- **組み込みバリデーター** — `Schema` 型 + `validate()` によるボディ検証
- **静的ファイル配信** — `serveStatic()` ミドルウェア
- **5 ファイル Core 構成** — `types` / `server` / `router` / `middleware` / `response`

## 状態

**Ver.1.12-14 — 実装済み**

## 仕様

仕様の正: `rulebookdocs/FRAMEWORK_RULEBOOK.md`

## 使用方法

```typescript
import { createServer } from "adlaire-fw/server";
import { json } from "adlaire-fw/response";

const server = createServer();

server.router.get("/", (ctx) => {
  return json({ message: "Hello, Adlaire Framework!" });
});

server.router.post("/users", async (ctx) => {
  const body = ctx.body as { name: string };
  return json({ created: body }, 201);
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

## ミドルウェア

```typescript
server.use(async (ctx, next) => {
  console.log(`${ctx.req.method} ${ctx.req.url}`);
  return await next();
});
```

## バリデーター

```typescript
import { validate } from "adlaire-fw/middleware";

server.router.post("/submit", async (ctx) => {
  const errors = validate(ctx.body, {
    name: { type: "string", required: true, min: 1, max: 50 },
    age:  { type: "number", min: 0, max: 150 },
  });
  if (errors.length > 0) {
    return json({ errors }, 400);
  }
  return json({ ok: true });
});
```

## LICENSE

Licensed under Adlaire License Ver.2.0, see [LICENSE](../Licenses/LICENSE_Ver.2.0)

## Copyright

Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏 All Rights Reserved.
