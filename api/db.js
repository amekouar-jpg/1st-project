// Mock DB for serverless / temporary use
// Removed mongoose dependency and replaced DB operations with in-memory mock data

let users = [
  // example user: username: test, password hashed unknown here — registration/login will create users
];

let students = [
  { _id: '1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: '', dateOfBirth: '', enrollmentDate: new Date().toISOString(), gpa: 3.5, status: 'Active', createdAt: new Date() },
  { _id: '2', firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com', phone: '', dateOfBirth: '', enrollmentDate: new Date().toISOString(), gpa: 2.8, status: 'Inactive', createdAt: new Date() }
];

let userIdCounter = 3;
let studentIdCounter = 3;

async function connectDB() {
  // no-op for mock
  return Promise.resolve();
}

// Simple User "Model"
class User {
  constructor(attrs) {
    this._id = (userIdCounter++).toString();
    this.username = attrs.username;
    this.email = attrs.email;
    this.password = attrs.password;
    this.fullName = attrs.fullName || '';
    this.createdAt = new Date();
  }

  async save() {
    users.push(this);
    return this;
  }

  static async findOne(query) {
    if (query.$or && Array.isArray(query.$or)) {
      for (const q of query.$or) {
        if (q.username) {
          const u = users.find(x => x.username === q.username);
          if (u) return u;
        }
        if (q.email) {
          const u = users.find(x => x.email === q.email);
          if (u) return u;
        }
      }
      return null;
    }
    if (query.username) return users.find(x => x.username === query.username) || null;
    if (query.email) return users.find(x => x.email === query.email) || null;
    return null;
  }
}

// Simple Student "Model"
class Student {
  constructor(attrs) {
    this._id = (studentIdCounter++).toString();
    this.firstName = attrs.firstName;
    this.lastName = attrs.lastName;
    this.email = attrs.email;
    this.phone = attrs.phone || '';
    this.dateOfBirth = attrs.dateOfBirth || '';
    this.enrollmentDate = attrs.enrollmentDate || new Date().toISOString();
    this.gpa = attrs.gpa || 0;
    this.status = attrs.status || 'Active';
    this.createdAt = new Date();
  }

  async save() {
    students.push(this);
    return this;
  }

  static async find(filter) {
    // If called without args, return all
    if (!filter) return students.slice().sort((a,b)=>b.createdAt - a.createdAt);
    // support regex-like search
    if (filter.$or) {
      const query = filter.$or[0];
      const field = Object.keys(query)[0];
      const pattern = query[field].$regex;
      const re = new RegExp(pattern, query[field].$options || 'i');
      return students.filter(s => re.test(s.firstName) || re.test(s.lastName) || re.test(s.email));
    }
    return students.filter(s => {
      return Object.keys(filter).every(k => s[k] === filter[k]);
    });
  }

  static async findById(id) {
    return students.find(s => s._id === id) || null;
  }

  static async findByIdAndUpdate(id, update, opts) {
    const idx = students.findIndex(s => s._id === id);
    if (idx === -1) return null;
    students[idx] = { ...students[idx], ...update };
    return students[idx];
  }

  static async findByIdAndDelete(id) {
    const idx = students.findIndex(s => s._id === id);
    if (idx === -1) return null;
    const removed = students.splice(idx,1)[0];
    return removed;
  }

  static async countDocuments(filter) {
    if (!filter) return students.length;
    return students.filter(s => s.status === (filter.status)).length;
  }

  static async aggregate(pipeline) {
    // support simple avg gpa
    const avg = students.reduce((sum,s)=>sum + (parseFloat(s.gpa)||0),0) / (students.length || 1);
    return [{ _id: null, avg }];
  }
}

module.exports = { connectDB, User, Student };
