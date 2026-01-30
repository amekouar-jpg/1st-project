const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// ============= DATABASE & AUTH SETUP =============

// Check if Vercel KV is available
const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
let kvStorage = null;

if (hasKV) {
  console.log('✅ Vercel KV detected - will use persistent storage');
  try {
    kvStorage = require('./db/kv-storage');
  } catch (error) {
    console.error('❌ Failed to load KV storage:', error);
  }
}

// Global in-memory storage (fallback if KV not available)
const globalMemoryData = {
  users: [],
  students: [],
  userIdCounter: 1,
  studentIdCounter: 1,
  initialized: false,
  lastAccess: Date.now()
};

let db, authenticateToken, generateToken;

// Detect if running on Vercel - check multiple env vars and hostname
const isVercel = !!(
  process.env.VERCEL || 
  process.env.VERCEL_ENV ||
  process.env.VERCEL_URL ||
  process.env.VERCEL_GITHUB_ORG ||
  (process.env.NODE_ENV === 'production' && !process.env.DATABASE_FILE)
);

console.log('=== SERVER STARTUP ===');
console.log('isVercel:', isVercel);
console.log('hasKV:', hasKV);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Initialize KV if available
if (hasKV && kvStorage) {
  kvStorage.init().then(success => {
    if (success) {
      console.log('🎉 Using Vercel KV for persistent storage');
    } else {
      console.log('⚠️  KV init failed, falling back to memory');
    }
  }).catch(err => {
    console.error('KV init error:', err);
  });
}

