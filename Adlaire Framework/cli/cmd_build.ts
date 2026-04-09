/**
 * adlaire build
 * FRAMEWORK_RULEBOOK §11 / §10.3 準拠
 *
 * 本番ビルドを生成する。
 *
 * Options:
 *   --target=deno   Deno Deploy / Adlaire Deploy 向けビルド（build/deno/）
 *   --target=js     共用サーバ向け JavaScript 出力（build/js/）
 */

export async function commandBuild(args: string[]): Promise<void> {
  const targetArg = args.find((a) => a.startsWith("--target="));
  const target = targetArg ? targetArg.split("=")[1] : "deno";

  const cwd = Deno.cwd();

  // 設定ファイルの存在確認
  try {
    await Deno.stat(`${cwd}/main.ts`);
  } catch {
    console.error("Error: main.ts not found in current directory");
    Deno.exit(1);
  }

  switch (target) {
    case "deno":
      await buildDeno(cwd);
      break;
    case "js":
      await buildJs(cwd);
      break;
    default:
      console.error(`Unknown target: ${target}`);
      console.error("Supported targets: deno, js");
      Deno.exit(1);
  }
}

/**
 * Deno Deploy / Adlaire Deploy 向けビルド（build/deno/）
 */
async function buildDeno(cwd: string): Promise<void> {
  console.log("Building for Deno Deploy / Adlaire Deploy...");

  const buildDir = `${cwd}/build/deno`;

  // ビルドディレクトリをクリーンアップ
  try {
    await Deno.remove(buildDir, { recursive: true });
  } catch {
    // 存在しない場合は無視
  }
  await Deno.mkdir(buildDir, { recursive: true });

  // プロジェクトファイルをコピー
  await copyDir(cwd, buildDir, [
    "main.ts",
    "adlaire.config.ts",
    "deno.json",
  ]);
  await copyDirRecursive(`${cwd}/routes`, `${buildDir}/routes`);

  try {
    await Deno.stat(`${cwd}/static`);
    await copyDirRecursive(`${cwd}/static`, `${buildDir}/static`);
  } catch {
    // static/ がない場合は無視
  }

  console.log(`Build complete: ${buildDir}/`);
}

/**
 * 共用サーバ向け JavaScript 出力（build/js/）
 * §10.3 準拠
 */
async function buildJs(cwd: string): Promise<void> {
  console.log("Building for shared server (JavaScript output)...");

  const buildDir = `${cwd}/build/js`;

  try {
    await Deno.remove(buildDir, { recursive: true });
  } catch {
    // 存在しない場合は無視
  }
  await Deno.mkdir(buildDir, { recursive: true });

  // deno emit で TypeScript → JavaScript に変換
  const command = new Deno.Command("deno", {
    args: [
      "compile",
      "--output", `${buildDir}/server`,
      "--allow-read",
      "--allow-net",
      `${cwd}/main.ts`,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const output = await command.output();
  if (output.success) {
    console.log(`Build complete: ${buildDir}/`);
  } else {
    const stderr = new TextDecoder().decode(output.stderr);
    console.error("Build failed:");
    console.error(stderr);
    Deno.exit(1);
  }
}

async function copyDir(
  srcDir: string,
  destDir: string,
  files: string[],
): Promise<void> {
  for (const file of files) {
    try {
      const content = await Deno.readFile(`${srcDir}/${file}`);
      await Deno.writeFile(`${destDir}/${file}`, content);
    } catch {
      // ファイルが存在しない場合はスキップ
    }
  }
}

async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await Deno.mkdir(dest, { recursive: true });

  for await (const entry of Deno.readDir(src)) {
    const srcPath = `${src}/${entry.name}`;
    const destPath = `${dest}/${entry.name}`;

    if (entry.isDirectory) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      const content = await Deno.readFile(srcPath);
      await Deno.writeFile(destPath, content);
    }
  }
}
