# Adlaire Release Plan RULEBOOK

- 文書名: Adlaire Release Plan RULEBOOK
- 文書バージョン: Ver.3.0
- 作成日: 2026-04-02
- 対象製品: Adlaire Static CMS
- 文書種別: リリース計画・リリース履歴を管理する規範文書
- 文書目的: Adlaire の全バージョンのリリース計画と履歴を一元管理する

---

## 1. 基本宣言

本 RULEBOOK は、Adlaire Static CMS のリリース計画と履歴に関する規範文書である。
リリースの詳細な変更履歴は `docs/CHANGES.md` を参照。

---

## 2. 現行バージョン

**Ver.3.0-47**（2026-04-05）

---

## 3. リリース履歴

### 3.0 Ver.3.0 系（実装済みリリース）

#### Ver.3.0 — 基盤刷新（破壊的変更）

3.0系初回リリース。Deno ビルドランタイム移行、ES モジュール化、
CI/CD 全自動リリース、APIキー認証必須化、ライセンスサーバー新設。
バグ修正: 全5回実施（PHP 102件 + TS 109件 = 計211件）。
詳細は §5.1 を参照。

### 3.1 Ver.2.x 系（実装済みリリース）

#### Ver.2.9 — マスター管理者アクセス権限 + 最終品質確定（M1-M10 + 448件）

2.0系最終品質確定リリース。マスター管理者ユーザーモデル導入
（メインmaster 1名 + サブmaster 最大2名、3要素認証73文字hex）。
品質確定バグ修正: 初期88件 + 追加360件 = 448件
（PHP 303件 + TS 145件、致命的18件+重大76件+中程度123件+軽微231件）。
詳細は §4.1 を参照。

#### Ver.2.8 — バグ修正（300件精査・300件実装）

全コード超深層精査300件（PHP 200件 + TS 100件）。致命的3件、重大66件、
中程度118件、軽微113件。セキュリティ、データ整合性、エラーハンドリング、
パフォーマンス、コード品質、型安全性を網羅的に改善。
詳細は §4.2 を参照。

#### Ver.2.7 — 機能拡張・管理UI強化（14件 + バグ修正10件）

管理UI強化・品質改善リリース。ページプレビュー、並び順D&D、バルク操作、
ページ検索、公開前チェック、リビジョン差分、CSP nonce、サイドバーエディタ、
theme.json、軽量CSS、翻訳拡充、エクスポートリビジョン、生成レポートを実装。
詳細は §4.3 を参照。

#### Ver.2.6 — バグ修正（70件精査・70件実装）

Ver.2.5 エディタ高度化後の全コード精査70件（PHP 45件 + TS 25件）。
セキュリティ25件、データ整合性8件、エラーハンドリング10件、ロジック8件、
パフォーマンス6件、コード品質5件、その他8件。12件は既に実装済みで確認のみ。
詳細は §4.4 を参照。

#### Ver.2.5 — エディタ高度化（6件実装）

EDITOR_RULEBOOK.md §13 に基づくエディタ高度化リリース。
#25 Undo/Redo、#26 Drag&Drop、#27 Copy&Paste、#28 heading レベルサイクル、
#29 list トグル、#46 document.execCommand 置換を実装。
詳細は §4.5 を参照。

#### Ver.2.4 — バグ修正（50件精査・49件実装・1件延期）

Ver.2.3 アーキテクチャ刷新後の全コード精査50件（PHP 30件 + TS/フロント 20件）。
致命的バグ3件、セキュリティ19件、データ整合性・エラーハンドリング等を修正。
#46（document.execCommand 非推奨）は Ver.2.5 に延期。
詳細は §4.6 を参照。

#### Ver.2.3 — アーキテクチャ刷新（機能ベース分離）

| # | 改良点 | 状態 |
|---|--------|:----:|
| 8 | admin.php を機能ベース5ファイルに分離 | **実装済** |
| 9 | ルーティングクラスの導入（Router） | **不採用** |
| 10 | FileStorage をインターフェース化（StorageInterface） | **不採用** |
| 11 | 設定クラスの導入（Config） | **不採用** |
| 12 | イベントフック基盤の刷新（EventDispatcher） | **不採用** |

#### Ver.2.2 — セキュリティ・パフォーマンス

| # | 改良点 | 状態 |
|---|--------|:----:|
| 3 | ページインデックスキャッシュ（pages.index.json） | **実装済** |
| 4 | 静的生成の差分ビルド（変更ページのみ再生成） | **実装済** |
| 5 | Content-Security-Policy ヘッダー | **実装済** |
| 6 | セッション有効期限（自動ログアウト） | **実装済** |
| 7 | パスワード強度検証 | **実装済** |

#### Ver.2.1 — バグ修正（25件）

セキュリティ10件、データ整合性8件、コード品質7件。詳細は `docs/CHANGES.md` を参照。

#### Ver.2.0 — セットアップツール・アップデートシステム

| # | 新機能 | 状態 |
|---|--------|:----:|
| 1 | セットアップツール（`bundle-installer.php`） | **実装済** |
| 2 | アップデートシステム（バージョン情報 API + 管理 UI 表示） | **実装済** |

### 3.2 Ver.1.x 系（凍結 — Ver.1.9-30 完了）

#### Ver.1.9 — 1.0系最終版（バグ修正38件）

バグ修正38件（Ver.1.9-29 で32件 + Ver.1.9-30 で6件）を実施し、1.0系の品質を確定。
詳細は `docs/CHANGES.md` を参照。

#### Ver.1.8 — 機能拡張・フロントエンド強化

| # | カテゴリ | 改良点 | 状態 |
|---|---------|--------|:----:|
| 16 | 新機能 | ページ並び順のドラッグ&ドロップ管理 | Ver.2.7 延期 |
| 17 | 新機能 | 管理 UI ダークモード対応 | 実装済 |
| 18 | 新機能 | ページプレビュー機能（下書きを公開レイアウトで確認） | Ver.2.7 延期 |
| 19 | 新機能 | サイドバー（subside）もブロックエディタで編集 | Ver.2.7 延期 |
| 20 | 新機能 | 静的生成で Markdown をサーバーサイド HTML 変換 | 実装済 |
| 21 | エディタ | ブロックのコピー＆ペースト（Ctrl+C/V） | Ver.2.5 延期 |
| 22 | エディタ | Undo/Redo 機能（Ctrl+Z/Y） | Ver.2.5 延期 |
| 23 | エディタ | ブロックのドラッグ&ドロップ並び替え | Ver.2.5 延期 |
| 24 | エディタ | heading ブロックのレベル変更 UI（h1/h2/h3 切替） | 実装済 |
| 25 | エディタ | list ブロックの順序/非順序切替 UI | 実装済 |
| 26 | フロント | 公開ページから管理用 JS を除外 | 実装済 |
| 27 | フロント | 静的サイト用軽量 CSS（エディタ CSS 除外） | Ver.2.7 延期 |
| 28 | データ | エクスポートにリビジョンを含むオプション | Ver.2.7 延期 |
| 29 | i18n | 管理 UI ラベル（Dashboard, Pages, Edit 等）の翻訳対応 | 実装済 |
| 30 | ドキュメント | RULEBOOK を Ver.1.7/1.8 の実装結果で更新 | 実装済 |

#### Ver.1.7 — 品質・安全性・管理UI強化

| # | カテゴリ | 改良点 | 状態 |
|---|---------|--------|:----:|
| 1 | バグ | ステータス保存ロジック修正（二重 API 呼び出し解消） | 実装済 |
| 2 | バグ | 「View Site」リンクの言語判定を `$app->language` ベースに変更 | 実装済 |
| 3 | バグ | `renderAdminNewPage` の不要な `csrf_token()` 呼び出し削除 | 実装済 |
| 4 | バグ | 静的生成のメニューリンクを正しい相対パスに修正 | 実装済 |
| 5 | バグ | `renderBlocksToHtml` の heading タグ計算を簡素化 | 実装済 |
| 6 | バグ | 管理 UI settings の CSRF ワンタイム問題を修正（トークン更新） | 実装済 |
| 7 | セキュリティ | ブロックデータの data 属性出力を安全なエンコーディングに変更 | 実装済 |
| 8 | 管理UI | ダッシュボードにページ削除ボタン追加 | 実装済 |
| 9 | 管理UI | ページ一覧のソート機能（更新日順） | 実装済 |
| 10 | 管理UI | インポート UI 追加（ファイルアップロード） | 実装済 |
| 11 | 管理UI | 設定フォームの保存フィードバック表示 | 実装済 |
| 12 | 管理UI | admin CSS を外部ファイルに分離 | 実装済 |
| 13 | コード品質 | `handleEdit` と `apiPageSave` の重複ロジック統一 | 実装済 |
| 14 | コード品質 | admin.php から不要な `settings()` メソッド削除 | 実装済 |
| 15 | コード品質 | `listPages()` にページインデックスキャッシュ導入 | Ver.2.2 延期→実装済 |

---

## 4. リリース計画（Ver.2.4 以降）

### 4.1 Ver.2.9 — マスター管理者アクセス権限 + 最終品質確定（50件以上精査）

