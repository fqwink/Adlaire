# Adlaire Style — スタイルフレームワーク仕様ルールブック

> **文書バージョン: Ver.1.0**
> **最終更新: 2026-04-06**

---

# 1. 製品定義

## 1.1 概要

**Adlaire Style** は、Adlaire Group の全プロジェクトに適用する純粋 CSS スタイルフレームワークである。
デザイントークン（CSS カスタムプロパティ）を基盤とし、一貫したビジュアルアイデンティティと開発効率を提供する。

## 1.2 設計原則

| 原則 | 説明 |
|------|------|
| **純粋 CSS** | プリプロセッサ・トランスパイル・JavaScript 不要。ブラウザネイティブ機能のみ使用する |
| **トークンファースト** | すべてのビジュアル値は CSS カスタムプロパティ（デザイントークン）で定義する |
| **ゼロ依存** | npm・CDN への外部依存を持たない |
| **軽量** | 不要な汎用スタイルを含まない。Adlaire Group の使用実態に即したスコープに限定する |
| **ダークモード対応** | `prefers-color-scheme` および `.dark` クラスによる切り替えを標準サポートする |

## 1.3 適用対象プロジェクト

- Adlaire Static CMS
- Adlaire Portal System
- Adlaire Deploy（ダッシュボード Web UI）
- Adlaire BaaS（将来的な管理 UI）
- その他 Adlaire Group が開発する全プロジェクト

## 1.4 非適用範囲

- メールテンプレート（独立したスタイル管理を行う）
- 外部公開 API のレスポンス（HTML を含まないもの）

---

# 2. ディレクトリ構成

```
Adlaire Style/
├── CLAUDE.md
├── README.md
├── rulebookdocs/
│   ├── STYLE_RULEBOOK.md        # 本仕様書
│   └── REVISION_HISTORY.md     # 改訂履歴
├── docs/
│   └── CHANGES.md              # 変更履歴
├── src/
│   ├── tokens.css              # デザイントークン（CSS カスタムプロパティ）
│   ├── reset.css               # リセット・ベース CSS
│   ├── typography.css          # タイポグラフィ
│   ├── layout.css              # レイアウトユーティリティ
│   ├── components/
│   │   ├── button.css
│   │   ├── form.css
│   │   ├── card.css
│   │   ├── badge.css
│   │   ├── table.css
│   │   ├── alert.css
│   │   └── modal.css
│   └── utilities.css           # ユーティリティクラス
├── dist/
│   ├── adlaire-style.css       # 結合済みソース
│   └── adlaire-style.min.css   # minify 済み配布物
└── build.ts                    # Deno ビルドスクリプト
```

---

# 3. デザイントークン（`src/tokens.css`）

## 3.1 定義方式

すべてのデザイントークンは `:root` スコープの CSS カスタムプロパティとして定義する。
ダークモードトークンは `@media (prefers-color-scheme: dark)` と `.dark` セレクタの両方で上書きする。

## 3.2 カラートークン

### 3.2.1 ブランドカラー

| トークン名 | 説明 |
|-----------|------|
| `--color-primary` | プライマリカラー（アクションボタン等） |
| `--color-primary-hover` | プライマリホバー状態 |
| `--color-primary-active` | プライマリ押下状態 |
| `--color-secondary` | セカンダリカラー |
| `--color-secondary-hover` | セカンダリホバー状態 |

### 3.2.2 セマンティックカラー

| トークン名 | 説明 |
|-----------|------|
| `--color-success` | 成功状態（緑系） |
| `--color-warning` | 警告状態（黄系） |
| `--color-danger` | 危険・エラー状態（赤系） |
| `--color-info` | 情報状態（青系） |

### 3.2.3 ニュートラルカラー

| トークン名 | 説明 |
|-----------|------|
| `--color-bg` | ページ背景色 |
| `--color-bg-surface` | カード・パネル等のサーフェス背景色 |
| `--color-bg-muted` | 薄い背景色（コードブロック・非アクティブ等） |
| `--color-border` | 標準ボーダー色 |
| `--color-border-strong` | 強調ボーダー色 |
| `--color-text` | 基本テキスト色 |
| `--color-text-muted` | 補助テキスト色（説明文・プレースホルダー等） |
| `--color-text-inverse` | 逆色テキスト（ダーク背景上の白テキスト等） |

## 3.3 スペーシングトークン

4px グリッドベース。

| トークン名 | 値 | 説明 |
|-----------|-----|------|
| `--space-1` | 4px | 最小スペース |
| `--space-2` | 8px | |
| `--space-3` | 12px | |
| `--space-4` | 16px | 基本スペース |
| `--space-5` | 20px | |
| `--space-6` | 24px | |
| `--space-8` | 32px | |
| `--space-10` | 40px | |
| `--space-12` | 48px | |
| `--space-16` | 64px | |

