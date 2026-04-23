const instagramService = require('../services/instagram.service');
const linkedinService  = require('../services/linkedin.service');
const prisma           = require('../config/prisma');

// ─── Instagram ────────────────────────────────────────────────────────────────

/**
 * GET /api/social/instagram/connect
 * Redirects the authenticated user to Facebook's OAuth consent screen.
 */
const instagramConnect = (req, res) => {
  // Pass JWT token via state so callback can authenticate the user
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  const url = instagramService.getAuthUrl(token);
  res.redirect(url);
};

/**
 * GET /api/social/instagram/callback
 * Meta redirects here after the user grants (or denies) permissions.
 *
 * Query params: ?code=... or ?error=...
 */
const instagramCallback = async (req, res) => {
  const { code, error, state } = req.query;

  // Authenticate user from state param (JWT passed through OAuth flow)
  if (state && !req.user) {
    try {
      const jwt    = require('jsonwebtoken');
      const prisma = require('../config/prisma');
      const decoded = jwt.verify(state, process.env.JWT_SECRET);
      const user    = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user) req.user = user;
    } catch (e) {
      return res.redirect(`${process.env.FRONTEND_URL}/connect-accounts?error=invalid_token`);
    }
  }

  if (error || !code) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/connect-accounts?error=instagram_denied`
    );
  }

  // Exchange code for long-lived token
  let tokenData;
  try {
    tokenData = await instagramService.exchangeCodeForToken(code);
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[Instagram callback] Token exchange failed:', JSON.stringify(detail));
    return res.status(500).json({ error: 'Token exchange failed', detail });
  }
  const { accessToken, expiresIn, igUserId } = tokenData;

  // Fetch Instagram profile using the new Business Login API
  const { igUsername } = await instagramService.getInstagramProfile(igUserId, accessToken);

  // Persist
  await instagramService.saveAccount(req.user.id, {
    accessToken,
    expiresIn,
    igUserId,
    igUsername,
  });

  res.redirect(
    `${process.env.FRONTEND_URL}/connect-accounts?success=instagram`
  );
};

// ─── LinkedIn ─────────────────────────────────────────────────────────────────

/**
 * GET /api/social/linkedin/connect
 * Redirects the authenticated user to LinkedIn's OAuth consent screen.
 */
const linkedinConnect = (req, res) => {
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  const url = linkedinService.getAuthUrl(token);
  res.redirect(url);
};

/**
 * GET /api/social/linkedin/callback
 * LinkedIn redirects here after the user grants permissions.
 *
 * Query params: ?code=... or ?error=...
 */
const linkedinCallback = async (req, res) => {
  const { code, error, state } = req.query;

  // Authenticate user from state param (JWT passed through OAuth flow)
  if (state && !req.user) {
    try {
      const jwt    = require('jsonwebtoken');
      const prisma = require('../config/prisma');
      const decoded = jwt.verify(state, process.env.JWT_SECRET);
      const user    = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user) req.user = user;
    } catch (e) {
      return res.redirect(`${process.env.FRONTEND_URL}/connect-accounts?error=invalid_token`);
    }
  }

  if (error || !code) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/connect-accounts?error=linkedin_denied`
    );
  }

  if (!req.user) {
    return res.redirect(`${process.env.FRONTEND_URL}/connect-accounts?error=not_authenticated`);
  }

  // Exchange code → access token
  const { accessToken, expiresIn } = await linkedinService.exchangeCodeForToken(code);

  // Fetch member profile (id + name)
  const { memberId, name } = await linkedinService.getMemberProfile(accessToken);

  // Persist
  await linkedinService.saveAccount(req.user.id, {
    accessToken,
    expiresIn,
    memberId,
    name,
  });

  res.redirect(
    `${process.env.FRONTEND_URL}/connect-accounts?success=linkedin`
  );
};

// ─── Status ───────────────────────────────────────────────────────────────────

/**
 * GET /api/social/status
 * Returns which platforms the user has connected, with account display names.
 */
const getConnectionStatus = async (req, res) => {
  const accounts = await prisma.socialAccount.findMany({
    where:  { userId: req.user.id },
    select: {
      platform:    true,
      accountName: true,
      expiresAt:   true,
      createdAt:   true,
    },
  });

  // Shape into a map: { INSTAGRAM: {...}, LINKEDIN: {...} }
  const status = accounts.reduce((acc, account) => {
    acc[account.platform] = {
      connected:   true,
      accountName: account.accountName,
      expiresAt:   account.expiresAt,
      connectedAt: account.createdAt,
    };
    return acc;
  }, {});

  res.json({ status });
};

/**
 * DELETE /api/social/:platform/disconnect
 * Removes the stored token — user will need to re-connect.
 */
const disconnectPlatform = async (req, res) => {
  const { platform } = req.params;
  const upper = platform.toUpperCase();

  if (!['INSTAGRAM', 'LINKEDIN'].includes(upper)) {
    return res.status(400).json({ error: 'Invalid platform.' });
  }

  await prisma.socialAccount.deleteMany({
    where: { userId: req.user.id, platform: upper },
  });

  res.json({ message: `${upper} disconnected successfully.` });
};

module.exports = {
  instagramConnect,
  instagramCallback,
  linkedinConnect,
  linkedinCallback,
  getConnectionStatus,
  disconnectPlatform,
};
