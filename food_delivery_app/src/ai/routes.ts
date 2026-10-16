/**
 * SmartSoko Product Agent Routes
 *
 * REST API endpoints for the Product Agent, integrated with the existing
 * SmartSoko Express server. Also serves the A2A Agent Card.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ProductAgent, ProductAgentCapabilities } from '../ai/product-agent';
import { GeminiVisionProvider } from '../ai/vision-provider';
import { verifyToken, requireMerchant } from '../middleware/auth';
import { validate, schemas } from '../middleware/validate';

const router = Router();
const API_VERSION = 'v1';

// Initialize Product Agent with Gemini vision provider
// In production, the vision provider would be injected/configured
let productAgent: ProductAgent | null = null;

// Initialize the product agent (lazy initialization)
function initProductAgent() {
  if (!productAgent) {
    const visionProvider = new GeminiVisionProvider();
    productAgent = new ProductAgent(visionProvider);
  }
  return productAgent;
}

/**
 * GET /.well-known/agent-card.json
 * A2A Agent Card - discoverable by future SmartSoko agents
 */
router.get(
  '/.well-known/agent-card.json',
  (req: Request, res: Response) => {
    try {
      const agent = initProductAgent();
      res.json(agent.getAgentCard());
    } catch (error) {
      res.status(500).json({
        error: 'Failed to load agent card',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/v1/ai/products/extract
 * Extract product information from an image.
 * Merchant must be authenticated.
 */
router.post(
  '/ai/products/extract',
  verifyToken,
  requireMerchant,
  validate(schemas.productExtract), // Schema will be created
  async (req: Request, res: Response) => {
    try {
      const agent = initProductAgent();
      const { image, mimeType } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          error: 'Image data is required',
        });
      }

      const imageBuffer = Buffer.from(image, 'base64');
      const merchantId = req.user?.uid || '';

      const result = await agent.extractFromImage(
        imageBuffer,
        mimeType || 'image/jpeg',
        merchantId
      );

      res.json({
        success: true,
        data: result,
        requestId: req.id,
        agent: 'product-agent',
      });
    } catch (error) {
      console.error('Product extraction error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/v1/ai/products/draft
 * Generate a product draft from extracted data.
 * Result is pending merchant approval.
 */
router.post(
  '/ai/products/draft',
  verifyToken,
  requireMerchant,
  async (req: Request, res: Response) => {
    try {
      const agent = initProductAgent();
      const { extraction_result, merchant_id } = req.body;

      if (!extraction_result) {
        return res.status(400).json({
          success: false,
          error: 'Extraction result is required',
        });
      }

      if (!merchant_id) {
        return res.status(400).json({
          success: false,
          error: 'Merchant ID is required',
        });
      }

      const draft = await agent.generateProductListing(
        extraction_result,
        merchant_id
      );

      res.json({
        success: true,
        data: draft,
        status: 'pending_approval',
        requestId: req.id,
        agent: 'product-agent',
      });
    } catch (error) {
      console.error('Product draft generation error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/v1/ai/products/validate
 * Validate a product draft against SmartSoko business rules.
 */
router.post(
  '/ai/products/validate',
  verifyToken,
  requireMerchant,
  async (req: Request, res: Response) => {
    try {
      const agent = initProductAgent();
      const { draft, merchant_id } = req.body;

      if (!draft) {
        return res.status(400).json({
          success: false,
          error: 'Product draft is required',
        });
      }

      if (!merchant_id) {
        return res.status(400).json({
          success: false,
          error: 'Merchant ID is required',
        });
      }

      const validation = await agent.validateProductDraft(draft, merchant_id);

      res.json({
        success: true,
        data: validation,
        requestId: req.id,
        agent: 'product-agent',
      });
    } catch (error) {
      console.error('Product validation error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/v1/ai/products/{draft_id}/approve
 * Approve a product draft and create in SmartSoko catalogue.
 * Only after merchant approval should the existing product creation mechanism be called.
 */
router.post(
  '/ai/products/:draft_id/approve',
  verifyToken,
  requireMerchant,
  async (req: Request, res: Response) => {
    try {
      const agent = initProductAgent();
      const { draft_id } = req.params;
      const merchantId = req.user?.uid || '';

      // Verify the draft exists and belongs to this merchant
      const { data: draft, error: draftError } = await supabase
        .from('product_drafts')
        .select('*')
        .eq('id', draft_id)
        .single();

      if (draftError) {
        return res.status(404).json({
          success: false,
          error: 'Draft not found',
        });
      }

      if (draft.merchant_id !== merchantId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: Draft does not belong to this merchant',
        });
      }

      // In a full implementation, this would:
      // 1. Call the existing SmartSoko product creation API to publish the product
      // 2. Update draft status to 'published'
      // For Phase 1, we mark the draft as approved and note that
      // the product creation will be handled by the existing SmartSoko backend

      // Mark draft as approved (status update)
      await supabase
        .from('product_drafts')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', draft_id);

      res.json({
        success: true,
        data: {
          draftId: draft_id,
          status: 'approved',
          message: 'Product draft approved. Product creation will be handled by existing SmartSoko API.',
        },
        requestId: req.id,
        agent: 'product-agent',
      });
    } catch (error) {
      console.error('Product approval error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/v1/ai/products/{draft_id}/reject
 * Reject a product draft.
 */
router.post(
  '/ai/products/:draft_id/reject',
  verifyToken,
  requireMerchant,
  async (req: Request, res: Response) => {
    try {
      const { draft_id } = req.params;
      const merchantId = req.user?.uid || '';

      res.json({
        success: true,
        data: {
          draftId: draft_id,
          status: 'rejected',
          message: 'Product draft rejected.',
        },
        requestId: req.id,
        agent: 'product-agent',
      });
    } catch (error) {
      console.error('Product rejection error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/v1/ai/products/detect-duplicate
 * Check if a product already exists in the SmartSoko catalogue.
 */
router.post(
  '/ai/products/detect-duplicate',
  verifyToken,
  requireMerchant,
  async (req: Request, res: Response) => {
    try {
      const agent = initProductAgent();
      const { name, barcode, sku, brand, size } = req.body;

      const result = await agent.detectDuplicate({ name, barcode, sku, brand, size });

      res.json({
        success: true,
        data: result,
        requestId: req.id,
        agent: 'product-agent',
      });
    } catch (error) {
      console.error('Duplicate detection error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

export const aiRoutes = router;