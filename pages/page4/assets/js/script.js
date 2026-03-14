/* ═══════════════════════════════════════════════
   UNIFIND – Home Page (page4)
   ═══════════════════════════════════════════════ */

let currentUser  = null;
let allItems     = [];
let currentItemId = null;
let searchTimeout = null;

// ─── INIT ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();   // redirects to login if not authenticated
  if (!currentUser) return;

  // Show dashboard link for staff
  if (currentUser.roleName === 'staff') {
    const el = document.getElementById('dashboardLink');
    if (el) el.style.display = 'flex';
  }

  await loadItems();

  // Search + filter listeners
  document.getElementById('searchInput')
    .addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(loadItems, 350);
    });

  document.getElementById('typeFilter').addEventListener('change',   loadItems);
  document.getElementById('statusFilter').addEventListener('change', loadItems);

  // Close modal on overlay click
  document.getElementById('detailModal')
    .addEventListener('click', e => {
      if (e.target === document.getElementById('detailModal')) closeModal();
    });

  document.getElementById('closeModalBtn').addEventListener('click', closeModal);

  // Mobile menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const navLinks   = document.getElementById('navLinks');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => navLinks.classList.toggle('show'));
    document.addEventListener('click', e => {
      if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('show');
      }
    });
  }
});

// ─── LOAD ITEMS FROM API ────────────────────────────────────────────────────
async function loadItems() {
  const search = document.getElementById('searchInput').value.trim();
  const type   = document.getElementById('typeFilter').value;
  const status = document.getElementById('statusFilter').value;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (type)   params.set('type',   type);
  if (status) params.set('status', status);

  try {
    const res = await fetch('/api/items?' + params.toString());
    if (!res.ok) throw new Error('Failed to fetch items');
    allItems = await res.json();
    renderItems();
  } catch (err) {
    console.error(err);
    showToast('Failed to load items. Is the server running?', 'error');
  }
}

