# Adlaire License Server RULEBOOK

- 文書名: Adlaire License Server RULEBOOK
- 文書バージョン: Ver.1.1
- 作成日: 2026-04-04
- 対象製品: Adlaire License Server
- 文書種別: 公式サイト APIキー認証・認可管理システムの技術規範文書
- 文書目的: 公式サーバー側のキー発行・管理・検証システムの仕様を定義する

---

## 1. 基本宣言

### 1.1 位置づけ

本 RULEBOOK は、Adlaire 公式サイトに搭載する APIキー認証・認可管理システム（以下「License Server」）の技術規範文書である。
License Server は Adlaire Static CMS 本体とは独立したシステムであり、将来的に別リポジトリで管理する。
現段階では Adlaire 本体のルールブック内で仕様を管理する。

### 1.2 ルールブック規律の全面適用

- **Adlaire のルールブック規律を全面的に適用する。**
- RULEBOOK に記載のない機能を実装してはならない。
- 新機能・変更は、まず RULEBOOK に仕様を策定・記載してから実装に着手すること。
- バグ修正ポリシー（50件以上精査、致命的・重大・中程度を最優先）を適用する。
- ドキュメント命名規則（大文字・アンダースコア区切り）を適用する。
- バージョン規則（`CHARTER.md` §5）、廃止ポリシー（`CHARTER.md` §6）を適用する。

### 1.3 上位原則

- `LICENSE_SYSTEM_RULEBOOK.md` のキー体系・フロー仕様に準拠する。
- 公式サイトの配置方針（`ARCHITECTURE_RULEBOOK.md` §7.4）に準拠する。

### 1.4 ソースコード管理

- 当面は Adlaire 本体リポジトリの `Adlaire License Server/` ディレクトリで管理する。
- 将来的に別リポジトリへ移行する。

### 1.5 基本方針

- **PHP 8.3+ で実装**する（`declare(strict_types=1)` 必須）。
- **SQLite を初期 DB** として採用する。
- 公式サイトと同一の自前サーバーに配置する。
- 管理ダッシュボードは Adlaire Group メンバーのみがアクセスする。

---

## 2. システム構成

### 2.1 全体アーキテクチャ

```
【自前サーバー】
  ├── 公式サイト（Adlaire CMS 静的生成物）
  │     └── 製品紹介・ダウンロードページ
  │
  └── License Server（独立 PHP アプリケーション）
        ├── API エンドポイント（CMS → サーバー）
        ├── 管理ダッシュボード（Adlaire Group 用）
        └── SQLite DB
```

### 2.2 技術スタック

| 項目 | 採用 |
|---|---|
| 言語 | PHP 8.3+（`declare(strict_types=1)`） |
| DB | SQLite 3 |
| 通信 | HTTPS 必須 |
| API 形式 | REST JSON |
| 管理画面認証 | セッション + bcrypt |
| API 認証 | HMAC 署名付きリクエスト |

### 2.3 ディレクトリ構成（暫定）

```
license-server/
├── public/
│   ├── index.php              # API ルーター
│   └── admin.php              # 管理ダッシュボード エントリ
├── src/
│   ├── KeyGenerator.php       # キー生成ロジック
│   ├── KeyValidator.php       # キー検証ロジック
│   ├── Database.php           # SQLite 操作
│   ├── ApiHandler.php         # API エンドポイントハンドラー
│   ├── AdminHandler.php       # 管理ダッシュボードハンドラー
│   └── Auth.php               # 管理者認証
├── data/
│   ├── license.db             # SQLite データベース
│   └── audit.log              # 監査ログ
├── templates/
│   └── admin/                 # 管理画面テンプレート
└── .htaccess                  # アクセス制御
```

---

## 3. API エンドポイント

### 3.1 登録 API

| 項目 | 内容 |
|---|---|
| パス | `POST /api/license/register` |
| 用途 | システム固有キーを受け取り、プライマリー + セカンドキーを発行 |

**リクエスト:**

```json
{
  "system_key": "a1b2c3...（64文字hex）",
  "domain": "example.com",
  "product_version": "3.0-47",
  "timestamp": "2026-04-04T10:00:00+09:00",
  "signature": "（HMAC署名）"
}
```

**レスポンス（成功）:**

```json
{
  "status": "ok",
  "primary_key": "...",
  "second_key": "...",
  "registered_at": "2026-04-04T10:00:01+09:00"
}
```

**レスポンス（エラー）:**

```json
{
  "status": "error",
  "message": "エラー内容"
}
```

**エラーケース:**
- システム固有キーが不正形式
- 既に登録済みのシステム固有キー
- リクエスト署名不正
- レート制限超過

### 3.2 キー検証 API

| 項目 | 内容 |
|---|---|
| パス | `POST /api/license/verify` |
| 用途 | キーの有効性確認（失効チェック） |

