/* ═══════════════════════════════════════════════
   pages/page4/assets/js/script.js
   UNIFIND – Home Page (page4)
   Full safe refactor
   ═══════════════════════════════════════════════ */

let currentUser = null;
let allItems = [];
let currentItemId = null;
let searchTimeout = null;

/* ─── INIT ───────────────────────────────────── */
window.addEventListener('DOMContentLoaded', async () => {
  currentUser = await checkAuth();
  if (!currentUser) return;

  const dashboardLink = document.getElementById('dashboardLink');
  if (dashboardLink && currentUser.roleName === 'staff') {
    dashboardLink.style.display = 'flex';
  }

  await loadItems();
  bindHomeEvents();
});

/* ─── EVENT BINDINGS ─────────────────────────── */
function bindHomeEvents() {
  const searchInput = document.getElementById('searchInput');
  const typeFilter = document.getElementById('typeFilter');
  const statusFilter = document.getElementById('statusFilter');
  const detailModal = document.getElementById('detailModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(loadItems, 350);
    });
  }

  if (typeFilter) typeFilter.addEventListener('change', loadItems);
  if (statusFilter) statusFilter.addEventListener('change', loadItems);

  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) {
        closeModal();
      }
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('show');
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

/* ─── LOAD ITEMS ─────────────────────────────── */
async function loadItems() {
  const search = document.getElementById('searchInput')?.value.trim() || '';
  const type = document.getElementById('typeFilter')?.value || '';
  const status = document.getElementById('statusFilter')?.value || '';

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (type) params.set('type', type);
  if (status) params.set('status', status);

  try {
    const res = await fetch('/api/items?' + params.toString());
    if (!res.ok) throw new Error('Failed to fetch items');

    allItems = await res.json();
    renderItems();
  } catch (err) {
    console.error(err);
    showToast('Failed to load items. Please check the server.', 'error');
  }
}

/* ─── ITEM TYPE ICONS ────────────────────────── */
function getItemTypeIconClass(itemType) {
  const type = String(itemType || '').toLowerCase().trim();

  if (type.includes('phone') || type.includes('mobile') || type.includes('iphone') || type.includes('android')) {
    return 'fa-mobile-screen-button';
  }
  if (type.includes('laptop') || type.includes('computer')) {
    return 'fa-laptop';
  }
  if (type.includes('tablet') || type.includes('ipad')) {
    return 'fa-tablet-screen-button';
  }
  if (type.includes('earphone') || type.includes('headphone') || type.includes('headset')) {
    return 'fa-headphones';
  }
  if (type.includes('charger') || type.includes('cable')) {
    return 'fa-plug';
  }
  if (type.includes('wallet')) {
    return 'fa-wallet';
  }
  if (type.includes('bag') || type.includes('backpack')) {
    return 'fa-bag-shopping';
  }
  if (type.includes('id') || type.includes('card')) {
    return 'fa-id-card';
  }
  if (type.includes('key')) {
    return 'fa-key';
  }
  if (type.includes('watch')) {
    return 'fa-clock';
  }
  if (type.includes('book') || type.includes('notebook')) {
    return 'fa-book';
  }
  if (type.includes('bottle') || type.includes('tumbler')) {
    return 'fa-bottle-water';
  }
  if (type.includes('umbrella')) {
    return 'fa-umbrella';
  }
  if (type.includes('clothes') || type.includes('jacket') || type.includes('uniform') || type.includes('shirt')) {
    return 'fa-shirt';
  }
  if (type.includes('shoe') || type.includes('slipper')) {
    return 'fa-shoe-prints';
  }

  return 'fa-box-open';
}

function getItemTypeIconHTML(itemType) {
  return `<i class="fa-solid ${getItemTypeIconClass(itemType)}"></i>`;
}

