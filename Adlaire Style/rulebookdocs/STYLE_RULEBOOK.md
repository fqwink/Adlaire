# Adlaire Style — スタイルフレームワーク仕様ルールブック

> **文書バージョン: Ver.1.1**
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
│   ├── layout.css              # レイアウト・サイドバー・レスポンシブ
│   ├── components/
│   │   ├── header.css          # ページヘッダー
│   │   ├── nav.css             # ナビゲーション
│   │   ├── breadcrumb.css      # パンくずリスト
│   │   ├── button.css          # ボタン
│   │   ├── form.css            # フォーム要素
│   │   ├── card.css            # カード
│   │   ├── badge.css           # バッジ・ステータス
│   │   ├── table.css           # テーブル
│   │   ├── alert.css           # アラート
│   │   ├── modal.css           # モーダル・差分表示
│   │   ├── log-box.css         # ログビューア
│   │   └── info-row.css        # 情報行（ラベル + 値）
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

現行プロジェクト全体で統一されている Adlaire Group ブランドカラーを使用する。

| トークン名 | ライト値 | 説明 |
|-----------|---------|------|
| `--color-primary` | `#00a968` | Adlaire エメラルドグリーン（アクション・アクティブ状態） |
| `--color-primary-hover` | `#008754` | プライマリホバー状態 |
| `--color-primary-active` | `#006b43` | プライマリ押下状態 |
| `--color-primary-light` | `#e0f7ed` | プライマリ薄色（バッジ背景・ハイライト等） |
| `--color-accent` | `#11aabb` | アクセントシアン（トグル・補助アクション） |

### 3.2.2 セマンティックカラー

ステータスバッジ・アラート等で使用するセマンティックカラーを定義する。
各カラーに対して `bg`（背景）・`text`（テキスト）・`border`（ボーダー）の 3 トークンを持つ。

| トークン名 | ライト値 | 説明 |
|-----------|---------|------|
| `--color-success-bg` | `#dcfce7` | 成功背景色 |
| `--color-success-text` | `#166534` | 成功テキスト色 |
| `--color-success-border` | `#bbf7d0` | 成功ボーダー色 |
| `--color-warning-bg` | `#fef3c7` | 警告背景色 |
| `--color-warning-text` | `#92400e` | 警告テキスト色 |
| `--color-warning-border` | `#fde68a` | 警告ボーダー色 |
| `--color-danger-bg` | `#fee2e2` | 危険背景色 |
| `--color-danger-text` | `#991b1b` | 危険テキスト色 |
| `--color-danger-border` | `#fecaca` | 危険ボーダー色 |
| `--color-info-bg` | `#dbeafe` | 情報背景色 |
| `--color-info-text` | `#1e40af` | 情報テキスト色 |
| `--color-info-border` | `#bfdbfe` | 情報ボーダー色 |
| `--color-neutral-bg` | `#f3f4f6` | ニュートラル背景色（停止・不明状態等） |
| `--color-neutral-text` | `#4b5563` | ニュートラルテキスト色 |
| `--color-neutral-border` | `#e5e7eb` | ニュートラルボーダー色 |

### 3.2.3 ニュートラルカラー

| トークン名 | ライト値 | ダーク値 | 説明 |
|-----------|---------|---------|------|
| `--color-bg` | `#f4f8fa` | `#1a1a2e` | ページ背景色 |
| `--color-bg-surface` | `#ffffff` | `#2a2a3e` | カード・パネル等のサーフェス背景色 |
| `--color-bg-muted` | `#f1f5f9` | `#0d1117` | 薄い背景色（コードブロック・非アクティブ等） |
| `--color-bg-dark` | `#1f2b33` | `#0d1117` | ダークパネル（コードエディタ・ターミナル等） |
| `--color-border` | `#e2e8f0` | `#444` | 標準ボーダー色 |
| `--color-border-strong` | `#94a3b8` | `#555` | 強調ボーダー色 |
| `--color-text` | `#444` | `#dfe6e9` | 基本テキスト色 |
| `--color-text-sub` | `#666` | `#b2bec3` | サブテキスト色 |
| `--color-text-muted` | `#888` | `#aaa` | 補助テキスト色（説明文・プレースホルダー等） |
| `--color-text-inverse` | `#ffffff` | `#1a1a2e` | 逆色テキスト（カラー背景上のテキスト） |

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

| トークン名 | 値 | 説明 |
|-----------|-----|------|
| `--font-family-base` | `"Verdana", "Hiragino Kaku Gothic ProN", "Meiryo", system-ui, sans-serif` | 基本フォントファミリー（日本語 + ラテン文字） |
| `--font-family-mono` | `"Courier New", "Consolas", monospace` | 等幅フォント（コード・ログ表示用） |
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

