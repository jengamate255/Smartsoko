import { supabase } from '@/services/supabase';

export interface MerchantOrder {
  id: string;
  status: string;
  total: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  created_at: string;
  driver_name?: string;
  driver_phone?: string;
}

export interface MerchantStats {
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  averageOrderValue: number;
}

export class MerchantService {
  private restaurantId: string | null = null;

  setRestaurantId(id: string) {
    this.restaurantId = id;
  }

  async getStats(): Promise<MerchantStats> {
    if (!this.restaurantId) throw new Error('Restaurant ID not set');

    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('total, status, created_at')
      .eq('restaurant_id', this.restaurantId);

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const todayOrders = (allOrders || []).filter(o => o.created_at?.startsWith(today));
    const deliveredOrders = (allOrders || []).filter(o => ['delivered', 'completed'].includes(o.status));
    const todayDelivered = todayOrders.filter(o => ['delivered', 'completed'].includes(o.status));

    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const todayRevenue = todayDelivered.reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      totalOrders: allOrders?.length || 0,
      todayOrders: todayOrders.length,
      pendingOrders: (allOrders || []).filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
      totalRevenue,
      todayRevenue,
      averageOrderValue: deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0,
    };
  }

  async getOrders(status?: string): Promise<MerchantOrder[]> {
    if (!this.restaurantId) throw new Error('Restaurant ID not set');

    let query = supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(order => ({
      id: order.id,
      status: order.status,
      total: order.total || 0,
      customer_name: order.customer_name || 'Unknown',
      customer_phone: order.customer_phone || '',
      customer_address: order.customer_address || '',
      items: order.items || [],
      created_at: order.created_at,
      driver_name: order.driver_name,
      driver_phone: order.driver_phone,
    }));
  }

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) throw error;
  }

  subscribeToOrders(callback: (orders: MerchantOrder[]) => void) {
    if (!this.restaurantId) return null;

    return supabase
      .channel('merchant-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${this.restaurantId}` },
        () => this.getOrders().then(callback)
      )
      .subscribe();
  }

  async getProducts() {
    if (!this.restaurantId) throw new Error('Restaurant ID not set');

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', this.restaurantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async toggleProductAvailability(productId: string, isAvailable: boolean) {
    const { error } = await supabase
      .from('products')
      .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (error) throw error;
  }

  async getActiveDrivers() {
    const { data, error } = await supabase
      .from('drivers')
      .select('id, name, phone, status, current_latitude, current_longitude')
      .eq('status', 'online');

    if (error) throw error;
    return data || [];
  }

  subscribeToDrivers(callback: (drivers: any[]) => void) {
    return supabase
      .channel('merchant-drivers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        () => this.getActiveDrivers().then(callback)
      )
      .subscribe();
  }
}

export const merchantService = new MerchantService();