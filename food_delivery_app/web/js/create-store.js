import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

let currentStep = 1;
const TOTAL_STEPS = 5;
let storeData = {};
let logoFile = null;
let bannerFile = null;
let isCreating = false;

function showStep(step) {
  document.querySelectorAll('.step-panel').forEach(el => el.classList.remove('active'));
  const panel = document.getElementById('step' + step);
  if (panel) panel.classList.add('active', 'fade-in');

  document.querySelectorAll('.step-indicator').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'completed');
    if (s === step) el.classList.add('active');
    else if (s < step) el.classList.add('completed');
  });

  for (let i = 1; i < 5; i++) {
    const fill = document.getElementById('progressFill' + (i > 1 ? i : ''));
    if (fill) fill.style.width = (step > i ? 100 : 0) + '%';
  }

  document.getElementById('stepCounter').textContent = `Step ${step} of ${TOTAL_STEPS}`;

  const backBtn = document.getElementById('btnBack');
  backBtn.classList.toggle('hidden', step === 1);

  const nextBtn = document.getElementById('btnNext');
  const launchBtn = document.getElementById('btnLaunch');
  const loadingBtn = document.getElementById('btnLoading');

  nextBtn.classList.add('hidden');
  launchBtn.classList.add('hidden');
  loadingBtn.classList.add('hidden');

  if (step < TOTAL_STEPS) {
    nextBtn.classList.remove('hidden');
  } else {
    launchBtn.classList.remove('hidden');
  }

  if (step === TOTAL_STEPS) {
    buildSummary();
  }
}

function validateStep(step) {
  const errors = [];
  if (step === 1) {
    const name = document.getElementById('storeName').value.trim();
    const cat = document.getElementById('storeCategory').value;
    if (!name) errors.push('Store name is required');
    if (!cat) errors.push('Category is required');
  }
  if (step === 2) {
    const addr = document.getElementById('storeAddress').value.trim();
    if (!addr) errors.push('Address is required');
  }
  if (errors.length > 0) {
    showToast(errors.join('<br>'), 'error');
    return false;
  }
  return true;
}

function collectStepData(step) {
  if (step === 1) {
    storeData.name = document.getElementById('storeName').value.trim();
    storeData.category = document.getElementById('storeCategory').value;
    storeData.description = document.getElementById('storeDescription').value.trim();
    const tags = document.getElementById('storeTags').value.trim();
    storeData.tags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  } else if (step === 2) {
    storeData.address = document.getElementById('storeAddress').value.trim();
    storeData.phone = document.getElementById('storePhone').value.trim();
    storeData.email = document.getElementById('storeEmail').value.trim();
    storeData.openingHours = {
      open: document.getElementById('storeOpenTime').value,
      close: document.getElementById('storeCloseTime').value
    };
    storeData.placeName = document.getElementById('storePlaceName')?.value.trim() || '';
    storeData.latitude = parseFloat(document.getElementById('storeLat')?.value) || null;
    storeData.longitude = parseFloat(document.getElementById('storeLng')?.value) || null;
  } else if (step === 3) {
    storeData.deliveryFee = parseInt(document.getElementById('deliveryFee').value) || 0;
    storeData.minOrderAmount = parseInt(document.getElementById('minOrderAmount').value) || 0;
    storeData.deliveryTimeMinutes = parseInt(document.getElementById('deliveryTime').value) || 30;
    storeData.deliveryRadius = parseInt(document.getElementById('deliveryRadius')?.value) || 5;
  } else if (step === 4) {
    storeData.logoUrl = '';
    storeData.bannerUrl = '';
    const selected = document.querySelector('.color-swatch.selected');
    storeData.brandColors = {
      primary: selected ? selected.dataset.color : document.getElementById('customColor').value,
      secondary: adjustColor(storeData.brandColors?.primary || '#064e3b', -20)
    };
  }
}

function nextStep() {
  if (isCreating) return;
  collectStepData(currentStep);
  if (!validateStep(currentStep)) return;
  currentStep++;
  showStep(currentStep);
}

function prevStep() {
  if (currentStep <= 1) return;
  currentStep--;
  showStep(currentStep);
}

async function launchStore() {
  if (isCreating) return;
  collectStepData(currentStep);

  const name = document.getElementById('storeName').value.trim();
  if (!name) { showToast('Store name is required', 'error'); return; }

  isCreating = true;
  const nextBtn = document.getElementById('btnNext');
  const launchBtn = document.getElementById('btnLaunch');
  const loadingBtn = document.getElementById('btnLoading');
  nextBtn.classList.add('hidden');
  launchBtn.classList.add('hidden');
  loadingBtn.classList.remove('hidden');

  try {
    let logoUrl = '';
    let bannerUrl = '';

    async function uploadViaServer(file) {
      return new Promise((resolve) => {
        if (!file) return resolve('');
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const resp = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: e.target.result, filename: file.name, folder: 'stores' })
            });
            const data = await resp.json();
            resolve(data.success ? data.url : '');
          } catch { resolve(''); }
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    }

    [logoUrl, bannerUrl] = await Promise.all([
      uploadViaServer(logoFile),
      uploadViaServer(bannerFile)
    ]);

    const seller = await window.DataService.createSeller({
      ...storeData,
      logoUrl,
      bannerUrl
    });

    setTimeout(() => {
      loadingBtn.classList.add('hidden');
      showSuccessModal(seller);
    }, 500);
  } catch (error) {
    console.error('Failed to create store:', error);
    showToast('Failed to create store: ' + error.message, 'error');
    loadingBtn.classList.add('hidden');
    launchBtn.classList.remove('hidden');
    isCreating = false;
  }
}

