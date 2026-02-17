'use strict';

// --- Data Layer (localStorage) ---

function getItems() {
  return JSON.parse(localStorage.getItem('findit_items') || '[]');
}

function saveItems(items) {
  localStorage.setItem('findit_items', JSON.stringify(items));
}

function getClaims() {
  return JSON.parse(localStorage.getItem('findit_claims') || '[]');
}

function saveClaims(claims) {
  localStorage.setItem('findit_claims', JSON.stringify(claims));
}

function generateId() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}


// --- Navigation ---

function initNavigation() {
  // placeholder for mobile hamburger toggle — built in a later step
}


// --- Home Page ---

function initHomePage() {
  const recentGrid = document.getElementById('recent-items-grid');
  const statTotal = document.getElementById('stat-total');
  const statClaimed = document.getElementById('stat-claimed');
  const statAvailable = document.getElementById('stat-available');

  if (!recentGrid) return;

  const items = getItems();

  if (statTotal) statTotal.textContent = items.length;
  if (statClaimed) statClaimed.textContent = items.filter(i => i.status === 'claimed' || i.status === 'returned').length;
  if (statAvailable) statAvailable.textContent = items.filter(i => i.status === 'approved').length;

  const recent = items
    .filter(i => i.status === 'approved')
    .sort((a, b) => new Date(b.dateReported) - new Date(a.dateReported))
    .slice(0, 6);

  if (recent.length === 0) {
    recentGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><p>No items reported yet. <a href="pages/report.html">Be the first!</a></p></div>';
    return;
  }

  recentGrid.innerHTML = '';
  recent.forEach(item => recentGrid.appendChild(createItemCard(item)));
}


// --- Report Form ---

function initReportForm() {
  const form = document.getElementById('reportForm');
  if (!form) return;

  const dateInput = document.getElementById('dateFound');
  if (dateInput) dateInput.max = new Date().toISOString().split('T')[0];

  initPhotoPreview();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;

    const photoFile = document.getElementById('photo').files[0];

    if (photoFile) {
      const reader = new FileReader();
      reader.onload = (event) => saveReport(event.target.result);
      reader.readAsDataURL(photoFile);
    } else {
      saveReport('');
    }
  });

  function saveReport(photoData) {
    const newItem = {
      id: generateId(),
      itemName: document.getElementById('itemName').value.trim(),
      category: document.getElementById('category').value,
      description: document.getElementById('description').value.trim(),
      location: document.getElementById('location').value.trim(),
      dateFound: document.getElementById('dateFound').value,
      photo: photoData,
      finderName: document.getElementById('finderName').value.trim(),
      finderEmail: document.getElementById('finderEmail').value.trim(),
      status: 'pending',
      dateReported: new Date().toISOString(),
      claimant: null
    };

    const items = getItems();
    items.push(newItem);
    saveItems(items);

    form.hidden = true;
    document.getElementById('formSuccess').hidden = false;
    document.getElementById('formSuccess').scrollIntoView({ behavior: 'smooth' });
  }
}

function initPhotoPreview() {
  const photoInput = document.getElementById('photo');
  const preview = document.getElementById('photoPreview');
  const previewImg = document.getElementById('previewImg');
  const removeBtn = document.querySelector('.btn-remove-photo');

  if (!photoInput || !preview) return;

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        previewImg.src = event.target.result;
        preview.hidden = false;
      };
      reader.readAsDataURL(file);
    }
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      photoInput.value = '';
      preview.hidden = true;
      previewImg.src = '';
    });
  }
}


// --- Form Validation ---

