// SmartSoko Driver App — main application logic
// Uses window.db / window.auth (modular SDK instance exposed by
// config/firebase-config.js) + global SDK helpers declared in driver.html head.
// Rules-enforced claim transaction; earnings/wallet are real (transactions collection).

let state = {
  user: null,
  isOnline: false,
  currentTab: 'available',
  currentScreen: 'home',
  driverDoc: null,
  subs: [],
  sellerCache: {},
  seenStatus: {},
  busy: {}
};

const ACTIVE_STATUSES = ['assigned', 'accepted', 'picked_up', 'pickedup', 'in_transit'];
const DONE_STATUSES = ['delivered', 'completed'];

function fmtCur(amount) {
  return 'TSh ' + (Number(amount) || 0).toLocaleString();
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function showToast(message, type) {
  if (typeof SmartNav !== 'undefined' && SmartNav.showToast) { SmartNav.showToast(message, type || 'info'); return; }
  const el = document.createElement('div');
  const bg = type === 'error' ? '#dc2626' : type === 'warn' ? '#d97706' : '#16a34a';
  el.style.cssText = `position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:9999;background:${bg};color:white;padding:12px 20px;border-radius:14px;font-size:14px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,0.15);max-width:92vw;text-align:center`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function toggleAuthForm(form) {
  document.getElementById('loginForm').classList.toggle('hidden', form === 'signup');
  document.getElementById('signupForm').classList.toggle('hidden', form === 'login');
}

function getUID() {
  return window.auth && window.auth.currentUser ? window.auth.currentUser.uid : null;
}

async function ensureDriverDoc() {
  const uid = getUID();
  if (!uid) return null;
  try {
    const response = await fetch(`/api/driver/${uid}/profile`);
    if (response.ok) {
      const data = await response.json();
      if (!data.ownerId) {
        await fetch(`/api/driver/${uid}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerId: uid })
        });
        data.ownerId = uid;
      }
      state.driverDoc = data;
      return state.driverDoc;
    }
  } catch (e) { /* fall through to create */ }

  // Driver doc doesn't exist — create it
  const userSnap = await fetch(`/api/driver/${uid}/profile`).catch(() => null);
  const u = {};
  const name = (window.auth.currentUser && window.auth.currentUser.displayName) || 'Driver';
  const profile = {
    ownerId: uid,
    name,
    email: (window.auth.currentUser && window.auth.currentUser.email) || '',
    phone: '',
    vehicleType: '',
    vehiclePlate: '',
    isOnline: false,
    status: 'offline',
    available: false,
    currentOrderId: null,
    rating: 0,
    reviewCount: 0,
    totalDeliveries: 0
  };
  await fetch(`/api/driver/${uid}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  state.driverDoc = { id: uid, ...profile };
  return state.driverDoc;
}

async function handleAuth(type, eventParam) {
  const event = eventParam || window.event;
  if (!event || !event.target) return;
  const btn = event.target.closest('button');
  if (!btn) return;
  const originalText = btn.innerHTML;
  let email, password, name;
  if (type === 'signIn') {
    email = document.getElementById('emailInput').value;
    password = document.getElementById('passwordInput').value;
    if (!email || !password) { showToast('Please fill all fields'); return; }
  } else {
    name = document.getElementById('regName').value;
    email = document.getElementById('regEmail').value;
    password = document.getElementById('regPass').value;
    if (!name || !email || !password) { showToast('Please fill all fields'); return; }
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> ' + (type === 'signIn' ? 'Signing in...' : 'Joining...');

  try {
    if (type === 'signIn') {
      await window.signInWithEmailAndPassword(window.auth, email, password);
    } else {
      const cred = await window.createUserWithEmailAndPassword(window.auth, email, password);
      await fetch(`/api/driver/${cred.user.uid}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role: 'driver', status: 'offline' })
      });
    }
    await ensureDriverDoc();
    loadDashboard();
  } catch (error) {
    console.error('Auth error:', error);
    showToast(error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found'
      ? 'Invalid email or password'
      : error.code === 'auth/email-already-in-use' ? 'An account with this email already exists' : 'Authentication failed. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ── Online / Offline ────────────────────────────────────────────
async function handleStatusToggle() {
  const on = document.getElementById('statusToggle').checked;
  state.isOnline = on;
  const uid = getUID();
  if (!uid) return;

  try {
    await fetch(`/api/driver/${uid}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnline: on })
    });
    if (state.driverDoc) state.driverDoc.isOnline = on;
    refreshStatusUI();
    if (on) {
      startLocationSharing();
      showToast('You are now online — available for deliveries');
    } else {
      stopLocationSharing();
      showToast('You are now offline — no new jobs');
    }
    loadAvailableOrders();
  } catch (e) {
    console.error('Status update failed:', e);
    document.getElementById('statusToggle').checked = !on;
    state.isOnline = !on;
    showToast('Failed to update availability', 'error');
  }
}

function refreshStatusUI() {
  const on = state.isOnline;
  const dot = document.getElementById('indicatorDot');
  if (dot) {
    dot.classList.toggle('active', on);
    dot.classList.toggle('offline', !on);
    dot.classList.toggle('bg-green-600', on);
    dot.classList.toggle('bg-gray-400', !on);
  }
  const st = document.getElementById('statusText');
  if (st) st.textContent = on ? 'Active & Online' : 'Offline';
  const badge = document.getElementById('profileStatusBadge');
  if (badge) {
    badge.textContent = on ? 'ONLINE' : 'OFFLINE';
    badge.className = on
      ? 'text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-3 py-1 font-semibold'
      : 'text-xs bg-gray-50 text-gray-500 border border-gray-100 rounded-full px-3 py-1 font-semibold';
  }
}

// ── Live location sharing (real GPS only, no fake movement) ─────
let locWatcher = null;
let lastLocSent = 0;
let lastLocPos = null;
let locWarned = false;

function startLocationSharing() {
  if (locWatcher !== null) return;
  if (!navigator.geolocation) {
    if (!locWarned) { locWarned = true; showToast('Geolocation not supported — live tracking disabled', 'warn'); }
    return;
  }
  if (!locWarned) {
    locWarned = true;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(p => { if (p.state === 'denied') showToast('Location permission denied — customers cannot see you live', 'warn'); })
        .catch(() => {});
    }
  }
  locWatcher = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const now = Date.now();
      const moved = !lastLocPos ||
        Math.abs(latitude - lastLocPos.lat) > 0.0002 ||
        Math.abs(longitude - lastLocPos.lng) > 0.0002;
      if (!moved || now - lastLocSent < 10000) return;
      lastLocSent = now;
      lastLocPos = { lat: latitude, lng: longitude };
      publishLocation(latitude, longitude);
    },
    (err) => {
      if (!locWarned) { locWarned = true; showToast('Location access denied — customers cannot see you live', 'warn'); }
      console.warn('Geolocation error:', err.code, err.message);
    },
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
  );
}

function stopLocationSharing() {
  if (locWatcher !== null) {
    navigator.geolocation.clearWatch(locWatcher);
    locWatcher = null;
  }
}

function publishLocation(latitude, longitude) {
  const uid = getUID();
  if (!uid) return;
  fetch(`/api/driver/${uid}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude,
      longitude,
      currentLatitude: latitude,
      currentLongitude: longitude,
      isOnline: true
    })
  }).catch(err => console.warn('Location publish failed:', err.message));
}

// ── Orders: available / active / history ────────────────────────
function tsOf(t) {
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (t instanceof Date) return t.getTime();
  if (t.seconds) return t.seconds * 1000;
  const d = new Date(t);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

async function loadAvailableOrders() {
  const container = document.getElementById('ordersList');
  if (!container) return;
  try {
    const response = await fetch('/api/driver/available-orders');
    if (!response.ok) throw new Error('Failed to load orders');
    const orders = await response.json();
    const filtered = orders.filter(o => !o.driverId)
      .sort((a, b) => tsOf(b.createdAt) - tsOf(a.createdAt));
    renderAvailableOrders(filtered);
  } catch (e) {
    console.error('Load available orders error:', e);
    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <p class="text-gray-500 text-sm">Could not load orders. Check your connection.</p>
      </div>`;
  }
}

function renderAvailableOrders(orders) {
  const container = document.getElementById('ordersList');
  if (!container) return;
  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span class="material-symbols-outlined text-2xl text-green-700">local_shipping</span>
        </div>
        <p class="text-gray-900 font-medium mb-1">No orders available</p>
        <p class="text-sm text-gray-500">Orders appear here when merchants mark them ready for delivery</p>
      </div>`;
    return;
  }
  container.innerHTML = orders.map(order => `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2 min-w-0">
          <span class="material-symbols-outlined text-green-600 shrink-0">restaurant</span>
          <span class="font-medium text-gray-900 truncate">${escapeHtml(order.sellerName || 'Restaurant')}</span>
        </div>
        <span class="status-badge status-ready shrink-0">Ready for pickup</span>
      </div>
      <div class="flex justify-between items-center mb-2">
        <div class="text-sm font-semibold text-gray-900">${escapeHtml(order.customerName || 'Customer')}</div>
        <div class="text-lg font-bold text-green-700">${fmtCur(order.total)}</div>
      </div>
      <div class="text-sm text-gray-500 mb-1 flex items-center gap-1">
        <span class="material-symbols-outlined text-xs">location_on</span>
        <span class="truncate">${escapeHtml((order.customerAddress || order.deliveryAddress || 'Address unavailable').substring(0, 45))}</span>
      </div>
      <div class="text-sm text-gray-500 mb-3 flex items-center gap-1">
        <span class="material-symbols-outlined text-xs">payments</span>
        Delivery fee: <span class="font-semibold text-gray-700">${fmtCur(order.deliveryFee)}</span>
        <span class="text-gray-300 mx-1">|</span>
        <span class="material-symbols-outlined text-xs">inventory_2</span> ${(order.items || []).length} item(s)
      </div>
      ${state.isOnline
        ? `<button class="w-full gradient-bg text-white py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all" onclick="acceptOrder('${order.id}')">
             <span class="material-symbols-outlined text-sm">add_task</span> Accept Order
           </button>`
        : `<button disabled class="w-full bg-gray-100 text-gray-400 py-2.5 rounded-xl font-semibold text-sm cursor-not-allowed" onclick="showToast('Go online to accept orders', 'warn')">
             <span class="material-symbols-outlined text-sm">power_off</span> Go online to accept
           </button>`}
    </div>
  `).join('');
}

async function acceptOrder(orderId) {
  const uid = getUID();
  if (!uid) return;
  if (!state.isOnline) { showToast('Go online to accept orders', 'warn'); return; }
  if (state.busy[orderId]) return;
  state.busy[orderId] = true;
  const btn = event && event.target && event.target.closest ? event.target.closest('button') : null;
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Claiming...'; }

  try {
    const driverName = (state.driverDoc && (state.driverDoc.name || state.driverDoc.displayName)) || 'Driver';
    
    // Use Express API to avoid Firebase quota limits
    const token = window.auth && window.auth.currentUser ? await window.auth.currentUser.getIdToken() : null;
    const response = await fetch(`/api/driver/orders/${orderId}/accept`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ driverId: uid, driverName })
    });
    
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || result.message || 'Failed to accept order');
    }

    showToast('Order accepted! Navigate to the merchant.');
    state.busy[orderId] = false;
    loadAvailableOrders();
    loadActiveOrders();
    switchScreen('active');
  } catch (error) {
    console.error('Accept order error:', error);
    state.busy[orderId] = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-sm">add_task</span> Accept Order'; }
    if (error.message === 'ORDER_TAKEN' || error.message?.includes('taken')) {
      showToast('This order was just taken by another driver', 'warn');
      loadAvailableOrders();
    } else {
      showToast('Failed to accept order. Try again.', 'error');
    }
  }
}

async function loadActiveOrders() {
  const uid = getUID();
  const container = document.getElementById('activeOrdersList');
  if (!container || !uid) return;
  try {
    const response = await fetch(`/api/driver/${uid}/active-orders`);
    if (!response.ok) throw new Error('Failed to load active orders');
    const orders = await response.json();
    const sorted = orders.sort((a, b) => tsOf(b.updatedAt || b.createdAt) - tsOf(a.updatedAt || a.createdAt));
    renderActiveOrders(sorted);
  } catch (e) {
    console.error('Load active orders error:', e);
  }
}

function renderActiveOrders(orders) {
  const container = document.getElementById('activeOrdersList');
  if (!container) return;
  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span class="material-symbols-outlined text-2xl text-blue-600">receipt_long</span>
        </div>
        <p class="text-gray-900 font-medium mb-1">No active orders</p>
        <p class="text-sm text-gray-500">Accepted orders will appear here</p>
      </div>`;
    return;
  }
  container.innerHTML = orders.map(order => renderActiveCard(order)).join('');
}

function renderActiveCard(order) {
  const status = order.status === 'pickedup' ? 'picked_up' : order.status;
  const stepIdx = ['assigned', 'accepted', 'picked_up', 'in_transit'].indexOf(status);
  const steps = ['Assigned', 'Picked Up', 'In Transit', 'Delivered'];
  const canPickup = status === 'assigned' || status === 'accepted';
  const canTransit = status === 'picked_up';
  const canDeliver = status === 'in_transit' || status === 'picked_up';
  const isBusy = state.busy[order.id];
  const custPhone = order.customerPhone || order.contactPhone || '';

  return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2 min-w-0">
          <span class="material-symbols-outlined text-blue-600 shrink-0">receipt_long</span>
          <span class="font-medium text-gray-900 truncate">Order #${escapeHtml(order.id.slice(-8))}</span>
        </div>
        <span class="status-badge status-${status.replace('_', '-')} shrink-0 capitalize">${status.replace('_', ' ')}</span>
      </div>

      <div class="flex items-center gap-2 mb-3 text-sm">
        <span class="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
        <span class="font-semibold text-gray-900 truncate">${escapeHtml(order.sellerName || 'Merchant')}</span>
        <span class="text-gray-400">→</span>
        <span class="text-gray-700 truncate">${escapeHtml(order.customerName || 'Customer')}</span>
      </div>

      <div class="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div class="bg-gray-50 rounded-lg p-2">
          <div class="text-gray-500 text-xs">Earnings</div>
          <div class="font-bold text-green-700">${fmtCur(order.deliveryFee)}</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-2">
          <div class="text-gray-500 text-xs">Order total</div>
          <div class="font-bold text-gray-900">${fmtCur(order.total)}</div>
        </div>
      </div>

      <div class="text-sm text-gray-500 mb-1 flex items-center gap-1">
        <span class="material-symbols-outlined text-xs">location_on</span>
        <span class="truncate">${escapeHtml((order.customerAddress || order.deliveryAddress || 'No address on file').substring(0, 50))}</span>
      </div>
      ${order.deliveryNotes ? `<div class="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5 mb-2">Note: ${escapeHtml(order.deliveryNotes)}</div>` : ''}

      <!-- Step indicator -->
      <div class="flex items-center gap-1 mb-4">
        ${steps.map((s, i) => `
          <div class="flex-1">
            <div class="h-1.5 rounded-full ${i <= stepIdx ? 'bg-green-600' : 'bg-gray-200'}"></div>
            <div class="text-[10px] mt-1 text-center ${i <= stepIdx ? 'text-green-700 font-semibold' : 'text-gray-400'}">${s}</div>
          </div>`).join('')}
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm text-center hover:bg-blue-700 transition-colors" onclick="navigateToPickup('${order.id}')">
          <span class="material-symbols-outlined text-sm">storefront</span> To Merchant
        </button>
        <button class="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm text-center hover:bg-indigo-700 transition-colors" onclick="navigateToCustomer('${order.id}')">
          <span class="material-symbols-outlined text-sm">navigation</span> To Customer
        </button>
      </div>

      <div class="flex flex-wrap gap-2 mt-2">
        ${canPickup ? `<button class="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors" onclick="markPickedUp('${order.id}')" ${isBusy ? 'disabled' : ''}>
          <span class="material-symbols-outlined text-sm">package_2</span> Mark Picked Up</button>` : ''}
        ${canTransit ? `<button class="flex-1 bg-amber-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-amber-600 transition-colors" onclick="markInTransit('${order.id}')" ${isBusy ? 'disabled' : ''}>
          <span class="material-symbols-outlined text-sm">route</span> In Transit</button>` : ''}
        ${canDeliver ? `<button class="flex-1 bg-green-700 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-800 transition-colors" onclick="confirmDeliver('${order.id}')" ${isBusy ? 'disabled' : ''}>
          <span class="material-symbols-outlined text-sm">check_circle</span> Delivered</button>` : ''}
        ${(canPickup || canTransit || canDeliver) ? `<button class="flex-1 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-100 transition-colors" onclick="reportProblem('${order.id}')">
          <span class="material-symbols-outlined text-sm">report</span> Problem</button>` : ''}
        ${custPhone ? `<a href="tel:${escapeHtml(custPhone)}" class="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold text-sm text-center hover:bg-gray-200 transition-colors">
          <span class="material-symbols-outlined text-sm">call</span> Call</a>` : ''}
      </div>
    </div>`;
}

async function navigateToPickup(orderId) {
  try {
    const response = await fetch(`/api/driver/order/${orderId}/navigation`);
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    if (data.sellerCoords) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${data.sellerCoords.lat},${data.sellerCoords.lng}`, '_blank');
      return;
    }
  } catch (e) { /* fall through */ }
  window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('SmartSoko pickup'), '_blank');
}

