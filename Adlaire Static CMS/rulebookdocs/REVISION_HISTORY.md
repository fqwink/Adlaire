# Adlaire Rulebook — 改訂履歴

> 全ルールブックの改訂履歴を一元管理する文書。
> 各ルールブック内には改訂履歴セクションを設けず、本ファイルに集約する。

---

## CHARTER.md（憲章）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 初版 | 2026-04-02 | RULEBOOK_Ver1.md / RULEBOOK_Ver2.md を統合して新設 |
| 改訂 | 2026-04-02 | §10-11 リリース計画を RELEASE_PLAN_RULEBOOK.md に移動、§8 セットアップツールのパスを Core/ / data/ に更新 |
| 改訂 | 2026-04-02 | 対象製品名を Adlaire Static CMS に変更 |
| 改訂 | 2026-04-03 | §8 セットアップツール: メインマスター管理者ログインID入力追加、users.json生成、config.jsonパスワード保存禁止、権限0600追加 |
| 改訂 | 2026-04-04 | §7 開発基盤: TypeScript ビルドランタイムを Node.js/npm/tsc から Deno に変更（Ver.3.0 以降）、deno.json・@deno/emit を正式採用、package.json / tsconfig.json 廃止 |

## DIRECTION_RULEBOOK.md（製品方向性）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.1.0 | 2026-04-01 | 初版 |
| Ver.1.1 | 2026-04-02 | §8.1 責務分離の記述を Core/ ディレクトリ構成に更新、関連文書セクション追加 |
| Ver.1.2 | 2026-04-02 | 対象製品名を Adlaire Static CMS に変更 |
| Ver.1.3 | 2026-04-02 | §7.8-7.10 BaaS関連禁止事項追加、§10 BaaS連携方針規則を新設（BaaS統合設計書から統合）、§11-16 セクション番号繰り下げ、関連文書にBaaS連携Hub仕様書を追加 |
| Ver.1.4 | 2026-04-04 | §7.11 RSS フィード機能の禁止を追加（今後も採用計画なし） |

## EDITOR_RULEBOOK.md（エディタ）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.1.0 | 2026-04-01 | 初版 |
| Ver.1.1 | 2026-04-01 | `ADLAIRE_EDITOR_RULEBOOK.md` から `EDITOR_RULEBOOK.md` へリネーム（ADLAIRE_ プレフィックス除去） |
| Ver.1.2 | 2026-04-02 | 関連文書セクション追加 |
| Ver.1.3 | 2026-04-02 | 対象製品名を Adlaire Static CMS に変更 |
| Ver.1.4 | 2026-04-02 | §13 Ver.2.5 エディタ高度化仕様を新設（#25 Undo/Redo、#26 D&D、#27 Copy&Paste、#28 heading cycle、#29 list toggle、#46 execCommand 置換）、§15 関連文書の参照先を Ver.2.5 に更新 |

## LIFECYCLE_SYSTEM_RULEBOOK.md（ライフサイクルシステム）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.1.0-1 | 2026-04-01 | 初版 |
| Ver.1.0-2 | 2026-04-02 | §5 必須アーキテクチャに現行実装との整合注記追加、関連文書セクション既存確認 |
| Ver.1.0-3 | 2026-04-02 | 対象製品名を Adlaire Static CMS (ASCMS) に変更 |
| Ver.1.0-4 | 2026-04-03 | §9.1 メインマスター管理者ログインID必須化・users.json要件追加、§12 users.jsonセキュリティ要件追記 |