## 3.4 タイポグラフィトークン

| トークン名 | 説明 |
|-----------|------|
| `--font-family-base` | 基本フォントファミリー（日本語 + ラテン文字） |
| `--font-family-mono` | 等幅フォント（コード表示用） |
| `--font-size-xs` | 12px |
| `--font-size-sm` | 14px |
| `--font-size-base` | 16px（基本サイズ） |
| `--font-size-lg` | 18px |
| `--font-size-xl` | 20px |
| `--font-size-2xl` | 24px |
| `--font-size-3xl` | 30px |
| `--font-size-4xl` | 36px |
| `--font-weight-normal` | 400 |
| `--font-weight-medium` | 500 |
| `--font-weight-semibold` | 600 |
| `--font-weight-bold` | 700 |
| `--line-height-tight` | 1.25 |
| `--line-height-base` | 1.5 |
| `--line-height-loose` | 1.75 |

## 3.5 ボーダー・シャドウトークン

| トークン名 | 説明 |
|-----------|------|
| `--radius-sm` | 4px |
| `--radius-base` | 6px |
| `--radius-lg` | 8px |
| `--radius-xl` | 12px |
| `--radius-full` | 9999px（ピル型） |
| `--shadow-sm` | 軽微な影 |
| `--shadow-base` | 標準カード影 |
| `--shadow-lg` | モーダル・ドロップダウン影 |

## 3.6 トランジショントークン

| トークン名 | 説明 |
|-----------|------|
| `--transition-fast` | 150ms ease |
| `--transition-base` | 200ms ease |
| `--transition-slow` | 300ms ease |

---

# 4. リセット・ベース CSS（`src/reset.css`）

## 4.1 リセット方針

- `box-sizing: border-box` をすべての要素に適用する。
- マージン・パディングのブラウザデフォルト差異を正規化する（Eric Meyer Reset ではなく Normalize ベース）。
- `font-size` を `16px` に固定する（`rem` 計算基準）。
- `line-height` をデフォルトトークン値に設定する。
- フォーカスリングを削除せず、`outline` を視認性の高いスタイルに置き換える。

## 4.2 禁止事項

- `* { margin: 0; padding: 0; }` による完全リセットは行わない（アクセシビリティ劣化のため）。
- ブラウザのデフォルトフォームスタイルを完全に除去しない（部分的な正規化のみ行う）。

---

# 5. タイポグラフィ（`src/typography.css`）

## 5.1 見出し

`h1`〜`h6` に対してフォントサイズ・ウェイト・ラインハイトをトークンで定義する。

| 要素 | フォントサイズトークン | ウェイトトークン |
|------|----------------------|---------------|
| `h1` | `--font-size-4xl` | `--font-weight-bold` |
| `h2` | `--font-size-3xl` | `--font-weight-bold` |
| `h3` | `--font-size-2xl` | `--font-weight-semibold` |
| `h4` | `--font-size-xl` | `--font-weight-semibold` |
| `h5` | `--font-size-lg` | `--font-weight-medium` |
| `h6` | `--font-size-base` | `--font-weight-medium` |

## 5.2 本文・インライン要素

- `p`: `--font-size-base`、`--line-height-base`
- `small`: `--font-size-sm`
- `code`, `kbd`, `pre`: `--font-family-mono`、`--font-size-sm`、`--color-bg-muted` 背景
- `strong`: `--font-weight-bold`
- `em`: イタリック
- `a`: `--color-primary`、ホバー時 `--color-primary-hover`

## 5.3 日本語対応

- `--font-family-base` に日本語フォントスタック（`"Hiragino Kaku Gothic ProN"`, `"Noto Sans JP"`, `sans-serif` 等）を含める。
- `word-break: break-all` を使用せず、`overflow-wrap: break-word` を適用する。

---

# 6. レイアウト（`src/layout.css`）

## 6.1 コンテナ

| クラス | 説明 |
|--------|------|
| `.container` | 最大幅 1200px、左右 auto マージン、水平パディング `--space-4` |
| `.container-sm` | 最大幅 640px |
| `.container-lg` | 最大幅 1440px |

## 6.2 Flexbox ユーティリティ

| クラス | 説明 |
|--------|------|
| `.flex` | `display: flex` |
| `.flex-col` | `flex-direction: column` |
| `.flex-wrap` | `flex-wrap: wrap` |
| `.items-center` | `align-items: center` |
| `.items-start` | `align-items: flex-start` |
| `.items-end` | `align-items: flex-end` |
| `.justify-center` | `justify-content: center` |
| `.justify-between` | `justify-content: space-between` |
| `.justify-end` | `justify-content: flex-end` |
| `.gap-1`〜`.gap-8` | `gap: var(--space-N)`（N=1〜8） |

## 6.3 Grid ユーティリティ

