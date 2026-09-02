import multer from 'multer';
import config from '../../config.js';

/**
 * Multipart handling for `POST /api/uploads`. Files are kept in memory
 * (never touch disk) and hard-capped so a single request cannot blow the
 * heap. One file per request.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxBytes, files: 1 },
});

export default upload;
