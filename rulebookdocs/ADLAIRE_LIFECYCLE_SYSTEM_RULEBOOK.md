# Adlaire Lifecycle System RULEBOOK

- 文書名: Adlaire Lifecycle System RULEBOOK
- 文書バージョン: Ver.1.0-1
- 作成日: 2026-04-01
- 対象製品: Adlaire Platform (AP)
- 適用範囲: セットアップツール / アップデートシステム / Doctor / manifest / lock / state / report / 管理UI 連携
- 文書目的: Adlaire の Lifecycle System に関する上位原則・必須要件・禁止事項・設計拘束条件を Rulebook 形式で定義し、将来実装の判断基準を統一する。

---

## 1. 基本宣言

Adlaire Lifecycle System は、Adlaire の導入と更新を単一のライフサイクル基盤として統合するための正式規範である。

本 Rulebook において、Adlaire は以下を明示採用する。

1. セットアップツールとアップデートシステムを共通基盤で統合すること
2. 共通設計思想を Lifecycle System 全体に**全面的に採用**すること
3. Setup を初回適用、Update を再適用として扱うこと
4. 完全自動更新を採用しないこと
5. 本番ビルドを採用しないこと

本 Rulebook に反する設計、実装、運用は採用してはならない。

---

## 2. 製品前提

Adlaire は、軽量・安全・静的配信志向・小さく強いコアを中核価値とするフラットファイル CMS である。

したがって Lifecycle System も、以下の製品前提を維持しなければならない。

- 共有サーバーでも現実的に運用できること
- 本番環境に Node.js ビルドを持ち込まないこと
- 複雑性より整合性を優先すること
- 利便性より壊れにくさを優先すること
- UI を持っていても内部は検証駆動であること

---

## 3. 共通設計思想の全面採用

### 3.1 正式方針

Adlaire は、Lifecycle System を構成するすべての要素に対して、**共通設計思想を全面的に採用する**。

この方針は推奨事項ではなく、正式な採用方針である。

### 3.2 全面採用の意味

共通設計思想の全面採用とは、以下を意味する。

- Setup / Update / Doctor / 管理UI / 状態管理 / レポート / lock / manifest が同一原則に従う
- 個別都合による例外実装を原則禁止する
- 新機能追加時も共通設計思想への適合を必須条件とする
- UI 側の都合で安全原則を弱めない
- 運用簡略化を理由に完全自動更新へ逸脱しない

### 3.3 共通設計思想の構成原則

#### 原則1: 安全性優先
Lifecycle System は利便性より安全性を優先しなければならない。

#### 原則2: 検証駆動
manifest、要件、整合性、状態確認を通過しない限り実処理を開始してはならない。

#### 原則3: 明示開始
Setup および Update は、管理者の明示操作によってのみ開始されなければならない。

#### 原則4: 本番ビルド禁止
本番環境でのビルド、コンパイル、依存解決を前提にしてはならない。

#### 原則5: 状態可視化
診断結果、進捗、完了、失敗、rollback 状態を追跡可能にしなければならない。

#### 原則6: 責務分離
共通化は基盤レベルで行い、Setup と Update のフロー責務を混同してはならない。

#### 原則7: 現実運用適合
共有サーバーや簡易ホスティングでも成立する運用モデルを維持しなければならない。

---

## 4. Lifecycle System の定義

Lifecycle System は、Adlaire の配布成果物を対象に、導入・更新・状態管理・保護・記録を統一的に制御する仕組みである。

### 4.1 Setup の定義

Setup とは、初回適用である。以下を含む。

- 環境診断
- 初期設定入力
- 初期管理者作成
- 必要ファイル生成
- install.lock 作成
- setup report 出力

### 4.2 Update の定義

Update とは、再適用である。以下を含む。

- manifest 検証
- 環境診断
- backup
- apply
- migration
- rollback
- update report 出力

### 4.3 非対象

以下は Lifecycle System の対象外とする。

- 完全自動更新
- 無人インストール
- 本番 Node.js ビルド
- Git pull 前提更新
- プラグインマーケット型配布システム
- OS パッケージ管理統合

---

## 5. 必須アーキテクチャ

Lifecycle System は、少なくとも以下の共通基盤を持たなければならない。

