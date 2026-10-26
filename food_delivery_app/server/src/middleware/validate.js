const { z } = require('zod');
const { sendError } = require('../utils/api-messages');

const dealSchema = z.object({
  name: z.string().min(1).max(100),
  productIds: z.array(z.string()).min(1),
  dealPrice: z.number().positive(),
  discountPercent: z.number().min(0).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
  merchantId: z.string().optional(),
  isActive: z.boolean().optional(),
});

const giftCardSchema = z.object({
  code: z.string().min(1).max(50),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  purchaserId: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  message: z.string().max(500).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

const subscriptionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  currency: z.string().length(3).optional(),
  interval: z.enum(['monthly', 'yearly']),
  features: z.array(z.string()).optional(),
  merchantId: z.string().optional(),
  isActive: z.boolean().optional(),
});

const referralSchema = z.object({
  referrerId: z.string().min(1),
  refereeId: z.string().min(1),
  rewardAmount: z.number().min(0).optional(),
  rewardType: z.enum(['wallet_credit', 'discount', 'free_delivery']).optional(),
});

const reviewSchema = z.object({
  productId: z.string().min(1),
  userId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  orderId: z.string().nullable().optional(),
});

const addressSchema = z.object({
  address: z.string().min(5).max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

const promoSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  discountPercent: z.number().min(1).max(100),
  maxDiscount: z.number().positive().optional(),
  minOrderAmount: z.number().min(0).optional(),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

const orderSchema = z.object({
  items: z.array(z.object({
    id: z.string().min(1).max(200),
    name: z.string().max(200).optional(),
    price: z.number().finite().positive().optional(),
    quantity: z.number().int().positive().max(10000),
    merchantId: z.string().optional(),
    sellerId: z.string().optional(),
    // checkout.html sends `variation: item.variation || null` — an explicit null
  // must not fail validation.
  variation: z.string().nullable().optional(),
    variationDelta: z.number().optional(),
  })).min(1).max(100),
  deliveryAddress: z.string().min(5).max(500),
  deliveryLat: z.number().min(-90).max(90).nullable().optional(),
  deliveryLng: z.number().min(-180).max(180).nullable().optional(),
  phone: z.string().min(10).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  // 'ntzs' = nTZS Wallet; 'pesapal' = PesaPal hosted checkout (both are
  // real options in public/checkout.html and must pass validation — the
  // payment flow continues via /api/payments/* after order creation)
  paymentMethod: z.enum(['mpesa', 'tigo', 'airtel', 'halopesa', 'cod', 'ntzs', 'pesapal']),
  paymentNumber: z.string().max(30).nullable().optional(),
  promoCode: z.string().trim().max(50).nullable().optional(),
  quotedTotal: z.number().finite().nonnegative().optional(),
  // Legacy aliases sent by public/checkout.html's order payload
  customerName: z.string().min(1).max(100).optional(),
  customerPhone: z.string().min(10).max(20).optional(),
  contactPhone: z.string().min(10).max(20).optional(),
})
  .refine(d => d.name || d.customerName, { message: 'name or customerName is required' })
  .refine(d => d.phone || d.customerPhone || d.contactPhone, { message: 'phone or customerPhone/contactPhone is required' });

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return sendError(res, req, 400, 'VALIDATION_FAILED', {
      details: result.error.flatten().fieldErrors,
      messages: result.error.flatten().formErrors,
    });
  }
  req.validated = result.data;
  next();
};

const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return sendError(res, req, 400, 'INVALID_QUERY_PARAMS', {
      details: result.error.flatten().fieldErrors,
    });
  }
  req.validatedQuery = result.data;
  next();
};

const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    return sendError(res, req, 400, 'INVALID_ROUTE_PARAMS', {
      details: result.error.flatten().fieldErrors,
    });
  }
  req.validatedParams = result.data;
  next();
};

module.exports = {
  validate,
  validateQuery,
  validateParams,
  schemas: {
    deal: dealSchema,
    giftCard: giftCardSchema,
    subscription: subscriptionSchema,
    referral: referralSchema,
    review: reviewSchema,
    address: addressSchema,
    promo: promoSchema,
    order: orderSchema,
    pagination: paginationSchema,
  },
};
