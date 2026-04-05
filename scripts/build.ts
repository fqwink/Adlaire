/**
 * Adlaire Static CMS - TypeScript Build Script
 * Runtime: Deno
 * Usage: deno task build
 *
 * ES モジュール対応: エントリポイントごとに IIFE バンドルを生成する。
 * - js/admin.js  ← ts/editInplace.ts（管理画面用・全機能）
 * - js/public.js ← ts/public.ts（公開ページ用・描画のみ）
 */

import * as esbuild from "npm:esbuild@~0.25";

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
      const result = await esbuild.build({
        entryPoints: [bundle.entryPoint],
        bundle: true,
        outfile: bundle.outfile,
        platform: "browser",
        target: "es2021",
        format: "iife",
        treeShaking: true,
        charset: "utf8",
      });

      if (result.errors.length > 0) {
        console.error(`  [error] ${bundle.label}:`, result.errors);
        hasError = true;
      } else {
        const stat = await Deno.stat(bundle.outfile);
        const sizeKB = ((stat.size ?? 0) / 1024).toFixed(1);
        console.log(`  \u2713 ${bundle.outfile} (${sizeKB} KB)`);
      }
    } catch (e) {
      console.error(`  [error] ${bundle.label}: ${e}`);
      hasError = true;
    }
  }

  esbuild.stop();

  if (hasError) {
    console.error("\nBuild failed.");
    Deno.exit(1);
  }

  console.log("\nBuild complete.");
}

await build();
