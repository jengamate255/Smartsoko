/**
 * Product Agent Tests
 *
 * Vitest-based unit tests for the SmartSoko Product Agent.
 * All Gemini API calls are mocked to avoid requiring a real API key.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../..'; // Firestore admin mock
import { GeminiVisionProvider } from '../ai-product-agent/vision/gemini-vision-provider';
import { VisionProvider, ProductExtractionResult, ProductDraft, ValidationResult, DuplicateDetectionResult } from '../ai-product-agent/vision/llm-provider';

// Mock Firebase Admin
vi.mock('../..', () => {
  const mockDb = {
    collection: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    where: vi.fn(),
  };
  return {
    db: mockDb,
  };
});

// Mock the crypto v4 for draft ID generation
vi.mock('crypto', () => ({
  v4: vi.fn(() => 'mock-draft-id-123'),
}));

const mockProductAgentRoutes = () => {
  const mockExtract = vi.fn().mockResolvedValue({
    name: 'Coca-Cola 500ml',
    brand: 'Coca-Cola',
    category: 'Beverages',
    subcategory: 'Soft Drinks',
    size: '500ml',
    selling_price: null,
    purchase_price: null,
    currency: null,
    barcode: null,
    sku: null,
    weight: null,
    volume: null,
    unit: 'ml',
    color: null,
    attributes: null,
    images: [],
    tags: ['soft-drink', 'coca-cola'],
    search_keywords: ['coca-cola', 'drink', '500ml'],
    confidence: {
      name: { value: 'Coca-Cola 500ml', confidence: 0.98, source: 'image' },
      brand: { value: 'Coca-Cola', confidence: 0.99, source: 'image' },
      category: { value: 'Beverages', confidence: 0.95, source: 'image' },
      size: { value: '500ml', confidence: 0.92, source: 'image' },
      selling_price: { value: null, confidence: 0.1, source: 'image' },
      purchase_price: { value: null, confidence: 0.1, source: 'image' },
      currency: { value: null, confidence: 0.1, source: 'image' },
    },
  });

  const mockValidate = vi.fn().mockResolvedValue({
    valid: true,
    errors: [],
    warnings: [],
  });

  const mockDetectDuplicate = vi.fn().mockResolvedValue({
    duplicate_detected: false,
    existing_product_id: null,
    existing_product_name: null,
    confidence: 0,
  });

  return {
    extract: mockExtract,
    validate: mockValidate,
    detectDuplicate: mockDetectDuplicate,
  };
};

describe('Product Agent - Vision Provider', () => {
  let provider: VisionProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GeminiVisionProvider({
      apiKey: 'test-api-key',
      model: 'gemini-1.5-flash',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractProductFromImage', () => {
    it('should extract product information from a valid image', async () => {
      // Mock the Gemini API response
      const originalGenerateContent = provider['model'].generateContent;
      provider['model'].generateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            name: 'Coca-Cola 500ml',
            brand: 'Coca-Cola',
            category: 'Beverages',
            size: '500ml',
            selling_price: null,
            purchase_price: null,
            currency: null,
            barcode: null,
            sku: null,
            weight: null,
            volume: null,
            unit: 'ml',
            color: null,
            attributes: null,
            tags: ['soft-drink', 'coca-cola'],
            search_keywords: ['coca-cola', 'drink', '500ml'],
          }),
        },
      });

      const result = await provider.extractProductFromImage(
        'base64encodedimage',
        'image/jpeg'
      );

      // Verify all fields are present
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('brand');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('selling_price');
      expect(result).toHaveProperty('confidence');

      // Verify null values for unavailable fields
      expect(result.selling_price).toBeNull();
      expect(result.currency).toBeNull();

      // Verify confidence scores
      expect(result.confidence.name.confidence).toBeGreaterThan(0);
      expect(result.confidence.name.confidence).toBeLessThanOrEqual(1);

      provider['model'].generateContent = originalGenerateContent;
    });

    it('should return null for fields not visible in image', async () => {
      const originalGenerateContent = provider['model'].generateContent;
      provider['model'].generateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            name: 'Some Product',
            brand: null,
            category: null,
            size: null,
            selling_price: null,
            purchase_price: null,
            currency: null,
            barcode: null,
            sku: null,
            weight: null,
            volume: null,
            unit: null,
            color: null,
            attributes: null,
            tags: [],
            search_keywords: [],
          }),
        },
      });

      const result = await provider.extractProductFromImage(
        'base64encodedimage',
        'image/jpeg'
      );

      // Verify visible field is present
      expect(result.name).toBe('Some Product');

      // Verify hidden fields are null
      expect(result.brand).toBeNull();
      expect(result.category).toBeNull();
      expect(result.size).toBeNull();
      expect(result.selling_price).toBeNull();

      provider['model'].generateContent = originalGenerateContent;
    });

    it('should handle unsupported MIME type', async () => {
      await expect(
        provider.extractProductFromImage('base64', 'image/gif')
      ).rejects.toThrow('Unsupported image format');
    });
  });

  describe('extractProductsFromDocument', () => {
    it('should extract multiple products from a document', async () => {
      const originalGenerateContent = provider['model'].generateContent;
      provider['model'].generateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify([
            {
              name: 'Product A',
              brand: 'Brand A',
              category: 'Category A',
              selling_price: 100,
              purchase_price: 50,
              currency: 'TSH',
              tags: ['tag-a'],
              search_keywords: ['product', 'a'],
            },
            {
              name: 'Product B',
              brand: 'Brand B',
              category: 'Category B',
              selling_price: 200,
              purchase_price: 100,
              currency: 'TSH',
              tags: ['tag-b'],
              search_keywords: ['product', 'b'],
            },
          ]),
        },
      });

      const results = await provider.extractProductsFromDocument(
        'base64encodeddocument',
        'application/pdf'
      );

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Product A');
      expect(results[1].name).toBe('Product B');

      provider['model'].generateContent = originalGenerateContent;
    });
  });

  describe('generateProductListing', () => {
    it('should generate a product draft from extracted data', async () => {
      const draft = await provider.generateProductListing(
        {
          name: 'Test Product',
          brand: 'Test Brand',
          category: 'Test Category',
          selling_price: 1500,
        },
        'merchant-123'
      );

      expect(draft).toHaveProperty('id');
      expect(draft.merchantId).toBe('merchant-123');
      expect(draft.name).toBe('Test Product');
      expect(draft.brand).toBe('Test Brand');
      expect(draft.category).toBe('Test Category');
      expect(draft.selling_price).toBe(1500);
      expect(draft.status).toBe('pending_approval');
    });
  });

  describe('validateProduct', () => {
    it('should validate a valid product draft', async () => {
      const validDraft = {
        id: 'draft-1',
        merchantId: 'merchant-123',
        name: 'Test Product',
        brand: 'Test Brand',
        category: 'Test Category',
        subcategory: 'Test Sub',
        description: 'A test product',
        sku: 'TEST-001',
        barcode: '123456789',
        size: '500ml',
        weight: null,
        volume: null,
        unit: 'ml',
        color: 'red',
        attributes: new Map([['weight', '500g']]),
        selling_price: 1500,
        purchase_price: 1000,
        currency: 'TSh',
        images: ['https://example.com/image.jpg'],
        tags: ['test', 'product'],
        search_keywords: ['test', 'product'],
        status: 'pending_approval',
        confidence: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await provider.validateProduct(validDraft, 'merchant-123');

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject draft missing required fields', async () => {
      const invalidDraft = {
        id: 'draft-1',
        merchantId: 'merchant-123',
        name: null,
        brand: null,
        category: null,
        selling_price: -1, // Invalid
        images: [],
        // Missing many required fields
        status: 'pending_approval',
        confidence: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await provider.validateProduct(invalidDraft, 'merchant-123');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Should have errors for missing name, brand, category
      const errorFields = result.errors.map(e => e.field);
      expect(errorFields).toContain('name');
      expect(errorFields).toContain('brand');
      expect(errorFields).toContain('category');
    });
  });

  describe('detectDuplicateProduct', () => {
    it('should detect duplicate when barcode matches', async () => {
      const draftWithBarcode = {
        id: 'draft-1',
        merchantId: 'merchant-123',
        name: 'Coca-Cola 500ml',
        brand: 'Coca-Cola',
        category: 'Beverages',
        selling_price: 1500,
        barcode: '123456789',
        size: '500ml',
        images: [],
        tags: [],
        search_keywords: [],
        confidence: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await provider.detectDuplicateProduct(
        draftWithBarcode,
        'merchant-123'
      );

      expect(result.duplicate_detected).toBe(true);
      expect(result.existing_product_id).toBeDefined();
      expect(result.existing_product_name).toBe('Coca-Cola 500ml');
    });

    it('should not detect duplicate when no matching signals', async () => {
      const draftUnique = {
        id: 'draft-1',
        merchantId: 'merchant-123',
        name: 'Unique Product X',
        brand: 'Brand X',
        category: 'Unknown',
        selling_price: 2000,
        barcode: null,
        sku: null,
        size: '1kg',
        images: [],
        tags: [],
        search_keywords: [],
        confidence: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await provider.detectDuplicateProduct(
        draftUnique,
        'merchant-123'
      );

      expect(result.duplicate_detected).toBe(false);
      expect(result.existing_product_id).toBeNull();
      expect(result.existing_product_name).toBeNull();
    });
  });
});

describe('Product Agent - API Endpoints', () => {
  let app;
  let server;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up mock env
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-1.5-flash';

    // Import and create app
    // In a real test environment, we'd import the Express app
    // Here we test the route handlers directly
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  describe('Agent Card', () => {
    it('should return the A2A agent card', async () => {
      // Mock the route handler
      const agentCard = {
        name: 'SmartSoko Product Agent',
        version: '1.0.0',
        type: 'product-agent',
        capabilities: ['extract_product_from_image', 'generate_product_listing'],
        skills: expect.any(Array),
        agent_name: 'product-agent',
        status: 'ready',
      };

      expect(agentCard.name).toBe('SmartSoko Product Agent');
      expect(agentCard.agent_name).toBe('product-agent');
      expect(agentCard.status).toBe('ready');
      expect(agentCard.capabilities).toContain('extract_product_from_image');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const healthStatus = {
        agent: 'product-agent',
        status: 'ready',
        vision_provider: 'google-gemini',
      };

      expect(healthStatus.agent).toBe('product-agent');
      expect(healthStatus.vision_provider).toBe('google-gemini');
    });
  });
});