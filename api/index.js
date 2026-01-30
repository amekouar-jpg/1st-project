// Vercel serverless entry point
// This file is required by Vercel to run the Express app as a serverless function

console.log('[api/index.js] Loading Express app...');

try {
  const app = require('../server');
  console.log('[api/index.js] Express app loaded successfully');
  
  // Error handler for uncaught errors
  app.use((err, req, res, next) => {
    console.error('[Express Error Handler]', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  });
  
  module.exports = app;
} catch (error) {
  console.error('[api/index.js] CRITICAL ERROR loading server:', error);
  console.error('[api/index.js] Stack:', error.stack);
  
  // Return a minimal Express app that shows the error
  const express = require('express');
  const fallbackApp = express();
  
  fallbackApp.use((req, res) => {
    res.status(500).json({ 
      error: 'Failed to load application',
      message: error.message,
      details: error.toString()
    });
  });
  
  module.exports = fallbackApp;
}
