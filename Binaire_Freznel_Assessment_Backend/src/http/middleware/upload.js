import multer from 'multer';
import config from '../../config.js';

// Multipart parsing for POST /api/uploads. One file, in memory, size-capped.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxBytes, files: 1 },
});

export default upload;