if (isVercel) {
  console.log('Running on Vercel');
  console.log('Storage type:', hasKV ? 'Vercel KV (persistent)' : 'In-memory (temporary)');
  console.log('=== MEMORY STATE ON STARTUP ===');
  console.log('Users:', globalMemoryData.users.length);
  console.log('Students:', globalMemoryData.students.length);
  console.log('Initialized:', globalMemoryData.initialized);
  
  const uptime = globalMemoryData.lastAccess ? (Date.now() - globalMemoryData.lastAccess) / 1000 : 0;
  console.log('Instance uptime:', uptime.toFixed(2), 'seconds');
  
  // Mark as initialized
  if (!globalMemoryData.initialized) {
    globalMemoryData.initialized = true;
    console.log('✅ First initialization of this instance');
    console.log('⚠️  WARNING: Data will be lost when instance goes to sleep');
    console.log('📖 For persistence, see VERCEL_PERSISTENCE.md');
  } else {
    console.log('♻️ Instance still warm (data preserved)');
  }
  
  globalMemoryData.lastAccess = Date.now();
  
  // In-memory database implementation using global storage
  db = {
    run: (query, params, callback) => {
      try {
        // INSERT INTO users
        if (query.includes('INSERT INTO users')) {
          // Check for duplicates
          const existingUser = globalMemoryData.users.find(u => u.username === params[0] || u.email === params[1]);
          if (existingUser) {
            const error = new Error(
              existingUser.username === params[0] 
                ? 'UNIQUE constraint failed: users.username'
                : 'UNIQUE constraint failed: users.email'
            );
            if (callback) callback(error);
            return;
          }
          
          const user = {
            id: globalMemoryData.userIdCounter++,
            username: params[0],
            email: params[1],
            password: params[2],
            fullName: params[3] || '',
            lastLogin: new Date().toISOString(),
            loginCount: 0
          };
          globalMemoryData.users.push(user);
          console.log('✅ User added to memory. Total users:', globalMemoryData.users.length);
          if (callback) callback.call({ lastID: user.id }, null);
          return;
        }
        
        // INSERT INTO students
        if (query.includes('INSERT INTO students')) {
          // Check for duplicate email
          const existing = globalMemoryData.students.find(s => s.email === params[2]);
          if (existing) {
            const error = new Error('UNIQUE constraint failed: students.email');
            if (callback) callback(error);
            return;
          }
          
          const student = {
            id: globalMemoryData.studentIdCounter++,
            firstName: params[0],
            lastName: params[1],
            email: params[2],
            phone: params[3],
            dateOfBirth: params[4],
            gpa: params[5],
            status: params[6],
            enrollmentDate: new Date().toISOString()
          };
          globalMemoryData.students.push(student);
          console.log('✅ Student added to memory. Total students:', globalMemoryData.students.length);
          if (callback) callback.call({ lastID: student.id, changes: 1 }, null);
          return;
        }
        
        // UPDATE students
        if (query.includes('UPDATE students')) {
          const id = params[params.length - 1];
          const student = globalMemoryData.students.find(s => s.id == id);
          if (student) {
            student.firstName = params[0];
            student.lastName = params[1];
            student.email = params[2];
            student.phone = params[3];
            student.dateOfBirth = params[4];
            student.gpa = params[5];
            student.status = params[6];
            console.log('✅ Student updated in memory');
            if (callback) callback.call({ changes: 1 }, null);
          } else {
            console.log('❌ Student not found for update');
            if (callback) callback.call({ changes: 0 }, null);
          }
          return;
        }
        
        // UPDATE users
        if (query.includes('UPDATE users SET lastLogin')) {
          const id = params[0];
          const user = globalMemoryData.users.find(u => u.id == id);
          if (user) {
            user.lastLogin = new Date().toISOString();
            user.loginCount = (user.loginCount || 0) + 1;
          }
          if (callback) callback.call({ changes: user ? 1 : 0 }, null);
          return;
        }
        
        // DELETE students
        if (query.includes('DELETE FROM students')) {
          const id = params[0];
          const index = globalMemoryData.students.findIndex(s => s.id == id);
          if (index !== -1) {
            globalMemoryData.students.splice(index, 1);
            console.log('✅ Student deleted from memory. Total students:', globalMemoryData.students.length);
            if (callback) callback.call({ changes: 1 }, null);
          } else {
            if (callback) callback.call({ changes: 0 }, null);
          }
          return;
        }
        
        if (callback) callback(null);
      } catch (err) {
        if (callback) callback(err);
      }
    },
    
    get: (query, params, callback) => {
      try {
        // SELECT from users WHERE username
        if (query.includes('SELECT') && query.includes('FROM users') && query.includes('WHERE username')) {
          const user = globalMemoryData.users.find(u => u.username === params[0]);
          console.log('🔍 User lookup:', params[0], user ? '✅ Found' : '❌ Not found');
          if (callback) callback(null, user || null);
          return;
        }
        
        // SELECT from students WHERE id
        if (query.includes('SELECT') && query.includes('FROM students') && query.includes('WHERE id')) {
          const student = globalMemoryData.students.find(s => s.id == params[0]);
          if (callback) callback(null, student || null);
          return;
        }
        
        if (callback) callback(null, null);
      } catch (err) {
        if (callback) callback(err, null);
      }
    },
    
    all: (query, params, callback) => {
      try {
        // SELECT all students (without WHERE clause)
        if (query.includes('SELECT') && query.includes('FROM students') && !query.includes('WHERE') && !query.includes('LIKE')) {
          console.log('📋 Returning all students. Count:', globalMemoryData.students.length);
          console.log('Students:', JSON.stringify(globalMemoryData.students));
          if (callback) callback(null, [...globalMemoryData.students]);
          return;
        }
        
        // Search students with LIKE
        if (query.includes('LIKE')) {
          const searchTerm = params[0] ? params[0].replace(/%/g, '').toLowerCase() : '';
          const results = globalMemoryData.students.filter(s =>
            s.firstName.toLowerCase().includes(searchTerm) ||
            s.lastName.toLowerCase().includes(searchTerm) ||
            s.email.toLowerCase().includes(searchTerm)
          );
          console.log('🔍 Search results:', results.length);
          if (callback) callback(null, results);
          return;
        }
        
        // COUNT queries
        if (query.includes('COUNT(*)')) {
          if (query.includes("status = 'Active'")) {
            const count = globalMemoryData.students.filter(s => s.status === 'Active').length;
            if (callback) callback(null, { count });
            return;
          }
          if (query.includes("status = 'Inactive'")) {
            const count = globalMemoryData.students.filter(s => s.status === 'Inactive').length;
            if (callback) callback(null, { count });
            return;
          }
          if (callback) callback(null, { count: globalMemoryData.students.length });
          return;
        }
        
        // AVG queries
        if (query.includes('AVG(gpa)')) {
          const avg = globalMemoryData.students.length > 0
            ? globalMemoryData.students.reduce((sum, s) => sum + (s.gpa || 0), 0) / globalMemoryData.students.length
            : 0;
          if (callback) callback(null, { avg });
          return;
        }
        
        if (callback) callback(null, []);
      } catch (err) {
        if (callback) callback(err, []);
      }
    },
    
    serialize: (fn) => fn(),
    __isMemory: true,
    __globalMemory: globalMemoryData
  };
  
  // Mock auth functions
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';
  generateToken = (user) => jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  
  // Proper token authentication for Vercel
  authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      console.warn('No token provided in request');
      return res.status(401).json({ error: 'No token provided' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.error('Token verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid token' });
      }
      req.user = user;
      next();
    });
  };
  console.log('In-memory DB initialized for Vercel');
} else {
  console.log('Running locally - attempting to load SQLite database');
  try {
    db = require('./db/database');
    const auth = require('./db/auth');
    authenticateToken = auth.authenticateToken;
    generateToken = auth.generateToken;
    console.log('SQLite database loaded successfully');
  } catch (dbError) {
    console.warn('Failed to load SQLite, falling back to in-memory DB:', dbError.message);
    // Fallback to in-memory DB if SQLite fails
    const memoryData = {
      users: [],
      students: [],
      userIdCounter: 1,
      studentIdCounter: 1
    };
    
    db = {
      run: (query, params, callback) => {
        if (callback) callback(null);
      },
      get: (query, params, callback) => {
        if (callback) callback(null, null);
      },
      all: (query, params, callback) => {
        if (callback) callback(null, []);
      },
      serialize: (fn) => fn()
    };
    
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';
    generateToken = (user) => jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    authenticateToken = (req, res, next) => next();
  }
}

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

