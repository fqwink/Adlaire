# Adlaire Style — 変更履歴

> 各バージョンの変更内容を記録する文書。
> 詳細仕様は `rulebookdocs/STYLE_RULEBOOK.md` を参照。

---

## Ver.1.0-1 — Phase 1〜6 一括実装

**日付**: 2026-04-06
**種別**: 追加機能（初版実装）

### Phase 1: デザイントークン + リセット + タイポグラフィ

- `src/tokens.css` — 全デザイントークン（カラー・スペーシング・タイポグラフィ・ボーダー・シャドウ・トランジション）
- `src/reset.css` — Normalize ベースリセット（box-sizing・フォーカスリング・基本正規化）
- `src/typography.css` — h1〜h6 見出し・本文・インライン要素・日本語対応

### Phase 2: レイアウト + 基本コンポーネント

- `src/layout.css` — コンテナ（sm/lg）・Flex ユーティリティ・Grid ユーティリティ・スペーシング・サイドバーレイアウト・レスポンシブ（768px）
- `src/components/button.css` — .btn ベース + primary/secondary/danger/outline/link バリアント + sm/lg サイズ + icon/loading 状態
- `src/components/form.css` — 入力要素正規化 + form-group/form-label/form-hint/form-error + エラー状態
- `src/components/card.css` — .card + card-header/card-body/card-footer

### Phase 3: 追加コンポーネント

- `src/components/header.css` — ページヘッダー（header-title/header-nav/header-actions）
- `src/components/nav.css` — ナビゲーション（nav-menu/nav-item/nav-link/nav-count）
- `src/components/breadcrumb.css` — パンくずリスト
- `src/components/badge.css` — バッジ 13 ステータスバリアント（running/stopped/failed/starting/deployed/deploy-failed/healthy/unhealthy/unknown/published/draft）
- `src/components/table.css` — テーブル（striped/hover/bordered）
- `src/components/alert.css` — アラート（success/warning/danger/info）
- `src/components/modal.css` — 基本モーダル + 差分表示モーダル（diff-line--added/removed/changed）
- `src/components/log-box.css` — ログビューア（log-entry/log-err/log-info/log-warn）
- `src/components/info-row.css` — 情報行（info-label/info-value）

### Phase 4: ユーティリティクラス

- `src/utilities.css` — テキスト・表示・可視性・サイズ・ボーダー・シャドウ・カーソル・ポジション

### Phase 5: ダークモード

- `src/tokens.css` 内に `@media (prefers-color-scheme: dark)` + `.dark` クラス切り替えを実装

### Phase 6: ビルドスクリプト + 配布

- `build.ts` — Deno ビルドスクリプト（17 ファイル結合 + minify）
- `deno.json` — `deno task build` タスク定義
- `dist/adlaire-style.css` — 結合済み非圧縮版（29,260 bytes）
- `dist/adlaire-style.min.css` — minify 済み配布物（22,668 bytes）
- `Distribution/adlaire-style-Ver.1.0-1.min.css` — 配布物
