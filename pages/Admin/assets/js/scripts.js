// ─── STATE ────────────────────────────────────────────
let allClaimsData  = [];
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
  await Promise.all([loadStats(), loadClaims()]);
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
    setText('statPending',  data.pending ?? '—');

    const badge = document.getElementById('pendingBadge');
    if (badge) {
      badge.textContent = data.pending;
      badge.classList.toggle('show', data.pending > 0);
    }
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
  document.getElementById('sectionClaims').style.display = section === 'claims' ? 'block' : 'none';
  document.getElementById('sectionItems').style.display  = section === 'items'  ? 'block' : 'none';
  if (section === 'claims') loadClaims();
  else                      loadItems();
}

// ─── CLAIMS TABLE ─────────────────────────────────────
async function loadClaims() {
  const wrap   = document.getElementById('claimsTableWrap');
  const filter = document.getElementById('claimStatusFilter')?.value || '';
  wrap.innerHTML = loadingHTML();

  try {
    const res = await fetch('/api/claims');
    if (!res.ok) throw new Error(await res.text());

    let claims = await res.json();
    allClaimsData = claims;

    if (filter) claims = claims.filter(c => c.ClaimStatus === filter);

    if (claims.length === 0) {
      wrap.innerHTML = emptyHTML('📋', `No ${filter || ''} claims found.`);
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Claimant</th>
              <th>Proof Preview</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${claims.map((c, idx) => {
              const globalIdx = allClaimsData.findIndex(x => x.ClaimID === c.ClaimID);
              return `
              <tr>
                <td>
                  <div class="td-item">
                    <div class="td-thumb">
                      ${c.ThumbnailPath ? `<img src="${c.ThumbnailPath}" alt="">` : '📦'}
                    </div>
                    <div>
                      <div class="td-item-name">${escapeHtml(c.ItemName)}</div>
                      <div class="td-item-meta">${escapeHtml(c.ItemColor || '—')}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="td-item-name">${escapeHtml(c.FName + ' ' + c.LName)}</div>
                  <div class="td-item-meta">${escapeHtml(c.StudentID || c.Email || '—')}</div>
                </td>
                <td>
                  <div class="proof-text">${escapeHtml(c.ProofDescription || '—')}</div>
                </td>
                <td>${formatDate(c.ClaimDate)}</td>
                <td>${getBadgeHTML(c.ClaimStatus)}</td>
                <td>
                  <div class="td-actions">
                    <button class="btn btn-primary btn-sm btn-icon" onclick="openClaimDetail(${globalIdx})" title="View Details">
                      <i class="fa-solid fa-eye"></i>
                    </button>
                    ${c.ClaimStatus === 'pending' ? `
                      <button class="btn btn-success btn-sm" onclick="reviewClaim(${c.ClaimID},'approved')">
                        <i class="fa-solid fa-check"></i> Approve
                      </button>
                      <button class="btn btn-danger btn-sm" onclick="reviewClaim(${c.ClaimID},'rejected')">
                        <i class="fa-solid fa-xmark"></i> Reject
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    wrap.innerHTML = emptyHTML('⚠️', 'Failed to load claims: ' + err.message);
  }
}

// ─── CLAIM DETAIL MODAL ───────────────────────────────
function openClaimDetail(idx) {
  const c = allClaimsData[idx];
  if (!c) return;

  document.getElementById('claimDetailBody').innerHTML = `
    <div class="claim-detail-grid">
      <div class="claim-detail-field">
        <label>Item Name</label>
        <p>${escapeHtml(c.ItemName)}</p>
      </div>
      <div class="claim-detail-field">
        <label>Item Color</label>
        <p>${escapeHtml(c.ItemColor || '—')}</p>
      </div>
      <div class="claim-detail-field">
        <label>Item Status</label>
        <p>${getBadgeHTML(c.ItemStatus)}</p>
      </div>
      <div class="claim-detail-field">
        <label>Claim Status</label>
        <p>${getBadgeHTML(c.ClaimStatus)}</p>
      </div>
      <div class="claim-detail-field">
        <label>Claimant</label>
        <p>${escapeHtml(c.FName + ' ' + c.LName)}</p>
      </div>
      <div class="claim-detail-field">
        <label>Student ID</label>
        <p>${escapeHtml(c.StudentID || '—')}</p>
      </div>
      <div class="claim-detail-field">
        <label>Email</label>
        <p>${escapeHtml(c.Email || '—')}</p>
      </div>
      <div class="claim-detail-field">
        <label>Date Submitted</label>
        <p>${formatDate(c.ClaimDate)}</p>
      </div>
    </div>

    ${c.ProofDescription ? `
      <div class="proof-box">
        <label>Proof of Ownership</label>
        <p>${escapeHtml(c.ProofDescription)}</p>
      </div>` : ''}

    ${c.ProofImagePath ? `
      <div class="proof-box">
        <label>Supporting Image</label>
        <div class="proof-img-wrap">
          <img src="${c.ProofImagePath}" alt="Proof of ownership image">
        </div>
      </div>` : `
      <div class="proof-box" style="opacity:.6">
        <label>Supporting Image</label>
        <p style="font-style:italic;color:var(--text3)">No supporting image was uploaded.</p>
      </div>`}
  `;

  document.getElementById('claimDetailActions').innerHTML = `
    <button class="btn btn-ghost" onclick="closeClaimModal()">Close</button>
    ${c.ClaimStatus === 'pending' ? `
      <button class="btn btn-danger" onclick="reviewClaim(${c.ClaimID},'rejected');closeClaimModal();">
        <i class="fa-solid fa-xmark"></i> Reject
      </button>
      <button class="btn btn-success" onclick="reviewClaim(${c.ClaimID},'approved');closeClaimModal();">
        <i class="fa-solid fa-check"></i> Approve Claim
      </button>
    ` : ''}
  `;

  document.getElementById('claimDetailModal').classList.add('active');
}

function closeClaimModal() {
  document.getElementById('claimDetailModal').classList.remove('active');
}

async function reviewClaim(claimId, status) {
  try {
    const res = await fetch(`/api/claims/${claimId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to update claim', 'error'); return; }

    showToast(`Claim ${status} successfully! ✅`, 'success');
    await refreshAll();
  } catch {
    showToast('Connection error', 'error');
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}