# 🎯 AUTHENTICATION SYSTEM - REFERENCE CARD

## 🔐 Login Page Features

### Authentication Form
```
┌─────────────────────────────────────────────┐
│     📚 Student Management System             │
│     Secure Access to Student Records        │
├─────────────────────────────────────────────┤
│                                             │
│  Sign In                                    │
│  [Username Box         ]                    │
│  [Password Box         ]                    │
│  [Sign In Button]                           │
│                                             │
│  Don't have account? [Create one]           │
│                                             │
└─────────────────────────────────────────────┘
```

### Registration Form
```
┌─────────────────────────────────────────────┐
│     📚 Student Management System             │
│     Secure Access to Student Records        │
├─────────────────────────────────────────────┤
│                                             │
│  Create Account                             │
│  [Username Box         ]                    │
│  [Email Box            ]                    │
│  [Full Name Box        ]                    │
│  [Password Box         ]                    │
│  [Confirm Password Box ]                    │
│  [Create Account Button]                    │
│                                             │
│  Already have account? [Sign in]            │
│                                             │
└─────────────────────────────────────────────┘
```

## 📊 Dashboard Header

```
┌──────────────────────────────────────────────────────┐
│  📚 Student Management System                         │
│  Manage and track student information efficiently     │
│                                                      │
│                          👤 John Doe  [Logout]       │
└──────────────────────────────────────────────────────┘
```

## 🔄 API Request/Response Flow

### Registration Request
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "password": "password123"
}

RESPONSE (200 OK):
{
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe"
  }
}
```

### Login Request
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "password123"
}

RESPONSE (200 OK):
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### Protected Request (With Token)
```
GET /api/students
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

RESPONSE (200 OK):
[
  { "id": 1, "firstName": "John", "lastName": "Doe", ... },
  { "id": 2, "firstName": "Jane", "lastName": "Smith", ... }
]
```

### Unauthorized Request (No/Invalid Token)
```
GET /api/students
Authorization: Bearer invalid_token

RESPONSE (401 Unauthorized):
{
  "error": "Invalid or expired token"
}
```

## 🗄️ Database Tables

### Users Table
```sql
┌──────────────┬──────────────┬──────────────────┐
│ Column       │ Type         │ Constraint       │
├──────────────┼──────────────┼──────────────────┤
│ id           │ INTEGER      │ PRIMARY KEY      │
│ username     │ TEXT         │ UNIQUE, NOT NULL │
│ email        │ TEXT         │ UNIQUE, NOT NULL │
│ password     │ TEXT         │ NOT NULL (hash)  │
│ fullName     │ TEXT         │ Optional         │
│ createdAt    │ DATETIME     │ DEFAULT NOW      │
└──────────────┴──────────────┴──────────────────┘
```

### Students Table
```sql
┌──────────────────┬──────────┬──────────────────┐
│ Column           │ Type     │ Constraint       │
├──────────────────┼──────────┼──────────────────┤
│ id               │ INTEGER  │ PRIMARY KEY      │
│ firstName        │ TEXT     │ NOT NULL         │
│ lastName         │ TEXT     │ NOT NULL         │
│ email            │ TEXT     │ UNIQUE, NOT NULL │
│ phone            │ TEXT     │ Optional         │
│ dateOfBirth      │ TEXT     │ Optional         │
│ enrollmentDate   │ TEXT     │ DEFAULT NOW      │
│ gpa              │ REAL     │ DEFAULT 0.0      │
│ status           │ TEXT     │ DEFAULT 'Active' │
│ createdAt        │ DATETIME │ DEFAULT NOW      │
└──────────────────┴──────────┴──────────────────┘
```

## 🔑 JWT Token Structure

```
Header.Payload.Signature

Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "iat": 1611234567,
  "exp": 1611320967           ← 24 hours later
}

Signature:
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret_key
)
```

## 🔐 Password Hashing Flow

```
User Input:     "password123"
                    ↓
bcryptjs hash() function (10 rounds)
                    ↓
Stored:         "$2a$10$..."
                (never plain text)
                    ↓
On Login:       bcryptjs compare()
                    ↓
Match? Yes      → Generate token
       No       → "Invalid credentials"
```

## 🚀 Middleware Chain

```
Request arrives
    ↓