// ============= DEBUG ENDPOINT =============
app.get('/api/debug/memory', async (req, res) => {
  const uptime = globalMemoryData.lastAccess ? (Date.now() - globalMemoryData.lastAccess) / 1000 : 0;
  
  let kvData = null;
  if (hasKV && kvStorage) {
    try {
      const students = await kvStorage.getStudents();
      const users = await kvStorage.getUsers();
      kvData = {
        users: users.length,
        students: students.length,
        studentsList: students.map(s => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          email: s.email
        }))
      };
    } catch (err) {
      kvData = { error: err.message };
    }
  }
  
  const memInfo = {
    isVercel: isVercel,
    hasKV: hasKV,
    storageType: hasKV ? 'Vercel KV (Redis) - PERSISTENT' : 'In-memory - TEMPORARY',
    timestamp: new Date().toISOString(),
    instanceUptime: `${uptime.toFixed(2)} seconds`,
    kvData: kvData,
    memoryFallback: {
      users: globalMemoryData.users.length,
      students: globalMemoryData.students.length,
      initialized: globalMemoryData.initialized
    },
    status: hasKV ? '✅ Persistent storage active' : '⚠️ Temporary storage - data will be lost'
  };
  console.log('📊 Memory debug requested:', memInfo);
  res.json(memInfo);
});

// ============= AUTHENTICATION ROUTES =============

// Handle preflight requests
app.options('/api/auth/register', cors());
app.options('/api/auth/login', cors());
app.options('/api/auth/verify', cors());

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
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
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Use KV if available, otherwise use in-memory DB
    if (hasKV && kvStorage) {
      // Check if user exists
      const existingUser = await kvStorage.findUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      
      // Add user to KV
      const user = await kvStorage.addUser({
        username,
        email,
        password: hashedPassword,
        fullName: fullName || '',
        lastLogin: new Date().toISOString(),
        loginCount: 0
      });
      
      console.log('User registered in KV, ID:', user.id);
      const token = generateToken(user);
      return res.json({ message: 'Registration successful', token, user: { id: user.id, username, email, fullName } });
    }
    
    // Fallback to in-memory DB (original code)
    const query = `
      INSERT INTO users (username, email, password, fullName)
      VALUES (?, ?, ?, ?)
    `;

    console.log('Inserting user into database');
    db.run(query, [username, email, hashedPassword, fullName || ''], function(err) {
      try {
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
      } catch (innerErr) {
        console.error('Error in db.run callback:', innerErr);
        res.status(500).json({ error: 'Internal server error in registration' });
      }
    });
  } catch (error) {
    console.error('Uncaught error in /api/auth/register:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('POST /api/auth/login - Username:', req.body.username);
    
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      console.log('Login validation failed - missing fields');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Use KV if available
    if (hasKV && kvStorage) {
      const user = await kvStorage.findUserByUsername(username);
      
      if (!user) {
        console.log('User not found in KV:', username);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      console.log('User found in KV, comparing passwords');
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        console.log('Password does not match for user:', username);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      console.log('Password matches, generating token for user:', username);
      
      // Update login info
      await kvStorage.updateUser(user.id, {
        lastLogin: new Date().toISOString(),
        loginCount: (user.loginCount || 0) + 1
      });

      const userData = { id: user.id, username: user.username, email: user.email, fullName: user.fullName };
      const token = generateToken(userData);
      console.log('Login successful from KV, sending response');
      return res.json({ message: 'Login successful', token, user: userData });
    }

    // Fallback to in-memory/SQLite DB
    const query = `SELECT id, username, email, password, fullName FROM users WHERE username = ?`;

    console.log('Querying database for user:', username);
    db.get(query, [username], (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        console.log('User not found:', username);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      console.log('User found, comparing passwords');
      
      // Compare passwords
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          console.error('Password comparison error:', err);
          return res.status(500).json({ error: 'Error verifying password' });
        }

        if (!isMatch) {
          console.log('Password does not match for user:', username);
          return res.status(401).json({ error: 'Invalid username or password' });
        }

        console.log('Password matches, generating token for user:', username);
        
        // Record login timestamp
        const loginQuery = `UPDATE users SET lastLogin = CURRENT_TIMESTAMP, loginCount = loginCount + 1 WHERE id = ?`;
        db.run(loginQuery, [user.id], (err) => {
          if (err) {
            console.error('Error recording login:', err);
          } else {
            console.log('Login recorded for user:', username);
          }
        });

        const userData = { id: user.id, username: user.username, email: user.email, fullName: user.fullName };
        const token = generateToken(userData);
        console.log('Login successful, sending response');
        res.json({ message: 'Login successful', token, user: userData });
      });
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Verify token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ user: req.user, message: 'Token is valid' });
});

