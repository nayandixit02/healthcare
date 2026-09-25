const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const logger = require('../config/logger');

class AuthController {
  static async signup(req, res, next) {
    try {
      const { email, password, full_name, phone_number, role = 'patient' } = req.body;

      const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'A user with this email address already exists.'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const insertRes = await db.query(
        `INSERT INTO users (email, password, full_name, phone_number, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, full_name, phone_number, role, is_active, created_at`,
        [email.toLowerCase(), hashedPassword, full_name, phone_number || null, role, true]
      );

      const user = insertRes.rows[0];
      const { password: _, ...userWithoutPassword } = user;
      logger.info(`User registered: ${user.email} (ID: ${user.id})`);

      res.status(201).json({
        status: 'success',
        data: userWithoutPassword
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const userRes = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (userRes.rows.length === 0) {
        return res.status(401).json({
          status: 'error',
          message: 'Incorrect email or password'
        });
      }

      const user = userRes.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({
          status: 'error',
          message: 'Incorrect email or password'
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          status: 'error',
          message: 'User account is deactivated'
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      const { password: _, ...userProfile } = user;

      res.status(200).json({
        status: 'success',
        access_token: token,
        token_type: 'bearer',
        user: userProfile
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res) {
    res.status(200).json({
      status: 'success',
      data: req.user
    });
  }
}

module.exports = AuthController;
