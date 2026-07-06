/**
 * Zustand Store for Products
 * Manages product feed state with pagination and caching
 */

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Vendor } from '@/types/models';
import { productService, vendorService } from '@/services/supabase';

interface ProductState {
  // Data
  products: Product[];
  vendors: Vendor[];
  featuredProducts: Product[];
  
  // Pagination
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  
  // Filters
  selectedCategory: string | null;
  searchQuery: string;
  
  // Error/Offline
  error: string | null;
  isOffline: boolean;
  lastFetched: number | null;
  
  // Actions
  fetchProducts: (reset?: boolean) => Promise<void>;
  fetchMoreProducts: () => Promise<void>;
  fetchVendors: () => Promise<void>;
  fetchFeaturedProducts: () => Promise<void>;
  setCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  refresh: () => Promise<void>;
  clearError: () => void;
  setOffline: (offline: boolean) => void;
}

const PAGE_SIZE = 10;

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      // Initial State
      products: [],
      vendors: [],
      featuredProducts: [],
      page: 1,
      hasMore: true,
      isLoading: false,
      isLoadingMore: false,
      selectedCategory: null,
      searchQuery: '',
      error: null,
      isOffline: false,
      lastFetched: null,

      // Fetch initial products
      fetchProducts: async (reset = false) => {
        const { selectedCategory, searchQuery, isOffline } = get();
        
        if (isOffline) {
          set({ error: 'You are offline. Showing cached data.' });
          return;
        }

        if (reset) {
          set({ page: 1, hasMore: true, products: [] });
        }

        set({ isLoading: true, error: null });

        try {
          let products: Product[] = [];

          if (searchQuery.trim()) {
            // Search products
            products = await productService.search(searchQuery, {
              category: selectedCategory || undefined,
              limit: PAGE_SIZE,
            });
          } else {
            // Get popular products with pagination
            products = await productService.getPopular(PAGE_SIZE);
          }

          set({
            products: reset ? products : [...get().products, ...products],
            hasMore: products.length === PAGE_SIZE,
            lastFetched: Date.now(),
          });
        } catch (error) {
          console.error('Error fetching products:', error);
          set({ 
            error: 'Failed to load products. Please try again.',
            isOffline: true 
          });
        } finally {
          set({ isLoading: false });
        }
      },

      // Fetch more for pagination
      fetchMoreProducts: async () => {
        const { page, hasMore, isLoadingMore, isOffline, products } = get();
        
        if (!hasMore || isLoadingMore || isOffline) return;

        set({ isLoadingMore: true });

        try {
          const nextPage = page + 1;
          const offset = (nextPage - 1) * PAGE_SIZE;
          
          // Get more products using offset
          const moreProducts = await productService.getAll({
            limit: PAGE_SIZE,
            offset,
          });

          if (moreProducts.length > 0) {
            set({
              products: [...products, ...moreProducts],
              page: nextPage,
              hasMore: moreProducts.length === PAGE_SIZE,
            });
          } else {
            set({ hasMore: false });
          }
        } catch (error) {
          console.error('Error loading more products:', error);
        } finally {
          set({ isLoadingMore: false });
        }
      },

      // Fetch vendors
      fetchVendors: async () => {
        const { isOffline } = get();
        if (isOffline) return;

        try {
          const vendors = await vendorService.getAll({ isOpen: true, limit: 20 });
          set({ vendors });
        } catch (error) {
          console.error('Error fetching vendors:', error);
        }
      },

      // Fetch featured products
      fetchFeaturedProducts: async () => {
        const { isOffline } = get();
        if (isOffline) return;

        try {
          const featured = await productService.getPopular(6);
          set({ featuredProducts: featured });
        } catch (error) {
          console.error('Error fetching featured:', error);
        }
      },

      // Set category filter
      setCategory: (category: string | null) => {
        set({ selectedCategory: category, page: 1, hasMore: true });
        get().fetchProducts(true);
      },

      // Set search query
      setSearchQuery: (query: string) => {
        set({ searchQuery: query, page: 1, hasMore: true });
        if (query.trim()) {
          get().fetchProducts(true);
        }
      },

      // Pull to refresh
      refresh: async () => {
        set({ isOffline: false, error: null });
        await Promise.all([
          get().fetchProducts(true),
          get().fetchVendors(),
          get().fetchFeaturedProducts(),
        ]);
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Set offline state
      setOffline: (offline: boolean) => set({ isOffline: offline }),
    }),
    {
      name: 'product-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        products: state.products,
        vendors: state.vendors,
        featuredProducts: state.featuredProducts,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
