/**
 * adlaire routes
 * FRAMEWORK_RULEBOOK §11 準拠
 *
 * 登録済みルート一覧を表示する。
 */

export async function commandRoutes(_args: string[]): Promise<void> {
  const cwd = Deno.cwd();
  const routesDir = `${cwd}/routes`;

  try {
    await Deno.stat(routesDir);
  } catch {
    console.error("Error: routes/ directory not found");
    Deno.exit(1);
  }

  console.log("Registered routes:\n");
  console.log("  METHOD  PATH                       FILE");
  console.log("  ─────── ────────────────────────── ────────────────────────");

  await scanAndPrintRoutes(routesDir, "/", cwd);
}

async function scanAndPrintRoutes(
  dir: string,
  urlPrefix: string,
  cwd: string,
): Promise<void> {
  let entries: Deno.DirEntry[] = [];
  for await (const entry of Deno.readDir(dir)) {
    entries.push(entry);
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = `${dir}/${entry.name}`;

    if (entry.isDirectory) {
      const subPrefix = urlPrefix === "/"
        ? `/${entry.name}`
        : `${urlPrefix}/${entry.name}`;
      await scanAndPrintRoutes(fullPath, subPrefix, cwd);
      continue;
    }

    if (!entry.name.endsWith(".ts")) continue;

    // 特殊ファイル
    if (entry.name === "_middleware.ts") {
      const relativePath = fullPath.replace(cwd + "/", "");
      const scope = urlPrefix === "/" ? "/*" : `${urlPrefix}/*`;
      console.log(`  MW      ${scope.padEnd(27)} ${relativePath}`);
      continue;
    }

    if (entry.name === "_error.ts") {
      const relativePath = fullPath.replace(cwd + "/", "");
      console.log(`  ERR     ${(urlPrefix + "/*").padEnd(27)} ${relativePath}`);
      continue;
    }

    if (entry.name === "_404.ts") {
      const relativePath = fullPath.replace(cwd + "/", "");
      console.log(`  404     ${(urlPrefix + "/*").padEnd(27)} ${relativePath}`);
      continue;
    }

    if (entry.name.startsWith("_")) continue;

    // 通常ルートファイル
    const baseName = entry.name.replace(/\.ts$/, "");
    const urlPath = fileNameToUrl(urlPrefix, baseName);
    const relativePath = fullPath.replace(cwd + "/", "");

    // ハンドラーのメソッドを検出
    const methods = await detectMethods(fullPath);
    const methodStr = methods.length > 0 ? methods.join(",") : "*";

    console.log(
      `  ${methodStr.padEnd(8)}${urlPath.padEnd(27)} ${relativePath}`,
    );
  }
}

function fileNameToUrl(prefix: string, baseName: string): string {
  if (baseName === "index") {
    return prefix === "/" ? "/" : prefix;
  }

  const wildcardMatch = baseName.match(/^\[\.\.\.(\w+)\]$/);
  if (wildcardMatch) {
    return prefix === "/" ? `/*` : `${prefix}/*`;
  }

  const paramMatch = baseName.match(/^\[(\w+)\]$/);
  if (paramMatch) {
    return prefix === "/"
      ? `/:${paramMatch[1]}`
      : `${prefix}/:${paramMatch[1]}`;
  }

  return prefix === "/" ? `/${baseName}` : `${prefix}/${baseName}`;
}

async function detectMethods(filePath: string): Promise<string[]> {
  try {
    const content = await Deno.readTextFile(filePath);
    const methods: string[] = [];
    const methodNames = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

    for (const method of methodNames) {
      // パターン: GET(ctx) or async GET(ctx) or GET: (ctx) =>
      const pattern = new RegExp(`(?:async\\s+)?${method}\\s*[:(]`);
      if (pattern.test(content)) {
        methods.push(method);
      }
    }

    return methods;
  } catch {
    return [];
  }
}
