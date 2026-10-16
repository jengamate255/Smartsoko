/**
 * Order Confirmation Module
 * Reusable order confirmation modal with animations and order details
 * Can be used across checkout, track-order, and merchant dashboard
 */

console.log('[OrderConfirmation] Module starting to load...');

// ===== CSS INJECTION =====
const ORDER_CONFIRMATION_STYLES = `
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.order-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.3s ease;
}

.order-confirm-modal {
  background: var(--surface-card, #FFFFFF);
  border-radius: var(--radius-lg, 20px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  border: 1px solid var(--border, #E2E8F0);
}

.order-confirm-header {
  text-align: center;
  padding: 24px 20px 16px;
  position: relative;
}

.order-confirm-success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary, #064E3B), var(--primary-light, #10B981));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 8px 32px rgba(6, 78, 59, 0.3);
}

.order-confirm-success-icon .material-symbols-outlined {
  font-size: 40px;
  color: white;
  font-variation-settings: 'FILL' 1;
}

.order-confirm-title {
  font-family: var(--font-heading, 'Montserrat');
  font-weight: 700;
  font-size: 22px;
  color: var(--on-surface, #0F172A);
  margin-bottom: 6px;
}

.order-confirm-subtitle {
  font-size: 14px;
  color: var(--on-surface-secondary, #475569);
  margin-bottom: 8px;
}

.order-confirm-order-id {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--primary-container, #D1FAE5);
  color: var(--primary, #064E3B);
  border-radius: var(--radius-pill, 999px);
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-heading, 'Montserrat');
}

.order-confirm-body {
  padding: 0 20px 20px;
}

.order-confirm-section {
  margin-bottom: 20px;
}

.order-confirm-section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--on-surface-muted, #94A3B8);
  margin-bottom: 12px;
}

.order-confirm-items {
  border: 1px solid var(--border, #E2E8F0);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  background: var(--surface, #FAFAF8);
}

.order-confirm-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border, #E2E8F0);
}

.order-confirm-item:last-child {
  border-bottom: none;
}

.order-confirm-item-image {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm, 8px);
  background: var(--surface-dim, #F1F5F9);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.order-confirm-item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-confirm-item-image .material-symbols-outlined {
  font-size: 24px;
  color: var(--on-surface-muted, #94A3B8);
}

.order-confirm-item-details {
  flex: 1;
  min-width: 0;
}

.order-confirm-item-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--on-surface, #0F172A);
  margin-bottom: 2px;
}

.order-confirm-item-qty {
  font-size: 12px;
  color: var(--on-surface-secondary, #475569);
}

.order-confirm-item-price {
  font-family: var(--font-heading, 'Montserrat');
  font-weight: 700;
  font-size: 15px;
  color: var(--on-surface, #0F172A);
}

.order-confirm-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
  background: var(--surface-dim, #F1F5F9);
  border-radius: var(--radius-md, 12px);
}

.order-confirm-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.order-confirm-summary-row.total {
  grid-column: 1 / -1;
  border-top: 2px solid var(--border, #E2E8F0);
  padding-top: 16px;
  margin-top: 8px;
}

.order-confirm-summary-label {
  font-size: 13px;
  color: var(--on-surface-secondary, #475569);
}

.order-confirm-summary-value {
  font-weight: 600;
  font-size: 14px;
  color: var(--on-surface, #0F172A);
}

.order-confirm-summary-row.total .order-confirm-summary-label,
.order-confirm-summary-row.total .order-confirm-summary-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--primary, #064E3B);
  font-family: var(--font-heading, 'Montserrat');
}

.order-confirm-estimated {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--primary-container, #D1FAE5);
  border-radius: var(--radius-md, 12px);
  border: 1px solid var(--primary-light, #10B981);
}

.order-confirm-estimated-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm, 8px);
  background: var(--primary, #064E3B);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.order-confirm-estimated-icon .material-symbols-outlined {
  font-size: 20px;
}

.order-confirm-estimated-text {
  flex: 1;
}

.order-confirm-estimated-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary, #064E3B);
  margin-bottom: 2px;
}

.order-confirm-estimated-time {
  font-family: var(--font-heading, 'Montserrat');
  font-weight: 700;
  font-size: 18px;
  color: var(--primary, #064E3B);
}

.order-confirm-estimated-date {
  font-size: 12px;
  color: var(--on-surface-secondary, #475569);
  margin-top: 2px;
}

.order-confirm-footer {
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-confirm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: var(--radius-pill, 999px);
  font-family: var(--font-body, 'Inter');
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  min-height: 48px;
  text-decoration: none;
}

.order-confirm-btn-primary {
  background: linear-gradient(135deg, var(--primary, #064E3B), var(--primary-light, #10B981));
  color: white;
  box-shadow: 0 4px 16px rgba(6, 78, 59, 0.3);
}

.order-confirm-btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(6, 78, 59, 0.4);
}

.order-confirm-btn-primary:active {
  transform: scale(0.98);
}

.order-confirm-btn-secondary {
  background: var(--surface-dim, #F1F5F9);
  color: var(--on-surface, #0F172A);
  border: 1px solid var(--border, #E2E8F0);
}

.order-confirm-btn-secondary:hover {
  background: var(--border, #E2E8F0);
}

.order-confirm-btn:focus-visible {
  outline: 2px solid var(--primary, #064E3B);
  outline-offset: 2px;
}

.order-confirm-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--surface-dim, #F1F5F9);
  border: none;
  color: var(--on-surface-muted, #94A3B8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  z-index: 10;
}

.order-confirm-close:hover {
  background: var(--border, #E2E8F0);
  color: var(--on-surface, #0F172A);
}

.order-confirm-close .material-symbols-outlined {
  font-size: 20px;
}

@media (prefers-reduced-motion: reduce) {
  .order-confirm-modal,
  .order-confirm-overlay,
  .order-confirm-success-icon {
    animation: none !important;
  }
}

@media (max-width: 480px) {
  .order-confirm-modal {
    max-width: 100%;
    border-radius: 0;
    max-height: 100vh;
  }
  .order-confirm-overlay {
    align-items: flex-end;
    padding: 0;
  }
  .order-confirm-modal {
    border-radius: 20px 20px 0 0;
  }
}
`;

