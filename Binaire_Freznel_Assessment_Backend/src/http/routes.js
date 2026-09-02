import { Router } from 'express';

import { asyncHandler } from './middleware/asyncHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { serverlessTick } from './middleware/serverlessTick.js';
import { upload } from './middleware/upload.js';

import { createHealthController } from './controllers/healthController.js';
import { createClientsController } from './controllers/clientsController.js';
import { createRealtimeController } from './controllers/realtimeController.js';
import { createTasksController } from './controllers/tasksController.js';

/**
 * The `/api` route table — nothing but wiring. Each line maps a method +
 * path to a controller action; request parsing lives in middleware, business
 * logic in the engine, error translation in errorHandler.
 *
 * @param {{ engine: import('../engine/QueueEngine.js').QueueEngine,
 *           sseHub: import('./SseHub.js').SseHub }} deps
 */
export function createRouter({ engine, sseHub }) {
  const router = Router();

  const health = createHealthController();
  const clients = createClientsController({ engine });
  const realtime = createRealtimeController({ engine, sseHub });
  const tasks = createTasksController({ engine });

  router.use(serverlessTick({ engine }));

  // health
  router.get('/health', health.show);

  // clients
  router.post('/clients', asyncHandler(clients.create));
  router.post('/clients/:id/heartbeat', asyncHandler(clients.heartbeat));
  router.delete('/clients/:id', asyncHandler(clients.remove));

  // realtime
  router.get('/state', realtime.state);
  router.get('/stream', realtime.stream);
  router.post('/tick', realtime.tick);

  // uploads / tasks
  router.post('/uploads', upload.single('file'), asyncHandler(tasks.upload));
  router.get('/tasks/:id', asyncHandler(tasks.show));
  router.post('/tasks/:id/cancel', asyncHandler(tasks.cancel));
  router.get('/tasks/:id/result', asyncHandler(tasks.result));
  router.get('/tasks/:id/result/file', asyncHandler(tasks.resultFile));

  // domain + multer error translation (must be last)
  router.use(errorHandler);

  return router;
}

export default createRouter;
