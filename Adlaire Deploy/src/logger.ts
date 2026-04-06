/**
 * Adlaire Deploy — ログキャプチャ
 *
 * Worker の stdout/stderr をリングバッファで保持
 * Phase 6: SSE ストリーミング連携
 * Phase 7: ファイル永続化連携
 */

import type { LogEntry } from "./types.ts";

/** リングバッファの最大行数 */
const MAX_LOG_LINES = 1000;

/** プロジェクト別ログバッファ */
const buffers: Map<string, LogEntry[]> = new Map();

/** ログエントリ追加時のコールバック（SSE/永続化連携用） */
type LogCallback = (projectId: string, entry: LogEntry) => void;
const callbacks: LogCallback[] = [];

/** ログコールバックを登録する */
export function addLogCallback(cb: LogCallback): void {
  callbacks.push(cb);
}

/** ログバッファを取得する（存在しない場合は空配列） */
export function getLogBuffer(projectId: string): LogEntry[] {
  return buffers.get(projectId) ?? [];
}

/** ログバッファの末尾 n 行を取得する */
export function getLogTail(projectId: string, n: number): LogEntry[] {
  const buf = buffers.get(projectId) ?? [];
  return buf.slice(-n);
}

/** ログエントリを追加する */
function addLogEntry(
  projectId: string,
  stream: "stdout" | "stderr",
  line: string,
): void {
  let buf = buffers.get(projectId);
  if (!buf) {
    buf = [];
    buffers.set(projectId, buf);
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    stream,
    line,
  };

  buf.push(entry);

  // リングバッファの最大行数を超えた場合、古いエントリを削除
  if (buf.length > MAX_LOG_LINES) {
    buf.splice(0, buf.length - MAX_LOG_LINES);
  }

  // コールバック呼び出し（SSE/永続化）
  for (const cb of callbacks) {
    try {
      cb(projectId, entry);
    } catch {
      // コールバックエラーは無視
    }
  }
}

/** ReadableStream からログを読み取りバッファに追加する */
export async function captureStream(
  projectId: string,
  stream: "stdout" | "stderr",
  readable: ReadableStream<Uint8Array>,
): Promise<void> {
  const decoder = new TextDecoder();
  const reader = readable.getReader();
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
          addLogEntry(projectId, stream, line);
          // プラットフォームの stdout にも転送
          if (stream === "stdout") {
            console.log(`[${projectId}] ${line}`);
          } else {
            console.error(`[${projectId}] ${line}`);
          }
        }
      }
    }

    // 最後の部分行
    if (partial.length > 0) {
      addLogEntry(projectId, stream, partial);
      if (stream === "stdout") {
        console.log(`[${projectId}] ${partial}`);
      } else {
        console.error(`[${projectId}] ${partial}`);
      }
    }
  } catch {
    // ストリームが閉じられた場合
  } finally {
    reader.releaseLock();
  }
}
