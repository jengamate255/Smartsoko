/**
 * SmartSoko Product Agent
 *
 * The first AI employee in the SmartSoko ecosystem.
 * Reduces manual work for merchants when creating and maintaining product listings.
 *
 * Architecture:
 * - Depends on VisionProvider abstraction, not directly on Gemini
 * - Produces ProductDraft structures, not direct database mutations
 * - Requires merchant approval before publishing to SmartSoko
 * - Integrates with existing SmartSoko product APIs
 */

import { VisionProvider, ProductExtractionResult, ProductDraft } from './vision-provider';
import { verifyToken, requireMerchant } from '../middleware/auth';
import { validate, z } from '../middleware/validate';
import { schemas } from '../middleware/validate';

// Import Supabase client for database queries
import { supabase } from '../../../Smartsoko/services/supabase';

// Import the Supabase/SmartSoko product service
// This will be integrated via the existing backend API

// ============================================================
// A2A Agent Card
// ============================================================

/**
 * Product Agent Capabilities
 *
 * These are the skills the Product Agent advertises in its Agent Card.
 * Future agents (Inventory Agent, Pricing Agent, etc.) can discover
 * and communicate with the Product Agent via A2A protocol.
 */
export const ProductAgentCapabilities = {
  extract_product_from_image: {
    description:
      'Extract product information from a product image using vision AI.',
    input_schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
        mimeType: {
          type: 'string',
          enum: ['image/jpeg', 'image/png', 'image/webp'],
          default: 'image/jpeg',
        },
      },
      required: ['image'],
    },
  },
  extract_products_from_document: {
    description:
      'Extract product information from documents (invoices, catalogues, PDFs).',
    input_schema: {
      type: 'object',
      properties: {
        document: {
          type: 'string',
          format: 'binary',
        },
        mimeType: {
          type: 'string',
          enum: ['application/pdf', 'text/csv', 'application/vnd.ms-excel'],
        },
      },
      required: ['document'],
    },
  },
  generate_product_listing: {
    description:
      'Generate a complete product listing from extracted data with validation.',
    input_schema: {
      type: 'object',
      properties: {
        extraction_result: {
          type: 'object',
        },
        merchant_id: {
          type: 'string',
        },
      },
      required: ['extraction_result', 'merchant_id'],
    },
  },
  validate_product: {
    description:
      'Validate a product draft against SmartSoko business rules.',
    input_schema: {
      type: 'object',
      properties: {
        draft: {
          type: 'object',
        },
        merchant_id: {
          type: 'string',
        },
      },
      required: ['draft', 'merchant_id'],
    },
  },
  detect_duplicate_product: {
    description:
      'Check if a product already exists in the SmartSoko catalogue.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        barcode: {
          type: 'string',
        },
        sku: {
          type: 'string',
        },
        brand: {
          type: 'string',
        },
        size: {
          type: 'string',
        },
      },
      required: [], // None are strictly required, but at least one should be provided
    },
  },
  create_product_draft: {
    description:
      'Create a pending product draft that requires merchant approval.',
    input_schema: {
      type: 'object',
      properties: {
        draft: {
          type: 'object',
        },
        merchant_id: {
          type: 'string',
        },
      },
      required: ['draft', 'merchant_id'],
    },
  },
  update_product_listing: {
    description:
      'Update an existing product listing in the SmartSoko catalogue.',
    input_schema: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
        },
        updates: {
          type: 'object',
        },
        merchant_id: {
          type: 'string',
        },
      },
      required: ['product_id', 'updates', 'merchant_id'],
    },
  },
};

// ============================================================
// Product Agent Class
// ============================================================

export class ProductAgent {
  private visionProvider: VisionProvider;
  private agentName: string = 'product-agent';

  constructor(visionProvider: VisionProvider) {
    this.visionProvider = visionProvider;
  }

  /**
   * Get the A2A Agent Card for this agent.
   * Used by future agents to discover and communicate with this agent.
   */
  getAgentCard() {
    return {
      name: 'SmartSoko Product Agent',
      description:
        'AI agent for product extraction, draft creation, and catalogue maintenance',
      url: '/.well-known/agent-card.json',
      version: '1.0.0',
      capabilities: ProductAgentCapabilities,
      status: 'active',
    };
  }

