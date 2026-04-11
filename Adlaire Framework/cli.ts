// ============================================================
// Adlaire Framework — cli.ts
// adlaire-fw CLI エントリーポイント
// 使用例: deno run -A jsr:@adlaire/fw/cli <command> [args]
// ============================================================

import type { App } from "./Core/server.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";

function printHelp(): void {
  console.log(`
${BOLD}adlaire-fw${RESET} — Adlaire Framework CLI

${BOLD}使い方:${RESET}
  adlaire-fw <command> [options]

${BOLD}コマンド:${RESET}
  ${CYAN}routes${RESET} [entry]   登録ルート一覧を表示する（デフォルト: ./main.ts）
  ${CYAN}dev${RESET}    [entry]   ファイル監視付き開発サーバーを起動する（デフォルト: ./main.ts）
  ${CYAN}new${RESET}    <name>    プロジェクトテンプレートを生成する
  ${CYAN}check${RESET}  [entry]   型検証を実行する（デフォルト: ./main.ts）

${BOLD}使用例:${RESET}
  deno run -A jsr:@adlaire/fw/cli routes
  deno run -A jsr:@adlaire/fw/cli dev ./server.ts
  deno run -A jsr:@adlaire/fw/cli new my-app
  deno run -A jsr:@adlaire/fw/cli check
`);
}

// ------------------------------------------------------------
// routes コマンド
// ------------------------------------------------------------

async function routesCommand(args: string[]): Promise<void> {
  const entry = args[0] ?? "./main.ts";
  const entryUrl = new URL(entry, `file://${Deno.cwd()}/`).href;

  let mod: Record<string, unknown>;
  try {
    mod = await import(entryUrl);
  } catch (e) {
    console.error(`${RED}エラー: エントリーファイルをインポートできませんでした: ${entry}${RESET}`);
    console.error(e instanceof Error ? e.message : String(e));
    Deno.exit(1);
  }

  const app = (mod["server"] ?? mod["default"]) as App | undefined;
  if (
    !app ||
    typeof app !== "object" ||
    !("router" in app) ||
    typeof (app as { router: unknown }).router !== "object"
  ) {
    console.error(
      `${RED}エラー: server インスタンスが見つかりません。${RESET}`,
    );
    console.error(
      `${DIM}エントリーファイルから server をエクスポートしてください:${RESET}`,
    );
    console.error(`  export const server = createServer();`);
    Deno.exit(1);
  }

  const routes = app.router.routes();

  if (routes.length === 0) {
    console.log(`${YELLOW}登録済みルートはありません。${RESET}`);
    return;
  }

  console.log(`\n${BOLD}登録済みルート (${routes.length} 件)${RESET}\n`);

  const methodWidth = Math.max(
    ...routes.map((r) => r.method.length),
    "METHOD".length,
  );
  const pathWidth = Math.max(
    ...routes.map((r) => r.path.length),
    "PATH".length,
  );

  const header =
    `  ${BOLD}${"METHOD".padEnd(methodWidth)}  ${"PATH".padEnd(pathWidth)}${RESET}`;
  const separator = `  ${DIM}${"-".repeat(methodWidth + pathWidth + 2)}${RESET}`;

  console.log(header);
  console.log(separator);

  for (const route of routes) {
    const methodColor = methodColorOf(route.method);
    console.log(
      `  ${methodColor}${route.method.padEnd(methodWidth)}${RESET}  ${GREEN}${route.path}${RESET}`,
    );
  }
  console.log();
}

function methodColorOf(method: string): string {
  switch (method) {
    case "GET":    return "\x1b[32m"; // green
    case "POST":   return "\x1b[33m"; // yellow
    case "PUT":    return "\x1b[34m"; // blue
    case "DELETE": return "\x1b[31m"; // red
    case "PATCH":  return "\x1b[35m"; // magenta
    default:       return DIM;
  }
}

// ------------------------------------------------------------
// dev コマンド
// ------------------------------------------------------------

async function devCommand(args: string[]): Promise<void> {
  const entry = args[0] ?? "./main.ts";
  console.log(`${BOLD}[adlaire-fw dev]${RESET} ${entry} を --watch で起動します...\n`);

  const cmd = new Deno.Command("deno", {
    args: ["run", "--watch", "--allow-all", entry],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const child = cmd.spawn();
  const status = await child.status;
  Deno.exit(status.code);
}

// ------------------------------------------------------------
// new コマンド
// ------------------------------------------------------------

async function newCommand(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) {
    console.error(`${RED}エラー: プロジェクト名を指定してください。${RESET}`);
    console.error(`  adlaire-fw new <name>`);
    Deno.exit(1);
  }

  const dir = `./${name}`;

  try {
    await Deno.mkdir(dir, { recursive: false });
  } catch {
    console.error(`${RED}エラー: ディレクトリ "${dir}" はすでに存在します。${RESET}`);
    Deno.exit(1);
  }

  const mainTs = `// ${name} — main.ts
import { createServer, json } from "@adlaire/fw";

export const server = createServer();

server.router.get("/", (_ctx) => {
  return json({ message: "Hello, Adlaire Framework!" });
});

if (import.meta.main) {
  const port = Number(Deno.env.get("PORT") ?? 8000);
  server.listen(port, () => console.log(\`Server running on http://localhost:\${port}\`));
}
`;

  const denoJson = JSON.stringify(
    {
      name,
      version: "0.1.0",
      imports: {
        "@adlaire/fw": "jsr:@adlaire/fw@^1.1.0",
      },
      tasks: {
        dev: "deno run -A jsr:@adlaire/fw/cli dev ./main.ts",
        check: "deno run -A jsr:@adlaire/fw/cli check ./main.ts",
        routes: "deno run -A jsr:@adlaire/fw/cli routes ./main.ts",
        start: "deno run --allow-net --allow-env ./main.ts",
      },
    },
    null,
    2,
  ) + "\n";

  const dotEnv = `# 環境変数
PORT=8000
`;

  await Deno.writeTextFile(`${dir}/main.ts`, mainTs);
  await Deno.writeTextFile(`${dir}/deno.json`, denoJson);
  await Deno.writeTextFile(`${dir}/.env`, dotEnv);

  console.log(`\n${GREEN}✓ プロジェクト "${name}" を作成しました。${RESET}\n`);
  console.log(`  ${DIM}cd ${name}${RESET}`);
  console.log(`  ${DIM}deno task dev${RESET}\n`);
}

// ------------------------------------------------------------
// check コマンド
// ------------------------------------------------------------

async function checkCommand(args: string[]): Promise<void> {
  const entry = args[0] ?? "./main.ts";
  console.log(`${BOLD}[adlaire-fw check]${RESET} ${entry} を型検証します...\n`);

  const cmd = new Deno.Command("deno", {
    args: ["check", entry],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const child = cmd.spawn();
  const status = await child.status;

  if (status.success) {
    console.log(`\n${GREEN}型検証が完了しました。エラーはありません。${RESET}`);
  }
  Deno.exit(status.code);
}

// ------------------------------------------------------------
// エントリーポイント
// ------------------------------------------------------------

if (import.meta.main) {
  const [command, ...rest] = Deno.args;

  switch (command) {
    case "routes":
      await routesCommand(rest);
      break;
    case "dev":
      await devCommand(rest);
      break;
    case "new":
      await newCommand(rest);
      break;
    case "check":
      await checkCommand(rest);
      break;
    default:
      if (command) {
        console.error(`${RED}不明なコマンド: "${command}"${RESET}\n`);
      }
      printHelp();
      if (command) Deno.exit(1);
  }
}
