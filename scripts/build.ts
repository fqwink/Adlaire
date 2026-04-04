/**
 * Adlaire Static CMS - TypeScript Build Script
 * Runtime: Deno
 * Usage: deno task build
 *
 * ts/ 内の TypeScript ファイルを @deno/emit でトランスパイルし js/ に出力する。
 */

import { transpile } from "@deno/emit";

const TS_DIR = new URL("../ts/", import.meta.url);
const JS_DIR = "js";

/** トランスパイル対象エントリポイント（インポートグラフの起点） */
const ENTRY_POINTS: string[] = [
  "editInplace.ts",
  "markdown.ts",
];

const compilerOptions = {
  target: "ES2021" as const,
  strict: true,
  lib: ["ES2021", "dom", "dom.iterable"],
  noUnusedLocals: true,
  noUnusedParameters: true,
  noFallthroughCasesInSwitch: true,
  forceConsistentCasingInFileNames: true,
};

async function build(): Promise<void> {
  await Deno.mkdir(JS_DIR, { recursive: true });

  const processed = new Set<string>();
  let hasError = false;

  for (const entry of ENTRY_POINTS) {
    const entryUrl = new URL(entry, TS_DIR);

    let result: Map<string, string>;
    try {
      result = await transpile(entryUrl, { compilerOptions });
    } catch (e) {
      console.error(`[error] transpile failed: ${entry}`);
      console.error(e);
      hasError = true;
      continue;
    }

    for (const [moduleUrl, code] of result) {
      if (processed.has(moduleUrl)) continue;
      processed.add(moduleUrl);

      const urlObj = new URL(moduleUrl);
      const basename = urlObj.pathname.split("/").pop() ?? "";

      // .d.ts / globals は出力しない
      if (!basename || basename.endsWith(".d.ts")) continue;
      // ts/ 配下のファイルのみ出力対象
      if (!moduleUrl.includes("/ts/")) continue;

      const jsName = basename.replace(/\.ts$/, ".js");
      const outPath = `${JS_DIR}/${jsName}`;
      await Deno.writeTextFile(outPath, code);
      console.log(`  \u2713 ${outPath}`);
    }
  }

  if (hasError) {
    console.error("\nBuild failed.");
    Deno.exit(1);
  }

  console.log("\nBuild complete.");
}

await build();
