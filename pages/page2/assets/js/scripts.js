window.addEventListener('DOMContentLoaded', async () => {
  await checkAuth(); // Assuming checkAuth is in a global/shared script.

  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('itemId');

  if (!itemId) {
    showToast('No item selected for claim.', 'error');
    document.getElementById('itemDetails').innerHTML = '<p class="error-text">No item ID provided. Please go back to the home page and select an item to claim.</p>';
    document.querySelector('.claim-form-card').style.display = 'none';
    return;
  }

  await loadItemDetails(itemId);

  const claimForm = document.getElementById('claimForm');
  claimForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitClaim(itemId);
  });
});

async function loadItemDetails(itemId) {
  const itemDetailsDiv = document.getElementById('itemDetails');
  try {
    const res = await fetch(`/api/items/${itemId}`);
    if (!res.ok) {
      const error = await res.json();
      showToast(error.error || 'Could not load item details.', 'error');
      itemDetailsDiv.innerHTML = `<p class="error-text">Could not load item details. ${error.error || ''}</p>`;
      document.querySelector('.claim-form-card').style.display = 'none';
      return;
    }
    const item = await res.json();

    if (item.Status !== 'found') {
        let statusMessage = 'This item is not available for claims.';
        if (item.Status === 'claimed') {
            statusMessage = 'A claim for this item is already pending review.';
        } else if (item.Status === 'returned') {
            statusMessage = 'This item has already been returned to its owner.';
        } else if (item.Status === 'lost') {
            statusMessage = 'This is a "lost" report, not a "found" item, and cannot be claimed.';
        }
        itemDetailsDiv.innerHTML = `<div class="empty-state"><div class="empty-icon">🚫</div><p>${statusMessage}</p><a href="../page4/home.html" class="btn btn-primary" style="margin-top:8px;">Back to Items</a></div>`;
        document.querySelector('.claim-form-card').style.display = 'none';
        return;
    }

    itemDetailsDiv.innerHTML = `
      <div class="item-card-mini">
        <div class="item-thumb-mini">
          ${item.images && item.images.length > 0 ? `<img src="${item.images[0].ImagePath}" alt="${escapeHtml(item.ItemName)}">` : '📦'}
        </div>
        <div class="item-info-mini">
          <h4>${escapeHtml(item.ItemName)}</h4>
          <p>${escapeHtml(item.ItemColor) || 'No color specified'}</p>
          <p>Found at: ${escapeHtml(item.Location) || 'N/A'}</p>
          <p>Date Found: ${formatDate(item.DateReported) || 'N/A'}</p>
        </div>
      </div>
    `;
  } catch (err) {
    showToast('Error loading item details.', 'error');
    itemDetailsDiv.innerHTML = '<p class="error-text">Error loading item details.</p>';
    document.querySelector('.claim-form-card').style.display = 'none';
  }
}

async function submitClaim(itemId) {
  const proofDescription = document.getElementById('proofDescription').value;
  const proofImage = document.getElementById('proofImage').files[0];
  const submitBtn = document.querySelector('#claimForm button[type="submit"]');

  if (!proofDescription.trim()) {
    showToast('Please describe why you believe this is your item.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('itemId', itemId);
  formData.append('proofDescription', proofDescription);
  if (proofImage) {
    formData.append('proofImage', proofImage);
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

  try {
    const res = await fetch('/api/claims', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Failed to submit claim.', 'error');
      return;
    }

    showToast('Claim submitted successfully! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = '../page5/my-claims.html';
    }, 1500);

  } catch (err) {
    showToast('Connection error. Could not submit claim.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Claim';
  }
}
