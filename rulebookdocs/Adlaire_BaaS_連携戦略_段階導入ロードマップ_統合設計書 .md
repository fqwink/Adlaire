# [Adlaire](https://github.com/fqwink/Adlaire) × BaaS 連携戦略・段階導入ロードマップ統合設計書

## 文書情報

| 項目 | 内容 |
|---|---|
| 文書名 | Adlaire_BaaS_連携戦略_段階導入ロードマップ_統合設計書 |
| 文書種別 | 統合設計書 / 導入ロードマップ / 上位方針文書 |
| 対象プロダクト | [Adlaire Static CMS](https://github.com/fqwink/Adlaire) |
| 標準BaaS連携先 | Adlaire BaaS |
| 接続方式 | すべての BaaS 接続は Adlaire Static CMS の BaaS連携Hub を経由 |
| 個別採用許容対象 | [Supabase](https://supabase.com/docs), [Firebase](https://firebase.google.com/docs), [Appwrite](https://appwrite.io/docs) |
| 非対応対象 | [PocketBase](https://pocketbase.io/docs/) |
| 文書位置づけ | Adlaire BaaS 計画全体の戦略、責務分離、導入順序、禁止事項を定める基準文書 |

---

## 1. 目的

本書は、[Adlaire Static CMS](https://github.com/fqwink/Adlaire) の現行構造を踏まえ、Adlaire BaaS の導入戦略、責務分離、段階導入ロードマップ及び実装判断基準を明文化することを目的とする。元のアップロード文書が持っていた「現行 Adlaire 分析」「BaaS 連携の必要性」「段階導入ロードマップ」という骨格を維持しつつ、現在確定している方針、すなわち **標準 BaaS は Adlaire BaaS のみ**、**接続はすべて BaaS連携Hub 経由**、**Hub はルールブック作成のベースである** という前提へ全面的に整合させる。[Source](https://www.genspark.ai/api/files/s/lx50g8eb)

---

## 2. 最重要方針

### 2.1 標準BaaS連携先

Adlaire Static CMS に最適化した標準 BaaS 連携先は、**Adlaire BaaS のみ**とする。

### 2.2 接続方式

すべての BaaS 接続は、Adlaire Static CMS に搭載される **BaaS連携Hub** を経由して行う。Adlaire BaaS 自身も例外としない。

### 2.3 個別採用の扱い

[Supabase](https://supabase.com/docs)、[Firebase](https://firebase.google.com/docs)、[Appwrite](https://appwrite.io/docs) は、ユーザーが個別要件に応じて採用できる余地を残す。ただし、接続は Hub 標準契約に適合する範囲に限り許容し、Hub 外連携は認めない。[Source](https://supabase.com/docs) [Source](https://firebase.google.com/docs) [Source](https://appwrite.io/docs)

### 2.4 Hub の位置づけ

BaaS連携Hub は、全面的なベンダー差異吸収レイヤーではなく、**Adlaire Static CMS における BaaS 連携ルールブック作成のベース** であり、接続、状態、イベント、再生成、監査及び縮退運転の標準入口を定義する最小標準化層とする。

### 2.5 高度機能の扱い

他 BaaS の高度機能は、Adlaire BaaS 側で標準機能として取り込まれた後にのみ利用可能とする。標準化前の高度機能については、**個別実装拡張** 及び **Hub 外オプション連携** を認めない。[Source](https://supabase.com/docs) [Source](https://firebase.google.com/docs) [Source](https://appwrite.io/docs)

---

## 3. 現行 [Adlaire Static CMS](https://github.com/fqwink/Adlaire) 分析

### 3.1 プロダクトの性格

[Adlaire Static CMS](https://github.com/fqwink/Adlaire) は、PHP ベースのフラットファイル CMS であり、データベース不要、JSON ベースのデータ管理、管理 UI、REST API、Markdown / ブロック編集、多言語化、リビジョン管理、静的サイト生成を備える軽量 CMS である。小〜中規模の情報サイト、ドキュメントサイト、企業サイト及び静的配布前提のサイト運用に適しており、現時点でも CMS コアとして十分に成立している。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md) [Source](https://www.genspark.ai/api/files/s/lx50g8eb)

### 3.2 技術構成

実装の中核は PHP であり、UI 補強のために TypeScript / JavaScript / CSS を併用する。`index.php` がエントリポイント、`app.php` が制御中枢、`core.php` がフラットファイル保存、`api.php` が API 入口、`generator.php` が `dist/` への静的出力を担う。この構成は、BaaS と密結合しない前提での拡張に適している。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/index.php) [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/app.php) [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/core.php) [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/api.php) [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/generator.php)

### 3.3 現行機能の強み

ブロック編集、Markdown、管理 UI、REST API、多言語化、リビジョン管理、下書き / 公開、bcrypt 認証、CSRF、レートリミットなど、CMS として必要な中核機能は既に備わっている。軽量で依存関係が少なく、保守しやすいことが強みである。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)

### 3.4 今後の拡張余地

一方で、会員機能、柔軟な認証、業務データ、クラウドストレージ、リアルタイム連携、通知、外部ワークフロー、監査基盤といったアプリケーション基盤機能は外部化余地が大きい。この不足を補う戦略として BaaS 連携を採用することは、アップロード文書の元々の方向性とも一致している。[Source](https://www.genspark.ai/api/files/s/lx50g8eb) [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)

---

## 4. 基本設計原則

### 4.1 CMSコア保全原則

ページ本文、メタ情報、公開状態、テーマ、翻訳、リビジョン、管理 UI 及び静的生成は、Adlaire Static CMS のコア責務として保持する。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/core.php) [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/generator.php)

### 4.2 標準BaaS単一原則

標準 BaaS 連携先は Adlaire BaaS のみとし、製品標準、契約標準及び将来の高度機能編入基準は常に Adlaire BaaS を正とする。

### 4.3 Hub経由統一原則

CMS と各 BaaS の接続は、必ず BaaS連携Hub を経由する。CMS からの直接接続は標準方式として採用しない。

### 4.4 Hub直接契約原則

Adlaire Static CMS と BaaS の連携は、Hub の内部契約及び API 契約を直接利用する方針とする。

### 4.5 最小標準化原則

Hub は、接続、状態、イベント、再生成、監査及び縮退運転に限定した最小標準化層とし、BaaS 全機能の共通 API 化を目的としない。

### 4.6 高度機能段階編入原則

他 BaaS の高度機能は、Adlaire BaaS の機能標準へ取り込まれたもののみ解禁する。標準化前の先行解禁は認めない。

### 4.7 縮退運転原則

BaaS 障害時であっても、Adlaire Static CMS の静的公開及び基本管理は継続可能でなければならない。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/generator.php)

---

## 5. 連携アーキテクチャ方針

```text
[Adlaire Static CMS]
      │
      ▼
 [BaaS連携Hub]
      │
      ├─ [Adlaire BaaS]    ← 標準連携先
      ├─ [Supabase]        ← 個別採用
      ├─ [Firebase]        ← 個別採用
      └─ [Appwrite]        ← 個別採用
```

### 5.1 Adlaire Static CMS の責務

CMS 本体は、コンテンツ管理、設定管理、テーマ、翻訳、リビジョン及び静的生成を担う。`api.php` は外部連携入口として、`generate` を含む再生成接続点を提供する。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/api.php)

### 5.2 BaaS連携Hub の責務

Hub は、接続先登録、接続状態管理、認証連携入口、標準イベント受理、再生成トリガー入口、監査入口及び縮退運転判定を担う。Hub の詳細は、**Adlaire Static CMSのBaaS連携Hub** をベース文書として別途定義する。

### 5.3 Adlaire BaaS の責務

Adlaire BaaS は、会員認証、会員管理、業務データ、ストレージ、イベント、監査及び再生成連携基盤を担う。標準機能基準は **Adlaire_BaaS** に定義する。

---

## 6. データ責務分離

### 6.1 Adlaire Static CMS 側に残すデータ

- ページ本文
- ページメタ情報
- 公開状態
- リビジョン
- テーマ設定
- サイト基本設定
- メニュー設定
- 翻訳データ
- 静的生成状態

これらは CMS コアの本質であり、外部 BaaS へ移譲しない。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/core.php) [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/generator.php)

### 6.2 BaaS 側に置くデータ

- 会員アカウント
- 認証情報
- アプリ利用データ
- コメント、申請、問い合わせ
- 業務データ
- 通知履歴
- 分析イベント
- アップロードファイル参照
- リアルタイム状態
- メッセージ履歴

この分離により、CMS はコンテンツ管理に集中し、BaaS はアプリケーション基盤機能に集中できる。[Source](https://www.genspark.ai/api/files/s/lx50g8eb)

---

## 7. 認証・権限モデル方針

### 7.1 二層構造

管理者認証は、当面 Adlaire Static CMS の現行認証を維持する。エンドユーザー向け認証は BaaS 側で担う。これにより、CMS 管理運用の安定性と、将来の会員基盤拡張を両立する。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)

### 7.2 将来拡張

将来的には、管理者 SSO、外部 IdP、ロール分離、管理者と会員の境界整理を検討するが、初期段階で管理認証を全面置換しない。

---

## 8. 公開・生成・イベント連携方針

### 8.1 公開モデル

公開モデルは静的生成を主軸とし、生成物は `dist/` に出力する。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/generator.php)

### 8.2 再生成トリガー

再生成トリガー候補は、ページ公開、ページ更新、翻訳更新、メニュー変更、テーマ変更、BaaS 側承認完了、BaaS 側データ変更、ワークフロー完了等とする。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/api.php)

