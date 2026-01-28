// API Base URL
const API_URL = '/api/auth';

console.log('===== AUTH.JS LOADED =====');
console.log('Current URL:', window.location.href);
console.log('SessionStorage authToken:', sessionStorage.getItem('authToken') ? 'EXISTS' : 'NONE');

// DOM Elements
const loginForm = document.getElementById('loginFormElement');
const registerForm = document.getElementById('registerFormElement');
const loginFormDiv = document.getElementById('loginForm');
const registerFormDiv = document.getElementById('registerForm');
const alertContainer = document.getElementById('alertContainer');

// Form inputs
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const registerUsername = document.getElementById('registerUsername');
const registerEmail = document.getElementById('registerEmail');
const registerFullName = document.getElementById('registerFullName');
const registerPassword = document.getElementById('registerPassword');
const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');

const loginLoading = document.getElementById('loginLoading');
const registerLoading = document.getElementById('registerLoading');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('Login page loaded');
  console.log('Current sessionStorage:', sessionStorage);
  
  // First, clear any invalid tokens
  const token = sessionStorage.getItem('authToken');
  console.log('Token from sessionStorage:', token ? 'EXISTS' : 'NONE');
  
  // Check if user is already logged in
  checkTokenValidity();
  
  // Add event listeners
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
});

// Switch between login and register forms
function switchForm(form) {
  if (form === 'register') {
    loginFormDiv.classList.remove('active');
    registerFormDiv.classList.add('active');
  } else {
    registerFormDiv.classList.remove('active');
    loginFormDiv.classList.add('active');
  }
  alertContainer.innerHTML = '';
}

// Login handler
async function handleLogin(e) {
  e.preventDefault();

  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();

  if (!username || !password) {
    showAlert('Please enter username and password', 'error');
    return;
  }

  console.log('Attempting login with username:', username);
  
  loginForm.style.display = 'none';
  loginLoading.style.display = 'block';

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    console.log('Login response status:', response.status);
    
    // Clone the response so we can read it multiple ways if needed
    const responseClone = response.clone();
    let data;
    
    try {
      data = await response.json();
      console.log('Login response data:', data);
    } catch (jsonError) {
      console.error('Error parsing login response JSON:', jsonError);
      try {
        const text = await responseClone.text();
        console.log('Response text:', text);
      } catch (e) {
        console.log('Could not read response text');
      }
      throw new Error('Server returned invalid JSON response');
    }

    if (!response.ok) {
      loginForm.style.display = 'block';
      loginLoading.style.display = 'none';
      throw new Error(data.error || 'Login failed');
    }

    if (!data.token || !data.user) {
      throw new Error('Invalid response from server - missing token or user');
    }

    // Store token in sessionStorage
    sessionStorage.setItem('authToken', data.token);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    console.log('Login successful, token stored');

    showAlert('Login successful! Redirecting...', 'success');
    
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1500);
  } catch (error) {
    console.error('Login error:', error);
    loginForm.style.display = 'block';
    loginLoading.style.display = 'none';
    showAlert(error.message || 'Login failed', 'error');
  }
}

// Register handler
async function handleRegister(e) {
  e.preventDefault();

  const username = registerUsername.value.trim();
  const email = registerEmail.value.trim();
  const fullName = registerFullName.value.trim();
  const password = registerPassword.value.trim();
  const passwordConfirm = registerPasswordConfirm.value.trim();

  // Validation
  if (!username || !email || !password) {
    showAlert('Please fill in all required fields', 'error');
    return;
  }

  if (password.length < 6) {
    showAlert('Password must be at least 6 characters', 'error');
    return;
  }

  if (password !== passwordConfirm) {
    showAlert('Passwords do not match', 'error');
    return;
  }

  console.log('Attempting registration with username:', username);

  registerForm.style.display = 'none';
  registerLoading.style.display = 'block';

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        fullName,
        password
      })
    });

    console.log('Register response status:', response.status);
    
    // Clone the response so we can read it multiple ways if needed
    const responseClone = response.clone();
    let data;
    
    try {
      data = await response.json();
      console.log('Register response data:', data);
    } catch (jsonError) {
      console.error('Error parsing register response JSON:', jsonError);
      try {
        const text = await responseClone.text();
        console.log('Response text:', text);
      } catch (e) {
        console.log('Could not read response text');
      }
      throw new Error('Server returned invalid JSON response');
    }

    if (!response.ok) {
      registerForm.style.display = 'block';
      registerLoading.style.display = 'none';
      throw new Error(data.error || 'Registration failed');
    }

    if (!data.token || !data.user) {
      throw new Error('Invalid response from server - missing token or user');
    }

    // Store token and user info in sessionStorage
    sessionStorage.setItem('authToken', data.token);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    console.log('Registration successful, token stored');

    showAlert('Registration successful! Redirecting...', 'success');
    
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1500);
  } catch (error) {
    console.error('Registration error:', error);
    registerForm.style.display = 'block';
    registerLoading.style.display = 'none';
    showAlert(error.message || 'Registration failed', 'error');
  }
}

// Check if token is valid
async function checkTokenValidity() {
  console.log('checkTokenValidity() called');
  const token = sessionStorage.getItem('authToken');
  
  if (!token) {
    console.log('❌ NO TOKEN - showing login page');
    return; // Not logged in, show login page
  }

  console.log('✅ TOKEN FOUND - verifying with server...');
  
  try {
    const response = await fetch(`${API_URL}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Token verification response status:', response.status);

    if (response.ok) {
      try {
        const data = await response.json();
        console.log('✅ TOKEN VALID - redirecting to dashboard');
        console.log('Token is valid, user:', data.user.username);
        // Token is valid, redirect to dashboard
        window.location.href = '/dashboard';
      } catch (jsonError) {
        console.error('Error parsing response JSON:', jsonError);
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
      }
    } else {
      console.log('Token is invalid (status ' + response.status + '), clearing storage');
      // Token is invalid, clear it
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('user');
      console.log('Cleared invalid token from storage');
    }
  } catch (error) {
    console.error('Token verification fetch error:', error);
    console.log('Clearing token due to fetch error');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
  }
}

// Show alert message
function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  
  alertContainer.innerHTML = '';
  alertContainer.appendChild(alertDiv);

  if (type === 'success') {
    setTimeout(() => {
      alertDiv.remove();
    }, 3000);
  }
}
