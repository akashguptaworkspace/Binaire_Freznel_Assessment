import { parentPort } from 'node:worker_threads';
import { reduceLines } from '../util/csv.js';

// worker_threads worker: reduces one chunk of lines.
//   in : { jobId, chunkIndex, lines, demoDelayMs }
//   out: { jobId, chunkIndex, ok, sum, count } | { jobId, ok:false, error }
// Stateless between messages so the pool can reuse it for any task.
if (!parentPort) {
  throw new Error('reduceWorker must be run as a worker_threads Worker');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

parentPort.on('message', async (job) => {
  const { jobId, chunkIndex, lines, demoDelayMs = 0 } = job;
  try {
    if (demoDelayMs > 0) await sleep(demoDelayMs);
    const { sum, count } = reduceLines(lines);
    parentPort.postMessage({ jobId, chunkIndex, ok: true, sum, count });
  } catch (err) {
    parentPort.postMessage({
      jobId,
      chunkIndex,
      ok: false,
      error: String(err?.stack || err),
    });
  }
});
