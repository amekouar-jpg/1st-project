const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authenticateToken(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return { valid: false, user: null, error: 'No token provided' };
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    return { valid: true, user, error: null };
  } catch (error) {
    return { valid: false, user: null, error: error.message };
  }
}

module.exports = { generateToken, authenticateToken, JWT_SECRET };