  /**
   * Handle A2A requests sent to this agent.
   * Future agents will send A2A messages to this endpoint.
   */
  async handleA2ARequest(
    method: string,
    params: any,
    merchantId?: string
  ): Promise<any> {
    switch (method) {
      case 'extract_product_from_image': {
        const { image, mimeType } = params;
        if (!image) {
          throw new Error('Image data is required');
        }
        const imageBuffer = Buffer.from(image, 'base64');
        return this.visionProvider.extractFromImage(imageBuffer, mimeType || 'image/jpeg');
      }

      case 'extract_products_from_document': {
        const { document, mimeType } = params;
        if (!document) {
          throw new Error('Document data is required');
        }
        const docBuffer = Buffer.from(document, 'base64');
        return this.visionProvider.extractFromDocument(docBuffer, mimeType || 'application/pdf');
      }

      case 'generate_product_listing': {
        const { extraction_result, merchant_id } = params;
        if (!merchant_id) {
          throw new Error('Merchant ID is required');
        }
        return this.generateProductListing(extraction_result, merchant_id);
      }

      case 'validate_product': {
        const { draft, merchant_id } = params;
        if (!merchant_id) {
          throw new Error('Merchant ID is required');
        }
        return this.validateProductDraft(draft, merchant_id);
      }

      case 'detect_duplicate_product': {
        const { name, barcode, sku, brand, size } = params;
        return this.detectDuplicate({ name, barcode, sku, brand, size });
      }

      case 'create_product_draft': {
        const { draft, merchant_id } = params;
        if (!merchant_id) {
          throw new Error('Merchant ID is required');
        }
        return this.createProductDraft(draft, merchant_id);
      }

      case 'update_product_listing': {
        const { product_id, updates, merchant_id } = params;
        if (!merchant_id) {
          throw new Error('Merchant ID is required');
        }
        return this.updateProductListing(product_id, updates, merchant_id);
      }

      default:
        throw new Error(`Unknown A2A method: ${method}`);
    }
  }

