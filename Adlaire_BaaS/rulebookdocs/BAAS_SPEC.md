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

## 4. 8 機能領域ごとの実装準備

### 4.1 Identity

#### 目的

Identityはエンドユーザー向け認証基盤であり、CMS管理認証とは分離された会員認証を提供する。初期段階ではCMS管理認証を置換しないため、実装上は「管理者ログイン」と「会員ログイン」の二系統を明確に分ける。

#### 認証方式

初期採用範囲を以下に確定する。

| 方式 | 採用 | 備考 |
|---|---|---|
| メール・パスワード | ✅ 採用 | 初期実装対象 |
| パスキー | 将来検討 | 時期未定 |
| パスワードレス | 将来検討 | 時期未定 |
| 外部IdP | 将来検討 | 時期未定 |

#### 必須契約

- `identity.signIn`
- `identity.signOut`
- `identity.getSession`
- `identity.getCurrentUser`

#### セッション管理

##### 有効期限

| 項目 | 値 |
|---|---|
| アクティブセッション | 2時間 |
| リフレッシュ猶予 | なし |
| Remember me | 将来検討 |

##### 期限切れ時のAPI挙動

```json
HTTP 401 Unauthorized

{
  "status": "error",
  "error": {
    "code": "AUTH_SESSION_EXPIRED",
    "message": "Session has expired. Please sign in again."
  }
}
```

##### 期限切れ時のUI挙動

```
1. APIから401を受信
        │
        ▼
2. ローカルセッション情報を破棄
        │
        ▼
3. ログインページへリダイレクト
        │
        ▼
4. ログイン後に元のページへ復帰
   （リダイレクト先をクエリパラメータで保持）
```

#### 実装準備項目

- 会員認証用セッションモデルをCMS管理セッションから分離する
- Hub側に認証入口を置き、CMSには標準化済みの認証結果のみ返す
- 標準ID・表示名・状態・有効期限・ロールを返す基本セッションDTOを定義する
- 認証状態変化イベントを標準イベントとして発火できるようにする

#### 将来拡張

| 拡張項目 | 内容 | 時期 |
|---|---|---|
| パスキー | WebAuthn準拠の認証器対応 | 未定 |
| パスワードレス | メールリンク・OTP等 | 未定 |
| 外部IdP | Google・GitHub等のOAuth連携 | 未定 |
| CMS閲覧制御 | 会員ロールとCMSページ制御の接続 | 未定 |

#### MVP優先度

最優先。BaaSの存在意義の一つであり、他領域の前提になる。

### 4.2 Members

#### 目的

Membersは会員プロフィール、会員状態、CMS参照用会員概要を標準化する。Identityが「本人確認」なら、Membersは「会員情報の業務表現」を担う。

#### 必須契約

- `members.get`
- `members.list`
- `members.updateStatus`

#### 会員属性

##### 必須属性

| 属性 | 理由 |
|---|---|
| `member_id` | 全領域の識別子 |
| `display_name` | UI表示に必要 |
| `contact_email` | 認証・通知の基本手段 |
| `status` | 有効/無効判定の基準 |
| `roles` | 認可の基準 |
| `created_at` | 監査・追跡の基準 |
| `updated_at` | 変更追跡の基準 |

##### 任意属性

| 属性 | 備考 |
|---|---|
| `contact_phone` | 初期は不要 |
| `profile_summary` | 用途依存 |

#### 会員状態と操作

| 操作 | status遷移 | データ扱い | 復帰可否 |
|---|---|---|---|
| 無効化 | `active` → `disabled` | 全データ保持 | 可能 |
| 停止 | `active` → `suspended` | 全データ保持 | 可能 |
| 退会 | `active` → `deleted` | 匿名化処理 | 不可 |

##### 退会時の匿名化対象

```
匿名化対象：
- contact_email  → 削除
- contact_phone  → 削除
- display_name   → "退会済み会員"
- profile_summary → 削除

退会後も保持するもの：
- member_id（監査ログの参照整合性のため）
- created_at
- 監査ログ（§13保存期間に従う）
```

#### 連絡先正規化ルール

| 項目 | 正規化ルール |
|---|---|
| `contact_email` | 小文字統一・RFC 5322準拠・重複禁止 |
| `contact_phone` | 将来検討 |

