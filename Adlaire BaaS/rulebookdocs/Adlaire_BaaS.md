# Adlaire_BaaS

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
    {
      "field": "status",
      "op": "eq",
      "value": "open"
    },
    {
      "field": "created_at",
      "op": "gte",
      "value": "2026-01-01T00:00:00Z"
    }
  ],
  "sort": [
    {
      "field": "updated_at",
      "direction": "desc"
    }
  ],
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

## 9. CMS-Hub 内部契約仕様書

### 9.1 目的

本仕様は、Adlaire Static CMSとBaaS連携Hubの間で使用する**内部契約**を定義する。外部公開APIではなく、CMSとHubの相互接続に限定した信頼境界内プロトコルであり、主な対象は認証済み再生成要求、接続状態取得、イベント受理、会員参照である。

### 9.2 設計原則

内部契約は、CMSコア保全、Hub経由統一、再生成安全性、監査可能性、縮退運転可能性の5原則に従う。CMSへはBaaSベンダー固有概念を持ち込まず、HubがすべてAdlaire標準契約へ正規化する。

### 9.3 通信方式

- 方式: HTTPS JSON
- 文字コード: UTF-8
- 時刻表現: ISO 8601 UTC
- 識別子: UUID v7 相当を推奨
- 相関 ID: `correlation_id` を必須
- 冪等キー: 更新系は `idempotency_key` を推奨

### 9.4 認証方式

内部契約では、**Hub専用の署名付き内部認証**を採用する。CMSは `X-Adlaire-Key-Id`、`X-Adlaire-Timestamp`、`X-Adlaire-Signature` を受け取り、共有秘密鍵または公開鍵基盤で署名検証を行う。Hubは短時間有効の署名のみ生成でき、CMSは時刻ずれ許容値を超えたリクエストを拒否する。

### 9.5 共通リクエスト envelope

```json
{
  "request_id": "req_01H...",
  "correlation_id": "corr_01H...",
  "requested_at": "2026-04-03T00:00:00Z",
  "actor": {
    "type": "system|member|admin",
    "id": "mem_001",
    "display_name": "string"
  },
  "source": {
    "system": "baas-hub",
    "connection_name": "adlaire-baas"
  },
  "payload": {}
}
```

### 9.6 共通レスポンス envelope

```json
{
  "status": "ok|accepted|error",
  "request_id": "req_01H...",
  "correlation_id": "corr_01H...",
  "result": {},
  "error": null,
  "meta": {
    "processed_at": "2026-04-03T00:00:01Z"
  }
}
```

### 9.7 内部契約一覧

#### 9.7.1 `hub.health.getStatus`

HubからCMSへ接続状態の要約を返す。CMS管理UIでの状態表示に用いる。

**result 例**
```json
{
  "connection_name": "adlaire-baas",
  "status": "ok",
  "degrade_mode": "none",
  "checked_at": "2026-04-03T00:00:00Z",
  "message": "healthy"
}
```

#### 9.7.2 `hub.members.getSummary`

CMSが会員概要を参照するための内部契約。公開UIや会員限定導線に用いるが、管理者権限には直結させない。

#### 9.7.3 `hub.events.ingest`

Hubが標準イベントを受理し、CMS側に配送する入口である。CMSは受理後、必要に応じてGenerateへ接続し、同時に監査ログへ相関IDを記録する。

#### 9.7.4 `hub.generate.request`

HubがCMSに対して再生成を要求する内部契約。`scope`、`reason`、`force` を受け取る。

**payload 例**
```json
{
  "scope": {
    "type": "site|page|collection",
    "targets": ["home", "news"]
  },
  "reason": "publish.requested",
  "force": false,
  "retry_count": 0
}
```

#### 9.7.5 `hub.generate.getStatus`

将来検討。

### 9.8 エラー体系

- `AUTH_INVALID_SIGNATURE`
- `AUTH_EXPIRED_REQUEST`
- `INPUT_INVALID`
- `STATE_CONFLICT`
- `RESOURCE_NOT_FOUND`
- `UPSTREAM_UNAVAILABLE`
- `RETRYABLE_FAILURE`
- `INTERNAL_ERROR`

### 9.9 受入条件

- Hub署名をCMSが検証できること。
- `hub.generate.request` で差分再生成とforce rebuildを区別できること。
- すべての更新系契約に `correlation_id` が付くこと。
- 障害時にCMS公開配信が停止しないこと。

## 10. Adlaire BaaS API 基本仕様書

### 10.1 目的

本仕様は、Adlaire BaaSがHubに対して提供する標準APIの基本形を定義する。ここでのAPIはHubから見た論理APIであり、Hubに対してはAdlaire標準契約として同一表現を返すものとする。

### 10.2 API 共通方針

- 形式: JSON
- バージョン: `/v0.1/`
- 認証: HubからBaaSへのサービス認証
- 返却: `status`, `result`, `error`, `meta`
- 冪等性: `data.create` / `data.update` / `generate.request` は `X-Idempotency-Key` ヘッダー必須

### 10.3 エンドポイント群

#### 10.3.1 Identity API
- `POST /v0.1/identity/sign-in`
- `POST /v0.1/identity/sign-out`
- `GET /v0.1/identity/session`
- `GET /v0.1/identity/current-user`

