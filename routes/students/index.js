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
      // Get all students
      const students = await Student.find().sort({ createdAt: -1 });
      return res.status(200).json(students);
    }

    if (req.method === 'POST') {
      // Create student
      const { firstName, lastName, email, phone, dateOfBirth, gpa, status } = req.body;

      if (!firstName || !lastName || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const student = new Student({
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        gpa,
        status
      });

      await student.save();
      return res.status(201).json(student);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Students error:', error);
    return res.status(500).json({ error: error.message });
  }
}
