# Adlaire Portal System RULEBOOK

- 文書名: Adlaire Portal System RULEBOOK
- 文書バージョン: Ver.1.0
- 作成日: 2026-04-06
- 対象製品: Adlaire Portal System
- 文書種別: ポータルシステムの技術規範文書
- 文書目的: システムの仕様・アーキテクチャ・実装規則を定義する

---

## 1. 基本宣言

### 1.1 位置づけ

本 RULEBOOK は、Adlaire Portal System の技術規範文書である。
Adlaire Portal System は、サーバー不要で動作する軽量な社内ポータルシステムである。
HTML5 + JavaScript（バニラ）のみで構築されており、ブラウザだけで完結する。

### 1.2 ルールブック規律の全面適用

- **Adlaire のルールブック規律を全面的に適用する。**
- RULEBOOK に記載のない機能を実装してはならない。
- 新機能・変更は、まず RULEBOOK に仕様を策定・記載してから実装に着手すること。

### 1.3 基本方針

- **サーバーレス**: ブラウザのみで動作する。サーバー側処理は一切持たない。
- **セルフコンテインド**: 外部ライブラリ・CDN に依存しない。
- **軽量**: HTML + JavaScript のみで実装する。

---

## 2. システム構成

### 2.1 ファイル構成

```
Adlaire Portal System/
├── portal.html    # メイン表示画面
├── edit.html      # 設定エディタ
├── data.js        # 設定データ（静的・デフォルト値）
├── CLAUDE.md      # 開発規約
├── README.md      # プロジェクト説明
├── rulebookdocs/
│   ├── PORTAL_SYSTEM_RULEBOOK.md  # 本ファイル
│   └── REVISION_HISTORY.md        # 改訂履歴
└── docs/
    └── CHANGES.md  # 変更履歴
```

### 2.2 技術スタック

| 項目 | 採用 |
|---|---|
| 言語 | HTML5 + JavaScript（バニラ、ES2020+） |
| スタイル | CSS3（インライン、外部ファイルなし） |
| データストア | LocalStorage（優先）+ `data.js`（デフォルト） |
| 外部依存 | **なし**（完全セルフコンテインド） |
| サーバー | **不要**（file:// 直接起動またはローカルサーバー） |

### 2.3 画面構成

| ファイル | 役割 |
|---|---|
| `portal.html` | メイン表示画面。カテゴリ別リンク・ニュース・検索を表示する。 |
| `edit.html` | 設定エディタ。リンク・カテゴリ・テーマの編集とプレビューを提供する。 |
| `data.js` | デフォルト設定データ。`PORTAL_CONFIG` 定数を export する。 |

---

## 3. データ仕様

### 3.1 設定データ構造（PORTAL_CONFIG）

`data.js` に定義する設定データの構造は以下の通りとする。

```javascript
const PORTAL_CONFIG = {
  "title": string,          // ポータルタイトル
  "themeColor": string,     // テーマカラー（16進数カラーコード）
  "news": [
    {
      "date": string,       // 日付（YYYY/MM/DD形式）
      "text": string        // お知らせ内容
    }
  ],
  "categories": [
    {
      "name": string,       // カテゴリ名
      "links": [
        {
          "name": string,   // リンク名
          "url": string,    // URL（http:// または https:// 必須）
          "icon": string    // アイコン（絵文字）
        }
      ]
    }
  ]
};
```

### 3.2 LocalStorage データ

LocalStorage に保存するデータは `PORTAL_CONFIG` と同一構造の JSON 文字列とする。

- キー名: `portalConfig`（実装定義）
- LocalStorage のデータが存在する場合、`data.js` のデフォルト値より優先する。
- LocalStorage のデータが存在しない場合、`data.js` のデフォルト値を使用する。

### 3.3 インポート/エクスポート形式

インポート/エクスポートは JSON 形式とする。構造は `PORTAL_CONFIG` と同一とする。

---

## 4. 機能仕様

### 4.1 portal.html — メイン表示画面

| 機能 | 仕様 |
|---|---|
| リンク表示 | カテゴリ別にリンクをカード形式で表示する |
| ナビゲーション | サイドバーにカテゴリ一覧を表示し、クリックで該当カテゴリにスクロールする |
| ニュース表示 | 最新のお知らせをリスト形式で表示する |
| リアルタイム検索 | 検索ボックスへの入力に応じてリンクをフィルタリングする |
| テーマカラー | `data.js` / LocalStorage の `themeColor` を CSS 変数に適用する |
| ダークモード | `prefers-color-scheme: dark` に応じて自動切り替えする |
| レスポンシブ | PC・スマートフォン両対応（CSS メディアクエリ使用） |
| 日付表示 | 現在日時をサイドバーに表示する |

### 4.2 edit.html — 設定エディタ

| 機能 | 仕様 |
|---|---|
| 分割レイアウト | 左: 編集パネル、右: プレビュー（iframe）の2ペイン構成 |
| リサイザー | パネル境界をドラッグしてパネル幅を調整できる |
| タイトル編集 | ポータルタイトルを入力フィールドで編集する |
| テーマカラー編集 | カラーピッカーでテーマカラーを設定する |
| ニュース編集 | ニュース項目の追加・編集・削除を行う |
| カテゴリ編集 | カテゴリの追加・編集・削除を行う |
| リンク編集 | 各カテゴリ内のリンクの追加・編集・削除を行う |
| アイコン選択 | リンクアイコンを絵文字一覧から選択する |
| LocalStorage 保存 | 「保存」ボタンで LocalStorage に設定を保存する（`portal.html` に即時反映） |
| data.js 出力 | 「data.js形式で保存」ボタンで `data.js` 形式のファイルをダウンロードする |
| エクスポート | 設定を JSON ファイルとしてダウンロードする |
| インポート | JSON ファイルから設定を読み込む |
| デフォルト復元 | LocalStorage をクリアし `data.js` のデフォルト値に戻す |
| プレビュー切替 | PC表示 / モバイル表示のプレビューを切り替える |
| プレビュー更新 | 編集内容を即時プレビューに反映する |

---

## 5. セキュリティ要件

- URL は `http://` または `https://` で始まるもののみ有効とする。`javascript:` / `data:` / `vbscript:` 等は拒否する。
- ユーザー入力の HTML 特殊文字はエスケープして出力する（XSS 対策）。
- LocalStorage に機密情報を保存してはならない。
- 本システムは信頼できるユーザーのみが編集できる環境での使用を前提とする。

---

## 6. 関連文書

| 文書 | 内容 |
|---|---|
| `CLAUDE.md` | 開発規約 |
| `rulebookdocs/REVISION_HISTORY.md` | 改訂履歴 |
| `docs/CHANGES.md` | 変更履歴 |
| `rulebookdocs/RELEASE_PLAN_RULEBOOK.md`（統合リポジトリルート・Part V） | リリース計画 |
