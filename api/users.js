module.exports = (req, res) => {
  // Ultra-simple endpoint - just return empty list
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ users: [], debug: 'placeholder' });
};
