/**
 * Adlaire Deploy — ビルドステップ実行
 *
 * デプロイ前の任意ビルドコマンドをシェルを介さず実行する
 */

/** デフォルトビルドタイムアウト（秒） */
const DEFAULT_BUILD_TIMEOUT = 300;

/** ビルドステップを実行する */
export async function runBuildStep(
  projectDir: string,
  buildCommand: string,
  buildTimeout: number | undefined,
  env: Record<string, string>,
): Promise<void> {
  const timeout = (buildTimeout ?? DEFAULT_BUILD_TIMEOUT) * 1000;

  // シェルインジェクション対策: コマンド文字列を配列化
  const parts = parseCommand(buildCommand);
  if (parts.length === 0) {
    throw new Error("Empty build command");
  }

  const [cmd, ...args] = parts;

  console.log(`[deploy] Running build command: ${buildCommand}`);

  const command = new Deno.Command(cmd, {
    args,
    cwd: projectDir,
    env: {
      ...Deno.env.toObject(),
      ...env,
    },
    stdout: "piped",
    stderr: "piped",
  });

  const process = command.spawn();

  // タイムアウトタイマー
  const timer = setTimeout(() => {
    try {
      process.kill("SIGKILL");
    } catch {
      // 既に終了
    }
  }, timeout);

  // stdout/stderr をキャプチャして表示
  const stdoutReader = readStream(process.stdout, "[build:out]");
  const stderrReader = readStream(process.stderr, "[build:err]");

  const status = await process.status;
  clearTimeout(timer);

  await Promise.allSettled([stdoutReader, stderrReader]);

  if (!status.success) {
    throw new Error(`Build command failed (exit code: ${status.code})`);
  }

  console.log("[deploy] Build step completed");
}

/** ストリームを読み取ってログに出力する */
async function readStream(
  stream: ReadableStream<Uint8Array>,
  prefix: string,
): Promise<void> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let partial = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = partial + decoder.decode(value, { stream: true });
      const lines = text.split("\n");
      partial = lines.pop() ?? "";

      for (const line of lines) {
        if (line.length > 0) {
          console.log(`${prefix} ${line}`);
        }
      }
    }
    if (partial.length > 0) {
      console.log(`${prefix} ${partial}`);
    }
  } catch {
    // ストリーム閉鎖
  } finally {
    reader.releaseLock();
  }
}

/** コマンド文字列をシェルを介さず分割する（簡易パーサー） */
function parseCommand(cmd: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];

    if (c === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (c === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (c === " " && !inSingle && !inDouble) {
      if (current.length > 0) {
        parts.push(current);
        current = "";
      }
    } else {
      current += c;
    }
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts;
}
