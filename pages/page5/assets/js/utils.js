/* ═══════════════════════════════════════════════
   UNIFIND – Shared Utilities
   ═══════════════════════════════════════════════ */

async function checkAuth() {
  try {
    const res = await fetch('/api/me');

    if (!res.ok) {
      window.location.href = '/';
      return null;
    }

    const user = await res.json();

    const elAvatar = document.getElementById('userAvatar');
    const elName = document.getElementById('userName');
    const elRole = document.getElementById('userRole');
    const elDash = document.getElementById('dashboardLink');

    if (elAvatar) elAvatar.textContent = user.fname.charAt(0).toUpperCase();
    if (elName) elName.textContent = `${user.fname} ${user.lname}`;
    if (elRole) elRole.textContent = user.roleName === 'staff' ? 'Staff' : 'Student';
    if (elDash && user.roleName === 'staff') elDash.style.display = 'flex';

    return user;
  } catch (err) {
    console.error('Auth check failed:', err);
    window.location.href = '/';
    return null;
  }
}

async function doLogout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (err) {
    console.error('Logout failed:', err);
  } finally {
    window.location.href = '/';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

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

function formatDate(dateStr) {
  if (!dateStr) return '—';

  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}