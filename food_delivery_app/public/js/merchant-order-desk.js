/* Order desk controller. Uses the page's authenticated merchantApi and tenant state. */
'use strict';

let ordersRequestSequence = 0;
let ordersReadScope = null;
let ordersLoaded = false;
let ordersLoadFailed = false;
let ordersLastSynced = null;
let ordersWriteDenied = false;
let ordersActionError = '';
let ordersCapped = false;
let orderDetailSignature = null;
const orderTransitionHints = new Map();
const pendingOrderUpdates = new Set();
const ORDER_TIME_ZONE = 'Africa/Dar_es_Salaam';
const ORDER_CURRENCY = new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 });
const ORDER_STATUS_ALIASES = { confirmed: 'accepted', dispatched: 'in_transit', ready: 'ready_for_delivery', pickedup: 'picked_up', topup_completed: 'completed' };
const ORDER_STATUS_LABELS = { pending: 'Needs acceptance', accepted: 'Accepted', preparing: 'Preparing', ready_for_delivery: 'Ready for handoff', assigned: 'Driver assigned', picked_up: 'Picked up', in_transit: 'On the way', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled', refunded: 'Refunded' };

function orderStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return ORDER_STATUS_ALIASES[status] || status || 'unknown';
}

function orderTimestamp(value) {
  if (!value) return null;
  const date = typeof value.toDate === 'function' ? value.toDate()
    : typeof value === 'object' && (value.seconds != null || value._seconds != null)
      ? new Date(Number(value.seconds ?? value._seconds) * 1000) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function orderAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? 'TSh ' + ORDER_CURRENCY.format(amount) : '—';
}

