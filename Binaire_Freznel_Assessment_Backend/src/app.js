import express from 'express';
import cors from 'cors';
import config from './config.js';
import { QueueEngine } from './engine/QueueEngine.js';
import { SseHub } from './http/SseHub.js';
import { createRouter } from './http/routes.js';
import { createMetaController } from './http/controllers/metaController.js';

// Build the Express app around one QueueEngine. API only; the React app is a
// separate deploy and talks to it over CORS.
export function createApp(opts = {}) {
  const engine = opts.engine || new QueueEngine(config);
  const sseHub = new SseHub(engine, { minIntervalMs: 120 });

  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.http.corsOrigin }));
  app.use(express.json({ limit: config.http.bodyLimit }));

  app.get('/', createMetaController().index);
  app.use('/api', createRouter({ engine, sseHub }));

  app.locals.engine = engine;
  app.locals.sseHub = sseHub;
  return { app, engine, sseHub };
}

export default createApp;
