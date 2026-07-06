/**
 * Shared onboarding routing — included on login, signup, and onboarding pages.
 */
(function (global) {
  var ONBOARDING_VERSION = 1;

  var ROLE_HOME = {
    customer: '/index',
    driver: '/driver',
    merchant: '/merchant',
    seller: '/merchant',
    admin: '/admin'
  };

  function normalizeRole(role) {
    if (role === 'seller') return 'merchant';
    return role || 'customer';
  }

  /** Legacy users (no flag) are treated as complete; new signups set onboardingComplete: false */
  function needsOnboarding(userData) {
    if (!userData) return true;
    if (userData.onboardingComplete === true) return false;
    if (userData.onboardingComplete === false) return true;
    return false;
  }

  function getRoleHome(role) {
    var r = normalizeRole(role);
    return ROLE_HOME[r] || ROLE_HOME.customer;
  }

  function redirectAfterAuth(userData, role) {
    if (needsOnboarding(userData)) {
      global.location.href = '/onboarding';
      return;
    }
    global.location.href = getRoleHome(role);
  }

  global.SmartSokoOnboarding = {
    ONBOARDING_VERSION: ONBOARDING_VERSION,
    normalizeRole: normalizeRole,
    needsOnboarding: needsOnboarding,
    getRoleHome: getRoleHome,
    redirectAfterAuth: redirectAfterAuth
  };
})(window);
