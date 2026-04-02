# Adlaire Static CMSのBaaS連携Hub

## 文書情報

| 項目 | 内容 |
|---|---|
| 文書名 | Adlaire Static CMSのBaaS連携Hub |
| 版数 | なし |
| 文書種別 | Hub仕様書 / 最小標準化仕様書 |
| 対象製品 | [Adlaire Static CMS](https://github.com/fqwink/Adlaire) |
| 関連対象 | Adlaire BaaS / Supabase / Firebase / Appwrite |
| 位置づけ | CMS と各 BaaS の間に配置する最小標準化層 |
| 文書の役割 | Adlaire Static CMS における BaaS 連携ルールブック作成のベース文書 |

---

## 1. 目的

本書は、[Adlaire Static CMS](https://github.com/fqwink/Adlaire) に搭載される **BaaS連携Hub** の最小標準化仕様を定義することを目的とする。Hub は、CMS コアと各 BaaS の間に置かれる接続制御機構であり、接続、状態、イベント、再生成、監査及び縮退運転に関する標準入口を提供する。加えて、本書は **Adlaire Static CMS における BaaS 連携ルールブックを作成する際のベース文書** として位置づける。[Source](https://github.com/fqwink/Adlaire) [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/app.php) [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/api.php)

---

## 2. 基本方針

1. Hub は **Adlaire BaaS の機能基準** を絶対原則として実装する。  
2. Hub は全面的なベンダー抽象化レイヤーではなく、**最小標準化層** とする。  
3. すべての BaaS 接続は Hub を経由する。  
4. Adlaire BaaS も例外なく Hub 経由とする。  
5. 標準化前の高度機能は Hub に持ち込まない。  
6. BaaS 障害時でも CMS の静的公開を継続できる構成を維持する。[Source](https://www.genspark.ai/api/files/s/lx50g8eb) [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/generator.php)

---

## 3. Hub の責務

Hub の責務は以下に限定する。

- 接続先登録
- 接続状態管理
- 認証連携入口
- 標準イベント受理
- CMS からの再生成要求中継
- BaaS からの再生成トリガー受理
- 監査入口
- 縮退運転判定

Hub は Auth、Database、Storage、Realtime、Messaging 等のすべてを共通 API 化する層ではなく、CMS 側が安定して BaaS 連携できる最小制御点として扱う。[Source](https://www.genspark.ai/api/files/s/lx50g8eb)

---

## 4. 標準契約

Hub が提供する標準契約は、以下の 6 区分を最小単位とする。

| 区分 | 内容 |
|---|---|
| Connection Contract | 接続先の登録、読込、選択、適用 |
| State Contract | 接続状態、認証状態、縮退状態の取得 |
| Event Contract | 標準イベントの受理と配送 |
| Generate Contract | `generate` 連携と実行状況管理 |
| Audit Contract | 監査ログ入口 |
| Health Contract | 接続健全性と縮退運転判定 |

---

## 5. 標準イベント

Hub が扱う標準イベントは、当面以下を基礎集合とする。

- `user.created`
- `user.updated`
- `content.approval.completed`
- `storage.asset.updated`
- `workflow.completed`
- `publish.requested`
- `site.rebuild.requested`

これらのイベントは CMS コアへ直接ベンダー固有名で流さず、Hub において標準イベントとして扱う。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/api.php)

---

## 6. 再生成連携

Hub は、BaaS 側イベント又は CMS 側要求を受けて、[Adlaire Static CMS](https://github.com/fqwink/Adlaire) の `api.php` が提供する `generate` エンドポイントへ接続する。これにより、ページ公開、翻訳更新、データ変更、承認完了等を静的再生成に結びつける。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/api.php) [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/generator.php)

---

## 7. 縮退運転

Hub は接続障害時に、正常 / 警告 / 障害 の状態を返し、必要に応じて縮退運転へ移行できなければならない。縮退運転時であっても、CMS の静的公開及び基本管理機能は停止しないものとする。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/generator.php)

---

## 8. 接続対象

Hub の標準接続先は **Adlaire BaaS** とする。加えて、[Supabase](https://supabase.com/docs)、[Firebase](https://firebase.google.com/docs)、[Appwrite](https://appwrite.io/docs) は、Hub 標準契約に適合する範囲で個別採用を許容する。ただし、標準化前の高度機能は接続対象に含めない。[Source](https://supabase.com/docs) [Source](https://firebase.google.com/docs) [Source](https://appwrite.io/docs)

---

## 9. 禁止事項

以下を禁止する。

- Hub を経由しない BaaS 直接接続
- Hub 外のオプション連携
- 標準化前高度機能の先行実装
- CMS コア責務の無秩序な BaaS 移譲
- [PocketBase](https://pocketbase.io/docs/) の標準採用 [Source](https://pocketbase.io/docs/)

---

## 10. 総括

Adlaire Static CMSのBaaS連携Hub は、BaaS の全機能を抽象化するための層ではなく、Adlaire BaaS を基準とした接続制御点として設計する。これにより、CMS コアの軽量性を保ちつつ、BaaS 連携の拡張性、監査性及び縮退運転を両立させることができる。あわせて本書は、今後作成する **Adlaire Static CMS における BaaS 連携ルールブックのベース文書** として扱い、詳細運用規則、接続手順、禁止事項、実装規約を派生文書として整備する際の上位土台とする。[Source](https://github.com/fqwink/Adlaire) [Source](https://www.genspark.ai/api/files/s/lx50g8eb)