**session result 例**
```json
{
  "member_id": "mem_001",
  "session_id": "ses_001",
  "status": "active",
  "roles": ["member"],
  "expires_at": "2026-04-03T02:00:00Z"
}
```

#### 10.3.2 Members API
- `GET /v0.1/members/{member_id}`
- `GET /v0.1/members`
- `POST /v0.1/members/{member_id}/status`

#### 10.3.3 Data API
- `POST /v0.1/data/{collection}`
- `GET /v0.1/data/{collection}/{record_id}`
- `PATCH /v0.1/data/{collection}/{record_id}`
- `DELETE /v0.1/data/{collection}/{record_id}`
- `POST /v0.1/data/{collection}/query`

#### 10.3.4 Storage API
- `PUT /v0.1/storage/object`
- `GET /v0.1/storage/object-url`
- `DELETE /v0.1/storage/object`
- `HEAD /v0.1/storage/object`

#### 10.3.5 Events API
- `POST /v0.1/events/publish`
- `POST /v0.1/events/replay`
- `GET /v0.1/events/{event_id}`

#### 10.3.6 Generate API
- `POST /v0.1/generate/request`

#### 10.3.7 Audit API
- `POST /v0.1/audit/write`
- `POST /v0.1/audit/query`

#### 10.3.8 Health API
- `GET /v0.1/health/connection-status`
- `GET /v0.1/health/degrade-mode`

### 10.4 最低限必要なレスポンス標準

```json
{
  "status": "ok",
  "result": {},
  "error": null,
  "meta": {
    "request_id": "req_01H...",
    "correlation_id": "corr_01H...",
    "processed_at": "2026-04-03T00:00:00Z"
  }
}
```

### 10.5 権限モデル

APIは少なくとも `service`, `member`, `admin_operator`, `auditor` の4種別を区別する。HubからBaaSへの通常呼出しは `service`、会員自己参照は `member`、状態変更系は `admin_operator`、監査照会は `auditor` を原則とする。

### 10.6 互換性方針

v0.1では後方互換を優先し、フィールド追加は許容、既存意味の変更は原則禁止とする。削除や意味変更が必要な場合はv0.2以降で明示的に改版する。

### 10.7 idempotency_key 仕様

#### 生成責任

呼び出し側（Hub）が生成する。BaaS側は受け取ったキーを検証するのみ。再送時に同一キーを使う責任はHubが持つ。

#### フォーマット

```
{request_id}_{timestamp_ms}

例：req_01H_1743724800000

構成：
- request_id：UUID v7相当（内製生成）
- timestamp_ms：ミリ秒UNIXタイムスタンプ
- 区切り：アンダースコア
- 最大長：128文字
```

#### ヘッダー

```
X-Idempotency-Key: req_01H_1743724800000
```

#### 有効期間

| 契約 | 有効期間 |
|---|---|
| `data.create` / `data.update` | 24時間 |
| `generate.request` | 1時間 |

#### 重複時の挙動

**キャッシュ返却（再実行しない）を採用する。**

```
受信
    │
    ▼
Deno.openKvでidempotency_keyを照合
    │
    ├── 存在（有効期間内）
    │     │
    │     ▼
    │   前回レスポンスをそのまま返却（HTTP 200）
    │   再実行なし
    │
    └── 存在しない / 期限切れ
          │
          ▼
        通常処理を実行
        レスポンスをDeno.openKvに保存
```

#### 保存場所・キースキーマ

```
Deno.openKv（baas.db）

キースキーマ：
idempotency:{contract}:{idempotency_key}

例：
idempotency:data.create:req_01H_1743724800000
idempotency:generate.request:req_01H_1743724800000
```

保存内容：

```json
{
  "idempotency_key": "req_01H_1743724800000",
  "contract": "data.create",
  "response": {
    "status": "ok",
    "result": {},
    "meta": {}
  },
  "created_at": "2026-04-03T00:00:00Z",
  "expires_at": "2026-04-04T00:00:00Z"
}
```

#### 対象契約一覧

| 契約 | 対象 | 有効期間 | 理由 |
|---|---|---|---|
| `data.create` | ✅ | 24時間 | 重複作成防止 |
| `data.update` | ✅ | 24時間 | 重複更新防止 |
| `generate.request` | ✅ | 1時間 | 重複再生成防止 |
| `data.delete` | ❌ | 対象外 | 削除は冪等性不要 |
| `data.query` | ❌ | 対象外 | 読み取りは冪等 |
| `identity.signIn` | ❌ | 対象外 | 認証は対象外 |
| `audit.write` | ❌ | 対象外 | 全件記録が原則 |
| `events.publish` | ❌ | 対象外 | event_idで管理 |

## 11. イベント契約仕様書

### 11.1 目的

本仕様は、Adlaire BaaSとHubとCMSの間でやり取りされる標準イベントの共通契約を定義する。HubはBaaS固有イベントを受け取り、Adlaire標準イベントへ写像して配送する責務を持つ。

### 11.2 標準イベント envelope

