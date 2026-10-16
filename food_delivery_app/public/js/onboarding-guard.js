/* Onboarding guard - redirects new users to the onboarding flow.
 * No-op by default; pages that need gating opt in via window.onboardingGuard.
 */
(function () {
  'use strict';

  window.onboardingGuard = window.onboardingGuard || {
    enabled: false,
    check: function () { return null; },
    complete: function () {}
  };
})();