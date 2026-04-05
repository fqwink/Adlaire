# CHANGES - 変更履歴

## Ver.1.0 (2026-04-05)

- 初版仕様書策定
  - 実装準備の前提（CMS最小前提・BaaS実装目的）
  - 実装対象アーキテクチャ（CMS → Hub → BaaS 構成）
  - 8機能領域: Identity / Members / Data / Storage / Events / Generate / Audit / Health & Degrade
  - CMS-Hub 内部契約仕様（署名認証・envelope・エラー体系）
  - Adlaire BaaS API 基本仕様（v0.1 エンドポイント群）
  - イベント契約仕様（標準envelope・配送保証・再送・デッドレター）
  - 認証・会員モデル仕様（Identity/Members分離・ロール・セッション）
  - 監査ログ仕様（改ざん耐性・秘匿方針・保存期間）
  - 開発言語方針: TypeScript / Deno 正式採用
  - 独自フレームワーク方針: 9内製モジュール定義
  - データベース方針: Deno.openKv 正式採用
  - Hub障害対応仕様（縮退・サーキットブレーカー・リトライ）
  - Adlaire BaaS 管理UI仕様（独立UI・3ロール）
