const dealRoutes = require('./deals');
const giftCardRoutes = require('./giftCards');
const subscriptionRoutes = require('./subscriptions');
const referralRoutes = require('./referrals');
const reviewRoutes = require('./reviews');
const addressRoutes = require('./addresses');
const promoRoutes = require('./promos');
const orderRoutes = require('./orders');
const healthRoutes = require('./health');
const { cartRoutes } = require('./cart');
const { paymentMethodsRoutes } = require('./paymentMethods');
const { init: initPushBridge } = require('../services/push-bridge');

function registerRoutes(app) {
  // Fan out event-bus events as FCM pushes + notification rows (must be
  // initialized once before any route publishes an event).
  initPushBridge(app);

  healthRoutes(app);
  dealRoutes(app);
  giftCardRoutes(app);
  subscriptionRoutes(app);
  referralRoutes(app);
  reviewRoutes(app);
  addressRoutes(app);
  promoRoutes(app);
  orderRoutes(app);
  cartRoutes(app);
  paymentMethodsRoutes(app);
}

module.exports = { registerRoutes };