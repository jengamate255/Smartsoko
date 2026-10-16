const { z } = require('zod');

// Product extraction schema - validates the request body for image extraction
const productExtractSchema = z.object({
  image: z.string().base64({ error: 'Image must be valid base64 encoding' }).min(1, 'Image data is required'),
  mimeType: z
    .string()
    .optional()
    .default('image/jpeg')
    .refine(
      (val) => val === 'image/jpeg' || val === 'image/png' || val === 'image/webp',
      'Unsupported mime type. Use image/jpeg, image/png, or image/webp.'
    ),
});

const productDraftSchema = z.object({
  extraction_result: z.object({
    name: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    description: z.string().optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    size: z.string().optional(),
    weight: z.string().optional(),
    volume: z.string().optional(),
    unit: z.string().optional(),
    color: z.string().optional(),
    purchase_price: z.number().optional(),
    selling_price: z.number().optional(),
    currency: z.string().optional(),
    tags: z.array(z.string()).optional(),
    search_keywords: z.array(z.string()).optional(),
    confidence: z.record(z.number()).optional(),
  }),
  merchant_id: z.string().min(1, 'Merchant ID is required'),
});

const productValidateSchema = z.object({
  draft: z.object({
    name: z.string().optional(),
    brand: z.string().optional(),
    category: z.string().optional(),
    selling_price: z.number().optional(),
    purchase_price: z.number().optional(),
    currency: z.string().optional(),
    stock_quantity: z.number().optional(),
    status: z.enum(['pending_approval', 'approved', 'rejected']).optional(),
  }),
  merchant_id: z.string().min(1, 'Merchant ID is required'),
});

const productDetectDuplicateSchema = z.object({
  name: z.string().optional(),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  brand: z.string().optional(),
  size: z.string().optional(),
});

module.exports = {
  schemas: {
    productExtract: productExtractSchema,
    productDraft: productDraftSchema,
    productValidate: productValidateSchema,
    productDetectDuplicate: productDetectDuplicateSchema,
  },
};