#### Hub連携点

CMS側は詳細プロフィールではなく、会員概要取得に限定した参照を行うのが安全である。Hubは検索・一覧・状態更新の標準契約を公開し、BaaS固有のスキーマ差異を隠蔽する。

#### MVP優先度

高。Identityとセットで初期導入対象。

### 4.3 Data

#### 目的

DataはCMSコア外のアプリケーションデータを保持する領域であり、コメント、申請、問い合わせ、業務データなどを管理する。Adlaire BaaSの汎用基盤価値の中心である。

#### 必須契約

- `data.create`
- `data.get`
- `data.update`
- `data.delete`
- `data.query`

#### クエリ文法

独自JSON文法を採用する。外部ライブラリ禁止の制約下で内製しやすい構造を優先する。

```json
{
  "filter": [
    { "field": "status", "op": "eq", "value": "open" },
    { "field": "created_at", "op": "gte", "value": "2026-01-01T00:00:00Z" }
  ],
  "sort": [{ "field": "updated_at", "direction": "desc" }],
  "page": 1,
  "page_size": 20
}
```

##### 対応オペレーター

| オペレーター | 意味 |
|---|---|
| `eq` | 等値 |
| `neq` | 非等値 |
| `gt` | より大きい |
| `gte` | 以上 |
| `lt` | より小さい |
| `lte` | 以下 |
| `in` | リスト内 |
| `contains` | 部分一致 |

##### クエリ制約

- filterの最大件数：10件
- page_sizeの最大値：100件
- ネストしたfilter（AND/OR混在）は将来検討

#### 検索・集計範囲

| 機能 | 採用 |
|---|---|
| フィールド条件検索 | ✅ 採用 |
| ページネーション | ✅ 採用 |
| 単一フィールドソート | ✅ 採用 |
| 全文検索 | 将来検討 |
| 集計（COUNT等） | 将来検討 |
| 複数フィールドソート | 将来検討 |
| JOIN相当の横断検索 | 将来検討 |

#### バルク操作・トランザクション

| 機能 | 採用 |
|---|---|
| 単一レコードCRUD | ✅ 採用 |
| バルクinsert | 将来検討 |
| バルクupdate | 将来検討 |
| バルクdelete | 将来検討 |
| トランザクション | 将来検討 |

#### 最低限必要なデータモデル

- `collection_name`
- `record_id`
- `payload`
- `status`
- `requires_rebuild`
- `created_at`
- `updated_at`
- `updated_by`

#### MVP優先度

最優先。Identity / Membersに次ぐ中心機能。

### 4.4 Storage

#### 目的

Storageは画像、添付、会員関連ファイルなどのCMS外部資産を扱う。テーマ資産や静的生成出力は対象外。

#### 必須契約

- `storage.putObject`
- `storage.getObjectUrl`
- `storage.deleteObject`
- `storage.headObject`

#### アップロード方針

| 機能 | 採用 |
|---|---|
| 通常アップロード（単一） | ✅ 採用 |
| マルチパートアップロード | 将来検討 |

##### ファイルサイズ制限

| 項目 | 値 |
|---|---|
| 最大ファイルサイズ | 10MB |
| 対応MIMEタイプ | 制限なし |

#### 削除方針

| 操作 | 採用 | 挙動 | 復帰可否 |
|---|---|---|---|
| 物理削除 | ✅ 採用 | ファイル即時削除 | 不可 |
| 論理削除 | 将来検討 | 時期未定 | － |

```
削除フロー：

storage.deleteObject 呼び出し
    │
    ▼
ファイル物理削除
    │
    ▼
監査ログに削除記録
    │
    ▼
関連Eventsへ通知
```

#### 将来拡張

| 拡張項目 | 時期 |
|---|---|
| 画像変換・リサイズ・圧縮 | 未定 |
| サムネイル自動生成 | 未定 |
| フォーマット変換（WebP等） | 未定 |
| マルチパートアップロード | 未定 |
| 論理削除 | 未定 |
| 削除前参照チェック | 未定 |

#### MVP優先度

高。Dataと連動して早期導入が望ましい。

### 4.5 Events

#### 目的

EventsはBaaS側で生じた事象を、CMS連携可能な標準イベントとして流通させる。ベンダー固有イベント名をCMSコアへ直接流入させない。

