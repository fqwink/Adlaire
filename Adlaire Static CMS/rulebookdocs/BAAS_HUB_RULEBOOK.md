# Adlaire BaaS Hub RULEBOOK

- 文書名: Adlaire BaaS Hub RULEBOOK
- 文書バージョン: Ver.1.0
- 作成日: 2026-04-02
- 対象製品: Adlaire Static CMS
- 文書種別: BaaS連携Hub の責務・標準契約・標準イベント・縮退運転を定義する仕様書
- 文書目的: Adlaire Static CMS に搭載される BaaS連携Hub の最小標準化仕様を定義し、BaaS 連携に関する実装判断の基準とする

---

# 1. 目的

本 RULEBOOK は、Adlaire Static CMS に搭載される **BaaS連携Hub** の最小標準化仕様を定義する。Hub は CMS コアと各 BaaS の間に配置される接続制御機構であり、接続、状態、イベント、再生成、監査及び縮退運転に関する標準入口を提供する。

本 RULEBOOK は `DIRECTION_RULEBOOK.md` §10 BaaS 連携方針規則の下位仕様として位置づけられ、Hub の詳細な責務・契約・制約を規定する。

---

# 2. 基本方針

1. Hub は **Adlaire BaaS の機能基準** を絶対原則として実装する。
2. Hub は全面的なベンダー抽象化レイヤーではなく、**最小標準化層** とする。
3. すべての BaaS 接続は Hub を経由する。
4. Adlaire BaaS も例外なく Hub 経由とする。
5. 標準化前の高度機能は Hub に持ち込まない。
6. BaaS 障害時でも CMS の静的公開を継続できる構成を維持する。

---

# 3. Hub の責務

Hub の責務は以下に限定する。

- 接続先登録
- 接続状態管理
- 認証連携入口
- 標準イベント受理
- CMS からの再生成要求中継
- BaaS からの再生成トリガー受理
- 監査入口
- 縮退運転判定

Hub は Auth、Database、Storage、Realtime、Messaging 等のすべてを共通 API 化する層ではなく、CMS 側が安定して BaaS 連携できる最小制御点として扱う。

---

# 4. 標準契約

Hub が提供する標準契約は、以下の 6 区分を最小単位とする。

| 区分 | 内容 |
|------|------|
| Connection Contract | 接続先の登録、読込、選択、適用 |
| State Contract | 接続状態、認証状態、縮退状態の取得 |
| Event Contract | 標準イベントの受理と配送 |
| Generate Contract | `generate` 連携と実行状況管理 |
| Audit Contract | 監査ログ入口 |
| Health Contract | 接続健全性と縮退運転判定 |

---

# 5. 標準イベント

Hub が扱う標準イベントは、当面以下を基礎集合とする。

| イベント | 説明 |
|---------|------|
| `user.created` | ユーザー新規作成 |
| `user.updated` | ユーザー情報更新 |
| `content.approval.completed` | コンテンツ承認完了 |
| `storage.asset.updated` | ストレージアセット更新 |
| `workflow.completed` | ワークフロー完了 |
| `publish.requested` | 公開要求 |
| `site.rebuild.requested` | サイト再構築要求 |

これらのイベントは CMS コアへ直接ベンダー固有名で流さず、Hub において標準イベントとして扱う。ベンダー固有イベントは Hub 内で標準イベントへ写像する。

---

# 6. 再生成連携

Hub は、BaaS 側イベント又は CMS 側要求を受けて、Adlaire Static CMS の `api.php` が提供する `generate` エンドポイントへ接続する。これにより、ページ公開、翻訳更新、データ変更、承認完了等を静的再生成に結びつける。

再生成トリガー候補:

- ページ公開
- ページ更新
- 翻訳更新
- メニュー変更
- テーマ変更
- BaaS 側承認完了
- BaaS 側データ変更
- ワークフロー完了

---

# 7. 縮退運転

## 7.1 状態定義

Hub は接続障害時に、以下の 3 状態を返す。

| 状態 | 説明 |
|------|------|
| 正常 | すべての接続が健全 |
| 警告 | 一部の接続に遅延又は不安定を検出 |
| 障害 | 接続不能又はタイムアウト |

## 7.2 縮退運転時の動作

縮退運転時であっても、CMS の静的公開及び基本管理機能は停止しないものとする。BaaS 依存機能のみが一時的に利用不可となる。

---

# 8. 接続対象

## 8.1 標準接続先

Hub の標準接続先は **Adlaire BaaS** とする。

## 8.2 個別採用許容対象

Supabase、Firebase、Appwrite は、Hub 標準契約に適合する範囲で個別採用を許容する。ただし、標準化前の高度機能は接続対象に含めない。

## 8.3 非対応対象

PocketBase は公式対応対象に含めない。

---

# 9. 禁止事項

以下を禁止する。

1. Hub を経由しない BaaS 直接接続
2. Hub 外のオプション連携
3. 標準化前高度機能の先行実装
4. CMS コア責務の無秩序な BaaS 移譲
5. PocketBase の標準採用
6. Hub を全面的なベンダー抽象化レイヤーとして拡張すること

---

# 10. 最終規則

## 10.1 下位仕様としての位置づけ

本 RULEBOOK は `DIRECTION_RULEBOOK.md` §10 BaaS 連携方針規則の下位仕様である。方針レベルの判断は `DIRECTION_RULEBOOK.md` を優先する。

## 10.2 改訂条件

本 RULEBOOK を改訂する場合は、Hub の責務範囲、標準契約、標準イベント、縮退運転仕様への影響を明示しなければならない。

---

# 11. 関連文書

| 文書 | 内容 |
|------|------|
| `CHARTER.md` | ルールブック憲章（最上位原則） |
| `DIRECTION_RULEBOOK.md` | 製品方向性（§10 BaaS 連携方針規則） |
| `ARCHITECTURE_RULEBOOK.md` | アーキテクチャ・ファイル構成 |
| `API_RULEBOOK.md` | REST API・データ仕様（`generate` エンドポイント） |
| `GENERATOR_RULEBOOK.md` | 静的サイト生成（再生成連携先） |
| `REVISION_HISTORY.md` | 全ルールブック改訂履歴 |
