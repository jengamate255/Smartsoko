/**
 * SmartSoko Safe Area & Edge-to-Edge Utilities
 * Provides CSS variables, mixins, and JavaScript helpers for edge-to-edge layouts
 * Based on Material 3 / Android edge-to-edge guidelines
 */

(function() {
  'use strict';

  const safeAreaStyles = `
    /* ==========================================
       SMARTSOKO SAFE AREA & EDGE-TO-EDGE UTILITIES
       ========================================== */

    /* ==========================================
       CSS SAFE AREA VARIABLES
       ========================================== */
    :root {
      /* Safe area insets - automatically populated by browser */
      --safe-area-inset-top: env(safe-area-inset-top, 0);
      --safe-area-inset-right: env(safe-area-inset-right, 0);
      --safe-area-inset-bottom: env(safe-area-inset-bottom, 0);
      --safe-area-inset-left: env(safe-area-inset-left, 0);
      
      /* Keyboard insets (when supported) */
      --keyboard-inset-height: env(keyboard-inset-height, 0);
      
      /* Combined safe areas for common use cases */
      --safe-area-top: max(var(--safe-area-inset-top), 0px);
      --safe-area-bottom: max(var(--safe-area-inset-bottom), 0px);
      --safe-area-left: max(var(--safe-area-inset-left), 0px);
      --safe-area-right: max(var(--safe-area-inset-right), 0px);
      
      /* With keyboard */
      --safe-area-bottom-with-keyboard: max(var(--safe-area-inset-bottom), var(--keyboard-inset-height));
    }

    /* ==========================================
       SAFE AREA MIXINS (CSS Classes)
       ========================================== */

    /* Apply safe area padding to container */
    .safe-area-padding {
      padding-top: var(--safe-area-top);
      padding-right: var(--safe-area-right);
      padding-bottom: var(--safe-area-bottom);
      padding-left: var(--safe-area-left);
    }

    .safe-area-padding-top {
      padding-top: var(--safe-area-top);
    }

    .safe-area-padding-bottom {
      padding-bottom: var(--safe-area-bottom);
    }

    .safe-area-padding-left {
      padding-left: var(--safe-area-left);
    }

    .safe-area-padding-right {
      padding-right: var(--safe-area-right);
    }

    .safe-area-padding-x {
      padding-left: var(--safe-area-left);
      padding-right: var(--safe-area-right);
    }

    .safe-area-padding-y {
      padding-top: var(--safe-area-top);
      padding-bottom: var(--safe-area-bottom);
    }

    /* Safe area margins */
    .safe-area-margin-top {
      margin-top: var(--safe-area-top);
    }

    .safe-area-margin-bottom {
      margin-bottom: var(--safe-area-bottom);
    }

    .safe-area-margin-left {
      margin-left: var(--safe-area-left);
    }

    .safe-area-margin-right {
      margin-right: var(--safe-area-right);
    }

    /* With keyboard support */
    .safe-area-padding-bottom-with-keyboard {
      padding-bottom: var(--safe-area-bottom-with-keyboard);
    }

    .safe-area-margin-bottom-with-keyboard {
      margin-bottom: var(--safe-area-bottom-with-keyboard);
    }

    /* ==========================================
       EDGE-TO-EDGE LAYOUT CONTAINERS
       ========================================== */

    /* Full viewport container with safe area handling */
    .edge-to-edge-container {
      min-height: 100dvh; /* Dynamic viewport height */
      min-height: 100vh;  /* Fallback */
      display: flex;
      flex-direction: column;
      padding-top: var(--safe-area-top);
      padding-bottom: var(--safe-area-bottom);
      padding-left: var(--safe-area-left);
      padding-right: var(--safe-area-right);
    }

    /* Main content area that scrolls behind system bars */
    .edge-to-edge-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0; /* Allow flex item to shrink */
    }

    /* Header that stays behind status bar */
    .edge-to-edge-header {
      position: sticky;
      top: 0;
      z-index: 40;
      padding-top: var(--safe-area-top);
      background: var(--color-surface, #F8FAF6);
      backdrop-filter: blur(8px);
    }

    /* Footer that stays above navigation bar */
    .edge-to-edge-footer {
      position: sticky;
      bottom: 0;
      z-index: 40;
      padding-bottom: var(--safe-area-bottom);
      background: var(--color-surface, #F8FAF6);
      backdrop-filter: blur(8px);
    }

    /* ==========================================
       FAB POSITIONING (Edge-to-Edge Compliant)
       ========================================== */

    .fab-edge-to-edge {
      position: fixed;
      bottom: calc(24px + var(--safe-area-bottom));
      right: calc(24px + var(--safe-area-right));
      z-index: 50;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .fab-extended-edge-to-edge {
      position: fixed;
      bottom: calc(24px + var(--safe-area-bottom));
      right: calc(24px + var(--safe-area-right));
      z-index: 50;
      gap: 12px;
    }

    /* FAB above bottom nav */
    .fab-above-bottom-nav {
      bottom: calc(88px + var(--safe-area-bottom)); /* 64px nav + 24px margin */
    }

    /* FAB for mobile with bottom nav */
    @media (max-width: 640px) {
      .fab-mobile {
        bottom: calc(88px + var(--safe-area-bottom)); /* Account for bottom nav */
        right: calc(16px + var(--safe-area-right));
      }
      
      .fab-extended-mobile {
        bottom: calc(88px + var(--safe-area-bottom));
        right: calc(16px + var(--safe-area-right));
        left: calc(16px + var(--safe-area-left));
        justify-content: center;
      }
    }

    /* ==========================================
       STICKY HEADER/FOOTER WITH EDGE-TO-EDGE
       ========================================== */

    /* Header that extends behind status bar */
    .sticky-header-edge {
      position: sticky;
      top: 0;
      z-index: 40;
      margin-left: calc(-1 * var(--safe-area-left));
      margin-right: calc(-1 * var(--safe-area-right));
      padding-left: var(--safe-area-left);
      padding-right: var(--safe-area-right);
      padding-top: var(--safe-area-top);
      background: var(--color-surface, #F8FAF6);
    }

    /* Footer that extends behind nav bar */
    .sticky-footer-edge {
      position: sticky;
      bottom: 0;
      z-index: 40;
      margin-left: calc(-1 * var(--safe-area-left));
      margin-right: calc(-1 * var(--safe-area-right));
      padding-left: var(--safe-area-left);
      padding-right: var(--safe-area-right);
      padding-bottom: var(--safe-area-bottom);
      background: var(--color-surface, #F8FAF6);
    }

    /* ==========================================
       MODAL / DIALOG EDGE-TO-EDGE
       ========================================== */

    .modal-edge-to-edge {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: var(--safe-area-top) var(--safe-area-right) var(--safe-area-bottom) var(--safe-area-left);
    }

    .modal-content-edge {
      width: 100%;
      max-width: 100%;
      border-radius: 24px 24px 0 0;
      background: var(--color-surface, #F8FAF6);
      max-height: calc(100dvh - var(--safe-area-top));
      overflow-y: auto;
    }

    .modal-full-edge {
      position: fixed;
      inset: 0;
      z-index: 100;
      padding: var(--safe-area-top) var(--safe-area-right) var(--safe-area-bottom) var(--safe-area-left);
    }

    .modal-full-content {
      width: 100%;
      height: 100%;
      border-radius: 0;
      background: var(--color-surface, #F8FAF6);
      overflow-y: auto;
    }

    /* ==========================================
       BOTTOM SHEET EDGE-TO-EDGE
       ========================================== */

    .bottom-sheet-edge {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 100;
      border-radius: 24px 24px 0 0;
      background: var(--color-surface, #F8FAF6);
      max-height: calc(100dvh - var(--safe-area-top));
      overflow-y: auto;
      padding-bottom: var(--safe-area-bottom);
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bottom-sheet-edge.open {
      transform: translateY(0);
    }

    .bottom-sheet-handle {
      width: 40px;
      height: 4px;
      margin: 12px auto;
      border-radius: 2px;
      background: var(--color-outline, #64748B);
      opacity: 0.5;
    }

    /* ==========================================
       IME (Keyboard) HANDLING
       ========================================== */

    /* Container that adjusts for keyboard */
    .ime-container {
      position: relative;
      min-height: 100dvh;
    }

    .ime-content {
      padding-bottom: var(--keyboard-inset-height, 0);
      transition: padding-bottom 0.2s ease;
    }

    /* Input that stays visible above keyboard */
    .ime-input {
      position: sticky;
      bottom: calc(var(--safe-area-bottom) + var(--keyboard-inset-height, 0));
      z-index: 10;
      background: var(--color-surface, #ffffff);
      border-top: 1px solid var(--color-outline-variant, #dcc1b1);
      padding: 12px var(--safe-area-right) 12px var(--safe-area-left);
    }

    /* Focus-visible scroll into view */
    input:focus-visible,
    textarea:focus-visible,
    select:focus-visible {
      scroll-margin-bottom: calc(var(--safe-area-bottom) + 20px);
    }

    /* ==========================================
       SCROLLABLE CONTENT WITH SAFE AREAS
       ========================================== */

    .scroll-safe {
      overflow-y: auto;
      padding-bottom: var(--safe-area-bottom);
    }

    .scroll-safe-x {
      overflow-x: auto;
      padding-right: var(--safe-area-right);
    }

    .scroll-safe-y {
      overflow-y: auto;
      padding-bottom: var(--safe-area-bottom);
    }

    /* List that scrolls behind system bars */
    .list-edge-to-edge {
      padding-top: var(--safe-area-top);
      padding-bottom: calc(var(--safe-area-bottom) + 24px); /* Extra for FAB */
      padding-left: var(--safe-area-left);
      padding-right: var(--safe-area-right);
    }

    /* ==========================================
       GRID / FLEX WITH SAFE AREAS
       ========================================== */

    .grid-safe {
      display: grid;
      gap: 16px;
      padding: var(--safe-area-top) var(--safe-area-right) var(--safe-area-bottom) var(--safe-area-left);
    }

    .flex-safe {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: var(--safe-area-top) var(--safe-area-right) var(--safe-area-bottom) var(--safe-area-left);
    }

    /* ==========================================
       RESPONSIVE SAFE AREAS
       ========================================== */

    @media (max-width: 640px) {
      /* Mobile: larger tap targets */
      .safe-area-padding {
        padding-top: max(var(--safe-area-top), 12px);
        padding-bottom: max(var(--safe-area-bottom), 12px);
        padding-left: max(var(--safe-area-left), 16px);
        padding-right: max(var(--safe-area-right), 16px);
      }
    }

    @media (min-width: 1024px) {
      /* Desktop: system bars usually not present */
      .desktop-safe-area-padding {
        padding-top: 0;
        padding-bottom: 0;
        padding-left: 0;
        padding-right: 0;
      }
    }

    /* ==========================================
       PRINT STYLES (no safe areas)
       ========================================== */

    @media print {
      .safe-area-padding,
      .safe-area-padding-top,
      .safe-area-padding-bottom,
      .safe-area-padding-left,
      .safe-area-padding-right,
      .safe-area-padding-x,
      .safe-area-padding-y,
      .edge-to-edge-container,
      .edge-to-edge-header,
      .edge-to-edge-footer {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      .fab-edge-to-edge,
      .fab-extended-edge-to-edge {
        position: static !important;
      }
    }

    /* ==========================================
       REDUCED MOTION
       ========================================== */

    @media (prefers-reduced-motion: reduce) {
      .ime-content,
      .ime-input,
      .bottom-sheet-edge,
      .modal-content-edge {
        transition: none !important;
      }
    }

    /* ==========================================
       HIGH CONTRAST MODE
       ========================================== */

    @media (prefers-contrast: high) {
      .fab-edge-to-edge,
      .fab-extended-edge-to-edge,
      .btn-fab,
      .btn-fab-extended {
        border: 2px solid currentColor;
      }
    }
  `;

  if (!document.getElementById('smartsoko-safearea-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'smartsoko-safearea-styles';
    styleEl.textContent = safeAreaStyles;
    document.head.appendChild(styleEl);
  }

  // ============================================
  // JAVASCRIPT UTILITIES
  // ============================================

  window.SmartSokoSafeArea = {
    /**
     * Get current safe area insets
     * @returns {Object} { top, right, bottom, left }
     */
    getInsets() {
      const style = getComputedStyle(document.documentElement);
      return {
        top: parseFloat(style.getPropertyValue('--safe-area-inset-top')) || 0,
        right: parseFloat(style.getPropertyValue('--safe-area-inset-right')) || 0,
        bottom: parseFloat(style.getPropertyValue('--safe-area-inset-bottom')) || 0,
        left: parseFloat(style.getPropertyValue('--safe-area-inset-left')) || 0
      };
    },

    /**
     * Get safe area as padding object for JS calculations
     * @returns {Object} { paddingTop, paddingRight, paddingBottom, paddingLeft }
     */
    getPadding() {
      const insets = this.getInsets();
      return {
        paddingTop: insets.top,
        paddingRight: insets.right,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left
      };
    },

    /**
     * Apply safe area padding to element
     * @param {HTMLElement} element
     * @param {Object} options - { top, right, bottom, left } booleans
     */
    applyPadding(element, options = {}) {
      const { top = true, right = true, bottom = true, left = true } = options;
      const insets = this.getInsets();
      
      if (top) element.style.paddingTop = `${insets.top}px`;
      if (right) element.style.paddingRight = `${insets.right}px`;
      if (bottom) element.style.paddingBottom = `${insets.bottom}px`;
      if (left) element.style.paddingLeft = `${insets.left}px`;
    },

    /**
     * Update FAB position for safe area
     * @param {HTMLElement} fabElement
     * @param {Object} options - { bottomNav: boolean }
     */
    updateFabPosition(fabElement, options = {}) {
      const { bottomNav = false } = options;
      const insets = this.getInsets();
      
      const bottomOffset = bottomNav ? 88 : 24; // 64px nav + 24px margin
      
      fabElement.style.bottom = `${bottomOffset + insets.bottom}px`;
      fabElement.style.right = `${24 + insets.right}px`;
    },

    /**
     * Create a keyboard-aware container
     * @param {HTMLElement} container
     * @param {HTMLElement} inputElement
     */
    makeKeyboardAware(container, inputElement) {
      let keyboardHeight = 0;
      
      // Visual Viewport API for keyboard detection
      if (window.visualViewport) {
        const handleResize = () => {
          const height = window.visualViewport.height;
          const windowHeight = window.innerHeight;
          keyboardHeight = Math.max(0, windowHeight - height);
          
          // Update CSS custom property
          document.documentElement.style.setProperty('--keyboard-inset-height', `${keyboardHeight}px`);
          
          // Scroll input into view if focused
          if (document.activeElement === inputElement) {
            inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        };
        
        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);
        
        // Cleanup function
        return () => {
          window.visualViewport.removeEventListener('resize', handleResize);
          window.visualViewport.removeEventListener('scroll', handleResize);
          document.documentElement.style.setProperty('--keyboard-inset-height', '0px');
        };
      }
      
      return () => {}; // No-op cleanup
    },

    /**
     * Detect if device has notch/safe area
     * @returns {boolean}
     */
    hasNotch() {
      const insets = this.getInsets();
      return insets.top > 20 || insets.bottom > 20 || insets.left > 0 || insets.right > 0;
    },

    /**
     * Get device type for safe area handling
     * @returns {'mobile' | 'tablet' | 'desktop'}
     */
    getDeviceType() {
      const width = window.innerWidth;
      if (width < 640) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    },

    /**
     * Auto-apply safe area classes to common elements
     */
    autoApply() {
      // Add safe-area-padding to main content areas
      document.querySelectorAll('main, .main-content, .page-content, [data-safe-area]').forEach(el => {
        el.classList.add('safe-area-padding');
      });

      // Add edge-to-edge to headers
      document.querySelectorAll('header, .header, .top-bar, [data-edge-header]').forEach(el => {
        el.classList.add('edge-to-edge-header');
      });

      // Add edge-to-edge to footers
      document.querySelectorAll('footer, .footer, .bottom-bar, [data-edge-footer]').forEach(el => {
        el.classList.add('edge-to-edge-footer');
      });

      // Add FAB safe positioning
      document.querySelectorAll('.fab, .btn-fab, [data-fab]').forEach(el => {
        el.classList.add('fab-edge-to-edge');
      });
    },

    /**
     * Listen for safe area changes (orientation, etc.)
     * @param {Function} callback
     * @returns {Function} cleanup
     */
    onChange(callback) {
      let lastInsets = this.getInsets();
      
      const check = () => {
        const current = this.getInsets();
        if (JSON.stringify(current) !== JSON.stringify(lastInsets)) {
          lastInsets = current;
          callback(current);
        }
      };
      
      // Check on resize and orientation change
      window.addEventListener('resize', check);
      window.addEventListener('orientationchange', () => {
        setTimeout(check, 100); // Wait for browser to update env()
      });
      
      // Visual viewport for keyboard
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', check);
        window.visualViewport.addEventListener('scroll', check);
      }
      
      return () => {
        window.removeEventListener('resize', check);
        window.removeEventListener('orientationchange', check);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', check);
          window.visualViewport.removeEventListener('scroll', check);
        }
      };
    }
  };

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Delay slightly to allow env() to populate
      setTimeout(() => {
        window.SmartSokoSafeArea.autoApply();
      }, 0);
    });
  } else {
    window.SmartSokoSafeArea.autoApply();
  }

})();