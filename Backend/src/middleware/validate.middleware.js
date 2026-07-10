const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Validation Middleware
 * express-validator ke rules run karne ke baad ye errors check karega
 * 
 * Usage: router.post('/', [validationRules], validate, controller)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return next(ApiError.badRequest('Validation failed', formattedErrors));
  }

  next();
};

module.exports = { validate };
