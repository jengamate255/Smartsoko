/**
 * SmartSoko Button Component System
 * Material 3 compliant buttons with all variants
 * Usage: <button class="btn btn-primary">Primary</button>
 *        <button class="btn btn-secondary">Secondary</button>
 *        <button class="btn btn-tertiary">Tertiary</button>
 *        <button class="btn btn-destructive">Delete</button>
 *        <button class="btn btn-icon-only" aria-label="Favorite"><span class="material-symbols-outlined">favorite</span></button>
 *        <button class="btn btn-fab" aria-label="Add Product"><span class="material-symbols-outlined">add</span></button>
 */

(function() {
  'use strict';

  // Button CSS - injected once
  const buttonStyles = `
    /* ==========================================
       SMARTSOKO BUTTON SYSTEM - Material 3
       ========================================== */

    /* Base button styles */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      line-height: 20px;
      letter-spacing: 0.1px;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      text-decoration: none;
      white-space: nowrap;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    /* Focus visible for accessibility */
    .btn:focus-visible {
      outline: none;
      ring: 2px solid var(--color-primary, #064E3B);
      ring-offset: 2px;
    }

    /* Disabled state */
    .btn:disabled,
    .btn.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
      transform: none !important;
      box-shadow: none !important;
    }

    /* Active/pressed state */
    .btn:active:not(:disabled) {
      transform: scale(0.98);
    }

    /* Loading state */
    .btn.loading {
      position: relative;
      color: transparent !important;
      pointer-events: none;
    }

    .btn.loading::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: btn-spin 0.6s linear infinite;
    }

    @keyframes btn-spin {
      to { transform: rotate(360deg); }
    }

    /* Icon spacing */
    .btn .material-symbols-outlined {
      font-size: 18px;
      line-height: 1;
      display: inline-flex;
      flex-shrink: 0;
    }

    .btn .btn-icon-only {
      padding: 10px;
    }

    /* ==========================================
       VARIANT: PRIMARY (Filled)
       ========================================== */
    .btn-primary {
      background: linear-gradient(135deg, var(--color-primary, #064E3B) 0%, var(--color-primary-container, #059669) 100%);
      color: var(--color-on-primary, #ffffff);
      box-shadow: 0 2px 4px rgba(148, 74, 0, 0.2), 0 1px 2px rgba(148, 74, 0, 0.1);
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-primary, #064E3B) 0%, var(--color-primary, #064E3B) 100%);
      box-shadow: 0 4px 8px rgba(6, 78, 59, 0.3), 0 2px 4px rgba(148, 74, 0, 0.15);
      transform: translateY(-1px);
    }

    .btn-primary:active:not(:disabled) {
      background: var(--color-primary, #064E3B);
      transform: scale(0.98);
    }

    .btn-primary:focus-visible {
      box-shadow: 0 0 0 2px var(--color-surface, #ffffff), 0 0 0 4px var(--color-primary, #064E3B);
    }

    .btn-primary.loading::after {
      border-color: var(--color-on-primary, #ffffff);
      border-right-color: transparent;
    }

    /* ==========================================
       VARIANT: SECONDARY (Outlined)
       ========================================== */
    .btn-secondary {
      background: transparent;
      color: var(--color-primary, #064E3B);
      border: 2px solid var(--color-primary, #064E3B);
      box-shadow: none;
    }

    .btn-secondary:hover:not(:disabled) {
      background: rgba(148, 74, 0, 0.08);
      box-shadow: 0 2px 4px rgba(148, 74, 0, 0.1);
    }

    .btn-secondary:active:not(:disabled) {
      background: rgba(148, 74, 0, 0.12);
    }

    .btn-secondary:focus-visible {
      box-shadow: 0 0 0 2px var(--color-surface, #ffffff), 0 0 0 4px var(--color-primary, #064E3B);
    }

    /* ==========================================
       VARIANT: TERTIARY (Text)
       ========================================== */
    .btn-tertiary {
      background: transparent;
      color: var(--color-primary, #064E3B);
      border: none;
      box-shadow: none;
      padding: 10px 16px;
    }

    .btn-tertiary:hover:not(:disabled) {
      background: rgba(148, 74, 0, 0.08);
    }

    .btn-tertiary:active:not(:disabled) {
      background: rgba(148, 74, 0, 0.12);
    }

    .btn-tertiary:focus-visible {
      box-shadow: 0 0 0 2px var(--color-surface, #ffffff), 0 0 0 4px var(--color-primary, #064E3B);
      border-radius: 12px;
    }

    /* ==========================================
       VARIANT: DESTRUCTIVE
       ========================================== */
    .btn-destructive {
      background: linear-gradient(135deg, var(--color-error, #B91C1C) 0%, #B91C1C 100%);
      color: var(--color-on-error, #ffffff);
      box-shadow: 0 2px 4px rgba(186, 26, 26, 0.2), 0 1px 2px rgba(186, 26, 26, 0.1);
    }

    .btn-destructive:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-error, #B91C1C) 0%, var(--color-error, #B91C1C) 100%);
      box-shadow: 0 4px 8px rgba(186, 26, 26, 0.3), 0 2px 4px rgba(186, 26, 26, 0.15);
      transform: translateY(-1px);
    }

    .btn-destructive:active:not(:disabled) {
      background: var(--color-error, #B91C1C);
      transform: scale(0.98);
    }

    .btn-destructive:focus-visible {
      box-shadow: 0 0 0 2px var(--color-surface, #ffffff), 0 0 0 4px var(--color-error, #B91C1C);
    }

    .btn-destructive.loading::after {
      border-color: var(--color-on-error, #ffffff);
      border-right-color: transparent;
    }

    /* ==========================================
       VARIANT: ICON ONLY
       ========================================== */
    .btn-icon-only {
      padding: 10px;
      border-radius: 12px;
      min-width: 40px;
      min-height: 40px;
    }

    .btn-icon-only .material-symbols-outlined {
      font-size: 20px;
      margin: 0;
    }

    .btn-icon-only.btn-primary,
    .btn-icon-only.btn-secondary,
    .btn-icon-only.btn-tertiary,
    .btn-icon-only.btn-destructive {
      padding: 10px;
    }

    /* ==========================================
       VARIANT: FAB (Floating Action Button)
       ========================================== */
    .btn-fab {
      position: fixed;
      bottom: calc(24px + env(safe-area-inset-bottom, 0));
      right: 24px;
      z-index: 50;
      width: 56px;
      height: 56px;
      padding: 0;
      border-radius: 28px;
      box-shadow: 0 6px 16px rgba(6, 78, 59, 0.3), 0 2px 8px rgba(148, 74, 0, 0.2);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .btn-fab .material-symbols-outlined {
      font-size: 24px;
      margin: 0;
    }

    .btn-fab:hover:not(:disabled) {
      box-shadow: 0 8px 24px rgba(148, 74, 0, 0.4), 0 4px 12px rgba(148, 74, 0, 0.25);
      transform: translateY(-2px) scale(1.02);
    }

    .btn-fab:active:not(:disabled) {
      transform: scale(0.95);
    }

    .btn-fab:focus-visible {
      box-shadow: 0 0 0 2px var(--color-surface, #ffffff), 0 0 0 4px var(--color-primary, #064E3B), 0 6px 16px rgba(6, 78, 59, 0.3);
    }

    /* FAB Extended (with label) */
    .btn-fab-extended {
      width: auto;
      padding: 0 24px;
      border-radius: 28px;
      gap: 12px;
    }

    .btn-fab-extended .material-symbols-outlined {
      font-size: 20px;
    }

    /* ==========================================
       SIZE VARIANTS
       ========================================== */
    .btn-sm {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      line-height: 16px;
      border-radius: 8px;
      gap: 6px;
    }

    .btn-sm .material-symbols-outlined {
      font-size: 16px;
    }

    .btn-lg {
      padding: 16px 32px;
      font-size: 16px;
      font-weight: 600;
      line-height: 24px;
      border-radius: 16px;
      gap: 10px;
    }

    .btn-lg .material-symbols-outlined {
      font-size: 20px;
    }

    /* Full width utility */
    .btn-block {
      width: 100%;
    }

    /* ==========================================
       BUTTON GROUP
       ========================================== */
    .btn-group {
      display: inline-flex;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .btn-group .btn {
      border-radius: 0;
      margin: 0;
    }

    .btn-group .btn:first-child {
      border-top-left-radius: 12px;
      border-bottom-left-radius: 12px;
    }

    .btn-group .btn:last-child {
      border-top-right-radius: 12px;
      border-bottom-right-radius: 12px;
    }

    .btn-group .btn:not(:last-child) {
      border-right: 1px solid rgba(0, 0, 0, 0.1);
    }

    .btn-group .btn-primary:not(:last-child) {
      border-right-color: rgba(255, 255, 255, 0.3);
    }

    .btn-group .btn-secondary:not(:last-child) {
      border-right-color: var(--color-primary, #064E3B);
    }

    /* ==========================================
       CONFIRMATION MODAL INTEGRATION
       ========================================== */
    .btn[data-confirm] {
      position: relative;
    }

    .btn[data-confirm]:not(.confirmed)::after {
      content: attr(data-confirm);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(8px);
      background: var(--color-inverse-surface, #022D1D);
      color: var(--color-inverse-on-surface, #e8f2ff);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s;
      z-index: 100;
      pointer-events: none;
    }

    .btn[data-confirm]:hover:not(:disabled):not(.confirmed)::after {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
    }

    /* ==========================================
       RTL SUPPORT
       ========================================== */
    [dir="rtl"] .btn {
      flex-direction: row-reverse;
    }

    [dir="rtl"] .btn-group .btn:first-child {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      border-top-right-radius: 12px;
      border-bottom-right-radius: 12px;
    }

    [dir="rtl"] .btn-group .btn:last-child {
      border-top-left-radius: 12px;
      border-bottom-left-radius: 12px;
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
  `;

  // Inject styles once
  if (!document.getElementById('smartsoko-button-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'smartsoko-button-styles';
    styleEl.textContent = buttonStyles;
    document.head.appendChild(styleEl);
  }

  // Button JavaScript functionality
  window.SmartSokoButtons = {
    // Set loading state
    setLoading(btn, loading) {
      if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
        btn.dataset.originalText = btn.innerHTML;
      } else {
        btn.classList.remove('loading');
        btn.disabled = false;
        if (btn.dataset.originalText) {
          btn.innerHTML = btn.dataset.originalText;
          delete btn.dataset.originalText;
        }
      }
    },

    // Confirmation dialog
    confirm(btn, options = {}) {
      const {
        title = 'Confirm Action',
        message = 'Are you sure you want to proceed?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        variant = 'destructive',
        onConfirm = () => {},
        onCancel = () => {}
      } = options;

      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4';
        overlay.onclick = (e) => { if (e.target === overlay) handleCancel(); };

        const confirmBtnClass = `btn btn-${variant} btn-sm`;
        const cancelBtnClass = 'btn btn-secondary btn-sm';

        overlay.innerHTML = `
          <div class="bg-surface-container-lowest rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 class="font-headline-sm text-headline-sm">${title}</h3>
            <p class="text-on-surface-variant">${message}</p>
            <div class="flex gap-3 pt-2 justify-end">
              <button class="${cancelBtnClass}" data-action="cancel">${cancelText}</button>
              <button class="${confirmBtnClass}" data-action="confirm">${confirmText}</button>
            </div>
          </div>
        `;

        const handleConfirm = () => {
          overlay.remove();
          onConfirm();
          resolve(true);
        };

        const handleCancel = () => {
          overlay.remove();
          onCancel();
          resolve(false);
        };

        overlay.querySelector('[data-action="confirm"]').onclick = handleConfirm;
        overlay.querySelector('[data-action="cancel"]').onclick = handleCancel;

        document.body.appendChild(overlay);

        // Focus management
        setTimeout(() => overlay.querySelector('[data-action="cancel"]').focus(), 0);
      });
    },

    // Initialize confirmation buttons
    initConfirmations() {
      document.querySelectorAll('[data-confirm]').forEach(btn => {
        if (btn.dataset.confirmInitialized) return;
        btn.dataset.confirmInitialized = 'true';

        btn.addEventListener('click', async (e) => {
          if (btn.classList.contains('confirmed')) return;

          e.preventDefault();
          e.stopPropagation();

          const message = btn.dataset.confirm;
          const title = btn.dataset.confirmTitle || 'Confirm Action';
          const variant = btn.dataset.confirmVariant || 'destructive';

          const confirmed = await this.confirm(btn, { title, message, variant });

          if (confirmed) {
            btn.classList.add('confirmed');
            btn.click(); // Trigger original click
            btn.classList.remove('confirmed');
          }
        });
      });
    },

    // Initialize all buttons
    init() {
      this.initConfirmations();

      // Add ripple effect
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn || btn.classList.contains('btn-icon-only') || btn.classList.contains('btn-fab')) return;

        const ripple = document.createElement('span');
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          left: ${x}px;
          top: ${y}px;
          background: currentColor;
          opacity: 0.15;
          border-radius: 50%;
          transform: scale(0);
          animation: btn-ripple 0.4s ease-out;
          pointer-events: none;
        `;

        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        btn.appendChild(ripple);

        setTimeout(() => ripple.remove(), 400);
      });

      // Add ripple animation
      if (!document.getElementById('btn-ripple-styles')) {
        const style = document.createElement('style');
        style.id = 'btn-ripple-styles';
        style.textContent = `
          @keyframes btn-ripple {
            to { transform: scale(2.5); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
    }
  };

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.SmartSokoButtons.init());
  } else {
    window.SmartSokoButtons.init();
  }
})();