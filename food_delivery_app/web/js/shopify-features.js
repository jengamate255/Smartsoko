/**
 * Shopify-Style Features Frontend Service
 * Handles: Variants, Inventory, Collections, Coupons, Reviews, Bundles
 */

const ShopifyFeatures = {
  API_BASE: '/api/shopify',

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT VARIANTS
  // ═══════════════════════════════════════════════════════════════

  async createVariant(variantData) {
    const response = await fetch(`${this.API_BASE}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variantData)
    });
    return response.json();
  },

  async getVariants(productId) {
    const response = await fetch(`${this.API_BASE}/variants/${productId}`);
    return response.json();
  },

  async updateVariant(variantId, updates) {
    const response = await fetch(`${this.API_BASE}/variants/${variantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  },

  async deleteVariant(variantId) {
    const response = await fetch(`${this.API_BASE}/variants/${variantId}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // ═══════════════════════════════════════════════════════════════
  // INVENTORY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async getInventory(merchantId) {
    const response = await fetch(`${this.API_BASE}/inventory?merchantId=${merchantId}`);
    return response.json();
  },

  async updateStock(type, id, stockData) {
    const response = await fetch(`${this.API_BASE}/inventory/${type}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stockData)
    });
    return response.json();
  },

  async bulkUpdateStock(updates) {
    const response = await fetch(`${this.API_BASE}/inventory/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });
    return response.json();
  },

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT COLLECTIONS
  // ═══════════════════════════════════════════════════════════════

  async createCollection(collectionData) {
    const response = await fetch(`${this.API_BASE}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectionData)
    });
    return response.json();
  },

  async getCollections(merchantId) {
    const response = await fetch(`${this.API_BASE}/collections?merchantId=${merchantId || ''}`);
    return response.json();
  },

  async getCollection(collectionId) {
    const response = await fetch(`${this.API_BASE}/collections/${collectionId}`);
    return response.json();
  },

  async updateCollection(collectionId, updates) {
    const response = await fetch(`${this.API_BASE}/collections/${collectionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  },

  async deleteCollection(collectionId) {
    const response = await fetch(`${this.API_BASE}/collections/${collectionId}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  async addProductsToCollection(collectionId, productIds) {
    const response = await fetch(`${this.API_BASE}/collections/${collectionId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds })
    });
    return response.json();
  },

  // ═══════════════════════════════════════════════════════════════
  // DISCOUNT COUPONS
  // ═══════════════════════════════════════════════════════════════

  async createCoupon(couponData) {
    const response = await fetch(`${this.API_BASE}/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(couponData)
    });
    return response.json();
  },

  async getCoupons(merchantId) {
    const response = await fetch(`${this.API_BASE}/coupons?merchantId=${merchantId || ''}`);
    return response.json();
  },

  async validateCoupon(code, merchantId, cartTotal, productIds) {
    const response = await fetch(`${this.API_BASE}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, merchantId, cartTotal, productIds })
    });
    return response.json();
  },

  async redeemCoupon(couponId) {
    const response = await fetch(`${this.API_BASE}/coupons/${couponId}/redeem`, {
      method: 'POST'
    });
    return response.json();
  },

  async deleteCoupon(couponId) {
    const response = await fetch(`${this.API_BASE}/coupons/${couponId}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT REVIEWS
  // ═══════════════════════════════════════════════════════════════

  async createReview(reviewData) {
    const response = await fetch(`${this.API_BASE}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    });
    return response.json();
  },

  async getProductReviews(productId) {
    const response = await fetch(`${this.API_BASE}/reviews?productId=${productId}`);
    return response.json();
  },

  async getMerchantReviews(merchantId) {
    const response = await fetch(`${this.API_BASE}/reviews/merchant?merchantId=${merchantId}`);
    return response.json();
  },

  async deleteReview(reviewId) {
    const response = await fetch(`${this.API_BASE}/reviews/${reviewId}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT BUNDLES
  // ═══════════════════════════════════════════════════════════════

  async createBundle(bundleData) {
    const response = await fetch(`${this.API_BASE}/bundles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bundleData)
    });
    return response.json();
  },

  async getBundles(merchantId) {
    const response = await fetch(`${this.API_BASE}/bundles?merchantId=${merchantId || ''}`);
    return response.json();
  },

  async getBundle(bundleId) {
    const response = await fetch(`${this.API_BASE}/bundles/${bundleId}`);
    return response.json();
  },

  async updateBundle(bundleId, updates) {
    const response = await fetch(`${this.API_BASE}/bundles/${bundleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  },

  async deleteBundle(bundleId) {
    const response = await fetch(`${this.API_BASE}/bundles/${bundleId}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // ═══════════════════════════════════════════════════════════════
  // WAITLIST
  // ═══════════════════════════════════════════════════════════════

  async joinWaitlist(productId, email, phone, userId) {
    const response = await fetch(`${this.API_BASE}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, email, phone, userId })
    });
    return response.json();
  },

  async getWaitlist(productId) {
    const response = await fetch(`${this.API_BASE}/waitlist/${productId}`);
    return response.json();
  },

  // ═══════════════════════════════════════════════════════════════
  // CREATIVE FEATURES
  // ═══════════════════════════════════════════════════════════════

  // Flash Deals
  async createDeal(dealData) {
    const response = await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dealData)
    });
    return response.json();
  },

  async getDeals(merchantId, activeOnly) {
    const params = new URLSearchParams();
    if (merchantId) params.append('merchantId', merchantId);
    if (activeOnly) params.append('active', 'true');
    const response = await fetch(`/api/deals?${params}`);
    return response.json();
  },

  // Loyalty Points
  async addLoyaltyPoints(userId, points, type, description, orderId) {
    const response = await fetch('/api/loyalty/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, points, type, description, orderId })
    });
    return response.json();
  },

  async getLoyaltyPoints(userId) {
    const response = await fetch(`/api/loyalty/points?userId=${userId}`);
    return response.json();
  },

  // Referrals
  async createReferral(referrerId, refereeId, referralCode) {
    const response = await fetch('/api/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrerId, refereeId, referralCode })
    });
    return response.json();
  },

  async getReferrals(userId) {
    const response = await fetch(`/api/referrals?userId=${userId}`);
    return response.json();
  },

  // Dynamic Pricing
  async getSurgePricing(location, time) {
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (time) params.append('time', time);
    const response = await fetch(`/api/pricing/surge?${params}`);
    return response.json();
  }
};

// Make globally available
window.ShopifyFeatures = ShopifyFeatures;