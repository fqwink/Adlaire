# Adlaire Style — 改訂履歴

> ルールブック改訂履歴を管理する文書。

---

## STYLE_RULEBOOK.md（スタイルフレームワーク仕様）

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| Ver.1.2 | 2026-04-06 | **機能改良 5件・新規コンポーネント 22件・ユーティリティ拡充**を仕様策定。[改良] A-1: ダークモードセマンティックカラー全 15 トークンにダーク値を追加（§3.2.2・§9.2）。A-2: レスポンシブブレークポイントを sm/md/lg/xl の 4 段階に拡充（§6.6）。A-3: Form コンポーネントに Checkbox・Radio・File Input・Range・Color Input を追加（§7.5.2〜§7.5.5）。A-4: ユーティリティクラスにカラーテキスト・Flexbox 補完・Overflow・Position/z-index・サイズ・Cursor 等を追加（§8.3〜§8.8）。A-5: `--shadow-sm` のダークモード値を §9.2 に追加。[新規コンポーネント] B-1: Tooltip（§7.13）、B-2: Pagination（§7.14）、B-3: Progress Bar（§7.15）、B-4: Tabs（§7.16）、B-5: Skeleton（§7.17）、B-6: Toggle/Switch（§7.18）、B-7: Stepper（§7.19）、C-1: Accordion/Collapse（§7.20）、C-2: Toast/Notification（§7.21）、C-3: Stat Card/Metric（§7.22）、C-4: Timeline（§7.23）、C-5: Status Indicator（§7.24）、C-6: Empty State（§7.25）、C-7: Avatar（§7.26）、C-8: Divider（§7.27）、C-9: Keyboard Shortcut（§7.28）、C-10: File Tree（§7.29）、C-11: Split Pane/Editor Layout（§7.30）。[その他] C-12: Sidebar Collapsed 状態を §6.5 に追加。C-13: 印刷スタイルを §14 として新設（`src/print.css`）。C-14: Aspect Ratio ユーティリティを §8.9 に追加。C-15: Line Clamp ユーティリティを §8.10 に追加。§2 ディレクトリ構成・§10.2 ビルド順・§11 開発フェーズ更新。 |
| Ver.1.1 | 2026-04-06 | 現行プロジェクト全 CSS 要素の調査結果を反映: ブランドカラー確定（`#00a968`・`#11aabb`）、セマンティックカラーに bg/text/border の 3 トークン体系を採用、ダークモード実測値確定（`#1a1a2e` 等）、フォント確定（Verdana・Meiryo・Hiragino）、ディレクトリ構成に header.css/nav.css/breadcrumb.css/log-box.css/info-row.css を追加、レスポンシブ（768px ブレークポイント）追加、サイドバーレイアウト追加、Badge にステータスバリアント13種追加（running/stopped/failed/starting/deployed/deploy_failed/healthy/unhealthy/unknown/published/draft）、Modal に Diff Viewer クラス追加、Log Box コンポーネント追加、Info Row コンポーネント追加、Button に icon/outline バリアント追加 |
| Ver.1.0 | 2026-04-06 | 初版: 製品定義・設計原則・ディレクトリ構成・デザイントークン（カラー/スペーシング/タイポグラフィ/ボーダー/シャドウ/トランジション）・リセット CSS・タイポグラフィ・レイアウトユーティリティ・コンポーネント7種（Button/Form/Card/Badge/Table/Alert/Modal）・ユーティリティクラス・ダークモード・配布形式・開発フェーズ Phase 0-6 を定義 |
