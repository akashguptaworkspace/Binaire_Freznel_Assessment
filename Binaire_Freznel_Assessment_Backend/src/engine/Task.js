import { EventEmitter } from 'node:events';
import { nextTaskId } from '../util/ids.js';
import { TaskState, TERMINAL_STATES, canTransition } from './TaskState.js';

export const Priority = Object.freeze({ HIGH: 'high', LOW: 'low' });

// One CSV file submitted by one client. Holds its metadata, the CSV rank
// (rows x cols), the chunk plan, the accumulating partial sums, and its
// state-machine position plus transition history. Emits 'change' on every
// mutation so the engine can rebroadcast.
export class Task extends EventEmitter {
  constructor({ clientId, fileName, sizeBytes, priority }) {
    super();
    this.id = nextTaskId();
    this.clientId = clientId;
    this.fileName = fileName || 'upload.csv';
    this.sizeBytes = sizeBytes || 0;
    this.priority = priority === Priority.HIGH ? Priority.HIGH : Priority.LOW;

    this.promoted = false; // set by aging; makes effectivePriority report high

    this.state = TaskState.UPLOADED;
    this.createdAt = Date.now();
    this.enqueuedAt = null;
    this.admittedAt = null;
    this.startedAt = null;
    this.finishedAt = null;

    this.processId = null;

    this.rank = { rows: 0, cols: 0 };

    this.chunks = []; // [{ index, startRow, endRow }], filled by planCsv
    this.chunksTotal = 0;
    this.chunksDone = 0;
    this.partialSums = [];
    this.valuesCounted = 0;

    this.result = null; // final reduced scalar
    this.error = null;

    this.history = [{ state: this.state, at: this.createdAt }];
  }

  // ordering keys

  // 0 = high, 1 = low. Aging can move a low task to 0.
  get effectivePriorityRank() {
    if (this.promoted) return 0;
    return this.priority === Priority.HIGH ? 0 : 1;
  }

  get isTerminal() {
    return TERMINAL_STATES.has(this.state);
  }

  get waitedMs() {
    if (!this.enqueuedAt) return 0;
    const until = this.admittedAt ?? Date.now();
    return until - this.enqueuedAt;
  }

  get progress() {
    if (this.state === TaskState.COMPLETED) return 100;
    if (this.chunksTotal === 0) return 0;
    return Math.min(99, Math.round((this.chunksDone / this.chunksTotal) * 100));
  }

  // mutations

  setRankAndChunks(rank, chunks) {
    this.rank = rank;
    this.chunks = chunks;
    this.chunksTotal = chunks.length;
    this.emit('change', this);
  }

  transition(next, patch = {}) {
    if (this.state === next) {
      Object.assign(this, patch);
      this.emit('change', this);
      return;
    }
    if (!canTransition(this.state, next)) {
      throw new Error(`Illegal task transition ${this.state} -> ${next} (${this.id})`);
    }
    this.state = next;
    Object.assign(this, patch);
    const at = Date.now();
    this.history.push({ state: next, at });

    if (next === TaskState.QUEUED) this.enqueuedAt = at;
    if (next === TaskState.WAITING) this.admittedAt = at;
    if (next === TaskState.PROCESSING && !this.startedAt) this.startedAt = at;
    if (TERMINAL_STATES.has(next)) this.finishedAt = at;

    this.emit('change', this);
  }

  recordChunkResult({ sum, count }) {
    this.partialSums.push(sum);
    this.valuesCounted += count;
    this.chunksDone += 1;
    if (this.state === TaskState.WAITING) {
      this.transition(TaskState.PROCESSING);
    } else {
      this.emit('change', this);
    }
  }

  // Fold every partial sum into the final scalar.
  finalizeReduce() {
    const total = this.partialSums.reduce((acc, n) => acc + n, 0);
    // Trim floating-point noise from summing many values.
    this.result = Number.parseFloat(total.toPrecision(15));
    this.transition(TaskState.COMPLETED, { result: this.result });
    return this.result;
  }

  fail(reason) {
    if (this.isTerminal) return;
    this.error = String(reason?.message || reason);
    this.transition(TaskState.FAILED, { error: this.error });
  }

  cancel(reason = 'cancelled by client') {
    if (this.isTerminal) return;
    this.error = String(reason);
    this.transition(TaskState.CANCELLED, { error: this.error });
  }

  // serialization

  toJSON() {
    return {
      id: this.id,
      clientId: this.clientId,
      fileName: this.fileName,
      sizeBytes: this.sizeBytes,
      priority: this.priority,
      promoted: this.promoted,
      effectivePriority: this.effectivePriorityRank === 0 ? 'high' : 'low',
      state: this.state,
      processId: this.processId,
      rank: this.rank,
      chunksTotal: this.chunksTotal,
      chunksDone: this.chunksDone,
      progress: this.progress,
      valuesCounted: this.valuesCounted,
      result: this.result,
      error: this.error,
      waitedMs: this.waitedMs,
      createdAt: this.createdAt,
      enqueuedAt: this.enqueuedAt,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      history: this.history,
    };
  }
}

export default Task;
