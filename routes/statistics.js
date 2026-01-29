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
      const totalStudents = await Student.countDocuments();
      const activeStudents = await Student.countDocuments({ status: 'Active' });
      const inactiveStudents = await Student.countDocuments({ status: 'Inactive' });

      const result = await Student.aggregate([
        {
          $group: {
            _id: null,
            avg: { $avg: '$gpa' }
          }
        }
      ]);

      const averageGPA = result.length > 0 ? result[0].avg : 0;

      return res.status(200).json({
        totalStudents: { count: totalStudents },
        activeStudents: { count: activeStudents },
        inactiveStudents: { count: inactiveStudents },
        averageGPA: { avg: averageGPA }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Statistics error:', error);
    return res.status(500).json({ error: error.message });
  }
}
