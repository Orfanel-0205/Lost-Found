let allClaims = [];
let activeFilter = 'all';

window.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadMyClaims();
});

async function loadMyClaims() {
  try {
    const res = await fetch('/api/my-claims');
    if (!res.ok) { showToast('Failed to load claims', 'error'); return; }
    allClaims = await res.json();
    renderClaims();
  } catch { showToast('Connection error', 'error'); }
}

function filterClaims(filter) {
  activeFilter = filter;
  document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  renderClaims();
}

function renderClaims() {
  const list = document.getElementById('claimsList');
  const filtered = activeFilter === 'all' ? allClaims : allClaims.filter(c => c.ClaimStatus === activeFilter);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>${activeFilter === 'all' ? "You haven't submitted any claims yet." : `No ${activeFilter} claims.`}</p><a href="/home.html" class="btn btn-primary" style="margin-top:8px;">Browse Items</a></div>`;
    return;
  }

  list.innerHTML = filtered.map((claim, i) => `
    <div class="claim-card" style="animation-delay:${i*0.06}s">
      <div class="claim-thumb">
        ${claim.ThumbnailPath ? `<img src="${claim.ThumbnailPath}" alt="${claim.ItemName}">` : '📦'}
      </div>
      <div class="claim-info">
        <h4>${escapeHtml(claim.ItemName)}</h4>
        <div class="claim-meta">
          ${claim.ItemColor ? `<span>🎨 ${escapeHtml(claim.ItemColor)}</span>` : ''}
          <span>📅 Claimed on ${formatDate(claim.ClaimDate)}</span>
          ${claim.ProofDescription ? `<span style="margin-top:4px; color:var(--text2);">Proof: "${escapeHtml(claim.ProofDescription.substring(0, 80))}${claim.ProofDescription.length > 80 ? '...' : ''}"</span>` : ''}
        </div>
      </div>
      <div class="claim-status-col">
        ${getBadgeHTML(claim.ClaimStatus)}
        <span style="font-size:0.78rem;color:var(--text3);">${getBadgeHTML(claim.ItemStatus)}</span>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
