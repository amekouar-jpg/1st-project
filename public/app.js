// API Base URL
const API_URL = '/api';

// ============= TOKEN VALIDATION & CLEANUP =============
// Decode JWT and check if expired
function isTokenExpired() {
  const token = sessionStorage.getItem('authToken');
  
  if (!token) {
    return true; // No token = expired
  }
  
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Invalid token format');
      return true;
    }
    
    // Decode payload (add padding if needed)
    const payload = parts[1];
    const padded = payload + '=='.substring(0, (4 - payload.length % 4) % 4);
    const decoded = JSON.parse(atob(padded));
    
    // exp is in seconds, convert to milliseconds
    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    
    console.log('Token expiration check:');
    console.log('  Expires at:', new Date(expirationTime).toLocaleString());
    console.log('  Current time:', new Date(currentTime).toLocaleString());
    console.log('  Status:', expirationTime > currentTime ? '✅ Valid' : '❌ Expired');
    
    return expirationTime <= currentTime; // True if expired
  } catch (error) {
    console.error('Error decoding token:', error);
    return true; // If error, treat as expired
  }
}

// Clean up expired token and user data
function cleanupExpiredToken() {
  if (isTokenExpired()) {
    console.log('🧹 Cleaning up expired token');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    return true; // Token was expired and cleaned
  }
  return false; // Token is still valid
}

// ============= API Helper Function =============
// Make authenticated API calls - always include the token
async function apiCall(endpoint, options = {}) {
  const token = sessionStorage.getItem('authToken');
  console.log('apiCall():', endpoint, 'token:', token ? 'EXISTS' : 'NONE');
  
  if (!token) {
    console.error('❌ No token found - user not authenticated');
    window.location.href = '/';
    return null;
  }
  
  // Build headers with authorization
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  const config = {
    ...options,
    headers
  };
  
  console.log('Making request to:', endpoint);
  try {
    const response = await fetch(endpoint, config);
    console.log('Response status:', response.status);
    
    if (response.status === 401) {
      // Token expired or invalid
      console.error('❌ Token expired, redirecting to login');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('user');
      window.location.href = '/';
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('❌ API call error:', error);
    throw error;
  }
}

// ============= AUTHENTICATION CHECK (MUST BE FIRST) =============
// Protect the dashboard - redirect if not logged in
(function() {
  console.log('===== APP.JS LOADED =====');
  console.log('Current URL:', window.location.href);
  
  // First, clean up any expired tokens
  const wasExpired = cleanupExpiredToken();
  
  const token = sessionStorage.getItem('authToken');
  console.log('SessionStorage authToken:', token ? 'EXISTS' : 'NONE');
  
  if (!token || wasExpired) {
    console.log('❌ NO VALID TOKEN ON DASHBOARD PAGE - redirecting to login');
    window.location.replace('/');
    return; // Stop all further execution
  }
  console.log('✅ TOKEN FOUND & VALID - proceeding with dashboard');
})();

// ============= DOM ELEMENTS (Only loaded if user is authenticated) =============
const studentForm = document.getElementById('studentForm');
const studentIdInput = document.getElementById('studentId');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const dateOfBirthInput = document.getElementById('dateOfBirth');
const gpaInput = document.getElementById('gpa');
const statusInput = document.getElementById('status');

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

const studentsTableBody = document.getElementById('studentsTableBody');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');

const detailsModal = document.getElementById('detailsModal');
const closeModalBtn = document.querySelector('.close');
const modalBody = document.getElementById('modalBody');

const formTitle = document.getElementById('form-title');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// State
let allStudents = [];
let isEditMode = false;
let authToken = sessionStorage.getItem('authToken');

// ============= INITIALIZATION =============
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard page fully loaded');
  
  // Double-check token validity
  if (isTokenExpired()) {
    console.log('🧹 Token is expired, cleaning up and redirecting');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    window.location.href = '/';
    return;
  }
  
  // Display user info
  displayUserInfo();
  
  initializeEventListeners();
  loadDashboard();
  loadStudents();
});