- ManifestVerifier
- EnvironmentChecker
- LockManager
- StateStore
- ReportWriter
- SecurityGuard
- PathPolicy
- StepRunner

### 5.1 SetupFlow

SetupFlow は少なくとも以下を持たなければならない。

- InitialConfigStep
- AdminCreateStep
- DataBootstrapStep
- InstallFinalizeStep

### 5.2 UpdateFlow

UpdateFlow は少なくとも以下を持たなければならない。

- BackupStep
- ApplyStep
- MigrationStep
- UpdateFinalizeStep
- RollbackStep

### 5.3 設計拘束

- UI ロジックと実処理ロジックを混在させてはならない
- Controller と Core を分離しなければならない
- migration は独立責務として扱わなければならない
- setup 専用処理と update 専用処理を混線させてはならない

---

## 6. manifest 規則

Lifecycle System は manifest を単一の信頼源として扱わなければならない。

### 6.1 必須項目

manifest は少なくとも以下を含まなければならない。

- product
- version
- build
- channel
- requirements
- files
- preserve
- migrations

### 6.2 検証規則

- manifest が存在しない場合は実行してはならない
- required file が不足する場合は実行してはならない
- checksum 不一致の場合は実行してはならない
- PHP 要件未達の場合は実行してはならない

### 6.3 preserve 規則

- ユーザーコンテンツと運用データは preserve ルールで保護しなければならない
- preserve の判断を曖昧に実装してはならない

---

## 7. lock 規則

Lifecycle System は lock 制御を必須としなければならない。

### 7.1 install.lock

- Setup 完了後は install.lock を生成しなければならない
- install.lock が存在する場合、再実行してはならない

### 7.2 maintenance.lock

- Update 開始時は maintenance.lock を取得しなければならない
- Update 中の二重実行を許可してはならない
- 異常終了時に復旧導線を提供しなければならない

---

## 8. state 規則

Lifecycle System は状態記録を共通化しなければならない。

最低限、以下を保持しなければならない。

- 現在 version / build
- 最終 setup 実行結果
- 最終 update 実行結果
- 最終成功日時
- 最終失敗日時
- 実行中状態
- report 参照情報

状態記録を行わない実装は採用してはならない。

---

## 9. Setup 規則

### 9.1 必須条件

- Setup はウィザード形式で段階的に進行できなければならない
- 管理者アカウントは初回導入時に安全に作成されなければならない
- 初期パスワード固定値を採用してはならない
- 弱いパスワードを無条件で許可してはならない
- setup report を出力しなければならない

### 9.2 禁止事項

- 平文パスワード保存
- install.lock 無しの完了判定
- 完了後の再実行許可
- 秘密情報の画面表示やログ出力

---

## 10. Update 規則

### 10.1 正式採用方針

Adlaire の Update は、以下の二層構造を正式採用とする。

- 内部基盤: 検証付き手動アップデート
- 利用者向け方式: 管理UI起動の半自動アップデート

### 10.2 必須条件

- Update は必ず管理者の明示操作で開始しなければならない
- Update 前に preflight を通過しなければならない
- Update 前に backup を取得しなければならない
- migration が必要な場合は明示的に実行しなければならない
- 失敗時は rollback 導線を持たなければならない
- update report を出力しなければならない

### 10.3 明示的禁止事項

以下を明示的に禁止する。

- **完全自動更新**
- 管理者承認なしの自動取得・自動適用
- backup を伴わない更新
- manifest を伴わない更新
- rollback 不可能な更新
- 本番ビルドを伴う更新

### 10.4 完全自動更新禁止の拘束力

完全自動更新の不採用は、将来検討事項ではなく正式方針である。利便性、競合比較、運用簡略化を理由としてこの方針を覆してはならない。

---

## 11. 管理UI 規則

### 11.1 Setup UI

- 診断結果を表示しなければならない
- 入力項目の妥当性を検証しなければならない
- 完了後の次の行動を案内しなければならない

### 11.2 Update UI

- 現在 version と更新候補を表示しなければならない
- channel を表示しなければならない
- 実行前確認を必須にしなければならない
- 実行結果を表示しなければならない

### 11.3 UI 原則

- UI は安全原則を弱めるために使ってはならない
- 危険操作には確認を必須としなければならない
- エラーは行動可能な形で提示しなければならない