// ============= STUDENT API ROUTES (Protected) =============

// GET all students
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    console.log('GET /api/students - User:', req.user);
    
    // Use KV if available
    if (hasKV && kvStorage) {
      const students = await kvStorage.getStudents();
      console.log('Returning', students.length, 'students from KV');
      return res.json(students);
    }
    
    // Fallback to in-memory/SQLite
    const query = `
      SELECT id, firstName, lastName, email, phone, dateOfBirth, 
             enrollmentDate, gpa, status 
      FROM students 
      ORDER BY id DESC
    `;
    
    db.all(query, [], (err, rows) => {
      try {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: err.message });
        }
        console.log('Returning', rows ? rows.length : 0, 'students');
        res.json(rows || []);
      } catch (innerErr) {
        console.error('Error in db.all callback:', innerErr);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  } catch (error) {
    console.error('Error in GET /api/students:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
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
app.post('/api/students', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/students - User:', req.user, 'Body:', req.body);
    const { firstName, lastName, email, phone, dateOfBirth, gpa, status } = req.body;
    
    // Validation
    if (!firstName || !lastName || !email) {
      console.log('Validation failed - missing required fields');
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    
    // Use KV if available
    if (hasKV && kvStorage) {
      const student = await kvStorage.addStudent({
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        gpa: parseFloat(gpa) || 0.0,
        status: status || 'Active'
      });
      console.log('Student created in KV with ID:', student.id);
      return res.json(student);
    }
    
    // Fallback to in-memory/SQLite
    const query = `
      INSERT INTO students (firstName, lastName, email, phone, dateOfBirth, gpa, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    console.log('Creating student:', firstName, lastName, email);
    db.run(query, [firstName, lastName, email, phone, dateOfBirth, gpa || 0.0, status || 'Active'], function(err) {
      try {
        if (err) {
          console.error('Database error:', err.message);
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
          } else {
            return res.status(500).json({ error: err.message });
          }
        }
        console.log('Student created with ID:', this.lastID);
        res.json({ id: this.lastID, firstName, lastName, email, phone, dateOfBirth, gpa, status });
      } catch (innerErr) {
        console.error('Error in db.run callback:', innerErr);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  } catch (error) {
    console.error('Error in POST /api/students:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
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
app.get('/api/statistics', authenticateToken, async (req, res) => {
  try {
    console.log('GET /api/statistics - User:', req.user);
    
    // Use KV if available
    if (hasKV && kvStorage) {
      const stats = await kvStorage.getStatistics();
      console.log('Statistics from KV:', stats);
      return res.json(stats);
    }
    
    // For Vercel in-memory DB, directly calculate stats
    if (isVercel || db.__isMemory) {
      const students = globalMemoryData.students;
      const stats = {
        totalStudents: { count: students.length },
        averageGPA: { 
          avg: students.length > 0 
            ? students.reduce((sum, s) => sum + (parseFloat(s.gpa) || 0), 0) / students.length 
            : 0 
        },
        activeStudents: { count: students.filter(s => s.status === 'Active').length },
        inactiveStudents: { count: students.filter(s => s.status === 'Inactive').length }
      };
      console.log('Statistics calculated:', stats);
      return res.json(stats);
    }
    
    // For SQLite, use original query method
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
            console.log('Statistics from DB:', stats);
            res.json(stats);
          }
        });
      });
    });
  } catch (error) {
    console.error('Error in GET /api/statistics:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});


// ============= STATIC FILES & HTML ROUTES =============

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

// Start server - ALWAYS export, listen locally if not Vercel
const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';

if (!isProduction) {
  // Local development
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the Express app for serverless platforms (Vercel)
module.exports = app;
