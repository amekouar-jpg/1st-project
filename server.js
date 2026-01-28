const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db/database');
const { authenticateToken, generateToken } = require('./db/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - IMPORTANT: CORS and body parsing must come first
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Handle preflight for all routes
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============= AUTHENTICATION ROUTES (BEFORE static files) =============

console.log('Registering authentication routes...');

// Handle preflight requests
app.options('/api/auth/register', cors());
app.options('/api/auth/login', cors());
app.options('/api/auth/verify', cors());

// Register new user
app.post('/api/auth/register', (req, res) => {
  console.log('POST /api/auth/register - Body:', req.body);
  
  const { username, email, password, fullName } = req.body;

  // Validation
  if (!username || !email || !password) {
    console.log('Validation failed - missing fields');
    res.status(400).json({ error: 'Username, email, and password are required' });
    return;
  }

  if (password.length < 6) {
    console.log('Validation failed - password too short');
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  console.log('Hashing password for user:', username);
  
  // Hash password
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      res.status(500).json({ error: 'Error processing password' });
      return;
    }

    const query = `
      INSERT INTO users (username, email, password, fullName)
      VALUES (?, ?, ?, ?)
    `;

    console.log('Inserting user into database');
    db.run(query, [username, email, hashedPassword, fullName || ''], function(err) {
      if (err) {
        console.error('Database error:', err.message);
        if (err.message.includes('UNIQUE constraint failed')) {
          if (err.message.includes('username')) {
            res.status(400).json({ error: 'Username already exists' });
          } else {
            res.status(400).json({ error: 'Email already exists' });
          }
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }

      console.log('User registered successfully, ID:', this.lastID);
      const user = { id: this.lastID, username, email, fullName };
      const token = generateToken(user);
      console.log('Sending registration response with token');
      res.json({ message: 'Registration successful', token, user });
    });
  });
});

// Login user
app.post('/api/auth/login', (req, res) => {
  console.log('POST /api/auth/login - Username:', req.body.username);
  
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    console.log('Login validation failed - missing fields');
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const query = `SELECT id, username, email, password, fullName FROM users WHERE username = ?`;

  console.log('Querying database for user:', username);
  db.get(query, [username], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: err.message });
      return;
    }

    if (!user) {
      console.log('User not found:', username);
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    console.log('User found, comparing passwords');
    
    // Compare passwords
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Password comparison error:', err);
        res.status(500).json({ error: 'Error verifying password' });
        return;
      }

      if (!isMatch) {
        console.log('Password does not match for user:', username);
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }

      console.log('Password matches, generating token for user:', username);
      const userData = { id: user.id, username: user.username, email: user.email, fullName: user.fullName };
      const token = generateToken(userData);
      console.log('Login successful, sending response');
      res.json({ message: 'Login successful', token, user: userData });
    });
  });
});

// Verify token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ user: req.user, message: 'Token is valid' });
});

// ============= STUDENT API ROUTES (Protected) =============

// GET all students
app.get('/api/students', authenticateToken, (req, res) => {
  const query = `
    SELECT id, firstName, lastName, email, phone, dateOfBirth, 
           enrollmentDate, gpa, status 
    FROM students 
    ORDER BY id DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows || []);
  });
});

// GET single student by ID
app.get('/api/students/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT id, firstName, lastName, email, phone, dateOfBirth, 
           enrollmentDate, gpa, status 
    FROM students 
    WHERE id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.json(row);
  });
});

// CREATE new student
app.post('/api/students', authenticateToken, (req, res) => {
  const { firstName, lastName, email, phone, dateOfBirth, gpa, status } = req.body;
  
  // Validation
  if (!firstName || !lastName || !email) {
    res.status(400).json({ error: 'First name, last name, and email are required' });
    return;
  }
  
  const query = `
    INSERT INTO students (firstName, lastName, email, phone, dateOfBirth, gpa, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [firstName, lastName, email, phone, dateOfBirth, gpa || 0.0, status || 'Active'], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    res.json({ id: this.lastID, firstName, lastName, email, phone, dateOfBirth, gpa, status });
  });
});

// UPDATE student
app.put('/api/students/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, phone, dateOfBirth, gpa, status } = req.body;
  
  if (!firstName || !lastName || !email) {
    res.status(400).json({ error: 'First name, last name, and email are required' });
    return;
  }
  
  const query = `
    UPDATE students 
    SET firstName = ?, lastName = ?, email = ?, phone = ?, dateOfBirth = ?, gpa = ?, status = ?
    WHERE id = ?
  `;
  
  db.run(query, [firstName, lastName, email, phone, dateOfBirth, gpa || 0.0, status || 'Active', id], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.json({ id: parseInt(id), firstName, lastName, email, phone, dateOfBirth, gpa, status });
  });
});

// DELETE student
app.delete('/api/students/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  const query = `DELETE FROM students WHERE id = ?`;
  
  db.run(query, [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.json({ message: 'Student deleted successfully', id: parseInt(id) });
  });
});

// SEARCH students
app.get('/api/students/search/:query', authenticateToken, (req, res) => {
  const { query } = req.params;
  const searchQuery = `%${query}%`;
  
  const sql = `
    SELECT id, firstName, lastName, email, phone, dateOfBirth, 
           enrollmentDate, gpa, status 
    FROM students 
    WHERE firstName LIKE ? OR lastName LIKE ? OR email LIKE ?
    ORDER BY id DESC
  `;
  
  db.all(sql, [searchQuery, searchQuery, searchQuery], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows || []);
  });
});

// GET statistics
app.get('/api/statistics', authenticateToken, (req, res) => {
  db.serialize(() => {
    const queries = {
      totalStudents: 'SELECT COUNT(*) as count FROM students',
      averageGPA: 'SELECT AVG(gpa) as avg FROM students',
      activeStudents: "SELECT COUNT(*) as count FROM students WHERE status = 'Active'",
      inactiveStudents: "SELECT COUNT(*) as count FROM students WHERE status = 'Inactive'"
    };
    
    const stats = {};
    let completed = 0;
    
    Object.keys(queries).forEach(key => {
      db.get(queries[key], [], (err, row) => {
        if (!err) {
          stats[key] = row;
        }
        completed++;
        if (completed === Object.keys(queries).length) {
          res.json(stats);
        }
      });
    });
  });
});

// ============= STATIC FILES & HTML ROUTES =============

// HTML routes MUST come BEFORE static files
// Serve login page for root path
app.get('/', (req, res) => {
  console.log('GET / - serving login.html');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve dashboard for /dashboard
app.get('/dashboard', (req, res) => {
  console.log('GET /dashboard - serving index.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files (CSS, JS, images, etc.) - AFTER routes
app.use(express.static(path.join(__dirname, 'public')));

// Start server
console.log('Routes registered. Starting server...');
app.listen(PORT, () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server');
});
