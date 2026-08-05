import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useProductsStore } from './productsStore';
import { Product } from './productsStore';
import { supabase } from '../services/supabase';

vi.mock('../services/supabase', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      },
      channel: vi.fn(),
      removeChannel: vi.fn(),
    },
  };
});

const mockSupabase = vi.mocked(supabase);

const createMockChain = (overrides = {}) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    ...overrides,
  };
  return chain;
};

const createTestProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'test-id-1',
  title: 'Test Product',
  description: 'Test Description',
  price: 9.99,
  image_url: 'https://example.com/image.jpg',
  user_id: 'user-1',
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('useProductsStore', () => {
  let store: ReturnType<typeof useProductsStore.getState>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = useProductsStore.getState();
    useProductsStore.setState({ products: [], loading: false, error: null });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchProducts', () => {
    it('sets loading to true and error to null when starting fetch', async () => {
      const mockProducts = [createTestProduct({ id: '1' }), createTestProduct({ id: '2' })];
      const mockChain = createMockChain({
        order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.fetchProducts();

      const state = useProductsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.products).toHaveLength(2);
    });

    it('sets error when fetch fails', async () => {
      const errorMessage = 'Database error';
      const mockChain = createMockChain({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: errorMessage } }),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.fetchProducts();

      const state = useProductsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.products).toHaveLength(0);
    });

    it('handles network errors', async () => {
      const mockChain = createMockChain({
        order: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.fetchProducts();

      const state = useProductsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('orders products by created_at descending', async () => {
      const mockProducts = [
        createTestProduct({ id: '1', created_at: '2024-01-02T00:00:00.000Z' }),
        createTestProduct({ id: '2', created_at: '2024-01-01T00:00:00.000Z' }),
      ];
      const mockChain = createMockChain({
        order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.fetchProducts();

      const state = useProductsStore.getState();
      expect(state.products[0].id).toBe('1');
      expect(state.products[1].id).toBe('2');
    });
  });

  describe('addProduct', () => {
    it('adds product to state on success', async () => {
      const newProduct = createTestProduct({ id: 'new-id', title: 'New Product' });
      const mockChain = createMockChain({
        select: vi.fn().mockResolvedValue({ data: [newProduct], error: null }),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.addProduct({
        title: 'New Product',
        description: 'Description',
        price: 19.99,
        image_url: 'https://example.com/new.jpg',
        user_id: 'user-1',
      });

      const state = useProductsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.products).toHaveLength(1);
      expect(state.products[0].title).toBe('New Product');
      expect(state.products[0].id).toBe('new-id');
    });

    it('sets error when add fails', async () => {
      const errorMessage = 'Insert failed';
      const mockChain = createMockChain({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: errorMessage } }),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.addProduct({
        title: 'New Product',
        description: 'Description',
        price: 19.99,
        image_url: 'https://example.com/new.jpg',
        user_id: 'user-1',
      });

      const state = useProductsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.products).toHaveLength(0);
    });

    it('prepends new product to existing products', async () => {
      const existingProduct = createTestProduct({ id: 'existing', title: 'Existing' });
      const newProduct = createTestProduct({ id: 'new', title: 'New' });

      useProductsStore.setState({ products: [existingProduct] });

      const mockChain = createMockChain({
        select: vi.fn().mockResolvedValue({ data: [newProduct], error: null }),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.addProduct({
        title: 'New',
        description: 'Desc',
        price: 10,
        image_url: 'url',
        user_id: 'user-1',
      });

      const state = useProductsStore.getState();
      expect(state.products).toHaveLength(2);
      expect(state.products[0].id).toBe('new');
      expect(state.products[1].id).toBe('existing');
    });
  });

  describe('updateProduct', () => {
    it('updates product in state on success', async () => {
      const existingProduct = createTestProduct({ id: '1', title: 'Original', price: 10 });
      const updatedProduct = createTestProduct({ id: '1', title: 'Updated', price: 20 });

      useProductsStore.setState({ products: [existingProduct] });

      const mockChain = createMockChain({
        select: vi.fn().mockResolvedValue({ data: [updatedProduct], error: null }),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.updateProduct('1', { title: 'Updated', price: 20 });

      const state = useProductsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.products[0].title).toBe('Updated');
      expect(state.products[0].price).toBe(20);
    });

    it('sets error when update fails', async () => {
      const errorMessage = 'Update failed';
      const existingProduct = createTestProduct({ id: '1', title: 'Original' });

      useProductsStore.setState({ products: [existingProduct] });

      const mockChain = createMockChain({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: errorMessage } }),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.updateProduct('1', { title: 'Updated' });

      const state = useProductsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.products[0].title).toBe('Original');
    });

    it('does not affect other products when updating', async () => {
      const product1 = createTestProduct({ id: '1', title: 'Product 1' });
      const product2 = createTestProduct({ id: '2', title: 'Product 2' });
      const updatedProduct = createTestProduct({ id: '1', title: 'Updated Product 1' });

      useProductsStore.setState({ products: [product1, product2] });

      const mockChain = createMockChain({
        select: vi.fn().mockResolvedValue({ data: [updatedProduct], error: null }),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.updateProduct('1', { title: 'Updated Product 1' });

      const state = useProductsStore.getState();
      expect(state.products).toHaveLength(2);
      expect(state.products[0].title).toBe('Updated Product 1');
      expect(state.products[1].title).toBe('Product 2');
    });
  });

  describe('deleteProduct', () => {
    it('removes product from state on success', async () => {
      const product1 = createTestProduct({ id: '1', title: 'Product 1' });
      const product2 = createTestProduct({ id: '2', title: 'Product 2' });

      useProductsStore.setState({ products: [product1, product2] });

      const mockChain = createMockChain({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.deleteProduct('1');

      const state = useProductsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.products).toHaveLength(1);
      expect(state.products[0].id).toBe('2');
    });

    it('sets error when delete fails', async () => {
      const errorMessage = 'Delete failed';
      const product = createTestProduct({ id: '1' });

      useProductsStore.setState({ products: [product] });

      const mockChain = createMockChain({
        eq: vi.fn().mockResolvedValue({ error: { message: errorMessage } }),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.deleteProduct('1');

      const state = useProductsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.products).toHaveLength(1);
    });

    it('handles deleting non-existent product gracefully', async () => {
      useProductsStore.setState({ products: [] });

      const mockChain = createMockChain({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockSupabase.from.mockReturnValue(mockChain);

      await store.deleteProduct('non-existent');

      const state = useProductsStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.products).toHaveLength(0);
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useProductsStore.getState();
      expect(state.products).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});