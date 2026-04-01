# Adlaire Platform - 開発規約

> 詳細仕様は `RULEBOOK.md`（ルールブック / 仕様書）を参照。
> すべての実装は RULEBOOK.md に基づいて行うこと。

## PHP ファイル構成

- **PHP バージョンは 8.3 以上を必須**とする（`declare(strict_types=1)` 使用）。
- `index.php` — エントリーポイント。セッション初期化と require のみ。
- `core.php` — コア基盤。FileStorage クラス、ヘルパー関数。
- `admin.php` — 管理ツール。App クラス、handleEdit 関数。
- `core.php` / `admin.php` への直接HTTPアクセスは `.htaccess` で禁止。

## JavaScript 開発規約

- **TypeScript を全面的に採用する**。JavaScript の直接記述は禁止。
- **TypeScript バージョンは 5 系に固定**（`~5.8`）。メジャーバージョン 6 以降への更新は別途検討。
- すべての JavaScript は **TypeScript からのコンパイル生成を義務化** する。
- TypeScript ソースは `ts/` ディレクトリに配置する。
- コンパイル済み JavaScript は `js/dist/` に出力される。
- `npm run build`（`tsc`）でコンパイルを実行する。
- `js/dist/` 内のファイルを手動で編集してはならない。

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
