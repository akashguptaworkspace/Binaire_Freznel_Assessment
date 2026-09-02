import { Router } from 'express';

import { asyncHandler } from './middleware/asyncHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { serverlessTick } from './middleware/serverlessTick.js';
import { upload } from './middleware/upload.js';

import { createHealthController } from './controllers/healthController.js';
import { createClientsController } from './controllers/clientsController.js';
import { createRealtimeController } from './controllers/realtimeController.js';
import { createTasksController } from './controllers/tasksController.js';

// The /api route table. Each line maps a method + path to a controller
// action; parsing is in middleware, logic in the engine.
export function createRouter({ engine, sseHub }) {
  const router = Router();

  const health = createHealthController();
  const clients = createClientsController({ engine });
  const realtime = createRealtimeController({ engine, sseHub });
  const tasks = createTasksController({ engine });

  router.use(serverlessTick({ engine }));

  router.get('/health', health.show);

  router.post('/clients', asyncHandler(clients.create));
  router.post('/clients/:id/heartbeat', asyncHandler(clients.heartbeat));
  router.delete('/clients/:id', asyncHandler(clients.remove));

  router.get('/state', realtime.state);
  router.get('/stream', realtime.stream);
  router.post('/tick', realtime.tick);

  router.post('/uploads', upload.single('file'), asyncHandler(tasks.upload));
  router.get('/tasks/:id', asyncHandler(tasks.show));
  router.post('/tasks/:id/cancel', asyncHandler(tasks.cancel));
  router.get('/tasks/:id/result', asyncHandler(tasks.result));
  router.get('/tasks/:id/result/file', asyncHandler(tasks.resultFile));

  router.use(errorHandler); // must be last

  return router;
}

export default createRouter;