function orderBusinessDate(value) {
  const date = orderTimestamp(value);
  return date ? new Intl.DateTimeFormat('en-CA', { timeZone: ORDER_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) : '';
}

function orderAge(order, now = Date.now()) {
  const created = orderTimestamp(order.createdAt);
  if (!created || created.getTime() > now) return { minutes: null, attention: false, label: 'Time unavailable' };
  const minutes = Math.floor((now - created.getTime()) / 60000);
  const pending = orderStatus(order.status) === 'pending';
  const elapsed = minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m` : minutes < 1440
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${Math.floor(minutes / 1440)}d`;
  return { minutes, attention: pending && minutes >= 10, label: pending && minutes > 0 ? `${elapsed} awaiting acceptance` : elapsed };
}

function visibleDeskOrders(orders, query = '', sort = 'attention', now = Date.now()) {
  const needle = String(query).trim().toLocaleLowerCase();
  const digits = needle.replace(/\D/g, '');
  const rows = orders.filter(order => {
    if (!needle) return true;
    const text = [order.id, order.customerName, order.customerPhone, order.customer_phone].join(' ').toLocaleLowerCase();
    const phone = String(order.customerPhone || order.customer_phone || '').replace(/\D/g, '');
    return text.includes(needle) || (digits.length >= 3 && /^[+\d\s()-]+$/.test(needle) && phone.includes(digits));
  });
  const rank = order => {
    const status = orderStatus(order.status);
    if (orderAge(order, now).attention) return 0;
    return { pending: 1, accepted: 2, preparing: 3, ready_for_delivery: 4, assigned: 5, picked_up: 6, in_transit: 7 }[status] ?? 8;
  };
  return rows.slice().sort((a, b) => {
    const timeA = orderTimestamp(a.createdAt)?.getTime() ?? 0;
    const timeB = orderTimestamp(b.createdAt)?.getTime() ?? 0;
    if (sort === 'oldest') return timeA - timeB;
    if (sort === 'attention') {
      const priority = rank(a) - rank(b);
      if (priority) return priority;
      if (orderStatus(a.status) === 'pending' && orderStatus(b.status) === 'pending') return timeA - timeB;
    }
    return timeB - timeA;
  });
}

function deskQuery() { return document.getElementById('merchantOrderSearch')?.value || ''; }
function deskSort() { return document.getElementById('merchantOrderSort')?.value || 'attention'; }

function updateDeskMeta(visible = null) {
  const message = document.getElementById('merchantOrderSync');
  if (message) {
    message.textContent = ordersLoadFailed ? 'Updates paused · refresh before making changes'
      : ordersLastSynced ? 'Updated ' + new Intl.DateTimeFormat('en-GB', { timeZone: ORDER_TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(ordersLastSynced) + ' EAT'
        : 'Waiting for store connection';
    message.dataset.state = ordersLoadFailed ? 'stale' : ordersLastSynced ? 'synced' : 'waiting';
  }
  const results = document.getElementById('merchantOrderResults');
  if (results) results.textContent = visible == null ? '' : `${visible} shown · ${allOrders.length} loaded`;
  const limit = document.getElementById('merchantOrderLimit');
  if (limit) limit.hidden = !ordersCapped;
  const stale = document.getElementById('merchantOrderStale');
  if (stale) {
    stale.hidden = !ordersLoadFailed && !ordersWriteDenied && !ordersActionError;
    const text = document.getElementById('merchantOrderStaleText');
    if (text) text.textContent = ordersWriteDenied ? 'Your account cannot change orders. Contact your store owner for access.'
      : ordersActionError || 'The last refresh failed. This is the last saved snapshot; refresh before changing orders.';
  }
}

async function loadOrders(statusFilter = currentOrderFilter, dateFilter = document.getElementById('orderDateFilter')?.value || '') {
  if (!currentSeller) return false;
  const sequence = ++ordersRequestSequence;
  const scope = `${statusFilter}|${dateFilter}`;
  const sameScope = ordersReadScope === scope && ordersLoaded;
  const list = document.getElementById('ordersList');
  list?.setAttribute('aria-busy', 'true');
  if (!sameScope) {
    ordersLoaded = false;
    allOrders = [];
    selectedOrderId = null;
    orderTransitionHints.clear();
    updateSelectedDeskOrder();
    if (list) list.innerHTML = '<div class="mw-loading" role="status"><span class="material-symbols-outlined" aria-hidden="true">receipt_long</span><p>Loading orders…</p></div>';
    const results = document.getElementById('merchantOrderResults');
    if (results) results.textContent = '';
  }
  const sync = document.getElementById('merchantOrderSync');
  if (sync) { sync.textContent = 'Updating orders…'; sync.dataset.state = 'loading'; }
  try {
    const params = new URLSearchParams({ limit: '500' });
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    const body = await merchantApi('/orders?' + params, { envelope: true });
    if (sequence !== ordersRequestSequence) return false;
    const rows = Array.isArray(body) ? body : body?.data;
    if (!Array.isArray(rows)) throw new Error('The server returned an invalid order list.');
    if (rows.some(order => !order || typeof order !== 'object' || order.id == null)) throw new Error('The server returned incomplete order data.');
    ordersCapped = rows.length >= 500;
    orderTransitionHints.clear();
    for (const order of rows) {
      const hints = body?.allowedTransitionsHint?.[order.id];
      if (Array.isArray(hints)) orderTransitionHints.set(String(order.id), hints.map(orderStatus));
    }
    allOrders = dateFilter ? rows.filter(order => orderBusinessDate(order.createdAt) === dateFilter) : rows;
    ordersLoaded = true;
    ordersLoadFailed = false;
    ordersActionError = '';
    ordersReadScope = scope;
    ordersLastSynced = new Date();
    displayOrders(allOrders);
    updateSelectedDeskOrder();
    return true;
  } catch (error) {
    if (sequence !== ordersRequestSequence) return false;
    ordersLoadFailed = true;
    if (sameScope) {
      displayOrders(allOrders);
      updateSelectedDeskOrder();
    } else {
      allOrders = [];
      ordersLoaded = false;
      orderTransitionHints.clear();
      selectedOrderId = null;
      if (list) list.innerHTML = `<div role="alert" class="mw-desk-empty"><span class="material-symbols-outlined" aria-hidden="true">cloud_off</span><h3>Orders are temporarily unavailable</h3><p>${escapeHtml(error.message)}</p><button type="button" class="mw-button" onclick="refreshOrders()">Try again</button></div>`;
      updateSelectedDeskOrder();
    }
    updateDeskMeta();
    return false;
  } finally {
    if (sequence === ordersRequestSequence) list?.removeAttribute('aria-busy');
  }
}

function displayOrders(orders) {
  const container = document.getElementById('ordersList');
  if (!container) return;
  const rows = visibleDeskOrders(orders, deskQuery(), deskSort());
  const focused = document.activeElement?.closest?.('[data-order-id]');
  const focusedId = focused?.dataset.orderId;
  const focusedAction = document.activeElement?.dataset?.orderAction;
  updateDeskMeta(rows.length);
  if (!rows.length) {
    const filtered = !!deskQuery().trim() || currentOrderFilter !== 'all' || !!document.getElementById('orderDateFilter')?.value;
    container.innerHTML = `<div class="mw-desk-empty"><span class="material-symbols-outlined" aria-hidden="true">${filtered ? 'search_off' : 'receipt_long'}</span><h3>${filtered ? 'No matching orders' : 'Your next order starts here'}</h3><p>${filtered ? 'Try another customer, order ID, status, or date. Search covers the orders loaded for this view.' : 'Customer orders will appear here. New orders refresh automatically while this page is open.'}</p>${filtered ? '<button type="button" class="mw-button" onclick="clearDeskFilters()">Clear filters</button>' : ''}</div>`;
    return;
  }
  container.innerHTML = rows.map(order => {
    const id = escapeHtml(String(order.id));
    const status = orderStatus(order.status);
    const age = orderAge(order);
    const date = orderTimestamp(order.createdAt);
    const time = date ? new Intl.DateTimeFormat('en-GB', { timeZone: ORDER_TIME_ZONE, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date) : 'Time unavailable';
    const items = Array.isArray(order.items) ? order.items : [];
    const itemSummary = items.slice(0, 2).map(item => `${Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1} × ${String(item.name || 'Item')}`).join(', ');
    return `<article class="mw-order-card${age.attention ? ' mw-order-card--attention' : ''}" data-order-id="${id}" tabindex="0" aria-label="View order ${escapeHtml(String(order.id).slice(-8))}" aria-current="${selectedOrderId === order.id}">
      <div class="mw-order-card-top"><button type="button" class="mw-order-reference" data-order-select="${id}">#${escapeHtml(String(order.id).slice(-8))}</button><span class="mw-order-status" data-status="${escapeHtml(status)}">${escapeHtml(ORDER_STATUS_LABELS[status] || 'Status unavailable')}</span><strong class="mw-order-total">${orderAmount(order.total ?? order.totalAmount)}</strong></div>
      <div class="mw-order-customer">${escapeHtml(order.customerName || 'Customer')}<span>${escapeHtml(itemSummary || 'Open order for item details')}${items.length > 2 ? ` +${items.length - 2} more` : ''}</span></div>
      <div class="mw-order-card-bottom"><div><span class="mw-order-age${age.attention ? ' mw-order-age--attention' : ''}"${age.attention ? ' title="Pending acceptance for at least 10 minutes"' : ''}>${escapeHtml(age.label)}</span><time>${escapeHtml(time)}${date ? ' EAT' : ''}</time></div><div class="mw-order-card-actions">${getOrderActions(order)}</div></div>
    </article>`;
  }).join('');
  if (focusedId) {
    const card = Array.from(container.querySelectorAll('[data-order-id]')).find(item => item.dataset.orderId === focusedId);
    const action = focusedAction && Array.from(card?.querySelectorAll('[data-order-action]') || []).find(item => item.dataset.orderAction === focusedAction);
    (action || card)?.focus({ preventScroll: true });
  }
}

function clearDeskFilters() {
  const search = document.getElementById('merchantOrderSearch');
  if (search) search.value = '';
  const date = document.getElementById('orderDateFilter');
  if (date) date.value = '';
  filterOrdersByStatus('all');
}

function filterDeskOrders() {
  if (!ordersLoaded) return;
  displayOrders(allOrders);
  const selectedVisible = visibleDeskOrders(allOrders, deskQuery(), deskSort()).some(order => order.id === selectedOrderId);
  if (selectedOrderId && !selectedVisible) { selectedOrderId = null; updateSelectedDeskOrder(); }
}

function deskOrderActions(order, includeCancellation = false) {
  const allowed = orderTransitionHints.get(String(order.id)) || [];
  const status = orderStatus(order.status);
  const pickup = ['pickup', 'collection', 'walk_in', 'walk-in'].includes(String(order.fulfillmentType || order.deliveryType || order.orderType || '').toLowerCase());
  const primary = { pending: ['accepted', 'Accept order'], accepted: ['preparing', 'Start preparing'], preparing: ['ready_for_delivery', 'Mark ready'], delivered: ['completed', 'Complete order'] }[status]
    || (status === 'ready_for_delivery' && pickup ? ['completed', 'Complete pickup'] : null);
  const actions = primary && allowed.includes(primary[0]) ? [primary] : [];
  if (includeCancellation && allowed.includes('cancelled')) actions.push(['cancelled', status === 'pending' ? 'Decline order' : 'Cancel order']);
  return actions;
}

function deskActionButtons(order, includeCancellation) {
  const id = escapeHtml(String(order.id));
  const busy = pendingOrderUpdates.has(String(order.id));
  const disabled = busy || ordersLoadFailed || ordersWriteDenied;
  return deskOrderActions(order, includeCancellation).map(([status, label]) => `<button type="button" data-order-action="${status}" data-order-target="${id}" class="mw-order-action${status === 'cancelled' ? ' mw-order-action--cancel' : ''}"${disabled ? ' disabled' : ''}${busy ? ' aria-busy="true"' : ''}>${busy ? 'Saving…' : label}</button>`).join('');
}

function getOrderActions(order) { return deskActionButtons(order, false); }
function getOrderDetailActions(order) {
  const message = { completed: 'This order is complete.', cancelled: 'This order was cancelled.', refunded: 'This order was refunded.', ready_for_delivery: 'Ready for driver assignment and handoff.', assigned: 'The assigned driver will update delivery progress.', picked_up: 'The driver has collected this order.', in_transit: 'The driver is delivering this order.' }[orderStatus(order.status)] || 'No merchant action is available. Refresh to check the latest status.';
  return deskActionButtons(order, true) || `<p class="mw-order-handoff">${message}</p>`;
}

function selectOrder(orderId) {
  const order = allOrders.find(item => String(item.id) === String(orderId));
  if (!order) return;
  selectedOrderId = order.id;
  for (const card of document.querySelectorAll('#ordersList [data-order-id]')) card.setAttribute('aria-current', String(card.dataset.orderId === String(order.id)));
  displayOrderDetails(order);
  const panel = document.getElementById('orderDetailsPanel');
  if (window.matchMedia?.('(max-width: 640px)').matches) {
    panel?.focus({ preventScroll: true });
    panel?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
}

function updateSelectedDeskOrder() {
  const order = allOrders.find(item => item.id === selectedOrderId);
  if (order) displayOrderDetails(order);
  else {
    selectedOrderId = null;
    orderDetailSignature = null;
    const panel = document.getElementById('orderDetailsPanel');
    if (panel) panel.innerHTML = '<div class="mw-detail-placeholder"><span class="material-symbols-outlined" aria-hidden="true">receipt_long</span><strong>A closer look at every order</strong><p>Select an order to see its items, customer, and next steps.</p></div>';
  }
}

function returnToDeskList() {
  const card = Array.from(document.querySelectorAll('#ordersList [data-order-id]')).find(item => item.dataset.orderId === String(selectedOrderId));
  const target = card || document.getElementById('merchantOrderSearch');
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: 'center', behavior: 'instant' });
}

function displayOrderDetails(order) {
  const panel = document.getElementById('orderDetailsPanel');
  if (!panel) return;
  const signature = JSON.stringify([order, orderTransitionHints.get(String(order.id)), ordersLoadFailed, ordersWriteDenied, pendingOrderUpdates.has(String(order.id))]);
  if (signature === orderDetailSignature) return;
  orderDetailSignature = signature;
  const focused = document.activeElement;
  const focusedInPanel = focused?.closest?.('#orderDetailsPanel');
  const focusedAction = focused?.dataset?.orderAction;
  const status = orderStatus(order.status);
  const items = Array.isArray(order.items) ? order.items : [];
  const address = order.deliveryAddress || order.customerAddress || order.delivery_address;
  const addressText = address && typeof address === 'object' ? [address.street || address.line1, address.city, address.area].filter(Boolean).join(', ') : String(address || 'No delivery address recorded');
  const phone = String(order.customerPhone || order.customer_phone || '');
  panel.innerHTML = `<button type="button" class="mw-order-back" onclick="returnToDeskList()">↑ Back to orders</button><div class="mw-order-detail-body">
    <div class="mw-order-detail-heading"><span>ORDER #${escapeHtml(String(order.id).slice(-8))}</span><span class="mw-order-status" data-status="${escapeHtml(status)}">${escapeHtml(ORDER_STATUS_LABELS[status] || 'Status unavailable')}</span></div>
    <section><h4>Customer</h4><strong>${escapeHtml(order.customerName || 'Customer')}</strong><p>${escapeHtml(phone || 'No phone recorded')}</p><p>${escapeHtml(addressText)}</p></section>
    <section><h4>Items</h4>${items.map(item => {
      const quantity = Number.isFinite(Number(item.quantity)) && Number(item.quantity) >= 0 ? Number(item.quantity) : 1;
      return `<div class="mw-order-item"><span>${escapeHtml(item.name || 'Item')} <small>× ${quantity}</small></span><strong>${orderAmount(Number(item.price) * quantity)}</strong></div>`;
    }).join('') || '<p>Item details are unavailable.</p>'}</section>
    <section><div class="mw-order-detail-total"><span>Order total</span><strong>${orderAmount(order.total ?? order.totalAmount)}</strong></div><p>Payment: ${escapeHtml(String(order.paymentStatus || order.payment_status || 'not recorded').replace(/_/g, ' '))}</p></section>
    <section><h4>Next step</h4><div class="mw-order-detail-actions">${getOrderDetailActions(order)}</div></section>
    <a class="mw-order-chat" href="/chat?orderId=${encodeURIComponent(String(order.id))}">Open customer chat <span aria-hidden="true">↗</span></a>
  </div>`;
  if (focusedInPanel) {
    const replacement = focusedAction && Array.from(panel.querySelectorAll('[data-order-action]')).find(button => button.dataset.orderAction === focusedAction);
    (replacement || panel).focus({ preventScroll: true });
  }
}

async function updateOrderStatus(orderId, newStatus) {
  const id = String(orderId);
  if (pendingOrderUpdates.has(id) || ordersLoadFailed || ordersWriteDenied) return false;
  const allowed = orderTransitionHints.get(id) || [];
  if (!allowed.includes(newStatus)) {
    showNotification('This action is no longer available. Refresh the order first.', 'error');
    return false;
  }
  if (newStatus === 'cancelled' && !window.confirm('Cancel this order? The customer will no longer receive it.')) return false;
  const order = allOrders.find(item => String(item.id) === id);
  if (newStatus === 'completed' && orderStatus(order?.status) === 'ready_for_delivery' && !window.confirm('Confirm the customer has collected this pickup order.')) return false;
  pendingOrderUpdates.add(id);
  ordersActionError = '';
  displayOrders(allOrders);
  updateSelectedDeskOrder();
  try {
    const result = await merchantApi('/orders/' + encodeURIComponent(id) + '/status', { method: 'POST', body: JSON.stringify({ status: newStatus }) });
    if (order) order.status = result.status || newStatus;
    orderTransitionHints.set(id, Array.isArray(result.allowedNextStatuses) ? result.allowedNextStatuses.map(orderStatus) : []);
    pendingOrderUpdates.delete(id);
    displayOrders(allOrders);
    updateSelectedDeskOrder();
    showNotification('Order updated: ' + (ORDER_STATUS_LABELS[orderStatus(result.status || newStatus)] || newStatus), 'success');
    await refreshOrders();
    return true;
  } catch (error) {
    if (error.status === 403) ordersWriteDenied = true;
    ordersActionError = 'Could not confirm the update. Refresh to check the saved order before trying again. ' + error.message;
    ordersLoadFailed = true;
    showNotification(ordersActionError, 'error');
    return false;
  } finally {
    pendingOrderUpdates.delete(id);
    displayOrders(allOrders);
    updateSelectedDeskOrder();
  }
}