```json
{
  "event_id": "evt_01H...",
  "event_name": "publish.requested",
  "event_version": "0.1",
  "correlation_id": "corr_01H...",
  "source_system": "adlaire-baas",
  "subject": {
    "type": "member|record|asset|workflow",
    "id": "mem_001"
  },
  "occurred_at": "2026-04-03T00:00:00Z",
  "payload": {},
  "delivery": {
    "mode": "at-least-once",
    "retry_count": 0
  }
}
```

### 11.3 標準イベント一覧

#### `user.created`
会員作成完了時に発行する。主なpayloadは `member_id`, `status`, `profile_summary`。

#### `user.updated`
会員情報変更時に発行する。主なpayloadは変更対象フィールドと更新後状態。

#### `content.approval.completed`
承認ワークフロー完了時に発行する。Generateの前段条件として使える。

#### `storage.asset.updated`
外部資産の更新完了時に発行する。必要に応じてページ再生成対象を決定する。

#### `workflow.completed`
業務フロー完了時に発行する。通知や再生成判断の材料にする。

#### `publish.requested`
公開要求を示すイベントであり、HubはCMS再生成につなぐ候補として扱う。

#### `site.rebuild.requested`
全体または特定範囲の再生成を要求するイベントである。Generate契約へ最も直接的に接続される。

### 11.4 イベント配送ルール

- 配送保証は `at-least-once` を初期標準とする。
- 受信側は `event_id` による重複排除を行う。
- 失敗時は指数バックオフで再送する。
- 閾値超過時はデッドレター保管と監査記録を行う。

### 11.5 Generate 接続ルール

次のイベントは標準でGenerateの候補とする。

- `publish.requested`
- `site.rebuild.requested`
- `content.approval.completed`
- `storage.asset.updated`（対象ページ解決可能な場合のみ）

Hubはイベントから再生成対象と `force` の初期値を決定し、`hub.generate.request` に写像する。

### 11.6 禁止事項

- ベンダー固有イベント名をCMSに直接渡すこと
- `correlation_id` なしで更新系イベントを流すこと
- 冪等性なしで同一イベントを無制限再送すること

## 12. 認証・会員モデル仕様書

### 12.1 目的

本仕様は、IdentityとMembersの境界、および会員状態・ロール・セッション表現を定義する。現行CMS管理認証は残す前提であり、会員モデルはCMS管理者モデルと分離して扱う。

### 12.2 基本原則

- 管理者認証と会員認証は別系統とする。
- 会員IDは全領域で不変とする。
- 認証情報とプロフィール情報は論理的に分離する。
- 権限はロールの配列で表現する。
- 無効会員は認証成功しても業務アクセス不可とする。

### 12.3 論理モデル

#### Identity モデル
- `member_id`
- `subject_id`
- `auth_provider`
- `credential_state`
- `mfa_state`
- `last_sign_in_at`

#### Member モデル
- `member_id`
- `display_name`
- `contact_email`
- `contact_phone`
- `status`
- `roles`
- `profile_summary`
- `created_at`
- `updated_at`

#### Session モデル
- `session_id`
- `member_id`
- `issued_at`
- `expires_at`
- `ip_hash`
- `user_agent_hash`
- `status`

### 12.4 会員状態

- `invited`
- `active`
- `suspended`
- `disabled`
- `deleted`

`deleted` は外部参照上は不可視とし、監査上のみ追跡可能とする。

### 12.5 ロール定義

v0.1では次の論理ロールを定義する。

- `member`
- `premium_member`
- `operator`
- `auditor`
- `integration_service`

このロールはBaaS業務権限用であり、CMS管理画面のログイン権限と同義ではない。

### 12.6 標準 DTO

#### current user DTO
```json
{
  "member_id": "mem_001",
  "display_name": "Example User",
  "status": "active",
  "roles": ["member"],
  "profile_summary": "string"
}
```

#### session DTO
```json
{
  "session_id": "ses_001",
  "member_id": "mem_001",
  "status": "active",
  "issued_at": "2026-04-03T00:00:00Z",
  "expires_at": "2026-04-03T02:00:00Z"
}
```

### 12.7 ライフサイクル

1. 招待または登録により `invited` / `active` を付与する。
2. 認証成功でsessionを発行する。
3. 状態が `suspended` または `disabled` の場合はsessionを拒否または失効する。
4. 変更時は `user.created` または `user.updated` を発行する。

### 12.8 注意事項

- 管理UIの `isLoggedIn()` と会員ログイン状態を共有しない。
- セッション期限とPHPセッション期限は独立に管理する。
- 会員ロールでCMS管理画面アクセスを自動許可しない。

## 13. 監査ログ仕様書

### 13.1 目的

本仕様は、接続変更、認証、データ更新、ストレージ操作、イベント配送、再生成要求に対して、後追い可能な監査ログ標準を定義する。監査はHubを中心に集約しつつ、CMSとBaaSの両側結果を相関IDで追跡できるようにする。

### 13.2 記録対象

- 認証成功 / 失敗
- 会員状態変更
- データ CRUD
- ストレージ put / delete
- イベント受理 / 再送 / 失敗
- Generate 要求 / 実行結果
- Health 状態遷移
- 接続設定変更

### 13.3 監査レコード標準

