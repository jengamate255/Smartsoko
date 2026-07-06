/**
 * AI Product Generator for SmartSoko Commerce OS
 * Generates product names, descriptions, and details using AI
 */

class AIProductGenerator {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  }

  init(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Generate product ideas based on category and keywords
   */
  async generateProductIdeas(category, keywords, count = 5) {
    const prompt = `Generate ${count} product ideas for a ${category} store.
Keywords: ${keywords}

For each product, provide:
1. Product name (catchy and marketable)
2. Short description (2-3 sentences)
3. Key features (3-4 bullet points)
4. Suggested price range in TSh (Tanzanian Shillings)
5. 3 relevant tags/keywords for search

Format as JSON array:
[{
  "name": "Product Name",
  "description": "Description text...",
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "priceRange": { "min": 5000, "max": 15000 },
  "tags": ["tag1", "tag2", "tag3"],
  "category": "${category}"
}]

Return ONLY valid JSON, no markdown formatting.`;

    try {
      const response = await this.callGeminiAPI(prompt);
      return this.parseProductIdeas(response);
    } catch (error) {
      console.error('AI Generation Error:', error);
      throw new Error('Failed to generate product ideas. Please try again.');
    }
  }

  /**
   * Enhance product description
   */
  async enhanceDescription(currentDescription, productName, category) {
    const prompt = `Enhance this product description to be more engaging and SEO-friendly.

Product: ${productName}
Category: ${category}
Current Description: ${currentDescription || 'None'}

Requirements:
- 2-3 compelling paragraphs
- Include key benefits and use cases
- SEO-optimized with natural keyword integration
- Professional yet approachable tone
- Maximum 200 words

Return only the enhanced description text, no additional formatting.`;

    try {
      const response = await this.callGeminiAPI(prompt);
      return response.trim();
    } catch (error) {
      console.error('Description Enhancement Error:', error);
      throw error;
    }
  }

  /**
   * Generate product variants
   */
  async generateVariants(productName, category) {
    const prompt = `Generate common product variants/options for: ${productName}
Category: ${category}

Provide variants like:
- Size options
- Color options  
- Style variations
- Package/bundle options

Format as JSON:
{
  "variants": [
    {
      "name": "Size",
      "options": [
        {"value": "Small", "priceAdjustment": 0},
        {"value": "Medium", "priceAdjustment": 1000},
        {"value": "Large", "priceAdjustment": 2000}
      ]
    }
  ]
}

Return ONLY valid JSON.`;

    try {
      const response = await this.callGeminiAPI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Variant Generation Error:', error);
      return { variants: [] };
    }
  }

  /**
   * Generate SEO keywords
   */
  async generateSEOKeywords(productName, description, category) {
    const prompt = `Generate SEO keywords and tags for this product:

Product: ${productName}
Category: ${category}
Description: ${description}

Provide:
1. 5-7 short tags (1-2 words each)
2. 3-4 long-tail keywords (3-5 words)
3. Suggested meta description (150-160 characters)

Format as JSON:
{
  "tags": ["tag1", "tag2", ...],
  "longTailKeywords": ["keyword phrase 1", ...],
  "metaDescription": "..."
}

Return ONLY valid JSON.`;

    try {
      const response = await this.callGeminiAPI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('SEO Generation Error:', error);
      return { tags: [], longTailKeywords: [], metaDescription: '' };
    }
  }

  /**
   * Call Gemini API
   */
  async callGeminiAPI(prompt) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const url = `${this.baseUrl}?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          topP: 0.9
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }

  /**
   * Parse product ideas from AI response
   */
  parseProductIdeas(response) {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response;
      
      return JSON.parse(jsonString.trim());
    } catch (error) {
      console.error('JSON Parse Error:', error);
      console.log('Raw response:', response);
      
      // Fallback: return a simple structure
      return [{
        name: 'AI Generated Product',
        description: response.substring(0, 200),
        features: ['AI-generated feature'],
        priceRange: { min: 5000, max: 10000 },
        tags: ['ai-generated'],
        category: 'general'
      }];
    }
  }
}

// Export for use
window.AIProductGenerator = new AIProductGenerator();
