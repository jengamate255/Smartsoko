/**
 * SmartSoko Data Models
 * Mirrored from web app for type consistency
 */

export type UserRole = 'customer' | 'merchant' | 'driver' | 'admin';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  phone?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export type Category = 
  | 'food' 
  | 'dairy' 
  | 'fruits' 
  | 'vegetables' 
  | 'groceries' 
  | 'bakery' 
  | 'fishing'
  | 'honey'
  | 'artisan';

export interface CategoryInfo {
  name: Category;
  displayName: string;
  icon: string;
  color: string;
  count?: number;
}

export interface Vendor {
  id: string;
  name: string;
  description?: string;
  category: Category;
  imageUrl?: string;
  rating: number;
  reviews: number;
  deliveryTime: string;
  deliveryFee: number;
  minOrder?: number;
  isOpen: boolean;
  address?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  ownerId: string;
  phone?: string;
}

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  category?: string;
  isAvailable: boolean;
  stock?: number;
  unit?: string;
  rating?: number;
  reviews?: number;
  tags?: string[];
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_delivery'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  sellerId: string;
  sellerName?: string;
  driverId?: string;
  driverName?: string;
  items: OrderItem[];
  total: number;
  deliveryFee: number;
  discount?: number;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryLocation?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  sellerId: string;
  sellerName?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  createdAt: string;
  read: boolean;
  attachments?: {
    type: 'image' | 'location';
    url: string;
  }[];
}

export interface Chat {
  id: string;
  orderId?: string;
  participants: {
    id: string;
    name: string;
    role: UserRole;
    avatar?: string;
  }[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil?: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'order' | 'chat' | 'promo' | 'system';
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}
