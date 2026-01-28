# 📚 Student Management System

A complete full-stack web application for managing student information with a modern, responsive interface and secure JWT authentication.

## Features

✨ **Core Features:**
- 🔐 **Secure Authentication** - User registration and login with JWT tokens
- ➕ Add, edit, and delete student records
- 📊 View comprehensive dashboard with statistics
- 🔍 Search students by name or email
- 📋 View detailed student information in a modal
- 📱 Fully responsive design
- 🎨 Modern UI with smooth animations

**Authentication Features:**
- User registration with validation
- Secure login with password hashing (bcryptjs)
- JWT token-based authentication
- Protected API routes
- Automatic token verification
- Session management with localStorage
- User profile display

**Dashboard Stats:**
- Total number of students
- Active students count
- Inactive students count
- Average GPA calculation

**Student Information Tracked:**
- First Name & Last Name
- Email (unique constraint)
- Phone Number
- Date of Birth
- GPA (0-4 scale)
- Status (Active, Inactive, On Leave)
- Enrollment Date
- Created Timestamp

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite3** - Lightweight database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **Body Parser** - Middleware for parsing requests
- **CORS** - Cross-Origin Resource Sharing

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradients and animations
- **Vanilla JavaScript** - Dynamic interactions (ES6+)
- **Fetch API** - Asynchronous HTTP requests
- **localStorage** - Client-side token storage

## Project Structure

```
student-management-app/
├── server.js              # Express server with API routes and auth
├── package.json           # Project dependencies
├── db/
│   ├── database.js        # SQLite database initialization
│   └── auth.js            # JWT authentication middleware
└── public/
    ├── login.html         # Login/Registration page
    ├── index.html         # Main dashboard page
    ├── styles.css         # Complete styling
    ├── auth.js            # Authentication logic
    └── app.js             # Dashboard application logic
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Step 1: Install Dependencies

Open terminal in the project directory and run:

```bash
npm install
```

This will install:
- express (web framework)
- sqlite3 (database)
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)
- body-parser (request parsing)
- cors (cross-origin support)

### Step 2: Start the Server

```bash
npm start
```

Or for development:

```bash
node server.js
```

You should see output:
```
Connected to SQLite database
Users table initialized
Students table initialized
Server running on http://localhost:3000
```

### Step 3: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Usage Guide

### Authentication (Login/Register)

**First-time Users:**
1. Click "Create one" on the login page
2. Fill in username, email, full name (optional), and password
3. Confirm password and click "Create Account"
4. You'll be automatically logged in and redirected to dashboard

**Existing Users:**
1. Enter username and password
2. Click "Sign In"
3. You'll be redirected to the dashboard

**Important Notes:**
- Passwords must be at least 6 characters
- Usernames and emails are unique
- Your session persists in the browser (stored in localStorage)
- Close browser or click Logout to end session

### Dashboard Tab
- View key statistics about your students
- See total students, active count, inactive count, and average GPA
- Updates automatically when students are added/removed

### Add Student Tab
- Fill in student details in the form
- Required fields: First Name, Last Name, Email
- Optional fields: Phone, Date of Birth, GPA, Status
- Click "Save Student" to add to database
- Use "Clear Form" to reset all fields

### View Students Tab
- Displays table of all registered students
- **Edit**: Click to modify student information
- **Delete**: Remove a student record (with confirmation)
- **View**: See complete student details in a modal

### Search Functionality
- Search by student first name, last name, or email
- Results update in real-time
- Use "Clear" to return to full list

### Editing Students
- Click "Edit" button next to any student
- Form will populate with current data
- Make changes and click "Save Student"
- Click "Cancel Edit" to discard changes

### Logout
- Click the "Logout" button in the top right corner
- You'll be returned to the login page
- Your session will be cleared

## Authentication Details

### Password Security
- Passwords are hashed using bcryptjs with salt rounds = 10
- Original passwords are never stored
- Passwords are compared using bcryptjs comparison function

### JWT Tokens
- Tokens expire after 24 hours
- Tokens are stored in browser's localStorage
- All protected API routes require valid token
- Token is sent in Authorization header: `Bearer <token>`

### Database Users Table

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT |
| username | TEXT | NOT NULL, UNIQUE |
| email | TEXT | NOT NULL, UNIQUE |
| password | TEXT | NOT NULL (hashed) |
| fullName | TEXT | |
| createdAt | DATETIME | DEFAULT CURRENT_TIMESTAMP |

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register a new user

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "fullName": "John Doe",
  "password": "securePassword123"
}
```

**Response:**
```json
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

#### POST /api/auth/login
Login with username and password

**Request:**
```json
{
  "username": "john_doe",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe"
  }
}
```

#### GET /api/auth/verify
Verify if token is valid

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  },
  "message": "Token is valid"
}
```

### Student Endpoints (All Protected - Require Auth Token)

#### GET /api/students
Returns all students

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "dateOfBirth": "2000-01-15",
    "enrollmentDate": "2026-01-25T10:30:00",
    "gpa": 3.8,
    "status": "Active"
  }
]
```

#### GET /api/students/:id
Returns a single student by ID

**Headers:**
```
Authorization: Bearer <token>
```

#### POST /api/students
Creates a new student

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "555-5678",
  "dateOfBirth": "2001-03-20",
  "gpa": 3.9,
  "status": "Active"
}
```

