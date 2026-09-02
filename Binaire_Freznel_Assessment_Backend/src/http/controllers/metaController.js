import config from '../../config.js';

// GET / - service info and endpoint list.
export function createMetaController() {
  return {
    index(_req, res) {
      res.json({
        service: 'binaire-freznel-assessment-backend',
        mode: config.isServerless ? 'serverless' : 'server',
        reduceStrategy: config.workers.strategy,
        endpoints: [
          'POST   /api/clients',
          'POST   /api/clients/:id/heartbeat',
          'DELETE /api/clients/:id',
          'POST   /api/uploads  (multipart: file, clientId, priority)',
          'GET    /api/tasks/:id',
          'POST   /api/tasks/:id/cancel',
          'GET    /api/tasks/:id/result',
          'GET    /api/tasks/:id/result/file',
          'GET    /api/state',
          'GET    /api/stream  (SSE)',
          'POST   /api/tick',
          'GET    /api/health',
        ],
      });
    },
  };
}

export default createMetaController;