function displayUserInfo() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const userDisplay = document.getElementById('userDisplay');
  
  if (userDisplay && user.username) {
    userDisplay.innerHTML = `
      <span>👤 ${user.fullName || user.username}</span>
      <button onclick="logout()" class="btn btn-secondary btn-small" style="margin-left: 10px;">Logout</button>
    `;
  }
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    window.location.href = '/';
  }
}

function initializeEventListeners() {
  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', switchTab);
  });

  // Form submission
  studentForm.addEventListener('submit', handleFormSubmit);

  // Search
  searchBtn.addEventListener('click', handleSearch);
  clearSearchBtn.addEventListener('click', handleClearSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Modal
  closeModalBtn.addEventListener('click', closeModal);
  detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) closeModal();
  });

  // Edit cancel
  cancelEditBtn.addEventListener('click', cancelEdit);
}

// ============= TAB SWITCHING =============
function switchTab(e) {
  const tabName = e.target.dataset.tab;
  
  // Remove active class from all buttons and contents
  tabButtons.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));

  // Add active class to clicked button and corresponding content
  e.target.classList.add('active');
  document.getElementById(tabName).classList.add('active');

  // Load data when switching to students-list tab
  if (tabName === 'students-list') {
    loadStudents();
  } else if (tabName === 'dashboard') {
    loadDashboard();
  }
}

// ============= DASHBOARD =============
async function loadDashboard() {
  try {
    const response = await apiCall(`${API_URL}/statistics`, {
      method: 'GET'
    });
    
    if (!response || !response.ok) {
      throw new Error('Failed to load statistics');
    }
    
    const stats = await response.json();
    
    document.getElementById('stat-total').textContent = 
      stats.totalStudents ? stats.totalStudents.count : 0;
    document.getElementById('stat-active').textContent = 
      stats.activeStudents ? stats.activeStudents.count : 0;
    document.getElementById('stat-inactive').textContent = 
      stats.inactiveStudents ? stats.inactiveStudents.count : 0;
    document.getElementById('stat-gpa').textContent = 
      stats.averageGPA && stats.averageGPA.avg ? stats.averageGPA.avg.toFixed(2) : '0.0';
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showAlert('Failed to load dashboard statistics', 'error');
  }
}