## ARCHITECTURE_RULEBOOK.md（アーキテクチャ）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.3.1 | 2026-04-06 | §4.6 将来方針「Adlaire Framework 採用（時期未定）」を新設。TypeScript → PHP 自動変換機能（Framework 付随）の採用方針・現行 Ver.3.x との整合方針を記録。 |
| Ver.3.0 | 2026-04-06 | **完全フロントエンド化・TypeScript SPA 移行の仕様策定**。§4.4.2 エントリポイントを `editInplace.ts` → `app.ts` に変更。§4.4.4 PHP 側変更（`adminShell()` 新設・`scriptTags()` 廃止）。§4.5 管理 UI SPA アーキテクチャを新設（Shell HTML 方式・CSRF トークン管理・クライアントサイドルーター・認証状態管理・TypeScript モジュール構成・Adlaire Style 統合・PHP 最終責務範囲）。§5 プロジェクト構成全面更新（`ts/pages/` ディレクトリ新設・`assets/` ディレクトリ追加・`admin-ui.php` 廃止・`editInplace.ts` 廃止・`admin.css` 廃止）。§5.1 ZIP リリース構成への反映追加。§11 廃止項目（Ver.3.x 以降）を新設（`admin-ui.php`・`editInplace.ts`・`admin.css`・`scriptTags()`・定数廃止）。§2.2 `admin-ui.php` を廃止済みとしてマーク。§2.3 require 順序から `admin-ui.php` を除外。文書バージョンを Ver.1.9 → Ver.3.0 に更新。 |
| Ver.1.0 | 2026-04-02 | 初版（旧 RULEBOOK_Ver1/Ver2 から移行） |
| Ver.1.1 | 2026-04-02 | Core/ ディレクトリ導入、data/ 統合、静的生成を GENERATOR_RULEBOOK に分離、セキュリティ基盤を Core 責務として明記 |
| Ver.1.2 | 2026-04-02 | 対象製品名を Adlaire Static CMS に変更 |
| Ver.1.3 | 2026-04-02 | §2.2/§5 に Core/license.php・LICENSE_SYSTEM_RULEBOOK.md・Licenses/・REVISION_HISTORY.md を追加 |
| Ver.1.4 | 2026-04-03 | §3.1 data/system/users.json追加、§6.1 認証方式をマスター管理者モデル(メイン+サブ)に変更、マイグレーション規則追記 |
| Ver.1.5 | 2026-04-04 | §4 TypeScript ビルドランタイムを Node.js/npm/tsc から Deno に変更（Ver.3.0 以降）、§5 deno.json・scripts/build.ts をプロジェクト構成に追加、package.json / tsconfig.json 廃止 |
| Ver.1.6 | 2026-04-04 | §7 CI/CD・リリース規約を新設（全自動リリース、ZIP形式、品質チェック: deno check + PHPStan）、§8-10 セクション番号繰り下げ |
| Ver.1.7 | 2026-04-04 | §7.4 配布チャンネルを確定: 公式サイト（Adlaire自身で構築・静的生成、自前サーバーで管理）を唯一の配布チャンネルとする |
| Ver.1.8 | 2026-04-04 | §4.3 ビルドツールを @deno/emit → npm:esbuild に変更（IIFE バンドル対応）、§4.4 ES モジュール移行仕様を新設（バンドル方式: admin.js/public.js、IIFE出力、グローバル公開関数定義、個別scriptタグ廃止）、CI/CD実装ファイル追加（.github/workflows/ci.yml, release.yml, phpstan.neon）、.htaccess更新（deno.json/phpstan.neonアクセス制限）、ES モジュール移行実装（全TSファイルにexport/import導入、ts/public.ts新設、scripts/build.tsバンドル対応、globals.d.ts簡素化） |
| Ver.1.9 | 2026-04-05 | §5 プロジェクト構成を Ver.3.0 実装に合わせて全面更新（ts/public.ts追加、js/admin.js+public.js、scripts/、adlaire-license-server/、.github/、phpstan.neon、license.json、LICENSE_SERVER_RULEBOOK.md追加）|
| Ver.2.0 | 2026-04-05 | §4.1 `npm:` プレフィックスのインポートを全面禁止（セキュリティ観点）、§4.3 ビルドスクリプトを `npm:esbuild` → esbuild バイナリ（`Deno.Command` 経由、`--allow-run=esbuild` 限定）に変更。CI/CD（release.yml）に esbuild バイナリの GitHub Releases からの直接取得ステップを追加 |

## API_RULEBOOK.md（API・データ）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.1.0 | 2026-04-02 | 初版（旧 RULEBOOK_Ver1/Ver2 から移行） |
| Ver.1.1 | 2026-04-02 | §2.6 required_files を Core/ パスに更新、§6.5 admin-ui.php パス修正、ヘッダー移行元記載整理、関連文書セクション追加 |
| Ver.1.2 | 2026-04-02 | 対象製品名を Adlaire Static CMS に変更 |
| Ver.1.3 | 2026-04-03 | §2.1 config.jsonからpasswordキー廃止、§2.7 users.jsonをメイン/サブマスター対応に更新、§4.8 ユーザー管理API新設 |

## GENERATOR_RULEBOOK.md（静的サイト生成）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.1.0 | 2026-04-02 | 初版（ARCHITECTURE_RULEBOOK から分離新設） |
| Ver.1.1 | 2026-04-02 | 対象製品名を Adlaire Static CMS に変更 |

