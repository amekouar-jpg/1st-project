module.exports = (req, res) => {
  res.status(200).json({ 
    test: 'working', 
    env: process.env.NODE_ENV, 
    vercel: !!process.env.VERCEL 
  });
};