  /**
   * Extract product information from an image.
   * The AI extracts fields and returns null for anything not visible.
   */
  async extractFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    merchantId: string
  ): Promise<ProductExtractionResult> {
    // Validate merchant authorization
    // In a full implementation, this would verify the merchant is authenticated
    const result = await this.visionProvider.extractFromImage(imageBuffer, mimeType);

    // Ensure we have a valid result structure
    return {
      name: result.name ?? null,
      brand: result.brand ?? null,
      model: result.model ?? null,
      category: result.category ?? null,
      subcategory: result.subcategory ?? null,
      description: result.description ?? null,
      sku: result.sku ?? null,
      barcode: result.barcode ?? null,
      size: result.size ?? null,
      weight: result.weight ?? null,
      volume: result.volume ?? null,
      unit: result.unit ?? null,
      color: result.color ?? null,
      attributes: result.attributes ?? null,
      tags: result.tags ?? [],
      search_keywords: result.search_keywords ?? [],
      purchase_price: result.purchase_price ?? null,
      selling_price: result.selling_price ?? null,
      currency: result.currency ?? null,
      confidence: result.confidence ?? {},
      source: result.source ?? 'image',
      rawOutput: result.rawOutput ?? null,
    };
  }

  /**
   * Generate a product listing from extracted data.
   * The result is a pending draft that requires merchant approval.
   */
  async generateProductListing(
    extractionResult: ProductExtractionResult,
    merchantId: string
  ): Promise<ProductDraft> {
    // Build the product draft from extraction results
    const now = new Date().toISOString();

    // Determine category - use extracted or fall back to generic
    const category = extractionResult.category ?? 'other';

    // Build tags from available information
    const tags: string[] = [];
    if (extractionResult.brand) tags.push(extractionResult.brand.toLowerCase());
    if (extractionResult.category) tags.push(extractionResult.category.toLowerCase());
    if (extractionResult.unit) tags.push(extractionResult.unit.toLowerCase());

    // Build search keywords
    const searchKeywords: string[] = [];
    if (extractionResult.name) {
      searchKeywords.push(extractionResult.name.toLowerCase());
    }
    if (extractionResult.brand) {
      searchKeywords.push(extractionResult.brand.toLowerCase());
    }
    if (extractionResult.size) {
      searchKeywords.push(extractionResult.size.toLowerCase());
    }
    if (extractionResult.category) {
      searchKeywords.push(extractionResult.category.toLowerCase());
    }

    // Detect duplicates before creating draft
    const duplicateCheck = await this.detectDuplicate({
      name: extractionResult.name,
      barcode: extractionResult.barcode,
      sku: extractionResult.sku,
      brand: extractionResult.brand,
      size: extractionResult.size,
    });

    const draft: ProductDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      merchantId,
      name: extractionResult.name ?? null,
      brand: extractionResult.brand ?? null,
      model: extractionResult.model ?? null,
      category: category,
      subcategory: extractionResult.subcategory ?? null,
      description: extractionResult.description ?? null,
      sku: extractionResult.sku ?? null,
      barcode: extractionResult.barcode ?? null,
      size: extractionResult.size ?? null,
      weight: extractionResult.weight ?? null,
      volume: extractionResult.volume ?? null,
      unit: extractionResult.unit ?? null,
      color: extractionResult.color ?? null,
      attributes: null, // Will be populated later if needed
      tags: tags,
      search_keywords: searchKeywords,
      selling_price: extractionResult.selling_price ?? null,
      purchase_price: extractionResult.purchase_price ?? null,
      currency: extractionResult.currency ?? null,
      stock_quantity: null, // Not extracted from image; merchant will set
      status: 'pending_approval',
      created_at: now,
      updated_at: now,
      extraction_confidence: extractionResult.confidence ?? {},
      image_urls: [], // Images to be uploaded separately by merchant
      source_filename: '',
      duplicate_of: duplicateCheck.duplicate_detected ? duplicateCheck.existing_product_id : null,
    };

    return draft;
  }

  /**
   * Validate a product draft against SmartSoko business rules.
   * The AI proposes, SmartSoko validates.
   */
  async validateProductDraft(
    draft: ProductDraft,
    merchantId: string
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!draft.name) {
      errors.push('Product name is required');
    }

    if (!draft.brand) {
      errors.push('Product brand is required');
    }

    if (!draft.category) {
      errors.push('Product category is required');
    }

    // Check for duplicate
    const duplicateCheck = await this.detectDuplicate({
      name: draft.name,
      barcode: draft.barcode,
      sku: draft.sku,
      brand: draft.brand,
      size: draft.size,
    });

    if (duplicateCheck.duplicate_detected) {
      warnings.push(
        `Duplicate product detected: ${duplicateCheck.existing_product_name}. ` +
        `Use the existing product ID: ${duplicateCheck.existing_product_id}.`
      );
    }

    // Validate price if provided
    if (draft.selling_price !== null && draft.selling_price <= 0) {
      errors.push('Selling price must be greater than zero');
    }

    // Validate category is non-empty
    if (draft.category && draft.category.trim().length === 0) {
      errors.push('Category must not be empty');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect duplicate products in the SmartSoko catalogue.
   * Uses deterministic signals: barcode, SKU, brand + model, name + size.
   */
  async detectDuplicate(
    signals: {
      name?: string;
      barcode?: string;
      sku?: string;
      brand?: string;
      size?: string;
    }
  ): Promise<{
    duplicate_detected: boolean;
    existing_product_id?: string;
    existing_product_name?: string;
  }> {
    const { name, barcode, sku, brand, size } = signals;

    // Determine likelihood of duplicate based on available signals
    let duplicateDetected = false;
    let existingProductId: string | undefined;
    let existingProductName: string | undefined;

    // Signal 1: Barcode match (most reliable)
    if (barcode && !duplicateDetected) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('barcode', barcode)
        .maybeSingle();

      if (error) {
        console.error('Supabase query error for barcode:', error);
      } else if (data) {
        duplicateDetected = true;
        existingProductId = data.id;
        existingProductName = data.name;
      }
    }

    // Signal 2: SKU match
    if (sku && !duplicateDetected) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('sku', sku)
        .maybeSingle();

      if (error) {
        console.error('Supabase query error for SKU:', error);
      } else if (data) {
        duplicateDetected = true;
        existingProductId = data.id;
        existingProductName = data.name;
      }
    }

    // Signal 3: Brand + name match
    if (brand && name && !duplicateDetected) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('brand', brand)
        .eq('name', name)
        .maybeSingle();

      if (error) {
        console.error('Supabase query error for brand+name:', error);
      } else if (data) {
        duplicateDetected = true;
        existingProductId = data.id;
        existingProductName = data.name;
      }
    }

    // Signal 4: Normalized name match (case-insensitive substring search)
    if (name && !duplicateDetected) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .ilike('name', `%${name}%`)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Supabase query error for name match:', error);
      } else if (data) {
        duplicateDetected = true;
        existingProductId = data.id;
        existingProductName = data.name;
      }
    }

    // Signal 5: Brand + product name + size
    if (brand && name && size && !duplicateDetected) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('brand', brand)
        .eq('name', name)
        .eq('size', size)
        .maybeSingle();

      if (error) {
        console.error('Supabase query error for brand+name+size:', error);
      } else if (data) {
        duplicateDetected = true;
        existingProductId = data.id;
        existingProductName = data.name;
      }
    }

    if (duplicateDetected) {
      return {
        duplicate_detected: true,
        existing_product_id: existingProductId,
        existing_product_name: existingProductName,
      };
    }

    return {
      duplicate_detected: false,
    };
  }

  /**
   * Create a product draft in the SmartSoko system.
   * The draft is pending merchant approval before being published.
   *
   * In Phase 1, this creates a draft record that the merchant can review
   * and either APPROVE (which then calls the existing SmartSoko product API)
   * or REJECT/EDIT.
   */
  async createProductDraft(
    draft: ProductDraft,
    merchantId: string
  ): Promise<{
    draftId: string;
    status: 'pending_approval' | 'rejected';
    message: string;
  }> {
    // Verify merchant authorization
    if (draft.merchantId !== merchantId) {
      throw new Error('Unauthorized: Merchant ID mismatch');
    }

    // Validate the draft first
    const validation = await this.validateProductDraft(draft, merchantId);

    if (!validation.valid) {
      return {
        draftId: draft.id,
        status: 'rejected',
        message: `Draft validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // In Phase 1, we do NOT automatically publish.
    // The draft is created with pending_approval status.
    // The merchant must review and approve via the Merchant App.

    // Persist the draft to Supabase for merchant review
    const { data, error } = await supabase
      .from('product_drafts')
      .insert({
        id: draft.id,
        merchant_id: merchantId,
        name: draft.name,
        brand: draft.brand,
        model: draft.model,
        category: draft.category,
        subcategory: draft.subcategory,
        description: draft.description,
        sku: draft.sku,
        barcode: draft.barcode,
        size: draft.size,
        weight: draft.weight,
        volume: draft.volume,
        unit: draft.unit,
        color: draft.color,
        attributes: draft.attributes,
        search_keywords: draft.search_keywords,
        selling_price: draft.selling_price,
        purchase_price: draft.purchase_price,
        currency: draft.currency,
        stock_quantity: draft.stock_quantity,
        status: 'pending_approval',
        created_at: draft.created_at,
        updated_at: draft.updated_at,
        extraction_confidence: draft.extraction_confidence,
        image_urls: draft.image_urls,
        source_filename: draft.source_filename,
        duplicate_of: draft.duplicate_of,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase error creating product draft:', error ?? 'No data returned');
      return {
        draftId: draft.id,
        status: 'rejected',
        message: `Failed to persist draft: ${error?.message ?? 'No data returned from database'}`,
      };
    }

    return {
      draftId: data.id,
      status: 'pending_approval' as const,
      message: 'Product draft created successfully. Merchant must approve before publishing.',
    };
  }

  /**
   * Update an existing product listing in the SmartSoko catalogue.
   * Uses the existing SmartSoko product API/service.
   */
  async updateProductListing(
    productId: string,
    updates: Record<string, any>,
    merchantId: string
  ): Promise<{
    success: boolean;
    product?: any;
    message: string;
  }> {
    // Verify merchant authorization - check that product belongs to this merchant
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*, sellers(owner_id)')
      .eq('id', productId)
      .single();

    if (productError) {
      console.error('Supabase error fetching product:', productError);
      return {
        success: false,
        message: 'Product not found',
      };
    }

    // Check that the merchant owns the seller who owns this product
    const seller = product.sellers;
    if (!seller || seller.owner_id !== merchantId) {
      return {
        success: false,
        message: 'Unauthorized: You do not own this product',
      };
    }

    // In a full implementation, this would call the existing SmartSoko
    // product update API (e.g., PATCH /api/products/:id)
    // For Phase 1, we persist the updates to Supabase

    const validUpdates: Record<string, any> = {};

    // Whitelist of updatable fields
    const allowedUpdates = [
      'name',
      'description',
      'price',
      'category',
      'stockQuantity',
      'isAvailable',
      'unit',
      'attributes',
      'imageUrl',
    ];

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        validUpdates[key] = updates[key];
      }
    }

    // Persist updates to Supabase
    if (Object.keys(validUpdates).length > 0) {
      const { error } = await supabase
        .from('products')
        .update(validUpdates)
        .eq('id', productId);

      if (error) {
        console.error('Supabase error updating product:', error);
        return {
          success: false,
          message: `Failed to update product: ${error.message}`,
        };
      }
    }

    return {
      success: Object.keys(validUpdates).length > 0,
      product: validUpdates,
      message:
        Object.keys(validUpdates).length > 0
          ? 'Product listing updated successfully. Merchant approval may be required for certain fields.'
          : 'No valid updates provided.',
    };
  }
}