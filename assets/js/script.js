let currentUser = null;
let allItems = [];
let currentItemId = null;
let searchTimeout = null;

window.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  if (!currentUser) return;
  await loadItems();

  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadItems, 350);
  });

  document.getElementById('typeFilter').addEventListener('change', loadItems);
  document.getElementById('statusFilter').addEventListener('change', loadItems);
});

async function loadItems() {
  const search = document.getElementById('searchInput').value.trim();
  const type = document.getElementById('typeFilter').value;
  const status = document.getElementById('statusFilter').value;

  let url = '/api/items?';
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (type) url += `type=${type}&`;
  if (status) url += `status=${status}&`;

  try {
    const res = await fetch(url);
    allItems = await res.json();
    renderItems();
  } catch { showToast('Failed to load items', 'error'); }
}

function renderItems() {
  const grid = document.getElementById('itemsGrid');
  const count = document.getElementById('itemCount');
  count.textContent = allItems.length;

  if (allItems.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-icon">📭</div><p>No items found. Try adjusting your search or filters.</p><a href="/report.html" class="btn btn-primary" style="margin-top: 8px;">Report an Item</a></div>`;
    return;
  }

  grid.innerHTML = allItems.map((item, i) => `
    <div class="item-card stagger-item" onclick="openDetail(${item.ItemID})" style="animation-delay:${Math.min(i,8)*0.06}s">
      <div class="item-img">
        ${item.ThumbnailPath ? `<img src="${item.ThumbnailPath}" alt="${item.ItemName}" loading="lazy">` : '📦'}
      </div>
      <div class="item-body">
        <div class="item-name">${escapeHtml(item.ItemName)}</div>
        <div class="item-meta">
          ${item.ItemColor ? `<span>🎨 ${escapeHtml(item.ItemColor)}</span>` : ''}
          ${item.Location ? `<span>📍 ${escapeHtml(item.Location)}</span>` : ''}
          ${item.DateReported ? `<span>📅 ${formatDate(item.DateReported)}</span>` : ''}
        </div>
      </div>
      <div class="item-footer">
        <div class="item-reporter">by <strong>${escapeHtml(item.FName || 'Unknown')}</strong></div>
        ${getBadgeHTML(item.Status)}
      </div>
    </div>
  `).join('');
}

async function openDetail(itemId) {
  currentItemId = itemId;
  document.getElementById('detailModal').classList.add('active');
  document.getElementById('modalTitle').textContent = 'Loading...';
  document.getElementById('modalDetails').innerHTML = '<div class="loading-spinner"></div>';
  document.getElementById('modalImages').innerHTML = '';
  document.getElementById('claimSection').innerHTML = '';

  try {
    const res = await fetch('/api/items/' + itemId);
    const item = await res.json();

    document.getElementById('modalTitle').textContent = item.ItemName;
    document.getElementById('modalBadge').innerHTML = getBadgeHTML(item.Status);

    const mainImg = document.getElementById('modalMainImg');
    if (item.images && item.images.length > 0) {
      mainImg.innerHTML = `<img src="${item.images[0].ImagePath}" alt="${item.ItemName}">`;
    } else {
      mainImg.innerHTML = '📦';
    }

    const thumbsContainer = document.getElementById('modalImages');
    if (item.images && item.images.length > 1) {
      thumbsContainer.innerHTML = item.images.map((img, i) =>
        `<img src="${img.ImagePath}" class="${i===0?'active':''}" onclick="setMainImg(this, '${img.ImagePath}')">`
      ).join('');
    }

    document.getElementById('modalDetails').innerHTML = `
      <div class="detail-field"><label>Item Type</label><p>${item.ItemType || '—'}</p></div>
      <div class="detail-field"><label>Color</label><p>${item.ItemColor || '—'}</p></div>
      <div class="detail-field"><label>Quantity</label><p>${item.ItemQuantity || 1}</p></div>
      <div class="detail-field"><label>Location ${item.ReportType === 'found' ? 'Found' : 'Lost'}</label><p>${item.Location || '—'}</p></div>
      <div class="detail-field"><label>Date ${item.ReportType === 'found' ? 'Found' : 'Lost'}</label><p>${formatDate(item.DateReported)}</p></div>
      <div class="detail-field"><label>Reported By</label><p>${item.FName ? item.FName + ' ' + item.LName : '—'} ${item.StudentID ? `(${item.StudentID})` : ''}</p></div>
    `;

    if (item.Description) {
      document.getElementById('modalDescription').innerHTML = `<div class="form-group"><label style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text3);font-weight:600;">Description</label><p style="font-size:0.9rem;color:var(--text2);line-height:1.6;">${escapeHtml(item.Description)}</p></div>`;
    }

    const claimSection = document.getElementById('claimSection');
    if (currentUser && (item.Status === 'found') && item.ReportedBy !== currentUser.id) {
      claimSection.innerHTML = `
        <div class="claim-form-section">
          <h4 class="claim-section-title">🔖 Submit a Claim</h4>
          <div class="form-group">
            <label>Proof of Ownership Description *</label>
            <textarea id="claimProof" placeholder="Describe identifying features, contents, or any details only the owner would know..."></textarea>
          </div>
          <div class="form-group">
            <label>Supporting Photo (optional)</label>
            <div class="file-upload-area" onclick="document.getElementById('claimImageInput').click()" style="padding: 20px;">
              <input type="file" id="claimImageInput" accept="image/*">
              <div class="upload-icon" style="font-size:1.5rem;margin-bottom:4px;">📎</div>
              <p>Click to attach a proof image</p>
            </div>
          </div>
          <button class="btn btn-primary" onclick="submitClaim(${item.ItemID})" style="width:100%;">Submit Claim</button>
        </div>
      `;
    } else if (item.Status === 'returned') {
      claimSection.innerHTML = `<div style="padding: 16px; background: var(--green-dim); border: 1px solid rgba(16,185,129,0.2); border-radius: var(--radius-sm); text-align: center; color: var(--green); font-size: 0.9rem; margin-top: 12px;">✅ This item has been successfully returned to its owner.</div>`;
    }

  } catch { showToast('Failed to load item details', 'error'); }
}

function setMainImg(thumb, src) {
  document.querySelectorAll('#modalImages img').forEach(i => i.classList.remove('active'));
  thumb.classList.add('active');
  const main = document.getElementById('modalMainImg');
  main.innerHTML = `<img src="${src}" alt="Item image">`;
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('active');
  currentItemId = null;
}

document.getElementById('detailModal').addEventListener('click', e => {
  if (e.target === document.getElementById('detailModal')) closeModal();
});

async function submitClaim(itemId) {
  const proof = document.getElementById('claimProof').value.trim();
  if (!proof) { showToast('Please provide proof of ownership description', 'error'); return; }

  const formData = new FormData();
  formData.append('itemId', itemId);
  formData.append('proofDescription', proof);

  const imgInput = document.getElementById('claimImageInput');
  if (imgInput && imgInput.files[0]) formData.append('proofImage', imgInput.files[0]);

  try {
    const res = await fetch('/api/claims', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to submit claim', 'error'); return; }
    showToast('Claim submitted successfully! Staff will review it.', 'success');
    closeModal();
    loadItems();
  } catch { showToast('Connection error', 'error'); }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
