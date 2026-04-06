# Adlaire Style — スタイルフレームワーク仕様ルールブック

> **文書バージョン: Ver.1.2**
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
│   │   ├── form.css            # フォーム要素（テキスト系 + checkbox / radio / file / range / color）
│   │   ├── card.css            # カード
│   │   ├── badge.css           # バッジ・ステータス
│   │   ├── table.css           # テーブル
│   │   ├── alert.css           # アラート
│   │   ├── modal.css           # モーダル・差分表示
│   │   ├── log-box.css         # ログビューア
│   │   ├── info-row.css        # 情報行（ラベル + 値）
│   │   ├── tooltip.css         # ツールチップ
│   │   ├── pagination.css      # ページネーション
│   │   ├── progress.css        # プログレスバー
│   │   ├── tabs.css            # タブ
│   │   ├── skeleton.css        # スケルトンローダー
│   │   ├── toggle.css          # トグル / スイッチ
│   │   ├── stepper.css         # ステッパー
│   │   ├── accordion.css       # アコーディオン / コラプス
│   │   ├── toast.css           # トースト通知
│   │   ├── stat-card.css       # スタットカード / メトリクス
│   │   ├── timeline.css        # タイムライン
│   │   ├── status-indicator.css # ステータスドット
│   │   ├── empty-state.css     # エンプティステート
│   │   ├── avatar.css          # アバター
│   │   ├── divider.css         # ディバイダー
│   │   ├── kbd.css             # キーボードショートカット
│   │   ├── file-tree.css       # ファイルツリー
│   │   └── split-pane.css      # スプリットペイン / エディタレイアウト
│   ├── utilities.css           # ユーティリティクラス
│   └── print.css               # 印刷スタイル（@media print）
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
ダーク値は §9.2 を参照。

**ライト値**

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