async function navigateToCustomer(orderId) {
  try {
    const response = await fetch(`/api/driver/order/${orderId}/navigation`);
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    if (data.customerCoords) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${data.customerCoords.lat},${data.customerCoords.lng}`, '_blank');
      return;
    }
  } catch (e) { /* fall through */ }
  showToast('Customer coordinates unavailable for this order', 'warn');
}

function markPickedUp(orderId) {
  updateOrderFlow(orderId, 'picked_up');
}

function markInTransit(orderId) {
  updateOrderFlow(orderId, 'in_transit');
}

async function updateOrderFlow(orderId, newStatus) {
  const uid = getUID();
  if (!uid || state.busy[orderId]) return;
  state.busy[orderId] = true;
  try {
    const token = window.auth && window.auth.currentUser ? await window.auth.currentUser.getIdToken() : null;
    const response = await fetch(`/api/driver/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || result.message || 'Failed to update status');
    }
    
    showToast(newStatus === 'picked_up' ? 'Picked up — heading to customer' : 'Delivery in transit');
    loadActiveOrders();
  } catch (e) {
    console.error('Order flow update failed:', e);
    showToast('Update failed. Check your connection.', 'error');
  } finally {
    state.busy[orderId] = false;
  }
}

function confirmDeliver(orderId) {
  if (confirm('Complete this delivery and credit your earnings?')) {
    completeDelivery(orderId);
  }
}

