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

    const { id } = req.query;

    if (req.method === 'GET') {
      // Get one student
      const student = await Student.findById(id);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      return res.status(200).json(student);
    }

    if (req.method === 'PUT') {
      // Update student
      const { firstName, lastName, email, phone, dateOfBirth, gpa, status } = req.body;

      const student = await Student.findByIdAndUpdate(
        id,
        { firstName, lastName, email, phone, dateOfBirth, gpa, status },
        { new: true }
      );

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      return res.status(200).json(student);
    }

    if (req.method === 'DELETE') {
      // Delete student
      const student = await Student.findByIdAndDelete(id);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      return res.status(200).json({ message: 'Student deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Student error:', error);
    return res.status(500).json({ error: error.message });
  }
}