function validateForm(form) {
  let isValid = true;

  form.querySelectorAll('.error-message').forEach(el => el.textContent = '');
  form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

  form.querySelectorAll('[required]').forEach(field => {
    const errorEl = document.getElementById(field.id + '-error');

    if (!field.value.trim()) {
      isValid = false;
      field.classList.add('invalid');
      if (errorEl) {
        const label = form.querySelector(`label[for="${field.id}"]`);
        const name = label ? label.textContent.replace('*', '').trim() : 'This field';
        errorEl.textContent = `${name} is required.`;
      }
    } else if (field.type === 'email' && !isValidEmail(field.value)) {
      isValid = false;
      field.classList.add('invalid');
      if (errorEl) errorEl.textContent = 'Please enter a valid email address.';
    }
  });

  const firstInvalid = form.querySelector('.invalid');
  if (firstInvalid) firstInvalid.focus();

  return isValid;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// --- Search Page ---

function initSearchPage() {
  const searchInput = document.getElementById('searchText');
  if (!searchInput) return;

  const categoryFilter = document.getElementById('filterCategory');
  const locationFilter = document.getElementById('filterLocation');
  const sortSelect = document.getElementById('sortBy');
  const clearBtn = document.getElementById('clearFilters');

  populateLocationFilter();

  searchInput.addEventListener('input', renderSearchResults);
  categoryFilter.addEventListener('change', renderSearchResults);
  locationFilter.addEventListener('change', renderSearchResults);
  sortSelect.addEventListener('change', renderSearchResults);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      categoryFilter.value = '';
      locationFilter.value = '';
      sortSelect.value = 'newest';
      renderSearchResults();
    });
  }

  renderSearchResults();
}

function populateLocationFilter() {
  const locationFilter = document.getElementById('filterLocation');
  if (!locationFilter) return;

  const items = getItems();
  const locations = [...new Set(items.map(i => i.location))].sort();

  locationFilter.innerHTML = '<option value="">All Locations</option>';
  locations.forEach(loc => {
    const option = document.createElement('option');
    option.value = loc;
    option.textContent = loc;
    locationFilter.appendChild(option);
  });
}

function renderSearchResults() {
  const searchText = (document.getElementById('searchText')?.value || '').toLowerCase();
  const categoryVal = document.getElementById('filterCategory')?.value || '';
  const locationVal = document.getElementById('filterLocation')?.value || '';
  const sortVal = document.getElementById('sortBy')?.value || 'newest';

  const resultsGrid = document.getElementById('resultsGrid');
  const emptyState = document.getElementById('emptyState');
  const resultsCount = document.getElementById('resultsCount');
  const clearBtn = document.getElementById('clearFilters');

  if (!resultsGrid) return;

  let items = getItems().filter(i => i.status === 'approved');

  if (searchText) {
    items = items.filter(i =>
      i.itemName.toLowerCase().includes(searchText) ||
      i.description.toLowerCase().includes(searchText) ||
      i.location.toLowerCase().includes(searchText)
    );
  }

  if (categoryVal) items = items.filter(i => i.category === categoryVal);
  if (locationVal) items = items.filter(i => i.location === locationVal);

  if (sortVal === 'newest') items.sort((a, b) => new Date(b.dateReported) - new Date(a.dateReported));
  else if (sortVal === 'oldest') items.sort((a, b) => new Date(a.dateReported) - new Date(b.dateReported));
  else if (sortVal === 'name') items.sort((a, b) => a.itemName.localeCompare(b.itemName));

  if (resultsCount) resultsCount.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} found`;
  if (clearBtn) clearBtn.hidden = !(searchText || categoryVal || locationVal);

  resultsGrid.innerHTML = '';

  if (items.length === 0) {
    if (emptyState) emptyState.hidden = false;
    resultsGrid.hidden = true;
  } else {
    if (emptyState) emptyState.hidden = true;
    resultsGrid.hidden = false;
    items.forEach(item => resultsGrid.appendChild(createItemCard(item, true)));
  }
}


// --- Claim Page ---

function initClaimPage() {
  const form = document.getElementById('claimForm');
  if (!form) return;

  const itemSelect = document.getElementById('claimItemId');
  const items = getItems().filter(i => i.status === 'approved');

  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.itemName} — ${item.location} (${formatDate(item.dateFound)})`;
    itemSelect.appendChild(option);
  });

  // Pre-select item from URL param if present
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedId = urlParams.get('id');
  if (preselectedId) {
    itemSelect.value = preselectedId;
    showItemPreview(preselectedId);
  }

  itemSelect.addEventListener('change', () => showItemPreview(itemSelect.value));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;

    const claim = {
      id: generateId(),
      itemId: itemSelect.value,
      claimantName: document.getElementById('claimantName').value.trim(),
      claimantEmail: document.getElementById('claimantEmail').value.trim(),
      claimantId: document.getElementById('claimantId')?.value.trim() || '',
      proofDescription: document.getElementById('proofDescription').value.trim(),
      dateClaimed: new Date().toISOString(),
      status: 'pending'
    };

    const claims = getClaims();
    claims.push(claim);
    saveClaims(claims);

    const allItems = getItems();
    const idx = allItems.findIndex(i => i.id === claim.itemId);
    if (idx !== -1) {
      allItems[idx].status = 'claimed';
      allItems[idx].claimant = { name: claim.claimantName, email: claim.claimantEmail };
      saveItems(allItems);
    }
    window.location.href = 'status.html';

    // form.hidden = true;
    // document.getElementById('claimSuccess').hidden = false;
    // document.getElementById('claimSuccess').scrollIntoView({ behavior: 'smooth' });
  });
}