- `--font-family-base` に日本語フォントスタック（`"Hiragino Kaku Gothic ProN"`, `"Meiryo"` 等）を含める（§3.4 参照）。
- `word-break: break-all` を使用せず、`overflow-wrap: break-word` を適用する。
- `line-height` は `--line-height-base`（1.5）を基本とし、日本語の可読性を確保する。

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
| `.grid-cols-auto` | `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` — 汎用カード配置 |
| `.grid-cols-card` | `grid-template-columns: repeat(auto-fill, minmax(190px, 1fr))` — Portal System カード配置 |

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

## 6.5 サイドバーレイアウト（`src/layout.css`）

Portal System および管理画面で使用する 2 カラムレイアウト（サイドバー + メインコンテンツ）。

| クラス | 説明 |
|--------|------|
| `.layout` | サイドバー + メインの 2 カラム全画面レイアウト（`display: flex; height: 100vh`） |
| `.sidebar` | 左サイドバー（`width: var(--sidebar-w)`、固定幅） |
| `.main` | メインコンテンツエリア（`flex: 1; overflow-y: auto`） |

追加トークン:

| トークン名 | 値 | 説明 |
|-----------|-----|------|
| `--sidebar-w` | `260px` | サイドバー幅 |

## 6.6 レスポンシブ対応

Adlaire Group プロジェクト共通のブレークポイントは **768px** を使用する。

| ブレークポイント | 対象 | 説明 |
|---------------|------|------|
| `max-width: 768px` | スマートフォン | モバイル向けスタイルを適用 |
| `min-width: 769px` | タブレット・デスクトップ | デスクトップ向けスタイルを適用 |

モバイル時の変化（フレームワークが自動適用）:
- `.layout`: `flex-direction: column`、サイドバーを水平配置に変更
- `.grid-cols-card`: `minmax(140px, 1fr)` に縮小
- `.container`: 水平パディングを `--space-4` に縮小
- `.sidebar`: 固定幅を解除し横スクロールナビに変更

---

# 7. コンポーネント

## 7.1 Header（`src/components/header.css`）

Adlaire Deploy ダッシュボード・Static CMS 管理画面で共通使用するページヘッダー。

| クラス | 説明 |
|--------|------|
| `.header` | ページヘッダー全体（`display: flex; align-items: center; justify-content: space-between`） |
| `.header-title` | ヘッダータイトル・ロゴエリア |
| `.header-nav` | ヘッダー内ナビゲーションリンクエリア |
| `.header-actions` | ヘッダー右端アクションエリア（ログアウト等） |

## 7.2 Nav（`src/components/nav.css`）

Portal System で使用するサイドバーナビゲーション。

| クラス | 説明 |
|--------|------|
| `.nav-menu` | ナビゲーションリスト（`list-style: none`） |
| `.nav-item` | ナビゲーション項目 |
| `.nav-link` | ナビゲーションリンク（`display: flex; align-items: center`） |
| `.nav-link.is-active` | アクティブ状態（`--color-primary` 背景・`--color-primary-light` テキスト） |
| `.nav-count` | 項目数バッジ（右端に配置） |

## 7.3 Breadcrumb（`src/components/breadcrumb.css`）

Adlaire Deploy ダッシュボードで使用するパンくずリスト。

| クラス | 説明 |
|--------|------|
| `.breadcrumb` | パンくずリスト全体（`display: flex; align-items: center; gap: var(--space-2)`） |
| `.breadcrumb-item` | パンくず項目 |
| `.breadcrumb-item:not(:last-child)::after` | 区切り文字（`/`） |
| `.breadcrumb-item.is-current` | 現在ページ（`--color-text-muted`、リンクなし） |

## 7.4 Button（`src/components/button.css`）

### 7.4.1 ベースクラス

`.btn` をベースクラスとし、修飾クラスと組み合わせて使用する。

```html
<button class="btn btn-primary">ボタン</button>
```

### 7.4.2 カラーバリアント

| クラス | 説明 |
|--------|------|
| `.btn-primary` | プライマリアクション（`--color-primary` 背景） |
| `.btn-secondary` | セカンダリアクション |
| `.btn-danger` | 削除・危険操作（`--color-danger-bg` 系） |
| `.btn-outline` | アウトラインボタン（背景透過・ボーダーのみ）。`.btn-ghost` は `.btn-outline` の別名とする |
| `.btn-link` | リンク風ボタン（背景なし・テキストのみ） |

