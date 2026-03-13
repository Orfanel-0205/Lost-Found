let currentDeleteId = null;
let currentDeleteName = '';
let searchTimeout = null;

window.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  if (!user) return;
  if (user.roleName !== 'staff') {
    showToast('Access denied. Staff only.', 'error');
    setTimeout(() => window.location = '../../index.html', 1500);
    return;
  }
  await refreshAll();
});

async function refreshAll() {
  await Promise.all([loadStats(), loadClaims()]);
}

async function loadStats() {
  try {
    const res = await fetch('/api/dashboard-stats');
    if (!res.ok) return;
    const d = await res.json();
    document.getElementById('statTotal').textContent = d.total ?? 0;
    document.getElementById('statFound').textContent = d.found ?? 0;
    document.getElementById('statLost').textContent = d.lost ?? 0;
    document.getElementById('statClaimed').textContent = d.claimed ?? 0;
    document.getElementById('statReturned').textContent = d.returned ?? 0;
    document.getElementById('statPending').textContent = d.pending ?? 0;

    const badge = document.getElementById('pendingBadge');
    if (d.pending > 0) {
      badge.textContent = d.pending;
      badge.classList.add('show');
    } else {
      badge.classList.remove('show');
    }
  } catch {
    showToast('Failed to load stats', 'error');
  }
}

