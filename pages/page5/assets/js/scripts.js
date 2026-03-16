/* ═══════════════════════════════════════════════
   UNIFIND – Claims Page Logic
   Supports:
   - claim submission page
   - claim history page
   ═══════════════════════════════════════════════ */

let allClaims = [];
let activeFilter = 'all';

window.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();

  const statementForm = document.getElementById('statement-form');
  const claimsList = document.getElementById('claimsList');

  if (statementForm) {
    statementForm.addEventListener('submit', submitClaimForm);
  }

  if (claimsList) {
    await loadMyClaims();
  }
});

/* =========================
   CLAIM SUBMISSION
========================= */
async function submitClaimForm(e) {
  e.preventDefault();

  const description = document.getElementById('description').value.trim();
  const image = document.getElementById('image').files[0];
  const submitButton = document.querySelector('.btn-submit');

  if (!description || !image) {
    showToast('Please complete the statement and upload an image.', 'error');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('itemId');

  const formData = new FormData();
  formData.append('description', description);
  formData.append('image', image);
  if (itemId) {
    formData.append('itemId', itemId);
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/claims', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Failed to submit claim.', 'error');
      return;
    }

    showToast('Claim submitted successfully!', 'success');

    setTimeout(() => {
      window.location.href = '../Admin/dashboard.html?tab=claims';
    }, 1000);

  } catch (err) {
    console.error(err);
    showToast('An error occurred while submitting your claim.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Claim';
  }
}

/* =========================
   LOAD CLAIM HISTORY
========================= */
async function loadMyClaims() {
  const list = document.getElementById('claimsList');
  if (!list) return;

  list.innerHTML = spinnerHTML();

  try {
    const res = await fetch('/api/my-claims');
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Failed to load claims.', 'error');
      list.innerHTML = emptyHTML('⚠️', 'Could not load your claims.', 'Please refresh the page.');
      return;
    }

    allClaims = data;
    renderClaims();
  } catch (err) {
    console.error(err);
    list.innerHTML = emptyHTML('🔌', 'Connection error.', 'Please check if the server is running.');
  }
}

function filterClaims(filter, el) {
  activeFilter = filter;

  document.querySelectorAll('.section-tab').forEach(tab => {
    tab.classList.remove('active');
  });

  if (el) el.classList.add('active');

  renderClaims();
}

function renderClaims() {
  const list = document.getElementById('claimsList');
  if (!list) return;

  const filtered = activeFilter === 'all'
    ? allClaims
    : allClaims.filter(claim => claim.ClaimStatus === activeFilter);

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-inner">
          <div class="empty-icon"><i class="fa-solid fa-inbox"></i></div>
          <h3>No claims found</h3>
          <p>You do not have any ${activeFilter === 'all' ? '' : activeFilter + ' '}claims yet.</p>
          <a href="../page4/home.html" class="browse-btn">
            <i class="fa-solid fa-box-open"></i> Browse Items
          </a>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map((claim, index) => {
    const status = claim.ClaimStatus || 'pending';
    const info = statusInfo(status);

    return `
      <div class="claim-card" style="animation:fadeUp .35s ease both; animation-delay:${index * 0.06}s;">
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
              <span><i class="fa-solid fa-calendar-days"></i> Submitted ${formatDate(claim.ClaimDate)}</span>
              <span><i class="fa-solid fa-tag"></i> Item status: <strong>${capitalize(claim.ItemStatus)}</strong></span>
            </div>
          </div>
        </div>

        <div class="claim-card-body">
          <div class="claim-proof">
            <div class="claim-proof-title">Your Proof of Ownership</div>
            <p>${escapeHtml(truncate(claim.ProofDescription, 200))}</p>
          </div>
        </div>

        <div class="claim-card-footer">
          <div class="claim-date">${formatDate(claim.ClaimDate)}</div>
          <span class="status-badge status-${status}">
            ${info.icon} ${info.label}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

/* =========================
   HELPERS
========================= */
function statusInfo(status) {
  return {
    pending:  { icon: '⏳', label: 'Pending' },
    approved: { icon: '✅', label: 'Approved' },
    rejected: { icon: '❌', label: 'Rejected' }
  }[status] || { icon: '•', label: status };
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
  return `
    <div style="grid-column:1/-1;display:flex;justify-content:center;padding:70px 0">
      <div class="loading-spinner"></div>
    </div>
  `;
}

function emptyHTML(icon, title, sub) {
  return `
    <div class="empty-state">
      <div class="empty-state-inner">
        <div class="empty-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${sub}</p>
      </div>
    </div>
  `;
}