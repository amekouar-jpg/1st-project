const mongoose = require('mongoose');

// MongoDB connection - use environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-app';

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection && cachedConnection.readyState === 1) {
    console.log('Using cached MongoDB connection');
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    cachedConnection = conn;
    console.log('Connected to MongoDB');
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  fullName: String,
  createdAt: { type: Date, default: Date.now }
});

// Student Schema
const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phone: String,
  dateOfBirth: Date,
  enrollmentDate: { type: Date, default: Date.now },
  gpa: { type: Number, min: 0, max: 4 },
  status: { type: String, enum: ['Active', 'Inactive', 'On Leave'], default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

// Export models
module.exports = {
  connectDB,
  User: mongoose.model('User', userSchema),
  Student: mongoose.model('Student', studentSchema)
};