> 2.0 系最終品質確定リリース。
> マスター管理者ユーザーモデル導入 + 全コード品質確定バグ修正。
> PHP 63件（精査済・実装済） + TS 60件（致命的8件+重大12件+中程度40件）= 123件精査。

#### マスター管理者アクセス権限

| # | カテゴリ | 改良点 | 状態 |
|---|---------|--------|:----:|
| M1 | 認証 | ユーザーモデル刷新: 単一管理者→マスター管理者（最大3名） | **実装済** |
| M2 | データ | data/system/users.json 新設（ユーザー名/bcryptハッシュ/role:master/is_main/作成日/最終ログイン） | **実装済** |
| M3 | マイグレーション | config.json:password → users.json 強制移行（is_main=true付与） | **実装済** |
| M4 | 認証 | ログイン画面にユーザー名+トークン入力フィールド追加 | **実装済** |
| M5 | セッション | $_SESSION にユーザー名・ロール・is_main情報追加 | **実装済** |
| M6 | 管理UI | ユーザー管理画面（サブmaster生成/無効化/削除/パスワード変更） | **実装済** |
| M7 | API | ?api=users エンドポイント（generate/disable/password/delete、メインmaster認証必須） | **実装済** |
| M8 | セキュリティ | users.json ファイル権限 0600 + 排他ロック + アトミック書き込み + symlink検出 | **実装済** |
| M9 | bundle-installer | セットアップツールで初期マスター管理者ユーザー作成（is_main=true、users.json直接生成） | **実装済** |
| M10 | 管理UI | ログイン状態表示にユーザー名表示 + ナビにUsersメニュー（メインmasterのみ） | **実装済** |

#### PHP品質確定バグ修正（63件精査・63件実装）

| # | カテゴリ | 対象 | バグ概要 | 状態 |
|---|---------|------|---------|:----:|
| 1 | エラーハンドリング | core.php | ensureDirectories() mkdir()戻り値未チェック | **実装済** |
| 2 | セキュリティ | core.php | readPageData() lockedReadにrealPath未使用 | **実装済** |
| 3 | エラーハンドリング | core.php | writeConfig() json_encode()がfalseを返す可能性 | **実装済** |
| 4 | エラーハンドリング | core.php | writePage() json_encode()がfalseを返す可能性 | **実装済** |
| 5 | エラーハンドリング | core.php | updatePageStatus() json_encode()がfalseを返す可能性 | **実装済** |
| 6 | セキュリティ | core.php | deletePage() symlink検出なし | **実装済** |
| 7 | セキュリティ | core.php | getRevisionData() symlink検出なし | **実装済** |
| 8 | セキュリティ | core.php | restoreRevision() symlink検出なし | **実装済** |
| 9 | データ整合性 | core.php | savePageOrder() slugバリデーションなし | **実装済** |
| 10 | セキュリティ | core.php | listRevisions() ディレクトリsymlink検出なし | **実装済** |
| 11 | セキュリティ | core.php | deleteUser() メインmaster削除防止なし | **実装済** |
| 12 | セキュリティ | core.php | usersFileExists() symlink検出なし | **実装済** |
| 13 | セキュリティ | core.php | readUsers() symlink検出なし | **実装済** |
| 14 | セキュリティ | app.php | getSlug() 特殊文字除去不足 | **実装済** |
| 15 | セッション | app.php | handleAuth() session timeout last_activity型チェック不足 | **実装済** |
| 16 | セキュリティ | app.php | logout処理でセッション変数クリア不足 | **実装済** |
| 17 | エラーハンドリング | core.php | readPageData() JSON parseエラーログ欠如 | **実装済** |
| 18 | セキュリティ | app.php | login() サブmasterのenabled=false検出なし | **実装済** |
| 19 | セキュリティ | app.php | login() サブmasterのトークン認証未実装 | **実装済** |
| 20 | 型安全性 | app.php | editTags() hooks配列の型チェック不足 | **実装済** |
| 21 | 型安全性 | app.php | menu() config['menu']の型チェック不足 | **実装済** |
| 22 | セキュリティ | app.php | handleAuth() サブmaster enabled=false即ログアウト | **実装済** |
| 23 | データ整合性 | api.php | handleApiSitemap() updated_at長さ検証なし | **実装済** |
| 24 | セキュリティ | api.php | handleApiExport() session key除去追加 | **実装済** |
| 25 | セキュリティ | api.php | handleApiVersion() install.lock symlink検出なし | **実装済** |
| 26 | 型安全性 | api.php | apiRevisionDiff() blocks配列型チェック不足 | **実装済** |
| 27 | セキュリティ | api.php | verifyApiAuth() disabled user検出なし | **実装済** |
| 28 | セキュリティ | api.php | handleApiUsers() メインmaster認証必須化 | **実装済** |
| 29 | セキュリティ | api.php | handleApiUsers() generate: サブmaster生成機能追加 | **実装済** |
| 30 | セキュリティ | api.php | handleApiUsers() disable: サブmaster無効化機能追加 | **実装済** |
| 31 | セキュリティ | api.php | handleApiUsers() password: メインmasterパスワード変更 | **実装済** |
| 32 | セキュリティ | api.php | handleApiUsers() DELETE: メインmaster削除防止 | **実装済** |
| 33 | 型安全性 | helpers.php | login_rate_check() attempts配列要素の型チェック不足 | **実装済** |
| 34 | 型安全性 | helpers.php | csrf_verify() token/sessionの型チェック不足 | **実装済** |
| 35 | 型安全性 | renderer.php | renderBlocksToHtml() list items配列型チェック不足 | **実装済** |
| 36 | エラーハンドリング | generator.php | dist clean時getRealPath()がfalseを返す可能性 | **実装済** |
| 37 | データ整合性 | generator.php | generatePageHtml() sidebar blocks未レンダリング | **実装済** |
| 38 | エラーハンドリング | generator.php | cssDir mkdir()戻り値未チェック | **実装済** |
| 39 | エラーハンドリング | generator.php | jsDst mkdir()戻り値未チェック | **実装済** |
| 40 | エラーハンドリング | generator.php | langDst mkdir()戻り値未チェック | **実装済** |
| 41 | セキュリティ | bundle-installer.php | admin_username空文字列時のバリデーション不備 | **実装済** |
| 42 | データ整合性 | bundle-installer.php | ユーザー名最小長2文字制約追加 | **実装済** |
| 43 | セキュリティ | bundle-installer.php | is_main=trueフラグ付与 | **実装済** |
| 44 | セキュリティ | index.php | preview slug double decode簡素化 | **実装済** |
| 45 | セキュリティ | admin-ui.php | VERSION file symlink検出なし | **実装済** |
| 46 | セキュリティ | admin-ui.php | install.lock symlink検出なし | **実装済** |
| 47 | 型安全性 | admin-ui.php | theme.json version nullチェック不備 | **実装済** |
| 48 | ロジック | admin-ui.php | sortPagesByUpdated() 変数名$ta/$tbと$a/$bの不一致 | **実装済** |
| 49 | セキュリティ | admin-ui.php | renderAdminUsers() メインmaster権限チェック追加 | **実装済** |
| 50 | セキュリティ | admin-ui.php | renderAdminUsers() サブmaster生成UI追加 | **実装済** |
| 51 | セキュリティ | admin-ui.php | renderAdminUsers() サブmaster無効化UI追加 | **実装済** |
| 52 | セキュリティ | admin-ui.php | renderAdminUsers() メインmaster自己削除ボタン非表示 | **実装済** |
| 53 | エラーハンドリング | core.php | removeConfigKey() json_encode失敗ログ | **実装済** |
| 54 | コード品質 | core.php | atomicWrite() 冗長なumask()呼び出し除去 | **実装済** |
| 55 | エラーハンドリング | core.php | atomicWrite() mkdir失敗時のエラーハンドリング | **実装済** |
| 56 | セキュリティ | app.php | loadLanguage() basename()によるパストラバーサル防止 | **実装済** |
| 57 | セキュリティ | admin-ui.php | Users navメインmasterのみ表示 | **実装済** |
| 58 | データ整合性 | core.php | listUsers() is_main/enabled/created_by情報追加 | **実装済** |
| 59 | セキュリティ | core.php | generateSubMasterCredentials() 73文字hex生成 | **実装済** |
| 60 | セキュリティ | core.php | disableUser() メインmaster無効化防止 | **実装済** |
| 61 | i18n | ja.json/en.json | サブmaster関連翻訳キー6件追加 | **実装済** |
| 62 | セッション | app.php | login() is_mainセッション変数設定 | **実装済** |
| 63 | セキュリティ | app.php | login() サブmasterパスワード変更禁止 | **実装済** |

#### 追加品質確定（360件精査: PHP240件+TS120件）

> 2.0系最終品質確定として全コード超深層精査360件。
> 致命的13件+重大44件+中程度72件=129件を最優先実装。軽微231件も実装。

