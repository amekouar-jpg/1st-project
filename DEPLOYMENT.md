# Student Management System - Vercel Deployment

## Setup Instructions

### 1. Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free
3. Create a cluster (M0 tier - free)
4. Create a database user (username/password)
5. Copy your connection string (it will look like: `mongodb+srv://username:password@cluster.mongodb.net/student-app?retryWrites=true&w=majority`)

### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# During deployment, add these environment variables:
# MONGODB_URI = your connection string from MongoDB Atlas
# JWT_SECRET = any random string (e.g., "my-secret-key-123")
```

### 3. After Deployment

Once deployed, you'll get a URL like `https://your-project.vercel.app`

- Frontend: `https://your-project.vercel.app`
- APIs: `https://your-project.vercel.app/api/*`

The frontend will automatically use the new API URLs.

## Testing Locally (before deployment)

1. Update `public/app.js` and `public/auth.js`:
   - Change `const API_URL = '/api'` to `const API_URL = 'http://localhost:3000/api'`

2. Install MongoDB locally or use MongoDB Atlas connection string

3. Run:
```bash
npm install
node server.js
```

## File Structure
```
app/
├── api/                    # Vercel serverless functions
│   ├── db.js              # MongoDB connection & schemas
│   ├── auth-utils.js      # JWT utilities
│   ├── auth/
│   │   ├── register.js
│   │   ├── login.js
│   │   └── verify.js
│   ├── students/
│   │   ├── index.js       # GET all, POST create
│   │   ├── [id].js        # GET one, PUT update, DELETE
│   │   └── search/
│   │       └── [query].js # Search students
│   └── statistics.js      # Dashboard stats
├── public/                # Frontend files
│   ├── index.html
│   ├── login.html
│   ├── app.js
│   ├── auth.js
│   └── styles.css
├── server.js              # Local development server
├── package.json
└── vercel.json           # Vercel config
```

## Important Notes

- **sessionStorage** is used for tokens (cleared on browser close)
- The API automatically includes CORS headers
- All routes require JWT authentication (except register/login)
- MongoDB Atlas free tier has limits (512MB storage, shared resources)
