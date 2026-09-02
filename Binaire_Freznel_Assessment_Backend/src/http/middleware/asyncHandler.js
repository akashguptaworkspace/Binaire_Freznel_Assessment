// Forward a rejected handler promise to Express' error handler so controllers
// can just throw.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
