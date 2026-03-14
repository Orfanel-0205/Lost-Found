/* ═══════════════════════════════════════════════
   UNIFIND – My Claims Page (page5)
   ═══════════════════════════════════════════════ */

let allClaims  = [];
let activeFilter = 'all';

// ─── INIT ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // checkAuth() is safe – it won't crash on missing elements
  await checkAuth();
  await loadMyClaims();
});

// ─── LOAD DATA ─────────────────────────────────────────────────────────────
async function loadMyClaims() {
  const list = document.getElementById('claimsList');
  list.innerHTML = spinnerHTML();

  try {
    const res = await fetch('/api/my-claims');
    if (!res.ok) {
      showToast('Failed to load claims.', 'error');
      list.innerHTML = emptyHTML('⚠️', 'Could not load your claims.', 'Please refresh the page.');
      return;
    }
    allClaims = await res.json();
    renderClaims();
  } catch {
    showToast('Connection error – is the server running?', 'error');
    list.innerHTML = emptyHTML('🔌', 'Connection error.', 'Make sure the server is running.');
  }
}

// ─── FILTER ────────────────────────────────────────────────────────────────
function filterClaims(filter, el) {
  activeFilter = filter;
  document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderClaims();
}

// ─── RENDER ────────────────────────────────────────────────────────────────
function renderClaims() {
  const list     = document.getElementById('claimsList');
  const filtered = activeFilter === 'all'
    ? allClaims
    : allClaims.filter(c => c.ClaimStatus === activeFilter);

  if (filtered.length === 0) {
    const msg = activeFilter === 'all'
      ? "You haven't submitted any claims yet."
      : `No ${activeFilter} claims at the moment.`;

    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-icon"><i class="fa-solid fa-inbox"></i></div>
          <h3>${activeFilter === 'all' ? 'No claims yet' : `No ${activeFilter} claims`}</h3>
          <p>${msg}</p>
          <a href="../page4/home.html" class="browse-btn">
            <i class="fa-solid fa-box-open"></i> Browse Items
          </a>
        </div>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map((claim, i) => {
    const status = claim.ClaimStatus || 'pending';
    const si     = statusInfo(status);

    return `
      <div class="claim-card" style="animation:fadeUp .35s ease both;animation-delay:${i * 0.07}s">

        <div class="claim-card-top">
          <div class="claim-image">
            ${claim.ThumbnailPath
              ? `<img src="${claim.ThumbnailPath}" alt="${escapeHtml(claim.ItemName)}">`
              : `<div class="claim-image-placeholder"><i class="fa-solid fa-box-open"></i></div>`}
          </div>

          <div class="claim-main">
            <div class="claim-item-name">${escapeHtml(claim.ItemName)}</div>
            <div class="claim-meta">
              ${claim.ItemColor
                ? `<span><i class="fa-solid fa-palette"></i>${escapeHtml(claim.ItemColor)}</span>`
                : ''}
              <span>
                <i class="fa-solid fa-calendar-days"></i>
                Submitted ${formatDate(claim.ClaimDate)}
              </span>
              <span>
                <i class="fa-solid fa-tag"></i>
                Item status: <strong>${capitalize(claim.ItemStatus || '—')}</strong>
              </span>
            </div>
          </div>
        </div>

        ${claim.ProofDescription ? `
          <div class="claim-card-body">
            <div class="claim-proof">
              <div class="claim-proof-title">Your Proof of Ownership</div>
              <p>${escapeHtml(truncate(claim.ProofDescription, 180))}</p>
            </div>
          </div>` : ''}

        <div class="claim-card-footer">
          <div class="claim-date">${formatDate(claim.ClaimDate)}</div>
          <span class="status-badge status-${status}">
            ${si.icon} ${si.label}
          </span>
        </div>

      </div>`;
  }).join('');
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function statusInfo(status) {
  return {
    pending:  { icon: '⏳', label: 'Pending'  },
    approved: { icon: '✅', label: 'Approved' },
    rejected: { icon: '❌', label: 'Rejected' },
  }[status] ?? { icon: '•', label: status };
}

function capitalize(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function spinnerHTML() {
  return `<div style="grid-column:1/-1;display:flex;justify-content:center;padding:70px 0">
    <div class="loading-spinner"></div></div>`;
}

function emptyHTML(icon, title, sub) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${sub}</p>
      </div>
    </div>`;
}

// Inject fadeUp keyframe once
(function () {
  if (document.getElementById('__keyFadeUp')) return;
  const s = document.createElement('style');
  s.id = '__keyFadeUp';
  s.textContent = `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0);    }
    }`;
  document.head.appendChild(s);
}());