const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password.
 * @param {string} password
 * @returns {Promise<string>} hashed password
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain-text password against a stored hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Sign a JWT token for a given user ID.
 * @param {string} userId
 * @returns {string} signed JWT
 */
const signToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Register a new user.
 * Throws if email already taken.
 * @param {string} email
 * @param {string} password
 * @param {string} [name]
 * @returns {{ user: object, token: string }}
 */
const registerUser = async (email, password, name) => {
  // Check for duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email already registered.');
    err.status = 409;
    throw err;
  }

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, password: hashed, name: name || null },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  const token = signToken(user.id);
  return { user, token };
};

/**
 * Authenticate an existing user.
 * Throws if credentials are invalid.
 * @param {string} email
 * @param {string} password
 * @returns {{ user: object, token: string }}
 */
const loginUser = async (email, password) => {
  // Fetch with password field (excluded from normal selects)
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const isMatch = await verifyPassword(password, user.password);
  if (!isMatch) {
    const err = new Error('Invalid email or password.');
    err.status = 401;
    throw err;
  }

  const token = signToken(user.id);

  // Strip password before returning
  const { password: _pwd, ...safeUser } = user;
  return { user: safeUser, token };
};

module.exports = { registerUser, loginUser, signToken, hashPassword, verifyPassword };