| クラス | 説明 |
|--------|------|
| `.grid` | `display: grid` |
| `.grid-cols-2`〜`.grid-cols-4` | 等幅 2〜4 カラム |
| `.grid-cols-auto` | `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` |

## 6.4 スペーシングユーティリティ

| 形式 | 説明 |
|------|------|
| `.m-{N}` | `margin: var(--space-N)` |
| `.mt-{N}`, `.mb-{N}`, `.ml-{N}`, `.mr-{N}` | 各方向マージン |
| `.mx-{N}`, `.my-{N}` | 横・縦マージン |
| `.p-{N}` | `padding: var(--space-N)` |
| `.pt-{N}`, `.pb-{N}`, `.pl-{N}`, `.pr-{N}` | 各方向パディング |
| `.px-{N}`, `.py-{N}` | 横・縦パディング |

N = `1`〜`8`（スペーシングトークンに対応）

---

# 7. コンポーネント

## 7.1 Button（`src/components/button.css`）

### 7.1.1 ベースクラス

`.btn` をベースクラスとし、修飾クラスと組み合わせて使用する。

```html
<button class="btn btn-primary">ボタン</button>
```

### 7.1.2 バリアント

| クラス | 説明 |
|--------|------|
| `.btn-primary` | プライマリアクション |
| `.btn-secondary` | セカンダリアクション |
| `.btn-danger` | 削除・危険操作 |
| `.btn-ghost` | ゴーストボタン（背景透過・ボーダーのみ） |
| `.btn-link` | リンク風ボタン |

### 7.1.3 サイズ

| クラス | 説明 |
|--------|------|
| `.btn-sm` | 小サイズ |
| `.btn-lg` | 大サイズ |

### 7.1.4 状態

- `:hover`: ホバー色にトランジション（`--transition-fast`）
- `:active`: 押下色
- `:disabled`, `[disabled]`: 不透明度 50%・`cursor: not-allowed`
- `.loading`: ローディングスピナー表示（CSS アニメーション）

## 7.2 Form（`src/components/form.css`）

### 7.2.1 対象要素

`input[type="text"]`, `input[type="email"]`, `input[type="password"]`, `input[type="number"]`, `input[type="search"]`, `textarea`, `select`

### 7.2.2 仕様

- ボーダー: `1px solid var(--color-border)`
- 角丸: `--radius-base`
- フォーカス時: `outline: 2px solid var(--color-primary)`、`outline-offset: 1px`
- エラー状態: `.is-error` クラス付与 → ボーダー色 `--color-danger`
- 補助テキスト: `.form-hint`（`--color-text-muted`、`--font-size-sm`）
- エラーメッセージ: `.form-error`（`--color-danger`、`--font-size-sm`）
- ラベル: `.form-label`（`--font-weight-medium`）
- グループ: `.form-group`（ラベル + 入力 + ヒントのラッパー）

## 7.3 Card（`src/components/card.css`）

| クラス | 説明 |
|--------|------|
| `.card` | 基本カード（背景 `--color-bg-surface`、影 `--shadow-base`、角丸 `--radius-lg`） |
| `.card-header` | カードヘッダー（ボーダーボトム） |
| `.card-body` | カードボディ（パディング `--space-4`） |
| `.card-footer` | カードフッター（ボーダートップ） |

## 7.4 Badge（`src/components/badge.css`）

| クラス | 説明 |
|--------|------|
| `.badge` | ベースバッジ（ピル型、`--radius-full`） |
| `.badge-primary` / `.badge-success` / `.badge-warning` / `.badge-danger` / `.badge-info` | セマンティックカラーバリアント |

## 7.5 Table（`src/components/table.css`）

| クラス | 説明 |
|--------|------|
| `.table` | ベーステーブル（幅 100%、ボーダーコラプス） |
| `.table-striped` | 奇数行に背景色 |
| `.table-hover` | ホバー行ハイライト |
| `.table-bordered` | 全セルにボーダー |

## 7.6 Alert（`src/components/alert.css`）

| クラス | 説明 |
|--------|------|
| `.alert` | ベースアラート |
| `.alert-success` / `.alert-warning` / `.alert-danger` / `.alert-info` | セマンティックバリアント |

## 7.7 Modal（`src/components/modal.css`）

- `.modal-backdrop`: フルスクリーンオーバーレイ（背景 `rgba(0,0,0,0.5)`）
- `.modal`: モーダルコンテナ（中央配置・`--shadow-lg`）
- `.modal-header` / `.modal-body` / `.modal-footer`: 内部構成
- 表示制御: `.modal[open]` または `.modal.is-open` クラスによる切り替え（JavaScript で付与）

---

# 8. ユーティリティクラス（`src/utilities.css`）

## 8.1 テキスト

