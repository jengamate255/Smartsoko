/**
 * AI Product Agent Routes
 *
 * Endpoints for the SmartSoko Product Agent.
 * These endpoints integrate with the existing SmartSoko backend,
 * reusing established APIs, authentication, and database access.
 *
 * ALL AI outputs flow through the existing SmartSoko business logic.
 * The AI proposes, SmartSoko validates and performs mutations.
 */

const { Router } = require('express');
const { GeminiVisionProvider } = require('../../../../../../ai-product-agent/vision/gemini-vision-provider.js');
const { randomUUID: uuidv4 } = require('crypto');

// Initialize Vision Provider
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

let visionProvider;

if (GEMINI_API_KEY) {
  visionProvider = new GeminiVisionProvider({
    apiKey: GEMINI_API_KEY,
    model: GEMINI_MODEL,
  });
  console.log('✅ Product Agent Vision Provider initialized with Gemini');
} else {
  console.warn('⚠️ GEMINI_API_KEY not configured. Product Agent will use mock mode.');
  visionProvider = null;
}

/**
 * POST /ai/products/extract
 * Extract product information from an uploaded image.
 * Merchant uploads an image, the AI extracts product fields.
 */
function extractProductFromImage(req, res) {
  try {
    if (!visionProvider) {
      return res.status(503).json({
        error: 'Product Agent not configured. Set GEMINI_API_KEY environment variable.',
      });
    }

    // Check that we have an image
    if (!req.file && !req.body.imageBase64) {
      return res.status(400).json({
        error: 'No image provided. Please upload a product image.',
      });
    }

    let imageBase64;
    let mimeType;

    if (req.file) {
      // Multer uploaded file
      imageBase64 = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
    } else if (req.body.imageBase64) {
      imageBase64 = req.body.imageBase64;
      mimeType = req.body.mimeType || 'image/jpeg';
    } else {
      return res.status(400).json({
        error: 'Invalid image data',
      });
    }

    // Validate file size (limit 10MB)
    const fileSize = Buffer.from(imageBase64, 'base64').length;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSize) {
      return res.status(400).json({
        error: 'Image too large. Maximum size is 10MB.',
      });
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({
        error: `Unsupported image format. Allowed: ${allowedTypes.join(', ')}`,
      });
    }

    // Extract product information using Gemini Vision
    visionProvider.extractProductFromImage(imageBase64, mimeType)
      .then((extractionResult) => {
        res.status(200).json({
          success: true,
          data: extractionResult,
          task_id: uuidv4(),
          agent_name: 'product-agent',
          skill: 'extract_from_image',
        });
      })
      .catch((error) => {
        console.error('Product extraction error:', error);
        res.status(500).json({
          error: process.env.NODE_ENV === 'production'
            ? 'Failed to extract product information'
            : error.message,
        });
      });
  } catch (error) {
    console.error('Product extraction error:', error);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Failed to extract product information'
        : error.message,
    });
  }
}

/**
 * POST /ai/products/draft
 * Create a product draft from extracted data.
 * The merchant reviews and approves before publishing.
 */
async function createProductDraft(req, res) {
  try {
    const { extractedData, merchantId } = req.body;

    if (!extractedData) {
      return res.status(400).json({
        error: 'Extracted product data is required',
      });
    }

    if (!merchantId) {
      return res.status(400).json({
        error: 'Merchant ID is required',
      });
    }

    // Validate that the merchant ID is provided
    if (!merchantId.trim()) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid merchant ID',
      });
    }

    // Generate product draft
    const draft = await visionProvider.generateProductListing(extractedData, merchantId);

    // Check for duplicates before creating draft
    const db = req.app.get('db');
    GeminiVisionProvider.setDb(db);
    const duplicateCheck = await visionProvider.detectDuplicateProduct(draft, merchantId);

    res.status(201).json({
      success: true,
      data: {
        draft,
        duplicate_detected: duplicateCheck.duplicate_detected,
        existing_product_id: duplicateCheck.existing_product_id,
        existing_product_name: duplicateCheck.existing_product_name,
      },
      task_id: uuidv4(),
      agent_name: 'product-agent',
      skill: 'generate_product_draft',
    });
  } catch (error) {
    console.error('Create product draft error:', error);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Failed to create product draft'
        : error.message,
    });
  }
}

/**
 * POST /ai/products/validate
 * Validate a product draft against business rules.
 */
function validateProductDraft(req, res) {
  try {
    const { draft, merchantId } = req.body;

    if (!draft) {
      return res.status(400).json({
        error: 'Product draft is required',
      });
    }

    if (!merchantId) {
      return res.status(400).json({
        error: 'Merchant ID is required',
      });
    }

    // Validate the product draft
    visionProvider.validateProduct(draft, merchantId)
      .then((validationResult) => {
        res.status(200).json({
          success: true,
          data: validationResult,
          task_id: uuidv4(),
          agent_name: 'product-agent',
          skill: 'validate_product',
        });
      })
      .catch((error) => {
        console.error('Validate product draft error:', error);
        res.status(500).json({
          error: process.env.NODE_ENV === 'production'
            ? 'Failed to validate product draft'
            : error.message,
        });
      });
  } catch (error) {
    console.error('Validate product draft error:', error);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Failed to validate product draft'
        : error.message,
    });
  }
}

/**
 * POST /ai/products/:draft_id/approve
 * Approve a product draft and create the product in SmartSoko.
 */