| トークン名 | ライト値 | 説明 |
|-----------|---------|------|
| `--radius-sm` | `4px` | |
| `--radius-base` | `6px` | |
| `--radius-lg` | `8px` | |
| `--radius-xl` | `12px` | |
| `--radius-full` | `9999px` | ピル型 |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.06)` | 軽微な影 |
| `--shadow-base` | `0 4px 6px rgba(0,0,0,0.05)` | 標準カード影 |
| `--shadow-lg` | `0 20px 50px rgba(0,0,0,0.2)` | モーダル・ドロップダウン影 |

ダークモードでの上書き値は §9.2 を参照。`--shadow-sm` のダーク値も §9.2 に定義する。

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
| `.sidebar.is-collapsed` | サイドバー折りたたみ状態（`width: var(--sidebar-collapsed-w)`、トランジション付き） |
| `.main` | メインコンテンツエリア（`flex: 1; overflow-y: auto`） |

追加トークン:

| トークン名 | 値 | 説明 |
|-----------|-----|------|
| `--sidebar-w` | `260px` | サイドバー展開幅 |
| `--sidebar-collapsed-w` | `56px` | サイドバー折りたたみ幅（アイコンのみ表示） |

折りたたみ動作:
- `.sidebar.is-collapsed` の幅変化に `transition: width var(--transition-base)` を適用する。
- 折りたたみ状態では `.sidebar` 内のテキストラベルを `opacity: 0; overflow: hidden` で非表示にする。
- 展開 / 折りたたみは JavaScript で `.is-collapsed` クラスを付与 / 除去することで制御する。

## 6.6 レスポンシブ対応

Adlaire Group プロジェクト共通のブレークポイントを以下の 3 段階で定義する。

| ブレークポイント名 | 値 | 対象デバイス |
|:----------------:|-----|------------|
| `sm`（モバイル） | `max-width: 767px` | スマートフォン |
| `md`（タブレット） | `768px〜1023px` | タブレット・小型デスクトップ |
| `lg`（デスクトップ） | `min-width: 1024px` | 標準デスクトップ |
| `xl`（ワイド） | `min-width: 1440px` | 大型・ワイドディスプレイ |

**sm（モバイル）時の変化（フレームワークが自動適用）:**
- `.layout`: `flex-direction: column`、サイドバーを水平配置に変更
- `.grid-cols-card`: `minmax(140px, 1fr)` に縮小
- `.container`、`.container-lg`: 水平パディングを `--space-4` に縮小
- `.sidebar`: 固定幅を解除し横スクロールナビに変更

**xl（ワイド）時の変化:**
- `.container` の最大幅は `1200px` のまま変更しない（`container-lg` は `1440px`）。
- `.grid-cols-auto`・`.grid-cols-card` は自動的に列数が増加する（`auto-fill` のため追加 CSS 不要）。

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

### 7.5.1 テキスト系入力要素

対象: `input[type="text"]`, `input[type="email"]`, `input[type="password"]`, `input[type="number"]`, `input[type="search"]`, `textarea`, `select`

- ボーダー: `1px solid var(--color-border)`
- 角丸: `--radius-base`
- フォーカス時: `outline: 2px solid var(--color-primary)`、`outline-offset: 1px`
- エラー状態: `.is-error` クラス付与 → ボーダー色 `--color-danger-border`、`outline: 2px solid var(--color-danger-text)` 時
- 補助テキスト: `.form-hint`（`--color-text-muted`、`--font-size-sm`）
- エラーメッセージ: `.form-error`（`--color-danger-text`、`--font-size-sm`）
- ラベル: `.form-label`（`--font-weight-medium`）
- グループ: `.form-group`（ラベル + 入力 + ヒントのラッパー）

### 7.5.2 Checkbox / Radio

対象: `input[type="checkbox"]`、`input[type="radio"]`

- `appearance: none` でネイティブスタイルをリセットし、カスタム描画する。
- サイズ: `16px × 16px`、ボーダー `1px solid var(--color-border-strong)`、角丸 checkbox → `--radius-sm`、radio → `--radius-full`
- チェック済み時: `background-color: var(--color-primary)`、`border-color: var(--color-primary)`
- チェックマーク: `::before` 擬似要素または `background-image`（SVG data URI）で描画
- フォーカス時: `outline: 2px solid var(--color-primary)`、`outline-offset: 2px`
- 無効時: `opacity: 0.5; cursor: not-allowed`
- ラベルと横並び配置用ラッパー: `.form-check`（`display: flex; align-items: center; gap: var(--space-2)`）

### 7.5.3 File Input

対象: `input[type="file"]`

- ネイティブの file ボタン部分（`::file-selector-button`）を `.btn.btn-secondary` 相当のスタイルで統一する。
- 本体テキスト部: `--font-size-sm`、`--color-text-muted`
- ドラッグアンドドロップ対応エリア: `.form-dropzone`
  - 点線ボーダー（`border: 2px dashed var(--color-border-strong)`）
  - ホバー / ドラッグオーバー時: `border-color: var(--color-primary)`、`background-color: var(--color-primary-light)`
  - 中央揃えの説明テキストと `.btn.btn-outline` を内包する

### 7.5.4 Range Input

対象: `input[type="range"]`

- トラック（`::webkit-slider-runnable-track` 等）: `height: 4px`、`background: var(--color-border)`、`border-radius: var(--radius-full)`
- サム（`::webkit-slider-thumb` 等）: `appearance: none`、`width: 16px`、`height: 16px`、`border-radius: var(--radius-full)`、`background: var(--color-primary)`
- フォーカス時: サムに `box-shadow: 0 0 0 3px var(--color-primary-light)` を付与

### 7.5.5 Color Input

対象: `input[type="color"]`

- `width: 32px`、`height: 32px`、`border: 1px solid var(--color-border)`、`border-radius: var(--radius-base)`、`padding: 2px`
- `cursor: pointer`

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

## 7.13 Tooltip（`src/components/tooltip.css`）

純粋 CSS で実装する。`[data-tooltip]` 属性を持つ要素に `::before`（バブル本体）と `::after`（矢印）擬似要素でツールチップを表示する。

```html
<span data-tooltip="説明文">ホバーしてください</span>
<span data-tooltip="説明文" data-tooltip-pos="bottom">下方向</span>
```

| 属性 / クラス | 説明 |
|---|---|
| `[data-tooltip]` | ツールチップ対象要素。属性値がツールチップ内容 |
| `[data-tooltip-pos="top"]` | 上表示（デフォルト） |
| `[data-tooltip-pos="bottom"]` | 下表示 |
| `[data-tooltip-pos="left"]` | 左表示 |
| `[data-tooltip-pos="right"]` | 右表示 |

仕様:
- `position: relative` を対象要素に付与する。
- `::before`: ツールチップ本体。背景 `--color-bg-dark`、テキスト `--color-text-inverse`、`--font-size-xs`、`--radius-sm`、パディング `var(--space-1) var(--space-2)`、`white-space: nowrap`
- `::after`: 三角矢印（`border` テクニック）
- 表示: `:hover` / `:focus-visible` 時に `opacity: 1`、`visibility: visible`。デフォルト `opacity: 0`、`visibility: hidden`、`transition: opacity var(--transition-fast)`
- `z-index: 9000`

---

## 7.14 Pagination（`src/components/pagination.css`）

コンテンツ一覧・ジョブ一覧のページネーション表示。

```html
<nav class="pagination" aria-label="ページネーション">
  <a class="pagination-prev" aria-label="前のページ">‹</a>
  <a class="pagination-item">1</a>
  <a class="pagination-item is-active" aria-current="page">2</a>
  <a class="pagination-item">3</a>
  <span class="pagination-ellipsis">…</span>
  <a class="pagination-item">10</a>
  <a class="pagination-next" aria-label="次のページ">›</a>
</nav>
```

| クラス | 説明 |
|--------|------|
| `.pagination` | ページネーション全体（`display: flex; align-items: center; gap: var(--space-1)`） |
| `.pagination-item` | ページ番号ボタン（`min-width: 32px`、正方形） |
| `.pagination-item.is-active` | 現在ページ（`background: var(--color-primary)`、`color: var(--color-text-inverse)`） |
| `.pagination-item:hover` | ホバー（`background: var(--color-bg-muted)`） |
| `.pagination-prev` / `.pagination-next` | 前後ナビボタン |
| `.pagination-ellipsis` | 省略記号（`…`、クリック不可） |

- 無効化（前ページがない等）: `[disabled]` または `.is-disabled` → `opacity: 0.4; pointer-events: none`

---

## 7.15 Progress Bar（`src/components/progress.css`）

デプロイ進捗・ビルド進行状況の表示。

```html
<!-- 確定プログレス -->
<div class="progress">
  <div class="progress-bar" style="width: 60%"></div>
