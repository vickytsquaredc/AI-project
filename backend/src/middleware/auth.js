const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/database');

// Attach user to request if valid JWT present
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    // Fetch fresh user data from DB
    const { rows } = await query(
      `SELECT id, username, email, role, first_name, last_name, is_active
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!rows[0].is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(err);
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const { rows } = await query(
      'SELECT id, username, email, role, first_name, last_name FROM users WHERE id = $1 AND is_active = true',
      [decoded.id]
    );
    req.user = rows[0] || null;
    next();
  } catch {
    req.user = null;
    next();
  }
};

// Role-based authorization middleware factory
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }
    next();
  };
};

// Shorthand role checkers
const isLibrarian = authorize('librarian', 'admin');
const isAdmin = authorize('admin');
const isStaff = authorize('staff', 'librarian', 'admin');

module.exports = { authenticate, optionalAuth, authorize, isLibrarian, isAdmin, isStaff };
