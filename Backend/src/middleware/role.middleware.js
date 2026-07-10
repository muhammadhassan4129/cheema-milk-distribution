const ApiError = require('../utils/ApiError');

/**
 * Role Authorization Middleware
 * protect ke baad chalega - role check karega
 * 
 * Usage: router.get('/admin-only', protect, authorize('Admin'), controller)
 * Multiple roles: authorize('Admin', 'Accountant')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Please login first.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role '${req.user.role}' is not allowed to access this resource. Required: ${roles.join(' or ')}`
        )
      );
    }

    next();
  };
};

module.exports = { authorize };
