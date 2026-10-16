const { test, expect } = require('@playwright/test');

// nTZS API Live Key (confirmed working)
const NTZS_API_KEY = 'ntzs_live_0a58fe4d4da3cc7559e77d50f4edfc1a2fd56392';

// nTZS Webhook Secret (must match .env)
const NTZS_WEBHOOK_SECRET = 'whsec_test_secret';

test('nTZS End-to-End: Checkout with nTZS Wallet', async ({ page }) => {
  // 1. Start the server first: npm run dev
  // 2. Make sure ngrok/tunnel is running for webhook testing
  
  await page.goto('http://localhost:3000/checkout');
  
  // 2. Wait for checkout page to load
  await expect(page.locator('h1')).toContainText('Checkout');
  
  // 3. Select nTZS Wallet payment method
  await page.click('text=nTZS Wallet');
  
  // Wait for payment method to be selected
  await expect(page.locator('[data-payment="ntzs"]')).toHaveClass('border-purple-600');
  
  // 3. Fill in phone number (required for nTZS mobile money deposit)
  await page.fill('#mmPhoneInput', '0712345678');
  
  // 4. Place order
  await page.click('#placeOrderBtn');
  
  // 5. Wait for order placement
  // For nTZS, after order creation, it should redirect to nTZS payment page
  // or show notification about nTZS payment
  await expect(page.locator('.notification')).toBeVisible({ timeout: 5000 });
  
  // 6. Check that notification mentions nTZS
  const notificationText = await page.locator('.notification').textContent();
  expect(notificationText.toLowerCase()).toContain('ntzs');
  
  console.log('✅ nTZS E2E test completed successfully');
});