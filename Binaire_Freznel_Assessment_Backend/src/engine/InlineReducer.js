import { reduceLines } from '../util/csv.js';

// Reduce strategy for serverless, where worker threads can't be kept alive
// between invocations. Same interface as WorkerPool (runChunk / stats /
// shutdown) so the Scheduler doesn't know the difference. Yields to the event
// loop around each chunk and caps concurrency.
export class InlineReducer {
  #concurrency;
  #active = 0;
  #waiters = [];
  #demoDelayMs;
  #stats = { started: 0, completed: 0, failed: 0, timedOut: 0, replaced: 0 };

  constructor({ poolSize = 2, demoDelayMs = 0 } = {}) {
    this.#concurrency = Math.max(1, poolSize);
    this.#demoDelayMs = demoDelayMs;
  }

  get size() {
    return this.#concurrency;
  }

  get busyCount() {
    return this.#active;
  }

  get freeCount() {
    return Math.max(0, this.#concurrency - this.#active);
  }

  get waiterCount() {
    return this.#waiters.length;
  }

  stats() {
    return {
      size: this.#concurrency,
      alive: this.#concurrency,
      busy: this.#active,
      free: this.freeCount,
      waiters: this.#waiters.length,
      mode: 'inline',
      ...this.#stats,
    };
  }

  #acquire() {
    if (this.#active < this.#concurrency) {
      this.#active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.#waiters.push(resolve));
  }

  #release() {
    const next = this.#waiters.shift();
    if (next) {
      next();
    } else {
      this.#active -= 1;
    }
  }

  async runChunk({ chunkIndex, lines, demoDelayMs }) {
    this.#stats.started += 1;
    await this.#acquire();
    try {
      await new Promise((r) => setImmediate(r));
      const delay = demoDelayMs ?? this.#demoDelayMs;
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      const { sum, count } = reduceLines(lines);
      this.#stats.completed += 1;
      return { chunkIndex, sum, count };
    } catch (err) {
      this.#stats.failed += 1;
      throw err;
    } finally {
      this.#release();
    }
  }

  async shutdown() {}
}

export default InlineReducer;
