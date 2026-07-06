/**
 * Demo Users for SmartSoko Testing
 * 
 * These are test accounts for development/demo purposes.
 * To use: Create these users in Firebase Auth console or use the signup page.
 * 
 * DEMO CREDENTIALS:
 * 
 * Customer Account:
 * - Email: demo@smartsoko.com
 * - Password: demo123456
 * - Role: customer
 * 
 * Merchant Account:
 * - Email: merchant@smartsoko.com
 * - Password: demo123456
 * - Role: merchant
 * 
 * Driver Account:
 * - Email: driver@smartsoko.com
 * - Password: demo123456
 * - Role: driver
 * 
 * Admin Account:
 * - Email: admin@smartsoko.com
 * - Password: demo123456
 * - Role: admin
 */

const DEMO_USERS = {
  customer: {
    email: 'demo@smartsoko.com',
    password: 'demo123456',
    role: 'customer',
    name: 'Demo Customer'
  },
  merchant: {
    email: 'merchant@smartsoko.com',
    password: 'demo123456',
    role: 'merchant',
    name: 'Demo Merchant'
  },
  driver: {
    email: 'driver@smartsoko.com',
    password: 'demo123456',
    role: 'driver',
    name: 'Demo Driver'
  },
  admin: {
    email: 'admin@smartsoko.com',
    password: 'demo123456',
    role: 'admin',
    name: 'Demo Admin'
  }
};

// Export for use in server scripts
if (typeof module !== 'undefined') {
  module.exports = { DEMO_USERS };
}
