// pages/Admin/assets/js/utils.js
/* ═══════════════════════════════════════════════
   UNIFIND – Shared Utilities
   Loaded by every page. No page-specific logic here.
   ═══════════════════════════════════════════════ */

// ─── AUTH CHECK ────────────────────────────────────────────────────────────
/**
 * Verifies the session and populates the navbar user badge.
 * Redirects to login if not authenticated.
 * Safely skips any element that doesn't exist on the current page.
 */
async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) {
      window.location.href = '/';
      return null;
    }

    const user = await res.json();

    // Safely update navbar elements (they won't exist on every page)
    const elAvatar = document.getElementById('userAvatar');
    const elName   = document.getElementById('userName');
    const elRole   = document.getElementById('userRole');
    const elDash   = document.getElementById('dashboardLink');  // only on pages that include it

    if (elAvatar) elAvatar.textContent = user.fname.charAt(0).toUpperCase();
    if (elName)   elName.textContent   = `${user.fname} ${user.lname}`;
    if (elRole)   elRole.textContent   = user.roleName === 'staff' ? 'Staff' : 'Student';
    if (elDash && user.roleName === 'staff') elDash.style.display = 'flex';

    return user;
  } catch (err) {
    console.error('Auth check failed:', err);
    window.location.href = '/';
    return null;
  }
}

// ─── LOGOUT ────────────────────────────────────────────────────────────────
/**
 * Destroys the session and always redirects back to the login page.
 */
async function doLogout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch {
    // Even if the request fails, redirect to login
  } finally {
    window.location.href = '/';
  }
}

// ─── TOAST ─────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error:   '<i class="fa-solid fa-circle-xmark"></i>',
    info:    '<i class="fa-solid fa-circle-info"></i>',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] ?? icons.info}</span>
    <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── STATUS BADGES ─────────────────────────────────────────────────────────
function getBadgeHTML(status) {
  const map = {
    found:    '<span class="badge badge-found">📦 Found</span>',
    lost:     '<span class="badge badge-lost">❓ Lost</span>',
    claimed:  '<span class="badge badge-claimed">🔖 Claimed</span>',
    returned: '<span class="badge badge-returned">✅ Returned</span>',
    archived: '<span class="badge badge-archived">📁 Archived</span>',
    pending:  '<span class="badge badge-pending">⏳ Pending</span>',
    approved: '<span class="badge badge-approved">✅ Approved</span>',
    rejected: '<span class="badge badge-rejected">❌ Rejected</span>',
  };
  return map[status] ?? `<span class="badge">${escapeHtml(status)}</span>`;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}