### 7.4.3 サイズ

| クラス | 説明 |
|--------|------|
| `.btn-sm` | 小サイズ（`--font-size-sm`、パディング `--space-1` / `--space-2`） |
| `.btn-lg` | 大サイズ（`--font-size-lg`、パディング `--space-3` / `--space-6`） |

### 7.4.4 機能バリアント

| クラス | 説明 |
|--------|------|
| `.btn-icon` | アイコンのみボタン（正方形・テキストなし想定） |

### 7.4.5 状態

- `:hover`: ホバー色にトランジション（`--transition-fast`）
- `:active`: 押下色
- `:disabled`, `[disabled]`: 不透明度 50%・`cursor: not-allowed`
- `.loading`: ローディングスピナー表示（CSS アニメーション）

## 7.5 Form（`src/components/form.css`）

### 7.5.1 対象要素

`input[type="text"]`, `input[type="email"]`, `input[type="password"]`, `input[type="number"]`, `input[type="search"]`, `textarea`, `select`

### 7.5.2 仕様

- ボーダー: `1px solid var(--color-border)`
- 角丸: `--radius-base`
- フォーカス時: `outline: 2px solid var(--color-primary)`、`outline-offset: 1px`
- エラー状態: `.is-error` クラス付与 → ボーダー色 `--color-danger`
- 補助テキスト: `.form-hint`（`--color-text-muted`、`--font-size-sm`）
- エラーメッセージ: `.form-error`（`--color-danger`、`--font-size-sm`）
- ラベル: `.form-label`（`--font-weight-medium`）
- グループ: `.form-group`（ラベル + 入力 + ヒントのラッパー）

## 7.6 Card（`src/components/card.css`）

| クラス | 説明 |
|--------|------|
| `.card` | 基本カード（背景 `--color-bg-surface`、影 `--shadow-base`、角丸 `--radius-lg`） |
| `.card-header` | カードヘッダー（ボーダーボトム） |
| `.card-body` | カードボディ（パディング `--space-4`） |
| `.card-footer` | カードフッター（ボーダートップ） |

## 7.7 Badge（`src/components/badge.css`）

### 7.7.1 セマンティックバリアント

| クラス | 説明 |
|--------|------|
| `.badge` | ベースバッジ（ピル型、`--radius-full`、`--font-size-xs`） |
| `.badge-primary` | プライマリ（`--color-primary` 背景） |
| `.badge-success` | 成功（`--color-success-bg` / `--color-success-text`） |
| `.badge-warning` | 警告（`--color-warning-bg` / `--color-warning-text`） |
| `.badge-danger` | 危険（`--color-danger-bg` / `--color-danger-text`） |
| `.badge-info` | 情報（`--color-info-bg` / `--color-info-text`） |
| `.badge-neutral` | ニュートラル（`--color-neutral-bg` / `--color-neutral-text`） |

### 7.7.2 デプロイ・プロセスステータスバリアント

Adlaire Deploy ダッシュボードで使用するプロセス・デプロイ状態のバッジ。

| クラス | 対応状態 | カラー |
|--------|---------|-------|
| `.badge-running` | running（起動中） | success 系（`#dcfce7` / `#166534`） |
| `.badge-stopped` | stopped（停止） | neutral 系（`#f3f4f6` / `#4b5563`） |
| `.badge-failed` | failed（失敗） | danger 系（`#fee2e2` / `#991b1b`） |
| `.badge-starting` | starting（起動準備中） | warning 系（`#fef3c7` / `#92400e`） |
| `.badge-deployed` | deployed（デプロイ完了） | success 系 |
| `.badge-deploy-failed` | deploy_failed（デプロイ失敗） | danger 系 |

### 7.7.3 クラスタ・ヘルスステータスバリアント

Adlaire Deploy クラスタノードのヘルス状態バッジ。

| クラス | 対応状態 | カラー |
|--------|---------|-------|
| `.badge-healthy` | healthy（正常） | success 系 |
| `.badge-unhealthy` | unhealthy（異常） | danger 系 |
| `.badge-unknown` | unknown（不明） | neutral 系 |

### 7.7.4 コンテンツステータスバリアント

Adlaire Static CMS のコンテンツ状態表示。

| クラス | 対応状態 | カラー |
|--------|---------|-------|
| `.status-published` | published（公開） | success 系 |
| `.status-draft` | draft（下書き） | neutral 系 |

## 7.8 Table（`src/components/table.css`）

