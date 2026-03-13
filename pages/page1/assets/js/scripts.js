let currentType = 'found';
const uploadedFiles = [];

function selectType(type) {
  currentType = type;

  const foundCard  = document.getElementById('reportFound');
  const lostCard   = document.getElementById('reportLost');
  const foundSub   = document.getElementById('foundSubtype');
  const lostSub    = document.getElementById('lostSubtype');
  const locTag     = document.getElementById('locationTag');
  const dateTag    = document.getElementById('dateTag');
  const secLabel   = document.getElementById('locationSectionLabel');
  const locInput   = document.getElementById('itemLocation');

  if (type === 'found') {
    foundCard.classList.add('active');
    lostCard.classList.remove('active');
    foundSub.classList.add('visible');
    lostSub.classList.remove('visible');
    lostSub.querySelectorAll('.subtype-chip').forEach(c => c.classList.remove('selected'));

    locTag.textContent  = 'Found';
    locTag.className    = 'field-tag';
    dateTag.textContent = 'Found';
    dateTag.className   = 'field-tag';
    secLabel.textContent = 'Where & When Found';
    locInput.placeholder = 'e.g. Room 1103, Near Canteen, 2nd Floor';
  } else {
    lostCard.classList.add('active');
    foundCard.classList.remove('active');
    lostSub.classList.add('visible');
    foundSub.classList.remove('visible');
    foundSub.querySelectorAll('.subtype-chip').forEach(c => c.classList.remove('selected'));

    locTag.textContent  = 'Last Seen';
    locTag.className    = 'field-tag lost-tag';
    dateTag.textContent = 'Lost';
    dateTag.className   = 'field-tag lost-tag';
    secLabel.textContent = 'Where & When Lost';
    locInput.placeholder = 'e.g. Library 3F, Hallway near Room 205';
  }
  document.getElementById('itemType').value = '';
}

function toggleChip(el) {
  const panel = el.closest('.subtype-panel');
  panel.querySelectorAll('.subtype-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('itemType').value = el.textContent.trim();
}

function handleFiles(files) {
  const preview = document.getElementById('previewImages');
  const remaining = 5 - uploadedFiles.length;
  const arr = Array.from(files).slice(0, remaining);

  arr.forEach(file => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = e => {
      uploadedFiles.push(file);

      const div = document.createElement('div');
      div.className = 'preview-item';
      div.innerHTML = `
        <img src="${e.target.result}" alt="preview">
        <button class="preview-remove" onclick="removePreview(this, '${file.name}')">
          <i class="fa-solid fa-xmark"></i>
        </button>`;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

function removePreview(btn, name) {
  btn.closest('.preview-item').remove();
  const idx = uploadedFiles.findIndex(f => f.name === name);
  if (idx > -1) uploadedFiles.splice(idx, 1);
}

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.add('dragover');
}

function handleDragLeave() {
  document.getElementById('dropZone').classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
}

async function submitReport() {
  const name = document.getElementById('itemName').value.trim();
  if (!name) { showToast('Please enter the item name.', 'error'); return; }

  const formData = new FormData();
  formData.append('itemName', name);
  formData.append('reportType', currentType);
  formData.append('itemColor', document.getElementById('itemColor').value.trim());
  formData.append('itemQuantity', document.getElementById('itemQuantity').value || 1);
  formData.append('itemType', document.getElementById('itemType').value);
  formData.append('location', document.getElementById('itemLocation').value.trim());
  formData.append('dateReported', document.getElementById('itemDate').value);
  formData.append('description', document.getElementById('itemDescription').value.trim());

  uploadedFiles.forEach(file => formData.append('images', file));

  const btn = document.getElementById('submitBtn');
  const btnText = document.getElementById('submitBtnText');
  btn.disabled = true;
  btnText.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/items', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Submission failed', 'error'); return; }
    document.getElementById('reportForm').style.display = 'none';
    document.getElementById('successState').classList.add('visible');
  } catch {
    showToast('Connection error. Make sure server is running.', 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Submit Report';
  }
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' error' : '');
  toast.innerHTML = `<strong>${type === 'error' ? '⚠️' : '✅'}</strong> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}