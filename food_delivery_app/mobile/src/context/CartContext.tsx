/**
 * Cart Context - Global cart state management
 * Adapted from web app cart service with React state
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { cartService } from '@/services/cart';
import { CartItem } from '@/types/models';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  isLoading: boolean;
  addItem: (item: Omit<CartItem, 'id'>) => Promise<void>;
  updateQuantity: (productId: string, delta: number) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  clearVendorItems: (sellerId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  getVendorTotal: (sellerId: string) => number;
  hasMultipleVendors: boolean;
  vendorsInCart: string[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart on mount
  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    setIsLoading(true);
    const cart = await cartService.getCart();
    setItems(cart);
    setIsLoading(false);
  };

  const refreshCart = useCallback(async () => {
    const cart = await cartService.getCart();
    setItems(cart);
  }, []);

  const addItem = async (item: Omit<CartItem, 'id'>) => {
    const updated = await cartService.addItem(item);
    setItems(updated);
  };

  const updateQuantity = async (productId: string, delta: number) => {
    const updated = await cartService.updateQuantity(productId, delta);
    setItems(updated);
  };

  const setQuantity = async (productId: string, quantity: number) => {
    const updated = await cartService.setQuantity(productId, quantity);
    setItems(updated);
  };

  const removeItem = async (productId: string) => {
    const updated = await cartService.removeItem(productId);
    setItems(updated);
  };

  const clearCart = async () => {
    const updated = await cartService.clearCart();
    setItems(updated);
  };

  const clearVendorItems = async (sellerId: string) => {
    const updated = await cartService.clearVendorItems(sellerId);
    setItems(updated);
  };

  // Computed values
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const vendorsInCart = [...new Set(items.map((i) => i.sellerId))];
  const hasMultipleVendors = vendorsInCart.length > 1;

  const getVendorTotal = (sellerId: string): number => {
    return items
      .filter((i) => i.sellerId === sellerId)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const value: CartContextType = {
    items,
    itemCount,
    total,
    isLoading,
    addItem,
    updateQuantity,
    setQuantity,
    removeItem,
    clearCart,
    clearVendorItems,
    refreshCart,
    getVendorTotal,
    hasMultipleVendors,
    vendorsInCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