### 8.3 標準イベント

Hub が扱う標準イベントは、`user.created`、`user.updated`、`content.approval.completed`、`storage.asset.updated`、`workflow.completed`、`publish.requested`、`site.rebuild.requested` を基本集合とする。ベンダー固有イベントは Hub 内で標準イベントへ写像する。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/api.php)

---

## 9. 段階導入ロードマップ

### 9.1 フェーズ0: Adlaire Static CMS コア安定化

現行 API の整理、設定項目棚卸し、プラグイン拡張点整理、データ構造固定、ログ基礎整備を行い、BaaS 連携前提を明確化する。これはアップロード文書における元々のフェーズ0を引き継ぐ。[Source](https://www.genspark.ai/api/files/s/lx50g8eb)

### 9.2 フェーズ1: BaaS連携Hub 基本整備

BaaS連携Hub の責務、接続入口、状態取得、イベント契約、再生成契約、監査入口、縮退判定を定義し、Adlaire Static CMS における BaaS 連携ルールブック作成の土台を整える。

### 9.3 フェーズ2: Adlaire BaaS 標準機能整備

Adlaire BaaS の認証、会員、データ、ストレージ、イベント、監査、再生成連携の標準機能を整備し、標準連携先として成立させる。

### 9.4 フェーズ3: 個別採用BaaS の基準適合接続

[Supabase](https://supabase.com/docs)、[Firebase](https://firebase.google.com/docs)、[Appwrite](https://appwrite.io/docs) を、Hub 標準契約に適合する範囲で接続可能にする。ここでは標準化前の高度機能は解禁しない。[Source](https://supabase.com/docs) [Source](https://firebase.google.com/docs) [Source](https://appwrite.io/docs)

### 9.5 フェーズ4: 高度機能の段階編入

他 BaaS の機能から有用なものを選定し、Adlaire BaaS 側の標準機能として整理できたもののみ Hub 標準へ段階編入する。

### 9.6 フェーズ5: 運用基盤拡張

監査強化、接続管理強化、商用運用を見据えた管理導線整備、将来的なテナント運用基盤の検討を進める。

---

## 10. BaaS 別の役割指針

### 10.1 Adlaire BaaS

唯一の標準 BaaS 連携先として扱い、製品標準の基準源とする。

### 10.2 [Supabase](https://supabase.com/docs)

構造化データ、会員情報、業務データ、ストレージなどの観点で参考性が高いが、利用は Hub 標準契約へ適合する範囲に限る。[Source](https://supabase.com/docs)

### 10.3 [Firebase](https://firebase.google.com/docs)

認証、同期、モバイル親和性、イベント計測の観点で参考性が高いが、利用は Hub 標準契約へ適合する範囲に限る。[Source](https://firebase.google.com/docs)

### 10.4 [Appwrite](https://appwrite.io/docs)

Auth、Databases、Functions、Storage、Realtime など統合的な観点で参考性が高いが、利用は Hub 標準契約へ適合する範囲に限る。[Source](https://appwrite.io/docs)

### 10.5 [PocketBase](https://pocketbase.io/docs/)

公式対応対象には含めない。active development 中であり、v1.0.0 未満の後方互換保証が限定的なため、標準採用しない。[Source](https://pocketbase.io/docs/)

---

## 11. セキュリティ・運用方針

- BaaS 接続資格情報は CMS 本文や一般設定と分離して管理する。  
- CMS 管理権限、BaaS 接続設定権限、公開運用権限、監査閲覧権限は分離する。  
- BaaS 障害時は縮退運転へ移行し、公開サイトは静的出力を優先維持する。  
- 再生成失敗時は再試行可能な設計とする。[Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/generator.php)

---

## 12. リスクと対策

### 12.1 複雑化リスク

複数 BaaS の考慮により、接続、権限、イベントが複雑化する。対策として、CMS コアへ差異を持ち込まず、Hub に標準入口を集中させる。

### 12.2 標準逸脱リスク

案件単位の特例接続や Hub 外連携を認めると、Adlaire BaaS を標準とする方針が崩れる。これを防ぐため、標準化前の高度機能先行採用を禁止する。

### 12.3 コア焦点喪失リスク

BaaS 側議論が拡大しすぎると、Adlaire Static CMS 自体の価値が曖昧になる。常に CMS コア保全原則を優先する。

---

## 13. 評価指標

### 13.1 技術指標

- CMS 単体運用の安定性
- Hub 導入時のコア改修量
- 再生成成功率
- 接続障害時の復旧時間
- イベント処理遅延
- 監査ログ整備率

### 13.2 事業指標

- BaaS 連携導入案件数
- CMS 単体導入からの拡張採用率
- 接続設定完了率
- サポート工数
- 標準機能編入コスト

---

## 14. 最終方針

1. Adlaire Static CMS は CMS コアとして維持する。  
2. 標準 BaaS 連携先は Adlaire BaaS のみとする。  
3. すべての接続は Adlaire Static CMS の BaaS連携Hub を経由する。  
5. Hub は Adlaire Static CMS における BaaS 連携ルールブック作成のベースとする。  
6. Supabase、Firebase、Appwrite は個別採用を許容するが、Hub 標準契約への適合範囲に限る。  
7. 標準化前の高度機能先行解禁、Hub 外オプション連携、案件単位の特例実装は認めない。  
8. PocketBase は公式対応対象に含めない。  
9. 公開モデルは静的生成を主軸とし、BaaS 側イベントは `generate` を通じて再生成へ接続する。[Source](https://www.genspark.ai/api/files/s/lx50g8eb) [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/api.php)

---

## 参考資料

- [アップロード済み原文書](https://www.genspark.ai/api/files/s/lx50g8eb)
- [Adlaire GitHub Repository](https://github.com/fqwink/Adlaire)
- [Adlaire README](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)
- [Adlaire index.php](https://raw.githubusercontent.com/fqwink/Adlaire/main/index.php)
- [Adlaire app.php](https://raw.githubusercontent.com/fqwink/Adlaire/main/app.php)
- [Adlaire core.php](https://raw.githubusercontent.com/fqwink/Adlaire/main/core.php)
- [Adlaire api.php](https://raw.githubusercontent.com/fqwink/Adlaire/main/api.php)
- [Adlaire generator.php](https://raw.githubusercontent.com/fqwink/Adlaire/main/generator.php)
- [Supabase Documentation](https://supabase.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Appwrite Documentation](https://appwrite.io/docs)
- [PocketBase Documentation](https://pocketbase.io/docs/)
