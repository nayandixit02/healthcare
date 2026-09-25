const express = require('express');
const { z } = require('zod');
const AuthController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const signupSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    phone_number: z.string().optional(),
    role: z.enum(['patient', 'admin', 'staff']).optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  })
});

router.post('/signup', validate(signupSchema), AuthController.signup);
router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', requireAuth, AuthController.getMe);

module.exports = router;