**リクエスト:**

```json
{
  "system_key": "...",
  "primary_key": "...",
  "timestamp": "...",
  "signature": "..."
}
```

**レスポンス:**

```json
{
  "status": "ok",
  "valid": true,
  "type": "free",
  "expires_at": null
}
```

### 3.3 キー更新 API

| 項目 | 内容 |
|---|---|
| パス | `POST /api/license/renew` |
| 用途 | キーの更新（期限延長等） |

**リクエスト:**

```json
{
  "system_key": "...",
  "primary_key": "...",
  "timestamp": "...",
  "signature": "..."
}
```

**レスポンス:**

```json
{
  "status": "ok",
  "primary_key": "（新キー or 既存キー）",
  "second_key": "（新キー or 既存キー）",
  "renewed_at": "..."
}
```

### 3.4 サードパーティーキー API

| 項目 | 内容 |
|---|---|
| パス | `POST /api/license/third-party` |
| 用途 | サードパーティーキーの有効性確認・取得 |

**リクエスト:**

```json
{
  "system_key": "...",
  "primary_key": "...",
  "contract_code": "（契約コード）",
  "timestamp": "...",
  "signature": "..."
}
```

**レスポンス（成功）:**

```json
{
  "status": "ok",
  "third_party_key": "...",
  "contract_type": "commercial",
  "expires_at": "2027-04-04"
}
```

### 3.5 API 共通仕様

| 項目 | 内容 |
|---|---|
| プロトコル | HTTPS 必須 |
| Content-Type | `application/json` |
| 認証 | HMAC 署名（リクエストボディ + タイムスタンプ） |
| レート制限 | 登録: 10回/時。検証・更新: 60回/時 |
| タイムスタンプ検証 | ±5分以内のリクエストのみ受理 |

---

## 4. データベース設計

### 4.1 licenses テーブル

| カラム | 型 | 内容 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | 自動採番 |
| `system_key` | TEXT UNIQUE NOT NULL | システム固有APIキー |
| `primary_key` | TEXT NOT NULL | プライマリーAPIキー |
| `second_key` | TEXT NOT NULL | セカンドAPIキー |
| `domain` | TEXT NOT NULL | 登録ドメイン |
| `product_version` | TEXT | 登録時の製品バージョン |
| `status` | TEXT NOT NULL DEFAULT 'active' | `active` / `revoked` / `suspended` |
| `registered_at` | TEXT NOT NULL | 登録日時（ISO 8601） |
| `last_verified_at` | TEXT | 最終検証日時 |
| `ip_address` | TEXT | 登録時 IP アドレス |

### 4.2 contracts テーブル

| カラム | 型 | 内容 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | 自動採番 |
| `license_id` | INTEGER NOT NULL | licenses テーブルの外部キー |
| `third_party_key` | TEXT NOT NULL | サードパーティーAPIキー |
| `contract_code` | TEXT UNIQUE NOT NULL | 契約コード |
| `contract_type` | TEXT NOT NULL | `commercial` |
| `contractor_name` | TEXT | 契約者名 |
| `contractor_email` | TEXT | 契約者メール |
| `status` | TEXT NOT NULL DEFAULT 'active' | `active` / `expired` / `revoked` |
| `issued_at` | TEXT NOT NULL | 発行日時 |
| `expires_at` | TEXT | 有効期限 |

### 4.3 audit_log テーブル

| カラム | 型 | 内容 |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | 自動採番 |
| `action` | TEXT NOT NULL | `register` / `verify` / `renew` / `revoke` / `admin_login` 等 |
| `system_key` | TEXT | 対象システムキー |
| `ip_address` | TEXT | リクエスト元 IP |
| `details` | TEXT | 詳細情報（JSON） |
| `created_at` | TEXT NOT NULL | 記録日時 |

---

## 5. キー生成仕様

### 5.1 プライマリーAPIキー

- **形式**: `ASCMS-PRI-` + 48文字の暗号論的ランダム16進数
- **生成**: `random_bytes(24)` → hex エンコード
- **一意性制約**: DB の UNIQUE 制約で保証

### 5.2 セカンドAPIキー

- **形式**: `ASCMS-SEC-` + 48文字の暗号論的ランダム16進数
- **生成**: `random_bytes(24)` → hex エンコード
- **一意性制約**: DB の UNIQUE 制約で保証

### 5.3 サードパーティーAPIキー

- **形式**: `ASCMS-TPK-` + 48文字の暗号論的ランダム16進数
- **生成**: `random_bytes(24)` → hex エンコード
- **一意性制約**: DB の UNIQUE 制約で保証

---

## 6. 管理ダッシュボード

### 6.1 アクセス制御

- Adlaire Group メンバーのみアクセス可能。
- セッションベース認証（bcrypt パスワード）。
- 管理画面 URL は非公開（推測困難なパス or IP 制限）。

