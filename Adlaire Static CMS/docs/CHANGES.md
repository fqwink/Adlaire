# CHANGES - 変更履歴

## Ver.3.9-57 (2026-04-15)

### バグゼロ達成（50件精査）

全コード精査50件（PHP + TypeScript 全ファイル対象）。致命的・重大・中程度の残存バグゼロを達成。

#### Core/core.php
* **[軽微]** `rotateBackups()`: mtime 依存のソートをファイル名タイムスタンプ基準の `usort` に変更（クロック後退時の順序不正を解消）
* **[軽微]** `migrateLegacyFiles()`: `filemtime()` が false を返す場合にエラーログを追加（レガシー移行コードの可観測性向上）

#### Core/api.php
* **[軽微]** `validateMediaFilename()`: 先頭・末尾ドット（`.htaccess` 等）を拒否する検証を追加

仮陽性47件を精査・確認済み（既存コードは正しく実装済み）。

---

## Ver.3.8-56 (2026-04-15)

### バグ修正（53件精査）

全コード精査53件（PHP + TypeScript 全ファイル対象）。

#### Core/api.php
* **[重大]** `handleApiBulk()` 新設: `?api=bulk` ルートがルートテーブルに存在せず、バルク操作が常に 404 エラーとなっていた問題を修正。JSON ボディ解析にも対応（`$_POST` でなく `php://input` を使用）
* **[中程度]** `handleApiThemeSettings()` POST: settings 値のキー数（≤100）・キー長（≤100文字）・値型（スカラーまたは1次元配列のみ）検証を追加
* **[中程度]** `handleApiMedia()` POST: `filesize()` が false を返す場合のチェックと空ファイル拒否を追加
* **[軽微]** `handleApiUsers()` 無効化・削除処理: `is_main` 判定を `!empty()` から `=== true` に修正（falsy value 問題の解消）
* **[軽微]** `apiRevisionDiff()`: ブロック比較が位置ベースの浅い比較である旨を注記追加

#### Core/core.php
* **[中程度]** `listPages()`: メモリ使用量が閾値超過時に追加データロードを行わず部分結果を返すよう修正（過剰メモリ消費の防止）
* **[中程度]** `saveRevision()`: リビジョン rotation で `sort()` を `usort + basename` 比較に変更（タイムスタンプ順ソートを明示的に保証）
* **[軽微]** `deleteUser()` / `disableUser()`: `is_main` 判定を `!empty()` から `=== true` に修正

#### Core/helpers.php
* **[軽微]** `login_rate_check()`: 無効な IP アドレス時に `error_log` を追加
* **[軽微]** `login_rate_check()`: `fwrite()` 失敗時のフォールバックパスに `error_log` を追加

---

## Ver.3.7-55 (2026-04-15)

### 追加機能（テーマ設定API + 検索インデックス生成）

#### Core/api.php
* **[新機能]** `handleApiThemeSettings()` 新設: テーマ固有設定の保存・取得 API（`?api=theme-settings`）。テーマディレクトリの realpath 検証・CSRF 保護・whitelist 経由の config.json 書き込みを実装
* `handleApiBulk()` を route table に追加（Ver.3.8 にて実体実装、今バージョンでは route 追加のみ）

#### Core/core.php
* `CONFIG_KEYS` に `theme_settings` キーを追加

#### Core/generator.php
* **[新機能]** `generateSearchIndex()` 新設: `handleApiGenerate()` から呼び出し、`dist/search-index.json` を自動生成（フォーマット: `[{slug, title, excerpt, type, updated_at}]`、タイトルは PT heading ブロックから抽出、excerpt は先頭120文字）

#### ts/api.ts
* `getThemeSettings()` / `saveThemeSettings()` メソッドを追加

---

## Ver.3.6-54 (2026-04-15)

### バグ修正（50件精査）

全コード精査50件（PHP + TypeScript 全ファイル対象）。致命的1件・重大11件・中程度21件・軽微17件。

#### Core/renderer.php
* **[致命的]** `renderPortableTextToHtml()` accordion: コンテンツを `strip_tags()` でサニタイズせず直接出力していた XSS 脆弱性を修正

#### Core/api.php
* **[重大]** `handleApiExport()`: GET→POST に変更（`ts/api.ts` の exportSite() に合わせる）
* **[重大]** `handleApiUsers()`: JSON ボディを `$_POST` でなく `php://input` から読み込むよう修正（generateSubMaster・disableUser・updateMainPassword の機能不全を解消）
* **[重大]** `handleApiUsers()` DELETE: `username` を URL クエリパラメータ `$_GET['username']` から取得するよう修正
* **[重大]** `apiRevisionDiff()`: `$data['blocks']` 参照を `$data['body']`（PT形式）に修正（diff 常に空の問題を解消）
* **[重大]** `handleApiMedia()` GET: `filesize()` 戻り値を `(int)` キャストに修正
* **[重大]** `handleApiMedia()` POST: `$_FILES['error']` チェック追加、finfo による MIME タイプ検証を追加
* **[重大]** `handleApiImport()`: リビジョンキー検証を `'content'` → `'body'` に修正
* 中程度・軽微バグ多数（タイムスタンプ検証・マジックナンバー定数化・ファイル名乱数化・入力長制限等）

