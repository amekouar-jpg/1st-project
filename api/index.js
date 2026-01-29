// Ultra-minimal Express server for Vercel with NO heavy loading
const express = require('express');
const app = express();

// Quick health check
app.get('/', (req, res) => res.send('OK'));

// Fast API endpoints
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.get('/api/users/:id', (req, res) => {
  res.json({ user: null });
});

// Default export for Vercel
module.exports = app;