/* ─── RENDER ITEMS ───────────────────────────── */
function renderItems() {
  const grid = document.getElementById('itemsGrid');
  const count = document.getElementById('itemCount');

  if (!grid || !count) return;

  count.textContent = allItems.length;

  if (allItems.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon"><i class="fa-solid fa-box-open"></i></div>
        <p>No items match your search. Try adjusting the filters.</p>
        <a href="../page1/report.html" class="btn btn-primary" style="margin-top:12px">
          <i class="fa-solid fa-plus"></i> Report an Item
        </a>
      </div>
    `;
    return;
  }

  grid.innerHTML = allItems.map((item, index) => {
    const delay = Math.min(index, 8) * 0.06;
    const typeIcon = getItemTypeIconHTML(item.ItemType);

    return `
      <div class="item-card" data-item-id="${item.ItemID}"
           style="animation:fadeUp .35s ease both; animation-delay:${delay}s">
        <div class="item-img">
          ${item.ThumbnailPath
            ? `<img src="${encodeURI(item.ThumbnailPath)}"
                    alt="${escapeHtml(item.ItemName)}"
                    loading="lazy"
                    class="item-thumb">`
            : typeIcon}
        </div>

        <div class="item-body">
          <div class="item-name">${escapeHtml(item.ItemName)}</div>

          <div class="item-meta">
            ${item.ItemType ? `<span>${typeIcon} ${escapeHtml(item.ItemType)}</span>` : ''}
            ${item.ItemColor ? `<span><i class="fa-solid fa-palette"></i> ${escapeHtml(item.ItemColor)}</span>` : ''}
            ${item.Location ? `<span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.Location)}</span>` : ''}
            ${item.DateReported ? `<span><i class="fa-solid fa-calendar-days"></i> ${formatDate(item.DateReported)}</span>` : ''}
          </div>
        </div>

        <div class="item-footer">
          <div class="item-reporter">
            by <strong>${escapeHtml(item.FName || 'Unknown')}</strong>
          </div>
          ${getBadgeHTML(item.Status)}
        </div>
      </div>
    `;
  }).join('');

  bindItemCards();
  bindImageFallbacksInGrid();
}

function bindItemCards() {
  document.querySelectorAll('.item-card').forEach((card) => {
    card.addEventListener('click', () => {
      const itemId = Number(card.dataset.itemId);
      if (itemId) openDetail(itemId);
    });
  });
}

function bindImageFallbacksInGrid() {
  document.querySelectorAll('.item-thumb').forEach((img) => {
    img.addEventListener('error', () => {
      const card = img.closest('.item-card');
      const itemId = Number(card?.dataset.itemId);
      const item = allItems.find((x) => x.ItemID === itemId);
      const parent = img.parentElement;

      if (!parent) return;
      parent.innerHTML = getItemTypeIconHTML(item?.ItemType);
    });
  });
}

/* ─── OPEN DETAIL MODAL ─────────────────────── */
async function openDetail(itemId) {
  currentItemId = itemId;

  const modal = document.getElementById('detailModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalDetails = document.getElementById('modalDetails');
  const modalImages = document.getElementById('modalImages');
  const modalBadge = document.getElementById('modalBadge');
  const modalDescription = document.getElementById('modalDescription');
  const claimSection = document.getElementById('claimSection');
  const modalMainImg = document.getElementById('modalMainImg');

  if (!modal) return;

  modal.classList.add('active');
  modalTitle.textContent = 'Loading…';
  modalDetails.innerHTML = '<div class="loading-spinner" style="margin:30px auto"></div>';
  modalImages.innerHTML = '';
  modalBadge.innerHTML = '';
  modalDescription.innerHTML = '';
  claimSection.innerHTML = '';
  modalMainImg.innerHTML = '<i class="fa-solid fa-box-open"></i>';

  try {
    const res = await fetch('/api/items/' + itemId);
    if (!res.ok) throw new Error('Item not found');

    const item = await res.json();
    const typeIcon = getItemTypeIconHTML(item.ItemType);

    modalTitle.textContent = item.ItemName;
    modalBadge.innerHTML = getBadgeHTML(item.Status);

    renderMainImage(item, modalMainImg);
    renderThumbnailStrip(item);
    renderItemDetails(item, modalDetails, modalDescription);
    renderClaimSection(item, claimSection);
  } catch (err) {
    console.error(err);
    showToast('Failed to load item details.', 'error');
  }
}

function renderMainImage(item, modalMainImg) {
  if (item.images && item.images.length > 0) {
    modalMainImg.innerHTML = `
      <img id="modalPrimaryImage"
           src="${encodeURI(item.images[0].ImagePath)}"
           alt="${escapeHtml(item.ItemName)}">
    `;

    const primaryImage = document.getElementById('modalPrimaryImage');
    if (primaryImage) {
      primaryImage.addEventListener('error', () => {
        modalMainImg.innerHTML = getItemTypeIconHTML(item.ItemType);
      });
    }
  } else {
    modalMainImg.innerHTML = getItemTypeIconHTML(item.ItemType);
  }
}

function renderThumbnailStrip(item) {
  const modalImages = document.getElementById('modalImages');
  if (!modalImages) return;

  if (!item.images || item.images.length <= 1) {
    modalImages.innerHTML = '';
    return;
  }

  modalImages.innerHTML = item.images.map((img, index) => `
    <img
      src="${encodeURI(img.ImagePath)}"
      alt="Thumbnail ${index + 1}"
      class="modal-thumb ${index === 0 ? 'active' : ''}"
      data-src="${encodeURI(img.ImagePath)}">
  `).join('');

  document.querySelectorAll('.modal-thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      setMainImg(thumb, thumb.dataset.src, item.ItemType);
    });

    thumb.addEventListener('error', () => {
      thumb.style.display = 'none';
    });
  });
}

function renderItemDetails(item, modalDetails, modalDescription) {
  const typeIcon = getItemTypeIconHTML(item.ItemType);

  modalDetails.innerHTML = `
    <div class="detail-field">
      <label>Item Type</label>
      <p>${item.ItemType ? `${typeIcon} ${escapeHtml(item.ItemType)}` : '—'}</p>
    </div>

    <div class="detail-field">
      <label>Color</label>
      <p>${escapeHtml(item.ItemColor || '—')}</p>
    </div>

    <div class="detail-field">
      <label>Quantity</label>
      <p>${item.ItemQuantity || 1}</p>
    </div>

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
      <p>
        ${escapeHtml(item.FName ? item.FName + ' ' + item.LName : '—')}
        ${item.StudentID ? `<span style="color:var(--text3)">(${escapeHtml(item.StudentID)})</span>` : ''}
      </p>
    </div>
  `;

  if (item.Description) {
    modalDescription.innerHTML = `
      <div style="margin-top:14px">
        <label style="font-size:0.76rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text3);font-weight:700;display:block;margin-bottom:6px">
          Description
        </label>
        <p style="font-size:0.9rem;color:var(--text2);line-height:1.65">
          ${escapeHtml(item.Description)}
        </p>
      </div>
    `;
  } else {
    modalDescription.innerHTML = '';
  }
}

function renderClaimSection(item, claimSection) {
  if (!claimSection) return;

  if (currentUser && currentUser.id === item.ReportedBy) {
    claimSection.innerHTML = `
      <div class="notice-box notice-info">
        <i class="fa-solid fa-circle-info"></i>
        <span>You are the original reporter of this item.</span>
      </div>
    `;
    return;
  }

  if (item.Status === 'found') {
    claimSection.innerHTML = `
      <a href="../page5/my-claims.html?itemId=${item.ItemID}" class="btn btn-primary btn-claim">
        <i class="fa-solid fa-gavel"></i>
        <span>Claim This Item</span>
      </a>
    `;
    return;
  }

  if (item.Status === 'returned') {
    claimSection.innerHTML = `
      <div class="notice-box notice-success">
        <i class="fa-solid fa-circle-check"></i>
        <span>This item has been successfully returned to its owner.</span>
      </div>
    `;
    return;
  }

  if (item.Status === 'claimed') {
    claimSection.innerHTML = `
      <div class="notice-box notice-warning">
        <i class="fa-solid fa-hourglass-half"></i>
        <span>A claim is currently under review for this item.</span>
      </div>
    `;
    return;
  }

  if (item.Status === 'lost') {
    claimSection.innerHTML = `
      <div class="notice-box notice-info">
        <i class="fa-solid fa-circle-info"></i>
        <span>This item is listed as lost and cannot be claimed yet.</span>
      </div>
    `;
    return;
  }

  claimSection.innerHTML = '';
}

/* ─── CHANGE MAIN IMAGE ─────────────────────── */
function setMainImg(thumb, src, itemType) {
  document.querySelectorAll('.modal-thumb').forEach((img) => {
    img.classList.remove('active');
  });

  thumb.classList.add('active');

  const modalMainImg = document.getElementById('modalMainImg');
  if (!modalMainImg) return;

  modalMainImg.innerHTML = `
    <img id="modalPrimaryImage" src="${encodeURI(src)}" alt="Item image">
  `;

  const primaryImage = document.getElementById('modalPrimaryImage');
  if (primaryImage) {
    primaryImage.addEventListener('error', () => {
      modalMainImg.innerHTML = getItemTypeIconHTML(itemType);
    });
  }
}

/* ─── CLOSE MODAL ───────────────────────────── */
function closeModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.remove('active');
  currentItemId = null;
}