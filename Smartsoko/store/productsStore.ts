import create from 'zustand';
import { supabase } from '../services/supabase';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  user_id: string;
  created_at: string;
}

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ products: data as Product[], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addProduct: async (product) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Product was not created');
      }

      // Update local state with the new product
      set((state) => ({
        products: [data[0] as Product, ...state.products],
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  updateProduct: async (id, product) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Product was not found');
      }

      // Update local state
      set((state) => ({
        products: state.products.map(p => 
          p.id === id ? { ...p, ...data[0] as Product } : p
        ),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Remove from local state
      set((state) => ({
        products: state.products.filter(p => p.id !== id),
        loading: false
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));

