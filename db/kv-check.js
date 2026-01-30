// Check if Vercel KV is available and configured
async function checkKVAvailability() {
  try {
    // Check if KV environment variables are set
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = require('@vercel/kv');
      // Test connection
      await kv.ping();
      console.log('✅ Vercel KV is available and connected');
      return true;
    } else {
      console.log('⚠️  Vercel KV env vars not found (KV_REST_API_URL, KV_REST_API_TOKEN)');
      return false;
    }
  } catch (error) {
    console.log('⚠️  Vercel KV not available:', error.message);
    return false;
  }
}

module.exports = { checkKVAvailability };
