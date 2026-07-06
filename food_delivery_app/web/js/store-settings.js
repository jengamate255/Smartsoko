import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

let currentSeller = null;
let sellerId = null;
let holidays = [];

function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600', warning: 'bg-orange-600' };
  const t = document.createElement('div');
  t.className = `toast-notification fixed top-6 right-6 ${colors[type]} text-white px-6 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 max-w-sm`;
  t.innerHTML = `<span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span> ${message}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function populateHours(hours) {
  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  DAYS.forEach(day => {
    const row = document.querySelector(`[data-day="${day}"]`);
    if (!row) return;
    const dayData = hours?.[day] || null;
    const toggle = row.querySelector('.day-toggle');
    const openInput = row.querySelector('.day-open');
    const closeInput = row.querySelector('.day-close');
    if (dayData && dayData.isOpen !== false) {
      toggle.checked = false;
      openInput.value = dayData.open || '08:00';
      closeInput.value = dayData.close || '20:00';
      openInput.disabled = false;
      closeInput.disabled = false;
    } else {
      toggle.checked = true;
      openInput.disabled = true;
      closeInput.disabled = true;
    }
  });

  holidays = hours?.holidays || [];
  renderHolidays();

  document.querySelectorAll('.day-toggle').forEach(cb => {
    cb.addEventListener('change', function() {
      const row = this.closest('[data-day]');
      row.querySelector('.day-open').disabled = this.checked;
      row.querySelector('.day-close').disabled = this.checked;
    });
  });
}

function collectHours() {
  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const hours = {};
  DAYS.forEach(day => {
    const row = document.querySelector(`[data-day="${day}"]`);
    if (!row) return;
    const isClosed = row.querySelector('.day-toggle').checked;
    hours[day] = isClosed ? { isOpen: false } : {
      open: row.querySelector('.day-open').value,
      close: row.querySelector('.day-close').value,
      isOpen: true
    };
  });
  hours.holidays = holidays;
  return hours;
}

function renderHolidays() {
  const container = document.getElementById('holidaysContainer');
  if (!container) return;
  if (holidays.length === 0) {
    container.innerHTML = '<p class="text-xs text-on-surface-variant">No holiday closures set</p>';
    return;
  }
  container.innerHTML = holidays.map((h, i) => `
    <span class="inline-flex items-center gap-1 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
      ${h.date}${h.reason ? ': ' + h.reason : ''}
      <button onclick="removeHoliday(${i})" class="text-red-500 hover:text-red-700"><span class="material-symbols-outlined text-sm">close</span></button>
    </span>
  `).join('');
}

window.addHoliday = function() {
  const dateInput = document.getElementById('newHolidayDate');
  const reasonInput = document.getElementById('newHolidayReason');
  if (!dateInput.value) { showToast('Please select a date', 'error'); return; }
  holidays.push({ date: dateInput.value, reason: reasonInput.value.trim() });
  dateInput.value = '';
  reasonInput.value = '';
  renderHolidays();
};

window.removeHoliday = function(index) {
  holidays.splice(index, 1);
  renderHolidays();
};

function populateForm(seller) {
  document.getElementById('editStoreName').value = seller.name || '';
  document.getElementById('editStoreSlug').value = seller.slug || '';
  document.getElementById('editStoreCategory').value = seller.category || 'food';
  document.getElementById('editStoreDescription').value = seller.description || '';
  document.getElementById('editAddress').value = seller.address || '';
  document.getElementById('editPlaceName').value = seller.placeName || '';
  if (seller.location) {
    document.getElementById('editLat').value = seller.location.latitude || '';
    document.getElementById('editLng').value = seller.location.longitude || '';
  }
  document.getElementById('editDeliveryRadius').value = seller.deliveryRadius || 5;
  document.getElementById('editDeliveryAreas').value = (seller.deliveryAreas || []).join(', ');
  document.getElementById('editPhone').value = seller.phone || '';
  document.getElementById('editEmail').value = seller.email || '';
  document.getElementById('editDeliveryFee').value = seller.deliveryFee || 0;
  document.getElementById('editMinOrder').value = seller.minOrderAmount || 0;
  document.getElementById('editDeliveryTime').value = seller.deliveryTimeMinutes || 30;
  document.getElementById('editIsOpen').checked = seller.isOpen !== false;
  document.getElementById('editLogoUrl').value = seller.logoUrl || '';
  document.getElementById('editBannerUrl').value = seller.bannerUrl || '';
  document.getElementById('editPrimaryColor').value = seller.brandColors?.primary || '#064e3b';
  document.getElementById('editSecondaryColor').value = seller.brandColors?.secondary || '#065f46';
  document.getElementById('editSeoDescription').value = seller.seoDescription || '';

  populateHours(seller.openingHours);

  const statusBadge = document.getElementById('storeStatusBadge');
  if (statusBadge) {
    const isOpen = seller.isOpen !== false;
    statusBadge.textContent = isOpen ? 'Open' : 'Closed';
    statusBadge.className = `px-3 py-1 rounded-full text-xs font-bold ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
  }

  const slug = seller.slug || sellerId;
  const previewBtn = document.getElementById('previewStoreBtn');
  if (previewBtn) previewBtn.href = `/store.html?slug=${slug}`;
}

