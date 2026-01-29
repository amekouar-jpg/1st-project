// Expose the Express app for Vercel
// This imports the configured app from server.js and exports it so Vercel can invoke it.

const app = require('../server');

module.exports = app;
