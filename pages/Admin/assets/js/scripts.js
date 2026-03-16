// pages/Admin/assets/js/scripts.js
// ─── STATE ────────────────────────────────────────────
let allItemsData   = [];
let pendingDeleteId = null;
let searchTimer     = null;

// ─── INIT ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  if (!user || user.roleName !== 'staff') {
    window.location.href = '../../index.html';
    return;
  }
  await refreshAll();
});

async function refreshAll() {
  // Load stats and the default testimonials view
  await Promise.all([loadStats(), loadTestimonials()]);
}

// ─── STATS ────────────────────────────────────────────
async function loadStats() {
  try {
    const res  = await fetch('/api/dashboard-stats');
    const data = await res.json();
    setText('statTotal',    data.total   ?? '—');
    setText('statFound',    data.found   ?? '—');
    setText('statLost',     data.lost    ?? '—');
    setText('statClaimed',  data.claimed ?? '—');
    setText('statReturned', data.returned ?? '—');
    // The pending claims stat is no longer displayed
  } catch (err) {
    console.error('Stats error:', err);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── SECTION TOGGLE ───────────────────────────────────
function showSection(section, el) {
  document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  // Hide all sections first
  document.getElementById('sectionTestimonials').style.display = 'none';
  document.getElementById('sectionItems').style.display  = 'none';
  document.getElementById('sectionClaims').style.display = 'none';

  // Show the target section and load its data
  const targetSection = document.getElementById(`section${section.charAt(0).toUpperCase() + section.slice(1)}`);
  if (targetSection) {
    targetSection.style.display = 'block';
    if (section === 'items') {
      loadItems();
    } else if (section === 'claims') {
      loadClaims();
    }
  }
}

// ─── TESTIMONIALS ───────────────────────────────────
async function loadTestimonials() {
  const grid = document.getElementById('testimonialsGrid');
  grid.innerHTML = loadingHTML();

  try {
    const res = await fetch('/api/items?status=returned');
    if (!res.ok) throw new Error(await res.text());

    const returnedItems = await res.json();

    if (returnedItems.length === 0) {
      grid.innerHTML = emptyHTML('🏆', 'No successfully returned items yet.');
      return;
    }

    grid.innerHTML = returnedItems.map(item => {
      // For testimonials, we need to know who it was returned to.
      // This information isn't in the /api/items response.
      // For now, we'll just show the item and that it was returned.
      // A future update could enhance the API to provide claimant details.
      return `
        <div class="testimonial-card">
          <div class="testimonial-img">
            ${item.ThumbnailPath ? `<img src="${item.ThumbnailPath}" alt="${escapeHtml(item.ItemName)}">` : '📦'}
          </div>
          <div class="testimonial-body">
            <h4 class="testimonial-item-name">${escapeHtml(item.ItemName)}</h4>
            <p class="testimonial-meta">
              Originally reported by <strong>${escapeHtml(item.FName || 'Unknown')}</strong> on ${formatDate(item.DateReported)}.
            </p>
            <p class="testimonial-narrative">
              This item was successfully returned, marking a successful recovery through UNIFIND.
            </p>
          </div>
          <div class="testimonial-footer">
            <span>Status: ${getBadgeHTML('Returned')}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = emptyHTML('⚠️', 'Failed to load testimonials: ' + err.message);
  }
}

// ─── ITEMS TABLE ──────────────────────────────────────
async function loadItems() {
  const wrap   = document.getElementById('itemsTableWrap');
  const search = document.getElementById('itemSearch')?.value.trim() || '';
  const status = document.getElementById('itemStatusFilter')?.value || '';
  wrap.innerHTML = loadingHTML();

  try {
    let url = '/api/items?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (status) url += `status=${status}&`;

    const res   = await fetch(url);
    const items = await res.json();
    allItemsData = items;

    if (items.length === 0) {
      wrap.innerHTML = emptyHTML('📦', 'No items found.');
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Location</th>
              <th>Reported By</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>
                  <div class="td-item">
                    <div class="td-thumb">
                      ${item.ThumbnailPath ? `<img src="${item.ThumbnailPath}" alt="">` : '📦'}
                    </div>
                    <div>
                      <div class="td-item-name">${escapeHtml(item.ItemName)}</div>
                      <div class="td-item-meta">${escapeHtml(item.ItemColor || '—')}</div>
                    </div>
                  </div>
                </td>
                <td>${escapeHtml(item.ItemType || '—')}</td>
                <td>${escapeHtml(item.Location || '—')}</td>
                <td>
                  <div class="td-item-name">${escapeHtml(item.FName ? item.FName + ' ' + item.LName : '—')}</div>
                  <div class="td-item-meta">${escapeHtml(item.StudentID || '')}</div>
                </td>
                <td>${formatDate(item.DateReported || item.CreatedAt)}</td>
                <td>${getBadgeHTML(item.Status)}</td>
                <td>
                  <div class="td-actions">
                    <button class="btn btn-primary btn-sm btn-icon" onclick="openEditModal(${item.ItemID})" title="Edit">
                      <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-danger btn-sm btn-icon" onclick="openDeleteModal(${item.ItemID}, '${escapeHtml(item.ItemName)}')" title="Delete">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    wrap.innerHTML = emptyHTML('⚠️', 'Failed to load items: ' + err.message);
  }
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadItems, 350);
}

// ─── EDIT MODAL ───────────────────────────────────────
async function openEditModal(itemId) {
  try {
    const res  = await fetch(`/api/items/${itemId}`);
    const item = await res.json();

    document.getElementById('editItemId').value      = item.ItemID;
    document.getElementById('editItemName').value    = item.ItemName    || '';
    document.getElementById('editItemType').value    = item.ItemType    || '';
    document.getElementById('editItemColor').value   = item.ItemColor   || '';
    document.getElementById('editLocation').value    = item.Location    || '';
    document.getElementById('editStatus').value      = item.Status      || 'found';
    document.getElementById('editDescription').value = item.Description || '';

    document.getElementById('editModal').classList.add('active');
  } catch {
    showToast('Failed to load item details', 'error');
  }
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
}

async function saveEdit() {
  const itemId = document.getElementById('editItemId').value;
  const body = {
    itemName:    document.getElementById('editItemName').value,
    itemType:    document.getElementById('editItemType').value,
    itemColor:   document.getElementById('editItemColor').value,
    location:    document.getElementById('editLocation').value,
    status:      document.getElementById('editStatus').value,
    description: document.getElementById('editDescription').value,
  };

  try {
    const res  = await fetch(`/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!res.ok) { showToast(data.error || 'Failed to save', 'error'); return; }

    showToast('Item updated successfully', 'success');
    closeEditModal();
    await Promise.all([loadItems(), loadStats()]);
  } catch {
    showToast('Connection error', 'error');
  }
}

// ─── DELETE MODAL ─────────────────────────────────────
function openDeleteModal(itemId, itemName) {
  pendingDeleteId = itemId;
  document.getElementById('deleteItemName').textContent = itemName;
  document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('active');
  pendingDeleteId = null;
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  try {
    const res = await fetch(`/api/items/${pendingDeleteId}`, { method: 'DELETE' });
    if (!res.ok) { showToast('Failed to delete', 'error'); return; }
    showToast('Item deleted', 'success');
    closeDeleteModal();
    await Promise.all([loadItems(), loadStats()]);
  } catch {
    showToast('Connection error', 'error');
  }
}

// ─── CLOSE MODALS ON OVERLAY CLICK ────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });
});

// ─── SMALL HELPERS ────────────────────────────────────
function loadingHTML() {
  return '<div class="loading-wrap"><div class="loading-spinner"></div></div>';
}

function emptyHTML(icon, msg) {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;
}

// ─── CLAIMS TABLE ──────────────────────────────────────
async function loadClaims() {
  const wrap = document.getElementById('claimsTableWrap');
  const status = document.getElementById('claimStatusFilter')?.value || '';
  wrap.innerHTML = loadingHTML();

  try {
    let url = '/api/claims/all?';
    if (status) url += `status=${status}&`;

    const res = await fetch(url);
    const claims = await res.json();

    if (claims.length === 0) {
      wrap.innerHTML = emptyHTML('📂', 'No claims found.');
      return;
    }

    renderClaims(claims);
  } catch (err) {
    wrap.innerHTML = emptyHTML('⚠️', 'Failed to load claims: ' + err.message);
  }
}

function renderClaims(claims) {
  const wrap = document.getElementById('claimsTableWrap');
  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Claimant</th>
            <th>Proof</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${claims.map(claim => `
            <tr>
              <td>${escapeHtml(claim.ItemName)}</td>
              <td>
                <div class="td-item-name">${escapeHtml(claim.FName)} ${escapeHtml(claim.LName)}</div>
                <div class="td-item-meta">${escapeHtml(claim.Email)}</div>
              </td>
              <td>
                <div class="td-item-name">${escapeHtml(claim.ClaimDescription)}</div>
                <div class="td-item-meta">
                  <a href="${claim.ClaimImagePath}" target="_blank">View Image</a>
                </div>
              </td>
              <td>${formatDate(claim.ClaimDate)}</td>
              <td>${getBadgeHTML(claim.ClaimStatus)}</td>
              <td>
                <div class="td-actions">
                  <button class="btn btn-primary btn-sm" onclick="approveClaim(${claim.ClaimID})">Approve</button>
                  <button class="btn btn-danger btn-sm" onclick="rejectClaim(${claim.ClaimID})">Reject</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function approveClaim(claimId) {
  try {
    const res = await fetch(`/api/claims/${claimId}/approve`, { method: 'PUT' });
    if (!res.ok) {
      showToast('Failed to approve claim', 'error');
      return;
    }
    showToast('Claim approved', 'success');
    await loadClaims();
  } catch {
    showToast('Connection error', 'error');
  }
}

async function rejectClaim(claimId) {
  try {
    const res = await fetch(`/api/claims/${claimId}/reject`, { method: 'PUT' });
    if (!res.ok) {
      showToast('Failed to reject claim', 'error');
      return;
    }
    showToast('Claim rejected', 'success');
    await loadClaims();
  } catch {
    showToast('Connection error', 'error');
  }
}


function getBadgeHTML(status) {
    const statusMap = {
        found: 'blue',
        lost: 'orange',
        claimed: 'purple',
        returned: 'green',
        archived: 'grey'
    };
    const color = statusMap[status.toLowerCase()] || 'grey';
    return `<span class="badge badge-${color}">${escapeHtml(status)}</span>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}