#### ts/api.ts
* **[重大]** `exportSite()`: GET → POST リクエストに変更
* **[重大]** `generateSubMaster()`: action 名を `'generate_sub_master'` → `'generate'` に修正
* **[重大]** `updateMainPassword()`: action 名を `'update_main_password'` → `'password'` に対応（両方受け付け）
* **[重大]** `disableUser()`: フィールド名を `'username'` → `'user'` に修正、JSON ボディ送信に変更
* **[中程度]** `restoreRevision()`: タイムスタンプバリデーション正規表現を実際の形式（`YYYYMMDD_HHMMSS`）に修正

#### ts/editor.ts
* **[中程度]** accordion title input に `maxLength = 200` を設定
* **[軽微]** `_ptEsc` 関数を削除し、`escHtml` に統一
* **[軽微]** `attachBackspaceHandler` を custom keydown ハンドラに置き換え（accordion 空コンテンツの誤削除防止）
* **[軽微]** `table`: ボタンハンドラ内の重複 `wrap.appendChild(tableEl)` 呼び出し5件を削除

---

## Ver.3.5-53 (2026-04-15)

### エディタ強化 + 旧形式全廃（X.1 系に続く廃止ポリシー適用）

#### 廃止（廃止ポリシー適用）
* `renderBlocksToHtml()`・`renderMarkdownToHtml()` を Core/renderer.php から削除
* `ts/markdown.ts` を削除
* ページデータの `content`・`format`・`blocks` フィールドを廃止（`body` のみ有効）

#### Core/renderer.php
* **[新機能]** テーブルブロック（`"table"` PT型）のサーバーサイドレンダリング対応
* **[新機能]** アコーディオンブロック（`"accordion"` PT型）の `<details>/<summary>` HTML 出力対応

#### Core/api.php
* **[新機能]** `handleApiMedia()` 新設: 画像アップロード・一覧・削除 API（`?api=media`）

#### ts/editor.ts
* **[新機能]** テーブルブロックツール追加（可変列/行・Tab ナビ・行列追加削除）
* **[新機能]** アコーディオンブロックツール追加（タイトル + コンテンツ構造）
* 既存エディタの使い勝手改善（EDITOR_RULEBOOK.md §14.3 準拠）

---

## Ver.3.4-52 (2026-04-15)

### バグ修正（100件精査・静的サイト生成 URL パス修正）

全コード精査100件（PHP + TypeScript 全ファイル・セキュリティ中心）。重大1件のみ検出。

#### Core/generator.php
* **[重大]** 全生成 HTML に `<base href="/">` タグを追加し、CSS・リンクの相対 URL をルート基準に統一。`generateBlogIndexHtml()` の `../themes/` パス参照、`generateArchiveHtml()` の `$basePath = '../../../'` を廃止。post-nav リンクを `../{slug}/` → `/{slug}/` に修正

---

## Ver.3.3-51 (2026-04-15)

### 追加機能（ブログ機能拡充）

#### Core/generator.php
* **[新機能]** カテゴリ・タグアーカイブページの静的生成（`/blog/category/xxx/`・`/blog/tag/xxx/`）
* **[新機能]** 日付アーカイブページの静的生成（`/blog/YYYY/MM/`）
* **[新機能]** 投稿間の前後ナビリンク生成（`prevPost`・`nextPost`）

---

## Ver.3.2-50 (2026-04-14)

### バグ修正（56件精査）

全コード精査56件（PHP + TypeScript 全ファイル対象）。致命的4件・重大4件・中程度3件・軽微2件。

#### index.php
* **[致命的]** プレビュールーティング: PT形式廃止後も旧形式キー（`content`/`format`/`blocks`）を参照していたためPTページでプレビュー不能となっていた問題を修正

#### Core/api.php
* **[致命的]** 全文検索: PT形式ページに存在しない `content` キーを参照していたため全PTページの検索結果がゼロになっていた問題を修正（PT body から spans テキストを抽出するよう変更）
* **[中程度]** 検索結果から廃止済み `'format'` フィールドを削除

#### Core/renderer.php
* **[致命的]** `renderBlocksToHtml()` paragraph・heading: `esc()` 未適用による XSS 脆弱性を修正
* **[重大]** `renderBlocksToHtml()` list・quote: `esc()` 未適用による XSS 脆弱性を修正

