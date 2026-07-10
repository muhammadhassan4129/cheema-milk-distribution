const express = require('express');
const { body } = require('express-validator');
const { login, getMe, logout, updatePreferences } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username is required').trim(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

// GET /api/auth/me
router.get('/me', protect, getMe);

// POST /api/auth/logout
// protect middleware nahi — logout always allow karo (token invalid/missing ho toh bhi)
router.post('/logout', logout);

// PUT /api/auth/preferences
router.put('/preferences', protect, updatePreferences);

module.exports = router;
