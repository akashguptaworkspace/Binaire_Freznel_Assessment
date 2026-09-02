/**
 * Live engine state: a one-shot snapshot, the SSE stream, and a manual tick.
 *
 * `tick` exists for serverless mode where there is no background scheduler —
 * the frontend calls it to advance the queue. It's idempotent, so it's
 * harmless in server mode too.
 *
 * @param {{ engine: import('../../engine/QueueEngine.js').QueueEngine,
 *           sseHub: import('../SseHub.js').SseHub }} deps
 */
export function createRealtimeController({ engine, sseHub }) {
  return {
    // GET /api/state
    state(_req, res) {
      res.json(engine.snapshot());
    },

    // GET /api/stream (SSE) — SseHub owns the connection lifecycle.
    stream: sseHub.handler,

    // POST /api/tick
    tick(_req, res) {
      engine.tick();
      res.json(engine.snapshot());
    },
  };
}

export default createRealtimeController;
