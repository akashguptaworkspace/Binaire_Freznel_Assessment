import { rootLogger } from '../util/Logger.js';

// Server-Sent Events fan-out. SSE (not WebSockets) because it's plain HTTP
// and works in serverless; clients can also fall back to polling GET
// /api/state. Engine 'change' events are coalesced to at most one snapshot
// per minIntervalMs.
export class SseHub {
  #engine;
  #log;
  #connections = new Set(); // { id, clientId, res }
  #minIntervalMs;
  #pending = false;
  #timer = null;
  #lastFlush = 0;
  #heartbeat = null;
  #connSeq = 0;

  constructor(engine, { minIntervalMs = 120 } = {}) {
    this.#engine = engine;
    this.#minIntervalMs = minIntervalMs;
    this.#log = rootLogger.child('sse');

    engine.on('change', () => this.#scheduleFlush());
    engine.on('notify', (payload) => this.#notify(payload));

    this.#heartbeat = setInterval(() => this.#ping(), 15_000);
    this.#heartbeat.unref?.();
  }

  // GET /api/stream?clientId=...
  handler = (req, res) => {
    const clientId = req.query.clientId || null;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');

    const conn = { id: ++this.#connSeq, clientId, res };
    this.#connections.add(conn);
    this.#log.info(`stream open #${conn.id} (client ${clientId ?? 'anon'}), ${this.#connections.size} total`);

    this.#send(conn, 'snapshot', this.#engine.snapshot()); // prime the new client

    req.on('close', () => {
      this.#connections.delete(conn);
      this.#log.info(`stream close #${conn.id}, ${this.#connections.size} left`);
    });
  };

  get connectionCount() {
    return this.#connections.size;
  }

  #scheduleFlush() {
    if (this.#pending) return;
    this.#pending = true;
    const wait = Math.max(0, this.#minIntervalMs - (Date.now() - this.#lastFlush));
    this.#timer = setTimeout(() => this.#flush(), wait);
    this.#timer.unref?.();
  }

  #flush() {
    this.#pending = false;
    this.#lastFlush = Date.now();
    if (this.#connections.size === 0) return;
    const snap = this.#engine.snapshot();
    for (const conn of this.#connections) this.#send(conn, 'snapshot', snap);
  }

  #notify(payload) {
    for (const conn of this.#connections) {
      if (!payload.clientId || conn.clientId === payload.clientId) {
        this.#send(conn, 'notify', payload);
      }
    }
  }

  #ping() {
    for (const conn of this.#connections) {
      try {
        conn.res.write(': ping\n\n');
      } catch {
        this.#connections.delete(conn);
      }
    }
  }

  #send(conn, event, data) {
    try {
      conn.res.write(`event: ${event}\n`);
      conn.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      this.#log.warn(`drop stream #${conn.id}: ${err.message}`);
      this.#connections.delete(conn);
    }
  }

  close() {
    if (this.#heartbeat) clearInterval(this.#heartbeat);
    if (this.#timer) clearTimeout(this.#timer);
    for (const conn of this.#connections) {
      try {
        conn.res.end();
      } catch {
        /* ignore */
      }
    }
    this.#connections.clear();
  }
}

export default SseHub;
