# Adlaire Framework

Adlaire Group 全プロジェクトに適用する TypeScript 製 Web フレームワーク。

## 概要

- **Deno / TypeScript** — npm 依存ゼロ・型安全ファースト
- **ファイルベースルーティング** — `routes/` ディレクトリ構造が URL に直結
- **ミドルウェアチェーン** — `_middleware.ts` による階層的な処理
- **組み込みミドルウェア** — cors / logger / rateLimit / compress / jwtAuth / csrf / securityHeaders / requestId / cache
- **WebSocket / SSE 対応** — `ctx.upgradeWebSocket()` / `ctx.sse()`
- **CLI ツール** — `adlaire new` / `adlaire dev` / `adlaire build` / `adlaire check` / `adlaire routes` / `adlaire deploy`

## 状態

**Ver.1.12-14 — 実装済み**

## 仕様

仕様の正: `rulebookdocs/FRAMEWORK_RULEBOOK.md`

## 使用方法

```typescript
// adlaire.config.ts
import { defineConfig } from "./src/mod.ts";

export default defineConfig({
  port: 8000,
  onStart(port) {
    console.log(`Server running on http://localhost:${port}`);
  },
});
```

```typescript
// routes/index.ts
import { defineHandler } from "../src/mod.ts";

export default defineHandler(() => {
  return new Response("Hello, Adlaire Framework!");
});
```

## CLI

```bash
# 開発サーバー起動（ファイル監視リロード付き）
deno run -A cli/main.ts dev

# 新規プロジェクト生成
deno run -A cli/main.ts new my-project

# ビルド
deno run -A cli/main.ts build --target=deno

# ルート一覧表示
deno run -A cli/main.ts routes
```

## LICENSE

Licensed under Adlaire License Ver.2.0, see [LICENSE](../Licenses/LICENSE_Ver.2.0)

## Copyright

Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏 All Rights Reserved.
