// Absolute minimal server.js for Vercel testing
const express = require('express');
const app = express();

// Quick endpoints
app.get('/', (req, res) => res.send('OK'));
app.get('/test', (req, res) => res.json({ test: 'ok' }));
app.get('/api/users', (req, res) => res.json({ users: [] }));

module.exports = app;

// For local development
if (!process.env.VERCEL) {
  app.listen(5000, () => console.log('Running on port 5000'));
}
