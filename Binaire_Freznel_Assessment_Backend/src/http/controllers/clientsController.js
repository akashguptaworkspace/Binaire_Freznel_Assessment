/**
 * Client lifecycle. A "client" is one browser tab / simulated machine in the
 * dashboard; the engine tracks its heartbeat and reaps its queued work when
 * it goes away. Handlers only shape input/output — the engine owns the rules.
 *
 * @param {{ engine: import('../../engine/QueueEngine.js').QueueEngine }} deps
 */
export function createClientsController({ engine }) {
  return {
    // POST /api/clients
    create(req, res) {
      const label = String(req.body?.label || '').slice(0, 60) || undefined;
      const client = engine.registerClient(label);
      res.status(201).json({ client: client.toJSON() });
    },

    // POST /api/clients/:id/heartbeat
    heartbeat(req, res) {
      const client = engine.heartbeat(req.params.id);
      res.json({ ok: Boolean(client) });
    },

    // DELETE /api/clients/:id
    remove(req, res) {
      const reapedTasks = engine.disconnectClient(req.params.id);
      res.json({ ok: true, reapedTasks });
    },
  };
}

export default createClientsController;