async function completeDelivery(orderId) {
  const uid = getUID();
  if (!uid || state.busy[orderId]) return;
  state.busy[orderId] = true;
  try {
    const token = window.auth && window.auth.currentUser ? await window.auth.currentUser.getIdToken() : null;
    const response = await fetch(`/api/driver/orders/${orderId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ driverId: uid })
    });
    
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || result.message || 'Failed to complete delivery');
    }
    
    showToast('Delivery completed! Earnings credited.');
    loadActiveOrders();
    loadEarnings();
  } catch (e) {
    console.error('Complete delivery error:', e);
    showToast(e.message === 'ALREADY_DONE' ? 'This delivery was already completed' : 'Failed to complete delivery', 'error');
  } finally {
    state.busy[orderId] = false;
  }
}

function reportProblem(orderId) {
  showToast('Problem reported to support — we will contact you shortly', 'warn');
}

// ── Earnings (real data) ─────────────────────────────────────────
async function loadEarnings() {
  const uid = getUID();
  if (!uid) return;
  try {
    const response = await fetch(`/api/driver/${uid}/earnings`);
    if (!response.ok) throw new Error('Failed to load earnings');
    const data = await response.json();
    
    const earnings = data.transactions || [];
    const byOrder = {};
    earnings.forEach(t => { byOrder[t.orderId] = t; });

    const today = new Date();
    const todayKey = today.toDateString();
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    let todayAmt = 0, weekAmt = 0, monthAmt = 0, todayCount = 0;

    const addEarning = (amount, ts) => {
      const d = ts instanceof Date ? ts : (ts && ts.toDate ? ts.toDate() : new Date(ts || 0));
      if (isNaN(d.getTime())) return;
      if (d.toDateString() === todayKey) { todayAmt += amount; todayCount++; }
      if (d >= weekStart) weekAmt += amount;
      if (d >= monthStart) monthAmt += amount;
    };

    earnings.forEach(t => addEarning(Number(t.amount) || 0, t.createdAt));

    const el = id => document.getElementById(id);
    if (el('todayEarnings')) el('todayEarnings').textContent = fmtCur(todayAmt);
    if (el('todayDeliveries')) el('todayDeliveries').textContent = String(todayCount);
    if (el('earnToday')) el('earnToday').textContent = fmtCur(todayAmt);
    if (el('earnWeek')) el('earnWeek').textContent = fmtCur(weekAmt);
    if (el('earnMonth')) el('earnMonth').textContent = fmtCur(monthAmt);

    const balance = Number(data.balance) || 0;
    const walletEl = document.getElementById('walletBalance');
    if (walletEl) walletEl.textContent = fmtCur(balance);

    const payoutEl = document.getElementById('payoutList');
    if (payoutEl) {
      payoutEl.innerHTML = '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center"><p class="text-gray-500">No payouts yet — withdrawals require the payout service</p></div>';
    }

    // Load completed orders for history from the API response
    const ordersResponse = await fetch(`/api/driver/${uid}/active-orders`);
    const activeOrders = ordersResponse.ok ? await ordersResponse.json() : [];
    
    const historyEl = document.getElementById('historyList');
    if (historyEl) {
      if (activeOrders.length === 0) {
        historyEl.innerHTML = '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center"><p class="text-gray-500">No delivery history yet</p></div>';
      } else {
        historyEl.innerHTML = activeOrders.map(o => `
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3">
            <p class="font-medium">${escapeHtml(o.sellerName || 'Order')} &mdash; ${escapeHtml(o.customerName || '')}</p>
            <p class="text-sm text-gray-500">${o.status}</p>
          </div>
        `).join('');
      }
    }
  } catch (e) {
    console.error('Earnings load error:', e);
  }
}

function fmtTs(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return isNaN(d.getTime()) ? '' : d.toLocaleString();
}

// ── Realtime (polling fallback) ──────────────────────────────────
let _pollTimer = null;

function subscribeToOrders() {
  if (_pollTimer) clearInterval(_pollTimer);
  
  // Initial load
  loadAvailableOrders();
  loadActiveOrders();
  
  // Poll every 10 seconds instead of real-time listeners
  _pollTimer = setInterval(() => {
    const uid = getUID();
    if (!uid) return;
    loadAvailableOrders();
    loadActiveOrders();
  }, 10000);
}

// ── Navigation / screens ─────────────────────────────────────────
function switchScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(screen + 'Screen');
  if (!target) return;
  target.classList.remove('hidden');
  document.querySelectorAll('[data-screen]').forEach(b => {
    const active = b.dataset.screen === screen;
    b.classList.toggle('active', active);
    b.classList.toggle('bg-green-100', active);
    b.classList.toggle('text-green-700', active);
    b.classList.toggle('bg-gray-100', !active);
    b.classList.toggle('text-gray-500', !active);
  });
  state.currentScreen = screen;
  if (screen === 'home') loadAvailableOrders();
  if (screen === 'active') loadActiveOrders();
  if (screen === 'earnings') loadEarnings();
}

function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('[data-tab]').forEach(b => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('active', active);
    b.classList.toggle('bg-green-700', active);
    b.classList.toggle('text-white', active);
    b.classList.toggle('bg-gray-100', !active);
    b.classList.toggle('text-gray-700', !active);
  });
  if (tab === 'available') loadAvailableOrders();
  if (tab === 'active') loadActiveOrders();
}

async function loadDashboard() {
  const auth = window.auth;
  if (!auth || !auth.currentUser) return;

  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');

  const uid = auth.currentUser.uid;
  const user = auth.currentUser;

  try {
    await ensureDriverDoc();
  } catch (e) {
    console.warn('Driver doc ensure failed:', e.message);
  }

  const d = state.driverDoc || {};
  const name = d.name || user.displayName || 'Driver';
  const initial = (name || 'D')[0].toUpperCase();
  const nameEls = ['driverNameDisplay', 'profileName'].map(id => document.getElementById(id));
  nameEls.forEach(el => { if (el) el.textContent = name; });
  ['driverInitial', 'profileInitial'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = initial; });
  const pe = document.getElementById('profileEmail'); if (pe) pe.textContent = d.email || user.email || '';
  const pp = document.getElementById('profilePhone'); if (pp) pp.textContent = d.phone || 'Not set';
  const pv = document.getElementById('profileVehicle'); if (pv) pv.textContent = [d.vehicleType, d.vehiclePlate].filter(Boolean).join(' · ') || 'Not set';
  const pd = document.getElementById('profileDeliveries'); if (pd) pd.textContent = String(Number(d.totalDeliveries) || 0);
  const pr = document.getElementById('profileRating'); if (pr) pr.textContent = Number(d.rating) ? `Rating ${Number(d.rating).toFixed(1)} (${Number(d.reviewCount) || 0})` : 'Rating --';

  const wasOnline = d.isOnline === true || d.status === 'online' || d.available === true;
  state.isOnline = wasOnline;
  const toggle = document.getElementById('statusToggle');
  if (toggle) toggle.checked = wasOnline;
  refreshStatusUI();
  if (wasOnline) startLocationSharing();

  loadEarnings();
  loadAvailableOrders();
  loadActiveOrders();
  subscribeToOrders();
}

function logout() {
  stopLocationSharing();
  const uid = getUID();
  if (uid) {
    fetch(`/api/driver/${uid}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOnline: false })
    }).catch(() => {});
  }
  if (window.auth) window.signOut(window.auth);
  localStorage.removeItem('smartsoko_user');
  setTimeout(() => { window.location.href = '/login?role=driver'; }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof SmartNav !== 'undefined') {
    try {
      SmartNav.init({ activePage: 'dashboard', role: 'driver', skipTopbar: true });
      if (typeof SmartNav.initPageTransition === 'function') SmartNav.initPageTransition();
    } catch (e) { /* non-critical */ }
  }

  const waitForFirebase = (tries) => {
    if (window.auth && window.db) {
      window.auth.onAuthStateChanged(user => {
        if (user) {
          loadDashboard();
        } else {
          const a = document.getElementById('authScreen'); if (a) a.classList.remove('hidden');
          const m = document.getElementById('mainApp'); if (m) m.classList.add('hidden');
        }
      });
    } else if (tries < 40) {
      setTimeout(() => waitForFirebase(tries + 1), 500);
    } else {
      const a = document.getElementById('authScreen'); if (a) a.classList.remove('hidden');
    }
  };
  waitForFirebase(0);
});