```json
{
  "audit_id": "aud_01H...",
  "correlation_id": "corr_01H...",
  "actor": {
    "type": "system|member|admin",
    "id": "mem_001"
  },
  "action": "generate.request",
  "target": {
    "type": "site",
    "id": "home"
  },
  "result": "success|failure",
  "occurred_at": "2026-04-03T00:00:00Z",
  "metadata": {
    "reason": "publish.requested"
  }
}
```

### 13.4 必須検索軸

- `audit_id`
- `correlation_id`
- `actor.id`
- `action`
- `target.type`
- `target.id`
- `result`
- `occurred_at` 範囲

### 13.5 保存・秘匿方針

- 標準保存期間は500日とする。
- 個人情報は必要最小限のみ格納する。
- メールアドレス、電話番号、IPはSHA-256ハッシュ化を必須とする。
- 機微payloadは全文保存せず、サマリと参照キーを記録する。

### 13.6 イベント / Generate 連携

監査はEventsとGenerateの両方に接続する。`publish.requested` を受理した時点で1件、`hub.generate.request` を実行した時点で1件、実行完了時に結果1件を残す三段構成を推奨する。これにより、イベント起点から公開反映までの追跡が可能になる。

### 13.7 改ざん耐性

v0.1では追記型保存、更新禁止、削除禁止、監査参照権限の分離を標準要件とする。将来的には署名付き監査チェーンまたは外部保全を拡張要件とする。

### 13.8 受入条件

- すべての更新系処理に `correlation_id` が付与されること。
- 認証失敗とgenerate失敗が確実に記録されること。
- `audit.query` により期間・操作種別・結果別の検索が可能であること。

## 14. 追加仕様の総括

本章で追記した仕様は、Adlaire_BaaSの上位方針を、実装着手可能な契約レベルへ落とし込むためのv0.1草案である。特にCMS-Hub内部契約仕様書とイベント契約仕様書は、現行Adlaire Static CMSの `Core/api.php` および `Core/generator.php` と接続するための最優先仕様である。今後の次工程では、ここで定義した契約をもとに、エンドポイント詳細、エラーコード辞書、JSON Schema、シーケンス図を追加してv0.2へ進めるのが妥当である。

## 15. 開発言語・独自フレームワーク方針

### 15.1 前提

本設計では、**フレームワークは独自フレームワークのみ採用**するものとする。ランタイムは **Deno を正式採用**し、Node.js は禁止する。外部ライブラリ・npmパッケージ・Deno標準ライブラリ（`jsr:@std/`）への依存を一切持たない。使用可能なリソースは Deno組み込みAPI（`Deno.serve` / `Deno.crypto` / `Deno.openKv`等）およびWeb標準APIに限定する。

### 15.2 将来的な TypeScript 移行の評価

将来的にAdlaire Static CMS本体をTypeScriptへ移行する構想は、十分に妥当であり、Adlaire BaaS / Hubの標準化方針と整合しやすい。現行リポジトリにはすでに `package.json`、`tsconfig.json`、`ts/`、`js/` が存在し、完全な新規導入ではなく既存資産の延長としてTypeScript基盤を強化できる。

### 15.3 Big Bang 移行は推奨しない

TypeScript移行は推奨できるが、**PHP版CMSを一括廃止するBig Bang移行は推奨しない**。移行時には言語を変えるのではなく、**責務を保ったまま置換する**ことを原則とする。

### 15.4 正式決定: 開発言語・ランタイム

本計画における開発言語は **TypeScript を正式採用**し、ランタイムは **Deno を正式採用**する。

| 対象 | 言語 | ランタイム |
|---|---|---|
| 現行 CMS | PHP（当面継続） | PHP |
| BaaS連携Hub | TypeScript | Deno |
| Adlaire BaaS API | TypeScript | Deno |
| Events / Generate / Audit / Health Worker | TypeScript | Deno |
| 将来 CMS 本体 | TypeScript（段階移行） | Deno |

### 15.5 独自フレームワークとして整備すべき内部モジュール

1. `adlaire-contracts-ts` — 内部契約・API DTO・イベントenvelope・監査DTOの共通型定義
2. `adlaire-runtime-ts` — 実行コンテナ・設定読込・依存性解決・ライフサイクル制御
3. `adlaire-http-ts` — ルーティング・ミドルウェア・署名検証・レスポンス整形・エラー標準化
4. `adlaire-auth-ts` — 会員認証・セッション検証・ロール判定・内部署名認証
5. `adlaire-rendering-ts` — ページ解決・テーマ解決・Markdown/ブロック描画・翻訳適用
6. `adlaire-generator-ts` — `dist/`出力・差分ビルド・再生成対象決定・サイトマップ生成・build state管理
7. `adlaire-storage-ts` — フラットファイル管理・BaaSストレージ連携・オブジェクト参照標準化
8. `adlaire-events-ts` — 標準イベント写像・配送・再送・デッドレター管理
9. `adlaire-audit-ts` — 監査レコード生成・検索・保存期間制御・秘匿処理

## 16. Adlaire Static CMS TypeScript 移行ロードマップ

### 16.1 移行原則

TypeScript移行は「全面書き換え」ではなく、**責務単位での置換**とする。以下の4領域は、移行後も必ず同等責務を維持しなければならない。