</div>

<!-- 不確定プログレス -->
<div class="progress progress-indeterminate">
  <div class="progress-bar"></div>
</div>

<!-- カラーバリアント -->
<div class="progress progress-success">
  <div class="progress-bar" style="width: 100%"></div>
</div>
```

| クラス | 説明 |
|--------|------|
| `.progress` | プログレスバー外枠（`height: 8px`、`background: var(--color-border)`、`--radius-full`） |
| `.progress-bar` | 進捗バー本体（`background: var(--color-primary)`、高さ継承、`--radius-full`、`transition: width var(--transition-slow)`） |
| `.progress-indeterminate .progress-bar` | 左右スライドアニメーション（`@keyframes progress-slide`） |
| `.progress-sm` | 高さ 4px（細いバー） |
| `.progress-lg` | 高さ 12px（太いバー） |
| `.progress-success` | 成功色（`--color-success-text` 背景） |
| `.progress-warning` | 警告色（`--color-warning-text` 背景） |
| `.progress-danger` | 危険色（`--color-danger-text` 背景） |

---

## 7.16 Tabs（`src/components/tabs.css`）

コンテンツエリアの切り替えタブ。

```html
<div class="tabs">
  <button class="tab-item is-active" aria-selected="true">概要</button>
  <button class="tab-item">ログ</button>
  <button class="tab-item" disabled>設定</button>
</div>
<div class="tab-panel">（タブに対応するコンテンツ）</div>
```

| クラス | 説明 |
|--------|------|
| `.tabs` | タブリスト全体（`display: flex`、下ボーダーライン） |
| `.tab-item` | タブボタン（パディング `var(--space-2) var(--space-4)`、`--font-size-sm`、`--font-weight-medium`、背景なし） |
| `.tab-item.is-active` | アクティブタブ（下ボーダー `2px solid var(--color-primary)`、`color: var(--color-primary)`） |
| `.tab-item:hover` | ホバー（`color: var(--color-text)`、`background: var(--color-bg-muted)`） |
| `.tab-item:disabled` | 無効（`opacity: 0.4; cursor: not-allowed`） |
| `.tab-panel` | タブに対応するコンテンツエリア（`padding-top: var(--space-4)`） |

---

## 7.17 Skeleton（`src/components/skeleton.css`）

データ読み込み中のプレースホルダー UI（シマーアニメーション）。

```html
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-text skeleton-w-3-4"></div>
<div class="skeleton skeleton-avatar"></div>
<div class="skeleton skeleton-card"></div>
```

| クラス | 説明 |
|--------|------|
| `.skeleton` | スケルトン基底（`background: linear-gradient(90deg, var(--color-border) 25%, var(--color-bg-muted) 50%, var(--color-border) 75%)`、`background-size: 200% 100%`、`animation: skeleton-shimmer 1.5s infinite`） |
| `.skeleton-text` | テキスト行（`height: 16px`、`--radius-sm`） |
| `.skeleton-w-3-4` | 幅 75%（短いテキスト行用） |
| `.skeleton-w-1-2` | 幅 50% |
| `.skeleton-avatar` | アバター（`width: 32px; height: 32px`、`--radius-full`） |
| `.skeleton-card` | カード（`height: 120px`、`--radius-lg`） |
| `@keyframes skeleton-shimmer` | 左から右へのシマーアニメーション |

---

## 7.18 Toggle / Switch（`src/components/toggle.css`）

フォームの on/off スイッチ。`<input type="checkbox">` を内包するカスタム Toggle。

```html
<label class="toggle">
  <input type="checkbox" class="toggle-input">
  <span class="toggle-track">
    <span class="toggle-thumb"></span>
  </span>
  <span class="toggle-label">ダークモード</span>
</label>
```

| クラス | 説明 |
|--------|------|
| `.toggle` | ラッパー（`display: inline-flex; align-items: center; gap: var(--space-2); cursor: pointer`） |
| `.toggle-input` | `<input type="checkbox">`（`.sr-only` で視覚的非表示） |
| `.toggle-track` | トラック（`width: 40px; height: 22px`、`--radius-full`、オフ時 `background: var(--color-border-strong)`） |
| `.toggle-thumb` | サム（`width: 16px; height: 16px`、`--radius-full`、`background: white`、`transition: transform var(--transition-fast)`） |
| `.toggle-input:checked + .toggle-track` | オン時: トラック `background: var(--color-primary)` |
| `.toggle-input:checked + .toggle-track .toggle-thumb` | オン時: サムが右へ移動（`transform: translateX(18px)`） |
| `.toggle-input:disabled + .toggle-track` | 無効時: `opacity: 0.5; cursor: not-allowed` |
| `.toggle-label` | トグルラベルテキスト（`--font-size-sm`） |

---

## 7.19 Stepper（`src/components/stepper.css`）

デプロイフロー等の多段階進捗表示。

```html
<ol class="stepper">
  <li class="step is-done">ビルド</li>
  <li class="step is-done">テスト</li>
  <li class="step is-active">デプロイ</li>
  <li class="step">完了</li>
