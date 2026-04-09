/**
 * adlaire dev
 * FRAMEWORK_RULEBOOK §11 準拠
 *
 * 開発サーバーを起動する（ファイル変更を監視してリロード）。
 */

export async function commandDev(_args: string[]): Promise<void> {
  const configPath = `${Deno.cwd()}/adlaire.config.ts`;

  try {
    await Deno.stat(configPath);
  } catch {
    console.error(
      "Error: adlaire.config.ts not found in current directory",
    );
    Deno.exit(1);
  }

  // main.ts を --watch モードで起動する
  const mainPath = `${Deno.cwd()}/main.ts`;

  try {
    await Deno.stat(mainPath);
  } catch {
    console.error("Error: main.ts not found in current directory");
    Deno.exit(1);
  }

  console.log("Starting Adlaire dev server (watch mode)...");

  const command = new Deno.Command("deno", {
    args: [
      "run",
      "--allow-read",
      "--allow-net",
      "--watch",
      mainPath,
    ],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const process = command.spawn();
  const status = await process.status;
  Deno.exit(status.code);
}
