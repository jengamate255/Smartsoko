// TypeScript interfaces for the Driver Dashboard
interface DriverEarnings {
  driver_id: string;
  date: string;
  amount: number;
  orders_count: number;
  hours_worked: number;
}

interface DriverProfile {
  id: string;
  user_metadata?: {
    rating?: string;
    online_hours?: string;
  };
}

interface Order {
  id: string;
  status: string;
  driver_id?: string;
  driver_assigned: boolean;
  accepted_at?: string;
  delivered_at?: string;
  total_amount: number;
  delivery_address: string;
  created_at: string;
  customer: {
    name: string;
    phone: string;
  };
  restaurant: {
    name: string;
    address: string;
  };
}

// TypeScript class for managing driver earnings
class DriverEarningsManager {
  private todayEarningsElement: HTMLElement | null;
  private supabase: any;
  private currentDriver: DriverProfile | null;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.todayEarningsElement = document.getElementById('todayEarnings');
    this.currentDriver = null;
  }

  // Set the current driver
  setCurrentDriver(driver: DriverProfile): void {
    this.currentDriver = driver;
  }

  // Load today's earnings with proper typing
  async loadTodayEarnings(): Promise<void> {
    if (!this.currentDriver) {
      console.error('No driver profile loaded');
      return;
    }

    try {
      const today: string = new Date().toISOString().split('T')[0];
      
      const { data: earnings, error } = await this.supabase
        .from('driver_earnings')
        .select('amount')
        .eq('driver_id', this.currentDriver.id)
        .eq('date', today);

      if (error) {
        throw error;
      }

      const totalEarnings: number = earnings?.reduce((sum: number, e: DriverEarnings) => sum + e.amount, 0) || 0;
      this.updateTodayEarningsDisplay(totalEarnings);

    } catch (error) {
      console.error('Error loading today\'s earnings:', error);
      this.updateTodayEarningsDisplay(0);
    }
  }

  // Update the today earnings display with proper formatting
  private updateTodayEarningsDisplay(amount: number): void {
    if (this.todayEarningsElement) {
      this.todayEarningsElement.textContent = `$${amount.toFixed(2)}`;
      
      // Add animation for earnings update
      this.todayEarningsElement.classList.add('animate-pulse');
      setTimeout(() => {
        this.todayEarningsElement?.classList.remove('animate-pulse');
      }, 1000);
    }
  }

  // Calculate earnings from orders (alternative method)
  async calculateEarningsFromOrders(): Promise<number> {
    if (!this.currentDriver) {
      return 0;
    }

    try {
      const today: string = new Date().toISOString().split('T')[0];
      
      const { data: orders, error } = await this.supabase
        .from('orders')
        .select('total_amount, delivery_fee')
        .eq('driver_id', this.currentDriver.id)
        .eq('status', 'delivered')
        .gte('delivered_at', today)
        .lt('delivered_at', new Date(Date.now() + 86400000).toISOString()); // Tomorrow

      if (error) {
        throw error;
      }

      const totalEarnings: number = orders?.reduce((sum: number, order: Order) => {
        return sum + (order.delivery_fee || order.total_amount * 0.1); // 10% commission or delivery fee
      }, 0) || 0;

      return totalEarnings;

    } catch (error) {
      console.error('Error calculating earnings from orders:', error);
      return 0;
    }
  }

  // Get earnings summary for different periods
  async getEarningsSummary(period: 'today' | 'week' | 'month'): Promise<{
    amount: number;
    orders: number;
    hours: number;
  }> {
    if (!this.currentDriver) {
      return { amount: 0, orders: 0, hours: 0 };
    }

    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      const { data: earnings, error } = await this.supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', this.currentDriver.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', now.toISOString().split('T')[0]);

      if (error) {
        throw error;
      }

      const summary = earnings?.reduce((acc: any, earning: DriverEarnings) => {
        acc.amount += earning.amount;
        acc.orders += earning.orders_count;
        acc.hours += earning.hours_worked;
        return acc;
      }, { amount: 0, orders: 0, hours: 0 }) || { amount: 0, orders: 0, hours: 0 };

      return summary;

    } catch (error) {
      console.error(`Error getting ${period} earnings summary:`, error);
      return { amount: 0, orders: 0, hours: 0 };
    }
  }
}

// Export for use in the main application
declare global {
  interface Window {
    driverEarningsManager?: DriverEarningsManager;
  }
}
