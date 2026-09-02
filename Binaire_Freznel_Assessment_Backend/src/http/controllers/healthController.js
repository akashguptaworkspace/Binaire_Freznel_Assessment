import config from '../../config.js';

/**
 * Liveness probe (`GET /api/health`). Render's health check hits this.
 */
export function createHealthController() {
  return {
    show(_req, res) {
      res.json({
        ok: true,
        mode: config.isServerless ? 'serverless' : 'server',
        uptimeMs: process.uptime() * 1000,
      });
    },
  };
}

export default createHealthController;
