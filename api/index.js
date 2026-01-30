// Vercel serverless entry point
// This file is required by Vercel to run the Express app as a serverless function

try {
  const app = require('../server');
  module.exports = app;
} catch (error) {
  console.error('Error loading server:', error);
  throw error;
}
