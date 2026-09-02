import os from 'node:os';

// App config. Every value can be overridden with an env var so the same
// build runs as a long-lived server or as a serverless function.
const int = (v, d) => (v === undefined ? d : Number.parseInt(v, 10));
const bool = (v, d) => (v === undefined ? d : v === '1' || v === 'true');

const isServerless = bool(process.env.VERCEL, false) || bool(process.env.SERVERLESS, false);
const cpuCount = Math.max(1, os.cpus?.().length || 4);

export const config = {
  env: process.env.NODE_ENV || 'development',
  isServerless,

  http: {
    host: process.env.HOST || '0.0.0.0',
    port: int(process.env.PORT, 4000),
    corsOrigin: process.env.CORS_ORIGIN || '*',
    bodyLimit: '256kb',
  },

  upload: {
    // Max size of a single CSV.
    maxBytes: int(process.env.UPLOAD_MAX_BYTES, 20 * 1024 * 1024),
    allowedExt: ['.csv', '.txt', '.tsv'],
  },

  queue: {
    // Once full, new uploads get a 503 instead of blocking.
    capacity: int(process.env.QUEUE_CAPACITY, 250),
    // A low task waiting longer than this gets bumped to high (aging).
    agingMs: int(process.env.QUEUE_AGING_MS, 12_000),
    // Files allowed in-flight at once. Keep >= pool size.
    maxConcurrentProcesses: int(process.env.MAX_CONCURRENT_PROCESSES, Math.max(3, cpuCount)),
  },

  workers: {
    poolSize: int(process.env.WORKER_POOL_SIZE, isServerless ? 2 : Math.max(2, cpuCount - 1)),
    // Rows per chunk. Small enough that no chunk holds a worker for long.
    chunkRows: int(process.env.WORKER_CHUNK_ROWS, 1_500),
    // Kill + retry a chunk that runs longer than this.
    chunkTimeoutMs: int(process.env.WORKER_CHUNK_TIMEOUT_MS, 15_000),
    maxChunkRetries: int(process.env.WORKER_MAX_CHUNK_RETRIES, 2),
    // Fake per-chunk delay so the progress bar is visible in a demo. 0 = off.
    demoDelayMs: int(process.env.WORKER_DEMO_DELAY_MS, isServerless ? 0 : 220),
    idleShutdownMs: int(process.env.WORKER_IDLE_SHUTDOWN_MS, 60_000),
    // Serverless can't keep worker threads alive between calls, so use the
    // inline reducer there.
    strategy: process.env.REDUCE_STRATEGY || (isServerless ? 'inline' : 'worker-pool'),
  },

  scheduler: {
    // Server-mode tick interval. Serverless drives ticks over HTTP instead.
    tickMs: int(process.env.SCHEDULER_TICK_MS, 90),
  },

  guard: {
    sweepMs: int(process.env.GUARD_SWEEP_MS, 2_000),
    // A process with no progress for this long while workers sit idle
    // gets a pump kick.
    stallMs: int(process.env.GUARD_STALL_MS, 20_000),
  },

  results: {
    // How long a finished result stays downloadable before it's dropped.
    ttlMs: int(process.env.RESULT_TTL_MS, 15 * 60 * 1000),
    recentLimit: int(process.env.RECENT_LIMIT, 30),
  },

  clients: {
    // No heartbeat for this long = client gone; its queued tasks are cancelled.
    staleMs: int(process.env.CLIENT_STALE_MS, 45_000),
  },
};

export default config;
