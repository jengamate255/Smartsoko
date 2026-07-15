/**
 * SmartSoko Cart Service - Standardized cart operations across all pages
 * Ensures consistent data structure and localStorage handling
 */

const CartService = (() => {
  const STORAGE_KEY = 'smartsoko_cart';

  // Standard cart item structure
  const createItem = (data) => ({
    id: data.id || data.productId || `${data.sellerId}-${data.name}`,
    name: data.name,
    price: parseFloat(data.price) || 0,
    quantity: parseInt(data.quantity || data.qty) || 1,
    imageUrl: data.imageUrl || data.image || null,
    sellerId: data.sellerId || null,
    sellerName: data.sellerName || null,
    sellerLat: data.sellerLat ?? null,
    sellerLng: data.sellerLng ?? null
  });

  // Get cart from localStorage
  function getCart() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.map(item => createItem(item)) : [];
    } catch (e) {
      console.error('Error loading cart:', e);
      return [];
    }
  }

  // Save cart to localStorage
  function saveCart(cart) {
    try {
      const normalized = cart.map(item => createItem(item));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      updateBadge();
      return true;
    } catch (e) {
      console.error('Error saving cart:', e);
      return false;
    }
  }

  // Add item to cart
  function addItem(item) {
    const cart = getCart();
    const newItem = createItem(item);
    const existing = cart.find(i => i.id === newItem.id);

    if (existing) {
      existing.quantity += newItem.quantity;
    } else {
      cart.push(newItem);
    }

    saveCart(cart);
    return cart;
  }

  // Update item quantity
  function updateQuantity(itemId, delta) {
    const cart = getCart();
    const item = cart.find(i => i.id === itemId);

    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        return removeItem(itemId);
      }
      saveCart(cart);
    }
    return cart;
  }

  // Remove item from cart
  function removeItem(itemId) {
    const cart = getCart().filter(i => i.id !== itemId);
    saveCart(cart);
    return cart;
  }

  // Clear cart
  function clearCart() {
    localStorage.removeItem(STORAGE_KEY);
    updateBadge();
    return [];
  }

  // Get total item count
  function getItemCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
  }

  // Get cart total
  function getTotal() {
    return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  // Update SmartNav badge if available
  function updateBadge() {
    if (window.SmartNav && SmartNav.updateCartBadge) {
      SmartNav.updateCartBadge();
    }
    
    // Also dispatch event for other listeners
    window.dispatchEvent(new CustomEvent('cartUpdated', {
      detail: { count: getItemCount(), total: getTotal() }
    }));
  }

  // Listen for storage changes (sync across tabs)
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        updateBadge();
      }
    });
  }

  return {
    getCart,
    saveCart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    getItemCount,
    getTotal,
    createItem,
    STORAGE_KEY
  };
})();

// Backwards compatibility - expose to window
if (typeof window !== 'undefined') {
  window.CartService = CartService;
}
