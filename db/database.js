// Database adapter - uses SQLite locally, in-memory on Vercel
const isVercel = process.env.VERCEL || process.env.NOW_REGION;

let db;
let usersMemory = [];
let studentsMemory = [];
let userIdCounter = 1;
let studentIdCounter = 1;

if (isVercel) {
  console.log('Running on Vercel - using in-memory database');
  
  // In-memory database for Vercel
  db = {
    run: (query, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      params = params || [];
      setTimeout(() => {
        try {
          if (query.includes('INSERT INTO users')) {
            const [username, email, password, fullName] = params;
            const existing = usersMemory.find(u => u.username === username || u.email === email);
            if (existing) {
              return callback(new Error('UNIQUE constraint failed'));
            }
            const user = {
              id: userIdCounter++,
              username,
              email,
              password,
              fullName,
              createdAt: new Date().toISOString(),
              lastLogin: null,
              loginCount: 0
            };
            usersMemory.push(user);
            callback.call({ lastID: user.id });
          } else if (query.includes('UPDATE users SET lastLogin')) {
            const userId = params[0];
            const user = usersMemory.find(u => u.id === userId);
            if (user) {
              user.lastLogin = new Date().toISOString();
              user.loginCount = (user.loginCount || 0) + 1;
            }
            callback(null);
          } else if (query.includes('INSERT INTO students')) {
            const student = {
              id: studentIdCounter++,
              firstName: params[0],
              lastName: params[1],
              email: params[2],
              phone: params[3] || '',
              dateOfBirth: params[4] || '',
              enrollmentDate: params[5] || new Date().toISOString(),
              gpa: parseFloat(params[6]) || 0,
              status: params[7] || 'Active',
              createdAt: new Date().toISOString()
            };
            studentsMemory.push(student);
            callback.call({ lastID: student.id });
          } else if (query.includes('UPDATE students')) {
            callback(null);
          } else if (query.includes('DELETE FROM students')) {
            callback(null);
          } else {
            callback(null);
          }
        } catch (err) {
          callback(err);
        }
      }, 0);
    },
    
    get: (query, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      params = params || [];
      setTimeout(() => {
        try {
          if (query.includes('FROM users WHERE username')) {
            const username = params[0];
            const user = usersMemory.find(u => u.username === username);
            callback(null, user || null);
          } else if (query.includes('FROM students WHERE id')) {
            const id = parseInt(params[0]);
            const student = studentsMemory.find(s => s.id === id);
            callback(null, student || null);
          } else {
            callback(null, null);
          }
        } catch (err) {
          callback(err, null);
        }
      }, 0);
    },
    
    all: (query, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      params = params || [];
      setTimeout(() => {
        try {
          if (query.includes('FROM users')) {
            if (query.includes('WHERE lastLogin IS NOT NULL')) {
              const connected = usersMemory.filter(u => u.lastLogin).sort((a, b) => 
                new Date(b.lastLogin) - new Date(a.lastLogin)
              );
              callback(null, connected);
            } else {
              callback(null, usersMemory);
            }
          } else if (query.includes('FROM students')) {
            if (query.includes('WHERE status')) {
              const status = params?.[0] || 'Active';
              callback(null, studentsMemory.filter(s => s.status === status));
            } else if (query.includes('LIKE') || query.includes('firstName')) {
              const searchTerm = (params[0] || '').replace(/%/g, '').toLowerCase();
              const results = studentsMemory.filter(s => 
                (s.firstName || '').toLowerCase().includes(searchTerm) ||
                (s.lastName || '').toLowerCase().includes(searchTerm) ||
                (s.email || '').toLowerCase().includes(searchTerm)
              );
              callback(null, results);
            } else if (query.includes('COUNT')) {
              callback(null, [{ 'COUNT(*)': studentsMemory.length, 'AVG(gpa)': 0 }]);
            } else {
              callback(null, studentsMemory.sort((a, b) => b.id - a.id));
            }
          } else {
            callback(null, []);
          }
        } catch (err) {
          callback(err, []);
        }
      }, 0);
    }
  };
  
  // Initialize tables immediately
  console.log('Users table initialized (in-memory)');
  console.log('Students table initialized (in-memory)');
  
} else {
  console.log('Running locally - using SQLite database');
  
  // Use SQLite for local development
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  
  const dbPath = path.join(__dirname, 'students.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    } else {
      console.log('Connected to SQLite database');
      initializeDatabase();
    }
  });
  
  function initializeDatabase() {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          fullName TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          lastLogin DATETIME,
          loginCount INTEGER DEFAULT 0,
          loginHistory TEXT DEFAULT '[]'
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
        } else {
          console.log('Users table initialized');
        }
      });
      
      db.run(`
        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT,
          dateOfBirth TEXT,
          enrollmentDate TEXT DEFAULT CURRENT_TIMESTAMP,
          gpa REAL DEFAULT 0.0,
          status TEXT DEFAULT 'Active',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating table:', err);
        } else {
          console.log('Students table initialized');
        }
      });
    });
  }
}

module.exports = db;
