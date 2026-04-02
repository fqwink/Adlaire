# Adlaire License System RULEBOOK

- 文書名: Adlaire License System RULEBOOK
- 文書バージョン: Ver.1.0
- 作成日: 2026-04-02
- 対象製品: Adlaire Static CMS
- 文書種別: API キー認証・ライセンス管理システムに関する技術規範文書
- 文書目的: 全利用者に義務付ける API キー認証の仕様・設計・実装規則を定義する

---

## 1. 基本宣言

### 1.1 位置づけ

本 RULEBOOK は、Adlaire Static CMS の API キー認証システムに関する恒常的規範文書である。
セキュリティ強化を目的とし、商業利用・非商業利用を問わず全利用者に適用される。

### 1.2 上位原則

- Adlaire License Ver.2.0 の規定に準拠する。
- ARCHITECTURE_RULEBOOK.md の設計原則に従う。
- LIFECYCLE_SYSTEM_RULEBOOK.md のセットアップフローと整合する。

### 1.3 基本方針

- **API キー未適用の状態では、本ソフトウェアは一切動作しない。**
- **シンプルイズベスト** — 最小限のコードで実現し、外部依存を増やさない。
- **共有サーバーで動作** — 特殊な PHP 拡張を要求しない。
- **オフライン検証を基本** — 起動のたびに外部通信を必須としない。

---

## 2. API キー種別

| 種別 | プレフィックス | 対象 | 費用 | 発行条件 |
|------|:-------------|------|:----:|---------|
| Free | `ASCMS-FREE-` | 個人・非営利・教育・自社サイト運用 | 無料 | 登録のみ |
| Commercial | `ASCMS-COM-` | 有償製品・SaaS・クラウドベンダー・受託 | 有料 | 商業ライセンス契約 + API キー取得 |

### 2.1 Free キー

- 非商業利用者が無料で取得できる。
- 著作権者（Adlaire Group）への登録が必要。
- Adlaire License Ver.2.0 §3（Open Source — Platform Code）の条件に従う。

### 2.2 Commercial キー

- 商業利用者が有料で取得する。
- Adlaire Group との個別商業ライセンス契約の締結が必須。
- テクニカルサポートは含まれない。サポートプランの提供はない。
- 必要最小限のドキュメントのみ提供する。

---

## 3. API キー仕様

### 3.1 キー形式

```
ASCMS-{種別}-{ペイロード}-{署名}
```

- 種別: `FREE` または `COM`
- ペイロード: Base64url エンコードされた JSON
- 署名: HMAC-SHA256 ハッシュの先頭8文字

### 3.2 ペイロード構造

```json
{
  "iss": "adlaire",
  "typ": "FREE",
  "iat": "2026-04-02",
  "exp": "2027-04-02",
  "dom": "*"
}
```

| フィールド | 必須 | 内容 |
|-----------|:----:|------|
| `iss` | 必須 | 発行者識別子（固定値 `"adlaire"`） |
| `typ` | 必須 | キー種別（`"FREE"` または `"COM"`） |
| `iat` | 必須 | 発行日（ISO 8601 日付） |
| `exp` | 必須 | 有効期限（ISO 8601 日付） |
| `dom` | 必須 | 許可ドメイン（`"*"` = 制限なし、`"example.com"` = 特定ドメイン） |

### 3.3 署名

- アルゴリズム: HMAC-SHA256
- 入力: `{種別}-{ペイロード}`（署名対象文字列）
- 出力: ハッシュ値の先頭8文字（16進数）
- 秘密鍵: `Core/license.php` 内に保持

---

## 4. 検証フロー

### 4.1 起動時ゲート

```
index.php 起動
    │
    ├─ install.lock 存在チェック
    │   └─ なし → bundle-installer.php（セットアップ）
    │
    ├─ data/system/license.key 存在チェック
    │   └─ なし → ライセンス登録画面を表示（動作停止）
    │
    ├─ キー形式検証（プレフィックス `ASCMS-` + 構造）
    │   └─ 不正 → エラー表示 + 動作停止
    │
    ├─ 署名検証（HMAC-SHA256）
    │   └─ 不正 → エラー表示 + 動作停止
    │
    ├─ 有効期限チェック（exp フィールド）
    │   └─ 期限切れ → 更新案内 + 動作停止
    │
    ├─ ドメインチェック（dom フィールド、"*" は全許可）
    │   └─ 不一致 → エラー表示 + 動作停止
    │
    └─ 検証成功 → 通常起動
```

### 4.2 動作停止時の挙動

