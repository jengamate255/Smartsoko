/**
 * Gemini Vision Provider Implementation
 *
 * Implements the VisionProvider interface using Google Gemini's vision capabilities.
 * Uses the @google/generative-ai SDK for API communication.
 *
 * Configuration via environment variables:
 *   - GEMINI_API_KEY: Google Gemini API key
 *   - GEMINI_MODEL: Gemini model name (default: "gemini-1.5-flash")
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { randomUUID: uuidv4 } = require('crypto');

/**
 * Default Gemini model if not configured
 */
const DEFAULT_MODEL = 'gemini-flash-latest';

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 40000;

/**
 * Extract a retry delay from Google API error details (RetryInfo),
 * falling back to exponential backoff.
 * @param {Error} error - The API error
 * @param {number} attempt - Current attempt index
 * @returns {number} Delay in milliseconds
 */
function getRetryDelay(error, attempt) {
  try {
    const details = error && error.errorDetails;
    if (Array.isArray(details)) {
      for (const d of details) {
        if (d['@type'] && d['@type'].includes('RetryInfo') && d.retryDelay) {
          const seconds = parseFloat(d.retryDelay.replace('s', ''));
          if (!isNaN(seconds)) return Math.min(seconds * 1000, RETRY_MAX_DELAY_MS);
        }
      }
    }
  } catch (e) { /* ignore */ }
  return Math.min(RETRY_BASE_DELAY_MS * Math.pow(2, attempt), RETRY_MAX_DELAY_MS);
}

/**
 * Call model.generateContent with automatic retry on transient
 * failures (503 high-demand, 429 rate limit, 500, network errors).
 * Uses exponential backoff, respecting the API's RetryInfo delay.
 * @param {Object} model - Gemini generative model
 * @param {Array} requestParts - Content parts for generateContent
 * @returns {Promise<Object>} Generation response
 */
