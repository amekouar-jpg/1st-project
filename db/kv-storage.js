// Vercel KV Storage adapter for student management
// This provides persistent storage on Vercel using Redis

const { kv } = require('@vercel/kv');

// Keys for KV storage
const KEYS = {
  USERS: 'app:users',
  STUDENTS: 'app:students',
  USER_COUNTER: 'app:counter:user',
  STUDENT_COUNTER: 'app:counter:student'
};

class KVStorage {
  // Initialize with default values
  async init() {
    try {
      // Check if counters exist, if not initialize them
      const userCounter = await kv.get(KEYS.USER_COUNTER);
      if (userCounter === null) {
        await kv.set(KEYS.USER_COUNTER, 1);
      }
      
      const studentCounter = await kv.get(KEYS.STUDENT_COUNTER);
      if (studentCounter === null) {
        await kv.set(KEYS.STUDENT_COUNTER, 1);
      }
      
      console.log('✅ Vercel KV initialized');
      return true;
    } catch (error) {
      console.error('❌ Vercel KV initialization failed:', error);
      return false;
    }
  }

  // Users
  async getUsers() {
    const users = await kv.get(KEYS.USERS);
    return users || [];
  }

  async addUser(user) {
    const users = await this.getUsers();
    const id = await kv.incr(KEYS.USER_COUNTER);
    const newUser = { ...user, id };
    users.push(newUser);
    await kv.set(KEYS.USERS, users);
    return newUser;
  }

  async findUserByUsername(username) {
    const users = await this.getUsers();
    return users.find(u => u.username === username);
  }

  async updateUser(id, updates) {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      await kv.set(KEYS.USERS, users);
      return users[index];
    }
    return null;
  }

  // Students
  async getStudents() {
    const students = await kv.get(KEYS.STUDENTS);
    return students || [];
  }

  async addStudent(student) {
    const students = await this.getStudents();
    const id = await kv.incr(KEYS.STUDENT_COUNTER);
    const newStudent = { ...student, id, enrollmentDate: new Date().toISOString() };
    students.push(newStudent);
    await kv.set(KEYS.STUDENTS, students);
    return newStudent;
  }

  async findStudentById(id) {
    const students = await this.getStudents();
    return students.find(s => s.id == id);
  }

  async updateStudent(id, updates) {
    const students = await this.getStudents();
    const index = students.findIndex(s => s.id == id);
    if (index !== -1) {
      students[index] = { ...students[index], ...updates };
      await kv.set(KEYS.STUDENTS, students);
      return students[index];
    }
    return null;
  }

  async deleteStudent(id) {
    const students = await this.getStudents();
    const index = students.findIndex(s => s.id == id);
    if (index !== -1) {
      students.splice(index, 1);
      await kv.set(KEYS.STUDENTS, students);
      return true;
    }
    return false;
  }

  async searchStudents(query) {
    const students = await this.getStudents();
    const searchTerm = query.toLowerCase();
    return students.filter(s =>
      s.firstName.toLowerCase().includes(searchTerm) ||
      s.lastName.toLowerCase().includes(searchTerm) ||
      s.email.toLowerCase().includes(searchTerm)
    );
  }

  async getStatistics() {
    const students = await this.getStudents();
    const active = students.filter(s => s.status === 'Active').length;
    const inactive = students.filter(s => s.status === 'Inactive').length;
    const avgGPA = students.length > 0
      ? students.reduce((sum, s) => sum + (parseFloat(s.gpa) || 0), 0) / students.length
      : 0;

    return {
      totalStudents: { count: students.length },
      averageGPA: { avg: avgGPA },
      activeStudents: { count: active },
      inactiveStudents: { count: inactive }
    };
  }
}

module.exports = new KVStorage();
