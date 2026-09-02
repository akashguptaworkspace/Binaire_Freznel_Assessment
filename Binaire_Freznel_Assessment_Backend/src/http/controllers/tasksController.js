import config from '../../config.js';
import { ValidationError } from '../../util/errors.js';

/**
 * Upload -> queue -> all-reduce -> download. Handlers validate request shape
 * and translate the engine's return values / throws into HTTP; all queueing,
 * scheduling and reduction logic lives in the engine.
 *
 * @param {{ engine: import('../../engine/QueueEngine.js').QueueEngine }} deps
 */
export function createTasksController({ engine }) {
  return {
    // POST /api/uploads  (multipart: file, clientId, priority)
    async upload(req, res) {
      if (!req.file) throw new ValidationError('Missing "file" field (multipart/form-data).');
      const clientId = String(req.body?.clientId || '').trim();
      if (!clientId) throw new ValidationError('Missing "clientId".');
      const priority = String(req.body?.priority || 'low').toLowerCase();
      const input = {
        clientId,
        fileName: req.file.originalname,
        buffer: req.file.buffer,
        priority,
      };

      // Serverless: settle within this request (no background scheduler, and
      // the next request may land on another instance). Server mode: enqueue
      // and let the tick loop + SSE take it from here.
      const task = config.isServerless
        ? await engine.submitAndSettle(input)
        : engine.submit(input);
      res.status(201).json({ task });
    },

    // GET /api/tasks/:id
    show(req, res) {
      res.json({ task: engine.getTask(req.params.id) });
    },

    // POST /api/tasks/:id/cancel
    cancel(req, res) {
      const clientId = String(req.body?.clientId || '').trim() || null;
      res.json({ task: engine.cancelTask(req.params.id, clientId) });
    },

    // GET /api/tasks/:id/result
    result(req, res) {
      const { summary } = engine.getResultFile(req.params.id);
      res.json({ result: summary });
    },

    // GET /api/tasks/:id/result/file
    // "Post processing completion, server sends the file back to the client."
    resultFile(req, res) {
      const { fileName, csv } = engine.getResultFile(req.params.id);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(csv);
    },
  };
}

export default createTasksController;
