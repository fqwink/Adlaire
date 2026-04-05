/**
 * Adlaire Static CMS - TypeScript Build Script
 * Runtime: Deno
 * Usage: deno task build
 *
 * npm: プレフィックスのインポートは禁止（セキュリティ観点）。
 * esbuild バイナリを Deno.Command 経由で実行する。
 * esbuild バイナリは事前にインストールが必要。
 * → https://esbuild.github.io/getting-started/
 * → Linux: https://github.com/evanw/esbuild/releases
 *
 * ES モジュール対応: エントリポイントごとに IIFE バンドルを生成する。
 * - js/admin.js  ← ts/editInplace.ts（管理画面用・全機能）
 * - js/public.js ← ts/public.ts（公開ページ用・描画のみ）
 */

const BUNDLES = [
  {
    entryPoint: "ts/editInplace.ts",
    outfile: "js/admin.js",
    label: "admin",
  },
  {
    entryPoint: "ts/public.ts",
    outfile: "js/public.js",
    label: "public",
  },
];

async function build(): Promise<void> {
  await Deno.mkdir("js", { recursive: true });

  let hasError = false;

  for (const bundle of BUNDLES) {
    try {
      const cmd = new Deno.Command("esbuild", {
        args: [
          bundle.entryPoint,
          "--bundle",
          `--outfile=${bundle.outfile}`,
          "--platform=browser",
          "--target=es2021",
          "--format=iife",
          "--tree-shaking=true",
          "--charset=utf8",
        ],
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stderr } = await cmd.output();
      const stderrText = new TextDecoder().decode(stderr);

      if (code !== 0) {
        console.error(`  [error] ${bundle.label}:\n${stderrText}`);
        hasError = true;
      } else {
        if (stderrText) console.warn(`  [warn] ${bundle.label}:\n${stderrText}`);
        const stat = await Deno.stat(bundle.outfile);
        const sizeKB = (stat.size / 1024).toFixed(1);
        console.log(`  \u2713 ${bundle.outfile} (${sizeKB} KB)`);
      }
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        console.error(`  [error] ${bundle.label}: esbuild バイナリが見つかりません。`);
        console.error(`  esbuild をインストールしてから再実行してください。`);
        console.error(`  公式サイト: https://esbuild.github.io/getting-started/`);
        console.error(`  GitHub Releases: https://github.com/evanw/esbuild/releases`);
      } else {
        console.error(`  [error] ${bundle.label}: ${e}`);
      }
      hasError = true;
    }
  }

  if (hasError) {
    console.error("\nBuild failed.");
    Deno.exit(1);
  }

  console.log("\nBuild complete.");
}

await build();