- 設定管理
- 認証・権限制御
- 翻訳・レンダリング
- 静的生成とbuild state管理

### 16.2 フェーズ 0: 契約先行固定

最初に行うべきはCMS本体の書換えではなく、**契約とデータ形の固定**である。ページデータ、リビジョン、翻訳JSON、Generate要求、イベントenvelope、監査レコード、会員DTOのJSON Schemaを先に確定する。

### 16.3 フェーズ 1: Hub / BaaS で TypeScript 基盤を先行実装

最初のTypeScript実装対象はCMS本体ではなく、HubとBaaSとする。

### 16.4 フェーズ 2: CMS の周辺責務を TypeScript 化

- 管理UIの一部ロジック
- 言語ファイル処理
- 入出力バリデーション
- イベント受理後の前処理
- 監査連携補助

### 16.5 フェーズ 3: Generator の TypeScript 化

現行Generatorの責務（公開ページ一覧取得・コンテンツHTML化・テーマCSS/JS/翻訳JSONのコピー・`dist/`出力・`sitemap.xml`生成・`.build_state.json`管理）をTypeScript側で同等機能として再現し、出力互換性をテストする。

### 16.6 フェーズ 4: App 中核責務の TypeScript 化

最後に `App` クラス相当の責務をTypeScriptへ移す。対象は設定管理、ページ解決、翻訳、ルーティング、プラグイン/フック読込である。

### 16.7 フェーズ 5: PHP 互換層の縮退

十分な互換検証後に、PHP実装は互換運転または保守モードへ縮退させる。

### 16.8 移行時の不変条件

- フラットファイルCMSとしての本質を維持すること。
- ページデータ形式とリビジョンの互換を保つこと。
- `dist/` 出力の契約を維持すること。
- CMS管理認証と会員認証を混線させないこと。
- BaaS連携を常にHub経由で維持すること。

## 17. データベース方針

### 17.1 正式決定

Adlaire BaaSのデータベースは、開発・本番環境ともに **Deno.openKv を正式採用**する。外部DB・クラウドDBは今後検討予定（時期未定）とする。

### 17.2 設計思想

Adlaire BaaSはデータ保持を推奨しない思想を基本とする。ただし、Deno.openKvに限りデータ保持を許容する唯一の例外とする。これはフラットファイルCMSの思想と整合した「自己完結型の最小永続層」としての位置づけである。

```
[Adlaire BaaS]
    │
    └── Deno.openKv（唯一の永続層）
            ├── 会員セッション     → Deno.openKv("./baas.db")
            ├── 監査ログ           → Deno.openKv("./baas-audit.db")
            ├── Eventsログ         → Deno.openKv("./baas.db")
            ├── Generate履歴       → Deno.openKv("./baas.db")
            └── リトライキュー     → Deno.openKv("./baas-queue.db")

外部DB・クラウドDB → 今後検討予定（時期未定）
```

### 17.3 Deno.openKv採用根拠

- Deno組み込みAPIのため外部ライブラリ禁止の制約と完全に整合する
- Adlaire BaaSの「データ保持を推奨しない」思想において唯一許容される自己完結型の永続層である
- フラットファイルCMSと同様のファイルベース運用でインフラ構成をシンプルに保てる
- 開発・本番で同一のエンジンを使用するため、環境差異による不具合が発生しない
- 外部DBへの依存を持たないことで、Hub障害時の縮退運転（§19参照）と整合する

### 17.4 Deno.openKv運用方針

#### ファイル分離方針

責務ごとにKVファイルを分離する。

```typescript
// 業務・セッション・イベント・Generate
const baas = await Deno.openKv("./baas.db");

// 監査ログ（追記専用・削除禁止）
const audit = await Deno.openKv("./baas-audit.db");

// リトライキュー・デッドレター
const queue = await Deno.openKv("./baas-queue.db");
```

#### 追記型保存（監査ログ）

監査KVエントリは書き込み後に上書き・削除を行わない。アプリケーション層でUPDATE・DELETE相当の操作を禁止する。

#### キーの命名規約

```
[ドメイン]:[エンティティ]:[ID]

例：
session:member:mem_001
audit:record:aud_01H
event:log:evt_01H
generate:history:req_01H
queue:retry:q_01H
queue:deadletter:dl_01H
```

### 17.5 データ保持方針

Deno.openKvに保持するデータは以下に限定する。これ以外のデータを持たせることを禁止する。

| 保持対象 | KVファイル | 保持期間 |
|---|---|---|
| 会員セッション | `baas.db` | セッション有効期限まで |
| Health状態キャッシュ | `baas.db` | TTL期間まで |
| 監査ログ | `baas-audit.db` | 500日 |
| Generate履歴 | `baas.db` | 250日 |
| Eventsログ | `baas.db` | 30日 |
| リトライキュー | `baas-queue.db` | 処理完了まで |
| デッドレター | `baas-queue.db` | 30日 |

### 17.6 ファイル管理方針

| ファイル | 配置 | バックアップ |
|---|---|---|
| `baas.db` | サーバーローカル | 日次ファイルコピー推奨 |
| `baas-audit.db` | サーバーローカル | 日次・変更不可ストレージ推奨 |
| `baas-queue.db` | サーバーローカル | 処理完了後に定期削除 |