function showItemPreview(itemId) {
  const previewDiv = document.getElementById('claimItemPreview');
  if (!previewDiv) return;

  if (!itemId) { previewDiv.hidden = true; return; }

  const item = getItems().find(i => i.id === itemId);
  if (!item) { previewDiv.hidden = true; return; }

  previewDiv.hidden = false;
  previewDiv.innerHTML = `
    <div style="display:flex;gap:1rem;align-items:start;flex-wrap:wrap;">
      ${item.photo ? `<img src="${item.photo}" alt="${escapeHtml(item.itemName)}" style="width:120px;height:90px;object-fit:cover;border-radius:8px;">` : ''}
      <div>
        <strong>${escapeHtml(item.itemName)}</strong>
        <p style="font-size:0.875rem;color:#4A4A68;margin:0.25rem 0;">${escapeHtml(item.description)}</p>
        <p style="font-size:0.8rem;color:#7C7C96;">📍 ${escapeHtml(item.location)} · 📅 ${formatDate(item.dateFound)}</p>
      </div>
    </div>
  `;
}

// --- Status Page ---
function initStatusPage() {
  const statusBox = document.getElementById("statusMessage");
  const historyList = document.getElementById("historyList");
  if (!statusBox || !historyList) return;

  const items = getItems();
  const claims = getClaims();

  if (claims.length === 0) {
    statusBox.innerHTML = `
      <div class="status-box">
        <h2>No Claims Found</h2>
        <p class="status-message status-none">
          You have not claimed any items.
        </p>
      </div>
    `;
    historyList.innerHTML = '';
    return;
  }

  // Show latest claimed item at the top
  const latestClaim = claims[claims.length - 1];
  const claimedItem = items.find(i => i.id === latestClaim.itemId);

  statusBox.innerHTML = `
    <div class="status-box">
      <h2>Current Status</h2>
      <p class="status-message status-${claimedItem?.status || 'claimed'}">
        ${claimedItem
          ? `Claimed by ${latestClaim.claimantName}`
          : 'Item claimed'}
      </p>
    </div>
  `;

  // Populate claim history
  historyList.innerHTML = '';
  claims.forEach(claim => {
    const item = items.find(i => i.id === claim.itemId);
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-card-body">
        <h3>${item ? escapeHtml(item.itemName) : 'Unknown Item'}</h3>
        <p class="item-card-desc">${item ? escapeHtml(item.description) : ''}</p>
        <span class="status-badge status-${item?.status || 'claimed'}">
          ${item?.status.toUpperCase() || 'CLAIMED'}
        </span>
      </div>
    `;
    historyList.appendChild(card);
  });
}
// --- Admin Panel ---

function initAdminPanel() {
  const adminTable = document.getElementById('adminItemsBody');
  if (!adminTable) return;

  initAdminTabs();

  const statusFilter = document.getElementById('adminStatusFilter');
  if (statusFilter) statusFilter.addEventListener('change', renderAdminItems);

  const seedBtn = document.getElementById('seedDataBtn');
  if (seedBtn) seedBtn.addEventListener('click', () => {
    loadSeedData();
    renderAdminItems();
    renderAdminClaims();
    updateAdminStats();
  });

  const clearBtn = document.getElementById('clearDataBtn');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (confirm('Delete ALL items and claims? This cannot be undone.')) {
      localStorage.removeItem('findit_items');
      localStorage.removeItem('findit_claims');
      renderAdminItems();
      renderAdminClaims();
      updateAdminStats();
    }
  });

  renderAdminItems();
  renderAdminClaims();
  updateAdminStats();
}

function initAdminTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => { p.classList.remove('active'); p.hidden = true; });

      tab.classList.add('active');
      const panel = document.getElementById(tab.dataset.tab);
      if (panel) { panel.classList.add('active'); panel.hidden = false; }
    });
  });
}

function renderAdminItems() {
  const tbody = document.getElementById('adminItemsBody');
  const emptyState = document.getElementById('adminEmptyState');
  const statusFilter = document.getElementById('adminStatusFilter')?.value || '';

  if (!tbody) return;

  let items = getItems();
  if (statusFilter) items = items.filter(i => i.status === statusFilter);

  items.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.dateReported) - new Date(a.dateReported);
  });

  tbody.innerHTML = '';

  if (items.length === 0) {
    if (emptyState) emptyState.hidden = false;
    return;
  }

  if (emptyState) emptyState.hidden = true;

  items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${escapeHtml(item.itemName)}</strong><br>
        <small style="color:#7C7C96">${escapeHtml(item.description).substring(0, 50)}...</small>
      </td>
      <td><span class="category-badge">${escapeHtml(formatCategory(item.category))}</span></td>
      <td>${escapeHtml(item.location)}</td>
      <td>${formatDate(item.dateFound)}</td>
      <td><span class="status-badge status-${item.status}">${item.status}</span></td>
      <td class="actions-cell">
        ${item.status === 'pending' ? `
          <button class="btn btn-approve btn-sm" onclick="adminAction('${item.id}', 'approved')">Approve</button>
          <button class="btn btn-reject btn-sm" onclick="adminAction('${item.id}', 'rejected')">Reject</button>
        ` : ''}
        ${item.status === 'claimed' ? `
          <button class="btn btn-approve btn-sm" onclick="adminAction('${item.id}', 'returned')">Mark Returned</button>
        ` : ''}
        <button class="btn btn-danger btn-sm" onclick="adminDelete('${item.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function adminAction(itemId, newStatus) {
  const items = getItems();
  const idx = items.findIndex(i => i.id === itemId);
  if (idx !== -1) {
    items[idx].status = newStatus;
    saveItems(items);
    renderAdminItems();
    updateAdminStats();
  }
}

function adminDelete(itemId) {
  if (!confirm('Delete this item permanently?')) return;
  saveItems(getItems().filter(i => i.id !== itemId));
  renderAdminItems();
  updateAdminStats();
}

function renderAdminClaims() {
  const claimsList = document.getElementById('claimsList');
  const emptyState = document.getElementById('claimsEmptyState');
  if (!claimsList) return;

  const claims = getClaims();
  const items = getItems();

  if (claims.length === 0) {
    if (emptyState) emptyState.hidden = false;
    claimsList.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.hidden = true;
  claimsList.innerHTML = '';

  claims.forEach(claim => {
    const item = items.find(i => i.id === claim.itemId);
    const card = document.createElement('div');
    card.className = 'claim-card';
    card.innerHTML = `
      <h3>Claim for: ${item ? escapeHtml(item.itemName) : 'Unknown Item'}</h3>
      <p><strong>Claimant:</strong> ${escapeHtml(claim.claimantName)} (${escapeHtml(claim.claimantEmail)})</p>
      ${claim.claimantId ? `<p><strong>Student ID:</strong> ${escapeHtml(claim.claimantId)}</p>` : ''}
      <p><strong>Proof:</strong> ${escapeHtml(claim.proofDescription)}</p>
      <p><strong>Date:</strong> ${formatDate(claim.dateClaimed)}</p>
      <p><strong>Status:</strong> <span class="status-badge status-${claim.status}">${claim.status}</span></p>
    `;
    claimsList.appendChild(card);
  });
}

function updateAdminStats() {
  const items = getItems();
  const el = (id) => document.getElementById(id);
  if (el('adminTotal')) el('adminTotal').textContent = items.length;
  if (el('adminPending')) el('adminPending').textContent = items.filter(i => i.status === 'pending').length;
  if (el('adminApproved')) el('adminApproved').textContent = items.filter(i => i.status === 'approved').length;
  if (el('adminClaimed')) el('adminClaimed').textContent = items.filter(i => i.status === 'claimed' || i.status === 'returned').length;
}


// --- Seed Data ---

function loadSeedData() {
  const seedItems = [
    {
      id: generateId(), itemName: 'Blue Hydro Flask Water Bottle', category: 'water-bottle',
      description: '32oz blue Hydro Flask with straw lid. Small dent on bottom, two stickers — smiley face and "Save the Turtles."',
      location: 'Cafeteria', dateFound: '2025-03-10', photo: '',
      finderName: 'Marcus Johnson', finderEmail: 'marcus.j@school.edu',
      status: 'approved', dateReported: '2025-03-10T08:30:00', claimant: null
    },
    {
      id: generateId(), itemName: 'Apple AirPods Pro (White Case)', category: 'electronics',
      description: 'White AirPods Pro in charging case. Found under a desk. Small scratch on back of case.',
      location: 'Library', dateFound: '2025-03-11', photo: '',
      finderName: 'Sofia Ramirez', finderEmail: 'sofia.r@school.edu',
      status: 'approved', dateReported: '2025-03-11T14:15:00', claimant: null
    },
    {
      id: generateId(), itemName: 'Red Nike Hoodie — Size L', category: 'clothing',
      description: 'Red Nike hoodie, size Large. Swoosh on chest, small stain on left sleeve.',
      location: 'Gymnasium', dateFound: '2025-03-12', photo: '',
      finderName: 'Jake Thompson', finderEmail: 'jake.t@school.edu',
      status: 'approved', dateReported: '2025-03-12T16:45:00', claimant: null
    },
    {
      id: generateId(), itemName: 'TI-84 Plus CE Calculator', category: 'school-supplies',
      description: 'Black TI-84 Plus CE. "ROOM 214" written in silver Sharpie on back.',
      location: 'Science Lab', dateFound: '2025-03-12', photo: '',
      finderName: 'Emily Chen', finderEmail: 'emily.c@school.edu',
      status: 'pending', dateReported: '2025-03-12T11:00:00', claimant: null
    },
    {
      id: generateId(), itemName: 'Set of 3 Keys on a Lanyard', category: 'keys',
      description: 'Three silver keys on a blue school lanyard. One house key, one padlock key, one with rubber cover.',
      location: 'Hallway — Building A', dateFound: '2025-03-13', photo: '',
      finderName: 'David Park', finderEmail: 'david.p@school.edu',
      status: 'approved', dateReported: '2025-03-13T09:20:00', claimant: null
    },
    {
      id: generateId(), itemName: 'Ray-Ban Sunglasses (Black)', category: 'accessories',
      description: 'Black Ray-Ban Wayfarer sunglasses. Found on bench outside. No scratches on lenses.',
      location: 'Football Field', dateFound: '2025-03-14', photo: '',
      finderName: 'Aisha Williams', finderEmail: 'aisha.w@school.edu',
      status: 'approved', dateReported: '2025-03-14T15:30:00', claimant: null
    },
    {
      id: generateId(), itemName: 'Student ID Card — Jordan Lee', category: 'id-card',
      description: 'School ID for Jordan Lee, Grade 11. Good condition.',
      location: 'Bus Loop', dateFound: '2025-03-14', photo: '',
      finderName: 'Taylor Brown', finderEmail: 'taylor.b@school.edu',
      status: 'approved', dateReported: '2025-03-14T07:50:00', claimant: null
    },
    {
      id: generateId(), itemName: 'Purple Jansport Backpack', category: 'other',
      description: 'Purple Jansport with keychain on zipper. Contains binder, pens, and lunch container. No name on it.',
      location: 'Auditorium', dateFound: '2025-03-09', photo: '',
      finderName: 'Chris Martinez', finderEmail: 'chris.m@school.edu',
      status: 'claimed', dateReported: '2025-03-09T13:00:00',
      claimant: { name: 'Riley Kim', email: 'riley.k@school.edu' }
    }
  ];

  const existing = getItems();
  if (existing.length > 3 && !confirm('You already have items. Add demo data anyway?')) return;

  saveItems([...existing, ...seedItems]);

  const claims = getClaims();
  const claimedItem = seedItems[seedItems.length - 1];
  claims.push({
    id: generateId(), itemId: claimedItem.id,
    claimantName: 'Riley Kim', claimantEmail: 'riley.k@school.edu', claimantId: '11234',
    proofDescription: 'It\'s my purple Jansport. Had it during assembly on Friday. Lunch container inside has my name on the lid, blue binder with chemistry notes.',
    dateClaimed: '2025-03-10T10:00:00', status: 'pending'
  });
  saveClaims(claims);

  alert('Demo data loaded! 8 sample items and 1 sample claim added.');
}


// --- Utility Functions ---

function createItemCard(item, showClaim = false) {
  const card = document.createElement('div');
  card.className = 'item-card';
  card.innerHTML = `
    ${item.photo
      ? `<img class="item-card-img" src="${item.photo}" alt="Photo of ${escapeHtml(item.itemName)}">`
      : `<div class="item-card-img" style="display:flex;align-items:center;justify-content:center;font-size:2rem;color:#7C7C96;">📦</div>`
    }
    <div class="item-card-body">
      <h3>${escapeHtml(item.itemName)}</h3>
      <div class="item-card-meta">
        <span>📍 ${escapeHtml(item.location)}</span>
        <span>📅 ${formatDate(item.dateFound)}</span>
      </div>
      <span class="category-badge">${formatCategory(item.category)}</span>
      <p class="item-card-desc">${escapeHtml(item.description)}</p>
    </div>
    <div class="item-card-footer">
      <span class="status-badge status-${item.status}">${item.status}</span>
      ${showClaim && item.status === 'approved'
        ? `<a href="claim.html?id=${item.id}" class="btn btn-primary btn-sm">Claim This</a>`
        : ''}
    </div>
  `;
  return card;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCategory(category) {
  const map = {
    'electronics': 'Electronics', 'clothing': 'Clothing', 'accessories': 'Accessories',
    'water-bottle': 'Water Bottle', 'school-supplies': 'School Supplies', 'sports': 'Sports Equipment',
    'keys': 'Keys', 'id-card': 'ID Card', 'other': 'Other'
  };
  return map[category] || category;
}


// --- Init ---

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initHomePage();
  initReportForm();
  initSearchPage();
  initClaimPage();
  initAdminPanel();
  initStatusPage();
});

// document.addEventListener("DOMContentLoaded", () => {
//   const statusBox = document.getElementById("statusMessage");
//   const historyList = document.getElementById("historyList");

//   if (!statusBox || !historyList) return;

//   const claims = JSON.parse(localStorage.getItem("claims")) || [];

//   if (claims.length === 0) {
//     statusBox.innerHTML = `
//       <div class="status-box">
//         <h2>No Claims Found</h2>
//         <p class="status-message status-none">
//           You have not claimed any items.
//         </p>
//       </div>
//     `;
//     return;
//   }

//   const latest = claims[claims.length - 1];

//   const statusText = {
//     requested: "Requested — we have received your request.",
//     found: "Found — please come collect your item!",
//     returned: "Returned — this item has already been picked up."
//   };

//   statusBox.innerHTML = `
//     <div class="status-box">
//       <h2>Current Status</h2>
//       <p class="status-message status-${latest.status}">
//         ${statusText[latest.status]}
//       </p>
//     </div>
//   `;

//   claims.forEach(item => {
//     const card = document.createElement("div");
//     card.className = "item-card";

//     card.innerHTML = `
//       <div class="item-card-body">
//         <h3>${item.itemName}</h3>
//         <p class="item-card-desc">${item.description}</p>
//         <span class="status-badge status-${item.status}">
//           ${item.status.toUpperCase()}
//         </span>
//       </div>
//     `;

//     historyList.appendChild(card);
//   });
// });