import { merchantRequest } from './merchant-request.js?v=2';

let generation = 0;
let ready = false;
let loadedTenant, loadedUser;
const money = value => 'TSh ' + Number(value).toLocaleString();
const fields = ['method', 'accountName', 'phoneNumber', 'bankName', 'accountNumber'];
const input = field => document.getElementById('payout-' + field);
const message = text => {
    const node = document.getElementById('payoutDetailsStatus');
    if (node) node.textContent = text;
};

function toggleMethod() {
    const bank = input('method')?.value === 'bank_transfer';
    document.getElementById('payoutMobileFields')?.classList.toggle('hidden', bank);
    document.getElementById('payoutBankFields')?.classList.toggle('hidden', !bank);
}

function renderHistory(rows) {
    const list = document.getElementById('payoutHistory');
    if (!list) return;
    list.replaceChildren();
    if (!rows.length) {
        list.textContent = 'No payouts yet. Verified payments are queued after delivery.';
        return;
    }
    for (const row of rows) {
        const node = document.createElement('div');
        node.className = 'p-3 border-b border-gray-200 text-sm';
        const created = row.createdAt || row.created_at;
        const ref = row.transactionRef || row.transaction_ref;
        const order = row.orderId || row.order_id;
        node.textContent = `${money(row.amount)} · ${row.status || 'pending'}${created ? ' · ' + new Date(created).toLocaleDateString() : ''}${order ? ' · Order ' + String(order).slice(0, 8) : ' · Legacy request — review required'}${ref ? ' · Reference: ' + ref : ''}`;
        list.append(node);
    }
}

async function saveDetails(event) {
    event.preventDefault();
    if (!ready) return;
    if (
        loadedTenant !== window.merchantSelectedId ||
        loadedUser !== window.auth?.currentUser?.uid
    ) {
        ready = false;
        document.getElementById('savePayoutDetails').disabled = true;
        message('Store or session changed. Refresh finance before saving details.');
        return;
    }
    const button = document.getElementById('savePayoutDetails');
    button.disabled = true;
    try {
        const body = Object.fromEntries(fields.map(field => [field, input(field).value]));
        await merchantRequest('/payout-details', { method: 'PUT', body: JSON.stringify(body) });
        await loadFinance();
    } catch (error) {
        message('Could not save payout details: ' + error.message);
    } finally {
        button.disabled = !ready;
    }
}

export async function loadFinance() {
    const form = document.getElementById('payoutDetailsForm');
    if (!form) return;
    if (!form.dataset.bound) {
        form.addEventListener('submit', saveDetails);
        input('method').addEventListener('change', toggleMethod);
        form.addEventListener('input', () =>
            message('Unsaved changes. Changed payout details require fresh admin verification.')
        );
        form.dataset.bound = 'true';
    }
    const current = ++generation;
    const tenant = window.merchantSelectedId;
    const userId = window.auth?.currentUser?.uid;
    ready = false;
    document.getElementById('savePayoutDetails').disabled = true;
    for (const id of [
        'availableBalance',
        'pendingBalance',
        'lifetimeEarnings',
        'totalWithdrawn',
        'queuedPayouts',
    ]) {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    }
    message('Loading payout details…');
    const list = document.getElementById('payoutHistory');
    if (list) list.textContent = 'Loading payouts…';
    try {
        const [summary, history, details] = await Promise.all([
            merchantRequest('/balance'),
            merchantRequest('/payouts'),
            merchantRequest('/payout-details'),
        ]);
        if (current !== generation) return;
        if (tenant !== window.merchantSelectedId || userId !== window.auth?.currentUser?.uid)
            throw new Error('Store selection changed; refresh finance');
        if (summary.stale || history.stale || details.stale)
            throw new Error('Finance requires a fresh connection; cached balances cannot be used');
        for (const id of [
            'availableBalance',
            'pendingBalance',
            'lifetimeEarnings',
            'totalWithdrawn',
            'queuedPayouts',
        ]) {
            const value = summary.data[id];
            const node = document.getElementById(id);
            if (node) node.textContent = Number.isFinite(value) ? money(value) : 'Unavailable';
        }
        renderHistory(history.data || []);
        const account = details.data;
        for (const field of fields)
            input(field).value = account?.[field] || (field === 'method' ? 'mobile_money' : '');
        toggleMethod();
        ready = true;
        loadedTenant = tenant;
        loadedUser = userId;
        document.getElementById('savePayoutDetails').disabled = false;
        message(
            account?.status === 'verified'
                ? `Verified payout details (revision ${account.revision}). Transfers are processed manually.`
                : account
                  ? 'Awaiting admin verification. Saving different details invalidates previous approval.'
                  : 'Add payout details. An admin must verify the destination before payment.'
        );
    } catch (error) {
        if (current !== generation) return;
        message('Could not load merchant finance: ' + error.message);
        if (list) list.textContent = 'Payout history unavailable. Refresh to retry.';
    }
}
