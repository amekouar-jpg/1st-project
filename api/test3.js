// Test 3 - Check env vars
module.exports = (req, res) => {
  res.status(200).json({ 
    vercel: !!process.env.VERCEL,
    vercel_env: process.env.VERCEL_ENV,
    node_env: process.env.NODE_ENV,
    region: process.env.VERCEL_REGION
  });
};
