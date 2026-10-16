const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SmartSoko API',
      version: '1.0.0',
      description: 'SmartSoko Marketplace API - Food delivery, marketplace, and logistics platform',
      contact: {
        name: 'SmartSoko Team',
        email: 'api@smartsoko.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.smartsoko.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        idempotencyKey: {
          type: 'apiKey',
          in: 'header',
          name: 'Idempotency-Key',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
            details: { type: 'object' },
          },
        },
        Deal: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            productIds: { type: 'array', items: { type: 'string' } },
            dealPrice: { type: 'number' },
            discountPercent: { type: 'number' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time', nullable: true },
            merchantId: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        GiftCard: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            code: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            purchaserId: { type: 'string', nullable: true },
            recipientEmail: { type: 'string', format: 'email', nullable: true },
            message: { type: 'string', nullable: true },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
            balance: { type: 'number' },
            isRedeemed: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            currency: { type: 'string' },
            interval: { type: 'string', enum: ['monthly', 'yearly'] },
            features: { type: 'array', items: { type: 'string' } },
            merchantId: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Referral: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            referrerId: { type: 'string' },
            refereeId: { type: 'string' },
            rewardAmount: { type: 'number' },
            rewardType: { type: 'string', enum: ['wallet_credit', 'discount', 'free_delivery'] },
            status: { type: 'string', enum: ['pending', 'completed', 'cancelled'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            productId: { type: 'string' },
            userId: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string' },
            orderId: { type: 'string', nullable: true },
            verified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Address: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            address: { type: 'string' },
            latitude: { type: 'number', nullable: true },
            longitude: { type: 'number', nullable: true },
            isDefault: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PromoCode: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            code: { type: 'string' },
            discountPercent: { type: 'integer' },
            maxDiscount: { type: 'number', nullable: true },
            minOrderAmount: { type: 'number' },
            usageLimit: { type: 'integer', nullable: true },
            usedCount: { type: 'integer' },
            expiresAt: { type: 'string', format: 'date-time', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            customerName: { type: 'string' },
            customerPhone: { type: 'string' },
            customerAddress: { type: 'string' },
            deliveryAddress: { type: 'string' },
            customerId: { type: 'string' },
            merchantId: { type: 'string', nullable: true },
            sellerId: { type: 'string', nullable: true },
            sellerName: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  price: { type: 'number' },
                  quantity: { type: 'integer' },
                  merchantId: { type: 'string', nullable: true },
                  sellerId: { type: 'string', nullable: true },
                  variation: { type: 'string', nullable: true },
                  variationDelta: { type: 'number' },
                },
              },
            },
            subtotal: { type: 'number' },
            deliveryFee: { type: 'number' },
            tax: { type: 'number' },
            discount: { type: 'number' },
            promoCode: { type: 'string', nullable: true },
            total: { type: 'number' },
            deliveryLat: { type: 'number', nullable: true },
            deliveryLng: { type: 'number', nullable: true },
            status: { type: 'string' },
            paymentMethod: { type: 'string' },
            paymentStatus: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                services: {
                  type: 'object',
                  properties: {
                    firestore: { type: 'string' },
                    supabase: { type: 'string' },
                    pesapal: { type: 'string' },
                    mapbox: { type: 'string' },
                  },
                },
                overall: { type: 'string', enum: ['healthy', 'degraded'] },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Health', description: 'System health and configuration' },
      { name: 'Deals', description: 'Flash deals and promotions' },
      { name: 'Gift Cards', description: 'Gift card management' },
      { name: 'Subscriptions', description: 'Subscription plans' },
      { name: 'Referrals', description: 'Referral system' },
      { name: 'Reviews', description: 'Product reviews and ratings' },
      { name: 'Addresses', description: 'Customer addresses' },
      { name: 'Promo Codes', description: 'Promotional codes' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Auth', description: 'Authentication' },
    ],
  },
  apis: ['./server/src/routes/*.js'],
};

const specs = swaggerJsdoc(options);

function swaggerSetup(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SmartSoko API Documentation',
  }));
  
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}

module.exports = { swaggerSetup, specs };