#### 標準イベント集合

- `user.created`
- `user.updated`
- `content.approval.completed`
- `storage.asset.updated`
- `workflow.completed`
- `publish.requested`
- `site.rebuild.requested`

#### 配送保証レベル

| レベル | 採用 |
|---|---|
| at-most-once | 除外 |
| at-least-once | ✅ 採用 |
| exactly-once | 将来検討 |

重複排除は受信側が `event_id` で行う。

#### 順序保証

**順序保証なし**を正式方針とする。

##### 受信側の設計ルール

| ルール | 内容 |
|---|---|
| 冪等設計必須 | 同一イベントを複数回受信しても結果が変わらない設計 |
| `occurred_at` 基準 | 順序判定が必要な場合は `occurred_at` を使用 |
| 順序依存禁止 | イベントの到着順序に依存した処理を禁止 |

#### 再送ポリシー

| 項目 | 値 |
|---|---|
| 最大再送回数 | 5回 |
| 初回再送間隔 | 30秒 |
| 最大再送間隔 | 30分 |
| 再送計算式 | 30秒 × 2^retry_count（上限30分） |

#### デッドレター処理

| 項目 | 内容 |
|---|---|
| 保管先 | `baas-queue.db`内のデッドレターテーブル |
| 保管期間 | 30日 |
| 通知 | 監査ログへ記録 |
| 手動再送 | 将来検討 |
| 自動再送 | なし |

```json
{
  "dead_letter_id": "dl_01H...",
  "event_id": "evt_01H...",
  "event_name": "publish.requested",
  "correlation_id": "corr_01H...",
  "reason": "MAX_RETRY_EXCEEDED",
  "retry_count": 5,
  "last_attempted_at": "2026-04-03T00:30:00Z",
  "stored_at": "2026-04-03T00:30:01Z",
  "payload": {}
}
```

#### MVP優先度

高。GenerateとAuditの前提。

### 4.6 Generate

#### 目的

GenerateはBaaS側の承認・公開要求・データ更新などをAdlaireの静的再生成へ接続する。Adlaire BaaSの製品差別化点。

#### 必須契約

- `generate.request`
- `generate.getStatus`（将来検討）

#### 処理方式

**同期処理**を採用する。

```
理由：
- 現行CMSが同期処理であり整合性が高い
- フラットファイルCMSの規模感ではタイムアウトリスクが低い
- 内製フレームワーク制約下でWorker実装はコストが高い
```

```
同期処理フロー：

hub.generate.request 受信
    │
    ▼
Generate実行（タイムアウト上限：30秒）
    │
    ├── 成功 → HTTP 200 OK + result_summary・監査ログ記録
    │
    └── タイムアウト → HTTP 504・監査ログ記録・Hub側でリトライ
```

#### 再生成対象イベントの最終表

| イベント | 再生成対象 | force初期値 | 備考 |
|---|---|---|---|
| `publish.requested` | ✅ | false | 差分ビルド優先 |
| `site.rebuild.requested` | ✅ | true | 全体再生成 |
| `content.approval.completed` | ✅ | false | 対象ページのみ |
| `storage.asset.updated` | ✅ | false | 対象ページ解決可能な場合のみ |
| `user.created` | ❌ | － | 再生成不要 |
| `user.updated` | ❌ | － | 再生成不要 |
| `workflow.completed` | 条件付き | false | requires_rebuild=trueの場合のみ |

#### scope定義

```
1. page（単一ページ）
   → targetsにslugを指定
   → 対象ページのみ再生成

2. collection（コレクション単位）
   → targetsにcollection_nameを指定
   → 該当コレクションに紐づくページを再生成

3. site（全体）
   → targets指定なし
   → 全公開ページを再生成
```

#### requires_rebuild フラグ

```
Data更新時：
    requires_rebuild: true を付与
        │
        ▼
Generate Workerが検知
        │
        ▼
対象ページを差分再生成
        │
        ▼
requires_rebuild: false にリセット
```

#### 排他制御

| 項目 | 値 |
|---|---|
| 同時実行数 | 1（直列処理） |
| 待機上限 | 10件 |
| 重複排除 | 同一scopeは最新1件に集約 |
| タイムアウト | 30秒 |

#### MVP優先度

