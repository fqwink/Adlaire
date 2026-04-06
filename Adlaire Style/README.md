# Adlaire Style

Adlaire Group の全プロジェクトに適用する純粋 CSS スタイルフレームワーク。

## 概要

- **純粋 CSS**（CSS カスタムプロパティ / CSS Nesting）— プリプロセッサ・JavaScript 不要
- **デザイントークンファースト** — 全ビジュアル値を CSS 変数で管理
- **ゼロ依存** — npm・CDN への外部依存なし
- **ダークモード対応** — OS 設定連動 + 手動クラス切り替え

## 状態

**Ver.1.0 — 仕様策定済み・実装未着手**

## 仕様

仕様の正: `rulebookdocs/STYLE_RULEBOOK.md`

## 使用方法

```html
<link rel="stylesheet" href="/assets/css/adlaire-style.min.css">
```

## ビルド

```bash
deno run --allow-read --allow-write build.ts
```

## LICENSE

Licensed under Adlaire License Ver.2.0, see [LICENSE](../Licenses/LICENSE_Ver.2.0)

## Copyright

Copyright (c) 2014 - 2026 Adlaire Group & 倉田和宏 All Rights Reserved.
