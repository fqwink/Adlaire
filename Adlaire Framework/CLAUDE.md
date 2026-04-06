# Adlaire Framework — 開発規約

> 本ファイルは Adlaire 統合リポジトリ共通規約（ルート `CLAUDE.md`）に準拠する。
> 共通規約と本ファイルが衝突する場合、**共通規約を優先**する。

---

## ルールブック規律

- **RULEBOOK に記載のない機能を実装してはならない。**
- 新機能・変更はまず `rulebookdocs/FRAMEWORK_RULEBOOK.md` に仕様を策定してから実装に着手すること。
- UIレイヤー・Islands アーキテクチャは保留事項であり、RULEBOOK 改訂前に実装してはならない。

---

## ドキュメント配置

| ファイル | 内容 |
|---------|------|
| `CLAUDE.md` | 本ファイル（開発規約） |
| `README.md` | プロジェクト説明 |
| `rulebookdocs/FRAMEWORK_RULEBOOK.md` | フレームワーク仕様（正式仕様） |
| `rulebookdocs/REVISION_HISTORY.md` | ルールブック改訂履歴 |
| `docs/CHANGES.md` | 実装変更履歴 |

---

## 技術規約

### 言語・ランタイム

- **言語**: TypeScript（strict モード必須）
- **ランタイム**: Deno 2.x 以上
- **npm 禁止**: `npm:` プレフィックスのインポートを全面禁止する

### 許可インポート

```typescript
// 許可
import { serve } from "jsr:@std/http";
import { join } from "jsr:@std/path";
import { something } from "https://deno.land/x/package/mod.ts";
import { something } from "./local.ts";

// 禁止
import React from "npm:react";
import express from "npm:express";
```

### TypeScript 設定

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 型安全規約

- `any` 型の使用を原則禁止とする（`unknown` を使用すること）
- `as` キャストは最小限にとどめ、型ガードを優先して使用する
- ルートパラメータ型は `defineHandler` を経由してフレームワークから取得し、手書き禁止

---

## リポジトリ管理

- 統合リポジトリ（`fqwink/Adlaire`）内の `Adlaire Framework/` ディレクトリで管理する
- 配布物は統合リポジトリルートの `Distribution/` ディレクトリに集約する