最優先。Adlaire BaaSの製品差別化点。

### 4.7 Audit

#### 目的

Auditは接続設定変更、認証、データ更新、ストレージ操作、再生成要求に対して、後追い可能な監査基盤を提供する。

#### 必須契約

- `audit.write`
- `audit.query`

#### 保存期間

| 対象 | 保存期間 |
|---|---|
| 監査ログ全般 | 500日 |
| 認証失敗ログ | 500日 |
| Generate履歴 | 250日 |
| デッドレター | 30日 |

#### 改ざん耐性要件

##### v0.1必須（設計時に仕込む）

```sql
-- UPDATEトリガー
CREATE TRIGGER prevent_audit_update
BEFORE UPDATE ON audit_logs
BEGIN
    SELECT RAISE(ABORT, 'UPDATE is not allowed on audit_logs');
END;

-- DELETEトリガー
CREATE TRIGGER prevent_audit_delete
BEFORE DELETE ON audit_logs
BEGIN
    SELECT RAISE(ABORT, 'DELETE is not allowed on audit_logs');
END;
```

| 要件 | 実装タイミング |
|---|---|
| 追記型保存（INSERT-ONLYテーブル） | v0.1必須 |
| UPDATE禁止（トリガーで強制） | v0.1必須 |
| DELETE禁止（トリガーで強制） | v0.1必須 |
| 監査参照権限の分離（auditorロールのみ） | v0.1必須 |
| `baas-audit.db` の分離 | v0.1必須 |

##### 将来検討

| 要件 | 内容 |
|---|---|
| 署名付き監査チェーン | レコードごとにハッシュチェーン |
| 外部保全 | 変更不可ストレージへの定期エクスポート |

#### 機微情報のマスキング方針

| 情報種別 | 処理方針 |
|---|---|
| メールアドレス | SHA-256ハッシュ化 |
| 電話番号 | SHA-256ハッシュ化 |
| IPアドレス | SHA-256ハッシュ化 |
| パスワード | 記録禁止 |
| セッショントークン | 記録禁止 |
| 機微payload | サマリ＋参照キーのみ |

```
ハッシュ化方針：
- アルゴリズム：SHA-256
- ソルト：サービス固定ソルトを使用
- 復元：不可（一方向ハッシュ）
```

#### 監査レコード標準

```json
{
  "audit_id": "aud_01H...",
  "correlation_id": "corr_01H...",
  "actor": {
    "type": "system|member|admin",
    "id": "mem_001",
    "email_hash": "sha256:a3f1..."
  },
  "action": "generate.request",
  "target": {
    "type": "site",
    "id": "home"
  },
  "result": "success|failure",
  "occurred_at": "2026-04-03T00:00:00Z",
  "metadata": {
    "reason": "publish.requested",
    "ip_hash": "sha256:b2e4..."
  }
}
```

#### MVP優先度

中〜高。運用要件として早期に必要。

### 4.8 Health & Degrade

#### 目的

Health & Degradeは接続健全性を可視化し、障害時に縮退運転へ切り替える。BaaS障害時も静的公開継続を必須とする。§19と統合して設計する。

#### 必須契約

- `health.getConnectionStatus`
- `health.getDegradeMode`

#### 状態3段階定義

| 状態 | 条件 | 管理UI表示 |
|---|---|---|
| `ok` | 正常応答継続中 | 🟢 正常 |
| `warning` | 応答遅延または断続的失敗 | 🟡 縮退中 |
| `failure` | 接続断・連続失敗 | 🔴 Hub切断 |

#### 状態遷移閾値

| 遷移 | 条件 |
|---|---|
| `ok` → `warning` | 30秒以内に3回失敗 |
| `warning` → `failure` | 30秒以内に5回連続失敗 |
| `failure` → `warning` | 1回の試行成功 |
| `warning` → `ok` | 60秒間連続成功 |

#### ポーリング間隔

| 状態 | ポーリング間隔 |
|---|---|
| `ok` | 30秒 |
| `warning` | 10秒 |
| `failure` | 60秒 |

#### 自動復旧フロー

```
HALF-OPEN（試行）
    │
    ├── 成功
    │     │
    │     ▼
    │   warning 状態へ遷移
    │     │
    │     ▼
    │   60秒間連続成功を確認
    │     │
    │     ▼
    │   ok 状態へ復旧
    │   監査ログに復旧記録
    │
    └── 失敗
          │
          ▼
        failure 状態を維持
        60秒後に再度HALF-OPEN試行
```

