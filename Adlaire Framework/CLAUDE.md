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

- **Deno / TypeScript**（ランタイム・実装言語）
- **ファイルベースルーティング**（`routes/` ディレクトリ探索）
- **型安全ファースト**（`defineHandler` / `Context<Params>` / 型ガード）
- **WebCrypto API**（JWT 署名・CSRF 等の暗号処理）

### 禁止事項

- `npm:` プレフィックスのインポートを全面禁止（共通規約）
- サードパーティ製 HTTP フレームワークへの依存禁止
- `eval()`・`Function()` 等の動的コード実行禁止
- `any` 型の多用禁止（やむを得ない場合はコメントで理由を明記）

### TypeScript 実装規則

- `strict: true` を必須とする（`deno.json` 設定）
- パブリック API は明示的な型注釈を付与する
- 型ガード関数（`guard?` パラメータ）は `unknown` を受け取り `boolean` を返す純粋関数とする
- `any` を返す関数は原則禁止。`unknown` または具体的な型を使用する

---

## リポジトリ管理

- 統合リポジトリ: `fqwink/Adlaire`
- ディレクトリパス: `Adlaire Framework/`
- ブランチ戦略: 統合リポジトリの規約に準拠