// ============= FORM HANDLING =============
async function handleFormSubmit(e) {
  e.preventDefault();

  const studentData = {
    firstName: firstNameInput.value.trim(),
    lastName: lastNameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput.value.trim(),
    dateOfBirth: dateOfBirthInput.value,
    gpa: parseFloat(gpaInput.value) || 0,
    status: statusInput.value
  };

  // Validation
  if (!studentData.firstName || !studentData.lastName || !studentData.email) {
    showAlert('Please fill in all required fields (First Name, Last Name, Email)', 'error');
    return;
  }

  try {
    let response;
    if (isEditMode) {
      // Update student
      const studentId = studentIdInput.value;
      response = await apiCall(`${API_URL}/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify(studentData)
      });
    } else {
      // Create new student
      response = await apiCall(`${API_URL}/students`, {
        method: 'POST',
        body: JSON.stringify(studentData)
      });
    }

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to save student');
    }

    const result = await response.json();
    showAlert(
      isEditMode ? 'Student updated successfully!' : 'Student added successfully!',
      'success'
    );

    resetForm();
    loadStudents();
    loadDashboard();
  } catch (error) {
    console.error('Error saving student:', error);
    showAlert(error.message || 'Failed to save student', 'error');
  }
}

function resetForm() {
  studentForm.reset();
  studentIdInput.value = '';
  isEditMode = false;
  formTitle.textContent = 'Add New Student';
  cancelEditBtn.style.display = 'none';
}

function cancelEdit() {
  resetForm();
}

// ============= STUDENTS LIST =============
async function loadStudents() {
  try {
    const response = await apiCall(`${API_URL}/students`);
    
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      throw new Error('Failed to load students');
    }

    allStudents = await response.json();
    displayStudents(allStudents);
  } catch (error) {
    console.error('Error loading students:', error);
    showAlert('Failed to load students', 'error');
    studentsTableBody.innerHTML = '<tr><td colspan="9" class="text-center">Error loading students</td></tr>';
  }
}

function displayStudents(students) {
  const emptyMessage = document.getElementById('emptyMessage');
  
  if (students.length === 0) {
    studentsTableBody.innerHTML = '';
    emptyMessage.style.display = 'block';
    return;
  }

  emptyMessage.style.display = 'none';

  studentsTableBody.innerHTML = students.map(student => `
    <tr>
      <td>${student.id}</td>
      <td>${student.firstName}</td>
      <td>${student.lastName}</td>
      <td>${student.email}</td>
      <td>${student.phone || '-'}</td>
      <td>${student.gpa}</td>
      <td>
        <span class="status-${student.status.toLowerCase().replace(' ', '')}">
          ${student.status}
        </span>
      </td>
      <td>${formatDate(student.enrollmentDate)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-warning btn-small" onclick="editStudent(${student.id})">Edit</button>
          <button class="btn btn-danger btn-small" onclick="deleteStudent(${student.id})">Delete</button>
          <button class="btn btn-primary btn-small" onclick="viewStudentDetails(${student.id})">View</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ============= STUDENT ACTIONS =============
async function editStudent(id) {
  try {
    const response = await apiCall(`${API_URL}/students/${id}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      throw new Error('Failed to load student');
    }

    const student = await response.json();

    // Populate form
    studentIdInput.value = student.id;
    firstNameInput.value = student.firstName;
    lastNameInput.value = student.lastName;
    emailInput.value = student.email;
    phoneInput.value = student.phone || '';
    dateOfBirthInput.value = student.dateOfBirth || '';
    gpaInput.value = student.gpa;
    statusInput.value = student.status;

    // Switch to form tab
    isEditMode = true;
    formTitle.textContent = 'Edit Student';
    cancelEditBtn.style.display = 'inline-block';

    const addStudentTab = document.querySelector('[data-tab="add-student"]');
    addStudentTab.click();

    // Scroll to form
    document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Error loading student:', error);
    showAlert('Failed to load student details', 'error');
  }
}

async function deleteStudent(id) {
  if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await apiCall(`${API_URL}/students/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      throw new Error('Failed to delete student');
    }

    showAlert('Student deleted successfully!', 'success');
    loadStudents();
    loadDashboard();
  } catch (error) {
    console.error('Error deleting student:', error);
    showAlert('Failed to delete student', 'error');
  }
}

function viewStudentDetails(id) {
  const student = allStudents.find(s => s.id === id);
  if (!student) return;

  modalBody.innerHTML = `
    <div class="detail-item">
      <div class="detail-label">ID:</div>
      <div class="detail-value">${student.id}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">First Name:</div>
      <div class="detail-value">${student.firstName}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Last Name:</div>
      <div class="detail-value">${student.lastName}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Email:</div>
      <div class="detail-value">${student.email}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Phone:</div>
      <div class="detail-value">${student.phone || 'Not provided'}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Date of Birth:</div>
      <div class="detail-value">${student.dateOfBirth || 'Not provided'}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">GPA:</div>
      <div class="detail-value">${student.gpa}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Status:</div>
      <div class="detail-value">
        <span class="status-${student.status.toLowerCase().replace(' ', '')}">
          ${student.status}
        </span>
      </div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Enrollment Date:</div>
      <div class="detail-value">${formatDate(student.enrollmentDate)}</div>
    </div>
  `;

  detailsModal.classList.add('show');
}

function closeModal() {
  detailsModal.classList.remove('show');
  modalBody.innerHTML = '';
}

// ============= SEARCH =============
async function handleSearch() {
  const query = searchInput.value.trim();
  
  if (!query) {
    showAlert('Please enter a search term', 'error');
    return;
  }

  try {
    const response = await apiCall(`${API_URL}/students/search/${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      throw new Error('Search failed');
    }

    const results = await response.json();
    displayStudents(results);
    
    if (results.length === 0) {
      showAlert(`No students found matching "${query}"`, 'error');
    } else {
      showAlert(`Found ${results.length} student(s)`, 'success');
    }
  } catch (error) {
    console.error('Error searching students:', error);
    showAlert('Search failed', 'error');
  }
}

function handleClearSearch() {
  searchInput.value = '';
  loadStudents();
  showAlert('Search cleared', 'success');
}

// ============= UTILITIES =============
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  alertDiv.style.position = 'fixed';
  alertDiv.style.top = '20px';
  alertDiv.style.right = '20px';
  alertDiv.style.zIndex = '2000';
  alertDiv.style.maxWidth = '400px';

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

// Handle unauthorized access
function handleUnauthorized() {
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('user');
  showAlert('Your session has expired. Please login again.', 'error');
  setTimeout(() => {
    window.location.href = '/';
  }, 2000);
}

function initializeEventListeners() {
  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', switchTab);
  });

  // Form submission
  studentForm.addEventListener('submit', handleFormSubmit);

  // Search
  searchBtn.addEventListener('click', handleSearch);
  clearSearchBtn.addEventListener('click', handleClearSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Modal
  closeModalBtn.addEventListener('click', closeModal);
  detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) closeModal();
  });

  // Edit cancel
  cancelEditBtn.addEventListener('click', cancelEdit);
}

// ============= TAB SWITCHING =============
function switchTab(e) {
  const tabName = e.target.dataset.tab;
  
  // Remove active class from all buttons and contents
  tabButtons.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));

  // Add active class to clicked button and corresponding content
  e.target.classList.add('active');
  document.getElementById(tabName).classList.add('active');

  // Load data when switching to students-list tab
  if (tabName === 'students-list') {
    loadStudents();
  } else if (tabName === 'dashboard') {
    loadDashboard();
  }
}

// ============= DASHBOARD =============
async function loadDashboard() {
  try {
    const response = await apiCall(`${API_URL}/statistics`, { method: 'GET' });
    if (!response || !response.ok) throw new Error('Failed to load statistics');

    const stats = await response.json();
    
    document.getElementById('stat-total').textContent = 
      stats.totalStudents ? stats.totalStudents.count : 0;
    document.getElementById('stat-active').textContent = 
      stats.activeStudents ? stats.activeStudents.count : 0;
    document.getElementById('stat-inactive').textContent = 
      stats.inactiveStudents ? stats.inactiveStudents.count : 0;
    document.getElementById('stat-gpa').textContent = 
      stats.averageGPA && stats.averageGPA.avg ? stats.averageGPA.avg.toFixed(2) : '0.0';
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showAlert('Failed to load dashboard statistics', 'error');
  }
}

// ============= FORM HANDLING =============
async function handleFormSubmit(e) {
  e.preventDefault();

  const studentData = {
    firstName: firstNameInput.value.trim(),
    lastName: lastNameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput.value.trim(),
    dateOfBirth: dateOfBirthInput.value,
    gpa: parseFloat(gpaInput.value) || 0,
    status: statusInput.value
  };

  // Validation
  if (!studentData.firstName || !studentData.lastName || !studentData.email) {
    showAlert('Please fill in all required fields (First Name, Last Name, Email)', 'error');
    return;
  }

  try {
    let response;
    if (isEditMode) {
      // Update student
      const studentId = studentIdInput.value;
      response = await apiCall(`${API_URL}/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify(studentData)
      });
    } else {
      // Create new student
      response = await apiCall(`${API_URL}/students`, {
        method: 'POST',
        body: JSON.stringify(studentData)
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save student');
    }

    const result = await response.json();
    showAlert(
      isEditMode ? 'Student updated successfully!' : 'Student added successfully!',
      'success'
    );

    resetForm();
    loadStudents();
    loadDashboard();
  } catch (error) {
    console.error('Error saving student:', error);
    showAlert(error.message || 'Failed to save student', 'error');
  }
}

function resetForm() {
  studentForm.reset();
  studentIdInput.value = '';
  isEditMode = false;
  formTitle.textContent = 'Add New Student';
  cancelEditBtn.style.display = 'none';
}

function cancelEdit() {
  resetForm();
}

// ============= UTILITIES =============
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  alertDiv.style.position = 'fixed';
  alertDiv.style.top = '20px';
  alertDiv.style.right = '20px';
  alertDiv.style.zIndex = '2000';
  alertDiv.style.maxWidth = '400px';

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}
