const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  instagramConnect,
  instagramCallback,
  linkedinConnect,
  linkedinCallback,
  getConnectionStatus,
  disconnectPlatform,
} = require('../controllers/social.controller');

// ─── Instagram ────────────────────────────────────────────────────────────────
// protect — token passed via ?token= query param
router.get('/instagram/connect',  protect, instagramConnect);

// Callback — NO protect middleware (Instagram doesn't forward query params)
// Auth is handled inside the controller via state param
router.get('/instagram/callback', instagramCallback);

// ─── LinkedIn ─────────────────────────────────────────────────────────────────
router.get('/linkedin/connect',   protect, linkedinConnect);

// Callback — NO protect middleware
router.get('/linkedin/callback',  linkedinCallback);

// ─── General ──────────────────────────────────────────────────────────────────
// GET  /api/social/status             — which platforms are connected
router.get('/status', protect, getConnectionStatus);

// DELETE /api/social/:platform/disconnect  — remove a connected account
router.delete('/:platform/disconnect', protect, disconnectPlatform);

module.exports = router;