### 6.2 機能一覧

| 機能 | 内容 |
|---|---|
| **登録一覧** | 全ライセンスの一覧表示・検索・フィルタ（ドメイン・ステータス・日付） |
| **ライセンス詳細** | 個別ライセンスの全情報表示・操作 |
| **キー失効** | 特定ライセンスの失効処理 |
| **キー再発行** | プライマリー / セカンドキーの再生成 |
| **商業契約管理** | サードパーティーキーの発行・契約情報の入力・状態管理 |
| **利用統計** | 登録数推移・利用形態別集計（Free / Commercial） |
| **監査ログ** | API 呼び出し履歴・管理操作履歴の閲覧 |

---

## 7. セキュリティ要件

### 7.1 通信

- すべての API 通信は HTTPS を必須とする。
- HMAC 署名によりリクエストの改ざんを検出する。
- タイムスタンプ検証（±5分）によりリプレイ攻撃を防止する。

### 7.2 データ保護

- SQLite ファイルは Web 公開ディレクトリ外に配置する。
- SQLite ファイルの権限は 0600 とする。
- パスワードは bcrypt でハッシュ保存する。

### 7.3 レート制限

- API エンドポイントごとにレート制限を実施する（§3.5 参照）。
- IP ベースのスライディングウィンドウ方式。

### 7.4 監査

- すべての API 呼び出しと管理操作を audit_log に記録する。
- ログは改ざん検出のためハッシュチェーンを使用する（将来拡張）。

---

## 8. 開発フェーズ

### 8.1 Phase 1 — 登録 API + DB 基盤（Ver.3.0 必須）

| # | 内容 | 優先度 |
|---|---|:---:|
| 1 | SQLite DB 設計・初期化スクリプト | 必須 |
| 2 | KeyGenerator クラス（プライマリー・セカンドキー生成） | 必須 |
| 3 | `/api/license/register` エンドポイント | 必須 |
| 4 | HMAC 署名検証ミドルウェア | 必須 |
| 5 | レート制限 | 必須 |

### 8.2 Phase 2 — 管理ダッシュボード（Ver.3.0 必須）

| # | 内容 | 優先度 |
|---|---|:---:|
| 6 | 管理者認証（ログイン・セッション） | 必須 |
| 7 | 登録一覧・検索・フィルタ | 必須 |
| 8 | ライセンス詳細・キー失効・再発行 | 必須 |
| 9 | 監査ログ閲覧 | 必須 |

### 8.3 Phase 3 — サードパーティーキー発行（Ver.3.0）

| # | 内容 | 優先度 |
|---|---|:---:|
| 10 | `/api/license/third-party` エンドポイント | 必須 |
| 11 | 商業契約管理画面（契約情報入力・発行・状態管理） | 必須 |
| 12 | contracts テーブル運用 | 必須 |

### 8.4 Phase 4 — 検証・更新・統計（後続バージョン）

| # | 内容 | 優先度 |
|---|---|:---:|
| 13 | `/api/license/verify` エンドポイント | 後続 |
| 14 | `/api/license/renew` エンドポイント | 後続 |
| 15 | 利用統計ダッシュボード | 後続 |

---

## 9. 不採用項目（現段階）

| 項目 | 理由 |
|---|---|
| MySQL / MariaDB | 初期段階では SQLite で十分。規模拡大時に移行検討 |
| REST フレームワーク | 素の PHP で十分。複雑性を増やさない |
| フロントエンド SPA | 管理画面は PHP テンプレートで十分 |
| メール送信機能 | メール認証不要のため。将来の通知機能で検討 |

---

## 10. 最終規則

### 10.1 上位規範性

本 RULEBOOK は、Adlaire License Server に関する上位規範文書である。

### 10.2 優先適用

License Server に関して個別提案、実装都合と本 RULEBOOK が衝突する場合、本 RULEBOOK を優先しなければならない。

### 10.3 改訂条件

本 RULEBOOK を改訂する場合は、API 仕様・セキュリティ・データ構造への影響を明示しなければならない。

### 10.4 リポジトリ移行

将来、本システムを別リポジトリに移行する場合、本 RULEBOOK も移行先で管理する。移行後は Adlaire 本体のルールブックから本文書を削除し、参照リンクに置き換える。

---

## 11. 関連文書

| 文書 | 内容 |
|------|------|
| `LICENSE_SYSTEM_RULEBOOK.md` | CMS 側のキー体系・フロー仕様（上位仕様） |
| `ARCHITECTURE_RULEBOOK.md` | 公式サイト配置方針（§7.4） |
| `Licenses/LICENSE_Ver.2.0` | Adlaire License Ver.2.0 |
| `RELEASE_PLAN_RULEBOOK.md` | リリース計画 |

> 改訂履歴は `REVISION_HISTORY.md` を参照。
