/**
 * Adlaire Framework — CLI ツール
 * FRAMEWORK_RULEBOOK §11 準拠
 *
 * Usage:
 *   deno run -A cli/main.ts <command> [options]
 *
 * Commands:
 *   new <app-name>          新規アプリケーションをテンプレートから作成
 *   dev                     開発サーバーを起動
 *   build [--target=deno|js] 本番ビルドを生成
 *   check                   ルート型整合性・設定ファイルのバリデーション
 *   routes                  登録済みルート一覧を表示
 *   deploy --host=<URL> --project=<ID>  Adlaire Deploy にデプロイをトリガー
 */

import { commandNew } from "./cmd_new.ts";
import { commandDev } from "./cmd_dev.ts";
import { commandCheck } from "./cmd_check.ts";
import { commandRoutes } from "./cmd_routes.ts";
import { commandBuild } from "./cmd_build.ts";
import { commandDeploy } from "./cmd_deploy.ts";

const HELP = `
Adlaire Framework CLI

Usage:
  adlaire <command> [options]

Commands:
  new <app-name>              新規アプリケーションをテンプレートから作成
  dev                         開発サーバーを起動（ファイル変更を監視してリロード）
  build                       本番ビルドを生成
  build --target=deno         Deno Deploy / Adlaire Deploy 向けビルド
  build --target=js           共用サーバ向け JavaScript 出力
  check                       ルート型整合性・設定ファイルのバリデーション
  routes                      登録済みルート一覧を表示
  deploy --host=<URL> --project=<ID>  Adlaire Deploy にデプロイをトリガー
`.trim();

async function main(): Promise<void> {
  const args = Deno.args;

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    Deno.exit(0);
  }

  const command = args[0];
  const restArgs = args.slice(1);

  switch (command) {
    case "new":
      await commandNew(restArgs);
      break;
    case "dev":
      await commandDev(restArgs);
      break;
    case "build":
      await commandBuild(restArgs);
      break;
    case "check":
      await commandCheck(restArgs);
      break;
    case "routes":
      await commandRoutes(restArgs);
      break;
    case "deploy":
      await commandDeploy(restArgs);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      Deno.exit(1);
  }
}

main();
