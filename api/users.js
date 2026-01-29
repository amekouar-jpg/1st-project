const db = require('../db/database');

module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use in-memory users directly when running on Vercel
  if (db.__isMemory && Array.isArray(db.__memoryUsers)) {
    const users = db.__memoryUsers
      .filter(u => u.lastLogin)
      .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))
      .map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        loginCount: u.loginCount || 0
      }));
    return res.json({ users });
  }

  const query = `
    SELECT id, username, email, fullName, createdAt, lastLogin, loginCount
    FROM users
    WHERE lastLogin IS NOT NULL
    ORDER BY lastLogin DESC
  `;

  let responded = false;
  const timeoutId = setTimeout(() => {
    if (!responded) {
      responded = true;
      return res.status(504).json({ error: 'Database timeout' });
    }
  }, 2000);

  db.all(query, (err, rows) => {
    if (responded) return;
    responded = true;
    clearTimeout(timeoutId);
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    return res.json({ users: rows || [] });
  });
};
