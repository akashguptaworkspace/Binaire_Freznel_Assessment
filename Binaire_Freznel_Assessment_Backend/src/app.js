import express from 'express';
import cors from 'cors';
import config from './config.js';
import { QueueEngine } from './engine/QueueEngine.js';
import { SseHub } from './http/SseHub.js';
import { createRouter } from './http/routes.js';

/**
 * Build the Express app around a single QueueEngine (`src/index.js` runs it
 * as a long-lived server). This service is API-only — the React dashboard is
 * a separate repo/deploy and talks to it over CORS.
 *
 * @param {{ engine?: QueueEngine }} [opts]
 */
export function createApp(opts = {}) {
  const engine = opts.engine || new QueueEngine(config);
  const sseHub = new SseHub(engine, { minIntervalMs: 120 });

  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.http.corsOrigin }));
  app.use(express.json({ limit: config.http.bodyLimit }));

  app.get('/', (_req, res) => {
    res.json({
      service: 'binaire-freznel-assessment-backend',
      mode: config.isServerless ? 'serverless' : 'server',
      reduceStrategy: config.workers.strategy,
      endpoints: [
        'POST /api/clients',
        'POST /api/clients/:id/heartbeat',
        'DELETE /api/clients/:id',
        'POST /api/uploads  (multipart: file, clientId, priority)',
        'GET  /api/tasks/:id',
        'POST /api/tasks/:id/cancel',
        'GET  /api/tasks/:id/result',
        'GET  /api/tasks/:id/result/file',
        'GET  /api/state',
        'GET  /api/stream  (SSE)',
        'POST /api/tick',
        'GET  /api/health',
      ],
    });
  });

  app.use('/api', createRouter({ engine, sseHub }));

  app.locals.engine = engine;
  app.locals.sseHub = sseHub;
  return { app, engine, sseHub };
}

export default createApp;
