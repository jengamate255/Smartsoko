/**
 * SmartSoko Components Integration Guide
 * How to use Buttons, Pagination, and other components
 */

// ============================================
// QUICK START - Include in your HTML
// ============================================
/*
<head>
  <!-- Existing styles -->
  <link rel="stylesheet" href="design-system.css">
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  
  <!-- SmartSoko Components -->
  <script src="js/smartsoko-buttons.js" defer></script>
  <script src="js/smartsoko-pagination.js" defer></script>
  
  <!-- Your app scripts -->
  <script src="js/merchant-app.js" defer></script>
</head>
*/

// ============================================
// BUTTON USAGE EXAMPLES
// ============================================

/*
<!-- Primary Button -->
<button class="btn btn-primary">
  <span class="material-symbols-outlined">add</span>
  <span>Add Product</span>
</button>

<!-- Secondary Button -->
<button class="btn btn-secondary">
  <span class="material-symbols-outlined">filter_list</span>
  <span>Filter</span>
</button>

<!-- Tertiary (Text) Button -->
<button class="btn btn-tertiary">
  <span>Cancel</span>
</button>

<!-- Destructive Button -->
<button class="btn btn-destructive" data-confirm="Delete this product?" data-confirm-title="Delete Product">
  <span class="material-symbols-outlined">delete</span>
  <span>Delete</span>
</button>

<!-- Icon Only Button -->
<button class="btn btn-icon-only btn-primary" aria-label="Add to cart">
  <span class="material-symbols-outlined">shopping_cart</span>
</button>

<!-- Small Button -->
<button class="btn btn-primary btn-sm">
  <span class="material-symbols-outlined">edit</span>
  <span>Edit</span>
</button>

<!-- Large Button -->
<button class="btn btn-primary btn-lg btn-block">
  <span class="material-symbols-outlined">checkout</span>
  <span>Proceed to Checkout</span>
</button>

<!-- FAB (Floating Action Button) -->
<button class="btn btn-fab btn-primary" aria-label="Create new order">
  <span class="material-symbols-outlined">add</span>
</button>

<!-- Extended FAB -->
<button class="btn btn-fab-extended btn-primary">
  <span class="material-symbols-outlined">add</span>
  <span>New Order</span>
</button>

<!-- Button Group -->
<div class="btn-group">
  <button class="btn btn-primary">Approve</button>
  <button class="btn btn-secondary">View Details</button>
  <button class="btn btn-tertiary">Cancel</button>
</div>

<!-- Confirmation Button (auto-shows dialog) -->
<button class="btn btn-destructive" 
        data-confirm="This will permanently delete the order. Continue?"
        data-confirm-title="Delete Order"
        data-confirm-variant="destructive">
  <span class="material-symbols-outlined">delete</span>
  <span>Delete Order</span>
</button>
*/

// ============================================
// PAGINATION USAGE EXAMPLES
// ============================================

/*
<!-- Desktop Pagination Container -->
<div id="pagination-desktop" class="pagination-desktop"></div>

<!-- Mobile Pagination Container -->
<div id="pagination-mobile" class="pagination-mobile"></div>

<!-- Load More Container (for infinite scroll fallback) -->
<div id="load-more-container"></div>

<!-- Infinite Scroll Sentinel (auto-injected) -->
<div id="products-container">
  <!-- Products here -->
</div>
*/

// ============================================
// MERCHANT PAGE INTEGRATION EXAMPLE
// ============================================

/*
// In your merchant-app.js or similar:

let currentPage = 1;
const pageSize = 20;
let totalPages = 1;
let totalItems = 0;

// Initialize pagination after data loads
function initPagination() {
  // Desktop pagination
  SmartSokoPagination.renderPageNumbers(
    document.getElementById('pagination-desktop'),
    {
      currentPage,
      totalPages,
      totalItems,
      onPageChange: (page) => {
        currentPage = page;
        loadProducts(page);
      },
      showInfo: true,
      showPageSize: true,
      currentPageSize: pageSize,
      onPageSizeChange: (size) => {
        pageSize = size;
        currentPage = 1;
        loadProducts(1);
      }
    }
  );

  // Mobile pagination
  SmartSokoPagination.renderMobile(
    document.getElementById('pagination-mobile'),
    {
      currentPage,
      totalPages,
      onPageChange: (page) => {
        currentPage = page;
        loadProducts(page);
        // Mobile pagination re-renders automatically
        SmartSokoPagination.renderMobile(
          document.getElementById('pagination-mobile'),
          { currentPage: page, totalPages, onPageChange }
        );
      }
    }
  );
}

// Load products with pagination
async function loadProducts(page = 1) {
  try {
    showLoading(true);
    const response = await apiFetch(\`/api/vendor/products?page=\${page}&limit=\${pageSize}\`);
    if (response.success) {
      renderProducts(response.products);
      totalPages = response.totalPages;
      totalItems = response.total;
      initPagination();
    }
  } catch (error) {
    showToast('Failed to load products', 'error');
  } finally {
    showLoading(false);
  }
}

// Infinite Scroll Alternative
function initInfiniteScroll() {
  const container = document.getElementById('products-container');
  let loading = false;
  let hasMore = true;
  let page = 1;

  const { init, destroy, updateSentinel } = SmartSokoPagination.createInfiniteScroll({
    container,
    loading: false,
    hasMore: true,
    onLoadMore: async () => {
      if (loading || !hasMore) return;
      loading = true;
      updateSentinel(true);
      
      try {
        const response = await apiFetch(\`/api/vendor/products?page=\${page}&limit=\${pageSize}\`);
        if (response.success) {
          appendProducts(response.products);
          page++;
          hasMore = page <= response.totalPages;
          loading = false;
          updateSentinel(hasMore);
        }
      } catch (error) {
        loading = false;
        updateSentinel(true);
        showToast('Failed to load more', 'error');
      }
    }
  });

  init();
}
*/

