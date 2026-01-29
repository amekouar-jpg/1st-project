const { connectDB } = require('../db');
const { authenticateToken } = require('../auth-utils');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectDB();

    if (req.method === 'GET') {
      const auth = authenticateToken(req);
      
      if (!auth.valid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(200).json({
        valid: true,
        user: auth.user
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({ error: error.message });
  }
}