| クラス | 説明 |
|--------|------|
| `.table` | ベーステーブル（幅 100%、`border-collapse: collapse`） |
| `.table-striped` | 奇数行に `--color-bg-muted` 背景 |
| `.table-hover` | ホバー行ハイライト |
| `.table-bordered` | 全セルにボーダー |

## 7.9 Alert（`src/components/alert.css`）

| クラス | 説明 |
|--------|------|
| `.alert` | ベースアラート（パディング `--space-3`・角丸 `--radius-base`） |
| `.alert-success` | 成功アラート（`--color-success-bg` / `--color-success-text` / `--color-success-border`） |
| `.alert-warning` | 警告アラート（warning 系） |
| `.alert-danger` | 危険アラート（danger 系） |
| `.alert-info` | 情報アラート（info 系） |

## 7.10 Modal（`src/components/modal.css`）

### 7.10.1 基本モーダル

| クラス | 説明 |
|--------|------|
| `.modal-backdrop` | フルスクリーンオーバーレイ（`position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000`） |
| `.modal` | モーダルコンテナ（中央配置・`--shadow-lg`） |
| `.modal-header` | モーダルヘッダー（タイトル + 閉じるボタン） |
| `.modal-body` | モーダルボディ |
| `.modal-footer` | モーダルフッター（アクションボタン） |
| `.modal-close` | 閉じるボタン（右上配置） |

表示制御: `.modal.is-open` クラスを JavaScript で付与して表示・非表示を切り替える。

### 7.10.2 差分表示モーダル（Diff Viewer）

Static CMS の差分表示機能で使用する専用モーダル。

| クラス | 説明 |
|--------|------|
| `.diff-modal` | 差分表示モーダル全体（`position: fixed; z-index: 10000`） |
| `.diff-modal__backdrop` | 背景オーバーレイ |
| `.diff-modal__content` | 差分コンテンツエリア（等幅フォント） |
| `.diff-modal__close` | 閉じるボタン |
| `.diff-line--added` | 追加行（薄緑背景） |
| `.diff-line--removed` | 削除行（薄赤背景） |
| `.diff-line--changed` | 変更行（薄黄背景） |

## 7.11 Log Box（`src/components/log-box.css`）

Adlaire Deploy のデプロイログ・SSE ストリーミングログ表示で使用するログビューア。

| クラス | 説明 |
|--------|------|
| `.log-box` | ログ表示エリア全体（`font-family: var(--font-family-mono)`・`--color-bg-dark` 背景・スクロール対応） |
| `.log-entry` | ログ1行 |
| `.log-err` | エラーログ行（`--color-danger-text` またはオレンジ系） |
| `.log-info` | 情報ログ行（`--color-text-muted`） |
| `.log-warn` | 警告ログ行（`--color-warning-text`） |

## 7.12 Info Row（`src/components/info-row.css`）

Adlaire Deploy プロジェクト詳細画面で使用するラベル + 値の横並び表示。

| クラス | 説明 |
|--------|------|
| `.info-row` | 1行全体（`display: flex; gap: var(--space-4)`） |
| `.info-label` | ラベル部分（`--color-text-muted`・`--font-weight-medium`・最小幅固定） |
| `.info-value` | 値部分（`--color-text`） |

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

現行プロジェクト（Static CMS・Portal System・Admin）のダークモード色を統一して定義する。

| トークン名 | ダーク値 | 出典 |
|-----------|---------|------|
| `--color-bg` | `#1a1a2e` | Admin Panel |
| `--color-bg-surface` | `#2a2a3e` | Admin Panel |
| `--color-bg-muted` | `#0d1117` | コードブロック |
| `--color-border` | `#444` | Admin Panel |
| `--color-border-strong` | `#555` | Admin Panel |
| `--color-text` | `#dfe6e9` | Portal System |
| `--color-text-sub` | `#b2bec3` | 補助テキスト |
| `--color-text-muted` | `#aaa` | Admin Panel |
| `--color-accent` | `#11aabb` | Admin Panel |

## 9.3 ダークモード非対応プロジェクト

- **Adlaire Deploy ダッシュボード**: 現行実装はライトモードのみ。Adlaire Style 適用時にダークモード対応を追加する。

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
  5. `components/header.css`
  6. `components/nav.css`
  7. `components/breadcrumb.css`
  8. `components/button.css`
  9. `components/form.css`
  10. `components/card.css`
  11. `components/badge.css`
  12. `components/table.css`
  13. `components/alert.css`
  14. `components/modal.css`
  15. `components/log-box.css`
  16. `components/info-row.css`
  17. `utilities.css`
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