| 区分 | PHP | TS | 合計 | 状態 |
|:----:|:---:|:--:|:----:|:----:|
| 致命的 | 5 | 8 | 13 | PHP計画 / TS**実装済** |
| 重大 | 32 | 12 | 44 | PHP計画 / TS**実装済** |
| 中程度 | 32 | 40 | 72 | PHP計画 / TS**実装済** |
| 軽微 | 171 | 60 | 231 | PHP計画 / TS**実装済** |
| **合計** | **240** | **120** | **360** | TS120件全件**実装済** |

主な致命的・重大項目:
- PHP#5: index.php 404後のexit確保
- PHP#25: core.php メモリ超過時listPages()空配列返却修正
- PHP#26: core.php キャッシュmtime同一秒問題
- PHP#28: core.php lockedRead() false vs '' 判別
- PHP#76: generator.php dist削除時.build_state.json保持
- PHP#42/173: renderer.php image // スキーム許可、プロトコル相対URL攻撃
- PHP#44/47: renderer.php paragraph/heading/link エスケープ不足
- PHP#84/154: generator.php contentHTML/menu raw出力XSS
- PHP#86/100/165: admin-ui.php isMainMaster()チェック不足
- PHP#58: api.php CORS subdomain bypass
- PHP#207/213: api.php $_POST汚染対策、importメモリ制限
- TS#1: editInplace.ts downloadCredentials() XSS
- TS#2/8: editor.ts surroundContents失敗後のHTML復元/サニタイズ
- TS#3/7: editInplace.ts beforeunload sendBeacon CSRFトークン問題
- TS#6: editor.ts 複数エディタでのInlineToolbar競合

##### TS側品質確定バグ修正（60件精査・60件実装）

| # | 深刻度 | 対象 | バグ概要 | 状態 |
|---|:------:|------|---------|:----:|
| 1 | 致命的 | editInplace.ts | downloadCredentials() XSS対策（escHtml+ファイル名��ニタイズ） | **実装済** |
| 2 | 致命的 | editor.ts | surroundContents失敗後HTML復元ロジック修正 | **実装済** |
| 3 | 致命的 | editInplace.ts | beforeunload sendBeacon CSRF Token（_lastValidCsrfTokenキャッシュ） | **実装済** |
| 4 | 致命的 | editor.ts | isConnected失敗時Observer/Interval残存修正 | **実装済** |
| 5 | 致命的 | markdown.ts | footnote IDダブルエスケープ修正 | **実装済** |
| 6 | 致命的 | editor.ts | 複数エディタ静的inlineToolbar参照競合修正 | **実装済** |
| 7 | 致命的 | editInplace.ts | beforeunload sendBeaconトークン問題（XHRフォールバック） | **実装済** |
| 8 | 致命的 | editor.ts | surroundContents失敗後サニタイズ未実施修正 | **実装済** |
| 9 | 重大 | editInplace.ts | 複数エディタactiveEditor競合（focusin更新） | **実装済** |
| 10 | 重大 | editor.ts | list初期化items��列バリデーション不足 | **実装済** |
| 11 | 重大 | editInplace.ts | flushSave大規模content上限チェック | **実装済** |
| 12 | 重大 | editInplace.ts | sidebar flushSaving競合防止フラグ | **実装済** |
| 13 | 重大 | editor.ts | heading形式切替innerHTML保持+サニタイズ | **実装済** |
| 14 | 重大 | editor.ts | ブロック削除DOM接続確認 | **実装済** |
| 15 | 重大 | editInplace.ts | switchFormat失敗ロールバック+reload重複防止 | **実装済** |
| 16 | 重大 | editInplace.ts | sendBeacon失敗XHR同期フォールバック | **実装済** |
| 17 | 重大 | editor.ts | removeBlock削除前undo状態保存 | **実装済** |
| 18 | 重大 | editInplace.ts | sendBeaconリトライXHR同期フォールバック | **実装済** |
| 19 | 重大 | editor.ts | ツールボック��Escape閉じ+キーボー���対応 | **実装済** |
| 20 | 重大 | editor.ts | focusout重複防止デバウンスタイマー | **実装済** |
| 21 | 中程度 | editor.ts | UndoManager連続pushデバウンス+clear() | **実装済** |
| 22 | 中程度 | i18n.ts | パラメータnullフォールバック+has()追加 | **実装済** |
| 23 | 中程度 | editor.ts | InlineToolbar位置計算改善 | **実装済** |
| 24 | 中程度 | editInplace.ts | D&D dragRow tbody存在確認 | **実装済** |
| 25 | 中程度 | markdown.ts | タスクリスト行頭スペース許容 | **実装済** |
| 26 | 中程度 | editInplace.ts | saveTimer null代入明確化 | **実装済** |
| 27 | 中程度 | editor.ts | insertBlock未知typeチェック | **実装済** |
| 28 | 中程度 | markdown.ts | 脚注参照escAttrダブルエスケープ防止 | **実装済** |
| 29 | 中程度 | editInplace.ts | エディタフォーカス時activeEditor更新 | **実装済** |
| 30 | 中程度 | editInplace.ts | save()失敗時UI通知 | **実装済** |
| 31 | 中程度 | editor.ts | リスト重複リスナー��止 | **実装済** |
| 32 | 中程度 | api.ts | disableUser/deleteUser入力��証 | **実装済** |
| 33 | 中程度 | editInplace.ts/api.ts | パスワード最小長+同一チェック | **実装済** |
| 34 | 中程度 | markdown.ts | image/link正規表現改善+タイトル属性 | **実装済** |
| 35 | 中程度 | editor.ts | renderBlocks空data安全処理 | **実装済** |
| 36 | 中程度 | editor.ts | wrapWithLink選択範囲検証+プロトコル拒否 | **実装済** |
| 37 | 中程度 | editInplace.ts | ページ検索デバウンス | **実装済** |
| 38 | 中程度 | editor.ts | リスト入力空li→paragraph変換+Backspace | **実装済** |
| 39 | 中程度 | markdown.ts | テーブルセル数正規化 | **実装済** |
| 40 | 中程度 | editInplace.ts | revokeObjectURL遅延実行 | **実装済** |
| 41 | 中程度 | editInplace.ts | showWarnings isConnected確認 | **実装済** |
| 42 | 中程度 | editor.ts | リストトグルlistEl DOM未接続再取得 | **実装済** |
| 43 | 中程度 | editInplace.ts | switchFormat newFormat入力検証 | **実装済** |
| 44 | 中程度 | markdown.ts | コードブロック&lt;p&gt;ラップ除去+空言語安全処理 | **実装済** |
| 45 | 中程度 | editor.ts | InlineToolbar scrollX/scrollY考慮 | **実装済** |
| 46 | 中程度 | editInplace.ts | ユーザー削除ボタン無効化 | **実装済** |
| 47 | 中程度 | editor.ts | Tab Shift+Tabインデント解除 | **実装済** |
| 48 | 中程度 | editInplace.ts | timestampバリデーション | **実装済** |
| 49 | 中程度 | editor.ts | Undo/Redo dirty/clear | **実装済** |
| 50 | 中程度 | editor.ts | paragraph paste sanitizeHtml | **実装済** |
| 51 | 中程度 | editor.ts | コードブロック言語タグdata-language保持 | **実装済** |
| 52 | 中程度 | editor.ts | undo/redo focus保持 | **実装済** |
| 53 | 中程度 | editInplace.ts | allChecked判定最適化 | **実装済** |
| 54 | 中程度 | markdown.ts | テーブルalignment配列超過防止 | **実装済** |
| 55 | 中程度 | markdown.ts | 脚注複数行対応 | **実装済** |
| 56 | 中程度 | editInplace.ts | refreshUserList競合防止 | **実装済** |
| 57 | 中程度 | editInplace.ts | generateSubMasterレスポンス検証 | **実装済** |
| 58 | 中程度 | editInplace.ts | パスワードフォームエラー時クリア | **実装済** |
| 59 | 中程度 | editInplace.ts | i18n ready Promiseインスタンス確認 | **実装済** |
| 60 | 中程度 | editInplace.ts | D&D reorder失敗時UI復元 | **実装済** |

##### TS側軽微品質確定（60件精査・60件実装）

