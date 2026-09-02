/**
 * Wrap an async (or sync-throwing) route handler so rejected promises are
 * forwarded to Express' error pipeline instead of becoming unhandled
 * rejections. Controllers can then just `throw` domain errors.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
