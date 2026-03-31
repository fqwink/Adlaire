# Adlaire Platform - 開発規約

## JavaScript 開発規約

- **TypeScript を全面的に採用する**。JavaScript の直接記述は禁止。
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

## バージョン規則

`Ver.{Major}.{Minor}-{Build}` 形式。

- **Major**: 後方互換性のない変更。Minor を 0 にリセット。
- **Minor**: 後方互換性のある機能追加・改善。
- **Build**: 累積リビジョン番号。**リセット禁止**。すべてのリリースで単調増加。