</ol>
```

| クラス | 説明 |
|--------|------|
| `.stepper` | ステッパー全体（`display: flex; align-items: center`、`list-style: none`） |
| `.step` | 各ステップ（`display: flex; flex-direction: column; align-items: center`、番号円 + ラベルテキスト） |
| `.step::before` | ステップ番号円（`width: 28px; height: 28px`、`--radius-full`、`--color-border-strong` 背景） |
| `.step.is-done::before` | 完了: `background: var(--color-primary)`、チェックマーク（SVG data URI） |
| `.step.is-active::before` | アクティブ: `background: var(--color-primary)`、数字表示、アウトラインリング |
| ステップ間の線 | `.step:not(:last-child)::after`（`flex: 1; height: 2px; background: var(--color-border)`） |
| `.step.is-done + .step::after`（親側から制御） | 完了ステップ後の線 `background: var(--color-primary)` |

---

## 7.20 Accordion / Collapse（`src/components/accordion.css`）

HTML ネイティブ `<details>` / `<summary>` を使用した純粋 CSS アコーディオン。JavaScript 不要。

```html
<details class="accordion">
  <summary class="accordion-title">セクションタイトル</summary>
  <div class="accordion-body">内容…</div>
</details>

<!-- グループ化 -->
<div class="accordion-group">
  <details class="accordion">…</details>
  <details class="accordion">…</details>
</div>
```

| クラス | 説明 |
|--------|------|
| `.accordion` | アコーディオン全体（`background: var(--color-bg-surface)`、`--radius-base`、ボーダー） |
| `.accordion-title` | サマリー（`display: flex; justify-content: space-between; align-items: center`、`--font-weight-medium`、`cursor: pointer`） |
| `.accordion-title::marker` | `display: none`（ネイティブマーカー非表示） |
| `.accordion-title::after` | 展開アイコン（`▶`、`transition: transform var(--transition-base)`） |
| `details[open] .accordion-title::after` | `transform: rotate(90deg)` |
| `.accordion-body` | コンテンツ部分（`padding: var(--space-3) var(--space-4) var(--space-4)`） |
| `.accordion-group` | 複数アコーディオンのグループ（ボーダーを外枠のみに統一） |

---

## 7.21 Toast / Notification（`src/components/toast.css`）

画面端に表示する一時通知。CSS アニメーションで入退場を制御。

```html
<div class="toast toast-success is-visible">
  <span class="toast-message">保存しました</span>
  <button class="toast-close" aria-label="閉じる">×</button>
</div>
```

| クラス | 説明 |
|--------|------|
| `.toast` | トースト本体（`position: fixed`、デフォルト右下 `bottom: var(--space-6); right: var(--space-6)`、`z-index: 9500`、`--shadow-lg`、`--radius-base`、`min-width: 240px`） |
| `.toast.is-visible` | 表示状態（`opacity: 1`、`transform: translateY(0)`） |
| デフォルト | `opacity: 0`、`transform: translateY(var(--space-4))`、`transition: opacity var(--transition-base), transform var(--transition-base)` |
| `.toast-success` | 成功（`background: var(--color-success-bg)`、`color: var(--color-success-text)`、`border-left: 4px solid var(--color-success-text)`） |
| `.toast-warning` | 警告（warning 系） |
| `.toast-danger` | 危険（danger 系） |
| `.toast-info` | 情報（info 系） |
| `.toast-message` | メッセージテキスト（`flex: 1`、`--font-size-sm`） |
| `.toast-close` | 閉じるボタン（`background: none`、`border: none`、`cursor: pointer`、`opacity: 0.6`） |

---

## 7.22 Stat Card / Metric（`src/components/stat-card.css`）

ダッシュボードの KPI 数値表示カード。

```html
<div class="stat-card">
  <div class="stat-label">総プロジェクト数</div>
  <div class="stat-value">42</div>
  <div class="stat-trend stat-trend-up">+3 今月</div>
</div>
```

| クラス | 説明 |
|--------|------|
| `.stat-card` | カード全体（`.card` を継承、`padding: var(--space-4) var(--space-5)`） |
| `.stat-label` | ラベル（`--font-size-sm`、`--color-text-muted`、`--font-weight-medium`） |
| `.stat-value` | 数値（`--font-size-3xl`、`--font-weight-bold`、`--color-text`、`line-height: --line-height-tight`） |
| `.stat-trend` | トレンドテキスト（`--font-size-sm`、`margin-top: var(--space-1)`） |
| `.stat-trend-up` | 上昇（`color: var(--color-success-text)`） |
| `.stat-trend-down` | 下降（`color: var(--color-danger-text)`） |
| `.stat-trend-flat` | 横ばい（`color: var(--color-text-muted)`） |

---

## 7.23 Timeline（`src/components/timeline.css`）

デプロイ履歴・変更ログ・監査ログの時系列表示。

```html
<ol class="timeline">
  <li class="timeline-item">
    <div class="timeline-dot timeline-dot-success"></div>
    <div class="timeline-content">
      <div class="timeline-time">14:32</div>
      <div class="timeline-title">デプロイ完了</div>
      <div class="timeline-desc">Ver.3.0-47 が正常にデプロイされました</div>
    </div>
  </li>
