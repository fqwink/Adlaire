# Adlaire Release Plan RULEBOOK

- 文書名: Adlaire Release Plan RULEBOOK
- 文書バージョン: Ver.2.7
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

**Ver.2.8-41**（2026-04-03）

---

## 3. リリース履歴

### 3.1 Ver.2.x 系（実装済みリリース）

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

#### マスター管理者アクセス権限

| # | カテゴリ | 改良点 | 状態 |
|---|---------|--------|:----:|
| M1 | 認証 | ユーザーモデル刷新: 単一管理者→マスター管理者（最大3名） | 計画 |
| M2 | データ | data/system/users.json 新設（ユーザー名/bcryptハッシュ/role:master/作成日/最終ログイン） | 計画 |
| M3 | マイグレーション | config.json:password → users.json 強制移行（単一管理者モード廃止） | 計画 |
| M4 | 認証 | ログイン画面にユーザー名入力フィールド追加 | 計画 |
| M5 | セッション | $_SESSION にユーザー名・ロール情報追加 | 計画 |
| M6 | 管理UI | ユーザー管理画面（一覧/追加/削除/パスワード変更） | **TS実装済** |
| M7 | API | ?api=users エンドポイント（CRUD、master権限必須） | **TS実装済** |
| M8 | セキュリティ | users.json ファイル権限 0600 + 排他ロック + アトミック書き込み | 計画 |
| M9 | bundle-installer | セットアップツールで初期マスター管理者ユーザー作成（users.json直接生成） | 計画 |
| M10 | 管理UI | ログイン状態表示にユーザー名表示 | 計画 |

#### 品質確定バグ修正（TS 20件精査・20件実装）

| # | カテゴリ | 対象 | バグ概要 | 状態 |
|---|---------|------|---------|:----:|
| 1 | セキュリティ | editInplace.ts | plainTextEdit: markdown取得時にinnerHTML直接使用（XSSリスク） | **実装済** |
| 2 | 型安全性 | editor.ts | paragraph/heading/quote render: as stringキャストをString()に改善 | **実装済** |
| 3 | セキュリティ | editor.ts | paragraph save(): el.innerHTMLをsanitizeHtmlなしで返却 | **実装済** |
| 4 | セキュリティ | editor.ts | quote save(): el.innerHTMLをsanitizeHtmlなしで返却 | **実装済** |
| 5 | セキュリティ | editor.ts | heading save(): headingEl.innerHTMLをsanitizeHtmlなしで返却 | **実装済** |
| 6 | エラーハンドリング | api.ts | restoreRevision: res.json()をres.okチェック前に呼出（非JSON例外） | **実装済** |
| 7 | エラーハンドリング | api.ts | importSite: res.json()をres.okチェック前に呼出（非JSON例外） | **実装済** |
| 8 | セキュリティ | api.ts | exportSite: CSRFトークン未送信 + updateCsrfFromResponse欠如 | **実装済** |
| 9 | エラーハンドリング | editInplace.ts | initGenerateReport: res.okチェック欠如 + res.json()失敗未処理 | **実装済** |
| 10 | セキュリティ | editInplace.ts | switchFormat: span.innerHTML直接使用（textContentに変更） | **実装済** |
| 11 | UX | editor.ts | image tool: 危険なURL入力時にユーザーフィードバック欠如 | **実装済** |
| 12 | エラーハンドリング | editInplace.ts | showSaveIndicator: non-null assertion(!)を安全な参照に変更 | **実装済** |
| 13 | データ損失 | editInplace.ts | flushSidebarSave: flushSaving同等の競合防止ガード欠如 | **実装済** |
| 14 | UX | editInplace.ts | ユーザー管理: パスワード変更成功時のフィードバック表示 | **実装済** |
| 15 | UX | editInplace.ts | ユーザー管理: 3名上限時のフォーム無効化とメッセージ表示 | **実装済** |
| 16 | セキュリティ | i18n.ts | t(): paramsのHTMLエスケープオプション未対応 | **実装済** |
| 17 | セキュリティ | markdown.ts | image: alt/URL属性値がescAttr未適用（属性値インジェクション） | **実装済** |
| 18 | セキュリティ | markdown.ts | link: href属性値がescAttr未適用 | **実装済** |
| 19 | ロジック | markdown.ts | コードブロックプレースホルダが<p>タグ内に含まれる問題 | **実装済** |
| 20 | エラーハンドリング | autosize.ts | disconnected要素への操作防止チェック欠如 | **実装済** |

> 残り30件以上の精査は次フェーズで実施予定。

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

### 5.1 Ver.3.0 概要

Ver.3.0 系はブログ機能の新規追加とエディタ機能の強化改良を中心とする。
マイナーバージョンの割り当ては未定。

### 5.2 計画項目

| カテゴリ | 改良点 | 状態 |
|---------|--------|:----:|
| セキュリティ | **API キー認証の必須化**（`LICENSE_SYSTEM_RULEBOOK.md` 準拠） | 計画 |
| 新機能 | ブログ機能 | 計画 |
| エディタ | エディタ機能の強化改良 | 計画 |
| 品質 | バグ修正・改良 | 計画 |

> 詳細仕様は各分類ベースルールブックに策定後、本セクションを更新する。

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
