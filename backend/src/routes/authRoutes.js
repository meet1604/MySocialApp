const express = require('express');
const router = express.Router();
const { signup, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/login
router.post('/login', login);

// GET  /api/auth/me  — protected: requires valid JWT
router.get('/me', protect, getMe);

module.exports = router;
