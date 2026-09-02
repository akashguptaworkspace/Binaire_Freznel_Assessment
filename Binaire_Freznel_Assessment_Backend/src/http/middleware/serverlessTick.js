import config from '../../config.js';

/**
 * In serverless mode there is no background scheduler thread, so every
 * inbound request nudges the engine forward one tick. No-op (and cheap) in
 * long-lived server mode.
 *
 * @param {{ engine: import('../../engine/QueueEngine.js').QueueEngine }} deps
 */
export const serverlessTick = ({ engine }) => (_req, _res, next) => {
  if (config.isServerless) engine.tick();
  next();
};

export default serverlessTick;