// ============================================
// COMPONENT API REFERENCE
// ============================================

/*
// Buttons - SmartSokoButtons
SmartSokoButtons.setLoading(buttonElement, true/false)
SmartSokoButtons.confirm(buttonElement, options)
SmartSokoButtons.init()

// Pagination - SmartSokoPagination
SmartSokoPagination.renderPageNumbers(container, options)
SmartSokoPagination.renderMobile(container, options)
SmartSokoPagination.renderLoadMore(container, options)
SmartSokoPagination.createInfiniteScroll(options)

// Options for renderPageNumbers:
{
  currentPage: 1,           // Current page number
  totalPages: 10,           // Total pages
  totalItems: 100,          // Total items
  onPageChange: fn(page),   // Callback when page changes
  showFirstLast: true,      // Show first/last buttons
  maxVisiblePages: 5,       // Max page numbers to show
  showInfo: true,           // Show "Showing X-Y of Z"
  showPageSize: false,      // Show page size selector
  pageSizeOptions: [10,20,50,100],
  currentPageSize: 20,
  onPageSizeChange: fn(size)
}

// Options for renderMobile:
{
  currentPage: 1,
  totalPages: 10,
  totalItems: 100,
  onPageChange: fn(page),
  currentPageSize: 20
}

// Options for renderLoadMore:
{
  loading: false,
  hasMore: true,
  onClick: fn(),
  text: 'Load More',
  loadingText: 'Loading...',
  endText: 'No more results'
}

// Options for createInfiniteScroll:
{
  container: element,
  sentinel: element,
  loading: false,
  hasMore: true,
  onLoadMore: fn(),
  threshold: 200,
  rootMargin: '200px'
  // Returns: { init, destroy, updateSentinel }
}
*/

// ============================================
// CSS CLASS REFERENCE
// ============================================

/*
BUTTON CLASSES:
.btn                    - Base button class (required)
.btn-primary            - Primary brand color
.btn-secondary          - Secondary outline style
.btn-tertiary           - Text-only style
.btn-destructive        - Red/danger style
.btn-icon-only          - Icon only (circular)
.btn-sm                 - Small size
.btn-lg                 - Large size
.btn-block              - Full width
.btn-fab                - Floating action button
.btn-fab-extended       - FAB with label
.loading                - Loading spinner state
[data-confirm]          - Auto-confirmation dialog

PAGINATION CLASSES:
.pagination             - Desktop pagination container
.pagination-item        - Page number/button
.pagination-item.active - Current page
.pagination-ellipsis    - Ellipsis separator
.pagination-info        - Info text
.pagination-select      - Page size dropdown
.pagination-mobile      - Mobile compact container
.pagination-mobile-btn  - Prev/Next buttons
.pagination-mobile-page - Page number pill
.pagination-mobile-info - Page X of Y text

LOAD MORE / INFINITE SCROLL:
.load-more              - Load more button
.load-more.loading      - Loading state
.infinite-scroll-sentinel - Sentinel element
.infinite-scroll-loader - Loading spinner
.infinite-scroll-end    - End message
.pagination-skeleton    - Skeleton loader
.pagination-skeleton-item - Skeleton item

BUTTON GROUP:
.btn-group              - Button group container
*/

// ============================================
// ADVANCED: PROGRAMMATIC BUTTON CREATION
// ============================================

/*
// Create button programmatically
function createButton(options) {
  const {
    text = '',
    icon = null,
    variant = 'primary',  // primary, secondary, tertiary, destructive
    size = 'md',          // sm, md, lg
    iconOnly = false,
    fullWidth = false,
    loading = false,
    disabled = false,
    onClick = null,
    confirm = null,
    confirmTitle = 'Confirm Action',
    confirmVariant = 'destructive',
    ariaLabel = null,
    className = ''
  } = options;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = \`btn btn-\${variant} \${size !== 'md' ? 'btn-' + size : ''} \${iconOnly ? 'btn-icon-only' : ''} \${fullWidth ? 'btn-block' : ''} \${loading ? 'loading' : ''} \${disabled ? 'disabled' : ''} \${className}\`.trim();
  
  if (ariaLabel) btn.setAttribute('aria-label', ariaLabel);
  if (confirm) btn.dataset.confirm = confirm;
  if (confirmTitle !== 'Confirm Action') btn.dataset.confirmTitle = confirmTitle;
  if (confirmVariant !== 'destructive') btn.dataset.confirmVariant = confirmVariant;
  if (disabled) btn.disabled = true;

  let html = '';
  if (icon) html += \`<span class="material-symbols-outlined">\${icon}</span>\`;
  if (text) html += \`<span>\${text}</span>\`;
  btn.innerHTML = html;

  if (onClick) {
    btn.addEventListener('click', (e) => {
      if (btn.classList.contains('loading') || btn.disabled) return;
      onClick(e, btn);
    });
  }

  return btn;
}

// Usage:
const saveBtn = createButton({
  text: 'Save Changes',
  icon: 'save',
  variant: 'primary',
  onClick: () => saveForm()
});
document.getElementById('button-container').appendChild(saveBtn);
*/

console.log('SmartSoko Components Integration Guide loaded');
console.log('See smartsoko-buttons.js and smartsoko-pagination.js for full APIs');