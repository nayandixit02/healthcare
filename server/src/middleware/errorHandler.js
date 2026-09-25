const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  logger.error(`Unhandled error on ${req.method} ${req.url}: ${err.message}`, { stack: err.stack });

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(400).json({
      status: 'error',
      message: 'A duplicate record with unique properties already exists in the system.'
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      status: 'error',
      message: 'Referenced foreign resource not found or cannot be deleted.'
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
}

module.exports = errorHandler;
