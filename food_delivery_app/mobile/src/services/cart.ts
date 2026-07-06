/**
 * Cart Service - Adapted from web app CartService
 * Uses AsyncStorage instead of localStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem } from '@/types/models';

const CART_STORAGE_KEY = '@smartsoko_cart';

export const cartService = {
  // Get cart from AsyncStorage
  async getCart(): Promise<CartItem[]> {
    try {
      const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error loading cart:', e);
      return [];
    }
  },

  // Save cart to AsyncStorage
  async saveCart(cart: CartItem[]): Promise<boolean> {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      return true;
    } catch (e) {
      console.error('Error saving cart:', e);
      return false;
    }
  },

  // Add item to cart
  async addItem(item: Omit<CartItem, 'id'>): Promise<CartItem[]> {
    const cart = await this.getCart();
    
    const newItem: CartItem = {
      ...item,
      id: item.productId || `${item.sellerId}-${Date.now()}`,
    };

    const existing = cart.find((i) => i.productId === newItem.productId && i.sellerId === newItem.sellerId);

    if (existing) {
      existing.quantity += newItem.quantity;
    } else {
      cart.push(newItem);
    }

    await this.saveCart(cart);
    return cart;
  },

  // Update item quantity
  async updateQuantity(productId: string, delta: number): Promise<CartItem[]> {
    const cart = await this.getCart();
    const item = cart.find((i) => i.productId === productId);

    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        return this.removeItem(productId);
      }
      await this.saveCart(cart);
    }
    return cart;
  },

  // Set exact quantity
  async setQuantity(productId: string, quantity: number): Promise<CartItem[]> {
    const cart = await this.getCart();
    const item = cart.find((i) => i.productId === productId);

    if (item) {
      if (quantity <= 0) {
        return this.removeItem(productId);
      }
      item.quantity = quantity;
      await this.saveCart(cart);
    }
    return cart;
  },

  // Remove item from cart
  async removeItem(productId: string): Promise<CartItem[]> {
    const cart = await this.getCart();
    const filtered = cart.filter((i) => i.productId !== productId);
    await this.saveCart(filtered);
    return filtered;
  },

  // Clear cart
  async clearCart(): Promise<CartItem[]> {
    await AsyncStorage.removeItem(CART_STORAGE_KEY);
    return [];
  },

  // Clear cart for specific vendor only
  async clearVendorItems(sellerId: string): Promise<CartItem[]> {
    const cart = await this.getCart();
    const filtered = cart.filter((i) => i.sellerId !== sellerId);
    await this.saveCart(filtered);
    return filtered;
  },

  // Get total item count
  async getItemCount(): Promise<number> {
    const cart = await this.getCart();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  // Get cart total
  async getTotal(): Promise<number> {
    const cart = await this.getCart();
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  // Get vendor-specific totals
  async getVendorTotal(sellerId: string): Promise<number> {
    const cart = await this.getCart();
    return cart
      .filter((i) => i.sellerId === sellerId)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  // Check if cart has items from multiple vendors
  async hasMultipleVendors(): Promise<boolean> {
    const cart = await this.getCart();
    const vendors = new Set(cart.map((i) => i.sellerId));
    return vendors.size > 1;
  },

  // Get unique vendors in cart
  async getVendorsInCart(): Promise<string[]> {
    const cart = await this.getCart();
    return [...new Set(cart.map((i) => i.sellerId))];
  },

  // Validate stock availability (would integrate with product service)
  async validateCart(): Promise<{ valid: boolean; issues: string[] }> {
    const cart = await this.getCart();
    const issues: string[] = [];

    // This would check against actual product stock
    for (const item of cart) {
      if (item.quantity <= 0) {
        issues.push(`${item.name} has invalid quantity`);
      }
    }

    return { valid: issues.length === 0, issues };
  },
};

export default cartService;
