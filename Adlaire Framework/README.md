# Adlaire Framework

Adlaire Group の全プロジェクトに適用する TypeScript 製 Web フレームワーク。

Deno をランタイムとし、Deno Deploy および Adlaire Deploy の双方に対応する。
Deno の Web フレームワーク Fresh にインスパイアされつつ、Adlaire Group 独自の仕様（型安全ファースト・npm 禁止）を採用する。

## 特徴

- **型安全ファースト** — ルートパラメータ・ハンドラーデータの型をフレームワークが自動提供
- **ファイルベースルーティング** — `routes/` ディレクトリ構造が URL に直接対応
- **ゼロ npm** — `npm:` インポート全面禁止（Adlaire Group 規約）
- **デュアルデプロイ対応** — Deno Deploy / Adlaire Deploy 両対応
- **Adlaire Style 統合** — Adlaire Style の自動注入

## 状態

**Phase 0 完了**（ルールブック策定済み）

実装は Phase 1 以降。

## 仕様

`rulebookdocs/FRAMEWORK_RULEBOOK.md` を参照。

## LICENSE

Copyright (c) 2026 Adlaire Group & 倉田和宏 All Rights Reserved.
Licensed under Adlaire License Ver.2.0