---

## 12. セキュリティ規則

Lifecycle System は、少なくとも以下を満たさなければならない。

- 管理者認証
- CSRF 保護
- lock 制御
- ログの秘匿情報抑制
- manifest 不在時停止
- 二重実行防止
- install 後の再実行防止

以下を出力してはならない。

- 内部サーバーパス詳細
- 平文資格情報
- 秘密設定値
- 不要なスタックトレース全文

---

## 13. レポート規則

Lifecycle System は、setup / update / rollback / diagnostics に関する report を共通形式で保存しなければならない。

最低限の記録項目:

- 実行種別
- 開始日時 / 終了日時
- 実行者
- version / build
- channel
- 診断結果
- 成否
- エラーコード
- report ID

---

## 14. チャネル規則

- channel は `stable` と `preview` を基本とする
- 一般利用は stable を既定とする
- preview は検証目的とする
- major 更新時は追加警告を表示しなければならない
- channel は自動更新の根拠に使ってはならない

---

## 15. 非機能規則

### 15.1 保守性
- 共通基盤の再利用を優先しなければならない
- 重複実装を増やしてはならない

### 15.2 可搬性
- 共有サーバー前提で成立しなければならない
- ランタイムに Node.js を要求してはならない

### 15.3 可観測性
- 状態遷移が追跡できなければならない
- 失敗理由が report に残らなければならない

### 15.4 拡張性
以下は将来拡張として許可される。

- doctor 強化
- デジタル署名検証
- CLI モード
- 差分適用
- スナップショット切替

ただし、これらの拡張も本 Rulebook に従わなければならない。

---

## 16. 受け入れ規則

以下を満たさない実装は Lifecycle System 準拠とみなしてはならない。

1. Setup と Update が共通設計思想に従っていること
2. 共通基盤モジュールが存在すること
3. Setup が安全に完了できること
4. Update が backup と rollback を備えること
5. 管理UI から半自動的に起動できること
6. 完全自動更新が存在しないこと
7. 状態記録と report 出力があること

---

## 17. README / 仕様書転記用正式文言

> Adlaire のセットアップツールとアップデートシステムは、共通の検証基盤・環境診断・状態管理・ロック制御に基づく Lifecycle System として設計される。共通設計思想は Lifecycle System 全体に対して全面的に採用され、Setup は初回適用、Update は再適用として扱う。更新方式は「内部は検証付き手動アップデート、外部は管理UI起動の半自動アップデート」を正式採用し、完全自動更新および無人インストールは採用しない。

---

## 18. 実装順序規則

推奨実装順序は以下とする。

1. 共通基盤整備
2. セットアップツール改良
3. 更新コア実装
4. 管理UI 統合
5. チャネル / doctor 強化

UI を先行させ、基盤を後回しにしてはならない。

---

## 19. 最終規範

Adlaire Lifecycle System は、単なる機能集合ではなく、製品原則を導入と更新に貫通させるための規範である。

したがって、将来の設計・実装・レビューでは、以下を常に最終判断基準とする。

- 共通設計思想に適合しているか
- 安全性を損なっていないか
- 完全自動更新へ逸脱していないか
- 小さく強いコアを守れているか
- 共有サーバー現実主義を維持しているか

これらを満たさない提案は採用してはならない。

---

## 20. 参考資料

- Adlaire Repository: https://github.com/fqwink/Adlaire
- README: https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md
- Bundle Installer Spec: https://raw.githubusercontent.com/fqwink/Adlaire/main/rulebookdocs/BUNDLE_INSTALLER_SPEC.md
- RULEBOOK Ver1: https://raw.githubusercontent.com/fqwink/Adlaire/main/rulebookdocs/RULEBOOK_Ver1.md
- RULEBOOK Ver2: https://raw.githubusercontent.com/fqwink/Adlaire/main/rulebookdocs/RULEBOOK_Ver2.md
- CHANGES: https://raw.githubusercontent.com/fqwink/Adlaire/main/docs/CHANGES.md
- RELEASE NOTES: https://raw.githubusercontent.com/fqwink/Adlaire/main/docs/RELEASENOTES.md

---

推奨保存ファイル名:

`adlaire_lifecycle_system_rulebook_2026-04-01.md`