| # | カテゴリ | 対象 | 改善概要 | 状態 |
|---|---------|------|---------|:----:|
| 61 | パフォーマンス | markdown.ts | headings正規表現を事前コンパイル化 | **実装済** |
| 62 | パフォーマンス | markdown.ts | bold/italic正規表現を事前コンパイル化 | **実装済** |
| 63 | パフォーマンス | markdown.ts | image/link正規表現を事前コンパイル化 | **実装済** |
| 64 | パフォーマンス | markdown.ts | taskList正規表現を事前コンパイル化 | **実装済** |
| 65 | パフォーマンス | markdown.ts | list/blockquote正規表現を事前コンパイル化 | **実装済** |
| 66 | パフォーマンス | markdown.ts | paragraph正規表現を事前コンパイル化 | **実装済** |
| 67 | パフォーマンス | editor.ts | sanitizeHtml正規表現を事前コンパイル化 | **実装済** |
| 68 | パフォーマンス | editInplace.ts | DOM検索結果のキャッシュ（querySelectorAll再呼出し削減） | **実装済** |
| 69 | パフォーマンス | editInplace.ts | sortedReplacer関数のDRY化（flushSave/beforeunload共通化） | **実装済** |
| 70 | パフォーマンス | editor.ts | createBlockWrapper内のボタン生成をヘルパーメソッド化 | **実装済** |
| 71 | コード品質 | editor.ts | BlockToolData interfaceにlanguageフィールド追加 | **実装済** |
| 72 | コード品質 | editor.ts | getEditorFromElement戻り値型注釈の一貫性 | **実装済** |
| 73 | コード品質 | api.ts | エラーメッセージ文字列のDRY化（共通ヘルパー） | **実装済** |
| 74 | コード品質 | api.ts | CSRF更新処理のDRY化（全メソッド統一パターン） | **実装済** |
| 75 | コード品質 | editInplace.ts | initBlockEditor内のJSON.stringify sortedReplacerをモジュールスコープに移動 | **実装済** |
| 76 | コード品質 | editor.ts | builtinTools各ブロックのsanitizeHtml適用パターン統一 | **実装済** |
| 77 | コード品質 | markdown.ts | escAttrヘルパーをモジュールスコープに昇格 | **実装済** |
| 78 | コード品質 | editor.ts | 未使用の`as any`キャスト削減（saveUndoStateをpublicに） | **実装済** |
| 79 | コード品質 | editInplace.ts | マジックナンバー定数化（1_048_576, 300, 8000, 5000） | **実装済** |
| 80 | コード品質 | editInplace.ts | showRevisionDiffModal innerHTML→DOM API化 | **実装済** |
| 81 | 型改善 | globals.d.ts | BlockToolData型をglobals.d.tsにも追加 | **実装済** |
| 82 | 型改善 | api.ts | GenerateReport型定義追加 | **実装済** |
| 83 | 型改善 | editInplace.ts | showGenerateReport引数型をGenerateReport型に統一 | **実装済** |
| 84 | 型改善 | editor.ts | EditorData.blocks型をReadonlyArray化 | **実装済** |
| 85 | 型改善 | editInplace.ts | downloadCredentials引数にreadonlyマーク | **実装済** |
| 86 | エラーハンドリング | api.ts | listUsers catch時にconsole.warn追加 | **実装済** |
| 87 | エラーハンドリング | editInplace.ts | initBlockEditor JSON.parseにtry-catch + console.warn | **実装済** |
| 88 | エラーハンドリング | editInplace.ts | renderMarkdownContent atob失敗時console.warn | **実装済** |
| 89 | エラーハンドリング | editInplace.ts | renderBlocksContent atob失敗時console.warn | **実装済** |
| 90 | エラーハンドリング | api.ts | saveSidebar catch時にconsole.warn追加 | **実装済** |
| 91 | null安全 | editor.ts | image block save時のnullチェック強化 | **実装済** |
| 92 | null安全 | editInplace.ts | showFieldFeedback orig null対応 | **実装済** |
| 93 | null安全 | editInplace.ts | initPageSearch input.value trim前のnullチェック | **実装済** |
| 94 | UX | editInplace.ts | downloadCredentials i18n化（ファイル内テキスト翻訳対応） | **実装済** |
| 95 | UX | editInplace.ts | showSaveIndicator状態テキストi18n化 | **実装済** |
| 96 | UX | editInplace.ts | bulk操作エラーメッセージi18n対応フォールバック追加 | **実装済** |
| 97 | UX | editor.ts | toolboxボタンにtitle属性追加 | **実装済** |
| 98 | UX | editor.ts | image URLプレースホルダーi18n化 | **実装済** |
| 99 | UX | editor.ts | image captionプレースホルダーi18n化 | **実装済** |
| 100 | UX | editInplace.ts | パスワード変更成功時フォームフォーカス制御 | **実装済** |
| 101 | アクセシビリティ | editor.ts | heading levelボタンにaria-label追加 | **実装済** |
| 102 | アクセシビリティ | editor.ts | list toggleボタンにaria-label追加 | **実装済** |
| 103 | アクセシビリティ | editor.ts | deleteブロックボタンにaria-label追加 | **実装済** |
| 104 | アクセシビリティ | editor.ts | moveUp/moveDownボタンにaria-label追加 | **実装済** |
| 105 | アクセシビリティ | editor.ts | addブロックボタンにaria-label追加 | **実装済** |
| 106 | CSS | themes/admin.css | ce-heading-wrapのdisplay:flex追加 | **実装済** |
| 107 | CSS | themes/admin.css | ce-list-wrapのdisplay:flex追加 | **実装済** |
| 108 | CSS | themes/admin.css | ce-sub-master-credentialsスタイル追加 | **実装済** |
| 109 | CSS | themes/admin.css | ce-warnings__itemスタイル追加 | **実装済** |
| 110 | CSS | themes/admin.css | ce-generate-report__rowスタイル追加 | **実装済** |
| 111 | CSS | themes/admin.css | dark mode ce-heading__level/ce-list__toggleスタイル | **実装済** |
| 112 | CSS | themes/AP-Default/style.css | ce-heading-wrap/ce-list-wrapスタイル追加 | **実装済** |
| 113 | CSS | themes/AP-Adlaire/style.css | ce-heading-wrap/ce-list-wrapスタイル追加 | **実装済** |
| 114 | CSS | themes/AP-Default/minimal.css | font-family system-uiフォールバック追加 | **実装済** |
| 115 | CSS | themes/AP-Adlaire/minimal.css | font-family system-uiフォールバック追加 | **実装済** |
| 116 | i18n | ja.json | downloadCredentialsファイル内テキスト翻訳キー追加 | **実装済** |
| 117 | i18n | en.json | downloadCredentialsファイル内テキスト翻訳キー追加 | **実装済** |
| 118 | i18n | ja.json | save状態テキスト翻訳キー追加（saving/saved/error） | **実装済** |
| 119 | i18n | en.json | save状態テキスト翻訳キー追加（saving/saved/error） | **実装済** |
| 120 | ビルド設定 | tsconfig.json | noUnusedLocals/noUnusedParameters追加 | **実装済** |

### 4.2 Ver.2.8 — バグ修正（300件精査）

> マイナーバージョン x.8 はバグ修正を主目的とするバージョン（CLAUDE.md 準拠）。
> PHP 200件 + TS 100件 = 300件精査。
> 致命的3件 + 重大66件 + 中程度118件 = 187件を最優先実装。軽微113件も実装。

| # | 改良点 | 状態 |
|---|--------|:----:|
| — | PHP バグ修正200件（致命的3+重大40+中程度74+軽微83） | **実装済** |
| — | TS バグ修正100件（重大26+中程度44+軽微30） | **実装済** |

### 4.3 Ver.2.7 — 機能拡張・管理UI強化・品質改善 + バグ修正150件精査 — **実装済**

> マイナーバージョン x.7 は機能追加可能バージョン。
> #20 エラーハンドリング統一は Ver.2.6 に前倒し済。
> #21 言語ホットリロードは共有サーバー現実性原則に基づき削除。
> 追加バグ修正150件精査（PHP 100件 + TS 50件）: 致命的4件+重大22件+中程度124件=150件全件実装。

| # | カテゴリ | 改良点 | 状態 |
|---|---------|--------|:----:|
| 16 | 管理UI | ページ並び順管理（ダッシュボードでドラッグ、menu 反映） | **実装済** |
| 17 | 管理UI | ページプレビュー（`?preview=slug` で下書きを公開レイアウト確認） | **実装済** |
| 18 | エディタ | サイドバー（subside）をブロックエディタで編集 | **実装済** |
| 19 | フロント | 静的サイト用軽量 CSS（エディタ CSS 除外の minimal.css） | **実装済** |
| 22 | i18n | 管理 UI の完全翻訳（全テキスト） | **実装済** |
| 23 | テーマ | テーマ設定ファイル（theme.json メタデータ） | **実装済** |
| 24 | データ | エクスポートにリビジョンを含むオプション | **実装済** |
| A | 管理UI | ダッシュボードにページ検索/フィルタ機能 | **実装済** |
| B | 公開品質 | 公開前チェック機能（見出し不足・必須項目警告） | **実装済** |
| C | データ | リビジョン差分表示（Draft↔Published 変更箇所ハイライト） | **実装済** |
| D | 管理UI | バルク操作（複数ページ一括公開/下書き/削除） | **実装済** |
| E | セキュリティ | CSP ヘッダーの nonce 方式対応（unsafe-inline 脱却） | **実装済** |
| F | 静的生成 | 生成完了レポート（成功/失敗ページ一覧、所要時間） | **実装済** |
| — | バグ修正 | バグ修正（10件） | **実装済** |

### 4.4 Ver.2.6 — バグ修正・改良（70件精査・70件実装） — **実装済**

> Ver.2.5 エディタ高度化後の全コード精査に基づくバグ修正。
> PHP 45件 + TypeScript/フロントエンド 25件 = 70件。
> マイナーバージョン x.6 はバグ修正を主目的とするバージョン（CLAUDE.md 準拠）。
> 12件は精査の結果、既に実装済みと確認（修正不要）。

