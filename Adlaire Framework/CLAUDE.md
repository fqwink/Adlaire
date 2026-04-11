# Adlaire Framework — 開発規約

> **`RULEBOOK`（ルールブック / 仕様書）は絶対原則である。**
> すべての実装は RULEBOOK の仕様に基づいて行うこと。
> **RULEBOOK に記載のない機能を実装してはならない。**
> 新機能・変更は、**まず RULEBOOK に仕様を策定・記載してから実装に着手すること。**

---

## Adlaire 共通規約への準拠

本プロジェクトは、統合リポジトリルートの `CLAUDE.md`（共通規約）に完全準拠する。
共通規約と本ファイルが衝突する場合、**共通規約を優先する**。

---

## ドキュメント配置

| パス | 内容 |
|------|------|
| `rulebookdocs/FRAMEWORK_RULEBOOK.md` | **正式仕様書**（唯一の仕様管理文書） |
| `rulebookdocs/REVISION_HISTORY.md` | ルールブック改訂履歴 |
| `docs/CHANGES.md` | 変更履歴 |

---

## 技術規約

### 使用技術

- **Deno 2.x / TypeScript 5.x**（ランタイム・実装言語）
- **明示的 Router API**（`createServer()` / `server.get()` / `server.group()`）
- **Web 標準 API**（`Request` / `Response` / `URL` / `ReadableStream` / `crypto.subtle`）
- **Deno 標準ライブラリ**（`jsr:@std/*` のみ許可）

### 型安全方針（絶対原則）

型安全は**フレームワーク自身の実装が決定・保証する**。Core 5 ファイルの実装において以下を遵守する。

- `any` 型・`// @ts-ignore`・`// @ts-expect-error`・`as any` の使用禁止
- 動的な値には `unknown` を使用し、型ガードで絞り込む
- 公開 API は型推論ファーストで設計し、利用者が型引数を省略できることを目標とする
- `strict: true`・`noImplicitAny: true`・`exactOptionalPropertyTypes: true` を必須とする（`deno.json` 設定）
- `Handler` は必ず `Response` を返す（`void` 禁止）

### その他禁止事項（絶対原則）

- `npm:` スペシャライザーのインポートを全面禁止（`jsr:@std/*` と Web 標準 API のみ）
- `node:` スペシャライザー（Node.js 互換レイヤー）の使用禁止
- サードパーティ製 HTTP フレームワークへの依存禁止
- `eval()`・`Function()` 等の動的コード実行禁止

---

## リポジトリ管理

- 統合リポジトリ: `fqwink/Adlaire`
- ディレクトリパス: `Adlaire Framework/`
- ブランチ戦略: 統合リポジトリの規約に準拠
