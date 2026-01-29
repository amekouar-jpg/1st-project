const { connectDB, Student } = require('../../db');
const { authenticateToken } = require('../../auth-utils');

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

    // Verify token
    const auth = authenticateToken(req);
    if (!auth.valid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({ error: 'Search query required' });
      }

      const students = await Student.find({
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      });

      return res.status(200).json(students);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: error.message });
  }
}
