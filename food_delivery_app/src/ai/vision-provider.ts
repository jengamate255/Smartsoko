/**
 * Vision Provider Abstraction
 *
 * Defines the interface for vision-capable LLMs to extract product information
 * from images and documents. This allows swapping between providers (Gemini,
 * OpenRouter, etc.) without rewriting the Product Agent.
 */

export interface VisionProvider {
  /**
   * Extract product information from an image buffer.
   * @param imageBuffer - Raw image buffer (JPEG/PNG)
   * @param mimeType - MIME type of the image
   * @returns Extracted product data with confidence scores
   */
  extractFromImage(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<ProductExtractionResult>;

  /**
   * Extract product information from a document (PDF, CSV, etc.).
   * @param fileBuffer - Raw file buffer
   * @param mimeType - MIME type of the file
   * @returns Extracted product data
   */
  extractFromDocument(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<ProductExtractionResult>;

  /**
   * Check if the provider is healthy and responding.
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Product extraction result from vision LLM.
 *
 * All fields are nullable. If the LLM cannot determine a value, it returns null.
 * Confidence scores are provided for important extracted fields.
 */
export interface ProductExtractionResult {
  // Core identity
  name: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;

  // Identification
  sku: string | null;
  barcode: string | null;

  // Physical attributes
  size: string | null;
  weight: string | null;
  volume: string | null;
  unit: string | null; // e.g., "piece", "kg", "litre", "packet"
  color: string | null;

  // Pricing
  purchase_price: number | null;
  selling_price: number | null;
  currency: string | null;

  // Metadata
  tags: string[];
  search_keywords: string[];

  // Confidence information for important fields
  confidence: Record<string, number>; // field -> confidence (0-1)

  // Raw source information
  source: 'image' | 'document' | 'text';
  rawOutput: unknown; // Full LLM response for debugging
}

/**
 * Product draft created by the AI agent.
 *
 * This is a temporary draft that requires merchant approval before being
 * published to the existing SmartSoko product catalogue.
 */
export interface ProductDraft {
  id: string;
  merchantId: string;
  // Extracted from AI (may have null values)
  name: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  size: string | null;
  weight: string | null;
  volume: string | null;
  unit: string | null;
  color: string | null;
  attributes: Record<string, any> | null;
  tags: string[];
  search_keywords: string[];
  // AI-derived values
  selling_price: number | null;
  purchase_price: number | null;
  currency: string | null;
  stock_quantity: number | null;
  // State management
  status: 'pending_approval' | 'approved' | 'rejected';
  // Metadata
  created_at: string;
  updated_at: string;
  extraction_confidence: Record<string, number>;
  // Media
  image_urls: string[];
  source_filename: string;
  duplicate_of: string | null; // Existing product ID if duplicate detected
}

/**
 * Gemini Vision Provider Implementation
 *
 * Uses Google's Gemini model with vision capabilities to extract product
 * information from images. Configurable via environment variables:
 *
 *   GEMINI_API_KEY=your_gemini_api_key
 *   GEMINI_MODEL=gemini-1.5-flash (or gemini-1.0-pro-vision)
 */
export class GeminiVisionProvider implements VisionProvider {
  private apiKey: string;
  private modelName: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    if (!this.apiKey) {
      console.warn(
        'GEMINI_API_KEY not set. GeminiVisionProvider will not function until configured.'
      );
    }
  }

  /**
   * Get the Gemini model name from environment variable.
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Extract product information from an image using Gemini Vision.
   *
   * The prompt instructs the model to extract product fields and return
   * null for any information not visible in the image. Confidence scores
   * are included for important fields.
   */
  async extractFromImage(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<ProductExtractionResult> {
    const { GoogleGenerativeAI } = require('@google/generative-ai');

    if (!this.apiKey) {
      throw new Error(
        'GEMINI_API_KEY not configured. Set GEMINI_API_KEY environment variable.'
      );
    }

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    // Construct the prompt for product extraction
    const prompt = this.buildProductExtractionPrompt();

    const imageBase64 = imageBuffer.toString('base64');

    const response = await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const resultText = response.response.text();

    // Parse the structured output from LLM
    return this.parseExtractionResult(resultText, 'image');
  }

  /**
   * Extract product information from a document (PDF, CSV, etc.).
   */
  async extractFromDocument(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<ProductExtractionResult> {
    // For now, treat document text similarly to image extraction
    // Future: OCR + structured extraction
    throw new Error(
      'Document extraction not yet implemented. Use image extraction or provide text content.'
    );
  }

  /**
   * Check if the provider is healthy.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - just verify the API key is set
      return !!this.apiKey;
    } catch {
      return false;
    }
  }

  /**
   * Build the system prompt for product extraction from images.
   */
  private buildProductExtractionPrompt(): string {
    return `You are a product extraction assistant for SmartSoko, a marketplace platform. 
    
    Extract product information from the provided image. Be precise and only extract 
    information that is clearly visible. If information is not visible, return null for that field.
    
    Return a JSON object with the following structure. Do not include any reasoning, 
    explanations, or text outside the JSON:
    
    {
      "name": "string | null",
      "brand": "string | null",
      "model": "string | null",
      "category": "string | null",
      "subcategory": "string | null",
      "description": "string | null",
      "sku": "string | null",
      "barcode": "string | null",
      "size": "string | null",
      "weight": "string | null",
      "volume": "string | null",
      "unit": "string | null", // e.g., "piece", "kg", "litre", "packet"
      "color": "string | null",
      "purchase_price": number | null,
      "selling_price": number | null,
      "currency": "string | null",
      "tags": ["string"],
      "search_keywords": ["string"],
      "confidence": {
        "name": number,
        "brand": number,
        "barcode": number,
        "price": number
      },
      "source": "image"
    }
    
    Guidelines:
    - Return null for any field you cannot clearly determine from the image
    - Do not hallucinate or invent values
    - Price fields: return null if no price is visible in the image
    - barcode/SKU: return null if not clearly visible
    - category: try to determine the general category (e.g., "Beverages", "Electronics")
    - tags: provide relevant tags based on what you see
    - search_keywords: provide 3-5 keywords for search
    - Keep confidence scores between 0 and 1 representing your certainty
    - temperature: 0.2 for deterministic, precise extraction
    `;
  }

  /**
   * Parse the LLM response into a ProductExtractionResult.
   *
   * The LLM may wrap JSON in markdown code blocks, so we need to extract
   * the JSON portion.
   */
  private parseExtractionResult(
    rawText: string,
    source: string
  ): ProductExtractionResult {
    let text = rawText.trim();

    // Remove markdown code blocks if present
    if (text.startsWith('```')) {
      const lines = text.split('\n');
      // Find the first line that starts with {
      const startIdx = lines.findIndex((l) => l.trim().startsWith('{'));
      const endIdx = lines.lastIndexOf('}');
      if (startIdx >= 0 && endIdx > startIdx) {
        text = lines.slice(startIdx, endIdx + 1).join('\n');
      }
    }

    // Try to parse as JSON
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // If JSON parse fails, return structured null result
      console.error('Failed to parse LLM extraction result:', text);
      return this.getNullResult(source);
    }

    // Ensure required structure exists
    const result: ProductExtractionResult = {
      name: parsed.name ?? null,
      brand: parsed.brand ?? null,
      model: parsed.model ?? null,
      category: parsed.category ?? null,
      subcategory: parsed.subcategory ?? null,
      description: parsed.description ?? null,
      sku: parsed.sku ?? null,
      barcode: parsed.barcode ?? null,
      size: parsed.size ?? null,
      weight: parsed.weight ?? null,
      volume: parsed.volume ?? null,
      unit: parsed.unit ?? null,
      color: parsed.color ?? null,
      purchase_price: parsed.purchase_price ?? null,
      selling_price: parsed.selling_price ?? null,
      currency: parsed.currency ?? null,
      tags: Array.isArray(parsed.tags) ? parsed.tags : (parsed.tags ? [parsed.tags] : []),
      search_keywords: Array.isArray(parsed.search_keywords)
        ? parsed.search_keywords
        : parsed.search_keywords
        ? [parsed.search_keywords]
        : [],
      confidence: {},
      source: source === 'image' || source === 'document' ? source : 'image',
      rawOutput: parsed,
    };

    // Normalize confidence scores
    // If confidence object exists, use it; otherwise assign default confidence
    if (parsed.confidence && typeof parsed.confidence === 'object') {
      result.confidence = {
        name: parsed.confidence.name ?? 0.8,
        brand: parsed.confidence.brand ?? 0.8,
        barcode: parsed.confidence.barcode ?? 0.7,
        price: parsed.confidence.price ?? 0.5,
        ...result.confidence,
      };
    } else {
      // Default confidence for extracted fields
      result.confidence = {
        name: 0.8,
        brand: 0.8,
        barcode: 0.7,
        price: 0.5,
      };
    }

    return result;
  }

  /**
   * Return a product extraction result with all null values.
   */
  private getNullResult(source: string): ProductExtractionResult {
    return {
      name: null,
      brand: null,
      model: null,
      category: null,
      subcategory: null,
      description: null,
      sku: null,
      barcode: null,
      size: null,
      weight: null,
      volume: null,
      unit: null,
      color: null,
      purchase_price: null,
      selling_price: null,
      currency: null,
      tags: [],
      search_keywords: [],
      confidence: {},
      source,
      rawOutput: null,
    };
  }
}