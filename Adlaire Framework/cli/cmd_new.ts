/**
 * adlaire new <app-name>
 * FRAMEWORK_RULEBOOK §11.2 準拠
 *
 * テンプレートからプロジェクトを生成する。
 */

const DENO_JSON = (_name: string) => `{
  "tasks": {
    "dev": "deno run --allow-read --allow-net --watch main.ts",
    "check": "deno check main.ts",
    "build": "echo 'build not yet implemented'"
  },
  "imports": {
    "adlaire-framework/": "./framework/"
  },
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
`;

const CONFIG_TS = `import type { AdlaireConfig } from "adlaire-framework/mod.ts";

export default {
  port: 8000,
  routes_dir: "./routes",
  static_dir: "./static",
  style: {
    adlaire_style: false,
  },
  deploy: "auto",
} satisfies AdlaireConfig;
`;

const MAIN_TS = `import { serve } from "adlaire-framework/mod.ts";
import config from "./adlaire.config.ts";

await serve(config);
`;

const INDEX_ROUTE = `import { defineHandler } from "adlaire-framework/mod.ts";

export const handler = defineHandler({
  GET(ctx) {
    return ctx.json({ message: "Welcome to Adlaire Framework" });
  },
});
`;

const MIDDLEWARE = `import { defineMiddleware } from "adlaire-framework/mod.ts";

export const middleware = defineMiddleware(async (ctx, next) => {
  const start = performance.now();
  const res = await next();
  const ms = (performance.now() - start).toFixed(1);
  console.log(\`\${ctx.req.method} \${ctx.url.pathname} — \${ms}ms\`);
  return res;
});
`;

/**
 * ディレクトリを再帰的にコピーする。
 */
async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await Deno.mkdir(dest, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    const srcPath = `${src}/${entry.name}`;
    const destPath = `${dest}/${entry.name}`;
    if (entry.isDirectory) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      await Deno.copyFile(srcPath, destPath);
    }
  }
}

export async function commandNew(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("Usage: adlaire new <app-name>");
    Deno.exit(1);
  }

  const appName = args[0];

  try {
    await Deno.stat(appName);
    console.error(`Error: directory "${appName}" already exists`);
    Deno.exit(1);
  } catch {
    // ディレクトリが存在しない場合は正常
  }

  // ディレクトリ構造を作成
  await Deno.mkdir(`${appName}/routes`, { recursive: true });
  await Deno.mkdir(`${appName}/static`, { recursive: true });

  // フレームワークソースを framework/ にコピー
  // import.meta.url を使用してこの CLI ファイルからの相対パスで src/ を特定する
  const frameworkSrc = decodeURIComponent(
    new URL("../src", import.meta.url).pathname,
  );
  await copyDirRecursive(frameworkSrc, `${appName}/framework`);

  // ファイルを書き込む
  const encoder = new TextEncoder();
  await Deno.writeFile(
    `${appName}/deno.json`,
    encoder.encode(DENO_JSON(appName)),
  );
  await Deno.writeFile(
    `${appName}/adlaire.config.ts`,
    encoder.encode(CONFIG_TS),
  );
  await Deno.writeFile(`${appName}/main.ts`, encoder.encode(MAIN_TS));
  await Deno.writeFile(
    `${appName}/routes/index.ts`,
    encoder.encode(INDEX_ROUTE),
  );
  await Deno.writeFile(
    `${appName}/routes/_middleware.ts`,
    encoder.encode(MIDDLEWARE),
  );

  console.log(`Created new Adlaire Framework project: ${appName}/`);
  console.log("");
  console.log("  cd " + appName);
  console.log("  deno task dev");
}
