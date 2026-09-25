const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication credentials were not provided'
      });
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, config.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired access token'
      });
    }

    const result = await db.query('SELECT * FROM users WHERE id = $1', [payload.id || payload.sub]);
    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'User associated with token does not exist'
      });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({
        status: 'error',
        message: 'User account is deactivated'
      });
    }

    // Attach user to request object (exclude password hash)
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Administrative privileges required to access this resource'
    });
  }
  next();
}

function requireStaffOrAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'staff')) {
    return res.status(403).json({
      status: 'error',
      message: 'Staff or administrative privileges required'
    });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireStaffOrAdmin
};
