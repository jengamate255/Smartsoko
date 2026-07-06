/**
 * Supabase Client - Adapted from web app
 * Core service layer for database operations
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/config';
import { 
  User, Profile, Vendor, Product, Order, 
  Chat, ChatMessage, CartItem, Promotion, Category 
} from '@/types/models';

// Create Supabase client with AsyncStorage for auth persistence
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============================================================================
// AUTHENTICATION
// ============================================================================

export const authService = {
  async signUp(email: string, password: string, options: { 
    role?: string; 
    fullName?: string;
    phone?: string;
  } = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: options.role || 'customer',
          full_name: options.fullName,
          phone: options.phone,
        },
      },
    });

    if (data.user && !error) {
      // Create profile
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        role: options.role || 'customer',
        full_name: options.fullName,
        phone: options.phone,
      });
    }

    return { data, error };
  },

  async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ============================================================================
// VENDORS / SELLERS
// ============================================================================

export const vendorService = {
  async getAll(options: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
    isOpen?: boolean;
  } = {}) {
    let query = supabase
      .from('sellers')
      .select('*')
      .order('rating', { ascending: false });

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.isOpen !== undefined) {
      query = query.eq('is_open', options.isOpen);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Local text search if provided
    let vendors = data || [];
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      vendors = vendors.filter((v: Vendor) =>
        v.name?.toLowerCase().includes(searchLower) ||
        v.description?.toLowerCase().includes(searchLower)
      );
    }

    return vendors as Vendor[];
  },

  async getById(id: string): Promise<Vendor | null> {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByOwner(ownerId: string): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('owner_id', ownerId);

    if (error) throw error;
    return data || [];
  },

  subscribeToChanges(callback: (payload: any) => void) {
    return supabase
      .channel('sellers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sellers' }, callback)
      .subscribe();
  },
};

// ============================================================================
// PRODUCTS
// ============================================================================

export const productService = {
  async getByVendor(vendorId: string, options: {
    category?: string;
    isAvailable?: boolean;
  } = {}) {
    let query = supabase
      .from('products')
      .select('*')
      .eq('seller_id', vendorId)
      .order('category');

    if (options.isAvailable !== undefined) {
      query = query.eq('is_available', options.isAvailable);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as Product[];
  },

  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getPopular(limit: number = 6): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async search(query: string, options: {
    category?: string;
    vendorId?: string;
    limit?: number;
  } = {}) {
    let dbQuery = supabase
      .from('products')
      .select('*, sellers(name)')
      .eq('is_available', true)
      .textSearch('name', query)
      .limit(options.limit || 20);

    if (options.category) {
      dbQuery = dbQuery.eq('category', options.category);
    }

    if (options.vendorId) {
      dbQuery = dbQuery.eq('seller_id', options.vendorId);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;
    return data || [];
  },

  subscribeToVendorProducts(vendorId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`products-${vendorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `seller_id=eq.${vendorId}`,
        },
        callback
      )
      .subscribe();
  },
};

// ============================================================================
// ORDERS
// ============================================================================

export const orderService = {
  async getForCustomer(customerId: string, limit: number = 20): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getForVendor(vendorId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getForDriver(driverId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  },

  async create(orderData: Partial<Order>): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(
    orderId: string, 
    status: string, 
    additionalData: Record<string, any> = {}
  ) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status,
        ...additionalData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAvailableForDelivery(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'ready_for_delivery')
      .is('driver_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  subscribeToOrder(orderId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        callback
      )
      .subscribe();
  },

  subscribeToCustomerOrders(customerId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`customer-orders-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${customerId}`,
        },
        callback
      )
      .subscribe();
  },
};

// ============================================================================
// CHAT / MESSAGES
// ============================================================================

export const chatService = {
  async getChatsForUser(userId: string): Promise<Chat[]> {
    // Get chats where user is a participant
    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        messages:chat_messages(count),
        last_message:chat_messages(*)
      `)
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getMessages(chatId: string, limit: number = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async sendMessage(
    chatId: string,
    senderId: string,
    text: string,
    senderRole: string
  ): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        sender_role: senderRole,
        text,
        read: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Update chat's updated_at
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    return data;
  },

  async markAsRead(chatId: string, userId: string) {
    const { error } = await supabase
      .from('chat_messages')
      .update({ read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', userId)
      .eq('read', false);

    if (error) throw error;
  },

  async getOrCreateChat(orderId: string, customerId: string, driverId: string): Promise<Chat> {
    // Check if chat exists
    const { data: existingChat } = await supabase
      .from('chats')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingChat) return existingChat;

    // Create new chat
    const { data, error } = await supabase
      .from('chats')
      .insert({
        order_id: orderId,
        participant_1_id: customerId,
        participant_2_id: driverId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  subscribeToChat(chatId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`chat-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        callback
      )
      .subscribe();
  },
};

// ============================================================================
// PROMOTIONS
// ============================================================================

export const promotionService = {
  async getActive(): Promise<Promotion[]> {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async validateCode(code: string): Promise<{ valid: boolean; promo?: Promotion; error?: string }> {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Invalid promo code' };
    }

    const promo = data as Promotion;
    const now = new Date();
    const validFrom = new Date(promo.validFrom);
    const validUntil = promo.validUntil ? new Date(promo.validUntil) : null;

    if (validUntil && now > validUntil) {
      return { valid: false, error: 'Promo code expired' };
    }

    if (now < validFrom) {
      return { valid: false, error: 'Promo code not yet active' };
    }

    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      return { valid: false, error: 'Promo code usage limit reached' };
    }

    return { valid: true, promo };
  },
};

// ============================================================================
// STORAGE
// ============================================================================

export const storageService = {
  async uploadFile(bucket: string, path: string, file: File | Blob) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    return data;
  },

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },
};

export default supabase;
