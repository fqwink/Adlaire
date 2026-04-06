/**
 * Adlaire Deploy — メトリクス収集
 * 仕様: DEPLOY_PLATFORM_RULEBOOK.md P11.3
 *
 * リクエスト数・レスポンスタイム・エラー率を 1 分バケツで収集。
 * メモリ内保持（最新 60 分分）。再起動でリセット。
 */

/** 1 分バケツのメトリクスデータ */
export interface MetricsBucket {
  /** バケツの開始時刻（分単位、Unix ミリ秒） */
  timestamp: number;
  /** 総リクエスト数 */
  request_count: number;
  /** 4xx/5xx レスポンス数 */
  error_count: number;
  /** 累計レスポンスタイム（ms） */
  total_response_time_ms: number;
  /** レスポンスタイムのリングバッファ（P99 計算用） */
  response_times: number[];
}

/** プロジェクト別メトリクスサマリ */
export interface MetricsSummary {
  project_id: string;
  request_count: number;
  error_count: number;
  avg_response_time_ms: number;
  p99_response_time_ms: number;
}

const MAX_BUCKETS = 60;
const MINUTE_MS = 60_000;
const MAX_RESPONSE_TIMES_PER_BUCKET = 1000;

/** プロジェクト ID → バケツ配列 */
const store: Map<string, MetricsBucket[]> = new Map();

function currentMinute(): number {
  return Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
}

function getBuckets(projectId: string): MetricsBucket[] {
  let buckets = store.get(projectId);
  if (!buckets) {
    buckets = [];
    store.set(projectId, buckets);
  }
  return buckets;
}

function getCurrentBucket(projectId: string): MetricsBucket {
  const buckets = getBuckets(projectId);
  const now = currentMinute();

  if (buckets.length > 0 && buckets[buckets.length - 1].timestamp === now) {
    return buckets[buckets.length - 1];
  }

  const bucket: MetricsBucket = {
    timestamp: now,
    request_count: 0,
    error_count: 0,
    total_response_time_ms: 0,
    response_times: [],
  };
  buckets.push(bucket);

  // 古いバケツを削除
  while (buckets.length > MAX_BUCKETS) {
    buckets.shift();
  }

  return bucket;
}

/**
 * リクエストメトリクスを記録する。
 */
export function recordMetrics(
  projectId: string,
  statusCode: number,
  responseTimeMs: number,
): void {
  const bucket = getCurrentBucket(projectId);
  bucket.request_count++;
  bucket.total_response_time_ms += responseTimeMs;

  if (statusCode >= 400) {
    bucket.error_count++;
  }

  if (bucket.response_times.length < MAX_RESPONSE_TIMES_PER_BUCKET) {
    bucket.response_times.push(responseTimeMs);
  }
}

function calculateP99(times: number[]): number {
  if (times.length === 0) return 0;
  const sorted = [...times].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.99) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * プロジェクトのメトリクスバケツ一覧を返す（直近 60 分）。
 * レスポンスタイム配列は除外し、計算済みの P99 を付与する。
 */
export function getProjectMetrics(projectId: string): Array<{
  timestamp: number;
  request_count: number;
  error_count: number;
  avg_response_time_ms: number;
  p99_response_time_ms: number;
}> {
  const buckets = getBuckets(projectId);
  return buckets.map((b) => ({
    timestamp: b.timestamp,
    request_count: b.request_count,
    error_count: b.error_count,
    avg_response_time_ms: b.request_count > 0
      ? Math.round(b.total_response_time_ms / b.request_count)
      : 0,
    p99_response_time_ms: calculateP99(b.response_times),
  }));
}

/**
 * 全プロジェクトのサマリーメトリクスを返す。
 */
export function getAllMetricsSummary(): MetricsSummary[] {
  const summaries: MetricsSummary[] = [];

  for (const [projectId, buckets] of store) {
    let totalRequests = 0;
    let totalErrors = 0;
    let totalTime = 0;
    const allTimes: number[] = [];

    for (const b of buckets) {
      totalRequests += b.request_count;
      totalErrors += b.error_count;
      totalTime += b.total_response_time_ms;
      allTimes.push(...b.response_times);
    }

    summaries.push({
      project_id: projectId,
      request_count: totalRequests,
      error_count: totalErrors,
      avg_response_time_ms: totalRequests > 0
        ? Math.round(totalTime / totalRequests)
        : 0,
      p99_response_time_ms: calculateP99(allTimes),
    });
  }

  return summaries;
}