</ol>
```

| クラス | 説明 |
|--------|------|
| `.timeline` | タイムライン全体（`list-style: none`、`position: relative`） |
| `.timeline-item` | 1 イベント（`display: flex; gap: var(--space-3)`、`position: relative`） |
| `.timeline-dot` | イベントドット（`width: 10px; height: 10px`、`--radius-full`、`flex-shrink: 0`、`margin-top: 5px`） |
| `.timeline-dot-success` | `background: var(--color-success-text)` |
| `.timeline-dot-warning` | `background: var(--color-warning-text)` |
| `.timeline-dot-danger` | `background: var(--color-danger-text)` |
| `.timeline-dot-neutral` | `background: var(--color-neutral-text)` |
| 縦ライン | `.timeline-item:not(:last-child)::before`（`position: absolute`、左端 4px、上から下へ `2px solid var(--color-border)`） |
| `.timeline-content` | イベント内容（`flex: 1`、`padding-bottom: var(--space-4)`） |
| `.timeline-time` | 日時（`--font-size-xs`、`--color-text-muted`） |
| `.timeline-title` | イベント名（`--font-weight-medium`） |
| `.timeline-desc` | 詳細説明（`--font-size-sm`、`--color-text-sub`） |

---

## 7.24 Status Indicator（`src/components/status-indicator.css`）

状態を示す小さな色付きドット。サーバー死活監視・プロセス状態・ユーザーオンライン状態等で使用。

```html
<span class="status-dot status-dot-success"></span><!-- 緑 -->
<span class="status-dot status-dot-danger"></span> <!-- 赤 -->
<span class="status-dot status-dot-neutral"></span><!-- グレー -->
<span class="status-dot status-dot-pulse"></span>  <!-- 点滅（起動中） -->
```

| クラス | 説明 |
|--------|------|
| `.status-dot` | ドット基底（`display: inline-block; width: 8px; height: 8px`、`--radius-full`、`flex-shrink: 0`） |
| `.status-dot-success` | `background: var(--color-success-text)` |
| `.status-dot-warning` | `background: var(--color-warning-text)` |
| `.status-dot-danger` | `background: var(--color-danger-text)` |
| `.status-dot-info` | `background: var(--color-info-text)` |
| `.status-dot-neutral` | `background: var(--color-neutral-text)` |
| `.status-dot-pulse` | `background: var(--color-primary)`、`animation: status-pulse 1.5s ease-in-out infinite`（スケールと透明度のパルス） |

---

## 7.25 Empty State（`src/components/empty-state.css`）

コンテンツが存在しない状態の中央表示。

```html
<div class="empty-state">
  <div class="empty-state-icon"><!-- SVGや絵文字など --></div>
  <p class="empty-state-title">まだプロジェクトがありません</p>
  <p class="empty-state-desc">新しいプロジェクトを作成してください。</p>
  <button class="btn btn-primary">作成する</button>
</div>
```

| クラス | 説明 |
|--------|------|
| `.empty-state` | コンテナ（`display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3)`、`padding: var(--space-12) var(--space-8)`、`text-align: center`） |
| `.empty-state-icon` | アイコンエリア（`font-size: 48px`、`color: var(--color-text-muted)`、`opacity: 0.6`） |
| `.empty-state-title` | タイトル（`--font-size-lg`、`--font-weight-semibold`、`--color-text`） |
| `.empty-state-desc` | 説明文（`--font-size-sm`、`--color-text-muted`、`max-width: 320px`） |

---

## 7.26 Avatar（`src/components/avatar.css`）

ユーザーアイコン・イニシャル表示。

```html
<span class="avatar">K</span>
<img class="avatar" src="user.jpg" alt="ユーザー名">
<span class="avatar avatar-sm">A</span>
<span class="avatar avatar-lg">管</span>
```

| クラス | 説明 |
|--------|------|
| `.avatar` | 基底（`display: inline-flex; align-items: center; justify-content: center`、`width: 32px; height: 32px`、`--radius-full`、`background: var(--color-primary-light)`、`color: var(--color-primary)`、`--font-weight-semibold`、`--font-size-sm`、`overflow: hidden; object-fit: cover`） |
| `.avatar-sm` | 24px |
| `.avatar-lg` | 48px、`--font-size-lg` |
| `img.avatar` | 画像アバター（`object-fit: cover` を適用） |

---

## 7.27 Divider（`src/components/divider.css`）

水平・垂直区切り線。テキストラベル付きもサポート。

```html
<hr class="divider">
<div class="divider divider-label">または</div>
<div class="divider divider-vertical"></div>
```

| クラス | 説明 |
|--------|------|
| `.divider`（`<hr>`） | 水平区切り（`border: none; border-top: 1px solid var(--color-border); margin: var(--space-4) 0`） |
| `.divider.divider-label` | テキスト付き区切り（左右に線、中央にテキスト。`display: flex; align-items: center; gap: var(--space-3); color: var(--color-text-muted); --font-size-sm`。`::before`・`::after` で `flex: 1; border-top: 1px solid var(--color-border)` を描画） |
| `.divider-vertical` | 垂直区切り（`display: inline-block; width: 1px; height: 1em; background: var(--color-border); margin: 0 var(--space-2); vertical-align: middle`） |

---

## 7.28 Keyboard Shortcut（`src/components/kbd.css`）

キーボードショートカット・キーバインドの表示。

```html
<kbd class="key">Ctrl</kbd> + <kbd class="key">S</kbd>
<span class="key-combo"><kbd class="key">Shift</kbd><kbd class="key">?</kbd></span>
```

| クラス | 説明 |
|--------|------|
| `.key` | キーキャップ（`display: inline-flex; align-items: center; justify-content: center`、`padding: 1px var(--space-2)`、`--font-family-mono`、`--font-size-xs`、`background: var(--color-bg-surface)`、`border: 1px solid var(--color-border-strong)`、`border-bottom-width: 2px`（立体感）、`--radius-sm`、`box-shadow: 0 1px 0 var(--color-border-strong)`） |
| `.key-combo` | 複数キーのグループ（`display: inline-flex; align-items: center; gap: var(--space-1)`） |

---

## 7.29 File Tree（`src/components/file-tree.css`）

静的 CMS のファイル一覧・ディレクトリ構造表示。

```html
<ul class="file-tree">
  <li class="file-tree-dir">
    <span class="file-tree-name">content/</span>
    <ul>
      <li class="file-tree-file is-active">
        <span class="file-tree-name">index.md</span>
      </li>
      <li class="file-tree-file">
        <span class="file-tree-name">about.md</span>
      </li>
    </ul>
  </li>