function buildSummary() {
  const name = storeData.name || 'Store Name';
  document.getElementById('summaryName').textContent = name;
  document.getElementById('summaryLogo').textContent = name.charAt(0).toUpperCase();

  const categories = { food: 'Restaurant & Food', bakery: 'Bakery', dairy: 'Dairy', fruits: 'Fruits & Vegetables', groceries: 'Groceries', other: 'Other' };
  document.getElementById('summaryCategory').textContent = categories[storeData.category] || storeData.category || '—';
  document.getElementById('summaryAddress').textContent = storeData.address || '—';
  document.getElementById('summaryPlaceName').textContent = storeData.placeName || '—';
  document.getElementById('summaryDeliveryRadius').textContent = storeData.deliveryRadius ? storeData.deliveryRadius + ' km' : '—';
  document.getElementById('summaryPhone').textContent = storeData.phone || '—';
  document.getElementById('summaryEmail').textContent = storeData.email || '—';
  document.getElementById('summaryDeliveryFee').textContent = 'TSh ' + (storeData.deliveryFee || 0).toLocaleString();
  document.getElementById('summaryMinOrder').textContent = 'TSh ' + (storeData.minOrderAmount || 0).toLocaleString();
  document.getElementById('summaryDescription').textContent = storeData.description || '—';

  if (logoFile) {
    const img = document.getElementById('summaryLogo');
    const reader = new FileReader();
    reader.onload = e => { img.style.backgroundImage = 'url(' + e.target.result + ')'; img.style.backgroundSize = 'cover'; img.textContent = ''; };
    reader.readAsDataURL(logoFile);
  }
}

function showSuccessModal(seller) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
  overlay.innerHTML = `
    <div class="bg-surface rounded-3xl shadow-2xl max-w-md w-full p-8 text-center fade-in">
      <div class="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
        <span class="material-symbols-outlined text-4xl text-green-600">check_circle</span>
      </div>
      <h2 class="text-2xl font-headline font-bold text-on-surface mb-2">Store Created!</h2>
      <p class="text-on-surface-variant mb-6">Your store <strong>${seller.name}</strong> is now live. Customers can find it and place orders.</p>
      <div class="flex flex-col gap-3">
        <a href="/merchant" class="w-full py-3 rounded-2xl bg-primary text-on-primary font-bold text-center hover:opacity-90 transition">Go to Dashboard</a>
        <a href="/store.html?slug=${seller.slug}" class="w-full py-3 rounded-2xl border border-outline-variant font-semibold text-center hover:bg-surface-container transition">View Store</a>
        <button onclick="this.closest('.fixed').remove()" class="text-sm text-on-surface-variant hover:text-on-surface">Continue editing</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  isCreating = false;
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600', warning: 'bg-orange-600' };
  const t = document.createElement('div');
  t.className = `toast-notification fixed top-6 right-6 ${colors[type]} text-white px-6 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 max-w-sm`;
  t.innerHTML = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function initImageUploads() {
  const setupUpload = (inputId, zoneId, previewId, imageId, removeId, placeholderId, fileRef) => {
    const input = document.getElementById(inputId);
    const zone = document.getElementById(zoneId);
    const preview = document.getElementById(previewId);
    const image = document.getElementById(imageId);
    const remove = document.getElementById(removeId);
    const placeholder = document.getElementById(placeholderId);

    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'error'); return; }
      const reader = new FileReader();
      reader.onload = e => {
        image.src = e.target.result;
        placeholder.classList.add('hidden');
        preview.classList.remove('hidden');
        if (fileRef === 'logo') logoFile = file;
        else bannerFile = file;
      };
      reader.readAsDataURL(file);
    });

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) { input.files = e.dataTransfer.files; input.dispatchEvent(new Event('change')); }
    });

    remove.addEventListener('click', e => {
      e.stopPropagation();
      input.value = '';
      preview.classList.add('hidden');
      placeholder.classList.remove('hidden');
      if (fileRef === 'logo') logoFile = null;
      else bannerFile = null;
    });
  };

  setupUpload('logoInput', 'logoUpload', 'logoPreview', 'logoImage', 'logoRemove', 'logoPlaceholder', 'logo');
  setupUpload('bannerInput', 'bannerUpload', 'bannerPreview', 'bannerImage', 'bannerRemove', 'bannerPlaceholder', 'banner');
}

function initColorPicker() {
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      document.getElementById('customColor').value = swatch.dataset.color;
    });
  });
  document.getElementById('customColor').addEventListener('input', e => {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  });
}

function initSlugPreview() {
  document.getElementById('storeName').addEventListener('input', e => {
    const name = e.target.value.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    document.getElementById('slugPreview').textContent = slug ? '/store.html?slug=' + slug : '/store.html?slug=your-store-name';
  });
}

function initCharCount() {
  document.getElementById('storeDescription').addEventListener('input', e => {
    document.getElementById('descCharCount').textContent = e.target.value.length;
  });
}

function checkAuth() {
  const auth = window.auth;
  if (!auth) {
    window.location.href = '/login';
    return;
  }
  onAuthStateChanged(auth, user => {
    if (!user) { window.location.href = '/login'; }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  showStep(1);
  initImageUploads();
  initColorPicker();
  initSlugPreview();
  initCharCount();

  document.getElementById('btnNext').addEventListener('click', nextStep);
  document.getElementById('btnBack').addEventListener('click', prevStep);
  document.getElementById('btnLaunch').addEventListener('click', launchStore);

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.target.matches('textarea, select')) {
      e.preventDefault();
      const launchBtn = document.getElementById('btnLaunch');
      if (!launchBtn.classList.contains('hidden')) launchStore();
      else nextStep();
    }
  });
});