async function generateContentWithRetry(model, requestParts) {
  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await model.generateContent(requestParts);
    } catch (error) {
      lastError = error;
      const status = error && (error.status || error.response && error.response.status);
      const retriable = !status || status === 429 || status === 500 || status === 503;
      if (!retriable || attempt === MAX_RETRIES) break;
      const delay = getRetryDelay(error, attempt);
      console.warn(`Gemini request failed (attempt ${attempt + 1}/${MAX_RETRIES}, status ${status || 'unknown'}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Robustly parse JSON from a model response that may include
 * markdown code fences, prose, trailing content, or truncation.
 * @param {string} text - Raw response text
 * @returns {Object} Parsed JSON object
 */
function parseModelJSON(text) {
  if (!text || typeof text !== 'string') throw new Error('Empty response from model');
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch (e) { /* fall through */ }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch (e) { /* fall through */ }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(trimmed.substring(start, end + 1)); } catch (e) { /* fall through */ }
  }

  // Repair truncated JSON: track bracket depth with a stack, strip
  // trailing commas, append missing closers, then retry parsing.
  if (start !== -1) {
    const candidate = repairTruncatedJSON(trimmed.substring(start));
    try { return JSON.parse(candidate); } catch (e) { /* fall through */ }
  }

  throw new Error('Invalid JSON response from Gemini');
}

/**
 * Repair truncated JSON text by tracking open/close brackets and
 * appending missing closing brackets.
 * @param {string} text - Possibly truncated JSON
 * @returns {string} Repaired JSON
 */
function repairTruncatedJSON(text) {
  const stack = [];
  let inString = false;
  let escaped = false;

  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') {
      if (stack[stack.length - 1] === ch) {
        stack.pop();
      } else {
        const idx = stack.lastIndexOf(ch);
        if (idx !== -1) {
          stack.length = idx;
        }
      }
    }
  }

  // Strip trailing commas/whitespace before appending closers
  let cleaned = text.replace(/[\s,]+$/g, '');
  return cleaned + stack.reverse().join('');
}

/**
 * Extract model name from config
 */
function getModelName(config) {
  return config.model || DEFAULT_MODEL;
}

/**
 * Creates the Gemini model instance with proper configuration for product extraction.
 */
function createModel(apiKey, modelName) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.0,
      topP: 1,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          brand: { type: 'string' },
          model: { type: 'string' },
          category: { type: 'string' },
          subcategory: { type: 'string' },
          description: { type: 'string' },
          sku: { type: 'string' },
          barcode: { type: 'string' },
          size: { type: 'string' },
          weight: { type: 'string' },
          volume: { type: 'string' },
          unit: { type: 'string' },
          color: { type: 'string' },
          attributes: { type: 'object' },
          selling_price: { type: 'number' },
          purchase_price: { type: 'number' },
          currency: { type: 'string' },
          stock_quantity: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
          search_keywords: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'name', 'brand', 'model', 'category', 'subcategory', 'description',
          'sku', 'barcode', 'size', 'weight', 'volume', 'unit', 'color',
          'attributes', 'selling_price', 'purchase_price', 'currency',
          'stock_quantity', 'tags', 'search_keywords'
        ],
      },
    },
    systemInstruction: {
      parts: [
        {
          text: `
You are a product extraction assistant for SmartSoko, a Tanzanian marketplace platform.
Your task is to extract product information from images and documents accurately.

When extracting product information:
1. Be precise and only extract information that is clearly visible
2. If information is not visible, return null - DO NOT hallucinate
3. Provide confidence scores for extracted values
4. Support common e-commerce product fields: name, brand, category, size, color, SKU, barcode, etc.
5. Use the Tanzanian market context where applicable (prices in TSh, common categories)

Product fields to extract (return null if not visible):
- name: Product name
- brand: Product brand
- model: Product model/variant
- category: Product category
- subcategory: Product subcategory
- description: Product description
- sku: SKU code
- barcode: Barcode number
- size: Size (e.g., "500ml", "1kg")
- weight: Weight
- volume: Volume
- unit: Unit of measurement (piece, kg, litre, packet)
- color: Color
- attributes: Additional attributes as key-value pairs
- selling_price: Selling price (number)
- purchase_price: Purchase price (number)
- currency: Currency code (e.g., "TSH", "TSh")
- tags: Tags for search
- search_keywords: Keywords for search

For confidence:
- High confidence (0.8-1.0): Information clearly visible
- Medium confidence (0.5-0.8): Information partially visible
- Low confidence (0.0-0.5): Information uncertain or ambiguous

Return ALL fields even if null. Do not omit fields.
`,
        },
      ],
    },
  });
}

/**
 * GeminiVisionProvider - Implements VisionProvider using Google Gemini.
 *
 * Important: This provider uses a HOSTED LLM API (Google Gemini).
 * Do NOT use local LLMs like Ollama, LM Studio, llama.cpp, etc.
 */
class GeminiVisionProvider {
  constructor(config) {
    this.apiKey = config.apiKey;
    const modelName = getModelName(config);
    this.model = createModel(this.apiKey, modelName);
  }

  /**
   * Set the Firestore database instance for duplicate detection.
   * @param {Object} dbInstance - Firestore database instance
   */
  static setDb(dbInstance) {
    GeminiVisionProvider.dbInstance = dbInstance;
  }

  /**
   * Get the Firestore database instance.
   */
  static getDb() {
    return GeminiVisionProvider.dbInstance;
  }

  /**
   * Convert a model-provided value into a clean value, mapping the
   * literal strings the model emits for missing fields ("null",
   * "undefined", "n/a", "none", empty strings) back to real null.
   */
  static normalizeField(value) {
    if (value == null) return null;
    if (typeof value === 'string') {
      const t = value.trim().toLowerCase();
      if (t === '' || t === 'null' || t === 'undefined' || t === 'n/a' || t === 'na' || t === 'none' || t === '-') {
        return null;
      }
      return value.trim();
    }
    return value;
  }

  /**
   * Extract product information from a single image using Gemini Vision.
   * @param {string} imageBase64 - Base64-encoded image data
   * @param {string} mimeType - MIME type of the image
   * @returns {Promise<Object>} ProductExtractionResult
   */
  async extractProductFromImage(imageBase64, mimeType) {
    try {
      const prompt = `
Extract the product information from this image. Return ALL fields in JSON format, including null for any field not clearly visible. 
Be very precise - only extract what is clearly visible. Do not hallucinate or invent values.

JSON format - return all fields:
{
  "name": "value or null",
  "brand": "value or null",
  "model": "value or null",
  "category": "value or null",
  "subcategory": "value or null",
  "description": "value or null",
  "sku": "value or null",
  "barcode": "value or null",
  "size": "value or null",
  "weight": "value or null",
  "volume": "value or null",
  "unit": "value or null",
  "color": "value or null",
  "attributes": {"key": "value or null"} or null,
  "selling_price": number or null,
  "purchase_price": number or null,
  "currency": "value or null",
  "stock_quantity": number or null,
  "tags": ["tag1", "tag2"] or null,
  "search_keywords": ["keyword1", "keyword2"] or null
}
      `;

      const result = await generateContentWithRetry(this.model, [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
        {
          text: prompt,
        },
      ]);

      const responseText = result.response.text();

      let extractionData;
      try {
        extractionData = parseModelJSON(responseText);
      } catch (e) {
        console.error('Failed to parse Gemini response as JSON:', responseText);
        throw e;
      }

      const confidenceData = {};

      const fields = [
        'name', 'brand', 'model', 'category', 'subcategory', 'description',
        'sku', 'barcode', 'size', 'weight', 'volume', 'unit', 'color',
        'selling_price', 'purchase_price', 'currency', 'stock_quantity'
      ];

      for (const field of fields) {
        const value = extractionData[field];
        const confidenceValue = value != null ? 0.9 : 0.3;
        confidenceData[field] = {
          value,
          confidence: confidenceValue,
          source: 'image',
        };
      }

      const tags = Array.isArray(extractionData.tags) ? extractionData.tags : [];
      const searchKeywords = Array.isArray(extractionData.search_keywords)
        ? extractionData.search_keywords
        : [];

      const extractedProduct = {
        name: GeminiVisionProvider.normalizeField(extractionData.name),
        brand: GeminiVisionProvider.normalizeField(extractionData.brand),
        model: GeminiVisionProvider.normalizeField(extractionData.model),
        category: GeminiVisionProvider.normalizeField(extractionData.category),
        subcategory: GeminiVisionProvider.normalizeField(extractionData.subcategory),
        description: GeminiVisionProvider.normalizeField(extractionData.description),
        sku: GeminiVisionProvider.normalizeField(extractionData.sku),
        barcode: GeminiVisionProvider.normalizeField(extractionData.barcode),
        size: GeminiVisionProvider.normalizeField(extractionData.size),
        weight: GeminiVisionProvider.normalizeField(extractionData.weight),
        volume: GeminiVisionProvider.normalizeField(extractionData.volume),
        unit: GeminiVisionProvider.normalizeField(extractionData.unit),
        color: GeminiVisionProvider.normalizeField(extractionData.color),
        attributes: extractionData.attributes != null && typeof extractionData.attributes === 'object'
          ? Object.fromEntries(
              Object.entries(extractionData.attributes).map(([k, v]) => [k, GeminiVisionProvider.normalizeField(v)])
            )
          : null,
        images: [],
        tags: tags.length > 0 ? tags : [],
        search_keywords: searchKeywords.length > 0 ? searchKeywords : [],
        selling_price: GeminiVisionProvider.normalizeField(extractionData.selling_price),
        purchase_price: GeminiVisionProvider.normalizeField(extractionData.purchase_price),
        currency: GeminiVisionProvider.normalizeField(extractionData.currency),
        stock_quantity: GeminiVisionProvider.normalizeField(extractionData.stock_quantity),
        confidence: confidenceData,
      };

      return extractedProduct;
    } catch (error) {
      console.error('Gemini Vision extraction error:', error);
      throw error;
    }
  }

  /**
   * Extract product information from a document (PDF, CSV, invoice, etc.).
   * @param {string} documentBase64 - Base64-encoded document data
   * @param {string} mimeType - MIME type of the document
   * @returns {Promise<Array>} Array of ProductExtractionResult
   */
  async extractProductsFromDocument(documentBase64, mimeType) {
    try {
      const prompt = `
Extract product information from this document. This could be an invoice, catalogue, or PDF with multiple products.
Return ALL products found in JSON array format. For each product, include ALL fields.
If a field is not visible for a particular product, use null.

JSON format - return array of products:
[
  {
    "name": "value or null",
    "brand": "value or null",
    "model": "value or null",
    "category": "value or null",
    "subcategory": "value or null",
    "description": "value or null",
    "sku": "value or null",
    "barcode": "value or null",
    "size": "value or null",
    "weight": "value or null",
    "volume": "value or null",
    "unit": "value or null",
    "color": "value or null",
    "attributes": {"key": "value or null"} or null,
    "selling_price": number or null,
    "purchase_price": number or null,
    "currency": "value or null",
    "tags": ["tag1", "tag2"] or null,
    "search_keywords": ["keyword1", "keyword2"] or null
  }
]
      `;

      const result = await generateContentWithRetry(this.model, [
        {
          inlineData: {
            mimeType: mimeType,
            data: documentBase64,
          },
        },
        {
          text: prompt,
        },
      ]);

      const responseText = result.response.text();
      let productsData;

      try {
        productsData = parseModelJSON(responseText);
      } catch (e) {
        console.error('Failed to parse Gemini document response as JSON:', responseText);
        throw e;
      }

      if (!Array.isArray(productsData)) {
        productsData = [productsData];
      }

      const fields = [
        'name', 'brand', 'model', 'category', 'subcategory', 'description',
        'sku', 'barcode', 'size', 'weight', 'volume', 'unit', 'color',
        'selling_price', 'purchase_price', 'currency', 'stock_quantity'
      ];

      return productsData.map((productData) => {
        const confidenceData = {};

        for (const field of fields) {
          const value = productData[field];
          const confidenceValue = value != null ? 0.9 : 0.3;
          confidenceData[field] = {
            value,
            confidence: confidenceValue,
            source: 'document',
          };
        }

        const tags = Array.isArray(productData.tags) ? productData.tags : [];
        const searchKeywords = Array.isArray(productData.search_keywords)
          ? productData.search_keywords
          : [];

        return {
          name: GeminiVisionProvider.normalizeField(productData.name),
          brand: GeminiVisionProvider.normalizeField(productData.brand),
          model: GeminiVisionProvider.normalizeField(productData.model),
          category: GeminiVisionProvider.normalizeField(productData.category),
          subcategory: GeminiVisionProvider.normalizeField(productData.subcategory),
          description: GeminiVisionProvider.normalizeField(productData.description),
          sku: GeminiVisionProvider.normalizeField(productData.sku),
          barcode: GeminiVisionProvider.normalizeField(productData.barcode),
          size: GeminiVisionProvider.normalizeField(productData.size),
          weight: GeminiVisionProvider.normalizeField(productData.weight),
          volume: GeminiVisionProvider.normalizeField(productData.volume),
          unit: GeminiVisionProvider.normalizeField(productData.unit),
          color: GeminiVisionProvider.normalizeField(productData.color),
          attributes: productData.attributes != null && typeof productData.attributes === 'object'
            ? Object.fromEntries(
                Object.entries(productData.attributes).map(([k, v]) => [k, GeminiVisionProvider.normalizeField(v)])
              )
            : null,
          images: [],
          tags: tags.length > 0 ? tags : [],
          search_keywords: searchKeywords.length > 0 ? searchKeywords : [],
          selling_price: GeminiVisionProvider.normalizeField(productData.selling_price),
          purchase_price: GeminiVisionProvider.normalizeField(productData.purchase_price),
          currency: GeminiVisionProvider.normalizeField(productData.currency),
          stock_quantity: GeminiVisionProvider.normalizeField(productData.stock_quantity),
          confidence: confidenceData,
        };
      });
    } catch (error) {
      console.error('Gemini Document extraction error:', error);
      throw error;
    }
  }

  /**
   * Generate a complete product listing from extracted data.
   * @param {Object} extractedData - Partial product data from extraction
   * @param {string} merchantId - Merchant's ID
   * @returns {Promise<Object>} ProductDraft
   */
  async generateProductListing(extractedData, merchantId) {
    const draftId = uuidv4();
    const now = new Date().toISOString();

    return {
      id: draftId,
      merchantId,
      name: extractedData.name ?? null,
      brand: extractedData.brand ?? null,
      model: extractedData.model ?? null,
      category: extractedData.category ?? null,
      subcategory: extractedData.subcategory ?? null,
      description: extractedData.description ?? null,
      sku: extractedData.sku ?? null,
      barcode: extractedData.barcode ?? null,
      size: extractedData.size ?? null,
      weight: extractedData.weight ?? null,
      volume: extractedData.volume ?? null,
      unit: extractedData.unit ?? null,
      color: extractedData.color ?? null,
      attributes: extractedData.attributes ?? new Map(),
      selling_price: extractedData.selling_price ?? null,
      purchase_price: extractedData.purchase_price ?? null,
      currency: extractedData.currency ?? null,
      images: extractedData.images ?? [],
      tags: extractedData.tags ?? [],
      search_keywords: extractedData.search_keywords ?? [],
      status: 'pending_approval',
      confidence: extractedData.confidence ?? {},
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Validate a product draft against business rules.
   * @param {Object} draft - Product draft to validate
   * @param {string} merchantId - Merchant's ID
   * @returns {Promise<Object>} ValidationResult
   */
  async validateProduct(draft, merchantId) {
    const errors = [];
    const warnings = [];

    if (!draft.name) {
      errors.push({
        field: 'name',
        message: 'Product name is required',
        value: draft.name,
      });
    }

    if (!draft.brand) {
      errors.push({
        field: 'brand',
        message: 'Product brand is required',
        value: draft.brand,
      });
    }

    if (!draft.category) {
      errors.push({
        field: 'category',
        message: 'Product category is required',
        value: draft.category,
      });
    }

    if (draft.selling_price === null || draft.selling_price <= 0) {
      errors.push({
        field: 'selling_price',
        message: 'Selling price must be a positive number',
        value: draft.selling_price,
      });
    }

    if (!draft.images || draft.images.length === 0) {
      warnings.push({
        field: 'images',
        message: 'Product should have at least one image',
        value: draft.images,
      });
    }

    if (draft.category) {
      warnings.push({
        field: 'category',
        message: 'Category will be validated against SmartSoko catalogue',
        value: draft.category,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect if a product already exists in the SmartSoko catalogue.
   * @param {Object} draft - Product draft to check
   * @param {string} merchantId - Merchant's ID
   * @returns {Promise<Object>} DuplicateDetectionResult
   */
  async detectDuplicateProduct(draft, merchantId) {
    try {
      const db = GeminiVisionProvider.getDb();

      if (!db) {
        console.warn('No Firestore database available for duplicate detection');
        return {
          duplicate_detected: false,
          existing_product_id: null,
          existing_product_name: null,
          confidence: 0,
        };
      }

      let duplicateDetected = false;
      let existingProductId = null;
      let existingProductName = null;

      const productsRef = db.collection('products');

      // Merchant products are written with `sellerId` (merchant.html); some
      // legacy documents use `shopId`. Query both and merge results.
      const [sellerSnap, shopSnap] = await Promise.all([
        productsRef.where('sellerId', '==', merchantId).get(),
        productsRef.where('shopId', '==', merchantId).get(),
      ]);

      const existingProducts = [
        ...sellerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...shopSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ];

      for (const existingProduct of existingProducts) {
        if (draft.barcode && existingProduct.barcode === draft.barcode) {
          duplicateDetected = true;
          existingProductId = existingProduct.id;
          existingProductName = existingProduct.name;
          break;
        }

        if (draft.sku && existingProduct.sku === draft.sku) {
          duplicateDetected = true;
          existingProductId = existingProduct.id;
          existingProductName = existingProduct.name;
          break;
        }

        if (draft.brand && draft.model &&
            existingProduct.brand === draft.brand &&
            existingProduct.model === draft.model) {
          duplicateDetected = true;
          existingProductId = existingProduct.id;
          existingProductName = existingProduct.name;
          break;
        }

        const normalizedNewName = draft.name?.toLowerCase().trim();
        const normalizedExistingName = (existingProduct.name || '').toLowerCase().trim();
        const normalizedNewSize = draft.size?.toLowerCase().trim();
        const normalizedExistingSize = (existingProduct.size || '').toLowerCase().trim();

        if (normalizedNewName && normalizedExistingName) {
          const nameMatch = normalizedNewName === normalizedExistingName;
          const sizeMatch = normalizedNewSize && normalizedExistingSize
            && normalizedNewSize === normalizedExistingSize;

          if (nameMatch && sizeMatch) {
            duplicateDetected = true;
            existingProductId = existingProduct.id;
            existingProductName = existingProduct.name;
            break;
          }
        }
      }

      return {
        duplicate_detected: duplicateDetected,
        existing_product_id: existingProductId,
        existing_product_name: existingProductName,
        confidence: duplicateDetected ? 0.95 : 0,
      };
    } catch (error) {
      console.error('Duplicate detection error:', error);
      return {
        duplicate_detected: false,
        existing_product_id: null,
        existing_product_name: null,
        confidence: 0,
      };
    }
  }
}

module.exports = { GeminiVisionProvider };