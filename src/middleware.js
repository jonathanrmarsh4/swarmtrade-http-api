import { logger } from './logger.js';

/**
 * Validates that required fields exist in request body
 * Usage: app.post('/endpoint', validatePostBody(['field1', 'field2']), handler)
 */
export function validatePostBody(requiredFields = []) {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(
      (field) => !(field in req.body) || req.body[field] === null || req.body[field] === undefined
    );

    if (missingFields.length > 0) {
      logger.warn(`[API] Validation failed for ${req.path}`, {
        path: req.path,
        missingFields,
        body: req.body,
      });
      return res.status(400).json({
        error: 'Validation failed',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        received: req.body,
      });
    }

    next();
  };
}

/**
 * Validates query parameters
 */
export function validateQuery(validators = {}) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(validators)) {
      const value = req.query[field];

      if (rules.required && !value) {
        errors.push(`${field} is required`);
      }

      if (value && rules.type === 'number' && isNaN(Number(value))) {
        errors.push(`${field} must be a number`);
      }

      if (value && rules.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`);
      }
    }

    if (errors.length > 0) {
      logger.warn(`[API] Query validation failed for ${req.path}`, {
        path: req.path,
        errors,
        query: req.query,
      });
      return res.status(400).json({
        error: 'Validation failed',
        message: errors.join('; '),
      });
    }

    next();
  };
}