監査KVは業務KVと分離し、独立したファイルとして管理する。

### 17.7 スケール対応順序

Deno.openKv運用で解決できる範囲を最大化した上で、以下の順序で対応する。外部DBへの移行は最終手段とする。

1. データ保持対象のさらなる削減
2. 書き込みキューによる直列化
3. KVファイルの責務別分離

### 17.8 KV抽象層の要件

内製フレームワーク（`adlaire-runtime-ts`）に以下の要件を課す。

- CRUD操作をKV実装に依存しない内部契約で定義する
- Deno.openKv固有のAPIはアダプター層に閉じ込める
- 監査・イベント・Generate・会員モデルのDTOをKV非依存に保つ
- キースキーマ管理を内製する

## 18. 改訂結論

独自フレームワークのみ採用可能という条件、および将来的なAdlaire Static CMS本体移行方針を踏まえ、本計画の**開発言語はTypeScript・ランタイムはDenoで進める**ものとする。理由は、DenoがTypeScriptをネイティブで実行でき、外部ライブラリ禁止の制約下においてDeno組み込みAPIのみで必要な機能を実現できるためである。

データベースについては**Deno.openKvを正式採用・唯一の永続層**とする。外部DB・クラウドDBは今後検討予定（時期未定）とする。

採用形態は**TypeScriptへの段階移行**であり、現行PHP実装を即時廃止する方式ではない。まずHubとBaaSをTypeScript（Deno）で整備し、その後Generator、最後にApp中核責務へ進むのが正式方針である。

## 19. Hub障害対応仕様

### 19.1 設計思想

Hubは止まる前提で設計する。完全冗長化よりも、Hub障害時の影響範囲を最小化する縮退設計を優先する。

### 19.2 機能3分類

Hub障害時の挙動を以下の3段階に分類する。この分類はCMS・Hub双方の実装仕様の基準とする。

| 分類 | 具体的な機能 | Hub障害時の挙動 |
|---|---|---|
| 継続必須 | 静的ページ配信、`dist/`公開 | Hubと無関係のため影響なし |
| 縮退可能 | 会員ログイン、Data読み取り、Storage URL取得 | キャッシュ・フォールバック値で代替 |
| 停止許容 | Generate要求、Data書き込み、Events発行、Audit書き込み | エラーを返しリトライキューに積む |

### 19.3 CMSローカルキャッシュ

Hubが落ちたときに「縮退可能」な機能を維持するため、CMSはHubからの応答を短期間キャッシュする。実装はCMSの既存フラットファイル基盤に準拠する。

```
通常時    ：CMS → Hub → BaaS → Hub → CMS
Hub障害時 ：CMS → [ローカルキャッシュ] → 縮退レスポンスを返す
```

| キャッシュ対象 | TTL | 理由 |
|---|---|---|
| `health.getConnectionStatus` | 30秒 | 頻繁なポーリング負荷を避けつつ早期検知 |
| `members.getSummary` | 5分 | 会員概要は頻繁に変わらない |
| `health.getDegradeMode` | 30秒 | 縮退判定の基準になるため短めに |

### 19.4 サーキットブレーカー

```
CLOSED（正常）
    │ 連続失敗が閾値を超えた
    ▼
OPEN（遮断）── 一定時間後 ──▶ HALF-OPEN（試行）
    ▲                               │
    │         成功                  │ 失敗
    └───────────────────────────────┘
```

v0.1初期パラメータ：

| パラメータ | 値 |
|---|---|
| CLOSED→OPEN | 30秒以内に5回連続失敗 |
| OPEN継続時間 | 60秒 |
| HALF-OPEN試行数 | 1リクエストのみ |

### 19.5 リトライキュー

「停止許容」に分類した機能はHub障害時にリクエストを破棄せず、CMSローカルのリトライキューに積む。実装はフラットファイル（JSON）とし、外部依存を持たない。

```
CMS → Hub呼び出し失敗
    → リトライキュー（ファイルベース）に保存
        → Hub復旧検知
            → キューから順次再実行
                → 成功 → 監査ログ記録
                → 失敗 → デッドレター保管
```

```json
{
  "queue_id": "q_01H...",
  "type": "generate.request | event.publish | data.write",
  "correlation_id": "corr_01H...",
  "payload": {},
  "enqueued_at": "2026-04-03T00:00:00Z",
  "retry_count": 0,
  "next_retry_at": "2026-04-03T00:01:00Z"
}
```

### 19.6 CMS管理UI状態通知

| 状態表示 | 条件 | 利用可能な機能 |
|---|---|---|
| 🟢 正常 | Hub接続中 | 全機能利用可 |
| 🟡 縮退中 | Hubキャッシュ利用中 | 読み取り系のみ・書き込みは遅延 |
| 🔴 Hub切断 | ポーリング連続失敗 | 静的配信のみ継続・会員機能停止 |

### 19.7 Hub復旧時の整合性回復

- Generate要求はキュー内で同一scopeの要求を最新1件に重複排除する
- 復旧後の最初のGenerate要求は必ず `force=false`（差分ビルド）で実行する
- 差分ビルドが連続失敗した場合のみ `force=true` にエスカレーションする
- 復旧完了後に監査ログへ以下を1件記録する