async function loadClaims() {
  const wrap = document.getElementById('claimsTableWrap');
  wrap.innerHTML = '<div class="loading-wrap"><div class="loading-spinner"></div></div>';
  const filter = document.getElementById('claimStatusFilter').value;
  try {
    const res = await fetch('/api/claims');
    if (!res.ok) { wrap.innerHTML = errorState('Failed to load claims'); return; }
    let claims = await res.json();
    if (filter) claims = claims.filter(c => c.ClaimStatus === filter);
    if (claims.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No ${filter || ''} claims found.</p></div>`;
      return;
    }
    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Claimant</th>
              <th>Student ID</th>
              <th>Date Submitted</th>
              <th>Proof</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${claims.map(c => `
              <tr>
                <td>
                  <div class="td-item">
                    <div class="td-thumb">📦</div>
                    <div>
                      <div class="td-item-name">${escapeHtml(c.ItemName)}</div>
                      <div class="td-item-meta">${escapeHtml(c.ItemColor || '—')}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style="font-weight:600">${escapeHtml(c.FName)} ${escapeHtml(c.LName)}</div>
                  <div style="font-size:0.78rem;color:var(--text3)">${escapeHtml(c.Email)}</div>
                </td>
                <td>${escapeHtml(c.StudentID || '—')}</td>
                <td>${formatDate(c.ClaimDate)}</td>
                <td><div class="proof-text">${escapeHtml(c.ProofDescription || 'No description')}</div></td>
                <td>${getBadgeHTML(c.ClaimStatus)}</td>
                <td>
                  <div class="td-actions">
                    <button class="btn btn-ghost btn-sm btn-icon" title="View Details" onclick="openClaimDetail(${c.ClaimID})">
                      <i class="fa-solid fa-eye"></i>
                    </button>
                    ${c.ClaimStatus === 'pending' ? `
                      <button class="btn btn-success btn-sm" onclick="reviewClaim(${c.ClaimID}, 'approved')">
                        <i class="fa-solid fa-check"></i> Approve
                      </button>
                      <button class="btn btn-danger btn-sm" onclick="reviewClaim(${c.ClaimID}, 'rejected')">
                        <i class="fa-solid fa-xmark"></i> Reject
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch {
    wrap.innerHTML = errorState('Connection error. Is the server running?');
  }
}

async function loadItems() {
  const wrap = document.getElementById('itemsTableWrap');
  wrap.innerHTML = '<div class="loading-wrap"><div class="loading-spinner"></div></div>';
  const search = document.getElementById('itemSearch')?.value.trim() || '';
  const status = document.getElementById('itemStatusFilter')?.value || '';
  let url = '/api/items?';
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (status) url += `status=${status}&`;
  try {
    const res = await fetch(url);
    if (!res.ok) { wrap.innerHTML = errorState('Failed to load items'); return; }
    const items = await res.json();
    if (items.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>No items found.</p></div>`;
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
                  <div style="font-weight:600">${escapeHtml(item.FName || 'Unknown')}</div>
                  <div style="font-size:0.78rem;color:var(--text3)">${escapeHtml(item.StudentID || '')}</div>
                </td>
                <td>${formatDate(item.DateReported)}</td>
                <td>${getBadgeHTML(item.Status)}</td>
                <td>
                  <div class="td-actions">
                    <button class="btn btn-ghost btn-sm btn-icon" title="Edit" onclick="openEditModal(${item.ItemID}, '${escapeHtml(item.ItemName)}', '${escapeHtml(item.ItemType || '')}', '${escapeHtml(item.ItemColor || '')}', '${escapeHtml(item.Location || '')}', '${item.Status}', '${escapeHtml((item.Description || '').replace(/'/g, "\\'"))}')">
                      <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-danger btn-sm btn-icon" title="Delete" onclick="openDeleteModal(${item.ItemID}, '${escapeHtml(item.ItemName)}')">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch {
    wrap.innerHTML = errorState('Connection error. Is the server running?');
  }
}

async function reviewClaim(claimId, status) {
  try {
    const res = await fetch(`/api/claims/${claimId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Action failed', 'error'); return; }
    showToast(`Claim ${status} successfully.`, 'success');
    closeClaimModal();
    await Promise.all([loadStats(), loadClaims()]);
  } catch {
    showToast('Connection error', 'error');
  }
}

async function openClaimDetail(claimId) {
  const res = await fetch('/api/claims');
  const claims = await res.json();
  const c = claims.find(x => x.ClaimID === claimId);
  if (!c) return;

  document.getElementById('claimDetailBody').innerHTML = `
    <div class="claim-detail-grid">
      <div class="claim-detail-field"><label>Item</label><p>${escapeHtml(c.ItemName)}</p></div>
      <div class="claim-detail-field"><label>Item Color</label><p>${escapeHtml(c.ItemColor || '—')}</p></div>
      <div class="claim-detail-field"><label>Claimant</label><p>${escapeHtml(c.FName)} ${escapeHtml(c.LName)}</p></div>
      <div class="claim-detail-field"><label>Email</label><p>${escapeHtml(c.Email)}</p></div>
      <div class="claim-detail-field"><label>Student ID</label><p>${escapeHtml(c.StudentID || '—')}</p></div>
      <div class="claim-detail-field"><label>Date Submitted</label><p>${formatDate(c.ClaimDate)}</p></div>
      <div class="claim-detail-field"><label>Status</label><p>${getBadgeHTML(c.ClaimStatus)}</p></div>
    </div>
    <div class="proof-box">
      <label>Proof of Ownership</label>
      <p>${escapeHtml(c.ProofDescription || 'No description provided.')}</p>
      ${c.ProofImagePath ? `<div class="proof-img-wrap"><img src="${c.ProofImagePath}" alt="Proof image"></div>` : ''}
    </div>
  `;

  const actions = document.getElementById('claimDetailActions');
  actions.innerHTML = `<button class="btn btn-ghost" onclick="closeClaimModal()">Close</button>`;
  if (c.ClaimStatus === 'pending') {
    actions.innerHTML += `
      <button class="btn btn-success" onclick="reviewClaim(${c.ClaimID}, 'approved')">
        <i class="fa-solid fa-check"></i> Approve
      </button>
      <button class="btn btn-danger" onclick="reviewClaim(${c.ClaimID}, 'rejected')">
        <i class="fa-solid fa-xmark"></i> Reject
      </button>
    `;
  }

  document.getElementById('claimDetailModal').classList.add('active');
}

function closeClaimModal() {
  document.getElementById('claimDetailModal').classList.remove('active');
}

function openEditModal(id, name, type, color, location, status, description) {
  document.getElementById('editItemId').value = id;
  document.getElementById('editItemName').value = name;
  document.getElementById('editItemType').value = type;
  document.getElementById('editItemColor').value = color;
  document.getElementById('editLocation').value = location;
  document.getElementById('editStatus').value = status;
  document.getElementById('editDescription').value = description;
  document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
}

async function saveEdit() {
  const id = document.getElementById('editItemId').value;
  const itemName = document.getElementById('editItemName').value.trim();
  if (!itemName) { showToast('Item name is required', 'error'); return; }

  const body = {
    itemName,
    itemType: document.getElementById('editItemType').value.trim(),
    itemColor: document.getElementById('editItemColor').value.trim(),
    location: document.getElementById('editLocation').value.trim(),
    status: document.getElementById('editStatus').value,
    description: document.getElementById('editDescription').value.trim()
  };

  try {
    const res = await fetch(`/api/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Update failed', 'error'); return; }
    showToast('Item updated successfully.', 'success');
    closeEditModal();
    await Promise.all([loadStats(), loadItems()]);
  } catch {
    showToast('Connection error', 'error');
  }
}

function openDeleteModal(id, name) {
  currentDeleteId = id;
  currentDeleteName = name;
  document.getElementById('deleteItemName').textContent = name;
  document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('active');
  currentDeleteId = null;
}

async function confirmDelete() {
  if (!currentDeleteId) return;
  try {
    const res = await fetch(`/api/items/${currentDeleteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Delete failed', 'error'); return; }
    showToast(`"${currentDeleteName}" deleted.`, 'success');
    closeDeleteModal();
    await Promise.all([loadStats(), loadItems()]);
  } catch {
    showToast('Connection error', 'error');
  }
}

function showSection(section, el) {
  document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('sectionClaims').style.display = section === 'claims' ? 'block' : 'none';
  document.getElementById('sectionItems').style.display = section === 'items' ? 'block' : 'none';
  if (section === 'items') loadItems();
}

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadItems, 350);
}

document.addEventListener('click', e => {
  if (e.target === document.getElementById('editModal')) closeEditModal();
  if (e.target === document.getElementById('claimDetailModal')) closeClaimModal();
  if (e.target === document.getElementById('deleteModal')) closeDeleteModal();
});

function errorState(msg) {
  return `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${msg}</p></div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}