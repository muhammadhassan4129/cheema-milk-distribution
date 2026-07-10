/**
 * Async Handler Wrapper
 * try-catch likhne ki zaroorat nahi - ye automatically handle karega
 * 
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
