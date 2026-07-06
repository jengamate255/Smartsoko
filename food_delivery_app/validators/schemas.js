/**
 * Zod Validation Schemas for SmartSoko API
 */

const { z } = require('zod');

// Helper for Firebase ID strings
const idString = z.string().min(1).max(128);

// Order item schema
const orderItemSchema = z.object({
  productId: idString,
  name: z.string().min(1).max(200),
  quantity: z.number().int().positive().max(100),
  price: z.number().positive().max(10000000),
  sellerId: idString
});

// Order creation schema
const createOrderSchema = z.object({
  customerId: idString,
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(5).max(20).optional(),
  customerEmail: z.string().email().optional(),
  deliveryAddress: z.string().min(5).max(500),
  deliveryLocation: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  items: z.array(orderItemSchema).min(1).max(50),
  total: z.number().positive().max(100000000),
  deliveryFee: z.number().min(0).max(1000000).optional(),
  notes: z.string().max(500).optional(),
  paymentMethod: z.enum(['mpesa', 'card', 'cash', 'wallet']).default('cash'),
  sellerId: idString
});

// Order status update schema
const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'preparing', 'ready_for_delivery', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled']),
  notes: z.string().max(500).optional()
});

// Driver accept order schema
const acceptOrderSchema = z.object({
  driverId: idString,
  driverName: z.string().min(1).max(100),
  driverPhone: z.string().min(5).max(20).optional(),
  vehicleType: z.string().max(50).optional()
});

// Product creation schema
const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().positive().max(10000000),
  category: z.string().min(1).max(100),
  imageUrl: z.string().url().max(500).optional().or(z.literal('')),
  isAvailable: z.boolean().default(true),
  inStock: z.boolean().default(true),
  preparationTime: z.number().int().min(0).max(1440).optional(), // minutes
  tags: z.array(z.string().max(50)).max(20).optional()
});

// Product update schema
const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().positive().max(10000000).optional(),
  category: z.string().min(1).max(100).optional(),
  imageUrl: z.string().url().max(500).optional().or(z.literal('')),
  isAvailable: z.boolean().optional(),
  inStock: z.boolean().optional(),
  preparationTime: z.number().int().min(0).max(1440).optional(),
  tags: z.array(z.string().max(50)).max(20).optional()
});

// Seller/Merchant creation schema
const createSellerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  category: z.enum(['food', 'dairy', 'fruits', 'groceries', 'bakery', 'other']),
  address: z.string().min(5).max(500),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  phone: z.string().min(5).max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  openingHours: z.object({
    open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
  }).optional(),
  deliveryFee: z.number().min(0).max(1000000).default(0),
  minOrderAmount: z.number().min(0).max(1000000).default(0),
  imageUrl: z.string().url().max(500).optional().or(z.literal('')),
  isOpen: z.boolean().default(true),
  rating: z.number().min(0).max(5).optional(),
  tags: z.array(z.string().max(50)).max(20).optional()
});

// Driver update schema
const updateDriverSchema = z.object({
  isOnline: z.boolean().optional(),
  currentLocation: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  vehicleType: z.string().max(50).optional(),
  licensePlate: z.string().max(20).optional()
});

// Review creation schema
const createReviewSchema = z.object({
  sellerId: idString,
  orderId: idString,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional()
});

// User profile update schema
const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().min(5).max(20).optional(),
  address: z.string().max(500).optional(),
  photoURL: z.string().url().max(500).optional().or(z.literal(''))
});

// Query parameter schemas
const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20').refine(n => n <= 100, 'Max limit is 100')
});

const categoryFilterSchema = z.object({
  category: z.enum(['food', 'dairy', 'fruits', 'groceries', 'bakery', 'all']).optional()
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  acceptOrderSchema,
  createProductSchema,
  updateProductSchema,
  createSellerSchema,
  updateDriverSchema,
  createReviewSchema,
  updateUserSchema,
  paginationSchema,
  categoryFilterSchema,
  orderItemSchema
};