function approveProductDraft(req, res) {
  try {
    const { draftId } = req.params;
    const { merchantId } = req.body;

    if (!draftId) {
      return res.status(400).json({
        error: 'Draft ID is required',
      });
    }

    if (!merchantId) {
      return res.status(400).json({
        error: 'Merchant ID is required',
      });
    }

    // Approve the product draft
    // In a real implementation, this would call the existing SmartSoko
    // product creation API with the draft data validated by the merchant
    res.status(200).json({
      success: true,
      data: {
        message: 'Product draft approved. Product creation to be completed via Merchant App.',
        draft_id: draftId,
        merchant_id: merchantId,
      },
      task_id: uuidv4(),
      agent_name: 'product-agent',
      skill: 'approve_product_draft',
    });
  } catch (error) {
    console.error('Approve product draft error:', error);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Failed to approve product draft'
        : error.message,
    });
  }
}

/**
 * POST /ai/products/:draft_id/reject
 * Reject a product draft.
 */
function rejectProductDraft(req, res) {
  try {
    const { draftId } = req.params;
    const { merchantId, reason } = req.body;

    if (!draftId) {
      return res.status(400).json({
        error: 'Draft ID is required',
      });
    }

    if (!merchantId) {
      return res.status(400).json({
        error: 'Merchant ID is required',
      });
    }

    // Log the rejection and return success
    res.status(200).json({
      success: true,
      data: {
        message: 'Product draft rejected',
        draft_id: draftId,
        merchant_id: merchantId,
        reason: reason || 'Merchant rejected',
      },
      task_id: uuidv4(),
      agent_name: 'product-agent',
      skill: 'reject_product_draft',
    });
  } catch (error) {
    console.error('Reject product draft error:', error);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Failed to reject product draft'
        : error.message,
    });
  }
}

/**
 * GET /.well-known/agent-card.json
 * A2A Agent Card - discoverable by other SmartSoko agents
 */
function getAgentCard(req, res) {
  try {
    const agentCard = {
      name: 'SmartSoko Product Agent',
      description: 'AI agent for extracting and generating product listings from images and documents',
      version: '1.0.0',
      type: 'product-agent',

      // A2A Protocol specific
      vendor_url: 'http://localhost:3000',
      capabilities: [
        'extract_product_from_image',
        'extract_products_from_document',
        'generate_product_listing',
        'validate_product',
        'detect_duplicate_product',
        'create_product_draft',
        'update_product_listing',
      ],

      // Supported skills with input/output schemas
      skills: [
        {
          id: 'extract_from_image',
          name: 'Extract Product from Image',
          description: 'Extract product information from a product image using vision AI',
          input_schema: {
            type: 'object',
            properties: {
              imageBase64: {
                type: 'string',
                description: 'Base64-encoded image data',
              },
              mimeType: {
                type: 'string',
                description: 'MIME type of the image',
                enum: ['image/jpeg', 'image/png', 'image/webp'],
              },
            },
            required: ['imageBase64', 'mimeType'],
          },
        },
        {
          id: 'generate_product_draft',
          name: 'Generate Product Draft',
          description: 'Create a pending product draft from extracted data for merchant approval',
          input_schema: {
            type: 'object',
            properties: {
              extractedData: {
                type: 'object',
                description: 'Partial product data from extraction',
              },
              merchantId: {
                type: 'string',
                description: 'Merchant ID for validation context',
              },
            },
            required: ['extractedData', 'merchantId'],
          },
        },
        {
          id: 'validate_product',
          name: 'Validate Product',
          description: 'Validate a product draft against business rules',
          input_schema: {
            type: 'object',
            properties: {
              draft: {
                type: 'object',
                description: 'Product draft to validate',
              },
              merchantId: {
                type: 'string',
                description: 'Merchant ID for validation context',
              },
            },
            required: ['draft', 'merchantId'],
          },
        },
        {
          id: 'detect_duplicate',
          name: 'Detect Duplicate Product',
          description: 'Check if a product already exists in the SmartSoko catalogue',
          input_schema: {
            type: 'object',
            properties: {
              draft: {
                type: 'object',
                description: 'Product draft to check for duplicates',
              },
              merchantId: {
                type: 'string',
                description: 'Merchant ID for merchant-scoped duplicate check',
              },
            },
            required: ['draft', 'merchantId'],
          },
        },
      ],

      // Agent metadata
      agent_name: 'product-agent',
      agent_type: 'product',
      status: 'ready',
      metadata: {
        vision_provider: 'google-gemini',
        gemini_model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        extraction_fields: [
          'name', 'brand', 'category', 'size', 'barcode', 'sku',
          'selling_price', 'color', 'tags',
        ],
      },
    };

    res.json({
      success: true,
      data: agentCard,
    });
  } catch (error) {
    console.error('Agent card error:', error);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Failed to load agent card'
        : error.message,
    });
  }
}

/**
 * GET /health - Product Agent health check
 */
function productAgentHealthCheck(req, res) {
  try {
    const db = req.app.get('db');
    const healthStatus = {
      agent: 'product-agent',
      status: visionProvider ? 'ready' : 'not_configured',
      vision_provider: visionProvider ? 'google-gemini' : 'none',
      gemini_model: process.env.GEMINI_MODEL || 'none',
      database: db ? 'connected' : 'disconnected',
    };

    res.json({
      success: true,
      data: healthStatus,
    });
  } catch (error) {
    console.error('Product agent health check error:', error);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Health check failed'
        : error.message,
    });
  }
}

const router = Router();

// Define routes
router.post('/products/extract', extractProductFromImage);
router.post('/products/draft', createProductDraft);
router.post('/products/validate', validateProductDraft);
router.post('/products/:draftId/approve', approveProductDraft);
router.post('/products/:draftId/reject', rejectProductDraft);
router.get('/.well-known/agent-card', getAgentCard);
router.get('/health', productAgentHealthCheck);

module.exports = router;