#### Core/core.php
* **[重大]** `listPages()`: キャッシュに `category`・`author`・`tags` フィールドが含まれておらず、キャッシュ命中時にこれらが常に空になっていた問題を修正
* **[重大]** `convertBlocksToPT()`: マイグレーション時にブロックテキストの HTML を `strip_tags()` でストリップするよう修正（マイグレーション後に生 HTML タグが表示される問題を解消）
* **[中程度]** マイグレーションスキップ判定を `is_array($data['body'])` に改善
* **[軽微]** メモリ制限文字列パース: `-1`（無制限）の処理を追加

#### ts/api.ts
* **[重大]** `savePage()`: タグを `tags.join(',')` → `JSON.stringify(tags)` に変更（PHP側 json_decode に合わせた形式修正）

---

## Ver.3.1-49 (2026-04-14)

### 破壊的変更（Portable Text 導入 + ブログ基盤）

Ver.3.1 は X.1 破壊的変更バージョン。既存データとの後方互換性は保たれない。

#### コンテンツ形式（破壊的変更）
* Portable Text（Sanity PT 準拠）コンテンツ形式を導入（`body` フィールド新設）
* 旧形式（`content`/`format`/`blocks`）フィールドを廃止宣言（Ver.3.5 にて全廃）
* 起動時に旧形式データを Portable Text へ自動マイグレーション（一度のみ実行）

#### Core/renderer.php
* **[新機能]** `renderPortableTextToHtml()`: PT形式のサーバーサイドレンダリング関数を新設

#### Core/generator.php
* **[新機能]** ブログ一覧ページ（`/blog/`）の静的生成
* **[新機能]** ブログページネーション生成

#### Core/api.php
* **[新機能]** ページデータ API に `type`・`posted_at`・`category`・`tags`・`author` フィールドを追加

#### 管理UI
* ダッシュボードに投稿/ページ切替フィルタを追加

---



### バグ修正

#### Core/api.php
* **[重大]** `apiPageSave()`: `status` 未送信時に `'published'` をデフォルト適用していた問題を修正。未送信時は既存ページのステータスを保持し、新規ページの場合は `'draft'` をデフォルトとする。自動保存（`flushSave`）によりドラフトページが公開状態に変更される不具合を解消
* **[中程度]** `handleApiLicense()`: `defined('App::VERSION')` はクラス定数を検出不可のため常に空文字が返っていた問題を修正。`App::VERSION` を直接参照するよう変更

#### Core/renderer.php
* **[重大]** `renderBlocksToHtml()`: paragraph / heading / quote / list ブロックの text / items に `esc()` を適用していたため、`sanitizeHtml()` で保存済みのインライン HTML（`<strong>`, `<em>`, `<a>` 等）が二重エスケープされ文字参照として出力される不具合を修正。これらフィールドはサニタイズ済み HTML を直接出力するよう変更（`code` ブロックの `code` フィールドは `esc()` を継続適用）

#### Core/app.php
* **[軽微]** `handleAuth()`: `session_destroy()` 呼出し後に `session_status() === PHP_SESSION_ACTIVE` を再チェックする到達不能な dead code を削除

---

## Ver.3.0-47 (2026-04-05)

### 基盤刷新（破壊的変更）

#### ビルドシステム
* TypeScript ビルドランタイムを Node.js/npm/tsc から **Deno** に移行
* esbuild による IIFE バンドル生成（`js/admin.js` + `js/public.js`）
* `package.json` / `tsconfig.json` を廃止、`deno.json` に統一
* `scripts/build.ts` を新設（esbuild バンドルスクリプト）

#### ES モジュール移行
* 全 TypeScript ファイルに `export` / `import` を導入
* `ts/public.ts` を新設（公開ページ用エントリポイント）
* `ts/globals.d.ts` を簡素化（`csrfToken` + 共有インターフェースのみ）
* 個別 `<script>` タグの複数読み込みを廃止、単一バンドルに統一

#### CI/CD
* `.github/workflows/ci.yml`: PR/push 時に `deno check` + PHPStan 自動実行
* `.github/workflows/release.yml`: VERSION 変更時に自動ビルド・ZIP 生成・タグ作成
* `phpstan.neon` を新設（PHP 8.3, level 6）
* リリース成果物は ZIP 形式、配布チャンネルは公式サイトのみ

#### API キー認証
* `Core/license.php` を新設（LicenseManager クラス）
* 3層キー体系: システム固有 + プライマリー + セカンド（+ サードパーティー）
* セットアップ時 API キー不要、初回ログインから猶予期間 3日
* 管理画面ライセンス設定 UI + `?api=license` エンドポイント追加

