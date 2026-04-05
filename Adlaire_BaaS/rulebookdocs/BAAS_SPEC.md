# Adlaire_BaaS

- 文書名: Adlaire BaaS Specification
- 文書バージョン: Ver.1.0
- 作成日: 2026-04-05
- 対象製品: Adlaire BaaS
- 文書種別: BaaS 基盤仕様書
- 文書目的: Adlaire BaaS の実装準備、CMS-Hub 内部契約、API 基本仕様、イベント契約、認証・会員モデル、監査ログ仕様、開発言語方針を統合定義する

---

## 文書位置づけ

本書は Adlaire_BaaS を基礎資料とし、実装準備、CMS-Hub 内部契約、Adlaire BaaS API 基本仕様、イベント契約、認証・会員モデル、監査ログ仕様、ならびに開発言語方針を統合した **Adlaire_BaaS の最新版仕様書** である。主題は **Adlaire BaaS** であり、[Adlaire Static CMS](https://github.com/fqwink/Adlaire) は前提システムとして必要最小限のみ整理する。Adlaire BaaS は CMS コアを置換するものではなく、会員認証、会員管理、業務データ、ストレージ、イベント、監査、再生成連携、健全性監視を外部基盤として標準化することを目的とする。

### Adlaire Static CMS 準拠方針

**Adlaire BaaS の機能・仕様・契約を策定する際は、[Adlaire Static CMS](https://github.com/fqwink/Adlaire) の最新版の機能・構造・設計方針に準拠することを原則とする。**

この方針は以下を意味する。

- Adlaire BaaS の機能仕様・API契約・イベント設計・データモデル・連携方式はすべて Adlaire Static CMS の最新版を基準として策定する
- Adlaire Static CMS の機能追加・変更・廃止が生じた場合は、Adlaire BaaS 側の仕様を追従して改訂する
- 既存の仕様と Adlaire Static CMS 最新版の間に乖離が生じた場合は、最新版を優先して仕様を更新する

**策定作業を行う前に、必ず [https://github.com/fqwink/Adlaire](https://github.com/fqwink/Adlaire) を参照し、最新版の機能・構造を確認してから着手すること。この参照を省略してはならない。**

### 開発言語の正式決定

本仕様における開発言語は **TypeScript を正式採用**する。対象は BaaS連携Hub、Adlaire BaaS API、Events / Generate / Audit / Health Worker、および将来的な [Adlaire Static CMS](https://github.com/fqwink/Adlaire) 本体移行先である。現行 CMS は互換維持のため当面 PHP で運用するが、新規の標準契約、内部契約、イベント契約、監査契約、会員モデル契約は TypeScript を基準言語として設計・実装する。

### ランタイム方針

**ランタイムは Deno を正式採用する。** Node.js は禁止する。

#### 技術スタック 最終確定

| 項目 | 採用 |
|---|---|
| ランタイム | **Deno** |
| 言語 | **TypeScript** |
| フレームワーク | **独自（内製のみ）** |
| DB | **Deno.openKv（Deno組み込み）** |
| Deno標準ライブラリ（jsr:@std/） | **禁止** |
| npmパッケージ | **禁止** |
| 外部JSRパッケージ | **禁止** |
| Node.js | **禁止** |

#### 使用可能なリソース

| 種別 | 具体例 |
|---|---|
| Deno組み込みAPI | `Deno.serve` / `Deno.crypto` / `Deno.openKv` / `Deno.readFile` 等 |
| Web標準API | `fetch` / `Request` / `Response` / `URL` / `crypto` 等 |
| TypeScript型定義 | 内製契約型・DTO・イベントenvelope 等 |

#### 使用禁止リソース

| 種別 | 具体例 |
|---|---|
| Node.jsランタイム | `node:http` / `node:crypto` 等 |
| Deno標準ライブラリ | `jsr:@std/http` 等 |
| npmパッケージ | `npm:express` / `npm:zod` 等 |
| 外部JSRパッケージ | `jsr:@hono/hono` 等 |

### 独自フレームワーク方針

本仕様における開発フレームワークは **独自フレームワークのみを採用**する。外部フレームワーク・ライブラリへの依存を一切持たない。根拠は以下の2点である。

- TypeScript製プロジェクトはすべてクローズドソースであり、外部OSSフレームワークへの依存はライセンス・ソース公開リスクを生む
- 契約層・DTO・イベントenvelopeをフレームワーク自体に持たせる型安全定義の内製化は絶対原則であり、独自実装でなければ実現できない

#### フレームワーク境界定義

| 層 | 方針 |
|---|---|
| アプリケーション層（ルーティング・認証・イベント等） | 内製必須 |
| Deno組み込みAPI（`Deno.serve` / `Deno.crypto` / `Deno.openKv`等） | 使用可 |
| Web標準API（`fetch` / `Request` / `Response`等） | 使用可 |
| Deno標準ライブラリ（`jsr:@std/`） | 使用禁止 |
| npmパッケージ全般 | 使用禁止 |
| 外部JSRパッケージ | 使用禁止 |
| Node.js | 使用禁止 |

#### 型安全原則の運用ルール

- `adlaire-contracts-ts` を全モジュールの基底として最初に実装する
- 契約型の変更は `adlaire-contracts-ts` への変更として一元管理する
- 実行時バリデーションは独自バリデーターを内製する
- 型定義と実行時バリデーションの二重管理を防ぐため、契約型からバリデーターを自動生成する仕組みを整備する

#### モジュール依存グラフ

```
adlaire-contracts-ts          ← 全モジュールが参照（依存される側）
    ↑
adlaire-runtime-ts            ← http / auth / events が依存
    ↑
adlaire-http-ts / adlaire-auth-ts / adlaire-events-ts /
adlaire-audit-ts / adlaire-generator-ts / adlaire-storage-ts
```

#### 独自フレームワーク内製モジュール一覧

1. `adlaire-contracts-ts` — 内部契約・API DTO・イベントenvelope・監査DTOの共通型定義
2. `adlaire-runtime-ts` — 実行コンテナ・設定読込・依存性解決・ライフサイクル制御
3. `adlaire-http-ts` — ルーティング・ミドルウェア・署名検証・レスポンス整形・エラー標準化
4. `adlaire-auth-ts` — 会員認証・セッション検証・ロール判定・内部署名認証
5. `adlaire-rendering-ts` — ページ解決・テーマ解決・Markdown/ブロック描画・翻訳適用
6. `adlaire-generator-ts` — `dist/`出力・差分ビルド・再生成対象決定・サイトマップ生成・build state管理
7. `adlaire-storage-ts` — フラットファイル管理・BaaSストレージ連携・オブジェクト参照標準化
8. `adlaire-events-ts` — 標準イベント写像・配送・再送・デッドレター管理
9. `adlaire-audit-ts` — 監査レコード生成・検索・保存期間制御・秘匿処理

## 1. 実装準備の前提

### 1.1 Adlaire Static CMS の最小前提

[Adlaire Static CMS](https://github.com/fqwink/Adlaire) は、PHP ベースのフラットファイル CMS であり、JSON ベースのデータ管理、管理 UI、REST API、Markdown / ブロック編集、多言語、リビジョン、静的サイト生成を備える。BaaS 実装準備において重要なのは、**ページ本文・ページメタ・公開状態・テーマ・翻訳・リビジョン・静的生成は CMS コアに残る**という点である。つまり、BaaS はコンテンツ管理本体ではなく、CMS 外部のアプリケーション基盤として接続される。

BaaS 実装時に押さえるべき CMS 前提は次の 5 点で十分である。

1. CMS コアはフラットファイル運用が本質であり、BaaS に全面移譲しない。
2. 管理認証は既存の CMS 内認証を当面維持する。
3. 公開物は `dist/` に静的出力される。
4. 再生成は API 層からトリガーされる。
5. BaaS 連携は CMS から直接ではなく Hub 経由を原則とする。

### 1.2 Adlaire BaaS の実装目的

Adlaire_BaaS に基づく実装目的は、Adlaire Static CMS に対する標準 BaaS 連携先として、Identity、Members、Data、Storage、Events、Generate、Audit、Health & Degrade の 8 領域を段階的に成立させることである。個別採用 BaaS の吸収が主眼ではなく、**Adlaire ネイティブな標準契約を先に固定すること**が第一目標である。

## 2. 実装対象アーキテクチャ

### 2.1 構成原則

実装対象の論理構成は次のとおりである。

```text
[Adlaire Static CMS]
      │
      ▼
 [BaaS連携Hub]
      │
      └─ [Adlaire BaaS]    ← 標準連携先
```

この構成で重要なのは、CMS と BaaS を直接密結合させないことである。Hub は単なる中継器ではなく、接続先登録、接続状態管理、認証入口、標準イベント写像、再生成トリガー入口、監査入口、縮退判定を担う制御点として設計する。

### 2.2 責務境界

CMS 側は、ページ本文、ページメタ、公開状態、翻訳、テーマ、リビジョン、管理 UI、静的生成を保持する。一方で Adlaire BaaS 側は、会員アカウント、認証情報、業務データ、コメント、申請、問い合わせ、通知履歴、分析イベント、アップロードファイル参照、リアルタイム状態、メッセージ履歴を担う。これは単なる役割分担ではなく、実装時の保存先・認可境界・障害分離境界を決める基準である。

## 3. CMS 側の接続境界

### 3.1 API 層の接続点

`Core/api.php` は、BaaS 連携の主要な接続点である。`pages` はコンテンツ CRUD、`revisions` は履歴管理、`search` は検索、`sitemap` はサイトマップ、`export` / `import` は移行・バックアップ、`version` は互換性確認、`generate` は静的再生成トリガーという責務境界を持つ。BaaS 側から直接コンテンツ本体へ介入するのではなく、**Generate と周辺イベントを中心に外部接続する**のが自然である。

### 3.2 App クラス側の境界

`Core/app.php` は、設定、認証、ページ解決、言語、プラグイン読込の中心にある。BaaS 連携に関しては、認証境界、ページ表示権限制御境界、設定マージ境界、プラグイン拡張境界の 4 点が重要である。特に、管理認証を維持したまま会員認証を BaaS 化する場合、`isLoggedIn()` をそのまま流用せず、**管理者セッションと会員セッションを分離**しなければならない。

### 3.3 Generate 接続点

`Core/generator.php` によれば、再生成は POST 前提で動作し、CSRF 検証を通過したうえで、差分ビルドまたは force rebuild を実行する。出力先は `dist/` であり、テーマ CSS、JS、翻訳 JSON をコピーしつつ、各公開ページと `sitemap.xml`、`.build_state.json` を生成する。このため、Hub / BaaS からの再生成要求は、**認証方式、CSRF 取り扱い、差分再生成の粒度、再試行戦略、build state の整合性**まで含めて設計する必要がある。
