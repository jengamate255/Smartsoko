/**
 * Wallet Manager — Merchant wallet balance, transactions, withdrawals
 */
(function () {
  'use strict';

  async function getToken() {
    if (window.getAuthToken) return window.getAuthToken();
    if (window.auth?.currentUser) return window.auth.currentUser.getIdToken();
    return null;
  }

  async function apiFetch(path, opts = {}) {
    const token = await getToken();
    const headers = { 'Content-Type': 'application/json', ...opts.headers };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(path, { ...opts, headers });
    return res.json();
  }

  async function getWallet() {
    return apiFetch('/api/vendor/wallet');
  }

  async function getTransactions(limit = 50) {
    return apiFetch('/api/vendor/wallet/transactions?limit=' + limit);
  }

  async function requestWithdrawal(amount, method, accountDetails) {
    return apiFetch('/api/vendor/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, method, accountDetails })
    });
  }

  function renderWallet(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const wallet = data.wallet || {};
    const balance = wallet.balance || 0;
    const pending = wallet.pending || 0;
    const totalEarned = wallet.totalEarned || 0;
    const totalWithdrawn = wallet.totalWithdrawn || 0;

    el.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-surface-container-lowest p-5 rounded-xl card-shadow border border-surface-container">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 bg-secondary-container/30 rounded-lg flex items-center justify-center">
              <span class="material-symbols-outlined text-secondary">account_balance_wallet</span>
            </div>
            <span class="text-sm text-on-surface-variant font-medium">Available Balance</span>
          </div>
          <p class="text-2xl font-bold text-on-surface">${formatCurrency(balance)}</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl card-shadow border border-surface-container">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 bg-tertiary-container/30 rounded-lg flex items-center justify-center">
              <span class="material-symbols-outlined text-tertiary">pending</span>
            </div>
            <span class="text-sm text-on-surface-variant font-medium">Pending</span>
          </div>
          <p class="text-2xl font-bold text-on-surface">${formatCurrency(pending)}</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl card-shadow border border-surface-container">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 bg-primary-container/30 rounded-lg flex items-center justify-center">
              <span class="material-symbols-outlined text-primary">trending_up</span>
            </div>
            <span class="text-sm text-on-surface-variant font-medium">Total Earned</span>
          </div>
          <p class="text-2xl font-bold text-on-surface">${formatCurrency(totalEarned)}</p>
        </div>
        <div class="bg-surface-container-lowest p-5 rounded-xl card-shadow border border-surface-container">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 bg-error-container/30 rounded-lg flex items-center justify-center">
              <span class="material-symbols-outlined text-error">arrow_upward</span>
            </div>
            <span class="text-sm text-on-surface-variant font-medium">Total Withdrawn</span>
          </div>
          <p class="text-2xl font-bold text-on-surface">${formatCurrency(totalWithdrawn)}</p>
        </div>
      </div>
      <div class="flex justify-end mb-4">
        <button onclick="window.WalletManager.showWithdrawModal()"
          class="flex items-center gap-2 px-5 py-2.5 bg-primary-container text-on-primary-container rounded-lg font-bold hover:opacity-90 transition-opacity">
          <span class="material-symbols-outlined">payments</span>
          Withdraw Funds
        </button>
      </div>
    `;
  }

  function renderTransactions(containerId, transactions) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!transactions || transactions.length === 0) {
      el.innerHTML = `
        <div class="text-center py-12">
          <span class="material-symbols-outlined text-5xl text-outline mb-3 block">receipt_long</span>
          <p class="font-medium text-on-surface-variant">No transactions yet</p>
          <p class="text-sm text-outline mt-1">Your payment history will appear here</p>
        </div>`;
      return;
    }

    const typeIcons = {
      order_payment: { icon: 'shopping_cart', color: 'text-secondary', bg: 'bg-secondary-container/30' },
      withdrawal: { icon: 'arrow_upward', color: 'text-error', bg: 'bg-error-container/30' },
      refund: { icon: 'replay', color: 'text-tertiary', bg: 'bg-tertiary-container/30' },
      bonus: { icon: 'stars', color: 'text-primary', bg: 'bg-primary-container/30' }
    };

    const statusColors = {
      completed: 'bg-secondary-container text-secondary',
      pending: 'bg-tertiary-container text-tertiary',
      failed: 'bg-error-container text-error'
    };

    el.innerHTML = `
      <div class="divide-y divide-surface-container">
        ${transactions.map(tx => {
          const t = typeIcons[tx.type] || typeIcons.order_payment;
          const sc = statusColors[tx.status] || 'bg-surface-variant text-on-surface-variant';
          const isCredit = ['order_payment', 'bonus'].includes(tx.type);
          return `
            <div class="flex items-center justify-between py-4 px-4 hover:bg-surface-container-low/50 transition-colors">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-lg ${t.bg} flex items-center justify-center">
                  <span class="material-symbols-outlined ${t.color} text-xl">${t.icon}</span>
                </div>
                <div>
                  <p class="font-medium text-on-surface">${escapeHtml(tx.description || tx.type || 'Transaction')}</p>
                  <p class="text-xs text-outline mt-0.5">${tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-bold ${isCredit ? 'text-secondary' : 'text-error'}">${isCredit ? '+' : '-'}${formatCurrency(tx.amount)}</p>
                <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sc}">${tx.status || 'completed'}</span>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }

  function showWithdrawModal() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
      <div class="bg-surface-container-lowest rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
        <div class="flex items-center justify-between">
          <h3 class="font-headline-sm text-headline-sm text-on-surface">Withdraw Funds</h3>
          <button onclick="this.closest('.fixed').remove()" class="material-symbols-outlined text-outline hover:text-on-surface">close</button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-on-surface-variant mb-1">Amount (TSh)</label>
            <input type="number" id="withdrawAmount" min="1000" step="100"
              class="w-full px-4 py-2.5 border border-surface-variant rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="Enter amount"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-on-surface-variant mb-1">Method</label>
            <select id="withdrawMethod" class="w-full px-4 py-2.5 border border-surface-variant rounded-lg focus:ring-2 focus:ring-primary outline-none">
              <option value="mobile_money">Mobile Money (M-Pesa/TigoPesa)</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-on-surface-variant mb-1">Account Details</label>
            <input type="text" id="withdrawAccount" class="w-full px-4 py-2.5 border border-surface-variant rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="Phone number or account number"/>
          </div>
        </div>
        <div class="flex gap-3 pt-2">
          <button onclick="this.closest('.fixed').remove()" class="flex-1 py-2.5 border border-surface-variant rounded-lg font-medium hover:bg-surface-container transition-colors">Cancel</button>
          <button onclick="window.WalletManager.submitWithdraw()" class="flex-1 py-2.5 bg-primary-container text-on-primary-container rounded-lg font-bold hover:opacity-90 transition-opacity">Confirm Withdrawal</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  async function submitWithdraw() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const account = document.getElementById('withdrawAccount').value.trim();
    if (!amount || amount < 1000) { alert('Minimum withdrawal is TSh 1,000'); return; }
    if (!account) { alert('Please enter account details'); return; }

    try {
      const result = await requestWithdrawal(amount, method, account);
      if (result.success) {
        document.querySelector('.fixed')?.remove();
        alert('Withdrawal request submitted successfully!');
        if (typeof window.MerchantApp?.loadFinanceTab === 'function') {
          window.MerchantApp.loadFinanceTab();
        }
      } else {
        alert(result.error || 'Failed to process withdrawal');
      }
    } catch (e) {
      alert('Network error. Please try again.');
    }
  }

  function formatCurrency(amount) {
    return 'TSh ' + (amount || 0).toLocaleString();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.WalletManager = {
    getWallet,
    getTransactions,
    requestWithdrawal,
    renderWallet,
    renderTransactions,
    showWithdrawModal,
    submitWithdraw
  };
})();