#### PHP バグ修正（45件）

| # | カテゴリ | 対象 | バグ概要 | 状態 |
|---|---------|------|---------|:----:|
| 1 | セキュリティ | themes/AP-Default/theme.php | copyright がエスケープなしで出力（XSS） | **実装済** |
| 2 | セキュリティ | themes/AP-Adlaire/theme.php | 同上: copyright XSS | **実装済** |
| 3 | セキュリティ | admin-ui.php | JS埋め込みで safeSlug を直接連結（JSインジェクション） | **実装済** |
| 4 | セキュリティ | api.php | CORS Origin の parse_url() 結果 null チェックなし | **実装済** |
| 5 | セキュリティ | api.php | HTTP_HOST を sitemap/export で直接使用（Host Header Injection） | **実装済** |
| 6 | セキュリティ | app.php | hooks['admin-head'] の内容がエスケープなしで出力 | **実装済** |
| 7 | セキュリティ | renderer.php | renderBlocksToHtml() の img src にスキーム検証なし | **実装済** |
| 8 | セキュリティ | index.php | basename() のみではテーマパストラバーサル防止不十分 | **実装済** |
| 9 | セキュリティ | core.php | validateSlug() を whitelist 方式に強化 | **実装済** |
| 10 | セキュリティ | api.php | import で password のみ削除、他の機密情報が残存 | **実装済** |
| 11 | セキュリティ | app.php | json_encode() で JSON_HEX_TAG 未指定 | **実装済** |
| 12 | セキュリティ | helpers.php | レート制限がセッションのみ依存 | **実装済** |
| 13 | セキュリティ | core.php | tempnam() の初期権限が予測不可能 | **実装済** |
| 14 | セキュリティ | renderer.php | javascript: 検証を vbscript:/data: にも拡大 | **実装済** |
| 15 | セキュリティ | app.php | 404 レスポンス後に処理継続 | **実装済** |
| 16 | データ整合性 | generator.php | file_put_contents() の戻り値未チェック | **実装済** |
| 17 | データ整合性 | core.php | copy() 失敗時のエラー処理なし | **実装済** |
| 18 | データ整合性 | core.php | rename() 失敗時の例外処理なし | **実装済** |
| 19 | データ整合性 | core.php | unlink() 失敗時の処理なし | **実装済** |
| 20 | データ整合性 | app.php | savePassword() の writeConfigValue() 失敗が silent | **実装済** |
| 21 | データ整合性 | core.php | json_decode() の null/false チェック未統一 | **実装済** |
| 22 | エラーハンドリング | generator.php | strtotime() が false を返す可能性を未処理 | **実装済** |
| 23 | エラーハンドリング | bundle-installer.php | json_encode() が false を返す可能性を未処理 | **実装済** |
| 24 | エラーハンドリング | bundle-installer.php | mkdir() の戻り値確認不足 | **実装済** |
| 25 | エラーハンドリング | app.php | preg_match() が false の場合のフォールバック不明確 | **実装済** |
| 26 | エラーハンドリング | renderer.php | preg_replace() が null を返す場合のエラー検出なし | **実装済** |
| 27 | エラーハンドリング | helpers.php | csrf_verify() が直接 exit する | **実装済** |
| 28 | ロジック | core.php | MAX_BACKUPS の array_slice 計算 off-by-one | **実装済** |
| 29 | ロジック | bundle-installer.php | step に負の値が入る可能性 | **実装済** |
| 30 | ロジック | app.php | ログイン後の location が相対パス | **実装済** |
| 31 | ロジック | api.php | apiPageList() の content/blocks 除外ロジック曖昧 | **実装済** |
| 32 | ロジック | app.php | MD5 パスワード後方互換コードの完全削除 | **実装済** |
| 33 | パフォーマンス | core.php | listPages() で JSON 重複デコード | **実装済** |
| 34 | パフォーマンス | api.php | search で全ページロード | **実装済** |
| 35 | パフォーマンス | app.php | menu() で毎回 explode() 実行 | **実装済** |
| 36 | コード品質 | helpers.php | csrf_token() を null 合体演算子で簡潔化 | **実装済** |
| 37 | コード品質 | admin-ui.php | deletePage の confirm() のみ、サーバー側二重確認なし | **実装済** |
| 38 | セキュリティ | app.php | host 構築ロジック複雑、Host Header Injection リスク | **実装済** |
| 39 | セキュリティ | api.php | Content-Type ヘッダー検証なし | **実装済** |
| 40 | セキュリティ | admin-ui.php | JavaScript コードを文字列連結で生成 | **実装済** |
| 41 | エラーハンドリング | index.php | require themePath のシンボリックリンク対策 | **実装済** |
| 42 | データ整合性 | api.php | json_decode() が UTF-8 前提 | **実装済** |
| 43 | ロジック | core.php | created_at の更新ロジック曖昧 | **実装済** |
| 44 | パフォーマンス | core.php | migrate() で glob() が毎回走査 | **実装済** |
| 45 | セキュリティ | bundle-installer.php | step 出力の型確認が厳密でない | **実装済** |

#### TypeScript/フロントエンド バグ修正（25件）

| # | カテゴリ | 対象 | バグ概要 | 状態 |
|---|---------|------|---------|:----:|
| 46 | セキュリティ | editor.ts | sanitizeHtml() が data-* 属性内の javascript: を未除去 | **実装済** |
| 47 | セキュリティ | editor.ts | sanitizeHtml() の正規表現が複雑なペイロード対応不足 | **実装済** |
| 48 | セキュリティ | markdown.ts | img src に data: URI スキーム許可（SVG XSS） | **実装済** |
| 49 | セキュリティ | markdown.ts | リンク URL に vbscript:/data: 未チェック | **実装済** |
| 50 | セキュリティ | markdown.ts | footnote ID がユーザー入力から XSS 可能 | **実装済** |
| 51 | セキュリティ | editInplace.ts | markdownToHtml() 戻り値を innerHTML 代入 | **実装済** |
| 52 | セキュリティ | editInplace.ts | renderBlocks() 戻り値を innerHTML 代入 | **実装済** |
| 53 | データ損失 | editor.ts | InlineToolbar 操作で focusout が発火し意図しない保存 | **実装済** |
| 54 | データ損失 | editInplace.ts | focusout debounce 300ms 中の離脱で保存漏れ | **実装済** |
| 55 | ロジック | editor.ts | Undo/Redo 中の render() で focusout 再トリガー | **実装済** |
| 56 | ロジック | editor.ts | range.surroundContents() 失敗時の状態同期不備 | **実装済** |
| 57 | ロジック | editor.ts | heading level cycle で innerHTML 内の HTML 不正確 | **実装済** |
| 58 | ロジック | editInplace.ts | querySelector 内の key 値に引用符含有時 selector 破断 | **実装済** |
| 59 | エラーハンドリング | api.ts | listRevisions() で res.ok 確認前に res.json() 呼び出し | **実装済** |
| 60 | エラーハンドリング | api.ts | search() で res.ok 確認前に res.json() 呼び出し | **実装済** |
| 61 | 型安全性 | editor.ts | existing.parentNode! の非null アサーション | **実装済** |
| 62 | 型安全性 | editor.ts | any キャストによる __editor 参照 | **実装済** |
| 63 | マークダウン | markdown.ts | list wrap 正規表現でマルチライン処理不完全 | **実装済** |
| 64 | マークダウン | markdown.ts | table separator 検出で列数未検証 | **実装済** |
| 65 | マークダウン | markdown.ts | 太字/イタリック順序で ネスト誤変換 | **実装済** |
| 66 | イベントリーク | autosize.ts | 複数 textarea 初期化でリスナー累積 | **実装済** |
| 67 | イベントリーク | editor.ts | InlineToolbar リスナーが Editor 破棄時に未削除 | **実装済** |
| 68 | ロジック | editor.ts | attachListItemHandlers() で空 li の親要素同期不備 | **実装済** |
| 69 | ロジック | editor.ts | toolbox 外クリックリスナー二重登録の可能性 | **実装済** |
| 70 | 型安全性 | editInplace.ts | FocusEvent.relatedTarget の null チェック不備 | **実装済** |

### 4.5 Ver.2.5 — エディタ高度化 — **実装済**

> 上位原則は `EDITOR_RULEBOOK.md` §13 に従う。

| # | 改良点 | 状態 |
|---|--------|:----:|
| 25 | Undo/Redo（Ctrl+Z/Y、スナップショット方式履歴スタック、最大50件） | **実装済** |
| 26 | ブロック ドラッグ&ドロップ並び替え（HTML5 DnD API、ドラッグハンドル追加） | **実装済** |
| 27 | ブロック コピー&ペースト（Ctrl+C/V、エディタ内部クリップボード） | **実装済** |
| 28 | heading レベルクリック切替（prompt 廃止 → H1/H2/H3 サイクルボタン） | **実装済** |
| 29 | list 順序/非順序トグルボタン（confirm 廃止 → UL/OL 即時トグル） | **実装済** |
| 46 | document.execCommand 置換（Selection API + Range API で bold/italic/link 再実装） | **実装済** |

