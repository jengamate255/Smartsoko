/**
 * Abandoned Cart Recovery System
 * Tracks cart activity and flags abandoned carts for merchant follow-up
 */

window.CartRecovery = {
  TIMEOUT_MINUTES: 30,
  checkInterval: null,

  init() {
    const auth = window.auth;
    if (!auth) return;
    import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js').then(({ onAuthStateChanged }) => {
      onAuthStateChanged(auth, user => {
        if (user) {
          this.trackCartActivity();
          this.checkInterval = setInterval(() => this.checkAbandonedCart(), 60000);
        } else if (this.checkInterval) {
          clearInterval(this.checkInterval);
        }
      });
    });
    window.addEventListener('beforeunload', () => this.saveCartState());
  },

  getCart() {
    try { return JSON.parse(localStorage.getItem('smartsoko_cart') || '[]'); } catch { return []; }
  },

  saveCartState() {
    const cart = this.getCart();
    if (cart.length > 0) {
      localStorage.setItem('smartsoko_cart_snapshot', JSON.stringify({ items: cart, timestamp: Date.now() }));
    }
  },

  trackCartActivity() {
    const cart = this.getCart();
    if (cart.length > 0) {
      localStorage.setItem('smartsoko_cart_last_active', Date.now().toString());
      localStorage.setItem('smartsoko_cart_seller', cart[0]?.sellerId || '');
    }
  },

  checkAbandonedCart() {
    const cart = this.getCart();
    if (cart.length === 0) return;

    const lastActive = parseInt(localStorage.getItem('smartsoko_cart_last_active') || '0');
    const elapsed = (Date.now() - lastActive) / 60000;

    if (elapsed >= this.TIMEOUT_MINUTES && !localStorage.getItem('smartsoko_cart_recovery_sent')) {
      this.notifyMerchant(cart);
      this.showRecoveryPrompt(cart);
      localStorage.setItem('smartsoko_cart_recovery_sent', 'true');
    }
  },

  async notifyMerchant(cart) {
    const auth = window.auth;
    if (!auth?.currentUser) return;
    try {
      const db = window.db;
      const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      const sellerId = localStorage.getItem('smartsoko_cart_seller') || '';
      const total = cart.reduce((s, item) => s + (item.price * (item.quantity || 1)), 0);
      await addDoc(collection(db, 'cart_recoveries'), {
        customerId: auth.currentUser.uid,
        customerName: auth.currentUser.displayName || 'Customer',
        sellerId,
        items: cart.map(i => ({ name: i.name, quantity: i.quantity || 1, price: i.price })),
        total,
        status: 'abandoned',
        detectedAt: serverTimestamp(),
        notified: true
      });
    } catch (e) {
      console.warn('Cart recovery notification error:', e);
    }
  },

  showRecoveryPrompt(cart) {
    const existing = document.querySelector('.cart-recovery-banner');
    if (existing) return;

    const total = cart.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);
    const banner = document.createElement('div');
    banner.className = 'cart-recovery-banner fixed bottom-24 left-4 right-4 max-w-md mx-auto bg-surface rounded-2xl shadow-2xl border border-primary/20 z-50 p-4 animate-slide-up';
    banner.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="material-symbols-outlined text-amber-500">shopping_cart</span>
        <div class="flex-1">
          <p class="font-semibold text-on-surface text-sm">Complete your order?</p>
          <p class="text-xs text-on-surface-variant">You have ${cart.length} item${cart.length > 1 ? 's' : ''} in your cart (TSh ${total.toLocaleString()})</p>
        </div>
        <button onclick="this.closest('.cart-recovery-banner').remove()" class="text-on-surface-variant hover:text-on-surface"><span class="material-symbols-outlined text-lg">close</span></button>
      </div>
      <div class="flex gap-2 mt-3">
        <a href="/checkout" class="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold text-center hover:opacity-90 transition">Complete Order</a>
        <button onclick="this.closest('.cart-recovery-banner').remove();localStorage.removeItem('smartsoko_cart_recovery_sent')" class="px-4 py-2.5 rounded-xl border border-outline-variant text-sm hover:bg-surface-container transition">Not now</button>
      </div>
    `;
    document.body.appendChild(banner);

    const style = document.createElement('style');
    style.textContent = `@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }.animate-slide-up { animation: slideUp 0.3s ease-out; }`;
    document.head.appendChild(style);
  },

  async getRecoveryStats(sellerId) {
    try {
      const db = window.db;
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
      const q = query(collection(db, 'cart_recoveries'), where('sellerId', '==', sellerId));
      const snap = await getDocs(q);
      let total = 0, recovered = 0, revenue = 0;
      snap.docs.forEach(doc => {
        const d = doc.data();
        total++;
        if (d.status === 'recovered') { recovered++; revenue += d.total || 0; }
      });
      return { total, recovered, revenue, rate: total > 0 ? Math.round(recovered / total * 100) : 0 };
    } catch { return { total: 0, recovered: 0, revenue: 0, rate: 0 }; }
  }
};

document.addEventListener('DOMContentLoaded', () => CartRecovery.init());