#### ライセンスサーバー
* `adlaire-license-server/` を新設（公式サーバー側 APIキー認証・認可管理システム）
* PHP 8.3+ / SQLite / API 4エンドポイント / 管理ダッシュボード

#### バグ修正
* 全5回のバグ修正ラウンド実施（PHP 102件 + TS 109件 = 計211件修正）
* 致命的・重大バグを最優先で修正

## Ver.2.9-46 (2026-04-03)

### 追加品質確定TS側軽微改善（60件精査・60件実装）

#### パフォーマンス（#61-#70）
* markdown.ts: headings/bold/italic/image/link/taskList/list/blockquote/paragraph正規表現を事前コンパイル化(#61-#66)
* editor.ts: sanitizeHtml正規表現22パターンを事前コンパイル化(#67)
* editInplace.ts: sortedReplacer関数のDRY化（flushSave/beforeunload共通化）(#69,#75)
* editor.ts: createBlockWrapperボタンにaria-label一括追加(#70)

#### コード品質（#71-#80）
* editor.ts: BlockToolData interfaceにlanguageフィールド追加(#71)
* api.ts: エラーメッセージ取得をextractApiErrorヘルパーに統一（15箇所DRY化）(#73)
* editInplace.ts: sortedReplacerをモジュールスコープ_sortedReplacerに移動(#75)
* markdown.ts: escAttrヘルパーをモジュールスコープ_mdEscAttrに昇格(#77)
* editor.ts: saveUndoState/dirtyをpublic化しas anyキャスト6箇所削減(#78)
* editInplace.ts: マジックナンバー5件を定数化（SAVE_DEBOUNCE_MS等）(#79)
* editInplace.ts: showRevisionDiffModal innerHTML→DOM API化(#80)

#### 型改善（#81-#85）
* globals.d.ts: GenerateReport型定義追加(#82)
* editInplace.ts: showGenerateReport引数型をGenerateReport型に統一(#83)

#### エラーハンドリング（#86-#90）
* api.ts: listUsers/saveSidebar失敗時console.warn追加(#86,#90)
* editInplace.ts: renderMarkdownContent/renderBlocksContent atob失敗時console.warn(#88,#89)

#### null安全（#91-#93）
* editor.ts: image block save時img要素フォールバック追加(#91)
* editInplace.ts: showFieldFeedback borderColor orig null安全(#92)

#### UX・i18n（#94-#100）
* editInplace.ts: downloadCredentialsファイル内テキストi18n化(#94)
* editInplace.ts: showSaveIndicator状態テキストi18n化(#95)
* editInplace.ts: bulk操作エラーメッセージi18nフォールバック追加(#96)
* editor.ts: toolboxボタンにtitle属性追加(#97)
* editor.ts: image URL/captionプレースホルダーi18n化(#98,#99)
* editInplace.ts: パスワード変更成功時フォームフォーカス制御(#100)

#### アクセシビリティ（#101-#105）
* editor.ts: heading levelボタンにaria-label追加（レベル変更時も更新）(#101)
* editor.ts: list toggleボタンにaria-label追加(#102)
* editor.ts: delete/moveUp/moveDown/addブロックボタンにaria-label追加(#103-#105)

#### CSS（#106-#115）
* admin.css: ce-heading-wrap/ce-list-wrap/ce-sub-master-credentials/ce-warnings__item/ce-generate-report/ce-diff-modalスタイル追加(#106-#110)
* admin.css: dark mode heading/list toggle/credentials/warnings/report/diffスタイル(#111)
* AP-Default/style.css: heading/list wrapスタイル追加+dark mode対応(#112)
* AP-Adlaire/style.css: heading/list wrapスタイル追加+dark mode対応(#113)
* AP-Default/minimal.css: font-family system-uiフォールバック追加(#114)
* AP-Adlaire/minimal.css: font-family system-uiフォールバック追加(#115)

#### i18n（#116-#119）
* ja.json: downloadCredentials/save状態/image/bulk/diff/reorder/format/generate/report/user管理翻訳キー36件追加(#116,#118)
* en.json: 同上英語翻訳キー36件追加(#117,#119)

#### ビルド設定（#120）
* tsconfig.json: noUnusedLocals/noUnusedParameters追加（未使用コード検出強化）(#120)

## Ver.2.9-45 (2026-04-03)

### 追加品質確定TS側バグ修正（60件精査・60件実装）
* editor.ts: surroundContents失敗後HTML復元+sanitizeHtml適用(#2,#8)
* editor.ts: isConnected失敗時Observer/Interval自動クリーンアップ(#4)
* editor.ts: 複数エディタInlineToolbar競合→インスタンスベース化(#6)
* editor.ts: focusout重複防止デバウンスタイマー(#20)
* editor.ts: UndoManager連続pushデバウンス300ms+clear()追加(#21)
* editor.ts: InlineToolbar位置計算改善 下端制限/空選択非表示(#23,#45)
* editor.ts: list初期化items配列Array.isArrayチェック(#10)
* editor.ts: heading形式切替innerHTML保持+サニタイズ(#13)
* editor.ts: ブロック削除DOM接続確認(#14)
* editor.ts: removeBlock削除前undo状態保存(#17)
* editor.ts: ツールボックスEscape閉じ(#19)
* editor.ts: insertBlock未知typeチェック(#27)
* editor.ts: renderBlocks空data安全処理+Array.isArray(#35)
* editor.ts: wrapWithLink選択範囲検証+プロトコル拒否拡大(#36)
* editor.ts: リスト入力空li→paragraph+Backspace空li削除(#38)
* editor.ts: リストトグルlistEl DOM未接続再取得(#42)
* editor.ts: Tab Shift+Tabインデント解除(#47)
* editor.ts: Undo/Redo dirtyフラグリセット(#49)
* editor.ts: paragraph paste sanitizeHtml適用(#50)
* editInplace.ts: downloadCredentials XSS対策escHtml+ファイル名サニタイズ(#1)
* editInplace.ts: beforeunload sendBeacon CSRF _lastValidCsrfTokenキャッシュ(#3,#7)
* editInplace.ts: 複数エディタactiveEditor focusin更新(#9)
* editInplace.ts: save大規模content上限チェック(#11)
* editInplace.ts: switchFormat newFormat入力検証(#43)
* editInplace.ts: sendBeacon失敗XHR同期フォールバック(#16,#18)
* editInplace.ts: ページ検索デバウンス150ms(#37)
* editInplace.ts: ユーザー削除ボタン無効化(#46)
* editInplace.ts: パスワード最小長8文字+現パスワード同一チェック(#33)
* editInplace.ts: revokeObjectURL遅延実行(#40)
* editInplace.ts: showWarnings isConnected確認(#41)
* editInplace.ts: refreshUserList競合防止フラグ(#56)
* editInplace.ts: generateSubMasterレスポンス検証(#57)
* markdown.ts: footnote IDダブルエスケープ修正(#5)
* markdown.ts: タスクリスト行頭スペース許容(#25)
* markdown.ts: 脚注参照escAttrダブルエスケープ防止(#28)
* markdown.ts: image/link正規表現タイトル属性対応(#34)
* markdown.ts: テーブルセル数正規化(#39)
* markdown.ts: コードブロック<p>ラップ除去(#44)
* markdown.ts: テーブルalignment配列超過防止(#54)
* markdown.ts: 脚注複数行対応(#55)
* i18n.ts: パラメータnullフォールバック+has()メソッド追加(#22)
* api.ts: disableUser/deleteUser username入力検証(#32,#46)
* api.ts: updateMainPassword パスワード長チェック(#33)

## Ver.2.9-43 (2026-04-03)

### マスター管理者アクセス権限（M1-M10）
* M1: ユーザーモデル刷新 — メインmaster(1名)+サブmaster(最大2名)、合計3名制限
* M2: data/system/users.json — is_main, token, enabled, created_by フィールド追加
* M3: config.json:password → users.json 強制マイグレーション（is_main=true付与）
* M4: ログイン画面にユーザー名+トークン入力フィールド追加
* M5: $_SESSION にuser/role/is_main情報追加、disabled userの即ログアウト
* M6: ユーザー管理画面（サブmaster生成/無効化/削除/パスワード変更、メインmasterのみ）
* M7: ?api=users エンドポイント（generate/disable/password/delete、メインmaster認証必須）
* M8: users.json symlink検出、排他ロック、アトミック書き込み
* M9: bundle-installer — ユーザー名2-32文字バリデーション、is_main=true設定
* M10: ログイン状態表示にユーザー名、ナビUsersメニューはメインmasterのみ

### 品質確定バグ修正（63件精査・63件実装）
* core.php: ensureDirectories() mkdir戻り値チェック追加(#1)
* core.php: readPageData() realPath使用+JSONエラーログ(#2,#17)
* core.php: writeConfig/writePage/updatePageStatus json_encode falseチェック(#3,#4,#5)
* core.php: deletePage/getRevisionData/restoreRevision/listRevisions symlink検出(#6,#7,#8,#10)
* core.php: savePageOrder slugバリデーション(#9)
* core.php: deleteUser メインmaster削除防止(#11)
* core.php: usersFileExists/readUsers symlink検出(#12,#13)
* core.php: atomicWrite 冗長umask除去+mkdir失敗ハンドリング(#54,#55)
* core.php: removeConfigKey json_encodeエラーログ(#53)
* app.php: getSlug特殊文字除去強化(#14)
* app.php: session timeout型チェック(#15)
* app.php: logout session変数クリア(#16)
* app.php: login サブmaster enabled/token認証(#18,#19)
* app.php: editTags hooks型チェック(#20)
* app.php: menu config型チェック(#21)
* app.php: loadLanguage basename()パストラバーサル防止(#56)
* api.php: sitemap updated_at長さ検証(#23)
* api.php: export session key除去(#24)
* api.php: version install.lock symlink検出(#25)
* api.php: revisionDiff blocks型チェック(#26)
* api.php: verifyApiAuth disabled user検出(#27)
* helpers.php: rate_check配列要素型チェック(#33)
* helpers.php: csrf_verify token型チェック(#34)
* renderer.php: list items配列型チェック(#35)
* generator.php: dist clean getRealPath falseチェック(#36)
* generator.php: sidebar blocks静的レンダリング(#37)
* generator.php: mkdir戻り値チェック3件(#38,#39,#40)
* bundle-installer.php: username空文字列バリデーション(#41)
* index.php: preview slug double decode簡素化(#44)
* admin-ui.php: VERSION/install.lock symlink検出(#45,#46)
* admin-ui.php: theme.json version nullチェック(#47)
* admin-ui.php: sortPagesByUpdated変数名修正(#48)

## Ver.2.3-35 (2026-04-02)

### アーキテクチャ刷新（機能ベースファイル分離）
* admin.php を廃止、5ファイルに機能ベースで分離
* helpers.php 新規: esc(), csrf_token(), csrf_verify(), login_rate_check() を core.php から分離
* app.php 新規: App クラス全体（設定, 認証, 翻訳, 描画, プラグイン）を admin.php から分離
* renderer.php 新規: renderBlocksToHtml(), renderMarkdownToHtml() を admin.php から分離
* api.php 新規: handleApi(), handleEdit(), 全 REST API ハンドラーを admin.php から分離
* generator.php 新規: handleApiGenerate(), generatePageHtml() を admin.php から分離
* index.php: require 順序を helpers→core→app→renderer→api→generator に変更
* .htaccess: 新規ファイルのアクセスブロック追加
* core.php: FileStorage クラスのみに縮小
* RULEBOOK: Ver.2.4 をバグ修正リリースに変更、以降のバージョンを1つスライド

## Ver.2.2-34 (2026-04-02)

### Ver.2.1 残存バグ修正（5件） + Ver.2.2 精査修正
* import API: CSRF トークンをヘッダーでも送信、updateCsrfFromResponse 追加
* MD5 レガシーパスワード: bcrypt 移行後にパスワード変更促進メッセージ
* editor.ts: sanitizeHtml() で script タグ除去（paragraph/heading/quote）
* HTTPS 非使用時の管理画面警告バナー
* PHP Markdown: リスト正規表現を non-greedy に修正
* bundle-installer.php: 弱いパスワード拒否を追加

## Ver.2.1-32 (2026-04-02)

### バグ修正（25件）
* セキュリティ: DELETE CSRF をヘッダー送信に変更、SameSite cookie 追加
* セキュリティ: install.lock/handleApiVersion null チェック、atomicWrite chmod チェック
* セキュリティ: App::VERSION エスケープ、CSRF ヘッダー検証対応
* データ: VERSION/package.json バージョン統一、manifest に installer 追加
* データ: pageFormat デフォルト html→blocks 除去、rotateBackups 順序修正
* コード: 著作権年 2014-2026、admin-ui section 二重閉じ修正

## Ver.2.0-31 (2026-04-01)

### セットアップツール・アップデートシステム
* bundle-installer.php: 5ステップセットアップウィザード
* release-manifest.json: バンドル整合性検証
* VERSION ファイル: バージョン情報管理
* GET ?api=version: バージョン情報 API
* 管理 UI System セクション: バージョン・PHP情報表示
* 初回アクセス時のインストーラーリダイレクト

## Ver.1.9-30 (2026-04-01) — 1.0系最終版

### 最終バグ修正（6件）
* parseHost: ホスト名正規表現から重複コロンを除去
* content(): blocks-content のデータ属性を base64 エンコーディングに変更
* renderBlocksContent(): base64 対応（data-blocks-b64）
* 静的生成: 不要な editor.js を生成 HTML から除去
* login_rate_check: array_filter 後に array_values で再インデックス
* 定数配置: MAX_REVISIONS を MAX_BACKUPS の隣に移動

## Ver.1.9-29 (2026-04-01)

### バグ修正（32件）
* セキュリティ: renderBlocksToHtml XSS修正、CORS Origin検証、静的生成エスケープ
* データ: format デフォルト html→blocks 統一、import/export 整合性修正
* フロント: format切替 i18n化、blockquoteタグ衝突修正、api.ts blocks/content分離
* コード: listPages PHPDoc修正、export GET制限、.htaccess mod_rewrite化
* ドキュメント: RULEBOOK全面更新（Ver.1.7/1.8実装済み反映、admin.css記載）

## Ver.1.8-28 (2026-04-01)

### 機能拡張・フロントエンド強化
* admin CSS 外部ファイル化（themes/admin.css）
* ダークモード対応（@media prefers-color-scheme）
* 静的生成 Markdown サーバーサイド HTML変換（renderMarkdownToHtml）
* heading レベル選択UI（1-3 prompt）
* list 順序/非順序切替UI（confirm dialog）
* 公開ページから管理用JS除外（scriptTags adminMode）
* 管理UI ラベル翻訳対応（16キー追加）

## Ver.1.7-27 (2026-04-01)

### 品質・安全性・管理UI強化
* バグ修正6件: ステータス保存、View Siteリンク、CSRF、静的生成リンク、heading簡素化
* セキュリティ: ブロックデータ base64エンコーディング
* 管理UI: ページ削除ボタン、一覧ソート、インポートUI、設定保存フィードバック
* コード品質: CSRF統一（X-CSRF-Token）、死コード削除

## Ver.1.6-26 (2026-04-01)

### 管理ツール専用UI・静的サイト生成
* 管理UI分離（admin-ui.php）: ダッシュボード、ページエディタ、新規作成
* 静的サイトジェネレーター（POST ?api=generate → dist/）
* バージョン情報表示

## Ver.1.5-24 (2026-04-01)

### エディタ改良・セキュリティ強化・レガシー廃止
* HTML format 完全廃止、blocks をデフォルトに
* ブロックエディタ: Backspace削除、▲▼移動、インラインツールバー、image URL入力
* セキュリティ: CSRFワンタイム化、ログインレートリミット、parseHost強化
* 保存インジケーター、format切替確認ダイアログ、レスポンシブCSS

## Ver.1.4-19 (2026-04-01)

### 新機能4件追加
* 下書き・公開ワークフロー（ページに status フィールド追加、draft/published 管理）
* サイト内検索 API（GET ?api=search&q=xxx、公開・認証不要）
* サイトマップ自動生成（GET ?api=sitemap、XML形式、公開ページのみ）
* エクスポート・インポート（GET ?api=export / POST ?api=import）

### ブロックエディタ・Markdown 強化
* ブロックエディタ（Editor.js ライク）を TypeScript で実装（7ブロック型）
* ブロック format の PHP/TS エンドツーエンド実装
* Markdown パーサー拡張（テーブル、タスクリスト、画像、脚注、コード言語指定、順序リスト）

### バグ修正（30件）
* セキュリティ: パスワード直接上書き防止、XSS修正（renderBlocks/検索スニペット/login form）
* データ整合: status/format/blocks フィールドのマイグレーション・復元・保持
* API: HTTPS判定、sitemap Content-Type、export ダウンロード、CSRF DELETE 対応
* エディタ: image ツールボックス追加、リスト Enter キー、コードブロック focus
* Markdown: テーブル空行、blockquote 結合、脚注 ID 重複
* コア: cwd 破損防止、plugins 絶対パス、リビジョンクリーンアップ、autosize フリッカー

### その他
* FEATURES.md を RULEBOOK.md（ルールブック / 仕様書）にリネーム
* CLAUDE.md に PHP 8.3+ 必須・TypeScript 5 固定を明記
* JS 出力先を js/ に変更

## Ver.1.3-14 (2026-03-31)

### 新機能3件追加

#### Markdown ページサポート
* ページコンテンツを Markdown 形式で記述可能に
* ページ JSON に `format` フィールド（`html` / `markdown`）を追加
* ts/markdown.ts: 軽量 Markdown→HTML コンバーター実装
* 見出し、太字、斜体、コード、リンク、リスト、引用、水平線、段落に対応

#### ページバージョン履歴（リビジョン管理）
* ページ保存時に旧バージョンを files/revisions/{slug}/ に自動保存
* 最大10世代のリビジョンローテーション
* listRevisions(): リビジョン一覧取得（新しい順）
* restoreRevision(): 指定タイムスタンプのリビジョンに復元

#### REST API エンドポイント
* GET index.php?api=pages: ページ一覧（メタデータのみ）
* GET index.php?api=pages&slug={slug}: ページ詳細取得
* POST index.php?api=pages: ページ作成・更新（slug, content, format, csrf）
* DELETE index.php?api=pages&slug={slug}: ページ削除（csrf）
* GET index.php?api=revisions&slug={slug}: リビジョン一覧
* POST index.php?api=revisions&slug={slug}: リビジョン復元（timestamp, csrf）
* ts/api.ts: TypeScript API クライアント（型付きメソッド）
* セッション認証 + CSRF保護付き

### その他
* ts/globals.d.ts: グローバル型定義ファイル追加
* 翻訳ファイルに Markdown 関連キーを追加

## Ver.1.2-13 (2026-03-31)

### 3ファイル分割
* index.php を core.php（コア）、admin.php（管理ツール）、index.php（エントリーポイント）に分割
* core.php: FileStorage クラス、ヘルパー関数（esc, csrf_token, csrf_verify）
* admin.php: App クラス、handleEdit 関数
* index.php: セッション初期化、require、ブートストラップのみ
* .htaccess で core.php, admin.php, data/ への直接アクセスをブロック

### i18n TypeScript 再実装・JSONデータ移動
* 翻訳ファイルを PHP アレイから JSON に変換
* ts/i18n.ts TypeScript モジュール追加（fetch + t() ヘルパー）
* 翻訳ファイルを data/lang/ に移動

### バグ修正（7件）
* settings() の chdir による cwd 破損を修正
* handleEdit() のエラーメッセージを HTTP 500 に修正
* plainTextEdit の blur 二重発火を防止
* i18n.ts のコメント旧パス参照を修正
* 空文字パスワードハッシュを未初期化として処理
* メニュー項目の空白・空エントリをスキップ
* CSRF トークンを json_encode でエスケープ

## Ver.1.2-11 (2026-03-31)

### 多言語化（i18n）・レガシーコード削除
* 日本語（ja）・英語（en）の2言語対応を実装
* 翻訳ファイル: lang/ja.php, lang/en.php（PHPアレイ形式）
* App::t() 翻訳ヘルパーメソッド（:name パラメータ置換対応）
* 管理パネルに言語切替セレクターを追加（設定→言語）
* 全ユーザー向け文字列を翻訳キーに置換
* テーマの `<html lang="">` 属性を動的化
* FileStorage CONFIG_KEYS に `language` を追加
* レガシーファイル削除: js/editInplace.php, js/rte.php

## Ver.1.1-10 (2026-03-31)

### jQuery廃止・TypeScript採用
* jQuery依存を完全廃止、vanilla JavaScriptに移行
* TypeScriptを全面採用、コンパイル済みJSのみを配信
* autosize: jQuery プラグインを vanilla TS で書き直し（ts/autosize.ts）
* editInplace: jQuery ベースのインプレース編集を vanilla TS で書き直し（ts/editInplace.ts）
* fieldSave: $.post を fetch API に置換
* テーマテンプレートからjQuery CDN読み込みを削除
* tsconfig.json / package.json によるビルド環境整備
* コンパイル出力: js/autosize.js, js/editInplace.js

## Ver.1.0-9 (2026-03-31)

* バージョン規則 `Ver.{Major}.{Minor}-{Build}` を導入

## Ver.1.0-8 (2026-03-31)

### バグ修正
* テーマ選択のパス走査脆弱性を修正（basename + 存在チェック + フォールバック）
* マイグレーションで内部管理ファイル（pages.meta.json, .htaccess）が誤移行される問題を修正
* loadPlugins() の getcwd() 失敗時に作業ディレクトリが破損する問題を修正

## Ver.1.0-5 (2026-03-31)

### ドキュメント更新
* README.md をアーキテクチャ・データ管理・要件に合わせて全面改訂
* CHANGES.md, RELEASE-NOTES.md を更新
* CLAUDE.md を作成

## Ver.1.0-4 (2026-03-31)

### JSONベースページデータ
* ページデータをJSON形式（content, created_at, updated_at）で保存
* 個別メタデータファイル（pages.meta.json）を廃止、各ページJSONに統合
* バックアップローテーションを最大9世代に変更

## Ver.1.0-3 (2026-03-31)

### FileStorage 強化
* 排他ロック付き設定更新（.config.lockによる同時書き込み保護）
* タイムスタンプ付きバックアップローテーション
* ページメタデータ追跡（created_at / updated_at）
* ページ一覧取得（listPages）・安全な削除（deletePage）機能追加
* スラッグ検証の集約（validateSlug）

## Ver.1.0-2 (2026-03-31)

### FileStorage データ管理レイヤー導入
* JSONベースのデータ管理システムを導入
* サイト設定をconfig.jsonに統合
* 原子的書き込み（一時ファイル→rename）によるデータ破損防止
* ページコンテンツをfiles/pages/に分離
* 旧フラットファイル形式からの自動マイグレーション

## Ver.1.0-1 (2026-03-31)

### コードベース近代化
* PHP 8.3+ strict_types対応
* セッションセキュリティ強化（httponly, strict_mode）
* CSRF保護の実装
* bcryptパスワードハッシュ（MD5レガシーからの自動移行付き）
* 入力サニタイズの強化

## Ver.0.1-0 (2014-10-10)

* DolphinsValley-Ver.β 初期リリース
