/**
 * adlaire check
 * FRAMEWORK_RULEBOOK §11 準拠
 *
 * ルート型整合性・設定ファイルのバリデーション。
 */

export async function commandCheck(_args: string[]): Promise<void> {
  const cwd = Deno.cwd();
  let hasError = false;

  // 1. adlaire.config.ts の存在チェック
  console.log("Checking adlaire.config.ts...");
  try {
    await Deno.stat(`${cwd}/adlaire.config.ts`);
    console.log("  ✓ adlaire.config.ts found");
  } catch {
    console.error("  ✗ adlaire.config.ts not found");
    hasError = true;
  }

  // 2. main.ts の存在チェック
  console.log("Checking main.ts...");
  try {
    await Deno.stat(`${cwd}/main.ts`);
    console.log("  ✓ main.ts found");
  } catch {
    console.error("  ✗ main.ts not found");
    hasError = true;
  }

  // 3. routes/ ディレクトリのチェック
  console.log("Checking routes/...");
  try {
    const stat = await Deno.stat(`${cwd}/routes`);
    if (stat.isDirectory) {
      console.log("  ✓ routes/ directory found");

      // ルートファイルを列挙
      let routeCount = 0;
      for await (const entry of Deno.readDir(`${cwd}/routes`)) {
        if (entry.name.endsWith(".ts") && !entry.name.startsWith("_")) {
          routeCount++;
        }
      }
      console.log(`  ✓ ${routeCount} route file(s) found`);
    } else {
      console.error("  ✗ routes exists but is not a directory");
      hasError = true;
    }
  } catch {
    console.error("  ✗ routes/ directory not found");
    hasError = true;
  }

  // 4. deno check で型チェック
  console.log("Running type check (deno check)...");
  const mainPath = `${cwd}/main.ts`;
  try {
    await Deno.stat(mainPath);
    const command = new Deno.Command("deno", {
      args: ["check", mainPath],
      stdout: "piped",
      stderr: "piped",
    });
    const output = await command.output();
    if (output.success) {
      console.log("  ✓ Type check passed");
    } else {
      const stderr = new TextDecoder().decode(output.stderr);
      console.error("  ✗ Type check failed:");
      console.error(stderr);
      hasError = true;
    }
  } catch {
    console.log("  - Skipped (main.ts not found)");
  }

  // 5. npm: インポートの検出（§1.3 絶対原則）
  console.log("Checking for prohibited npm: imports...");
  const npmViolations = await scanForNpmImports(`${cwd}/routes`);
  if (npmViolations.length > 0) {
    console.error("  ✗ Found npm: imports (PROHIBITED by §1.3):");
    for (const v of npmViolations) {
      console.error(`    ${v.file}:${v.line} — ${v.import}`);
    }
    hasError = true;
  } else {
    console.log("  ✓ No npm: imports found");
  }

  console.log("");
  if (hasError) {
    console.error("Check failed. Please fix the errors above.");
    Deno.exit(1);
  } else {
    console.log("All checks passed.");
  }
}

interface NpmViolation {
  file: string;
  line: number;
  import: string;
}

async function scanForNpmImports(dir: string): Promise<NpmViolation[]> {
  const violations: NpmViolation[] = [];

  try {
    for await (const entry of Deno.readDir(dir)) {
      const fullPath = `${dir}/${entry.name}`;

      if (entry.isDirectory) {
        const subViolations = await scanForNpmImports(fullPath);
        violations.push(...subViolations);
        continue;
      }

      if (!entry.name.endsWith(".ts")) continue;

      const content = await Deno.readTextFile(fullPath);
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const npmMatch = line.match(/from\s+["']npm:([^"']+)["']/);
        if (npmMatch) {
          violations.push({
            file: fullPath,
            line: i + 1,
            import: `npm:${npmMatch[1]}`,
          });
        }
      }
    }
  } catch {
    // ディレクトリが存在しない場合は無視
  }

  return violations;
}