##### 自動復旧時の処理

| 処理 | 内容 |
|---|---|
| 監査ログ記録 | §19.7の復旧監査レコードを記録 |
| キュー再処理 | リトライキューを順次再実行 |
| Generate重複排除 | 同一scopeは最新1件に集約 |
| 管理UI通知 | 🟢 正常 へ表示更新 |

#### 再試行・通知ルール

##### 再試行ルール

| 項目 | 値 |
|---|---|
| 再試行方式 | 指数バックオフ |
| 初回再試行間隔 | 60秒 |
| 最大再試行間隔 | 30分 |
| 再試行計算式 | 60秒 × 2^retry_count（上限30分） |

##### 通知ルール

| 通知タイミング | 通知先 |
|---|---|
| `ok` → `warning` 遷移時 | 管理UI・監査ログ |
| `warning` → `failure` 遷移時 | 管理UI・監査ログ |
| `failure` → `ok` 復旧時 | 管理UI・監査ログ |

#### MVP優先度

高。Generateと並び運用品質を決める。

## 5. 横断設計で先に決めるべき事項

### 5.1 認証境界

最優先で決めるべきは、CMS管理認証と会員認証を混在させないことである。現行 `App` クラスの `isLoggedIn()` は管理認証前提であるため、BaaS会員認証は別の状態管理として設計しなければならない。

### 5.2 Hub認証方式

Generate を含む内部連携では、現在のCMS APIがセッションとCSRFに強く依存しているため、Hubから安全に呼べる内部認証方式が必要である。候補は、署名付き内部トークン、IP制限併用、専用秘密鍵ベースのHMACなどである。

### 5.3 イベント標準 envelope

Events、Generate、Auditは同じイベントenvelopeを使うべきである。最低限 `event_id`、`event_name`、`source_system`、`occurred_at`、`payload`、`correlation_id` は共通化する。

### 5.4 エラー体系

各契約で共通のエラーコード体系を持たないと、HubがBaaS差異を吸収しきれない。認証失敗、入力不正、権限不足、競合、接続障害、再試行可能障害の分類は初期に固定する。

### 5.5 相関 ID

監査、イベント、再生成結果を後追い可能にするため、Identity / Data / Generate / Auditを横断する `correlation_id` を導入する。

### 5.6 将来拡張付随ルール

将来拡張と定義した機能に付随する設計・実装・契約・データモデルはすべて将来拡張方針とし、現行仕様には含めない。付随する仕様を現行に混入させることを禁止する。

## 6. 推奨フェーズ分割

### フェーズ 1: 最小接続成立

- Hub最小実装
- Identity基本機能
- Members最小属性
- Data基本CRUD
- Health状態取得

この段階の目的は、標準契約でBaaSが成立することを確認することにある。

### フェーズ 2: 運用連携成立

- Storage基本操作
- Events標準化
- Audit基本記録
- Generate連携の試験実装

この段階で「使えるBaaS」になる。特にGenerateをつなぐことでAdlaire向けの意味が強まる。

### フェーズ 3: 品質・標準固定

- Degradeモードの詳細化
- イベント再送/配送保証
- 監査検索強化
- 管理UI状態通知

## 7. 実装着手前チェックリスト

1. 管理認証と会員認証の分離方針が決まっているか。
2. HubからCMS generateを安全に呼ぶ認証方式が決まっているか。
3. イベントenvelopeと相関IDが決まっているか。
4. Dataの論理コレクション命名規約が決まっているか。
5. Storageの公開/非公開方針が決まっているか。
6. Auditの保存期間と秘匿方針が決まっているか。
7. Health/Degradeの状態遷移が決まっているか。
8. Generateの差分粒度とforce rebuild条件が決まっているか。

## 8. 結論

Adlaire_BaaSの実装準備で最も重要なのは、外部BaaSの選定そのものではなく、**Adlaire向け標準契約・標準イベント・再生成連携・縮退運転の基準を先に固定すること**である。実装順としては、Identity / Members / DataをベースにEvents / Generate / Audit / Healthを運用層として積み上げるのが妥当である。