// ─── RENDER ITEMS GRID ──────────────────────────────────────────────────────
function renderItems() {
  const grid  = document.getElementById('itemsGrid');
  const count = document.getElementById('itemCount');
  count.textContent = allItems.length;

  if (allItems.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">📭</div>
        <p>No items match your search. Try adjusting the filters.</p>
        <a href="../page1/report.html" class="btn btn-primary" style="margin-top:12px">
          <i class="fa-solid fa-plus"></i> Report an Item
        </a>
      </div>`;
    return;
  }

  grid.innerHTML = allItems.map((item, i) => {
    const delay = Math.min(i, 8) * 0.06;
    return `
      <div class="item-card" onclick="openDetail(${item.ItemID})"
           style="animation:fadeUp .35s ease both;animation-delay:${delay}s">
        <div class="item-img">
          ${item.ThumbnailPath
            ? `<img src="${item.ThumbnailPath}" alt="${escapeHtml(item.ItemName)}"
                    loading="lazy" onerror="this.parentElement.innerHTML='📦'">`
            : '📦'}
        </div>
        <div class="item-body">
          <div class="item-name">${escapeHtml(item.ItemName)}</div>
          <div class="item-meta">
            ${item.ItemColor ? `<span>🎨 ${escapeHtml(item.ItemColor)}</span>` : ''}
            ${item.Location  ? `<span>📍 ${escapeHtml(item.Location)}</span>`  : ''}
            ${item.DateReported ? `<span>📅 ${formatDate(item.DateReported)}</span>` : ''}
          </div>
        </div>
        <div class="item-footer">
          <div class="item-reporter">
            by <strong>${escapeHtml(item.FName || 'Unknown')}</strong>
          </div>
          ${getBadgeHTML(item.Status)}
        </div>
      </div>`;
  }).join('');
}

// ─── ITEM DETAIL MODAL ──────────────────────────────────────────────────────
async function openDetail(itemId) {
  currentItemId = itemId;
  const modal = document.getElementById('detailModal');
  modal.classList.add('active');

  // Reset modal
  document.getElementById('modalTitle').textContent = 'Loading…';
  document.getElementById('modalDetails').innerHTML = '<div class="loading-spinner" style="margin:30px auto"></div>';
  document.getElementById('modalImages').innerHTML   = '';
  document.getElementById('modalBadge').innerHTML    = '';
  document.getElementById('modalDescription').innerHTML = '';
  document.getElementById('claimSection').innerHTML  = '';
  document.getElementById('modalMainImg').innerHTML  = '📦';

  try {
    const res  = await fetch('/api/items/' + itemId);
    if (!res.ok) throw new Error('Item not found');
    const item = await res.json();

    document.getElementById('modalTitle').textContent = item.ItemName;
    document.getElementById('modalBadge').innerHTML   = getBadgeHTML(item.Status);

    // Main image
    const mainImgEl = document.getElementById('modalMainImg');
    if (item.images && item.images.length > 0) {
      mainImgEl.innerHTML = `<img src="${item.images[0].ImagePath}" alt="${escapeHtml(item.ItemName)}"
        onerror="this.parentElement.innerHTML='📦'">`;
    } else {
      mainImgEl.innerHTML = '📦';
    }

    // Thumbnails strip (if multiple images)
    const thumbsEl = document.getElementById('modalImages');
    if (item.images && item.images.length > 1) {
      thumbsEl.innerHTML = item.images.map((img, i) => `
        <img src="${img.ImagePath}" class="${i === 0 ? 'active' : ''}"
             onclick="setMainImg(this, '${img.ImagePath}')"
             onerror="this.style.display='none'">`
      ).join('');
    }

    // Detail fields
    document.getElementById('modalDetails').innerHTML = `
      <div class="detail-field"><label>Item Type</label><p>${escapeHtml(item.ItemType || '—')}</p></div>
      <div class="detail-field"><label>Color</label><p>${escapeHtml(item.ItemColor || '—')}</p></div>
      <div class="detail-field"><label>Quantity</label><p>${item.ItemQuantity || 1}</p></div>
      <div class="detail-field">
        <label>Location ${item.ReportType === 'found' ? 'Found' : 'Last Seen'}</label>
        <p>${escapeHtml(item.Location || '—')}</p>
      </div>
      <div class="detail-field">
        <label>Date ${item.ReportType === 'found' ? 'Found' : 'Lost'}</label>
        <p>${formatDate(item.DateReported)}</p>
      </div>
      <div class="detail-field">
        <label>Reported By</label>
        <p>${escapeHtml(item.FName ? item.FName + ' ' + item.LName : '—')}
           ${item.StudentID ? `<span style="color:var(--text3)">(${escapeHtml(item.StudentID)})</span>` : ''}</p>
      </div>`;

    // Description
    if (item.Description) {
      document.getElementById('modalDescription').innerHTML = `
        <div style="margin-top:14px">
          <label style="font-size:0.76rem;text-transform:uppercase;letter-spacing:0.05em;
                        color:var(--text3);font-weight:700;display:block;margin-bottom:6px">
            Description
          </label>
          <p style="font-size:0.9rem;color:var(--text2);line-height:1.65">
            ${escapeHtml(item.Description)}
          </p>
        </div>`;
    }

    // Claim / status section
    const claimEl = document.getElementById('claimSection');
    if (item.Status === 'found' && currentUser && item.ReportedBy !== currentUser.id) {
      claimEl.innerHTML = `
        <div class="claim-form-section">
          <a href="../page2/claim.html?itemId=${item.ItemID}" class="btn btn-primary" style="width:100%;justify-content:center">
            <i class="fa-solid fa-hand-holding-heart"></i> Claim This Item
          </a>
        </div>`;
    } else if (item.Status === 'returned') {
      claimEl.innerHTML = `
        <div style="padding:14px;background:var(--green-dim);border:1px solid rgba(22,92,44,0.18);
                    border-radius:12px;text-align:center;color:var(--green);font-size:0.9rem;margin-top:14px">
          ✅ This item has been successfully returned to its owner.
        </div>`;
    } else if (item.Status === 'claimed') {
      claimEl.innerHTML = `
        <div style="padding:14px;background:var(--gold-glow);border:1px solid rgba(200,150,12,0.2);
                    border-radius:12px;text-align:center;color:var(--amber);font-size:0.9rem;margin-top:14px">
          🔖 A claim for this item is currently under staff review.
        </div>`;
    }

  } catch (err) {
    console.error(err);
    showToast('Failed to load item details.', 'error');
  }
}

function setMainImg(thumb, src) {
  document.querySelectorAll('#modalImages img').forEach(i => i.classList.remove('active'));
  thumb.classList.add('active');
  document.getElementById('modalMainImg').innerHTML =
    `<img src="${src}" alt="Item image" onerror="this.parentElement.innerHTML='📦'">`;
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('active');
  currentItemId = null;
}