```json
{
  "action": "hub.recovery.completed",
  "metadata": {
    "degrade_started_at": "2026-04-03T00:00:00Z",
    "degrade_ended_at": "2026-04-03T00:10:00Z",
    "queue_processed": 3,
    "queue_deadlettered": 0
  }
}
```

### 19.8 既存章への追記

| 章 | 追記内容 |
|---|---|
| §4.8 | 機能3分類の定義をHealth & Degrade仕様の基準とする |
| §9 | Hub障害時のCMSフォールバック挙動とキャッシュTTL |
| §11 | Hub障害時のイベント保留・復旧後の再送ルール |
| §13 | 縮退期間の監査記録フォーマット（19.7参照） |

### 19.9 フェーズ別実装優先度

| 優先度 | 実装内容 | フェーズ |
|---|---|---|
| 1 | 機能3分類の定義 | Phase 1 |
| 2 | CMSローカルキャッシュ | Phase 1 |
| 3 | 管理UI状態バナー | Phase 1 |
| 4 | リトライキュー | Phase 2 |
| 5 | サーキットブレーカー | Phase 2 |
| 6 | 復旧時整合性回復 | Phase 2 |

## 20. Adlaire BaaS 管理UI仕様

### 20.1 基本方針

Adlaire BaaSは**独立した管理UI**を必須とする。
Adlaire Static CMS管理UIとは完全に分離した独立UIとして設計する。

```
アクセス経路：

[マスター管理者]
    │
    ├──→ [Adlaire Static CMS管理UI]   ← 直接アクセス可
    │
    └──→ [Adlaire BaaS管理UI]         ← 直接アクセス可

[システム管理者]
    │
    └──→ [Adlaire BaaS管理UI]         ← 直接アクセス可

[コンテンツ管理者]
    │
    └──→ [Adlaire BaaS管理UI]         ← 直接アクセス可

※ CMS管理UI → BaaS管理UI の経路は存在しない
※ マスター管理者はCMS管理UI経由でBaaS管理UIにアクセスできない
```

### 20.2 アクセスロール定義

BaaS管理UIにアクセスできるロールは以下の3つに限定する。

| ロール | 名称 | 位置づけ |
|---|---|---|
| `master_admin` | マスター管理者 | 最上位権限 |
| `system_admin` | システム管理者 | BaaSシステム管理 |
| `content_admin` | コンテンツ管理者 | コンテンツ・会員管理 |

### 20.3 権限マトリクス

| 機能 | master_admin | system_admin | content_admin |
|---|---|---|---|
| **会員管理** | ✅ | ✅ | ✅ |
| **監査ログ閲覧** | ✅ | ✅ | ❌ |
| **Generate操作** | ✅ | ✅ | ✅ |
| **Eventsログ** | ✅ | ✅ | ❌ |
| **Health状態** | ✅ | ✅ | ❌ |
| **接続設定** | ✅ | ✅ | ❌ |
| **ロール管理** | ✅ | ❌ | ❌ |
| **システム設定** | ✅ | ✅ | ❌ |
| **Adlaire Static CMS管理UI** | ✅ | ❌ | ❌ |

### 20.4 技術スタック

| 項目 | 内容 |
|---|---|
| ランタイム | Deno |
| 言語 | TypeScript |
| レンダリング | SSRベース・内製テンプレート |
| HTTPサーバー | `Deno.serve`（Deno組み込み） |
| 認証 | BaaS Identity（メール・パスワード） |
| 通信 | Hub経由（Web標準 fetch API） |
| 外部ライブラリ | 禁止 |

### 20.5 画面構成

```
Adlaire BaaS管理UI
    │
    ├── 🔑 ログイン                          ← Phase 1
    │     メール・パスワード認証
    │
    ├── 📊 Overview（ダッシュボード）         ← Phase 1
    │     Health状態・Hub接続状態
    │     サーキットブレーカー状態
    │
    ├── 👥 会員管理                          ← Phase 1
    │     一覧・検索・状態変更
    │     退会・停止・有効化
    │
    ├── 📋 監査ログビューア                   ← Phase 2
    │     期間・操作種別・結果別検索
    │     相関IDトレース
    │
    ├── ⚡ Generate履歴                       ← Phase 2
    │     実行履歴・成否・処理時間
    │     リトライキュー確認
    │
    ├── 📨 Eventsログ                         ← Phase 2
    │     デッドレター確認・再送操作
    │
    └── 🔧 設定                              ← Phase 3
          ロール管理・Hub接続・システム設定
```

### 20.6 認証フロー

```
BaaS管理UIログイン
    │ メール・パスワード
    ▼
Hub経由でidentity.signIn
    │
    ▼
ロール確認
    │
    ├── master_admin / system_admin / content_admin
    │     → BaaS管理UIアクセス許可
    │     → ロールに応じた機能表示
    │
    └── 上記以外
          → アクセス拒否
          → ログイン画面へリダイレクト
```

### 20.7 フェーズ別実装優先度