### 4.6 Ver.2.4 — バグ修正（50件精査） + ARCHITECTURE_RULEBOOK 準拠 — **実装済**

> Ver.2.3 アーキテクチャ刷新後の全コード精査に基づくバグ修正。
> PHP 30件 + TypeScript/フロントエンド 20件 = 50件。
> #8, #12, #14, #16 は調査の結果、現行動作で問題なしと判断（修正不要）。
> #46 は Ver.2.8 に延期（エディタ高度化バージョンで対応が適切なため）。

#### ARCHITECTURE_RULEBOOK 準拠修正

| # | カテゴリ | 改良点 | 状態 |
|---|---------|--------|:----:|
| 51 | アーキテクチャ | PHP ファイルを Core/ ディレクトリに移動（§2.2 準拠） | **実装済** |
| 52 | アーキテクチャ | FileStorage のデータパスを files/ から data/ に変更（§3.1 準拠） | **実装済** |
| 53 | セキュリティ | .htaccess を Core/ ディレクトリ単位保護に変更（§2.4 準拠） | **実装済** |
| 54 | アーキテクチャ | index.php の require パスを Core/ に更新（§2.3 準拠） | **実装済** |
| 55 | アーキテクチャ | bundle-installer.php の require パスを Core/ に更新 | **実装済** |
| 56 | データ整合性 | files/ → data/ 自動マイグレーション対応 | **実装済** |

#### PHP バグ修正（30件）

| # | カテゴリ | 対象 | バグ概要 | 状態 |
|---|---------|------|---------|:----:|
| 1 | セキュリティ | helpers.php | CSRF トークンが毎回再生成され複数タブで検証失敗 | **実装済** |
| 2 | セキュリティ | api.php | CORS Origin 検証が str_contains 部分一致でバイパス可能 | **実装済** |
| 3 | セキュリティ | api.php | handleEdit() がパスワードハッシュ一致を検証せず SESSION 存在のみチェック | **実装済** |
| 4 | セキュリティ | api.php | handleApi() も同様にパスワードハッシュ一致を検証しない | **実装済** |
| 5 | セキュリティ | app.php | セッション認証で hash_equals() を使用していない（タイミング攻撃リスク） | **実装済** |
| 6 | セキュリティ | app.php | getLoginStatus() で $this->host を未エスケープで href 属性に出力（XSS） | **実装済** |
| 7 | セキュリティ | app.php | content() で base64 値を属性に防御的エスケープなしで出力 | **実装済** |
| 8 | データ整合性 | api.php | handleEdit() の CSRF トークン再生成とフロントエンドの整合性不足 | **実装済** |
| 9 | エラーハンドリング | app.php | session_destroy() 後の session_start() で PHP 8.3 警告の可能性 | **実装済** |
| 10 | エラーハンドリング | api.php | handleEdit() が Content-Type ヘッダを設定していない | **実装済** |
| 11 | セキュリティ | api.php | handleEdit() でユーザー入力をエスケープなしで echo（格納型 XSS） | **実装済** |
| 12 | アーキテクチャ | api.php | handleEdit() が独自に FileStorage を生成し App と共有されない | **実装済** |
| 13 | セキュリティ | index.php | $_REQUEST['admin'] が COOKIE 経由で注入される可能性 | **実装済** |
| 14 | コード品質 | app.php | パスワード変更成功後のリダイレクト不足 | **実装済** |
| 15 | エッジケース | app.php | MD5 パスワードマイグレーションの判定が不完全（strlen==32 && ctype_xdigit） | **実装済** |
| 16 | データ整合性 | core.php | listPages() キャッシュが直接ファイル操作時に古いまま | **実装済** |
| 17 | エッジケース | generator.php | diff ビルドの日時比較がタイムゾーン混在時に誤判定 | **実装済** |
| 18 | セキュリティ | generator.php | 静的生成で $sideContent（subside）が未エスケープ出力 | **実装済** |
| 19 | コード品質 | admin-ui.php | CSP ヘッダが index.php と二重設定され unsafe-inline が無効化される可能性 | **実装済** |
| 20 | 致命的バグ | admin-ui.php | Save Status ボタンが content='' で POST しページ内容を消去 | **実装済** |
| 21 | 致命的バグ | bundle-installer.php | helpers.php を require していないため直接アクセス時 esc() 未定義エラー | **実装済** |
| 22 | エッジケース | bundle-installer.php | session_start() 二重呼び出しの可能性 | **実装済** |
| 23 | セキュリティ | app.php | editTags() がログインページで非認証ユーザーに CSRF トークンを出力 | **実装済** |
| 24 | パフォーマンス | core.php | listPages() が content 含む全データをキャッシュに書き込みメモリ圧迫 | **実装済** |
| 25 | エッジケース | app.php | handlePassword() に非文字列値が渡されると TypeError | **実装済** |
| 26 | セキュリティ | renderer.php | Markdown の img/a 変換で URL 未エスケープ・javascript: スキーム未フィルタ | **実装済** |
| 27 | コード品質 | renderer.php | コードブロック内の言語名が二重エスケープされる可能性 | **実装済** |
| 28 | データ整合性 | core.php | マイグレーションで system ファイルが pages/ に誤移行されるリスク | **実装済** |
| 29 | エッジケース | app.php | メニュー区切り文字の改行コード不一致（\r\n 混在時に分割失敗） | **実装済** |
| 30 | セキュリティ | admin-ui.php | deletePage onclick で slug が JS コンテキスト適切にエスケープされていない | **実装済** |

#### TypeScript/フロントエンド バグ修正（20件）

| # | カテゴリ | 対象 | バグ概要 | 状態 |
|---|---------|------|---------|:----:|
| 31 | セキュリティ | editor.ts | sanitizeHtml が script タグのみ除去で他の XSS ベクター素通し | **実装済** |
| 32 | セキュリティ | editor.ts | list ブロック render で li.innerHTML にサニタイズなしで代入 | **実装済** |
| 33 | セキュリティ | editor.ts | renderBlocks で paragraph/heading/quote/list が未エスケープ出力 | **実装済** |
| 34 | 致命的バグ | api.ts | importSite で res.json() を2回呼び出し常に失敗 | **実装済** |
| 35 | セキュリティ | api.ts | savePage の CSRF トークン更新と restoreRevision のトークン失効 | **実装済** |
| 36 | 型安全性 | editor.ts | __editor プロパティの型定義不整合（as any の有無が不統一） | **実装済** |
| 37 | エッジケース | editor.ts | heading レベル入力で不正値が NaN になり不正な要素が生成される | **実装済** |
| 38 | データ損失 | editInplace.ts | 複数 .ce-editor-wrapper で activeEditor が最後のもので上書き | **実装済** |
| 39 | セキュリティ | editInplace.ts | fieldSave でサーバーレスポンスを未検証で innerHTML に代入 | **実装済** |
| 40 | コード品質 | editInplace.ts | plainTextEdit で innerHTML から br 除去するが他の HTML タグが残る | **実装済** |
| 41 | エラーハンドリング | api.ts | savePage/deletePage のエラー時 res.json() が非 JSON で失敗 | **実装済** |
| 42 | 初期化競合 | i18n.ts + editInplace.ts | i18n.init() 完了前にエディタが初期化され翻訳キー名が表示される | **実装済** |
| 43 | セキュリティ | editor.ts | image ブロックの img.src に javascript: スキーム URL が設定可能 | **実装済** |
| 44 | データ損失 | editInplace.ts | focusout 保存で activeEditor のグローバル参照が別エディタを指す | **実装済** |
| 45 | DOM リーク | editor.ts | InlineToolbar の selectionchange リスナーが解除されない | **実装済** |
| 46 | 非推奨 API | editor.ts | document.execCommand は Web 標準で非推奨 | Ver.2.5 延期 |
| 47 | セキュリティ | api.ts | importSite で CSRF トークンを URL クエリパラメータに含め漏洩リスク | **実装済** |
| 48 | エッジケース | editor.ts | Backspace ハンドラの空判定が不正確（br/零幅スペース考慮不足） | **実装済** |
| 49 | エラーハンドリング | editInplace.ts | autosize/markdownToHtml の未定義チェック不足 | **実装済** |
| 50 | データ損失 | editInplace.ts | switchFormat のエラー時にリカバリがなくデータ消失 | **実装済** |

---

## 5. リリース計画（Ver.3.0 系）

> **【暫定承認 / 2026-04-04】本セクションの計画は暫定承認済みであり、今後再検討予定。**
> 詳細仕様は各分類ベースルールブックに策定後、本セクションを更新する。
> 実装着手前に仕様策定が完了していることを確認すること（CHARTER.md §1 準拠）。

---

### 5.0 前提・方針

#### 破壊的変更の根拠（Major バージョンアップ理由）

| 項目 | 内容 |
|---|---|
| API キー認証必須化 | Ver.3.0 から全機能に API キー認証を必須とする（§6 承認済） |
| Deno ビルドランタイム移行 | npm/tsc → Deno（2026-04-04 ARCHITECTURE_RULEBOOK.md Ver.1.5 策定済） |

