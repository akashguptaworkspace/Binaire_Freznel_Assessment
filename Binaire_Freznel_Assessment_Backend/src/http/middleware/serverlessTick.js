import config from '../../config.js';

// Serverless has no background scheduler, so every request advances the
// engine one tick. No-op in server mode.
export const serverlessTick = ({ engine }) => (_req, _res, next) => {
  if (config.isServerless) engine.tick();
  next();
};

export default serverlessTick;