</ul>
```

| クラス | 説明 |
|--------|------|
| `.file-tree` | ツリー全体（`list-style: none`、`--font-size-sm`、`--font-family-mono`） |
| `.file-tree-dir` | ディレクトリ行（`padding: var(--space-1) var(--space-2)`、`--color-text-sub`） |
| `.file-tree-dir::before` | フォルダアイコン（`▶` または `▼`、展開状態で切り替え） |
| `.file-tree-file` | ファイル行（`padding: var(--space-1) var(--space-2) var(--space-1) var(--space-6)`、`cursor: pointer`） |
| `.file-tree-file::before` | ファイルアイコン（`-` または `·`） |
| `.file-tree-file.is-active` | アクティブファイル（`background: var(--color-primary-light)`、`color: var(--color-primary)`、`--font-weight-medium`） |
| `.file-tree-file:hover` | `background: var(--color-bg-muted)` |
| `.file-tree-name` | ファイル / フォルダ名テキスト |

---

## 7.30 Split Pane / Editor Layout（`src/components/split-pane.css`）

2 分割レイアウト。CMS の記事編集画面（左: エディタ / 右: プレビュー）等に使用。

```html
<div class="split-pane">
  <div class="split-pane-left">エディタ</div>
  <div class="split-pane-divider"></div>
  <div class="split-pane-right">プレビュー</div>
