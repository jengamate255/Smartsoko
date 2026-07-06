/**
 * SmartSoko POS (Point of Sale) System
 * In-store sales with receipt printing, inventory sync
 */
window.POS = (() => {
  const _ready = new Promise(res => { if (document.readyState !== 'loading') res(); else document.addEventListener('DOMContentLoaded', res); });
  let _me = null, _merchantId = null, _products = [], _cart = [];
  let _listeners = [];

  const state = {
    saleMode: false,
    customerName: '',
    paymentMethod: 'cash',
    subtotal: 0, tax: 0, discount: 0, total: 0,
  };

  function get$ (id) { return document.getElementById(id); }

  // ── Init ──────────────────────────────────────────────────────
  async function init() {
    await _ready;
    await new Promise(r => { if (window.db) r(); else document.addEventListener('firebase-initialized', r, { once: true }); setTimeout(r, 1000); });
    _me = window.currentUser || (window.auth?.currentUser ? { uid: window.auth.currentUser.uid } : null);
    if (!_me) { renderEmpty('Sign in as merchant to use POS'); return; }
    _merchantId = _me.uid;
    await loadProducts();
    if (!get$('posContent')) return;
    renderPOS();
  }

  async function loadProducts() {
    try {
      const fs = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      const q = fs.query(fs.collection(window.db, 'products'), fs.where('merchantId', '==', _merchantId), fs.where('archived', '!=', true));
      const snap = await fs.getDocs(q);
      _products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('POS: product load fallback', e);
      _products = [];
    }
  }

  function renderEmpty(msg) {
    const c = get$('posContent');
    if (c) c.innerHTML = `<div class="bg-gray-50 rounded-xl p-8 text-center"><span class="material-symbols-outlined text-6xl text-gray-300 mb-4">point_of_sale</span><p class="text-gray-500">${msg}</p></div>`;
  }

  // ── Cart ──────────────────────────────────────────────────────
  const cart = {
    add(p) {
      const ex = _cart.find(x => x.id === p.id);
      if (ex) { ex.qty = Math.min((ex.qty || 1) + 1, 99); }
      else { _cart.push({ id: p.id, name: p.name, price: p.price || 0, imageUrl: p.imageUrl || '', qty: 1, variants: p.variants || [], selectedVariant: null }); }
      _notify(); renderCart();
    },
    remove(id) { _cart = _cart.filter(x => x.id !== id); _notify(); renderCart(); },
    qty(id, d) {
      const ex = _cart.find(x => x.id === id);
      if (!ex) return;
      ex.qty = Math.max(1, Math.min(99, (ex.qty || 1) + d));
      if (ex.qty <= 0) cart.remove(id);
      _notify(); renderCart();
    },
    clear() { _cart = []; _notify(); renderCart(); },
    get() { return _cart; },
    count() { return _cart.reduce((s, x) => s + (x.qty || 1), 0); },
    subtotal() { return _cart.reduce((s, x) => s + (x.price || 0) * (x.qty || 1), 0); },
    items() { return _cart.map(x => ({ ...x })); },
  };

  function _notify() { _listeners.forEach(f => f(cart.items())); }
  function onChange(f) { _listeners.push(f); return () => _listeners = _listeners.filter(x => x !== f); }

  // ── Sale session ──────────────────────────────────────────────
  function openNewSale() {
    cart.clear();
    state.saleMode = true;
    state.customerName = '';
    state.paymentMethod = 'cash';
    state.subtotal = 0; state.tax = 0; state.discount = 0; state.total = 0;
    if (get$('posContent')) renderPOS();
  }

  function closeSale() { state.saleMode = false; cart.clear(); document.removeEventListener('keydown', posKeyHandler); if (get$('posContent')) renderPOS(); }

  function finalize() {
    if (!cart.count()) return alert('Cart is empty');
    const total = cart.subtotal();
    const method = state.paymentMethod;
    const discount = Number(state.discount) || 0;
    const final = Math.max(0, total - discount);
    commitOrder({ items: cart.items(), subtotal: total, discount, total: final, paymentMethod: method, customerName: state.customerName || 'Walk-in' });
  }

  // ── Order ─────────────────────────────────────────────────────
  async function commitOrder(data) {
    const btn = document.querySelector('#posCheckoutBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;animation:spin 1s linear infinite;">progress_activity</span> Processing...'; }
    try {
      const fs = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      const ref = await fs.addDoc(fs.collection(window.db, 'orders'), {
        merchantId: _merchantId,
        customerId: 'pos_' + _merchantId,
        customerName: data.customerName || 'Walk-in',
        items: data.items.map(x => ({ productId: x.id, name: x.name, price: x.price, quantity: x.qty })),
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        paymentMethod: data.paymentMethod,
        status: 'completed',
        type: 'pos',
        createdAt: fs.serverTimestamp(),
        updatedAt: fs.serverTimestamp(),
      });

      // Deduct inventory
      for (const item of data.items) {
        try {
          const prodRef = fs.doc(window.db, 'products', item.id);
          const { increment } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
          await fs.updateDoc(prodRef, { stock: increment(-item.qty) });
        } catch (e) { console.warn('Stock ded failed for', item.id, e); }
      }

      printReceipt({ ...data, id: ref.id, orderDate: new Date() });
      _lastReceipt = { ...data, id: ref.id, orderDate: new Date() };
      cart.clear();
      state.saleMode = false;
      if (get$('posContent')) renderPOS();
      showNotification(`Sale complete! #${ref.id.slice(0, 8)}`, 'success');
    } catch (e) {
      console.error('POS order failed', e);
      showNotification('Order failed: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = 'Complete Sale'; }
    }
  }

  // ── Receipt ───────────────────────────────────────────────────
  function printReceipt(data) {
    const shopName = (_me?.displayName || 'SmartSoko').toUpperCase();
    const items = data.items || [];
    const date = data.orderDate || new Date();
    const lines = [
      { t: shopName, a: 'c', b: true, s: 20 },
      { t: 'POINT OF SALE RECEIPT', a: 'c', s: 12 },
      { t: '', a: 'c' },
      { t: date.toLocaleString(), a: 'c' },
      { t: `Order: #${(data.id || '').slice(0, 8).toUpperCase()}`, a: 'c' },
      { t: `Customer: ${data.customerName || 'Walk-in'}`, a: 'c' },
      { t: `Payment: ${(data.paymentMethod || 'Cash').toUpperCase()}`, a: 'c' },
      { t: '', a: 'c' },
      { t: '─'.repeat(36), a: 'c' },
    ];

    items.forEach(it => {
      const name = (it.name || '').slice(0, 22);
      const price = Number(it.price || 0);
      const qty = it.qty || 1;
      const total = price * qty;
      lines.push({ t: name, a: 'l' });
      lines.push({ t: `  ${qty} x TZS ${price.toLocaleString()}`, a: 'l', s: 11 });
      const r = `TZS ${total.toLocaleString()}`;
      lines.push({ t: r, a: 'r', s: 11 });
    });

    lines.push({ t: '─'.repeat(36), a: 'c' });
    if (data.discount) lines.push({ t: `Discount: TZS ${data.discount.toLocaleString()}`, a: 'l' });
    lines.push({ t: `TOTAL: TZS ${(data.total || 0).toLocaleString()}`, a: 'c', b: true, s: 16 });
    lines.push({ t: '─'.repeat(36), a: 'c' });
    lines.push({ t: 'Thank you for shopping!', a: 'c', s: 11 });
    lines.push({ t: 'SmartSoko Marketplace', a: 'c', s: 10 });
    lines.push({ t: '', a: 'c' });
    lines.push({ t: '', a: 'c' });

    const html = buildReceiptHTML(lines);
    const receiptWindow = window.open('', 'receipt', 'width=380,height=600');
    if (receiptWindow) {
      receiptWindow.document.write(html);
      receiptWindow.document.close();
      setTimeout(() => { try { receiptWindow.print(); } catch (e) {} }, 300);
    }

    tryThermalPrint(lines, data);
  }

  function buildReceiptHTML(lines) {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Receipt</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inconsolata', monospace; font-size: 13px; padding: 16px; width: 340px; color: #000; }
  .c { text-align: center; } .l { text-align: left; } .r { text-align: right; }
  .b { font-weight: 700; }
  .s20 { font-size: 20px; } .s16 { font-size: 16px; } .s12 { font-size: 12px; } .s11 { font-size: 11px; } .s10 { font-size: 10px; }
  .line { padding: 1px 0; white-space: pre; }
  .sep { border-top: 1px dashed #999; margin: 4px 0; }
  @media print { @page { margin: 0; size: 58mm auto; } body { padding: 8px; } }
</style></head>
<body>
${lines.map(l => {
  const cls = [l.a || 'c', l.b ? 'b' : '', l.s ? 's' + l.s : ''].filter(Boolean).join(' ');
  return l.sep ? '<div class="sep"></div>' : `<div class="line ${cls}">${l.t}</div>`;
}).join('\n')}
</body></html>`;
  }

  function tryThermalPrint(lines, data) {
    try {
      const text = lines
        .filter(l => !l.sep)
        .map(l => {
          const t = l.t || '';
          if (l.a === 'c') return ' '.repeat(Math.max(0, Math.floor((32 - t.length / 2) / 2))) + t;
          if (l.a === 'r') return ' '.repeat(Math.max(0, 32 - t.length)) + t;
          return t;
        })
        .join('\n') + '\n\n\n';

      if (navigator.usb && confirm('Print on thermal printer via USB?')) {
        printViaUSB(text);
      } else if (typeof window.WebSocket !== 'undefined') {
        const port = prompt('If using ESC/POS network printer, enter port (default 9100):', '9100');
        if (port) printViaTCP(text, port);
      }
    } catch (e) { console.warn('Thermal print init failed', e); }
  }

  async function printViaUSB(text) {
    try {
      const device = await navigator.usb.requestDevice({ filters: [] });
      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);
      await device.claimInterface(0);

      const encoder = new TextEncoder();
      const esc = (cmd) => new Uint8Array(cmd);
      const data = new Uint8Array([
        ...esc([0x1B, 0x40]), // Initialize
        ...esc([0x1B, 0x21, 0x08]), // Double height
        ...encoder.encode('SMARTSOKO\n').buffer,
        ...esc([0x1B, 0x21, 0x00]), // Normal
        ...encoder.encode('─'.repeat(32) + '\n').buffer,
        ...text.split('').map(c => c.charCodeAt(0)),
        ...esc([0x1B, 0x64, 0x04]), // Feed 4 lines
        ...esc([0x1D, 0x56, 0x41, 0x00]), // Cut paper
      ]);

      await device.transferOut(1, data);
      await device.close();
    } catch (e) { console.warn('USB print failed', e); }
  }

  function printViaTCP(text, port) {
    try {
      const encoder = new TextEncoder();
      const bytes = encoder.encode('\x1B\x40' + text + '\x1B\x64\x04\x1D\x56\x41\x00');
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'receipt.bin';
      a.click();
      URL.revokeObjectURL(a.href);
      showNotification('Receipt file downloaded — send to printer via port ' + port, 'info');
    } catch (e) { console.warn('TCP print fallback', e); }
  }

  // ── POS UI Render ─────────────────────────────────────────────
  function renderPOS() {
    const c = get$('posContent');
    if (!c) return;

    if (!state.saleMode) {
      c.innerHTML = `
        <div class="bg-gray-50 rounded-xl p-8 text-center">
          <span class="material-symbols-outlined text-6xl text-primary mb-4">point_of_sale</span>
          <h3 class="text-lg font-semibold mb-2">Ready to sell</h3>
          <p class="text-gray-500 mb-4">${_products.length} products available in inventory</p>
          <p class="text-sm text-gray-400 mb-6">Start a new sale or scan a barcode</p>
          <button onclick="POS.openNewSale()" class="bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors inline-flex items-center gap-2 shadow-lg">
            <span class="material-symbols-outlined">add</span>
            Start New Sale
          </button>
          <div class="mt-6 text-xs text-gray-400">
            <p>Press <kbd class="bg-gray-200 px-1.5 py-0.5 rounded font-mono">Ctrl+N</kbd> for new sale</p>
          </div>
        </div>`;
      return;
    }

    c.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <div class="flex items-center gap-3 mb-4">
            <button onclick="POS.closeSale()" class="p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <input id="posSearch" type="text" placeholder="Search products..." oninput="POS.search(this.value)" class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-primary">
          </div>
          <div id="posProducts" class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto px-1"></div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div class="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="font-bold flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">shopping_cart</span>
              Cart (<span id="posCartCount">0</span>)
            </h3>
            <button onclick="POS.cart.clear()" class="text-xs text-red-500 hover:text-red-700 font-medium">Clear</button>
          </div>
          <div id="posCartItems" class="p-3 max-h-[30vh] overflow-y-auto"></div>
          <div class="p-4 border-t border-gray-100 space-y-3">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Subtotal</span>
              <span id="posSubtotal" class="font-semibold">TZS 0</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Discount</span>
              <input id="posDiscount" type="number" min="0" step="100" value="0" oninput="POS.renderCart()" class="w-24 text-right px-2 py-1 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary">
            </div>
            <div class="flex items-center justify-between text-sm font-bold border-t border-gray-200 pt-3">
              <span>TOTAL</span>
              <span id="posTotal" class="text-lg text-primary">TZS 0</span>
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">Payment method</label>
              <select id="posPaymentMethod" onchange="POS.state.paymentMethod=this.value" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile">Mobile Money</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">Customer name (optional)</label>
              <input id="posCustomerName" type="text" placeholder="Walk-in" oninput="POS.state.customerName=this.value" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary">
            </div>
            <button id="posCheckoutBtn" onclick="POS.finalize()" class="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 shadow-lg">
              <span class="material-symbols-outlined">payment</span>
              Complete Sale
            </button>
            <button onclick="POS.printReceiptOnly()" class="w-full py-2 text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1">
              <span class="material-symbols-outlined" style="font-size:14px;">print</span>
              Reprint last receipt
            </button>
          </div>
        </div>
      </div>`;

    renderProducts();
    renderCart();

    document.addEventListener('keydown', posKeyHandler);
  }

  let _lastReceipt = null;
  function printReceiptOnly() { if (_lastReceipt) printReceipt(_lastReceipt); else showNotification('No previous receipt', 'info'); }

  function posKeyHandler(e) {
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); openNewSale(); }
  }

  function renderProducts(filter = '') {
    const wrap = get$('posProducts');
    if (!wrap) return;
    const term = filter.toLowerCase().trim();
    const items = term ? _products.filter(p => (p.name || '').toLowerCase().includes(term) || (p.category || '').toLowerCase().includes(term)) : _products;
    if (items.length === 0) {
      wrap.innerHTML = `<div class="col-span-full text-center py-8 text-gray-400"><span class="material-symbols-outlined text-4xl block mb-2">inventory_2</span><p>No products found</p></div>`;
      return;
    }
    wrap.innerHTML = items.map(p => {
      const img = p.imageUrl || '';
      const price = Number(p.price || 0);
      return `
        <div onclick="POS.cart.add({id:'${p.id}',name:'${escJs(p.name)}',price:${price},imageUrl:'${escJs(img)}'})" class="bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:shadow-md hover:border-primary transition-all active:scale-[0.97]">
          <div class="aspect-square bg-gray-50 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
            ${img ? `<img src="${escJs(img)}" alt="" class="w-full h-full object-cover" loading="lazy">` : `<span class="material-symbols-outlined text-3xl text-gray-300">inventory_2</span>`}
          </div>
          <div class="text-sm font-semibold truncate">${escHtml(p.name)}</div>
          <div class="text-primary font-bold text-sm">TZS ${price.toLocaleString()}</div>
        </div>`;
    }).join('');
  }

  function search(val) { renderProducts(val); }

  function renderCart() {
    const count = get$('posCartCount');
    const items = get$('posCartItems');
    const subtotal = get$('posSubtotal');
    const total = get$('posTotal');
    const discountInput = get$('posDiscount');
    const discount = Number(discountInput?.value || 0);

    if (count) count.textContent = cart.count();
    if (items) {
      if (_cart.length === 0) {
        items.innerHTML = `<div class="text-center py-8 text-gray-400"><span class="material-symbols-outlined text-3xl block mb-1">add_shopping_cart</span><p class="text-sm">Cart is empty</p><p class="text-xs">Tap products to add</p></div>`;
      } else {
        items.innerHTML = _cart.map(x => `
          <div class="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <div class="w-10 h-10 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 flex items-center justify-center">
              ${x.imageUrl ? `<img src="${escJs(x.imageUrl)}" alt="" class="w-full h-full object-cover">` : `<span class="material-symbols-outlined text-lg text-gray-300">inventory_2</span>`}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold truncate">${escHtml(x.name)}</div>
              <div class="text-xs text-gray-500">TZS ${Number(x.price).toLocaleString()} each</div>
            </div>
            <div class="flex items-center gap-1">
              <button onclick="POS.cart.qty('${x.id}', -1)" class="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold">−</button>
              <span class="w-7 text-center text-sm font-semibold">${x.qty}</span>
              <button onclick="POS.cart.qty('${x.id}', 1)" class="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold">+</button>
            </div>
            <div class="text-sm font-bold w-20 text-right">TZS ${(Number(x.price) * (x.qty || 1)).toLocaleString()}</div>
            <button onclick="POS.cart.remove('${x.id}')" class="text-red-400 hover:text-red-600 text-xs">
              <span class="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        `).join('');
      }
    }

    const sub = cart.subtotal();
    if (subtotal) subtotal.textContent = 'TZS ' + sub.toLocaleString();
    const final = Math.max(0, sub - discount);
    if (total) total.textContent = 'TZS ' + final.toLocaleString();
    state.subtotal = sub; state.discount = discount; state.total = final;
  }

  // ── Sales history ─────────────────────────────────────────────
  async function loadHistory() {
    if (!get$('posSalesHistory')) return;
    try {
      const fs = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      const q = fs.query(fs.collection(window.db, 'orders'), fs.where('merchantId', '==', _merchantId), fs.where('type', '==', 'pos'), fs.orderBy('createdAt', 'desc'), fs.limit(20));
      const snap = await fs.getDocs(q);
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      get$('posSalesHistory').innerHTML = orders.length ? orders.map(o => `
        <div class="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
          <div><span class="font-semibold">#${(o.id || '').slice(0, 6)}</span><span class="text-gray-400 ml-2 text-xs">${o.customerName || 'Walk-in'}</span></div>
          <div class="text-right"><span class="font-bold">TZS ${Number(o.total || 0).toLocaleString()}</span><span class="text-xs text-gray-400 block">${o.paymentMethod || 'cash'}</span></div>
        </div>`).join('') : '<p class="text-gray-400 text-sm text-center py-4">No POS sales yet</p>';
    } catch (e) { console.warn(e); }
  }

  // ── Helpers ───────────────────────────────────────────────────
  function escHtml(s) { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
  function escJs(s) { return String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
  function showNotification(msg, type = 'info') {
    if (window.showNotification) return window.showNotification(msg, { type });
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;bottom:24px;right:24px;background:${type === 'error' ? '#dc2626' : '#064e3b'};color:#fff;padding:12px 20px;border-radius:999px;font:600 13px 'Plus Jakarta Sans',sans-serif;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,0.3)`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ── Public API ────────────────────────────────────────────────
  const API = {
    init, state, cart, _lastReceipt,
    openNewSale, closeSale, finalize, search,
    renderProducts, renderCart, loadHistory,
    printReceipt, printReceiptOnly,
    escHtml, escJs,
  };

  window.POS = API;
  return API;
})();