| 優先度 | 実装内容 | フェーズ |
|---|---|---|
| 1 | ログイン・認証 | Phase 1 |
| 2 | Overview（Health状態） | Phase 1 |
| 3 | 会員管理 | Phase 1 |
| 4 | 監査ログビューア | Phase 2 |
| 5 | Generate履歴 | Phase 2 |
| 6 | Eventsログ・デッドレター | Phase 2 |
| 7 | 設定・ロール管理 | Phase 3 |

### 20.8 §12.5ロール定義への追記

§12.5の論理ロールに以下を追加する。

| ロール | 用途 |
|---|---|
| `master_admin` | BaaS管理UI最上位権限・CMS管理UIアクセス権保有 |
| `system_admin` | BaaS管理UIシステム管理権限 |
| `content_admin` | BaaS管理UIコンテンツ・会員管理権限 |

既存の `operator` / `auditor` ロールとの関係は将来検討とする。

## 20. Adlaire BaaS 管理UI仕様

### 20.1 基本方針

Adlaire BaaSは**管理UIを必須**とする。管理UIはAdlaire Static CMS管理UIとは完全に独立した別UIとして実装する。CMS管理UIから管理UIへの経由アクセスは存在しない。

### 20.2 独立性の原則

```
[マスター管理者]
    │
    ├──→ [Adlaire Static CMS管理UI]   ← 直接アクセス可
    │
    └──→ [Adlaire BaaS管理UI]         ← 直接アクセス可
              （CMS経由ではない）

※ CMS管理UI → BaaS管理UI の経路は存在しない
※ BaaS管理UI → CMS管理UI の経路は存在しない
```

### 20.3 アクセスロール

BaaS管理UIにアクセスできるロールは以下の3つに限定する。

| ロール | 名称 | 位置づけ |
|---|---|---|
| `master_admin` | マスター管理者 | 最上位権限 |
| `system_admin` | システム管理者 | BaaSシステム管理 |
| `content_admin` | コンテンツ管理者 | コンテンツ・会員管理 |

### 20.4 権限マトリクス

| 機能 | master_admin | system_admin | content_admin |
|---|---|---|---|
| **会員管理** | ✅ | ✅ | ✅ |
| **監査ログ閲覧** | ✅ | ✅ | ❌ |
| **Generate操作** | ✅ | ✅ | ✅ |
| **Eventsログ** | ✅ | ✅ | ❌ |
| **Health状態** | ✅ | ✅ | ❌ |
| **接続設定** | ✅ | ✅ | ❌ |
| **ロール管理** | ✅ | ❌ | ❌ |
| **システム設定** | ✅ | ✅ | ❌ |
| **Adlaire Static CMS管理UI** | ✅ | ❌ | ❌ |

### 20.5 技術スタック

| 項目 | 内容 |
|---|---|
| ランタイム | Deno |
| 言語 | TypeScript |
| HTTPサーバー | `Deno.serve`（Deno組み込み） |
| レンダリング | SSRベース・内製テンプレートエンジン |
| 認証 | BaaS Identity（`master_admin` / `system_admin` / `content_admin`） |
| 通信 | Hub経由（Web標準 fetch API） |
| 外部ライブラリ | 禁止 |
| Deno標準ライブラリ | 禁止 |

### 20.6 画面構成

```
Adlaire BaaS管理UI
    │
    ├── 🔑 ログイン                          ← Phase 1
    │     メール・パスワード認証
    │
    ├── 📊 Overview                          ← Phase 1
    │     Health状態・縮退モード表示
    │     サーキットブレーカー状態
    │
    ├── 👥 会員管理                          ← Phase 1
    │     一覧・検索・状態変更
    │     有効化・停止・退会
    │
    ├── 📋 監査ログビューア                  ← Phase 2
    │     期間・操作種別・結果別検索
    │     相関IDトレース
    │     （master_admin / system_admin のみ）
    │
    ├── ⚡ Generate履歴                      ← Phase 2
    │     実行履歴・成否・処理時間
    │     リトライキュー確認
    │
    ├── 📨 Eventsログ                        ← Phase 2
    │     デッドレター確認
    │     （master_admin / system_admin のみ）
    │
    └── 🔧 設定                             ← Phase 3
          接続設定・Hub認証設定
          ロール管理（master_adminのみ）
          システム設定
```

### 20.7 認証フロー

```
管理UIログイン画面
    │ メール・パスワード
    ▼
Hub経由 identity.signIn
    │
    ▼
ロール確認
    │
    ├── master_admin  → 全機能アクセス許可
    ├── system_admin  → システム管理機能アクセス許可
    ├── content_admin → コンテンツ・会員管理機能アクセス許可
    └── その他ロール  → アクセス拒否 → ログイン画面へ
```

### 20.8 フェーズ別実装計画

| フェーズ | 機能 | 対象ロール |
|---|---|---|
| **Phase 1** | ログイン・Overview・会員管理 | 全3ロール |
| **Phase 2** | 監査ログ・Generate履歴・Eventsログ | master_admin / system_admin |
| **Phase 3** | 接続設定・ロール管理・システム設定 | master_admin / system_admin |

### 20.9 未確定事項

- 管理UI自体のURLスキーム
- プロジェクト横断対応の要否
- 派生プロジェクトとの管理UI共用方針
