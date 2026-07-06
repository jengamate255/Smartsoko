import { collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

let customers = [];
let sellerId = null;

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `fixed top-6 right-6 px-6 py-3 rounded-2xl shadow-xl z-50 text-white text-sm font-medium ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

async function loadCustomers() {
  const auth = window.auth;
  if (!auth?.currentUser) return;

  try {
    const seller = await window.DataService.getSellerByOwner(auth.currentUser.uid);
    if (!seller) { document.getElementById('loadingCustomers').classList.add('hidden'); document.getElementById('noCustomers').classList.remove('hidden'); return; }
    sellerId = seller.id;

    const db = window.db;
    const q = query(collection(db, 'orders'), where('merchantId', '==', sellerId), orderBy('createdAt', 'desc'), limit(500));
    const snap = await getDocs(q);

    const customerMap = {};
    snap.docs.forEach(doc => {
      const o = doc.data();
      const key = o.customerId || o.customerPhone || o.customerEmail || 'unknown-' + Math.random();
      if (!customerMap[key]) {
        customerMap[key] = { id: key, name: o.customerName || o.customerPhone || 'Guest', phone: o.customerPhone || '', email: o.customerEmail || '', address: o.customerAddress || '', orders: [], totalSpend: 0, firstOrder: o.createdAt, lastOrder: o.createdAt };
      }
      customerMap[key].orders.push({ id: doc.id, ...o });
      customerMap[key].totalSpend += o.total || 0;
      if (o.createdAt && o.createdAt > customerMap[key].lastOrder) customerMap[key].lastOrder = o.createdAt;
      if (o.createdAt && o.createdAt < customerMap[key].firstOrder) customerMap[key].firstOrder = o.createdAt;
    });

    customers = Object.values(customerMap).map(c => ({ ...c, orderCount: c.orders.length, avgOrder: c.orderCount > 0 ? Math.round(c.totalSpend / c.orderCount) : 0 }));
    renderCustomers();
  } catch (e) {
    console.error('Error loading customers:', e);
  }
}

function renderCustomers() {
  document.getElementById('loadingCustomers').classList.add('hidden');
  const container = document.getElementById('customersList');
  document.getElementById('customerCount').textContent = customers.length + ' customers';

  if (customers.length === 0) {
    document.getElementById('noCustomers').classList.remove('hidden');
    return;
  }
  document.getElementById('noCustomers').classList.add('hidden');

  const sort = document.getElementById('customerSort').value;
  const search = document.getElementById('customerSearch').value.toLowerCase();

  let filtered = customers;
  if (search) filtered = filtered.filter(c => c.name.toLowerCase().includes(search) || c.phone.includes(search) || c.email.toLowerCase().includes(search));

  filtered.sort((a, b) => {
    if (sort === 'orders') return b.orderCount - a.orderCount;
    if (sort === 'spend') return b.totalSpend - a.totalSpend;
    if (sort === 'recent') return (b.lastOrder?.seconds || 0) - (a.lastOrder?.seconds || 0);
    return a.name.localeCompare(b.name);
  });

  container.innerHTML = filtered.map(c => {
    const initial = (c.name || '?').charAt(0).toUpperCase();
    const lastOrderStr = c.lastOrder ? new Date(c.lastOrder.seconds * 1000).toLocaleDateString() : '—';
    return `<div onclick="openCustomerModal('${c.id}')" class="flex items-center gap-4 p-4 hover:bg-surface-container/50 cursor-pointer transition">
      <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">${initial}</div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-on-surface truncate">${c.name}</p>
        <p class="text-xs text-on-surface-variant">${c.phone}${c.email ? ' · ' + c.email : ''}</p>
      </div>
      <div class="text-right shrink-0">
        <p class="font-bold text-on-surface">${c.orderCount} orders</p>
        <p class="text-xs text-on-surface-variant">TSh ${c.totalSpend.toLocaleString()}</p>
      </div>
      <div class="text-right shrink-0 hidden sm:block">
        <p class="text-xs text-on-surface-variant">Last order</p>
        <p class="text-xs font-medium text-on-surface">${lastOrderStr}</p>
      </div>
      <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
    </div>`;
  }).join('');
}

window.openCustomerModal = function(customerId) {
  const c = customers.find(c => c.id === customerId);
  if (!c) return;

  document.getElementById('modalCustomerName').textContent = c.name;
  document.getElementById('modalCustomerInitial').textContent = (c.name || '?').charAt(0).toUpperCase();
  document.getElementById('modalTotalOrders').textContent = c.orderCount;
  document.getElementById('modalTotalSpend').textContent = 'TSh ' + c.totalSpend.toLocaleString();
  document.getElementById('modalAvgOrder').textContent = 'TSh ' + (c.avgOrder || 0).toLocaleString();
  document.getElementById('modalCustomerSince').textContent = 'First order: ' + (c.firstOrder ? new Date(c.firstOrder.seconds * 1000).toLocaleDateString() : '—');

  const msgBtn = document.getElementById('modalMessageBtn');
  msgBtn.onclick = () => {
    const msg = prompt('Message to ' + c.name + ':');
    if (msg) {
      const db = window.db;
      import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js').then(({ addDoc, collection, serverTimestamp }) => {
        addDoc(collection(db, 'notifications'), { customerId: c.id, merchantId: sellerId, message: msg, read: false, createdAt: serverTimestamp() });
        showToast('Message sent to ' + c.name, 'success');
      });
    }
  };

  const callBtn = document.getElementById('modalCallBtn');
  callBtn.onclick = () => { if (c.phone) window.open('tel:' + c.phone); else showToast('No phone number available', 'error'); };

  const history = document.getElementById('modalOrderHistory');
  history.innerHTML = c.orders.slice(0, 20).map(o => `
    <div class="flex items-center justify-between p-3 bg-surface-container rounded-xl">
      <div><p class="text-sm font-medium text-on-surface">#${(o.id || '').slice(-8)}</p><p class="text-xs text-on-surface-variant">${o.createdAt ? new Date(o.createdAt.seconds * 1000).toLocaleDateString() : '—'}</p></div>
      <div class="text-right"><p class="text-sm font-bold text-on-surface">TSh ${(o.total || 0).toLocaleString()}</p><span class="text-xs px-2 py-0.5 rounded-full ${o.status === 'delivered' ? 'bg-green-100 text-green-700' : o.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}">${o.status || 'pending'}</span></div>
    </div>`).join('');

  document.getElementById('customerModal').classList.remove('hidden');
  document.getElementById('customerModal').classList.add('flex');
};

window.closeCustomerModal = function() {
  document.getElementById('customerModal').classList.add('hidden');
  document.getElementById('customerModal').classList.remove('flex');
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('customerSearch').addEventListener('input', renderCustomers);
  document.getElementById('customerSort').addEventListener('change', renderCustomers);
  document.getElementById('customerModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeCustomerModal(); });

  const auth = window.auth;
  if (auth) onAuthStateChanged(auth, user => { if (user) loadCustomers(); });
});