# Adlaire Platform - 開発規約

> **`RULEBOOK`（ルールブック / 仕様書）は絶対原則である。**
> すべての実装は RULEBOOK の仕様に基づいて行うこと。
> **RULEBOOK に記載のない機能を実装してはならない。**
> 新機能・変更は、**まず RULEBOOK に仕様を策定・記載してから実装に着手すること。**

## ドキュメント配置

- `CLAUDE.md` — 開発規約（プロジェクトルート）
- `README.md` — プロジェクト説明（プロジェクトルート）
- `rulebookdocs/` — ルールブックドキュメントフォルダ（プロジェクトルート）
  - `rulebookdocs/CHARTER.md` — ルールブック憲章（全バージョン共通の最上位原則）
  - `rulebookdocs/RULEBOOK_Ver1.md` — ルールブック Ver.1.x 系（凍結）
  - `rulebookdocs/RULEBOOK_Ver2.md` — ルールブック Ver.2.x 系（現行）
  - `rulebookdocs/ADLAIRE_DIRECTION_RULEBOOK.md` — 製品方向性ルールブック
  - `rulebookdocs/ADLAIRE_EDITOR_RULEBOOK.md` — エディタルールブック
  - `rulebookdocs/ADLAIRE_LIFECYCLE_SYSTEM_RULEBOOK.md` — ライフサイクルシステムルールブック
  - `rulebookdocs/ADLAIRE_ARCHITECTURE_RULEBOOK.md` — アーキテクチャルールブック
  - `rulebookdocs/ADLAIRE_API_RULEBOOK.md` — API・データルールブック
  - ※ `rulebookdocs/` 内に README.md は作成しない（CHARTER.md が構成を管理）
- `docs/` — ドキュメントフォルダ
  - `docs/CHANGES.md` — 変更履歴
  - `docs/RELEASENOTES.md` — リリースノート

## ドキュメント命名規則

- ドキュメントファイル名は**正式名称を大文字**で記述する。
- 区切り文字は**アンダースコア（_）のみ許可**。ハイフン等その他の記号は使用禁止。
- バージョン付きファイルは `Ver` を使用する（`V` 単体は禁止）。
- 例: `CLAUDE.md`, `README.md`, `CHARTER.md`, `CHANGES.md`, `RELEASENOTES.md`, `RULEBOOK_Ver1.md`

## ルールブック管理方針

- ルールブックは**メジャーバージョンごとに独立ファイル**で管理する。
- `rulebookdocs/` フォルダ（プロジェクトルート直下）にルールブックを集約する。
  - `rulebookdocs/CHARTER.md` — 憲章（全バージョン共通の最上位原則）
  - `rulebookdocs/RULEBOOK_Ver1.md` — ルールブック Ver.1.x 系（凍結）
  - `rulebookdocs/RULEBOOK_Ver2.md` — ルールブック Ver.2.x 系（現行）
- 旧バージョンのルールブックは**凍結保存**し、変更しない。
- 新バージョンのルールブックは旧版を基盤として策定する。
- **ルールブックの策定が完了するまで、実装に着手してはならない。**

### ルールブック移行方針

- **Ver.2.3 以降**、ルールブックは**分類ベースまたは機能ベース**で策定・更新する方針に移行する。
- バージョンベースのルールブック（`RULEBOOK_Ver1.md`, `RULEBOOK_Ver2.md`）は**いずれ廃止**する。
- 分類/機能ベースのルールブック（例: `ADLAIRE_DIRECTION_RULEBOOK.md`, `ADLAIRE_EDITOR_RULEBOOK.md`, `ADLAIRE_LIFECYCLE_SYSTEM_RULEBOOK.md`）が正式な仕様管理方式となる。
- 移行完了まではバージョンベースと分類ベースが併存する。

## PHP ファイル構成

- **PHP バージョンは 8.3 以上を必須**とする（`declare(strict_types=1)` 使用）。
- `index.php` — エントリーポイント。セッション初期化、require、ルーティング。
- `helpers.php` — ヘルパー関数。esc, csrf_token, csrf_verify, login_rate_check。
- `core.php` — コア基盤。FileStorage クラス。
- `app.php` — App クラス。設定、認証、翻訳、描画、プラグイン。
- `renderer.php` — サーバーサイド描画。renderBlocksToHtml, renderMarkdownToHtml。
- `api.php` — REST API ハンドラー。handleApi, handleEdit, 全エンドポイント。
- `generator.php` — 静的サイト生成。handleApiGenerate, generatePageHtml。
- `admin-ui.php` — 管理 UI テンプレート。
- `index.php` 以外の PHP ファイルへの直接HTTPアクセスは `.htaccess` で禁止。

## JavaScript 開発規約

- **TypeScript を全面的に採用する**。JavaScript の直接記述は禁止。
- **TypeScript バージョンは 5 系に固定**（`~5.8`）。メジャーバージョン 6 以降への更新は別途検討。
- すべての JavaScript は **TypeScript からのコンパイル生成を義務化** する。
- TypeScript ソースは `ts/` ディレクトリに配置する。
- コンパイル済み JavaScript は `js/` に出力される。
- `npm run build`（`tsc`）でコンパイルを実行する。
- `js/` 内のファイルを手動編集を禁止する。

## ビルド手順

```bash
npm install       # 初回のみ
npm run build     # TypeScript → JavaScript コンパイル
```

## 廃止ポリシー

- 機能・形式の廃止に伴う変更時、**レガシーソースコードの互換性維持は行わない**。
- 廃止決定後は該当コード（分岐・フォールバック・変換ロジック等）を即座に削除する。
- 旧形式データのマイグレーションは廃止時に一度だけ実施し、以降は旧形式を認識しない。

## バージョン規則

`Ver.{Major}.{Minor}-{Build}` 形式。

- **Major**: 後方互換性のない変更。Minor を 0 にリセット。
- **Minor**: 後方互換性のある機能追加・改善。
- **Build**: 累積リビジョン番号。**リセット禁止**。すべてのリリースで単調増加。
