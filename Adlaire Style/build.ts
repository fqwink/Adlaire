/**
 * Adlaire Style — ビルドスクリプト
 * 仕様: STYLE_RULEBOOK.md §10.2
 *
 * src/ 配下の CSS ファイルを結合し dist/ に出力する。
 * - dist/adlaire-style.css       (非圧縮)
 * - dist/adlaire-style.min.css   (minify 済み)
 *
 * 使用方法: deno task build
 */

// スクリプト配置ディレクトリを基準にパスを解決する
const BASE_DIR = new URL(".", import.meta.url).pathname;

function resolve(path: string): string {
  return `${BASE_DIR}${path}`;
}

const SOURCE_ORDER = [
  "src/tokens.css",
  "src/reset.css",
  "src/typography.css",
  "src/layout.css",
  "src/components/header.css",
  "src/components/nav.css",
  "src/components/breadcrumb.css",
  "src/components/button.css",
  "src/components/form.css",
  "src/components/card.css",
  "src/components/badge.css",
  "src/components/table.css",
  "src/components/alert.css",
  "src/components/modal.css",
  "src/components/log-box.css",
  "src/components/info-row.css",
  "src/utilities.css",
];

const DIST_DIR = resolve("dist");
const OUT_CSS = `${DIST_DIR}/adlaire-style.css`;
const OUT_MIN = `${DIST_DIR}/adlaire-style.min.css`;

async function readSources(): Promise<string> {
  const parts: string[] = [];
  for (const path of SOURCE_ORDER) {
    const fullPath = resolve(path);
    try {
      const content = await Deno.readTextFile(fullPath);
      parts.push(content);
    } catch (e) {
      console.error(`ファイル読み込み失敗: ${fullPath}`);
      throw e;
    }
  }
  return parts.join("\n");
}

function minify(css: string): string {
  let result = css;
  // コメント除去
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");
  // 連続空白・改行を単一スペースに
  result = result.replace(/\s+/g, " ");
  // セレクタ・プロパティ周辺の不要スペースを除去
  result = result.replace(/\s*([{}:;,>~+])\s*/g, "$1");
  // 先頭・末尾の空白除去
  result = result.trim();
  return result;
}

async function main() {
  console.log("Adlaire Style — ビルド開始");

  // dist/ ディレクトリを確保
  await Deno.mkdir(DIST_DIR, { recursive: true });

  // ソース結合
  console.log(`ソースファイル: ${SOURCE_ORDER.length} 件`);
  const combined = await readSources();

  // 非圧縮版を出力
  await Deno.writeTextFile(OUT_CSS, combined);
  console.log(`出力: ${OUT_CSS} (${combined.length} bytes)`);

  // minify 版を出力
  const minified = minify(combined);
  await Deno.writeTextFile(OUT_MIN, minified);
  console.log(`出力: ${OUT_MIN} (${minified.length} bytes)`);

  // サイズ情報
  const ratio = ((1 - minified.length / combined.length) * 100).toFixed(1);
  console.log(`圧縮率: ${ratio}%`);
  console.log("ビルド完了");
}

main();