// Inject styles once
let stylesInjected = false;
function injectStyles() {
  if (!stylesInjected) {
    const style = document.createElement('style');
    style.textContent = ORDER_CONFIRMATION_STYLES;
    document.head.appendChild(style);
    stylesInjected = true;
  }
}

// ===== ORDER CONFIRMATION CLASS =====
export class OrderConfirmation {
  constructor(options = {}) {
    this.orderData = options.orderData || {};
    this.onTrack = options.onTrack || (() => {});
    this.onContinue = options.onContinue || (() => {});
    this.onClose = options.onClose || (() => {});
    this.autoClose = options.autoClose !== false;
    this.modal = null;
    this.overlay = null;
  }

  /**
   * Show the order confirmation modal
   * @param {Object} orderData - Order information
   */
  show(orderData = {}) {
    this.orderData = { ...this.orderData, ...orderData };
    injectStyles();
    this.render();
    this.bindEvents();
    this.animateIn();
  }

  /**
   * Render the modal HTML
   */
  render() {
    const {
      orderId = this.generateOrderId(),
      items = [],
      subtotal = 0,
      deliveryFee = 0,
      discount = 0,
      total = 0,
      estimatedDelivery = '30-45 min',
      estimatedDate = 'Today',
      restaurantName = 'SmartSoko Restaurant',
      restaurantImage = null,
      paymentMethod = 'Mobile Money',
      status = 'confirmed'
    } = this.orderData;

    // Generate items HTML - use a helper function to avoid nested template literals
    const itemsHtml = items.length > 0
      ? items.map(item => this.renderItem(item)).join('')
      : '<div class="order-confirm-item" style="justify-content:center;padding:24px;"><span class="material-symbols-outlined" style="color:var(--on-surface-muted);">restaurant</span><span style="color:var(--on-surface-muted);">No items</span></div>';

    const summaryRows = [
      { label: 'Subtotal', value: 'TSh ' + subtotal.toLocaleString() },
      { label: 'Delivery Fee', value: 'TSh ' + deliveryFee.toLocaleString() },
    ];

    if (discount > 0) {
      summaryRows.push({ label: 'Discount', value: '-TSh ' + discount.toLocaleString() });
    }

    summaryRows.push({ label: 'Total', value: 'TSh ' + total.toLocaleString(), total: true });

    const summaryHtml = summaryRows.map(row => 
      '<div class="order-confirm-summary-row' + (row.total ? ' total' : '') + '">' +
        '<span class="order-confirm-summary-label">' + row.label + '</span>' +
        '<span class="order-confirm-summary-value">' + row.value + '</span>' +
      '</div>'
    ).join('');

    // Status-specific content
    const statusConfig = {
      confirmed: { icon: 'check_circle', title: 'Order Confirmed!', subtitle: 'Your order has been received and is being prepared.', estimatedLabel: 'Estimated Ready', estimatedTime: estimatedDelivery, estimatedDate: estimatedDate },
      preparing: { icon: 'restaurant', title: 'Order Being Prepared', subtitle: 'The kitchen is cooking your delicious meal.', estimatedLabel: 'Estimated Ready', estimatedTime: estimatedDelivery, estimatedDate: estimatedDate },
      ready: { icon: 'check_circle', title: 'Order Ready!', subtitle: 'Your order is ready for pickup/delivery.', estimatedLabel: 'Estimated Delivery', estimatedTime: estimatedDelivery, estimatedDate: estimatedDate },
      dispatched: { icon: 'local_shipping', title: 'Order Dispatched!', subtitle: 'Your order is on the way.', estimatedLabel: 'Estimated Delivery', estimatedTime: estimatedDelivery, estimatedDate: estimatedDate },
      delivered: { icon: 'check_circle', title: 'Delivered!', subtitle: 'Thank you for your order. Enjoy your meal!', estimatedLabel: 'Delivered At', estimatedTime: estimatedDelivery, estimatedDate: estimatedDate }
    };

    const config = statusConfig[status] || statusConfig.confirmed;

    // Build modal HTML using string concatenation to avoid nested template literals
    const modalHtml = 
      '<div class="order-confirm-overlay" id="orderConfirmOverlay">' +
        '<div class="order-confirm-modal" id="orderConfirmModal" role="dialog" aria-modal="true" aria-labelledby="orderConfirmTitle">' +
          '<button class="order-confirm-close" id="orderConfirmClose" aria-label="Close"><span class="material-symbols-outlined">close</span></button>' +
          '<div class="order-confirm-header">' +
            '<div class="order-confirm-success-icon"><span class="material-symbols-outlined">' + config.icon + '</span></div>' +
            '<h2 class="order-confirm-title" id="orderConfirmTitle">' + config.title + '</h2>' +
            '<p class="order-confirm-subtitle">' + config.subtitle + '</p>' +
            '<div class="order-confirm-order-id"><span class="material-symbols-outlined" style="font-size:14px;">receipt_long</span>Order #' + orderId + '</div>' +
          '</div>' +
          '<div class="order-confirm-body">' +
            (items.length > 0 ? 
              '<div class="order-confirm-section"><div class="order-confirm-section-title">Items Ordered</div><div class="order-confirm-items">' + itemsHtml + '</div></div>'
            : '') +
            '<div class="order-confirm-section">' +
              '<div class="order-confirm-section-title">Order Summary</div>' +
              '<div class="order-confirm-summary">' + summaryHtml + '</div>' +
            '</div>' +
            '<div class="order-confirm-section">' +
              '<div class="order-confirm-section-title">' + config.estimatedLabel + '</div>' +
              '<div class="order-confirm-estimated">' +
                '<div class="order-confirm-estimated-icon"><span class="material-symbols-outlined">schedule</span></div>' +
                '<div class="order-confirm-estimated-text">' +
                  '<div class="order-confirm-estimated-label">' + config.estimatedLabel + '</div>' +
                  '<div class="order-confirm-estimated-time">' + config.estimatedTime + '</div>' +
                  '<div class="order-confirm-estimated-date">' + config.estimatedDate + '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="order-confirm-footer">' +
            '<a href="/track-order?orderId=' + encodeURIComponent(this.orderData.orderId || orderId) + '" class="order-confirm-btn order-confirm-btn-primary" id="orderConfirmTrack"><span class="material-symbols-outlined">local_shipping</span>Track Order</a>' +
            '<button class="order-confirm-btn order-confirm-btn-secondary" id="orderConfirmContinue"><span class="material-symbols-outlined">shopping_bag</span>Continue Shopping</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Remove existing modal if any
    const existing = document.getElementById('orderConfirmOverlay');
    if (existing) existing.remove();

    this.overlay = document.createElement('div');
    this.overlay.innerHTML = modalHtml;
    document.body.appendChild(this.overlay.firstElementChild);
    this.overlay = document.getElementById('orderConfirmOverlay');
    this.modal = document.getElementById('orderConfirmModal');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  // Helper to render a single item (avoids nested template literals)
  renderItem(item) {
    const imageHtml = item.image 
      ? '<img src="' + item.image + '" alt="' + this.escapeHtml(item.name) + '" loading="lazy">'
      : '<span class="material-symbols-outlined">restaurant</span>';
    return '<div class="order-confirm-item">' +
      '<div class="order-confirm-item-image">' + imageHtml + '</div>' +
      '<div class="order-confirm-item-details">' +
        '<div class="order-confirm-item-name">' + this.escapeHtml(item.name) + '</div>' +
        '<div class="order-confirm-item-qty">Qty: ' + (item.quantity || 1) + '</div>' +
      '</div>' +
      '<div class="order-confirm-item-price">TSh ' + (item.price * (item.quantity || 1)).toLocaleString() + '</div>' +
    '</div>';
  }

  bindEvents() {
    const closeBtn = this.overlay.querySelector('#orderConfirmClose');
    const trackBtn = this.overlay.querySelector('#orderConfirmTrack');
    const continueBtn = this.overlay.querySelector('#orderConfirmContinue');

    // Close on X button
    closeBtn?.addEventListener('click', () => this.close());

    // Close on overlay click
    this.overlay?.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Track order button
    trackBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.close();
      this.onTrack(this.orderData);
    });

