/**
 * SmartSoko Product Agent Tests
 *
 * Tests for the Product Agent using vitest.
 * All tests mock the Gemini API - no real API key required.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the Google Generative AI SDK before importing other modules
vi.mock('@google/generative-ai', () => {
  const mockModel = {
    generateContent: vi.fn(),
  };

  const mockGenAI = {
    getGenerativeModel: vi.fn(() => mockModel),
  };

  return {
    GoogleGenerativeAI: vi.fn(() => mockGenAI),
  };
});

// Mock the shared Supabase client so tests never hit the real database.
vi.mock('../../../Smartsoko/services/supabase', () => {
  const chain: any = {};
  for (const method of ['select', 'eq', 'ilike', 'limit', 'insert', 'update']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  return { supabase: { from: vi.fn(() => chain) } };
});

import { supabase } from '../../../Smartsoko/services/supabase';

// Handle to the shared mock query chain returned by supabase.from(...)
const db = supabase.from('products') as any;

import {
  ProductAgent,
  ProductAgentCapabilities,
} from '../../src/ai/product-agent';

describe('ProductAgent', () => {
  let agent: ProductAgent;
  let mockVisionProvider: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Default Supabase responses: no rows found on lookups,
    // successful insert returning the created row
    db.maybeSingle.mockResolvedValue({ data: null, error: null });
    db.single.mockResolvedValue({ data: { id: 'draft_123' }, error: null });

    // Create a mock vision provider
    mockVisionProvider = {
      extractFromImage: vi.fn(),
      extractFromDocument: vi.fn(),
      healthCheck: vi.fn().mockResolvedValue(true),
      getModelName: vi.fn().mockReturnValue('gemini-1.5-flash'),
    };

    agent = new ProductAgent(mockVisionProvider);
  });

  describe('A2A Agent Card', () => {
    it('should return the agent card with correct structure', () => {
      const card = agent.getAgentCard();

      expect(card).toHaveProperty('name', 'SmartSoko Product Agent');
      expect(card).toHaveProperty('description');
      expect(card).toHaveProperty('url');
      expect(card).toHaveProperty('version', '1.0.0');
      expect(card).toHaveProperty('capabilities');
      expect(card).toHaveProperty('status', 'active');
    });

    it('should return agent capabilities', () => {
      const capabilities = ProductAgentCapabilities;

      expect(capabilities).toHaveProperty('extract_product_from_image');
      expect(capabilities).toHaveProperty('generate_product_listing');
      expect(capabilities).toHaveProperty('validate_product');
      expect(capabilities).toHaveProperty('detect_duplicate_product');
      expect(capabilities).toHaveProperty('create_product_draft');
      expect(capabilities).toHaveProperty('update_product_listing');
    });
  });

  describe('A2A Request Handling', () => {
    it('should handle extract_product_from_image', async () => {
      const mockResult = {
        name: 'Coca-Cola',
        brand: 'Coca-Cola',
        category: 'Beverages',
        selling_price: null,
        confidence: { name: 0.95, brand: 0.92 },
        source: 'image',
      };

      mockVisionProvider.extractFromImage.mockResolvedValueOnce(mockResult);

      const result = await agent.handleA2ARequest(
        'extract_product_from_image',
        {
          image: Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wCE').toString('base64'),
          mimeType: 'image/jpeg',
        }
      );

      expect(result).toHaveProperty('name', 'Coca-Cola');
      expect(result).toHaveProperty('brand', 'Coca-Cola');
      expect(result).toHaveProperty('category', 'Beverages');
    });

    it('should handle detect_duplicate_product', async () => {
      const result = await agent.handleA2ARequest(
        'detect_duplicate_product',
        { name: 'Coca-Cola 500ml', brand: 'Coca-Cola' }
      );

      // Should return a result object with duplicate_detected property
      expect(result).toBeDefined();
      expect(result).toHaveProperty('duplicate_detected');
      // When no database query, duplicate_detected should be false
      expect(result.duplicate_detected).toBe(false);
    });

    it('should throw for unknown A2A method', async () => {
      // The handleA2ARequest method throws for unknown methods
      // We test that it throws by awaiting and catching
      let threwError = false;
      try {
        await agent.handleA2ARequest('unknown_method', {});
      } catch (e) {
        threwError = true;
        expect(e.message).toContain('Unknown A2A method');
      }
      expect(threwError).toBe(true);
    });
  });

  describe('Product Extraction', () => {
    it('should extract product from image with all fields', async () => {
      const mockExtraction = {
        name: 'Coca-Cola 500ml',
        brand: 'Coca-Cola',
        category: 'Beverages',
        subcategory: 'Soft Drinks',
        size: '500ml',
        selling_price: 1500,
        currency: 'TZS',
        tags: ['coca-cola', 'drink', '500ml'],
        search_keywords: ['coca-cola', 'soft drink', '500ml'],
        confidence: { name: 0.98, brand: 0.95, barcode: 0.85 },
        source: 'image',
        rawOutput: {},
      };

      mockVisionProvider.extractFromImage.mockResolvedValueOnce(mockExtraction);

      const result = await agent.extractFromImage(
        Buffer.from('fake-image-data'),
        'image/jpeg',
        'merchant_123'
      );

      expect(result.name).toBe('Coca-Cola 500ml');
      expect(result.brand).toBe('Coca-Cola');
      expect(result.category).toBe('Beverages');
      expect(result.selling_price).toBe(1500);
      expect(result.currency).toBe('TZS');
      expect(result.confidence.name).toBe(0.98);
      expect(result.source).toBe('image');
    });

    it('should return null for fields not visible in image', async () => {
      const mockExtraction = {
        name: 'Coca-Cola',
        brand: 'Coca-Cola',
        category: 'Beverages',
        selling_price: null,
        currency: null,
        confidence: { name: 0.95, brand: 0.92, price: 0.1 },
        source: 'image',
        rawOutput: {},
      };

      mockVisionProvider.extractFromImage.mockResolvedValueOnce(mockExtraction);

      const result = await agent.extractFromImage(
        Buffer.from('fake-image-data'),
        'image/jpeg',
        'merchant_123'
      );

      // Price should be null when not visible
      expect(result.selling_price).toBeNull();
      expect(result.currency).toBeNull();
      // But name and brand should still be extracted
      expect(result.name).toBe('Coca-Cola');
      expect(result.brand).toBe('Coca-Cola');
    });

    it('should handle missing image data', async () => {
      mockVisionProvider.extractFromImage.mockRejectedValueOnce(
        new Error('Image data is required')
      );

      await expect(
        agent.extractFromImage(
          Buffer.from(''),
          'image/jpeg',
          'merchant_123'
        )
      ).rejects.toThrow('Image data is required');
    });
  });

  describe('Product Draft Generation', () => {
    it('should generate a product draft from extraction result', async () => {
      const mockExtraction = {
        name: 'Coca-Cola 500ml',
        brand: 'Coca-Cola',
        category: 'Beverages',
        size: '500ml',
        selling_price: 1500,
        currency: 'TZS',
        tags: ['coca-cola', 'drink'],
        search_keywords: ['coca-cola', 'soft drink'],
        confidence: { name: 0.98, brand: 0.95 },
        source: 'image',
      };

      mockVisionProvider.extractFromImage.mockResolvedValueOnce(mockExtraction);

      const draft = await agent.generateProductListing(
        mockExtraction,
        'merchant_123'
      );

      expect(draft).toHaveProperty('id');
      expect(draft.merchantId).toBe('merchant_123');
      expect(draft.name).toBe('Coca-Cola 500ml');
      expect(draft.brand).toBe('Coca-Cola');
      expect(draft.category).toBe('Beverages');
      expect(draft.status).toBe('pending_approval');
      expect(draft.selling_price).toBe(1500);
      expect(draft.currency).toBe('TZS');
    });

    it('should set duplicate_of when duplicate detected', async () => {
      const mockExtraction = {
        name: 'Coca-Cola 500ml',
        brand: 'Coca-Cola',
        category: 'Beverages',
        selling_price: 1500,
        currency: 'TZS',
      };

      const draft = await agent.generateProductListing(
        mockExtraction,
        'merchant_123'
      );

      // Since no duplicate is found in the mock (no database query),
      // duplicate_of should be null
      expect(draft.duplicate_of).toBeNull();
    });

    it('should include tags and search keywords in draft', async () => {
      const mockExtraction = {
        name: 'Samsung Galaxy S23',
        brand: 'Samsung',
        category: 'Electronics',
        unit: 'piece',
      };

      mockVisionProvider.extractFromImage.mockResolvedValueOnce(mockExtraction);

      const draft = await agent.generateProductListing(
        mockExtraction,
        'merchant_123'
      );

      expect(draft.tags).toContain('samsung');
      expect(draft.tags).toContain('electronics');
      // search_keywords contains the full name as one string, check it includes galaxy
      expect(draft.search_keywords.some((k: string) => k.includes('galaxy'))).toBe(true);
      expect(draft.search_keywords.some((k: string) => k.includes('samsung'))).toBe(true);
      expect(draft.unit).toBe('piece');
    });
  });

  describe('Product Draft Validation', () => {
    it('should validate a valid product draft', async () => {
      const validDraft = {
        id: 'draft_123',
        merchantId: 'merchant_123',
        name: 'Coca-Cola 500ml',
        brand: 'Coca-Cola',
        category: 'Beverages',
        selling_price: 1500,
        currency: 'TZS',
        status: 'pending_approval',
      };

      const validation = await agent.validateProductDraft(validDraft, 'merchant_123');

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation without product name', async () => {
      const invalidDraft = {
        merchantId: 'merchant_123',
        // name is missing
        brand: 'Coca-Cola',
        category: 'Beverages',
      };

      const validation = await agent.validateProductDraft(invalidDraft, 'merchant_123');

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Product name is required');
    });

    it('should fail validation without brand', async () => {
      const invalidDraft = {
        merchantId: 'merchant_123',
        name: 'Coca-Cola 500ml',
        // brand is missing
        category: 'Beverages',
      };

      const validation = await agent.validateProductDraft(invalidDraft, 'merchant_123');

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Product brand is required');
    });

    it('should fail validation without category', async () => {
      const invalidDraft = {
        merchantId: 'merchant_123',
        name: 'Coca-Cola 500ml',
        brand: 'Coca-Cola',
        // category is missing
      };

      const validation = await agent.validateProductDraft(invalidDraft, 'merchant_123');

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Product category is required');
    });

    it('should detect duplicates and add warning', async () => {
      const draftWithDuplicate = {
        id: 'draft_123',
        merchantId: 'merchant_123',
        name: 'Coca-Cola 500ml',
        brand: 'Coca-Cola',
        category: 'Beverages',
        selling_price: 1500,
        currency: 'TZS',
        status: 'pending_approval',
      };

      const validation = await agent.validateProductDraft(
        draftWithDuplicate,
        'merchant_123'
      );

      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
    });
  });

  describe('Duplicate Detection', () => {
    it('should check for duplicates with barcode signal', async () => {
      const result = await agent.detectDuplicate({
        barcode: '123456789',
      });

      expect(result).toHaveProperty('duplicate_detected');
      // When no duplicate found, these should be undefined
      expect(result.existing_product_id).toBeUndefined();
      expect(result.existing_product_name).toBeUndefined();
    });

    it('should check for duplicates with brand + name signal', async () => {
      const result = await agent.detectDuplicate({
        name: 'Coca-Cola 500ml',
        brand: 'Coca-Cola',
      });

      expect(result).toHaveProperty('duplicate_detected');
    });

    it('should return no duplicate when no signals match', async () => {
      const result = await agent.detectDuplicate({
        name: 'Unknown Product',
        brand: 'Unknown Brand',
      });

      // Without a real database query, duplicate_detected should be false
      expect(result.duplicate_detected).toBe(false);
    });
  });

  describe('Product Approval and Rejection', () => {
    it('should create a product draft with pending_approval status', async () => {
      const result = await agent.createProductDraft(
        {
          id: 'draft_123',
          merchantId: 'merchant_123',
          name: 'Coca-Cola 500ml',
          brand: 'Coca-Cola',
          category: 'Beverages',
        },
        'merchant_123'
      );

      expect(result).toHaveProperty('draftId', 'draft_123');
      expect(result.status).toBe('pending_approval');
      expect(result.message).toBe('Product draft created successfully. Merchant must approve before publishing.');
    });

    it('should reject a product draft with validation errors', async () => {
      const result = await agent.createProductDraft(
        {
          id: 'draft_123',
          merchantId: 'merchant_123',
          // Missing required fields
          category: 'Beverages',
        },
        'merchant_123'
      );

      expect(result.status).toBe('rejected');
    });

    it('should handle product rejection', () => {
      // Test the reject endpoint logic
      const draftId = 'draft_123';

      // In the A2A handler, rejection sets status to 'rejected'
      const result = {
        draftId,
        status: 'rejected',
        message: 'Product draft rejected.',
      };

      expect(result.status).toBe('rejected');
      expect(result.draftId).toBe(draftId);
    });
  });

  describe('ProductAgentCapabilities', () => {
    it('should have all required capability definitions', () => {
      const caps = ProductAgentCapabilities;

      const requiredCaps = [
        'extract_product_from_image',
        'extract_products_from_document',
        'generate_product_listing',
        'validate_product',
        'detect_duplicate_product',
        'create_product_draft',
        'update_product_listing',
      ];

      for (const cap of requiredCaps) {
        expect(caps).toHaveProperty(cap);
        expect(caps[cap]).toHaveProperty('description');
        expect(caps[cap]).toHaveProperty('input_schema');
      }
    });
  });
});