// Snapshot, SSE stream, and a manual tick (used by serverless to advance
// the queue; idempotent).
export function createRealtimeController({ engine, sseHub }) {
  return {
    // GET /api/state
    state(_req, res) {
      res.json(engine.snapshot());
    },

    // GET /api/stream (SSE)
    stream: sseHub.handler,

    // POST /api/tick
    tick(_req, res) {
      engine.tick();
      res.json(engine.snapshot());
    },
  };
}

export default createRealtimeController;
