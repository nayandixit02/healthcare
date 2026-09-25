const { z } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      // Replace req.body with parsed sanitized body if defined
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(422).json({
          status: 'error',
          message: 'Validation failed',
          errors: err.errors.map(e => ({
            field: e.path.join('.').replace(/^(body|query|params)\./, ''),
            message: e.message
          }))
        });
      }
      next(err);
    }
  };
}

module.exports = validate;