async function loadSettings() {
  const auth = window.auth;
  if (!auth) { window.location.href = '/login'; return; }

  onAuthStateChanged(auth, async user => {
    if (!user) { window.location.href = '/login'; return; }
    try {
      const seller = await window.DataService.getSellerByOwner(user.uid);
      if (!seller) {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('settingsContent').classList.remove('hidden');
        document.getElementById('noStoreBanner').classList.remove('hidden');
        return;
      }
      currentSeller = seller;
      sellerId = seller.id;
      populateForm(seller);
      document.getElementById('loadingState').classList.add('hidden');
      document.getElementById('settingsContent').classList.remove('hidden');
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast('Failed to load store settings', 'error');
    }
  });
}

window.saveBasicInfo = async function() {
  if (!sellerId) return;
  try {
    const updates = {
      name: document.getElementById('editStoreName').value.trim(),
      slug: document.getElementById('editStoreSlug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
      category: document.getElementById('editStoreCategory').value,
      description: document.getElementById('editStoreDescription').value.trim()
    };
    if (!updates.name) { showToast('Store name is required', 'error'); return; }
    await window.DataService.updateSeller(sellerId, updates);
    showToast('Basic info saved!', 'success');
    currentSeller = { ...currentSeller, ...updates };
  } catch (error) {
    showToast('Failed to save: ' + error.message, 'error');
  }
};

window.saveContact = async function() {
  if (!sellerId) return;
  try {
    const lat = parseFloat(document.getElementById('editLat').value);
    const lng = parseFloat(document.getElementById('editLng').value);
    const updates = {
      address: document.getElementById('editAddress').value.trim(),
      placeName: document.getElementById('editPlaceName').value.trim(),
      deliveryRadius: parseInt(document.getElementById('editDeliveryRadius').value) || 5,
      deliveryAreas: document.getElementById('editDeliveryAreas').value.split(',').map(s => s.trim()).filter(Boolean),
      phone: document.getElementById('editPhone').value.trim(),
      email: document.getElementById('editEmail').value.trim()
    };
    if (!isNaN(lat) && !isNaN(lng)) {
      updates.location = new firebase.firestore.GeoPoint(lat, lng);
    }
    await window.DataService.updateSeller(sellerId, updates);
    showToast('Contact info saved!', 'success');
    currentSeller = { ...currentSeller, ...updates };
  } catch (error) {
    showToast('Failed to save: ' + error.message, 'error');
  }
};

window.saveHours = async function() {
  if (!sellerId) return;
  try {
    const updates = { openingHours: collectHours() };
    await window.DataService.updateSeller(sellerId, updates);
    showToast('Store hours saved!', 'success');
    currentSeller = { ...currentSeller, ...updates };
  } catch (error) {
    showToast('Failed to save: ' + error.message, 'error');
  }
};

window.saveDelivery = async function() {
  if (!sellerId) return;
  try {
    const updates = {
      deliveryFee: parseInt(document.getElementById('editDeliveryFee').value) || 0,
      minOrderAmount: parseInt(document.getElementById('editMinOrder').value) || 0,
      deliveryTimeMinutes: parseInt(document.getElementById('editDeliveryTime').value) || 30,
      isOpen: document.getElementById('editIsOpen').checked
    };
    await window.DataService.updateSeller(sellerId, updates);
    showToast('Delivery settings saved!', 'success');
    currentSeller = { ...currentSeller, ...updates };
    const statusBadge = document.getElementById('storeStatusBadge');
    if (statusBadge) {
      statusBadge.textContent = updates.isOpen ? 'Open' : 'Closed';
      statusBadge.className = `px-3 py-1 rounded-full text-xs font-bold ${updates.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
    }
  } catch (error) {
    showToast('Failed to save: ' + error.message, 'error');
  }
};

window.saveBranding = async function() {
  if (!sellerId) return;
  try {
    const updates = {
      logoUrl: document.getElementById('editLogoUrl').value.trim(),
      bannerUrl: document.getElementById('editBannerUrl').value.trim(),
      brandColors: {
        primary: document.getElementById('editPrimaryColor').value,
        secondary: document.getElementById('editSecondaryColor').value
      }
    };
    await window.DataService.updateSeller(sellerId, updates);
    showToast('Branding saved!', 'success');
    currentSeller = { ...currentSeller, ...updates };
  } catch (error) {
    showToast('Failed to save: ' + error.message, 'error');
  }
};

window.saveSeo = async function() {
  if (!sellerId) return;
  try {
    const updates = { seoDescription: document.getElementById('editSeoDescription').value.trim() };
    await window.DataService.updateSeller(sellerId, updates);
    showToast('SEO description saved!', 'success');
    currentSeller = { ...currentSeller, ...updates };
  } catch (error) {
    showToast('Failed to save: ' + error.message, 'error');
  }
};

window.deleteStore = async function() {
  if (!sellerId) return;
  if (!confirm('Permanently delete your store? This cannot be undone.')) return;
  if (!confirm('Really delete? All products and data will be lost.')) return;
  try {
    await window.DataService.deleteSeller(sellerId);
    showToast('Store deleted', 'success');
    setTimeout(() => { window.location.href = '/merchant'; }, 1500);
  } catch (error) {
    showToast('Failed to delete store: ' + error.message, 'error');
  }
};

document.addEventListener('DOMContentLoaded', loadSettings);