</div>
```

| クラス | 説明 |
|--------|------|
| `.split-pane` | 2 分割コンテナ（`display: grid; grid-template-columns: 1fr 4px 1fr; height: 100%`） |
| `.split-pane-left` | 左ペイン（`overflow-y: auto`） |
| `.split-pane-divider` | 中央仕切り（`width: 4px; background: var(--color-border); cursor: col-resize`） |
| `.split-pane-right` | 右ペイン（`overflow-y: auto`） |

モバイル時（`sm` ブレークポイント）:
- `grid-template-columns: 1fr` → 縦積みに変更
- `.split-pane-divider` は `display: none`

---

# 8. ユーティリティクラス（`src/utilities.css`）

## 8.1 テキスト

| クラス | 説明 |
|--------|------|
| `.text-xs`〜`.text-4xl` | フォントサイズトークン適用 |
| `.text-muted` | `color: var(--color-text-muted)` |
| `.text-sub` | `color: var(--color-text-sub)` |
| `.text-primary` | `color: var(--color-primary)` |
| `.text-success` | `color: var(--color-success-text)` |
| `.text-warning` | `color: var(--color-warning-text)` |
| `.text-danger` | `color: var(--color-danger-text)` |
| `.text-info` | `color: var(--color-info-text)` |
| `.text-center` / `.text-left` / `.text-right` | テキスト整列 |
| `.font-normal` / `.font-medium` / `.font-semibold` / `.font-bold` | フォントウェイト |
| `.truncate` | テキストの省略（`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`） |

## 8.2 表示・可視性

| クラス | 説明 |
|--------|------|
| `.hidden` | `display: none` |
| `.sr-only` | スクリーンリーダー専用（視覚的非表示） |
| `.block` | `display: block` |
| `.inline` | `display: inline` |
| `.inline-block` | `display: inline-block` |
| `.flex` | `display: flex`（`layout.css` で定義。`utilities.css` では重複定義しない） |

## 8.3 Flexbox 補完

`layout.css` の Flexbox ユーティリティ（§6.2）に加え、以下を `utilities.css` に定義する。

| クラス | 説明 |
|--------|------|
| `.flex-none` | `flex: none` |
| `.flex-row` | `flex-direction: row` |
| `.justify-start` | `justify-content: flex-start` |
| `.items-baseline` | `align-items: baseline` |
| `.self-start` | `align-self: flex-start` |
| `.self-end` | `align-self: flex-end` |
| `.self-center` | `align-self: center` |

## 8.4 Overflow

| クラス | 説明 |
|--------|------|
| `.overflow-hidden` | `overflow: hidden` |
| `.overflow-auto` | `overflow: auto` |
| `.overflow-x-auto` | `overflow-x: auto; overflow-y: hidden` |
| `.overflow-y-auto` | `overflow-y: auto; overflow-x: hidden` |
| `.overflow-x-hidden` | `overflow-x: hidden` |
| `.overflow-y-hidden` | `overflow-y: hidden` |

## 8.5 Position / Z-index

| クラス | 説明 |
|--------|------|
| `.relative` | `position: relative` |
| `.absolute` | `position: absolute` |
| `.fixed` | `position: fixed` |
| `.sticky` | `position: sticky` |
| `.z-0` | `z-index: 0` |
| `.z-10` | `z-index: 10` |
| `.z-100` | `z-index: 100` |
| `.z-1000` | `z-index: 1000` |

## 8.6 サイズ

| クラス | 説明 |
|--------|------|
| `.w-full` | `width: 100%` |
| `.h-full` | `height: 100%` |
| `.min-w-0` | `min-width: 0`（flex item のテキスト省略対応） |

## 8.7 ボーダー・シャドウ・角丸

| クラス | 説明 |
|--------|------|
| `.rounded-sm` | `border-radius: var(--radius-sm)` |
| `.rounded` | `border-radius: var(--radius-base)` |
| `.rounded-lg` | `border-radius: var(--radius-lg)` |
| `.rounded-xl` | `border-radius: var(--radius-xl)` |
| `.rounded-full` | `border-radius: var(--radius-full)` |
| `.border` | `border: 1px solid var(--color-border)` |
| `.border-strong` | `border: 1px solid var(--color-border-strong)` |
| `.shadow-sm` | `box-shadow: var(--shadow-sm)` |
| `.shadow` | `box-shadow: var(--shadow-base)` |
| `.shadow-lg` | `box-shadow: var(--shadow-lg)` |

## 8.8 その他

| クラス | 説明 |
|--------|------|
| `.cursor-pointer` | `cursor: pointer` |
| `.cursor-not-allowed` | `cursor: not-allowed` |
| `.select-none` | `user-select: none` |
| `.pointer-events-none` | `pointer-events: none` |

## 8.9 アスペクト比（`src/utilities.css`）

画像・動画埋め込みのアスペクト比固定。

| クラス | 説明 |
|--------|------|
| `.aspect-video` | `aspect-ratio: 16 / 9` |
| `.aspect-square` | `aspect-ratio: 1 / 1` |
| `.aspect-4-3` | `aspect-ratio: 4 / 3` |

## 8.10 行クランプ（`src/utilities.css`）

複数行テキストの省略表示。

| クラス | 説明 |
|--------|------|
| `.line-clamp-1` | 1行で省略（`overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1`） |
| `.line-clamp-2` | 2行で省略 |
| `.line-clamp-3` | 3行で省略 |
| `.line-clamp-4` | 4行で省略 |

---

# 9. ダークモード（`src/tokens.css` 内）

## 9.1 切り替え方式

以下の 2 つの方式を両方サポートする。

1. **OS 設定連動**: `@media (prefers-color-scheme: dark)` 内でトークンを上書き
2. **手動切り替え**: `<html class="dark">` または `<body class="dark">` にクラスを付与することで強制適用

## 9.2 ダークモードで上書きするトークン

現行プロジェクト（Static CMS・Portal System・Admin）のダークモード色を統一して定義する。

### ニュートラルカラー（既存）

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

### セマンティックカラー（ダーク値新規追加）

| トークン名 | ダーク値 |
|-----------|---------|
| `--color-success-bg` | `#052e16` |
| `--color-success-text` | `#86efac` |
| `--color-success-border` | `#166534` |
| `--color-warning-bg` | `#451a03` |
| `--color-warning-text` | `#fde68a` |
| `--color-warning-border` | `#92400e` |
| `--color-danger-bg` | `#450a0a` |
| `--color-danger-text` | `#fca5a5` |
| `--color-danger-border` | `#991b1b` |
| `--color-info-bg` | `#0c1a4e` |
| `--color-info-text` | `#93c5fd` |
| `--color-info-border` | `#1e40af` |
| `--color-neutral-bg` | `#1f2937` |
| `--color-neutral-text` | `#9ca3af` |
| `--color-neutral-border` | `#374151` |

### シャドウ（ダーク値補完）

