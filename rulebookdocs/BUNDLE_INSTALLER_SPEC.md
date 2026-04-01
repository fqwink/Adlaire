# [Adlaire](https://github.com/fqwink/Adlaire) Ver.2.0 `bundle-installer.php` 仕様書 v1.0

- 文書名: Adlaire Ver.2.0 bundle-installer.php 仕様書
- 文書版数: v1.0
- 文書種別: 要件定義 / 実装仕様
- 対象バージョン: Adlaire Ver.2.0系
- 対象成果物: `bundle-installer.php`
- 想定配布形態: 公式リリースZIP同梱
- 言語: ja-JP
- ステータス: Draft for Review
- 作成日: 2026-04-01

---

## 1. 文書情報

本書は、[Adlaire](https://github.com/fqwink/Adlaire) Ver.2.0系に導入する、公式リリースZIP専用セットアップツール `bundle-installer.php` の仕様を定義するものである。対象は、実装担当、レビュー担当、プロダクト責任者、および将来的な保守担当とする。 [Source](https://github.com/fqwink/Adlaire)

---

## 2. 背景と目的

[Adlaire](https://github.com/fqwink/Adlaire) は、フラットファイルベースのCMSフレームワークであり、データベース不要、Markdown対応、ブロックエディタ、多言語化、静的サイト生成、REST API、リビジョン管理、bcrypt認証、CSRFワンタイムトークン、レートリミットを備える。実行要件として PHP 8.3+、Apache(mod_rewrite)、および `files/` ディレクトリへの書き込みが必要であり、初期運用導線として `?login` と `?admin` が用意されている。 [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)

現状の導入は、リリース物の配置、権限設定、ビルド済み資産の確認、初期ログイン、初期パスワード変更などを手作業で行う前提である。この導入作業を、**公式リリースバンドル専用の検証付きセットアップツール**として1ファイル化し、共有サーバーや簡易ホスティング環境でも安全かつ短時間で初期導入できるようにすることが本仕様の目的である。 [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)

---

## 3. 対象読者

本書の対象読者は以下とする。

- 実装担当エンジニア
- レビュアー
- リリース管理担当
- 品質保証担当
- 将来の保守担当

---

## 4. 用語定義

| 用語 | 定義 |
|---|---|
| Adlaire | フラットファイルベースのCMSフレームワーク本体 |
| bundle-installer | 公式リリースZIP専用の初期セットアップ用PHP単一ファイル |
| 公式リリースバンドル | Adlaire Ver.2.0系として配布される検証済み成果物一式 |
| manifest | 配布物の整合性確認に用いる `release-manifest.json` |
| install lock | セットアップ完了後の再実行防止情報 |
| 初期化 | サイト設定・管理者作成・必要ディレクトリ作成等の導入処理 |
| 非公式バンドル | manifest 不整合、必須ファイル欠落、または改変済み配布物 |

---

## 5. 前提条件

[Adlaire](https://github.com/fqwink/Adlaire) の公開情報から、リポジトリには `index.php`, `core.php`, `admin.php`, `admin-ui.php`, `.htaccess`, `themes`, `data/lang`, `js`, `package.json`, `tsconfig.json` 等が存在し、PHP本体を中心に、テーマ・言語データ・ビルド済みフロント資産を含む構成であることが確認できる。 [Source](https://github.com/fqwink/Adlaire)

また、READMEでは PHP 8.3+、Apache(mod_rewrite)、Node.js 18+（ビルド時のみ）、`files/` 書き込み権限、`?login` 経由の初期ログイン、`?admin` 経由の管理画面導線が明示されている。したがって、本ツールは**本番導入時に Node.js を不要とする代わりに、ビルド済みリリース物が配置済みであること**を前提とする。 [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)

---

## 6. 配布バンドル構成

### 6.1 想定構成

```text
Adlaire-v2.x-release/
├─ bundle-installer.php
├─ release-manifest.json
├─ VERSION
├─ index.php
├─ core.php
├─ admin.php
├─ admin-ui.php
├─ .htaccess
├─ themes/
├─ data/
│  └─ lang/
├─ js/
│  └─ dist/
├─ dist/                  # 方針により同梱推奨
├─ files/                 # 初回生成でも可
├─ README.md
└─ Licenses/
```

### 6.2 配布ポリシー

- `bundle-installer.php` は**公式リリースZIPにのみ同梱**する
- 開発用ソース配布物には原則含めない
- 本番リリースでは**ビルド済み資産を必ず含める**
- 本番導入時に `npm install` / `npm run build` を要求しない

READMEでは Node.js 18+ がビルド時要件として記載されているため、本ツールはビルド工程を担わず、**配布済み成果物を検証・初期化する役割に限定**する。 [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)

---

## 7. スコープ / 非スコープ

### 7.1 スコープ

`bundle-installer.php` は以下を担当する。

1. 公式リリースバンドルの整合性確認
2. 実行環境診断
3. ディレクトリ・権限検査
4. サイト初期設定
5. 初期管理者作成
6. 必要データファイル生成
7. インストールロック生成
8. 完了後の導線表示
9. installer削除または無効化案内

### 7.2 非スコープ

以下は本ツールの責務外とする。

- ZIPアップロード機能
- ZIP自動展開機能
- 1.x → 2.0 のアップグレードマイグレーション
- Node.js ビルド
- Gitクローン環境のセットアップ
- マルチサイト対応
- CLIインストーラ機能
- 外部サービス連携設定

---

## 8. 画面遷移

### 8.1 画面一覧

| Step | 画面名 | 目的 |
|---|---|---|
| 0 | Welcome / Release Check | バンドル確認、バージョン表示 |
| 1 | Environment Check | 必須環境・権限・ファイル存在確認 |
| 2 | Site Configuration | 初期設定入力 |
| 3 | Install Execution | 初期化処理実行 |
| 4 | Finish / Security Notice | 完了通知、次アクション提示 |

### 8.2 フロー概要

```text
Welcome
  ↓
Release Check
  ↓
Environment Check
  ↓
Site Configuration
  ↓
Install Execution
  ↓
Finish / Security Notice
```

### 8.3 画面別要点

#### Step 0: Welcome / Release Check
- 製品名
- バージョン
- リリースチャネル
- バンドル整合性状態
- インストーラ説明
- 続行可否

#### Step 1: Environment Check
- PHPバージョン
- `files/` 書き込み可否
- 必須ファイル存在確認
- `themes/`, `data/lang/`, `js/` 確認
- Apache / rewrite 関連の警告

#### Step 2: Site Configuration
- サイト名
- デフォルト言語
- タイムゾーン
- ベースURL（任意）
- 管理者ユーザー名
- 管理者パスワード
- パスワード確認
- 初期サンプルページ作成有無

#### Step 3: Install Execution
- 必要ディレクトリ生成
- 管理者作成
- 設定保存
- install lock 作成
- 結果表示

#### Step 4: Finish / Security Notice
- 成功 / 失敗
- `?login` への導線
- `?admin` への導線
- installer 削除案内
- セキュリティ注意表示

READMEの導線上、ログインURLは `?login`、管理画面URLは `?admin` を前提とする。 [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)

---

## 9. 機能要件

以下、要件は MUST / SHOULD / MAY で定義する。

### 9.1 バンドル識別

| ID | 要件 | 優先度 |
|---|---|---|
| FR-001 | `release-manifest.json` が存在することを確認する | MUST |
| FR-002 | `VERSION` が存在することを確認する | MUST |
| FR-003 | `index.php`, `core.php`, `admin.php`, `admin-ui.php` の存在を確認する | MUST |
| FR-004 | `themes/`, `data/lang/`, `js/` の存在を確認する | MUST |
| FR-005 | manifest に記載された必須ファイルの整合性を検証する | MUST |
| FR-006 | 検証失敗時はセットアップを停止する | MUST |
| FR-007 | 不足・不整合ファイル一覧を画面表示する | SHOULD |

### 9.2 環境チェック

| ID | 要件 | 優先度 |
|---|---|---|
| FR-010 | PHP 8.3以上を必須とする | MUST |
| FR-011 | セッション利用可否を確認する | MUST |
| FR-012 | `password_hash()` 利用可否を確認する | MUST |
| FR-013 | `files/` に書き込み可能か確認する | MUST |
| FR-014 | `files/` が存在しない場合、作成可能なら作成を試みる | SHOULD |
| FR-015 | Apache / mod_rewrite 前提の注意を表示する | SHOULD |
| FR-016 | HTTPS未使用時に警告を表示する | SHOULD |

### 9.3 設定入力

| ID | 要件 | 優先度 |
|---|---|---|
| FR-020 | サイト名を入力できること | MUST |
| FR-021 | デフォルト言語を選択できること | MUST |
| FR-022 | 管理者ユーザー名を入力できること | MUST |
| FR-023 | 管理者パスワードを入力できること | MUST |
| FR-024 | パスワード確認欄を持つこと | MUST |
| FR-025 | 初期サンプルページ作成有無を選択できること | MAY |
| FR-026 | タイムゾーンを設定できること | SHOULD |
| FR-027 | ベースURLを設定できること | MAY |

### 9.4 インストール実行

| ID | 要件 | 優先度 |
|---|---|---|
| FR-030 | 初期設定を保存すること | MUST |
| FR-031 | 管理者アカウントを作成すること | MUST |
| FR-032 | パスワードをハッシュ化して保存すること | MUST |
| FR-033 | install lock を生成すること | MUST |
| FR-034 | 再実行時は lock を検出して初期化を停止すること | MUST |
| FR-035 | 完了後に `?login` と `?admin` を表示すること | MUST |
| FR-036 | installer 削除案内を表示すること | MUST |
| FR-037 | 自己削除を試行できること | SHOULD |
| FR-038 | 自己削除失敗時に手動削除方法を表示すること | MUST |

### 9.5 ログ・監査

| ID | 要件 | 優先度 |
|---|---|---|
| FR-040 | セットアップ開始・完了・失敗を記録できること | SHOULD |
| FR-041 | 機密情報をログに出力しないこと | MUST |
| FR-042 | 実行時刻を記録すること | SHOULD |
| FR-043 | 実行元IPを記録できること | MAY |

---

## 10. 入力項目定義

| 項目名 | キー | 型 | 必須 | 備考 |
|---|---|---|---|---|
| サイト名 | `site_name` | string | Yes | 表示名 |
| デフォルト言語 | `default_locale` | enum | Yes | `ja` / `en` |
| タイムゾーン | `timezone` | string | No | 初期値可 |
| ベースURL | `base_url` | string | No | 自動推定可 |
| 管理者ユーザー名 | `admin_username` | string | Yes | 将来変更可 |
| 管理者パスワード | `admin_password` | string | Yes | 平文保存禁止 |
| パスワード確認 | `admin_password_confirm` | string | Yes | 一致必須 |
| サンプル生成 | `sample_content_enabled` | bool | No | 任意 |

---

## 11. バリデーション

### 11.1 基本バリデーション

| 項目 | 条件 | レベル |
|---|---|---|
| site_name | 空不可、前後空白除去 | MUST |
| default_locale | `ja` または `en` | MUST |
| admin_username | 空不可、予約語制限可 | MUST |
| admin_password | 最小長を定義 | MUST |
| admin_password_confirm | `admin_password` と一致 | MUST |
| base_url | URL形式チェック | MAY |
| timezone | 許可リスト内 | SHOULD |

### 11.2 パスワード要件案

- 最低8文字以上
- 推奨: 英大小文字 + 数字 + 記号
- `admin` などの弱い値を警告

READMEでは初期ログインパスワード `admin` が案内されているため、Ver.2.0 ではセットアップ時点で安全な管理者パスワードを再定義する設計が望ましい。 [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)

---

## 12. エラーハンドリング

### 12.1 エラー分類

| 種別 | 内容 | 挙動 |
|---|---|---|
| BundleError | manifest 不在、不整合、必須ファイル欠落 | 即停止 |
| EnvError | PHP不足、権限不足、書込不可 | 即停止 |
| InputError | 入力不備、パスワード不一致 | 再入力 |
| InstallError | 保存失敗、lock作成失敗 | 中断・状態表示 |
| SecurityWarning | HTTPS未使用、installer残置 | 完了後警告 |

### 12.2 表示方針

- 技術者向けの詳細情報と、一般利用者向けの説明を分離する
- ファイルパスや内部例外は必要最小限に留める
- 機密情報をエラー表示しない

### 12.3 メッセージ例

- 「この配布物は公式リリースバンドルとして認識できません」
- 「PHP 8.3 以上が必要です」
- 「`files/` への書き込み権限がありません」
- 「インストールは完了しましたが、installer の削除に失敗しました」

---

## 13. セキュリティ要件

[Adlaire](https://github.com/fqwink/Adlaire) READMEでは、bcrypt認証、CSRFワンタイムトークン、レートリミットがセキュリティ機能として明示されている。`bundle-installer.php` もこの設計思想と整合する必要がある。 [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)

### 13.1 必須要件

| ID | 要件 | 優先度 |
|---|---|---|
| SEC-001 | POST操作にCSRF対策を行う | MUST |
| SEC-002 | パスワードは平文保存しない | MUST |
| SEC-003 | HTML出力は適切にエスケープする | MUST |
| SEC-004 | セットアップ完了後、再実行を防止する | MUST |
| SEC-005 | installer 残置リスクを明示する | MUST |
| SEC-006 | エラーやログに機密値を出力しない | MUST |

### 13.2 推奨要件

| ID | 要件 | 優先度 |
|---|---|---|
| SEC-010 | HTTPSを推奨表示する | SHOULD |
| SEC-011 | 繰り返し失敗時に待機制御を設ける | SHOULD |
| SEC-012 | 実行IPを記録する | MAY |
| SEC-013 | 自己削除機能を実装する | SHOULD |

---

## 14. データ保存仕様

### 14.1 `release-manifest.json`

```json
{
  "product": "Adlaire",
  "channel": "release",
  "version": "2.0.0",
  "bundle_format": 1,
  "build_includes": {
    "dist": true,
    "js_dist": true,
    "themes": true,
    "lang": true
  },
  "required_files": [
    "index.php",
    "core.php",
    "admin.php",
    "admin-ui.php",
    ".htaccess",
    "themes",
    "data/lang",
    "js"
  ],
  "checksums": {
    "index.php": "sha256:...",
    "core.php": "sha256:...",
    "admin.php": "sha256:..."
  }
}
```

### 14.2 `install.lock`

```json
{
  "installed": true,
  "product": "Adlaire",
  "version": "2.0.0",
  "installed_at": "2026-04-01T12:00:00Z",
  "installer": "bundle-installer.php",
  "installer_version": "1.0.0"
}
```

### 14.3 保存先案

| ファイル | 保存先案 | 備考 |
|---|---|---|
| install lock | `files/system/install.lock` | 再実行防止 |
| setup log | `files/system/install.log` | 任意 |
| site config | 既存設定体系に合わせる | 実装で確定 |

---

## 15. ログ・監査

### 15.1 記録対象

- セットアップ開始時刻
- セットアップ完了時刻
- 結果ステータス
- バージョン
- 実行元IP（任意）
- manifest検証結果

### 15.2 非記録対象

- パスワード平文
- CSRFトークン
- セッショントークン
- 秘匿設定値

### 15.3 ログ方針

- 監査用途と障害解析用途を両立する
- ただし共有サーバー配慮のため過剰な詳細は避ける
- MVPでは簡易ログでよい

---

## 16. 受け入れ基準

### 16.1 必須受け入れ条件

- 公式リリースバンドル以外では起動できない
- PHP 8.3未満では停止する
- `files/` 書込不可なら停止する
- サイト名・言語・管理者情報を保存できる
- パスワードはハッシュ化される
- install lock が生成される
- 完了後に `?login` / `?admin` 導線が表示される
- installer 削除案内が表示される

### 16.2 品質条件

- 1ファイルで完結する
- 共有レンタルサーバーで動作可能
- エラー文が分かりやすい
- 再実行で破壊的初期化をしない

---

## 17. MVP と将来拡張

### 17.1 MVP

- manifest検証
- PHP / 書込権限チェック
- 初期設定フォーム
- 管理者作成
- install lock
- 完了画面
- installer削除案内

### 17.2 将来拡張

- ZIPアップロードと自己展開
- 電子署名検証
- CLIモード
- 詳細診断 (`doctor.php`) 連携
- 既存環境との差分確認
- セットアップレポート出力
- 多言語追加

---

## 18. 実装上の推奨方針

### 18.1 1ファイル内部構造

1ファイル構成を維持しつつ、内部は責務分離する。

- `detect_*` : 環境検査
- `load_*` : manifest / version 読込
- `validate_*` : 入力検証
- `install_*` : 初期化処理
- `render_*` : HTML描画
- `security_*` : CSRF / escape / password

### 18.2 セッション利用

- ステップ管理
- CSRFトークン保持
- フォーム再表示時の入力保持

### 18.3 書き込み戦略

- 一時ファイル書き込み
- 成功後に rename
- 可能な範囲でロールバック

### 18.4 UI方針

- 1カラム
- ステップ表示
- PASS / WARNING / ERROR の可視化
- モバイルでも操作可能
- シンプルで管理UI寄りの見た目

---

## 19. リスクと未決事項

### 19.1 リスク

| リスク | 内容 | 対応方針 |
|---|---|---|
| 自己削除失敗 | 共有サーバーでファイル削除不可 | 手動削除案内 |
| rewrite 未設定 | 期待URLで動かない | 環境警告 |
| 配布物不整合 | 手動改変済みZIP | manifest停止 |
| 再実行事故 | 既存環境上書き | install lockで防止 |
| 設定保存先未確定 | Ver.2.0内部構造との最終整合必要 | 実装前確定 |

### 19.2 未決事項

- 設定ファイルの正式保存場所
- `dist/` の同梱有無を正式方針化するか
- 初期サンプルページ仕様
- 自己削除の実装方式
- install log をMVPに含めるか
- ベースURL自動推定の扱い

---

## 20. 参考情報

[Adlaire](https://github.com/fqwink/Adlaire) README では、フラットファイルCMS、Markdown、ブロック編集、静的出力、REST API、多言語化、リビジョン管理、bcrypt認証、CSRF、レートリミット、PHP 8.3+、Apache(mod_rewrite)、Node.js 18+（ビルド時のみ）などが確認できる。 [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)

ライセンスは独自の Adlaire License であり、利用形態に応じて別途確認が必要である。 [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/Licenses/LICENSE_Ver.1.0)

### 参考URL
- https://github.com/fqwink/Adlaire
- https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md
- https://raw.githubusercontent.com/fqwink/Adlaire/main/Licenses/LICENSE_Ver.1.0

---

## 21. 実装開始チェックリスト

### 21.1 プロダクト側
- [ ] Ver.2.0 の正式バンドル構成を確定した
- [ ] `release-manifest.json` のスキーマを確定した
- [ ] 設定保存先を確定した
- [ ] install lock 保存先を確定した
- [ ] `dist/` 同梱方針を確定した

### 21.2 実装側
- [ ] PHP 8.3+ 前提で構文設計した
- [ ] セッションとCSRF対策を組み込んだ
- [ ] manifest検証を実装した
- [ ] 環境チェックを実装した
- [ ] 設定フォームとバリデーションを実装した
- [ ] 管理者作成処理を実装した
- [ ] install lock 生成処理を実装した
- [ ] 完了画面と削除案内を実装した

### 21.3 QA側
- [ ] 正常系: 新規導入が完了する
- [ ] 異常系: PHP不足で停止する
- [ ] 異常系: 書込不可で停止する
- [ ] 異常系: manifest不整合で停止する
- [ ] 異常系: パスワード不一致で再入力になる
- [ ] 再実行時: install lock により停止する
- [ ] 完了後: `?login` と `?admin` が案内される

---

## 22. 結論

`bundle-installer.php` は、単なるインストーラではなく、**公式リリースZIPを安全に初期化するための検証付きブートストラッパー**として定義するのが適切である。これにより、導入の簡易化、配布品質の均一化、誤配布や不完全配布の早期検出、再実行事故防止、サポート負荷低減を同時に実現できる。 [Source](https://raw.githubusercontent.com/fqwink/Adlaire/main/README.md)
