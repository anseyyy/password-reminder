module.exports = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message).join(', ');
    return res.status(400).json({ success: false, message });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  // JWT errors (edge case — normally caught in middleware)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // Known application errors with a status attached
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ success: false, message: err.message });
  }

  // Unknown server error — log internally, never expose internals
  console.error('[Error]', err.message);
  if (isDev) console.error(err.stack);

  res.status(500).json({ success: false, message: 'Internal server error' });
};