| トークン名 | ダーク値 |
|-----------|---------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.2)` |
| `--shadow-base` | `0 4px 6px rgba(0,0,0,0.3)`（既存） |
| `--shadow-lg` | `0 20px 50px rgba(0,0,0,0.5)`（既存） |

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
- `src/` 配下の CSS ファイルを結合順序に従って 1 ファイルに結合する。
- minify は **コメント除去 + 連続空白・改行の圧縮** をビルドスクリプト内で実装する（外部ライブラリ不使用）。
- `npm:` プレフィックスの使用を**禁止**する（共通規約）。

結合順序（全ファイル）:

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
17. `components/tooltip.css`
18. `components/pagination.css`
19. `components/progress.css`
20. `components/tabs.css`
21. `components/skeleton.css`
22. `components/toggle.css`
23. `components/stepper.css`
24. `components/accordion.css`
25. `components/toast.css`
26. `components/stat-card.css`
27. `components/timeline.css`
28. `components/status-indicator.css`
29. `components/empty-state.css`
30. `components/avatar.css`
31. `components/divider.css`
32. `components/kbd.css`
33. `components/file-tree.css`
34. `components/split-pane.css`
35. `utilities.css`
36. `print.css`

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

| Phase | 内容 | 状態 |
|:-----:|------|:----:|
| 0 | **ルールブック策定**（本文書） | 完了 |
| 1 | **デザイントークン + リセット + タイポグラフィ** — 基盤レイヤー実装 | 完了 |
| 2 | **レイアウトユーティリティ + 基本コンポーネント**（Button / Form / Card） | 完了 |
| 3 | **追加コンポーネント**（Badge / Table / Alert / Modal / Log Box / Info Row） | 完了 |
| 4 | **ユーティリティクラス** — テキスト・表示・その他 | 完了 |
| 5 | **ダークモード** — OS 連動 + 手動クラス切り替え | 完了 |
| 6 | **ビルドスクリプト（`build.ts`）** + `dist/` 生成 + `Distribution/` 配布 | 完了 |
| 7 | **機能改良**（A-1〜A-5）— ダークモードセマンティック補完・ブレークポイント拡充・フォーム拡充・ユーティリティ拡充・Shadow 補完 | 計画 |
| 8 | **新規コンポーネント第1弾**（B-1〜B-7）— Tooltip / Pagination / Progress / Tabs / Skeleton / Toggle / Stepper | 計画 |
| 9 | **新規コンポーネント第2弾**（C-1〜C-11）— Accordion / Toast / Stat Card / Timeline / Status Indicator / Empty State / Avatar / Divider / Kbd / File Tree / Split Pane | 計画 |
| 10 | **Sidebar Collapsed 状態** + **Print スタイル** + **Aspect Ratio / Line Clamp ユーティリティ** | 計画 |
| 11 | **ビルドスクリプト更新** — 新規ファイルの結合順追加・`dist/` 再生成 | 計画 |

---

# 12. 最終規則

## 12.1 上位規範性

本 RULEBOOK は、Adlaire Style のフレームワーク設計に関する上位規範文書である。

## 12.2 優先適用

フレームワーク設計に関して個別提案と本 RULEBOOK が衝突する場合、本 RULEBOOK を優先しなければならない。

## 12.3 改訂条件

本 RULEBOOK を改訂する場合は、デザイントークン互換性・既存プロジェクトへの影響・ビルド出力の変化を明示しなければならない。

---

# 14. 印刷スタイル（`src/print.css`）

`@media print` による印刷最適化スタイル。Portal System の帳票出力・CMS のコンテンツ印刷等に対応。

## 14.1 基本方針

- 印刷時に不要な UI（サイドバー・ナビゲーション・ヘッダーボタン・モーダル・トースト）を非表示にする。
- ページ背景色・カード影を除去し、印刷用紙に最適化する。
- リンクの URL を本文末尾に付記する（`a[href]::after`）。
- フォント・カラーをシステムデフォルトに寄せる。

## 14.2 非表示対象

`@media print` 内で `display: none !important` を適用する要素:

- `.sidebar` — サイドバー
- `.header-nav`、`.header-actions` — ヘッダーナビ・アクション
- `.btn` — ボタン全般（印刷ビュー不要）
- `.modal-backdrop`、`.modal` — モーダル
- `.toast` — トースト通知
- `.pagination` — ページネーション
- `.breadcrumb` — パンくずリスト

## 14.3 印刷最適化

| 対象 | 処理 |
|------|------|
| `body` | `background: white; color: #000` |
| `.card` | `box-shadow: none; border: 1px solid #ccc` |
| `a[href]::after` | `content: " (" attr(href) ")"` を付記（ただし `.btn`・内部リンクは除外） |
| `pre`、`.log-box` | `white-space: pre-wrap; overflow: visible` |
| `.page-break-before` | `page-break-before: always`（印刷改ページ制御用ユーティリティクラス） |
| `.page-break-avoid` | `page-break-inside: avoid` |

---

# 13. 関連文書

| 文書 | 内容 |
|------|------|
| `REVISION_HISTORY.md` | 本プロジェクトの改訂履歴 |
| `CLAUDE.md`（統合ルート） | 共通開発規約 |
| `rulebookdocs/RELEASE_PLAN_RULEBOOK.md`（統合ルート） | リリース計画 |
