import config from './config.js';
import { createApp } from './app.js';
import { rootLogger } from './util/Logger.js';

// Server entrypoint. Run by `npm start`, Docker and Render.
const { app, engine, sseHub } = createApp();
engine.start();

const server = app.listen(config.http.port, config.http.host, () => {
  rootLogger.info(`queue server listening on http://${config.http.host}:${config.http.port}`);
  rootLogger.info(`  mode=${config.isServerless ? 'serverless' : 'server'} reduce=${config.workers.strategy} pool=${config.workers.poolSize}`);
});

// Node cuts idle connections at 2 min by default; bump it so SSE streams survive.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

async function shutdown(signal) {
  rootLogger.warn(`${signal} received, shutting down`);
  sseHub.close();
  server.close();
  await engine.stop();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => rootLogger.error('unhandledRejection', err));
