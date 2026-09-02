import multer from 'multer';
import { AppError } from '../../util/errors.js';
import { rootLogger } from '../../util/Logger.js';

const log = rootLogger.child('http');

// Terminal error middleware. Translates thrown errors to
// { error: { code, message, retryable } }.
// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    return res.status(413).json({ error: { code: err.code, message: err.message } });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, retryable: Boolean(err.retryable) },
    });
  }
  log.error('unhandled route error', err);
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal error' } });
}

export default errorHandler;
