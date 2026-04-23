const { registerUser, loginUser } = require('../services/auth.service');

/**
 * Validate presence and basic format of email + password.
 * Returns an error string or null.
 */
const validateAuthInput = (email, password) => {
  if (!email || !password) return 'Email and password are required.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please provide a valid email address.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
};

/**
 * POST /api/auth/signup
 * Body: { email, password, name? }
 */
const signup = async (req, res) => {
  const { email, password, name } = req.body;

  const validationError = validateAuthInput(email, password);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { user, token } = await registerUser(
    email.toLowerCase().trim(),
    password,
    name?.trim()
  );

  res.status(201).json({
    message: 'Account created successfully.',
    token,
    user,
  });
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  const validationError = validateAuthInput(email, password);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { user, token } = await loginUser(
    email.toLowerCase().trim(),
    password
  );

  res.status(200).json({
    message: 'Login successful.',
    token,
    user,
  });
};

/**
 * GET /api/auth/me   (protected)
 * Returns the currently authenticated user (attached by auth middleware).
 */
const getMe = async (req, res) => {
  res.status(200).json({ user: req.user });
};

module.exports = { signup, login, getMe };