#### PUT /api/students/:id
Updates an existing student

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### DELETE /api/students/:id
Deletes a student

**Headers:**
```
Authorization: Bearer <token>
```

#### GET /api/students/search/:query
Searches students by name or email

**Headers:**
```
Authorization: Bearer <token>
```

#### GET /api/statistics
Returns dashboard statistics

**Headers:**
```
Authorization: Bearer <token>
```

## Database Schema

### Users Table

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT |
| username | TEXT | NOT NULL, UNIQUE |
| email | TEXT | NOT NULL, UNIQUE |
| password | TEXT | NOT NULL (hashed) |
| fullName | TEXT | |
| createdAt | DATETIME | DEFAULT CURRENT_TIMESTAMP |

### Students Table

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT |
| firstName | TEXT | NOT NULL |
| lastName | TEXT | NOT NULL |
| email | TEXT | NOT NULL, UNIQUE |
| phone | TEXT | |
| dateOfBirth | TEXT | |
| enrollmentDate | TEXT | DEFAULT CURRENT_TIMESTAMP |
| gpa | REAL | DEFAULT 0.0 |
| status | TEXT | DEFAULT 'Active' |
| createdAt | DATETIME | DEFAULT CURRENT_TIMESTAMP |

## Features in Detail

### Responsive Design
- Works perfectly on desktop, tablet, and mobile devices
- Adaptive grid layouts
- Touch-friendly buttons and inputs
- Login page is mobile-optimized

### Data Validation
- Email uniqueness enforced at database level
- Required field validation on frontend
- GPA range validation (0-4)
- Confirmation dialogs for destructive actions
- Password length validation (minimum 6 characters)
- Password confirmation matching

### User Experience
- Toast notifications for success/error messages
- Smooth animations and transitions
- Modal dialogs for detailed views
- Tab-based navigation for organized interface
- Loading indicators during async operations
- User display showing logged-in user
- Easy logout button

### Error Handling
- Comprehensive error messages
- Authentication error handling
- Session expiration management
- Graceful fallbacks
- Console logging for debugging
- HTTP status code handling

### Security
- Bcryptjs for secure password hashing
- JWT tokens with 24-hour expiration
- Protected API routes with authentication middleware
- CORS configuration
- Input validation and sanitization
- Secure token storage in localStorage
- Automatic redirection for unauthorized access

## Customization

### Change Port
Edit `server.js` and modify:
```javascript
const PORT = process.env.PORT || 3000;
```

### Change JWT Secret
For production, set environment variable:
```bash
set JWT_SECRET=your-super-secret-key
```

### Modify Database Location
Edit `db/database.js` and change:
```javascript
const dbPath = path.join(__dirname, 'students.db');
```

### Add More User Fields
1. Update `users` table schema in `db/database.js`
2. Update registration form in `public/login.html`
3. Update `handleRegister` in `public/auth.js`
4. Update registration route in `server.js`

## Troubleshooting

### Port Already in Use
```bash
set PORT=3001
npm start
```

### Module Not Found
```bash
# Reinstall dependencies
rmdir /s node_modules
npm install
```

### Database Locked Error
- Close all connections to the database
- Delete `db/students.db` and restart server

### Token Expired
- Clear localStorage and login again
- Your browser will automatically handle this

### CORS Errors
- Ensure CORS middleware is enabled in `server.js`
- Check that frontend and backend are on same origin

### Password Hashing Issues
- Ensure bcryptjs is installed: `npm install bcryptjs`
- Check Node.js version (v14+)

## Performance Tips

- Database is lightweight and suitable for small to medium deployments
- For larger datasets (1000+ students), consider migrating to PostgreSQL
- Add pagination for tables with many records
- Implement caching for frequently accessed data
- Consider adding rate limiting for production

## Production Deployment

Before deploying to production:

1. **Set JWT Secret:**
   ```bash
   set JWT_SECRET=your-very-secure-secret-key
   ```

2. **Use HTTPS:**
   - Enable SSL/TLS certificates
   - Update fetch calls to use https://

3. **Add Rate Limiting:**
   ```bash
   npm install express-rate-limit
   ```

4. **Use Environment Variables:**
   - Store secrets in .env file
   - Install dotenv: `npm install dotenv`

5. **Set NODE_ENV:**
   ```bash
   set NODE_ENV=production
   ```

6. **Consider Database Migration:**
   - Move from SQLite to PostgreSQL for production
   - Update database module accordingly

7. **Add Logging:**
   - Implement proper logging system
   - Monitor authentication failures

## Future Enhancements

- 📧 Email verification for registration
- 🔄 Password reset functionality
- 👨‍💼 User roles and permissions (admin, teacher, student)
- 📊 Advanced filtering and sorting
- 📄 PDF export functionality
- 🖼️ Student photo uploads
- 📈 Analytics and reporting
- 🌙 Dark mode theme
- 🗂️ Batch import/export
- 📝 Grades and course management
- 🔔 Attendance tracking
- 📱 Mobile app (React Native/Flutter)

## License

MIT License - Feel free to use this project for personal or commercial purposes.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Examine browser console for errors
4. Check server logs in terminal

---

**Built with ❤️ | Node.js Full-Stack Application with JWT Authentication**
