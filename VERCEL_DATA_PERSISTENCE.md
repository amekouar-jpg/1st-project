# Vercel Data Persistence Issue

## Problem
On Vercel (serverless platform), data is **not persistent** between API requests. When you add 2 students, only one appears, and statistics don't update correctly.

**Why?** Each Vercel Function is stateless - `memoryData` gets reset with each new HTTP request.

## Solution: Use Vercel KV Store or a Database

### Option 1: Vercel KV Store (Redis) - EASIEST
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Storage** → Click **Create Database** → Choose **KV**
4. This will automatically set `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables
5. Redeploy your project

The code will automatically detect and use KV Store.

### Option 2: MongoDB Atlas (Free)
1. Create account at [mongodb.com](https://mongodb.com)
2. Create a free cluster
3. Get connection string: `mongodb+srv://user:password@cluster.mongodb.net/dbname`
4. In Vercel Dashboard, add environment variable:
   ```
   MONGODB_URI=mongodb+srv://user:password@...
   ```
5. Redeploy

### Option 3: Supabase PostgreSQL (Free)
1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the connection string
4. In Vercel, add environment variable:
   ```
   DATABASE_URL=postgresql://user:password@...
   ```
5. Redeploy

## Current Behavior
- **Local (SQLite):** Data persists until you restart the server ✅
- **Vercel (in-memory):** Data resets after each request ❌

## Recommendation
Use **Vercel KV** - it's the easiest and requires no setup beyond clicking a button in Vercel Dashboard!
