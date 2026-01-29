const { connectDB, User } = require('../../db');

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectDB();

    if (req.method === 'GET') {
      const users = await User.findConnected();
      const sanitized = users.map(u => ({
        id: u._id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        loginCount: u.loginCount || 0,
        loginHistory: u.loginHistory || []
      }));

      return res.status(200).json({ users: sanitized });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Users endpoint error:', error);
    return res.status(500).json({ error: error.message });
  }
}