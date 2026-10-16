const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'public/merchant.html'), 'utf8');
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
const desk = fs.readFileSync(path.join(root, 'public/js/merchant-order-desk.js'), 'utf8');

function page() {
  const elements = new Map();
  const document = {
    addEventListener() {}, querySelectorAll() { return []; },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, {
        value: '', innerHTML: '', textContent: '', hidden: false, dataset: {},
        querySelectorAll() { return []; },
        addEventListener() {}, setAttribute() {}, removeAttribute() {},
        classList: { add() {}, remove() {} },
      });
      return elements.get(id);
    },
  };
  const context = vm.createContext({ document, navigator: { onLine: true }, console,
    localStorage: { getItem() { return null; } },
    window: { addEventListener() {} }, URLSearchParams, setTimeout, clearTimeout,
  });
  new vm.Script(inline + '\n' + desk).runInContext(context);
  vm.runInContext('currentSeller = { id: "store-1" };', context);
  return { context, elements };
}

test('a slow previous filter response cannot replace the current orders', async () => {
  const { context } = page();
  const pending = [];
  context.merchantApi = () => new Promise(resolve => pending.push(resolve));
  context.displayOrders = orders => { context.rendered = orders; };
  const first = vm.runInContext('loadOrders("pending", "")', context);
  const second = vm.runInContext('loadOrders("delivered", "")', context);
  pending[1]([{ id: 'new', status: 'delivered' }]);
  await second;
  pending[0]([{ id: 'old', status: 'pending' }]);
  await first;
  assert.equal(context.rendered[0].id, 'new');
});

test('merchant module preserves handlers supplied by the live page', () => {
  const source = fs.readFileSync(path.join(root, 'public/js/merchant-app.js'), 'utf8');
  for (const name of ['switchTab', 'selectOrder', 'filterOrdersByStatus', 'filterOrdersByDate', 'updateOrderStatus', 'requestPayout', 'openAddMenuItem', 'openPromoModal']) {
    const registration = source.match(new RegExp(`window\\.${name} \\|\\|= ${name};`));
    assert.ok(registration, name + ' must preserve page ownership');
    const original = () => 'page';
    const sandbox = { window: { [name]: original }, [name]: () => 'module' };
    vm.runInNewContext(registration[0], sandbox);
    assert.equal(sandbox.window[name], original);
  }
});

test('repeated order actions send only one update while a save is pending', async () => {
  const { context } = page();
  vm.runInContext('orderTransitionHints.set("one", ["accepted"]);', context);
  let complete;
  let calls = 0;
  context.merchantApi = () => {
    calls++;
    return new Promise(resolve => { complete = resolve; });
  };
  context.refreshOrders = async () => {};
  context.showNotification = () => {};
  const first = vm.runInContext('updateOrderStatus("one", "accepted")', context);
  await vm.runInContext('updateOrderStatus("one", "accepted")', context);
  assert.equal(calls, 1);
  complete({ status: 'accepted' });
  await first;
});

test('search matches customer, order reference, and formatted phone without mutating the snapshot', () => {
  const { context } = page();
  const orders = [
    { id: 'abc123', customerName: 'Amina Juma', customerPhone: '+255 712 345 678', status: 'pending' },
    { id: 'def456', customerName: 'Joseph', customerPhone: '0712-000-111', status: 'completed' },
  ];
  assert.equal(context.visibleDeskOrders(orders, 'AMINA')[0].id, 'abc123');
  assert.equal(context.visibleDeskOrders(orders, 'def456')[0].id, 'def456');
  assert.equal(context.visibleDeskOrders(orders, '712345')[0].id, 'abc123');
  assert.equal(context.visibleDeskOrders(orders, 'unmatched').length, 0);
  assert.equal(orders[0].id, 'abc123');
});

test('priority sorting puts the oldest waiting acceptance first and handles status aliases', () => {
  const { context } = page();
  const now = Date.parse('2026-10-15T09:30:00Z');
  const rows = [
    { id: 'recent', status: 'pending', createdAt: '2026-10-15T09:29:00Z' },
    { id: 'old', status: 'PENDING', createdAt: '2026-10-15T09:00:00Z' },
    { id: 'accepted', status: 'CONFIRMED', createdAt: '2026-10-15T08:00:00Z' },
  ];
  assert.equal(context.visibleDeskOrders(rows, '', 'attention', now).map(row => row.id).join(','), 'old,recent,accepted');
  assert.equal(context.orderStatus(' READY '), 'ready_for_delivery');
  assert.equal(context.orderAge(rows[1], now).attention, true);
  assert.equal(context.orderAge(rows[0], now).attention, false);
  assert.equal(context.orderAge({ createdAt: 'invalid', status: 'pending' }, now).attention, false);
});