| クラス | 説明 |
|--------|------|
| `.text-xs`〜`.text-4xl` | フォントサイズトークン適用 |
| `.text-muted` | `--color-text-muted` |
| `.text-center` / `.text-left` / `.text-right` | テキスト整列 |
| `.font-bold` / `.font-semibold` / `.font-medium` | ウェイト |
| `.truncate` | テキストの省略（`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`） |

## 8.2 表示・可視性

| クラス | 説明 |
|--------|------|
| `.hidden` | `display: none` |
| `.sr-only` | スクリーンリーダー専用（視覚的非表示） |
| `.block` / `.inline` / `.inline-block` | display 指定 |

## 8.3 その他

| クラス | 説明 |
|--------|------|
| `.w-full` | `width: 100%` |
| `.rounded` | `border-radius: var(--radius-base)` |
| `.rounded-full` | `border-radius: var(--radius-full)` |
| `.border` | `border: 1px solid var(--color-border)` |
| `.shadow` | `box-shadow: var(--shadow-base)` |
| `.cursor-pointer` | `cursor: pointer` |

---

# 9. ダークモード（`src/tokens.css` 内）

## 9.1 切り替え方式

以下の 2 つの方式を両方サポートする。

1. **OS 設定連動**: `@media (prefers-color-scheme: dark)` 内でトークンを上書き
2. **手動切り替え**: `<html class="dark">` または `<body class="dark">` にクラスを付与することで強制適用

## 9.2 ダークモードで上書きするトークン

- `--color-bg`: ダーク背景色
- `--color-bg-surface`: ダークサーフェス背景色
- `--color-bg-muted`: ダークミュート背景色
- `--color-border`: ダークボーダー色
- `--color-border-strong`: ダーク強調ボーダー色
- `--color-text`: ダーク基本テキスト色
- `--color-text-muted`: ダーク補助テキスト色

---

# 10. 配布形式

## 10.1 方針

**単一ファイル配布**を基本とする。

| ファイル | 説明 |
|----------|------|
| `dist/adlaire-style.css` | 全ソースを結合した非圧縮版（開発・デバッグ用） |
| `dist/adlaire-style.min.css` | minify 済み配布物（本番使用） |

## 10.2 ビルドスクリプト（`build.ts`）

- Deno スクリプトで実装する。
- `src/` 配下の CSS ファイルを以下の順序で結合する:
  1. `tokens.css`
  2. `reset.css`
  3. `typography.css`
  4. `layout.css`
  5. `components/button.css`
  6. `components/form.css`
  7. `components/card.css`
  8. `components/badge.css`
  9. `components/table.css`
  10. `components/alert.css`
  11. `components/modal.css`
  12. `utilities.css`
- minify は **コメント除去 + 連続空白・改行の圧縮** をビルドスクリプト内で実装する（外部ライブラリ不使用）。
- `npm:` プレフィックスの使用を**禁止**する（共通規約）。

## 10.3 バージョン付き配布

- `Distribution/` ディレクトリ（統合リポジトリルート）に以下を配置する:
  ```
  Distribution/
  └── adlaire-style-Ver.{Major}.{Minor}-{Build}.min.css
  ```
- 各プロジェクトへの組み込みは配布物を直接コピーして使用する。

## 10.4 各プロジェクトへの組み込み方法

```html
<link rel="stylesheet" href="/assets/css/adlaire-style.min.css">
```

---

# 11. 開発フェーズ

| Phase | 内容 |
|:-----:|------|
| 0 | **ルールブック策定**（本文書） |
| 1 | **デザイントークン + リセット + タイポグラフィ** — 基盤レイヤー実装 |
| 2 | **レイアウトユーティリティ + 基本コンポーネント**（Button / Form / Card） |
| 3 | **追加コンポーネント**（Badge / Table / Alert / Modal） |
| 4 | **ユーティリティクラス** — テキスト・表示・その他 |
| 5 | **ダークモード** — OS 連動 + 手動クラス切り替え |
| 6 | **ビルドスクリプト（`build.ts`）** + `dist/` 生成 + `Distribution/` 配布 |

---

# 12. 最終規則

## 12.1 上位規範性

本 RULEBOOK は、Adlaire Style のフレームワーク設計に関する上位規範文書である。

## 12.2 優先適用

フレームワーク設計に関して個別提案と本 RULEBOOK が衝突する場合、本 RULEBOOK を優先しなければならない。

## 12.3 改訂条件

本 RULEBOOK を改訂する場合は、デザイントークン互換性・既存プロジェクトへの影響・ビルド出力の変化を明示しなければならない。

---

# 13. 関連文書

| 文書 | 内容 |
|------|------|
| `REVISION_HISTORY.md` | 本プロジェクトの改訂履歴 |
| `CLAUDE.md`（統合ルート） | 共通開発規約 |
| `rulebookdocs/RELEASE_PLAN_RULEBOOK.md`（統合ルート） | リリース計画 |
