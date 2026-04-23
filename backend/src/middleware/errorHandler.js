/**
 * Global error handler middleware.
 * Catches all errors thrown in route handlers (via express-async-errors).
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  // Prisma known request errors (e.g. unique constraint violation)
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'A record with this value already exists.',
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found.' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired.' });
  }

  // Validation errors (custom)
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Generic server error
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
};

module.exports = { errorHandler };
