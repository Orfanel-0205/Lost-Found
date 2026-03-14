function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) { window.location = '/index.html'; return null; }
    const user = await res.json();
    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('userName');
    const role = document.getElementById('userRole');
    const dash = document.getElementById('dashboardLink');
    if (avatar) avatar.textContent = user.fname.charAt(0).toUpperCase();
    if (name) name.textContent = user.fname + ' ' + user.lname;
    if (role) role.textContent = user.roleName;
    if (dash && user.roleName === 'staff') dash.style.display = 'flex';
    return user;
  } catch {
    window.location = '/index.html';
    return null;
  }
}

async function doLogout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location = '/index.html';
}

function getBadgeHTML(status) {
  const map = {
    found: '<span class="badge badge-found">📦 Found</span>',
    lost: '<span class="badge badge-lost">❓ Lost</span>',
    claimed: '<span class="badge badge-claimed">🔖 Claimed</span>',
    returned: '<span class="badge badge-returned">✅ Returned</span>',
    archived: '<span class="badge" style="background:var(--border);color:var(--text3)">📁 Archived</span>',
    pending: '<span class="badge badge-pending">⏳ Pending</span>',
    approved: '<span class="badge badge-approved">✅ Approved</span>',
    rejected: '<span class="badge badge-rejected">❌ Rejected</span>'
  };
  return map[status] || `<span class="badge">${status}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}