#### 不採用確定項目（今後も計画なし）

| 機能 | 決定 |
|---|---|
| RSS フィード | **不採用・今後も計画なし** |

---

### 5.1 Ver.3.0 — 基盤刷新（破壊的変更）【暫定】

> 2.x 系との後方互換性を持たない基盤刷新リリース。

| カテゴリ | 内容 | 状態 |
|---------|------|:----:|
| セキュリティ | **API キー認証の必須化**（`LICENSE_SYSTEM_RULEBOOK.md` 準拠） | **実装済** |
| フロントエンド | **ES モジュール移行**（Deno 移行に伴い JS 出力を ES modules 化、PHP テンプレートの `<script type="module">` 対応） | **実装済** |
| CI/CD | **CI/CD 全自動リリース整備**（`ARCHITECTURE_RULEBOOK.md` §7 準拠。GitHub Actions、TS 型チェック + PHP 静的解析、ZIP 自動生成・公式サイトへ自動配置） | **実装済** |
| 配布 | **公式サイト構築**（Adlaire 自身で構築・静的生成、自前サーバーで管理、唯一の配布チャンネル） | **実装済** |
| 品質 | バグ修正・精査（50件以上、CLAUDE.md 準拠） | **実装済** |

---

### 5.1.1 Ver.3.1 — バグ修正（69件精査）

> Ver.3.0 基盤刷新後の全コード精査に基づくバグ修正。
> PHP 27件 + TypeScript 42件 = 69件。
> 致命的4件 + 重大27件 + 中程度30件 + 軽微8件。
> 致命的・重大を最優先で実装する（CLAUDE.md バグ修正ポリシー準拠）。

#### 精査サマリー

| 区分 | PHP | TS | 合計 |
|:----:|:---:|:--:|:----:|
| 致命的 | 0 | 4 | 4 |
| 重大 | 8 | 19 | 27 |
| 中程度 | 15 | 15 | 30 |
| 軽微 | 4 | 4 | 8 |
| **合計** | **27** | **42** | **69** |

#### 致命的バグ（最優先）

| # | 対象 | バグ概要 | 状態 |
|---|------|---------|:----:|
| TS-4 | editInplace.ts | beforeunload の sendBeacon() に URLSearchParams を直接渡し（文字列変換必要）。ページ離脱時データ消失リスク | 計画 |
| TS-20 | editor.ts | save() でブロック保存が例外時、そのブロックのデータがサイレントに消失 | 計画 |
| TS-25 | markdown.ts | 複雑な正規表現による ReDoS（サービス拒否）の可能性 | 計画 |
| TS-39 | globals.d.ts | csrfToken がグローバルミュータブル変数。外部コードから改ざん可能 | 計画 |

#### 重大バグ（PHP: 8件）

| # | 対象 | バグ概要 | 状態 |
|---|------|---------|:----:|
| PHP-1 | helpers.php | レートリミットファイルの flock() 戻り値未チェック。ロック取得失敗時も処理続行 | 計画 |
| PHP-3 | helpers.php | レートリミットファイル作成時の TOCTOU 競合 | 計画 |
| PHP-5 | license.php | アトミック書き込みの一時ファイル名が予測可能。同時書き込み時に衝突リスク | 計画 |
| PHP-11 | app.php | セッション破棄後の session_status() 未確認。破棄失敗時にセッション残存 | 計画 |
| PHP-17 | api.php | CORS Origin 検証ロジックの不備。null/空 Origin が明示的に拒否されない | 計画 |
| PHP-18 | api.php | インポート処理で slug バリデーション前にパス構築。パストラバーサルリスク | 計画 |
| PHP-20 | generator.php | 静的生成クリーンアップ時の symlink TOCTOU 攻撃。チェックと unlink の間にシンボリックリンク差し替え可能 | 計画 |
| PHP-24 | admin-ui.php | 一部管理アクションで CSRF トークン検証が不十分 | 計画 |

#### 重大バグ（TypeScript: 19件）

| # | 対象 | バグ概要 | 状態 |
|---|------|---------|:----:|
| TS-1 | editInplace.ts | fieldSave の非同期処理未 await。保存完了前に changing=false となる競合 | 計画 |
| TS-2 | editInplace.ts | fieldSaveQueue の Promise チェーンがエラーを伝播せず後続操作が実行される | 計画 |
| TS-13 | editor.ts | attachBackspaceHandler() のイベントリスナーがブロック再作成時に蓄積 | 計画 |
| TS-16 | editor.ts | paragraph ブロックの save で sanitizeHtml 後の HTML がそのまま保持。意図しない書式が永続化 | 計画 |
| TS-17 | editor.ts | list items の innerHTML 取得時にブロック要素が混入。不正なリスト項目テキスト | 計画 |
| TS-18 | editor.ts | setInterval(5秒) が全エディタで個別に実行。10エディタで10ポーリング | 計画 |
| TS-19 | editor.ts | focusout デバウンスタイマーのエラー時フラグ不整合 | 計画 |
| TS-22 | editor.ts | キーボードショートカットがフォーカス中エディタを区別せず全エディタで発火 | 計画 |
| TS-23 | editor.ts | showToolbox() のイベントリスナーが表示のたびに蓄積 | 計画 |
| TS-24 | editor.ts | ツールボックス表示時の RAF タイミングでクリックがすり抜ける可能性 | 計画 |
| TS-26 | markdown.ts | コードブロックプレースホルダー `%%CODEBLOCK_N%%` がユーザーコンテンツと衝突可能 | 計画 |
| TS-27 | markdown.ts | 脚注定義の継続行マッチが悪意ある入力で過剰ループ | 計画 |
| TS-28 | markdown.ts | テーブル解析正規表現の ReDoS リスク | 計画 |
| TS-32 | api.ts | 並行 API 呼び出し時に csrfToken のグローバル更新が競合 | 計画 |
| TS-35 | api.ts | generateSubMaster() の res.json() 失敗時に未処理 Promise rejection | 計画 |
| TS-37 | autosize.ts | scrollHeight 取得前にリフローが保証されない。高さ計算が不正確になる可能性 | 計画 |
| TS-7 | editInplace.ts | focusin リスナーがエディタ破棄時に未解除。メモリリーク | 計画 |
| TS-9 | editInplace.ts | showRevisionDiffModal の keydown リスナーが Escape 以外の閉じ方で残存 | 計画 |
| TS-15 | editor.ts | paste ハンドラで sanitizeHtml 後に innerHTML を再取得。XSS ペイロードが残存する可能性 | 計画 |

#### 中程度バグ（PHP: 15件）

| # | 対象 | バグ概要 | 状態 |
|---|------|---------|:----:|
| PHP-2 | helpers.php | JSON デコード失敗時の $attempts 未初期化 | 計画 |
| PHP-4 | license.php | json_encode の JSON_THROW_ON_ERROR 例外がカスタムハンドラで抑制される可能性 | 計画 |
| PHP-6 | core.php | listPages メモリ閾値チェックが "unlimited"(-1) を未処理 | 計画 |
| PHP-7 | core.php | glob() のエラー(false)とディレクトリ不存在を区別できない | 計画 |
| PHP-9 | app.php | パスワード最大長超過時のエラーメッセージが password_too_short（逆） | 計画 |
| PHP-12 | app.php | preg_match() 失敗(false)時のフォールバックが SERVER_NAME に暗黙依存 | 計画 |
| PHP-13 | helpers.php | CSRF トークン再生成がフォーム処理完了前に実行される | 計画 |
| PHP-14 | renderer.php | Markdown レンダラーで html_entity_decode() が二重適用 | 計画 |
| PHP-15 | renderer.php | 画像キャプションの属性インジェクション可能性 | 計画 |
| PHP-16 | api.php | json_decode に depth 制限なし。深いネスト JSON で DoS リスク | 計画 |
| PHP-19 | api.php | リビジョンタイムスタンプの日付範囲未検証 | 計画 |
| PHP-21 | generator.php | ディレクトリ作成時の競合（is_dir と mkdir の間） | 計画 |
| PHP-22 | generator.php | サイトマップ XML 生成時の slug エスケープ不足 | 計画 |
| PHP-23 | admin-ui.php | インラインスクリプト内の PHP 値エスケープ不備 | 計画 |
| PHP-25 | index.php | nonce がリクエスト単位で再生成されるがキャッシュされたスクリプトで再利用可能 | 計画 |

#### 中程度バグ（TypeScript: 15件）