## RELEASE_PLAN_RULEBOOK.md（リリース計画）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.1.0 | 2026-04-02 | 初版（CHARTER.md §10-11 から移動新設） |
| Ver.1.1 | 2026-04-02 | §3-4 リリース履歴・リリース計画の表示順を最新版が上にくるよう変更 |
| Ver.1.2 | 2026-04-02 | 対象製品名を Adlaire Static CMS に変更 |
| Ver.1.3 | 2026-04-02 | §4.6 Ver.2.4 バグ修正50件（PHP 30件 + TS/フロント 20件）を策定 |
| Ver.1.4 | 2026-04-02 | Ver.2.4 バグ修正49件実装完了、§3.1 にリリース履歴追加、現行バージョンを Ver.2.4-36 に更新 |
| Ver.1.5 | 2026-04-02 | Ver.2.4 ARCHITECTURE_RULEBOOK 準拠修正6件（#51-#56: Core/ 移動、data/ 移行、.htaccess 更新）、Ver.2.4-37 に更新 |
| Ver.1.6 | 2026-04-02 | §7 バージョン未配分項目一覧を新設: §7.1 追加機能候補6件（通常優先度）、§7.2 優先度低の採用項目5件、§7.3 運用ルール |
| Ver.1.7 | 2026-04-02 | §6 API キー認証システム計画を承認・LICENSE_SYSTEM_RULEBOOK.md に移管、草案を参照に置換 |
| Ver.1.8 | 2026-04-02 | CLAUDE.md バグ修正ポリシー準拠: Ver.2.8 のエディタ高度化機能を Ver.2.5 に移動、Ver.2.8 を純粋バグ修正バージョンに変更、#46 延期先を Ver.2.5 に修正 |
| Ver.1.9 | 2026-04-02 | Ver.2.5 エディタ高度化6件実装完了、§3.1 にリリース履歴追加、現行バージョンを Ver.2.5-38 に更新 |
| Ver.2.0 | 2026-04-02 | §4.4 Ver.2.6 バグ修正70件（PHP 45件 + TS 25件）を策定 |
| Ver.2.1 | 2026-04-03 | §4.3 Ver.2.7 計画を再構成: #20→Ver.2.6前倒し、#21削除、新規6件(A-F)追加（計14件+バグ修正10件） |
| Ver.2.2 | 2026-04-03 | Ver.2.6 バグ修正70件実装完了、§3.1 にリリース履歴追加、現行バージョンを Ver.2.6-39 に更新 |
| Ver.2.3 | 2026-04-03 | Ver.2.7 機能拡張14件+バグ修正10件実装完了、§3.1 にリリース履歴追加、現行バージョンを Ver.2.7-40 に更新 |
| Ver.2.4 | 2026-04-03 | Ver.2.7 追加バグ修正150件精査・全件実装完了（PHP100件+TS50件、致命的4+重大22+中程度124） |
| Ver.2.5 | 2026-04-03 | §4.2 Ver.2.8 バグ修正300件（PHP200件+TS100件）を策定 |
| Ver.2.6 | 2026-04-03 | Ver.2.8 バグ修正300件全件実装完了、§3.1 にリリース履歴追加、現行バージョンを Ver.2.8-41 に更新 |
| Ver.2.7 | 2026-04-03 | §4.1 Ver.2.9 マスター管理者M1-M10策定、追加品質確定360件策定 |
| Ver.2.8 | 2026-04-03 | Ver.2.9 マスター管理者+品質確定448件全件実装完了、現行バージョンを Ver.2.9-46 に更新 |
| Ver.2.9 | 2026-04-04 | §5 Ver.3.0系リリース計画を暫定承認として策定（Ver.3.0〜3.8）、RSS不採用確定、Deno移行を前提として明記 |
| Ver.3.0 | 2026-04-04 | §5.1 Ver.3.0 に CI/CD 全自動リリース整備・公式サイト構築（唯一の配布チャンネル）を追加 |
| ——統合—— | 2026-04-06 | 本ファイルを統合リポジトリルートの `rulebookdocs/RELEASE_PLAN_RULEBOOK.md`（Part I）に統合・削除。以降は統合ファイルで管理。 |

## LICENSE_SYSTEM_RULEBOOK.md（ライセンスシステム）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.1.0 | 2026-04-02 | 初版（RELEASE_PLAN_RULEBOOK §6 草案から独立） |
| Ver.2.0 | 2026-04-04 | 全面改訂: キー体系を3層構造に変更（システム固有+プライマリー+セカンド+サードパーティー）、セットアップ時APIキー不要、初回ログイン時にシステム固有キー自動生成（ランダム値）、猶予期間3日、管理画面で完結（公式サイト訪問不要）、1アカウント=1キー、メール認証不要、license.json形式に変更、HMAC-SHA256方式を廃止、検証フロー・管理画面UI・セキュリティ要件を全面刷新 |

## LICENSE_SERVER_RULEBOOK.md（ライセンスサーバー）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.1.0 | 2026-04-04 | 初版: 公式サイトAPIキー認証・認可管理システム仕様を新設。システム構成（PHP+SQLite）、API 4エンドポイント（register/verify/renew/third-party）、DB設計（licenses/contracts/audit_log）、キー生成仕様（PRI/SEC/TPK）、管理ダッシュボード、セキュリティ要件、開発Phase 1-4を定義 |
| Ver.1.1 | 2026-04-05 | §1.2 ルールブック規律の全面適用を新設（Adlaireのルールブック規律・バグ修正ポリシー・命名規則を全面適用）、§1.4 ソースコード管理を新設（adlaire-license-server/で当面管理）、§1.5 基本方針にdeclare(strict_types=1)必須を追記 |

## BAAS_HUB_RULEBOOK.md（BaaS連携Hub）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.1.0 | 2026-04-02 | 初版（「Adlaire Static CMSのBaaS連携Hub.md」をルールブック化） |
