const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

/**
 * protect — verifies the Bearer JWT in Authorization header.
 * On success, attaches { id, email, name } to req.user and calls next().
 * On failure, returns 401 immediately.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // OAuth redirect flows can't set headers — allow token via query param as fallback
  const queryToken = req.query.token;

  if (!authHeader?.startsWith('Bearer ') && !queryToken) {
    return res.status(401).json({ error: 'No token provided. Access denied.' });
  }

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : queryToken;

  // jwt.verify throws JsonWebTokenError / TokenExpiredError — caught by errorHandler
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Confirm user still exists in DB (handles deleted accounts)
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return res.status(401).json({ error: 'User no longer exists.' });
  }

  req.user = user;
  next();
};

module.exports = { protect };