- HTTP ステータス 503 Service Unavailable を返す。
- 最小限の HTML でエラーメッセージを表示する。
- 管理画面・公開ページ・REST API のすべてが停止する。
- `bundle-installer.php` のみ動作を許可する（初期セットアップのため）。

### 4.3 検証タイミング

- `index.php` の起動時に毎回実行する。
- 検証結果のキャッシュは行わない（改ざん防止）。

---

## 5. ファイル構成

### 5.1 新規ファイル

| ファイル | 責務 |
|---------|------|
| `Core/license.php` | LicenseValidator クラス + LicenseResult クラス |
| `data/system/license.key` | API キー保存（1行テキスト、利用者が配置） |

### 5.2 修正ファイル

| ファイル | 修正内容 |
|---------|---------|
| `index.php` | 起動ゲート追加（require + validate 呼び出し） |
| `bundle-installer.php` | セットアップに API キー入力ステップを追加 |
| `Core/admin-ui.php` | 管理画面にライセンス情報表示・キー更新 UI を追加 |

### 5.3 ARCHITECTURE_RULEBOOK との整合

- `Core/license.php` は Core ディレクトリに配置する（§2.2 準拠）。
- `data/system/license.key` は data/system/ に配置する（§3.1 準拠）。
- require 順序は `Core/helpers.php` の直後に `Core/license.php` を配置する。

---

## 6. クラス設計

### 6.1 LicenseValidator

```php
final class LicenseValidator
{
    /**
     * API キーファイルを読み込み検証する。
     * ファイルが存在しない場合は invalid を返す。
     */
    public static function validate(string $keyFile): LicenseResult;

    /**
     * API キー文字列の形式・署名・有効期限・ドメインを検証する。
     */
    public static function verifyKey(string $key, string $domain = ''): LicenseResult;

    /**
     * API キーから種別を取得する。
     * @return string 'FREE' | 'COM' | 'UNKNOWN'
     */
    public static function getType(string $key): string;
}
```

### 6.2 LicenseResult

```php
final class LicenseResult
{
    public function __construct(
        public readonly bool $valid,
        public readonly string $type,       // 'FREE' | 'COM' | ''
        public readonly string $message,    // エラーメッセージ（検証失敗時）
        public readonly string $expiry = '', // 有効期限
    ) {}
}
```

---

## 7. セキュリティ要件

### 7.1 秘密鍵管理

- HMAC-SHA256 の秘密鍵は `Core/license.php` 内の定数として保持する。
- 秘密鍵はソースコードに含まれるが、Core/ ディレクトリの .htaccess による
  直接 HTTP アクセス禁止で保護される。

### 7.2 改ざん防止

- API キーの署名検証により、ペイロードの改ざんを検出する。
- 検証結果をキャッシュしないことで、キーファイルの差し替えを即座に検出する。

### 7.3 制約事項

- 外部サーバーへの通信は行わない（オフライン完結）。
- API キーの発行・管理は著作権者（Adlaire Group）が運用する（本ソフトウェアの範囲外）。
- 秘密鍵がソースコードに含まれるため、リバースエンジニアリングによるキー偽造は
  理論上可能である。これは Adlaire License Ver.2.0 §4（Closed Source）および
  §5（Compiled Output）の逆コンパイル禁止条項で法的に保護する。

---

## 8. 禁止事項

- API キーの共有・転売・公開を禁止する。
- API キーの偽造・改ざん・生成ツールの作成を禁止する。
- 検証ロジックのバイパス・無効化・改変を禁止する。
- 上記の違反は Adlaire License Ver.2.0 §8（ライセンスの終了）に基づき、
  全権利の自動終了事由とする。

---

## 9. 最終規則

### 9.1 上位規範性

本 RULEBOOK は、Adlaire の API キー認証システムに関する上位規範文書である。

### 9.2 優先適用

API キー認証に関して個別提案、実装都合と本 RULEBOOK が衝突する場合、
本 RULEBOOK を優先しなければならない。

### 9.3 改訂条件

本 RULEBOOK を改訂する場合は、セキュリティ・ライセンス体系への影響を
明示しなければならない。

---

## 10. 関連文書

| 文書 | 内容 |
|------|------|
| `Licenses/LICENSE_Ver.2.0` | Adlaire License Ver.2.0（上位ライセンス） |
| `ARCHITECTURE_RULEBOOK.md` | アーキテクチャ規範（ファイル配置） |
| `LIFECYCLE_SYSTEM_RULEBOOK.md` | セットアップ・アップデート規範 |
| `API_RULEBOOK.md` | REST API 規範 |
| `RELEASE_PLAN_RULEBOOK.md` | リリース計画（実装バージョン配分） |

> 改訂履歴は `REVISION_HISTORY.md` を参照。