test('date filtering uses the store timezone at midnight', () => {
  const { context } = page();
  assert.equal(context.orderBusinessDate('2026-10-14T22:30:00Z'), '2026-10-15');
  assert.equal(context.orderBusinessDate('invalid'), '');
});

test('order buttons use server hints and never offer an invalid delivery shortcut', () => {
  const { context } = page();
  vm.runInContext('orderTransitionHints.set("one", ["accepted", "cancelled"]); orderTransitionHints.set("ready", ["assigned", "completed"]);', context);
  assert.match(context.getOrderActions({ id: 'one', status: 'pending' }), /Accept order/);
  assert.equal(context.getOrderActions({ id: 'missing', status: 'pending' }), '');
  assert.equal(context.getOrderActions({ id: 'ready', status: 'ready_for_delivery' }), '');
  assert.match(context.getOrderActions({ id: 'ready', status: 'ready_for_delivery', fulfillmentType: 'pickup' }), /Complete pickup/);
});

test('failed refresh preserves the last snapshot and disables its actions', async () => {
  const { context, elements } = page();
  context.merchantApi = async () => ({ data: [{ id: 'one', customerName: 'Snapshot customer', status: 'pending' }], allowedTransitionsHint: { one: ['accepted'] } });
  assert.equal(await context.loadOrders('all', ''), true);
  context.merchantApi = async () => { throw new Error('Offline'); };
  assert.equal(await context.loadOrders('all', ''), false);
  const rendered = elements.get('ordersList').innerHTML;
  assert.match(rendered, /Snapshot customer/);
  assert.match(rendered, / disabled/);
  assert.equal(elements.get('merchantOrderStale').hidden, false);
});

test('a failed save blocks replay until the state is refreshed', async () => {
  const { context } = page();
  vm.runInContext('orderTransitionHints.set("one", ["accepted"]);', context);
  context.showNotification = () => {};
  let attempts = 0;
  context.merchantApi = async () => { attempts++; throw new Error('Timed out'); };
  assert.equal(await context.updateOrderStatus('one', 'accepted'), false);
  assert.equal(await context.updateOrderStatus('one', 'accepted'), false);
  assert.equal(attempts, 1);
});

test('permission errors prevent further writes even after a successful read', async () => {
  const { context, elements } = page();
  vm.runInContext('orderTransitionHints.set("one", ["accepted"]);', context);
  context.showNotification = () => {};
  let writes = 0;
  context.merchantApi = async (url, options = {}) => {
    if (options.method === 'POST') { writes++; throw Object.assign(new Error('Not permitted'), { status: 403 }); }
    return { data: [{ id: 'one', status: 'pending' }], allowedTransitionsHint: { one: ['accepted'] } };
  };
  await context.updateOrderStatus('one', 'accepted');
  await context.loadOrders('all', '');
  await context.updateOrderStatus('one', 'accepted');
  assert.equal(writes, 1);
  assert.match(elements.get('merchantOrderStaleText').textContent, /Contact your store owner/);
});

test('the loaded-order limit remains disclosed when a date filter has no matches', async () => {
  const { context, elements } = page();
  context.merchantApi = async () => ({ data: Array.from({ length: 500 }, (_, i) => ({ id: String(i), status: 'completed', createdAt: '2026-10-15T09:00:00Z' })) });
  await context.loadOrders('all', '2026-10-01');
  assert.equal(elements.get('merchantOrderLimit').hidden, false);
});

