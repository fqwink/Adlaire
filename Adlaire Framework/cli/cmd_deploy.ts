/**
 * Adlaire Framework — CLI コマンド: adlaire deploy
 * FRAMEWORK_RULEBOOK §11.3 準拠
 *
 * Adlaire Deploy 管理 API にデプロイをトリガーする。
 *
 * Usage:
 *   adlaire deploy --host=<URL> --project=<ID>
 */

export async function commandDeploy(args: string[]): Promise<void> {
  const hostArg = args.find((a) => a.startsWith("--host="));
  const projectArg = args.find((a) => a.startsWith("--project="));

  if (!hostArg || !projectArg) {
    console.error(
      "Usage: adlaire deploy --host=<URL> --project=<ID>",
    );
    Deno.exit(1);
  }

  const host = hostArg.slice("--host=".length);
  const project = projectArg.slice("--project=".length);

  if (!host || !project) {
    console.error("Error: --host and --project must not be empty.");
    Deno.exit(1);
  }

  const url = `${host.replace(/\/$/, "")}/api/projects/${project}/deploy`;
  console.log(`Deploying "${project}" to ${host}...`);

  let response: Response;
  try {
    response = await fetch(url, { method: "POST" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Deploy failed: ${message}`);
    Deno.exit(1);
  }

  if (response.ok) {
    console.log("Deploy triggered successfully.");
  } else {
    console.error(
      `Deploy failed: ${response.status} ${response.statusText}`,
    );
    Deno.exit(1);
  }
}