Request logging
    ↓
Parse JSON body
    ↓
Check route
    ↓
Protected route? (Yes)
    ↓
authenticateToken middleware
    ├─ Token exists?
    ├─ Token valid?
    ├─ Token expired?
    └─ If all OK → attach user to req
    ↓
Route handler executes
    ↓
Return response
    ↓
Response sent to client
```

## 📋 Complete API Endpoint List

### Auth Endpoints
```
POST   /api/auth/register      Register new user
POST   /api/auth/login         Login user
GET    /api/auth/verify        Verify token
```

### Student Endpoints (Protected)
```
GET    /api/students           Get all students
GET    /api/students/:id       Get specific student
POST   /api/students           Create student
PUT    /api/students/:id       Update student
DELETE /api/students/:id       Delete student
GET    /api/students/search/:q Search students
GET    /api/statistics         Get stats
```

## 🧪 Test Commands (cURL)

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@test.com","password":"password123"}'
```

### Login User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"password123"}'
```

### Get Students (with token)
```bash
curl -X GET http://localhost:3000/api/students \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Student (with token)
```bash
curl -X POST http://localhost:3000/api/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@test.com"}'
```

## ✅ Status Codes

```
200 OK                  ✅ Request successful
201 Created             ✅ Resource created
400 Bad Request         ❌ Validation error (missing fields)
401 Unauthorized        ❌ No/invalid token
403 Forbidden           ❌ Token expired
404 Not Found           ❌ Resource doesn't exist
500 Server Error        ❌ Internal error
```

## 📁 File Quick Reference

| File | Purpose | What Changed |
|------|---------|--------------|
| `server.js` | Express app | Added auth routes + middleware |
| `db/database.js` | Database | Added users table |
| `db/auth.js` | Auth logic | JWT functions |
| `public/login.html` | Auth UI | NEW file |
| `public/auth.js` | Auth frontend | NEW file |
| `public/app.js` | Dashboard | Added token headers |
| `public/index.html` | Dashboard | Added user display |
| `public/styles.css` | Styling | Added auth styles |
| `package.json` | Dependencies | Added bcryptjs, jsonwebtoken |

## 🎯 Security Checklist

- ✅ Passwords hashed (bcryptjs)
- ✅ JWT tokens signed
- ✅ Protected routes
- ✅ CORS enabled
- ✅ Input validation
- ✅ Error handling
- ✅ Token expiration
- ✅ localStorage security
- ⚠️ Use HTTPS (production)
- ⚠️ Set JWT_SECRET (production)
- ⚠️ Add rate limiting (production)

## 💡 Key Concepts

### Stateless Authentication
```
No server sessions needed
Client stores token
Server verifies on each request
Scales easily
```

### Hash vs Encrypt
```
Password → HASH (one-way) → Storage
Can't decrypt, only verify
bcryptjs automatically salts
```

### JWT Benefits
```
- Stateless (no DB lookup)
- Scalable (works across servers)
- Mobile-friendly
- Expiration built-in
- Contains user info
```

## 🚦 Authentication Flow Chart

```
                  ┌─ Create Account → Register
                  │
User visits ──────┤
localhost:3000    │      ┌─ Username/Password → Login
                  │      │
                  └──────┤
                         │
                         ↓
                    Verify Credentials
                         │
                   ┌─────┴─────┐
                   ↓           ↓
                Success      Fail
                   │           │
                   ↓           ↓
              Generate      Error
              JWT Token      Message
                   │
                   ↓
            Store in Browser
                   │
                   ↓
            Redirect to
            Dashboard
                   │
                   ↓
            Attach Token
            to Requests
                   │
                   ↓
            Server Verifies
                   │
            ┌──────┴──────┐
            ↓             ↓
         Valid         Invalid
            │             │
            ↓             ↓
         Process      Return 401
         Request      Redirect to
                      Login
```

## 📞 Support Resources

- **README.md** - Full documentation
- **AUTHENTICATION_GUIDE.md** - Auth details
- **AUTH_IMPLEMENTATION.md** - Technical specs
- **QUICK_START.md** - Quick setup
- **This file** - Reference card

---

**Quick Reference Ready! 🎯**

For more info: Check README.md or AUTHENTICATION_GUIDE.md