| # | 対象 | バグ概要 | 状態 |
|---|------|---------|:----:|
| TS-3 | editInplace.ts | flushSave の FIELD_SAVE_MAX_LENGTH 超過時に無限再トリガーの可能性 | 計画 |
| TS-5 | editInplace.ts | renderMarkdownContent エラー時にフォーマットが完全消失しサイレントにテキスト化 | 計画 |
| TS-6 | editInplace.ts | renderBlocksContent の型ガードが JSON.parse 後の非配列オブジェクトを通過 | 計画 |
| TS-8 | editInplace.ts | safeNormalize で normalize() 例外時に検索機能が全壊 | 計画 |
| TS-10 | editInplace.ts | 認証情報表示で i18n.t() の戻り値が innerHTML に未エスケープで注入される可能性 | 計画 |
| TS-11 | editInplace.ts | plainTextEdit/richTextHook 例外時に changing フラグが永続ロック | 計画 |
| TS-12 | editInplace.ts | DOMContentLoaded 時の i18n 未完了状態でエディタ UI 初期化される競合 | 計画 |
| TS-14 | editor.ts | attachListItemHandlers の dataset フラグが文字列比較で不確実 | 計画 |
| TS-29 | markdown.ts | テーブル 1000行/50列超過時にサイレントにプレーンテキスト化 | 計画 |
| TS-30 | markdown.ts | escCell が & をエスケープしない。二重エスケープまたは未エスケープの可能性 | 計画 |
| TS-31 | markdown.ts | リストラッピング正規表現が貪欲マッチで複数リストを結合 | 計画 |
| TS-33 | api.ts | extractApiError の HTML ストリップが JSON エスケープ済み HTML を未処理 | 計画 |
| TS-38 | autosize.ts | 同一 textarea への二重初期化でリスナーが蓄積 | 計画 |
| TS-40 | editInplace.ts | plainTextEdit の textarea.value が DOM 追加前に設定される前提の不整合 | 計画 |
| TS-41 | editInplace.ts | showWarnings のコンテナが外部 DOM 操作で切断された場合の安全性 | 計画 |

#### 軽微バグ（PHP: 4件 + TypeScript: 4件）

| # | 対象 | バグ概要 | 状態 |
|---|------|---------|:----:|
| PHP-8 | core.php | isConfigKey のホワイトリスト検証不足 | 計画 |
| PHP-10 | app.php | null 合体演算子で null/false が正常値として通過 | 計画 |
| PHP-26 | bundle-installer.php | $GLOBALS 依存の管理者ユーザー名。フォーム再送信時にリセット | 計画 |
| PHP-27 | bundle-installer.php | POST 値の UTF-8 バリデーション未実施 | 計画 |
| TS-34 | api.ts | getPage の slug チェックが "0" や "false" を誤拒否 | 計画 |
| TS-36 | i18n.ts | has() がプロトタイプ汚染に脆弱（in 演算子使用） | 計画 |
| TS-42 | editInplace.ts | パスワードバリデーションが文字列長でバイト長を未確認 | 計画 |
| TS-21 | editor.ts | destroy() の WeakMap 手動削除が GC セマンティクスと冗長 | 計画 |

---

### 5.2 Ver.3.2 — ブログ基盤【暫定】

| カテゴリ | 内容 | 状態 |
|---------|------|:----:|
| 新機能 | 投稿タイプ新設（`type: post` フィールド追加、ページと投稿の区別） | 計画 |
| 新機能 | 投稿メタデータ（投稿日時・カテゴリ・タグ・著者） | 計画 |
| 新機能 | ブログ一覧ページ（投稿一覧の静的生成・ページネーション） | 計画 |
| 管理UI | ダッシュボードにポスト/ページ切替フィルタ | 計画 |

---

### 5.3 Ver.3.3 — ブログ機能拡充【暫定】

| カテゴリ | 内容 | 状態 |
|---------|------|:----:|
| 新機能 | カテゴリ・タグページ（カテゴリ/タグ別アーカイブの静的生成） | 計画 |
| 新機能 | 日付アーカイブ（年月別アーカイブページ） | 計画 |
| 新機能 | 前後ナビ（投稿の前後リンク生成） | 計画 |

---

### 5.4 Ver.3.4 — バグ修正【暫定】

> バグ修正を主目的とするバージョン（CLAUDE.md 準拠）。

| カテゴリ | 内容 | 状態 |
|---------|------|:----:|
| 品質 | 50件以上精査（PHP + TS） | 計画 |
| 品質 | Ver.3.2〜3.3 ブログ機能のバグ修正 | 計画 |

---

### 5.5 Ver.3.5 — バグ修正【暫定】

> バグ修正を主目的とするバージョン（CLAUDE.md 準拠）。

| カテゴリ | 内容 | 状態 |
|---------|------|:----:|
| 品質 | 50件以上精査（PHP + TS） | 計画 |
| セキュリティ | 3.0系実装に対する追加セキュリティ精査 | 計画 |

---

### 5.6 Ver.3.6 — エディタ強化【暫定】

| カテゴリ | 内容 | 状態 |
|---------|------|:----:|
| エディタ | 新ブロックタイプ（テーブル完成・アコーディオン等、§7.1 A2 準拠） | 計画 |
| メディア | 画像アップロード・管理基盤（§7.1 A3 準拠） | 計画 |
| エディタ | 既存エディタの使い勝手改善 | 計画 |

---

### 5.7 Ver.3.7 — バグ修正【暫定】

> バグ修正を主目的とするバージョン（CLAUDE.md 準拠）。

| カテゴリ | 内容 | 状態 |
|---------|------|:----:|
| 品質 | 50件以上精査（PHP + TS） | 計画 |

---

### 5.8 Ver.3.8 — 機能拡充【暫定】

| カテゴリ | 内容 | 状態 |
|---------|------|:----:|
| テーマ | テーマ設定UI強化（§7.1 A1 準拠） | 計画 |
| 検索 | 全文検索インデックス最適化（§7.1 A6 準拠） | 計画 |
| BaaS | BaaS連携Hub 基盤整備着手（DIRECTION_RULEBOOK §10 Phase 1） | 計画 |

---

### 5.9 Ver.3.9 — バグ修正【暫定】

> バグ修正を主目的とするバージョン（CLAUDE.md 準拠）。

| カテゴリ | 内容 | 状態 |
|---------|------|:----:|
| 品質 | 50件以上精査（PHP + TS） | 計画 |

---

## 6. API キー認証システム — 承認済

> 詳細仕様は `LICENSE_SYSTEM_RULEBOOK.md` を参照。
> 本計画は承認済みであり、独立ルールブックとして策定完了。

- **Ver.3.0 から必須化**。Ver.2.x 系では API キーなしでも動作する。
- Ver.3.0 以降、API キー未適用時は一切の機能が動作しない。
- 商業利用・非商業利用を問わず、全利用者に API キーの取得・適用を義務付ける。
- キー種別: Free（無料登録）/ Commercial（有料・商業ライセンス契約）。
- オフライン完結の HMAC-SHA256 署名検証。
- 実装ファイル: `Core/license.php`（新規）+ 既存3ファイル修正。

---

## 7. バージョン未配分項目一覧（草案）

> **本セクションの全項目は「草案」段階である。**
> バージョン配分・仕様とも未確定であり、実装の約束を意味しない。
> 仕様策定・優先度決定を経てリリースバージョンへ配分する。

### 7.1 追加機能候補（草案・通常優先度）

| # | カテゴリ | 機能概要 | 優先度 | 段階 |
|---|---------|---------|:------:|:----:|
| A1 | テーマ | テーマ設定 UI の強化（カラー/レイアウト設定、プレビュー） | 通常 | 草案 |
| A2 | エディタ | コンテンツタイプ拡張（テーブル、アコーディオン、埋め込み等） | 通常 | 草案 |
| A3 | メディア | 画像/ファイル管理の改善（メディアライブラリ、アップロード、サムネイル） | 通常 | 草案 |
| A4 | データ | エクスポート/インポートの強化（選択的インポート、差分マージ） | 通常 | 草案 |
| A5 | 静的生成 | 静的生成時の差分ビルド強化（アセット差分、変更検出の精度向上） | 通常 | 草案 |
| A6 | 検索 | 検索と sitemap の運用強化（全文検索インデックス、sitemap 自動更新） | 通常 | 草案 |

### 7.2 採用候補（草案・優先度低）

> 採用方針だが優先度は低い。コア機能の安定後に着手する。

| # | カテゴリ | 機能概要 | 優先度 | 段階 |
|---|---------|---------|:------:|:----:|
| B1 | プラグイン | プラグイン依存機構（依存解決、ロード順管理） | 低 | 草案 |
| B2 | 管理 | マルチユーザー権限管理（ロール、アクセス制御） | 低 | 草案 |
| B3 | コラボ | チームコラボ機能（編集ロック、変更通知） | 低 | 草案 |
| B4 | エディタ | ビジュアルページビルダー（レイアウト編集、セクション管理） | 低 | 草案 |
| B5 | 連携 | 外部サービス連携（Webhook、CDN 連携等） | 低 | 草案 |

### 7.3 運用ルール

- **草案 → 計画**: 仕様策定が完了したらバージョンに配分し、§4/§5 に移動する。段階を「計画」に変更。
- **草案 → 不採用**: 不採用と判断した場合は理由を付けて本セクションから削除する。
- 新しい機能候補が発生した場合、まず本セクションに「草案」として追加する。

---

## 8. 関連文書

| 文書 | 内容 |
|------|------|
| `CHARTER.md` | ルールブック憲章（最上位原則） |
| `docs/CHANGES.md` | 詳細な変更履歴 |
