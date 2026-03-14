window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      window.location = 'pages/page4/home.html';
    }
  } catch (error) {
    console.log('No active session found.');
  }
});

async function doLogout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '../index.html';
  } catch (error) {
    console.error('Logout failed:', error);
    alert('Logout failed. Please try again.');
  }
}

function switchTab(tab) {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const forms = document.querySelectorAll('.auth-form');

  tabButtons.forEach(btn => btn.classList.remove('active'));
  forms.forEach(form => form.classList.remove('active'));

  const targetButton =
    tab === 'login'
      ? document.querySelector('.tab-btn:first-child')
      : document.querySelector('.tab-btn:last-child');

  const targetForm = document.getElementById(tab === 'login' ? 'loginForm' : 'registerForm');

  if (targetButton) targetButton.classList.add('active');
  if (targetForm) targetForm.classList.add('active');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error: '<i class="fa-solid fa-circle-xmark"></i>',
    info: '<i class="fa-solid fa-circle-info"></i>'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const btnText = document.getElementById('loginBtnText');

  if (!email || !password) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  btn.disabled = true;
  btnText.innerHTML = '<span class="loading-spinner"></span> Signing in...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Login failed.', 'error');
      return;
    }

    showToast(`Welcome back, ${data.user.fname}!`, 'success');

    setTimeout(() => {
      window.location =
        data.user.roleName === 'staff'
          ? 'pages/page3/dashboard.html'
          : 'pages/page4/home.html';
    }, 800);
  } catch (error) {
    showToast('Connection error. Make sure the server is running.', 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Sign In';
  }
}

async function doRegister() {
  const fname = document.getElementById('regFname').value.trim();
  const lname = document.getElementById('regLname').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const studentId = document.getElementById('regStudentId').value.trim();
  const contactNo = document.getElementById('regContact').value.trim();

  const btn = document.getElementById('registerBtn');
  const btnText = document.getElementById('registerBtnText');

  if (!fname || !lname || !email || !password) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters.', 'error');
    return;
  }

  btn.disabled = true;
  btnText.innerHTML = '<span class="loading-spinner"></span> Creating account...';

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fname,
        lname,
        email,
        password,
        studentId,
        contactNo
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Registration failed.', 'error');
      return;
    }

    showToast('Account created! Please sign in.', 'success');

    setTimeout(() => {
      switchTab('login');
    }, 1000);
  } catch (error) {
    showToast('Connection error. Make sure the server is running.', 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Create Account';
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const loginActive = document.getElementById('loginForm').classList.contains('active');
    if (loginActive) {
      doLogin();
    } else {
      doRegister();
    }
  }
});