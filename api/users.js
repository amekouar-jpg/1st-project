module.exports = (req, res) => {
  res.status(200).json({ 
    users: [], 
    message: 'API endpoint working',
    timestamp: new Date().toISOString()
  });
};
