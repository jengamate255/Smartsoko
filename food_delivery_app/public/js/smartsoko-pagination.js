/**
 * SmartSoko Pagination Components
 * Infinite Scroll, Page Numbers, Mobile Compact, Load More
 */

(function() {
  'use strict';

  const paginationStyles = `
    /* ==========================================
       SMARTSOKO PAGINATION COMPONENTS
       ========================================== */

    /* ==========================================
       DESKTOP PAGINATION (Page Numbers)
       ========================================== */
    .pagination {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
      justify-content: center;
      padding: 16px 0;
    }

    .pagination-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      height: 40px;
      padding: 0 12px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-on-surface-variant, #64748B);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }

    .pagination-item:hover:not(:disabled):not(.active) {
      background: var(--color-surface-variant, #ECFDF5);
      color: var(--color-on-surface, #022D1D);
    }

    .pagination-item:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-surface, #ffffff), 0 0 0 4px var(--color-primary, #064E3B);
    }

    .pagination-item.active {
      background: var(--color-primary, #064E3B);
      color: var(--color-on-primary, #ffffff);
    }

    .pagination-item.active:hover {
      background: var(--color-primary, #064E3B);
    }

    .pagination-item:disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }

    .pagination-ellipsis {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      height: 40px;
      color: var(--color-outline, #64748B);
      user-select: none;
    }

    .pagination-info {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--color-on-surface-variant, #64748B);
      margin-left: 16px;
    }

    .pagination-select {
      padding: 6px 32px 6px 12px;
      border: 1px solid var(--color-outline-variant, #dcc1b1);
      border-radius: 8px;
      background: var(--color-surface, #ffffff);
      color: var(--color-on-surface, #022D1D);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23564337' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      padding-right: 32px;
    }

    .pagination-select:focus {
      outline: none;
      border-color: var(--color-primary, #064E3B);
      box-shadow: 0 0 0 2px var(--color-primary, #064E3B);
    }

    /* ==========================================
       MOBILE COMPACT PAGINATION
       ========================================== */
    .pagination-mobile {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--color-surface-container-low, #ECFDF5);
      border-top: 1px solid var(--color-surface-variant, #ECFDF5);
      position: sticky;
      bottom: 0;
      z-index: 50;
      flex-wrap: wrap;
      gap: 8px;
    }

    .pagination-mobile-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 16px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      color: var(--color-primary, #064E3B);
      background: var(--color-surface, #ffffff);
      border: 1.5px solid var(--color-primary, #064E3B);
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }

    .pagination-mobile-btn:hover:not(:disabled) {
      background: var(--color-primary-container, #ffe8d6);
      color: var(--color-primary, #064E3B);
    }

    .pagination-mobile-btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-surface, #ffffff), 0 0 0 4px var(--color-primary, #064E3B);
    }

    .pagination-mobile-btn:disabled {
      opacity: 0.38;
      cursor: not-allowed;
      border-color: var(--color-outline, #64748B);
      color: var(--color-outline, #64748B);
      background: var(--color-surface-container, #ECFDF5);
    }

    .pagination-mobile-page {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      height: 40px;
      padding: 0 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      color: var(--color-on-primary, #ffffff);
      background: var(--color-primary, #064E3B);
    }

    .pagination-mobile-info {
      font-size: 12px;
      color: var(--color-on-surface-variant, #64748B);
      font-weight: 500;
      white-space: nowrap;
    }

    /* ==========================================
       LOAD MORE BUTTON
       ========================================== */
    .load-more {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 24px;
      margin: 16px 0;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-primary, #064E3B);
      background: var(--color-primary-container, #ffe8d6);
      border: 1.5px solid var(--color-primary, #064E3B);
      cursor: pointer;
      transition: all 0.15s;
    }

    .load-more:hover:not(:disabled) {
      background: var(--color-primary, #064E3B);
      color: var(--color-on-primary, #ffffff);
    }

    .load-more:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-surface, #ffffff), 0 0 0 4px var(--color-primary, #064E3B);
    }

    .load-more:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .load-more .material-symbols-outlined {
      font-size: 18px;
    }

    /* ==========================================
       INFINITE SCROLL
       ========================================== */
    .infinite-scroll-sentinel {
      height: 1px;
      width: 100%;
    }

    .infinite-scroll-loader {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      gap: 12px;
    }

    .infinite-scroll-loader .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--color-primary, #064E3B);
      border-right-color: transparent;
      border-radius: 50%;
      animation: pagination-spin 0.6s linear infinite;
    }

    @keyframes pagination-spin {
      to { transform: rotate(360deg); }
    }

    .infinite-scroll-loader-text {
      font-size: 13px;
      color: var(--color-on-surface-variant, #64748B);
    }

    .infinite-scroll-end {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: var(--color-outline, #64748B);
      font-size: 13px;
    }

    .infinite-scroll-end .material-symbols-outlined {
      margin-right: 8px;
      font-size: 18px;
    }

    /* ==========================================
       SKELETON LOADERS
       ========================================== */
    .pagination-skeleton {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
    }

    .pagination-skeleton-item {
      height: 120px;
      background: linear-gradient(90deg, var(--color-surface-container, #ECFDF5) 25%, var(--color-surface-variant, #ECFDF5) 50%, var(--color-surface-container, #ECFDF5) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
      border-radius: 12px;
    }

    @keyframes skeleton-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* Product skeleton */
    .product-skeleton {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .product-skeleton-image {
      aspect-ratio: 1;
      border-radius: 12px;
      background: linear-gradient(90deg, var(--color-surface-container, #ECFDF5) 25%, var(--color-surface-variant, #ECFDF5) 50%, var(--color-surface-container, #ECFDF5) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
    }

    .product-skeleton-text {
      height: 16px;
      border-radius: 8px;
      background: linear-gradient(90deg, var(--color-surface-container, #ECFDF5) 25%, var(--color-surface-variant, #ECFDF5) 50%, var(--color-surface-container, #ECFDF5) 75%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
    }

    .product-skeleton-text.short { width: 60%; }
    .product-skeleton-text.medium { width: 80%; }
    .product-skeleton-text.full { width: 100%; }

    /* ==========================================
       ACCESSIBILITY
       ========================================== */
    [data-pagination] {
      /* Ensure pagination is announced as navigation */
    }

    .pagination-item:focus-visible,
    .pagination-mobile-btn:focus-visible,
    .load-more:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-surface, #ffffff), 0 0 0 4px var(--color-primary, #064E3B);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* ==========================================
       RTL SUPPORT
       ========================================== */
    [dir="rtl"] .pagination {
      flex-direction: row-reverse;
    }

    [dir="rtl"] .pagination-mobile {
      flex-direction: row-reverse;
    }
  `;

  // Inject styles once
  if (!document.getElementById('smartsoko-pagination-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'smartsoko-pagination-styles';
    styleEl.textContent = paginationStyles;
    document.head.appendChild(styleEl);
  }

  // ============================================
  // PAGINATION COMPONENT
  // ============================================

  window.SmartSokoPagination = {
    /**
     * Render desktop page number pagination
     * @param {HTMLElement} container - Target container
     * @param {Object} options - Configuration options
     */
    renderPageNumbers(container, options = {}) {
      const {
        currentPage = 1,
        totalPages = 1,
        totalItems = 0,
        onPageChange = () => {},
        showFirstLast = true,
        maxVisiblePages = 5,
        showInfo = true,
        showPageSize = false,
        pageSizeOptions = [10, 20, 50, 100],
        currentPageSize = 20,
        onPageSizeChange = () => {}
      } = options;

      if (!container) return;

      const pages = this._getPageRange(currentPage, totalPages, maxVisiblePages);
      const startItem = (currentPage - 1) * currentPageSize + 1;
      const endItem = Math.min(currentPage * currentPageSize, totalItems);

      let html = '';

      // Info text
      if (showInfo && totalItems > 0) {
        html += `
          <span class="pagination-info" aria-live="polite">
            Showing ${startItem}â€“${endItem} of ${totalItems.toLocaleString()}
          </span>
        `;
      }

      // Page size selector
      if (showPageSize && totalItems > pageSizeOptions[0]) {
        const sizeOptions = pageSizeOptions
          .filter(s => s <= totalItems)
          .map(s => `<option value="${s}" ${s === currentPageSize ? 'selected' : ''}>${s} per page</option>`)
          .join('');
        html += `
          <select class="pagination-select" aria-label="Items per page" data-page-size-select>
            ${sizeOptions}
          </select>
        `;
      }

      // Pagination wrapper
      html += '<nav class="pagination" aria-label="Pagination" data-pagination>';

      // First page
      if (showFirstLast && currentPage > 1) {
        html += `
          <button class="pagination-item" data-page="1" aria-label="First page">
            <span class="material-symbols-outlined">first_page</span>
          </button>
        `;
      }

      // Previous
      if (currentPage > 1) {
        html += `
          <button class="pagination-item" data-page="${currentPage - 1}" aria-label="Previous page">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
        `;
      }

      // Page numbers
      pages.forEach(page => {
        if (page === '...') {
          html += '<span class="pagination-ellipsis" aria-hidden="true">â€¦</span>';
        } else {
          const isActive = page === currentPage;
          html += `
            <button 
              class="pagination-item ${isActive ? 'active' : ''}" 
              data-page="${page}" 
              ${isActive ? 'aria-current="page"' : ''}
              aria-label="Page ${page}"
            >
              ${page}
            </button>
          `;
        }
      });

      // Next
      if (currentPage < totalPages) {
        html += `
          <button class="pagination-item" data-page="${currentPage + 1}" aria-label="Next page">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        `;
      }

      // Last page
      if (showFirstLast && currentPage < totalPages) {
        html += `
          <button class="pagination-item" data-page="${totalPages}" aria-label="Last page">
            <span class="material-symbols-outlined">last_page</span>
          </button>
        `;
      }

      html += '</nav>';

      container.innerHTML = html;

      // Event listeners
      container.querySelectorAll('.pagination-item[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const page = parseInt(btn.dataset.page, 10);
          if (page !== currentPage) onPageChange(page);
        });
      });

      // Page size selector
      const sizeSelect = container.querySelector('[data-page-size-select]');
      if (sizeSelect) {
        sizeSelect.addEventListener('change', (e) => {
          onPageSizeChange(parseInt(e.target.value, 10));
        });
      }
    },

    /**
     * Render mobile compact pagination
     */
    renderMobile(container, options = {}) {
      const {
        currentPage = 1,
        totalPages = 1,
        totalItems = 0,
        onPageChange = () => {},
        currentPageSize = 20
      } = options;

      if (!container || totalPages <= 1) {
        container.innerHTML = '';
        return;
      }

      const hasPrev = currentPage > 1;
      const hasNext = currentPage < totalPages;

      container.innerHTML = `
        <nav class="pagination-mobile" aria-label="Pagination">
          <button 
            class="pagination-mobile-btn" 
            ${!hasPrev ? 'disabled' : ''} 
            aria-label="Previous page"
            data-action="prev"
          >
            <span class="material-symbols-outlined">chevron_left</span>
            <span>Previous</span>
          </button>
          
          <span class="pagination-mobile-page" aria-current="page" aria-label="Current page ${currentPage} of ${totalPages}">
            ${currentPage}
          </span>
          
          <span class="pagination-mobile-info" aria-live="polite">
            Page ${currentPage} of ${totalPages}
          </span>
          
          <button 
            class="pagination-mobile-btn" 
            ${!hasNext ? 'disabled' : ''} 
            aria-label="Next page"
            data-action="next"
          >
            <span>Next</span>
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </nav>
      `;

      // Event listeners
      const prevBtn = container.querySelector('[data-action="prev"]');
      const nextBtn = container.querySelector('[data-action="next"]');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (currentPage > 1) onPageChange(currentPage - 1);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (currentPage < totalPages) onPageChange(currentPage + 1);
        });
      }
    },

    /**
     * Render Load More button
     */
    renderLoadMore(container, options = {}) {
      const {
        loading = false,
        hasMore = true,
        onClick = () => {},
        text = 'Load More',
        loadingText = 'Loading...',
        endText = 'No more results'
      } = options;

      if (!container) return;

      if (!hasMore) {
        container.innerHTML = `
          <div class="infinite-scroll-end">
            <span class="material-symbols-outlined">check_circle</span>
            <span>${endText}</span>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <button 
          class="load-more" 
          ${loading ? 'disabled' : ''}
          aria-busy="${loading}"
          aria-label="${loading ? 'Loading more results' : 'Load more results'}"
        >
          ${loading 
            ? '<span class="material-symbols-outlined" style="animation: pagination-spin 0.6s linear infinite;">rotate_right</span>' 
            : '<span class="material-symbols-outlined">expand_more</span>'}
          <span>${loading ? loadingText : text}</span>
        </button>
      `;

      const btn = container.querySelector('.load-more');
      if (btn && !loading) {
        btn.addEventListener('click', onClick);
      }
    },

    /**
     * Create infinite scroll handler
     */
    createInfiniteScroll(options = {}) {
      const {
        container,
        sentinel,
        loading = false,
        hasMore = true,
        onLoadMore = () => {},
        threshold = 200,
        rootMargin = '200px'
      } = options;

      if (!container) {
        console.warn('Infinite scroll requires a container element');
        return { init: () => {}, destroy: () => {}, updateSentinel: () => {} };
      }

      // Create or use sentinel
      const sentinelEl = sentinel || document.createElement('div');
      sentinelEl.className = 'infinite-scroll-sentinel';
      sentinelEl.setAttribute('aria-hidden', 'true');
      
      if (!sentinel) {
        container.appendChild(sentinelEl);
      }

      // Observer
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && !loading && hasMore) {
            onLoadMore();
          }
        },
        { rootMargin, threshold: 0 }
      );

      observer.observe(sentinelEl);

      // Loading indicator
      let loaderEl = container.querySelector('.infinite-scroll-loader');
      if (!loaderEl) {
        loaderEl = document.createElement('div');
        loaderEl.className = 'infinite-scroll-loader';
        loaderEl.innerHTML = `
          <div class="spinner"></div>
          <span class="infinite-scroll-loader-text">Loading more...</span>
        `;
        loaderEl.style.display = 'none';
        container.appendChild(loaderEl);
      }

      // End message
      let endEl = container.querySelector('.infinite-scroll-end');
      if (!endEl) {
        endEl = document.createElement('div');
        endEl.className = 'infinite-scroll-end';
        endEl.innerHTML = `
          <span class="material-symbols-outlined">check_circle</span>
          <span>You've reached the end</span>
        `;
        endEl.style.display = 'none';
        container.appendChild(endEl);
      }

      const updateUI = (isLoading, hasMoreItems) => {
        loaderEl.style.display = isLoading ? 'flex' : 'none';
        endEl.style.display = (!hasMoreItems && !isLoading) ? 'flex' : 'none';
        sentinelEl.style.display = hasMoreItems ? 'block' : 'none';
      };

      return {
        init: () => {
          observer.observe(sentinelEl);
        },
        destroy: () => {
          observer.disconnect();
          if (sentinelEl.parentNode) sentinelEl.remove();
          if (loaderEl.parentNode) loaderEl.remove();
          if (endEl.parentNode) endEl.remove();
        },
        updateSentinel: (newLoading, newHasMore) => {
          updateUI(newLoading, newHasMore);
        },
        observer,
        sentinel: sentinelEl
      };
    },

    /**
     * Render skeleton loaders for products
     */
    renderProductSkeletons(container, count = 6) {
      if (!container) return;

      const skeletons = Array.from({ length: count }, () => `
        <div class="product-skeleton">
          <div class="product-skeleton-image"></div>
          <div class="product-skeleton-text full"></div>
          <div class="product-skeleton-text short"></div>
          <div class="product-skeleton-text medium"></div>
        </div>
      `).join('');

      container.innerHTML = `
        <div class="pagination-skeleton" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px;">
          ${skeletons}
        </div>
      `;
    },

    /**
     * Get page range for display
     * @private
     */
    _getPageRange(currentPage, totalPages, maxVisible) {
      if (totalPages <= maxVisible) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      const half = Math.floor(maxVisible / 2);
      let start = Math.max(1, currentPage - half);
      let end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }

      const pages = [];
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }

      return pages;
    }
  };

  // Auto-initialize if containers exist
  document.addEventListener('DOMContentLoaded', () => {
    // Could auto-initialize if data attributes present
    document.querySelectorAll('[data-pagination-auto]').forEach(el => {
      const config = JSON.parse(el.dataset.paginationAuto || '{}');
      SmartSokoPagination.renderPageNumbers(el, config);
    });

    document.querySelectorAll('[data-pagination-mobile-auto]').forEach(el => {
      const config = JSON.parse(el.dataset.paginationMobileAuto || '{}');
      SmartSokoPagination.renderMobile(el, config);
    });

    document.querySelectorAll('[data-load-more-auto]').forEach(el => {
      const config = JSON.parse(el.dataset.loadMoreAuto || '{}');
      SmartSokoPagination.renderLoadMore(el, config);
    });
  });

  console.log('SmartSoko Pagination loaded');
})();