test('customer data and order references cannot create inline event handlers', () => {
  const { context, elements } = page();
  context.displayOrders([{ id: '" onclick="alert(1)', customerName: '<img src=x onerror=alert(1)>', status: 'pending' }]);
  const rendered = elements.get('ordersList').innerHTML;
  assert.doesNotMatch(rendered, /<img/);
  assert.doesNotMatch(rendered, /"\s+onclick=/);
  assert.match(rendered, /data-order-id="&quot; onclick=&quot;/);
  assert.match(rendered, /&lt;img/);
});

async function transport() {
  const source = fs.readFileSync(path.join(root, 'public/js/merchant-request.js'), 'utf8');
  return (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).merchantRequest;
}

test('transport rejects invalid responses and sends authenticated uncached requests', async () => {
  const merchantRequest = await transport();
  global.window = { auth: { currentUser: { getIdToken: async () => 'test-token' } } };
  let options;
  global.fetch = async (_, init) => {
    options = init;
    return { ok: true, json: async () => { throw new Error('HTML response'); } };
  };
  await assert.rejects(merchantRequest('/orders'), /invalid response/);
  assert.equal(options.headers.get('Authorization'), 'Bearer test-token');
  assert.equal(options.cache, 'no-store');
});

test('timed out mutations are not replayed', async () => {
  const merchantRequest = await transport();
  global.window = { auth: { currentUser: { getIdToken: async () => 'test-token' } } };
  let attempts = 0;
  global.fetch = async (_, { signal }) => {
    attempts++;
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
  };
  await assert.rejects(merchantRequest('/orders/one/status', { method: 'POST', body: '{}', timeoutMs: 5 }), /timed out/);
  assert.equal(attempts, 1);
});

test('unsigned users cannot send merchant requests', async () => {
  const merchantRequest = await transport();
  global.window = { auth: { currentUser: null } };
  global.fetch = () => assert.fail('unauthenticated request');
  await assert.rejects(merchantRequest('/orders'), { status: 401 });
});

test('a stalled token refresh is bounded by the request timeout', async () => {
  const merchantRequest = await transport();
  global.window = { auth: { currentUser: { getIdToken: () => new Promise(() => {}) } } };
  global.fetch = () => assert.fail('request must not start without a token');
  await assert.rejects(merchantRequest('/orders', { timeoutMs: 5 }), /timed out/);
});

test('sales comparisons require a positive baseline and stale totals clear together', async () => {
  const { context, elements } = page();
  context.merchantApi = async () => ({ today: { revenue: 32000, orders: 1 }, month: { aov: 32000 }, salesTrend: [{ revenue: 0 }, { revenue: 32000, orders: 1 }] });
  await context.loadComprehensiveStats();
  assert.equal(elements.get('salesTrend').textContent, 'No comparison available');
  assert.equal(elements.get('weeklyOrders').textContent, '1 order');
  context.merchantApi = async () => ({ today: { revenue: 50 }, salesTrend: [{ revenue: 100 }, { revenue: 50 }] });
  await context.loadComprehensiveStats();
  assert.equal(elements.get('salesTrend').textContent, '-50.0% vs yesterday');
  assert.equal(elements.get('salesTrend').dataset.direction, 'down');
  context.showNotification = () => {};
  context.console = { error() {} };
  context.merchantApi = async () => { throw new Error('Offline'); };
  await context.loadComprehensiveStats();
  for (const id of ['todaySales', 'orderCount', 'pendingOrders', 'weeklySales', 'weeklyOrders', 'salesTrend', 'avgOrderValue']) {
    assert.equal(elements.get(id).textContent, '—', id);
  }
});

test('appearance writes both preference keys and still changes when storage is blocked', () => {
  const { context, elements } = page();
  const classes = new Set();
  context.document.documentElement = { classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); } } };
  const saved = new Map();
  context.localStorage.setItem = (key, value) => saved.set(key, value);
  context.toggleDarkMode(true);
  assert.equal(saved.get('theme'), 'dark');
  assert.equal(saved.get('smartsoko_theme'), 'dark');
  assert.equal(elements.get('darkModeToggle').checked, true);
  context.localStorage.setItem = () => { throw new Error('Blocked storage'); };
  assert.doesNotThrow(() => context.toggleDarkMode(false));
  assert.equal(classes.has('light'), true);
  assert.equal(classes.has('dark'), false);
  assert.equal(elements.get('darkModeToggle').checked, false);
  const source = fs.readFileSync(path.join(root, 'public/js/merchant-app.js'), 'utf8');
  assert.match(source, /window\.toggleDarkMode \|\|= function/);
});