    // Continue shopping button
    continueBtn?.addEventListener('click', () => {
      this.close();
      this.onContinue(this.orderData);
    });

    // Escape key to close
    this.keydownHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  animateIn() {
    // Already handled by CSS animation
    // Could add extra JS animations here if needed
  }

  close() {
    if (!this.overlay) return;

    this.overlay.style.animation = 'fadeIn 0.2s ease reverse';
    if (this.modal) this.modal.style.animation = 'slideUp 0.3s ease reverse';

    setTimeout(() => {
      this.overlay?.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', this.keydownHandler);
      this.onClose();
    }, 200);
  }

  destroy() {
    this.close();
    this.overlay = null;
    this.modal = null;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  generateOrderId() {
    return 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Show order confirmation modal
 * @param {Object} orderData - Order data
 * @param {Object} options - Callback options
 */
export function showOrderConfirmation(orderData, options = {}) {
  const confirmation = new OrderConfirmation(options);
  confirmation.show(orderData);
  return confirmation;
}

/**
 * Quick confirmation for checkout flow
 */
export function confirmOrderPlaced(orderId, items, total, estimatedDelivery = '30-45 min') {
  return showOrderConfirmation({
    orderId,
    items,
    total,
    estimatedDelivery,
    status: 'confirmed'
  }, {
    onTrack: (data) => {
      window.location.href = `/track-order?orderId=${encodeURIComponent(data.orderId || orderId)}`;
    },
    onContinue: () => {
      window.location.href = '/home.html';
    }
  });
}

/**
 * Show delivery confirmation (for track-order page)
 */
export function showDeliveryConfirmation(orderId, options = {}) {
  return showOrderConfirmation({
    orderId,
    status: 'delivered',
    estimatedDelivery: 'Just now',
    estimatedDate: 'Just now'
  }, {
    onTrack: () => window.location.href = '/orders.html',
    onContinue: () => window.location.href = '/home.html',
    ...options
  });
}

// Export for global access
if (typeof window !== 'undefined') {
  window.OrderConfirmation = OrderConfirmation;
  window.showOrderConfirmation = showOrderConfirmation;
  window.confirmOrderPlaced = confirmOrderPlaced;
  window.showDeliveryConfirmation = showDeliveryConfirmation;
  console.log('[OrderConfirmation] Module loaded successfully');
}