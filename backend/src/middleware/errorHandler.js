const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Postgres errors
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }
  if (err.code === '23503') {
    return res.status(409).json({ error: 'Referenced record does not exist.' });
  }
  if (err.code === '23514') {
    return res.status(400).json({ error: 'Data validation constraint failed.' });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
