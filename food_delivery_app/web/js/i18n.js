/**
 * SmartSoko i18n — Swahili-first translation system
 * Persists language choice in localStorage. Default: Swahili for Gen Z TZ.
 *
 * Usage:
 *   I18N.t('cart.empty')             -> "Basket yako iko tupu"
 *   I18N.setLang('en')                // switch to English
 *   I18N.setLang('sw')                // switch to Swahili
 *   I18N.apply(document)              // auto-translate all [data-i18n] nodes
 */
(function () {
  const STORAGE_KEY = 'smartsoko_lang';

  const STRINGS = {
    sw: {
      // Navigation / brand
      'brand.name': 'SmartSoko',
      'brand.tagline': 'Soko lako la karibu',
      'nav.home': 'Nyumbani',
      'nav.discover': 'Gundua',
      'nav.cart': 'Kapu',
      'nav.profile': 'Wasifu',
      'nav.orders': 'Oda zangu',
      'nav.support': 'Msaada',

      // Greetings
      'greeting.morning': 'Habari za asubuhi',
      'greeting.afternoon': 'Habari za mchana',
      'greeting.evening': 'Habari za jioni',
      'greeting.welcome': 'Karibu Soko!',

      // Home / categories
      'home.deliveryAddress': 'Mahali pa kuletewa',
      'home.selectLocation': 'Chagua mahali',
      'home.browseByCategory': 'Vinjari kwa Aina',
      'home.popularSellers': 'Wauzaji Wanaoongoza',
      'home.recommended': 'Imependekezwa Kwako',
      'home.yourOrders': 'Oda Zako',
      'home.favorites': 'Vipendwa Vyako',
      'home.recentlyViewed': 'Ulichokiona Hivi Karibuni',
      'home.quickActions': 'Vitendo vya Haraka',
      'home.specialOffers': 'Ofa Maalum',
      'home.viewAll': 'Ona zote',
      'home.viewMap': 'Ona Ramani',
      'home.nearbySellers': 'Wauzaji Karibu Nawe',
      'home.nearbySellersSub': 'Gundua wauzaji katika eneo lako',
      'home.popularSellersSub': 'Wauzaji wenye nyota nyingi eneo lako',
      'home.emptyOrders': 'Huna oda bado. Twende dukani!',
      'home.emptyFavorites': 'Huna vipendwa bado',
      'home.emptyRecently': 'Bado hujaona kitu',
      'home.exploreNow': 'Gundua sasa',
      'home.discoveringSellers': 'Tunatafuta wauzaji karibu nawe...',
      'home.failedToLoadSellers': 'Imeshindwa kupakia wauzaji. Jaribu tena.',

      // Discovery / feed
      'feed.title': 'Gundua Soko',
      'feed.subtitle': 'Vitambaa, vitumbua, mishkaki — vyote karibu nawe',
      'feed.doubleTapHint': 'Gusa mara mbili kupenda',
      'feed.swipeHint': 'Sogeza juu kwa zaidi',
      'feed.addToCart': 'Weka Kapuni',
      'feed.share': 'Tuma WhatsApp',
      'feed.like': 'Penda',
      'feed.comments': 'Maoni',
      'feed.minutesAway': 'dakika',
      'feed.tzsAway': 'TZS mbali',

      // Cart
      'cart.title': 'Kapu Yako',
      'cart.empty': 'Basket yako iko tupu...',
      'cart.emptySub': 'Ongeza vitu kuanza',
      'cart.subtotal': 'Jumla ya Bidhaa',
      'cart.deliveryFee': 'Gharama ya Uwasilishaji',
      'cart.total': 'Jumla Kuu',
      'cart.viewCart': 'Ona Kapu',
      'cart.checkout': 'Endelea kulipa',
      'cart.items': 'vitu',
      'cart.addedToCart': 'Imeongezwa kapuni!',
      'cart.continueShopping': 'Endelea kununua',
      'cart.clear': 'Futa kapu',
      'cart.estimate': 'Makadirio',
      'cart.share': 'Tuma kapu WhatsApp',
      'cart.shareText': 'Ninakuagiza kwa SmartSoko! Jiunge nami:',

      // Checkout
      'checkout.title': 'Malizia Oda',
      'checkout.subtitle': 'Kagua oda yako na ukamilishe ununuzi',
      'checkout.empty': 'Kapu yako iko tupu',
      'checkout.emptySub': 'Ongeza vitu kuanza',
      'checkout.browseSellers': 'Vinjari Wauzaji',
      'checkout.detecting': 'Tunapata mahali pako...',
      'checkout.detectSub': 'Tunahitaji mahali pako pa uwasilishaji',
      'checkout.tryAgain': 'Jaribu tena',
      'checkout.deliveryAddress': 'Anwani ya Uwasilishaji',
      'checkout.edit': 'Hariri',
      'checkout.orderSummary': 'Muhtasari wa Oda',
      'checkout.paymentMethod': 'Njia ya Kulipa',
      'checkout.placeOrder': 'Weka Oda Sasa',
      'checkout.processing': 'Inachakata...',
      'checkout.orderSuccess': 'Oda yako imefanikiwa! 🎉',
      'checkout.thanksForOrder': 'Asante kwa kutuamini. Soko linapenda!',
      'checkout.trackOrder': 'Fuatilia Oda',
      'checkout.continueShopping': 'Endelea Kununua',
      'checkout.shareOrder': 'Tuma WhatsApp',
      'checkout.shareText': 'Nimeagiza kwa SmartSoko! Sasa wewe pia:',

      // Payment (preserve existing flow!)
      'payment.cash': 'Lipa Taslimu',
      'payment.cashSub': 'Pewa dereva',
      'payment.mobile': 'M-Pesa / Tigo Pesa',
      'payment.mobileSub': 'Lipa kwa simu',
      'payment.card': 'Kadi',
      'payment.cardSub': 'Visa, Mastercard',
      'payment.wallet': 'Mkoba wa SmartSoko',
      'payment.walletSub': 'Tumia salio lako',
      'payment.pesaPal': 'PesaPal',
      'payment.pesaPalSub': 'Lipa salama',
      'payment.pesapalFee': 'Ada ya PesaPal (3.5%)',

      // Orders / status
      'order.title': 'Oda Zangu',
      'order.subtitle': 'Fuatilia na agiza tena',
      'order.empty': 'Huna oda bado',
      'order.emptySub': 'Anza kununua leo!',
      'order.reorder': 'Agiza Tena',
      'order.share': 'Tuma WhatsApp',
      'order.viewDetails': 'Ona Maelezo',
      'order.track': 'Fuatilia',
      'order.status.pending': 'Inasubiri',
      'order.status.confirmed': 'Imekubaliwa',
      'order.status.preparing': 'Inapikwa',
      'order.status.ready_for_delivery': 'Tayari',
      'order.status.dispatched': 'Imepelekwa',
      'order.status.delivered': 'Imefika',
      'order.status.cancelled': 'Imeghairiwa',
      'order.items': 'vitu',
      'order.eta': 'Muda unaotarajiwa',
      'order.driver': 'Dereva',
      'order.callDriver': 'Mpigie dereva',

      // Onboarding / empty
      'empty.cartTitle': 'Basket yako iko tupu',
      'empty.cartSub': 'Twende tukakule vitumbua?',
      'empty.networkTitle': 'Mtandao ni pole pole',
      'empty.networkSub': 'Tunajaribu tena...',
      'empty.oosTitle': 'Imeisha kwa sasa',
      'empty.oosSub': 'Lakini hii iko sawa:',
      'empty.somethingWrong': 'Kuna kitu kimekwama. Jaribu tena.',
      'empty.firstOrderTitle': 'Oda ya kwanza imefanikiwa! 🎉',
      'empty.firstOrderSub': 'Asante sana! Sasa wewe ni Mwanachama wa Soko.',

      // CTA
      'cta.orderNow': 'Agiza Sasa',
      'cta.addToCart': 'Weka Kapuni',
      'cta.viewCart': 'Ona Kapu',
      'cta.checkout': 'Lipa Sasa',
      'cta.share': 'Tuma',
      'cta.like': 'Penda',
      'cta.close': 'Funga',
      'cta.confirm': 'Thibitisha',
      'cta.cancel': 'Ghairi',
      'cta.continue': 'Endelea',
      'cta.seeAll': 'Ona zote',
      'cta.tryAgain': 'Jaribu tena',
      'cta.browse': 'Vinjari',

      // Gen Z slang labels
      'genz.hot': 'MOTO',
      'genz.new': 'MPYA',
      'genz.deal': 'OFA',
      'genz.lite': 'Lite',
      'genz.points': 'Bonga',
      'genz.firstOrder': 'Oda ya kwanza',
      'genz.freeDelivery': 'Uwasilishaji Bure',
      'genz.mamaNtilie': 'Mama Ntilie Ijumaa',
      'genz.bongaFriday': 'Vitumbua Bure',

      // Auth / Onboarding
      'auth.welcome': 'Karibu Soko!',
      'auth.welcomeSub': 'Pata TZS 1,000 Bonga kwa oda yako ya kwanza',
      'auth.continueWithPhone': 'Endelea kwa Simu',
      'auth.phoneHint': 'Mfano: 0712 345 678',
      'auth.sendCode': 'Tuma Nambari',
      'auth.verifyCode': 'Thibitisha',
      'auth.resendCode': 'Tuma tena nambari',
      'auth.chooseVibe': 'Chagua Mood Yako',
      'auth.vibeBudget': 'Mtu wa Bajeti',
      'auth.vibeBudgetSub': 'Rahisi, haraka, nafuu',
      'auth.vibeQuick': 'Haraka Haraka',
      'auth.vibeQuickSub': 'Muda mfupi, chakula tayari',
      'auth.vibeTreat': 'Nitafanya Treat',
      'auth.vibeTreatSub': 'Nitajipenda leo',

      // Loyalty / Bonga
      'bonga.title': 'Bonga Points',
      'bonga.subtitle': 'Pata pointi kwa kila oda',
      'bonga.yourPoints': 'Pointi zako',
      'bonga.howToEarn': 'Jinsi ya kupata pointi',
      'bonga.earn1': '1 pointi kwa kila TZS 1,000',
      'bonga.earn2': 'Pointi za ziada kwa oda za kwanza',
      'bonga.earn3': 'Mama Ntilie Ijumaa = pointi 2x',
      'bonga.redeem': 'Tumia pointi',
      'bonga.redeemNote': '100 points = TZS 1,000 off',

      // Group order
      'group.title': 'Oda na Marafiki',
      'group.subtitle': 'Gawanya bili na marafiki',
      'group.start': 'Anzisha Oda ya Pamoja',
      'group.invite': 'Alika WhatsApp',
      'group.inviteText': 'Jiunge na oda yetu ya Soko! Ongeza unachotaka:',
      'group.splitBill': 'Gawanya Bili',
      'group.participants': 'Washiriki',

      // Profile
      'profile.title': 'Wasifu',
      'profile.myOrders': 'Oda Zangu',
      'profile.addresses': 'Anwani',
      'profile.favorites': 'Vipendwa',
      'profile.rewards': 'Bonga Points',
      'profile.support': 'Msaada',
      'profile.settings': 'Mipangilio',
      'profile.logout': 'Toka',
      'profile.language': 'Lugha',
      'profile.liteMode': 'Hali ya Lite',

      // Misc
      'misc.loading': 'Inapakia...',
      'misc.error': 'Kosa',
      'misc.success': 'Imefanikiwa',
      'misc.minutes': 'dakika',
      'misc.tzs': 'TZS',
      'misc.tzsFormat': 'TZS {amount}',
      'misc.free': 'Bure',
      'misc.popular': 'Maarufu',
      'misc.near': 'Karibu',
      'misc.open': 'Wazi',
      'misc.closed': 'Imefungwa',
    },
    en: {
      'brand.name': 'SmartSoko',
      'brand.tagline': 'Your local marketplace',
      'nav.home': 'Home',
      'nav.discover': 'Discover',
      'nav.cart': 'Cart',
      'nav.profile': 'Profile',
      'nav.orders': 'My Orders',
      'nav.support': 'Support',

      'greeting.morning': 'Good morning',
      'greeting.afternoon': 'Good afternoon',
      'greeting.evening': 'Good evening',
      'greeting.welcome': 'Welcome to Soko!',

      'home.deliveryAddress': 'Delivery Address',
      'home.selectLocation': 'Select location',
      'home.browseByCategory': 'Browse by Category',
      'home.popularSellers': 'Popular Sellers',
      'home.recommended': 'Recommended for You',
      'home.yourOrders': 'Your Orders',
      'home.favorites': 'Your Favorites',
      'home.recentlyViewed': 'Recently Viewed',
      'home.quickActions': 'Quick Actions',
      'home.specialOffers': 'Special Offers',
      'home.viewAll': 'View all',
      'home.viewMap': 'View Map',
      'home.nearbySellers': 'Nearby Sellers',
      'home.nearbySellersSub': 'Discover sellers in your area',
      'home.popularSellersSub': 'Top-rated sellers in your area',
      'home.emptyOrders': 'No orders yet. Start shopping!',
      'home.emptyFavorites': 'No favorites yet',
      'home.emptyRecently': 'Nothing viewed yet',
      'home.exploreNow': 'Explore now',
      'home.discoveringSellers': 'Discovering sellers near you...',
      'home.failedToLoadSellers': 'Failed to load sellers. Please try again.',

      'feed.title': 'Discover Soko',
      'feed.subtitle': 'Vitambaa, vitumbua, mishkaki — all near you',
      'feed.doubleTapHint': 'Double tap to like',
      'feed.swipeHint': 'Swipe up for more',
      'feed.addToCart': 'Add to Cart',
      'feed.share': 'Share WhatsApp',
      'feed.like': 'Like',
      'feed.comments': 'Comments',
      'feed.minutesAway': 'min',
      'feed.tzsAway': 'TZS away',

      'cart.title': 'Your Cart',
      'cart.empty': 'Your basket is empty...',
      'cart.emptySub': 'Add items to get started',
      'cart.subtotal': 'Subtotal',
      'cart.deliveryFee': 'Delivery Fee',
      'cart.total': 'Total',
      'cart.viewCart': 'View Cart',
      'cart.checkout': 'Proceed to Checkout',
      'cart.items': 'items',
      'cart.addedToCart': 'Added to cart!',
      'cart.continueShopping': 'Continue shopping',
      'cart.clear': 'Clear cart',
      'cart.estimate': 'Estimate',
      'cart.share': 'Share cart on WhatsApp',
      'cart.shareText': 'Ordering from SmartSoko! Join me:',

      'checkout.title': 'Checkout',
      'checkout.subtitle': 'Review your order and complete purchase',
      'checkout.empty': 'Your cart is empty',
      'checkout.emptySub': 'Add items to get started',
      'checkout.browseSellers': 'Browse Sellers',
      'checkout.detecting': 'Detecting your location...',
      'checkout.detectSub': 'We need your location for delivery',
      'checkout.tryAgain': 'Try Again',
      'checkout.deliveryAddress': 'Delivery Address',
      'checkout.edit': 'Edit',
      'checkout.orderSummary': 'Order Summary',
      'checkout.paymentMethod': 'Payment Method',
      'checkout.placeOrder': 'Place Order',
      'checkout.processing': 'Processing...',
      'checkout.orderSuccess': 'Order placed successfully! 🎉',
      'checkout.thanksForOrder': 'Thanks for trusting us. Soko loves you!',
      'checkout.trackOrder': 'Track Order',
      'checkout.continueShopping': 'Continue Shopping',
      'checkout.shareOrder': 'Share on WhatsApp',
      'checkout.shareText': 'Just ordered on SmartSoko! You should too:',

      'payment.cash': 'Cash on Delivery',
      'payment.cashSub': 'Pay the driver',
      'payment.mobile': 'M-Pesa / Tigo Pesa',
      'payment.mobileSub': 'Pay by phone',
      'payment.card': 'Card',
      'payment.cardSub': 'Visa, Mastercard',
      'payment.wallet': 'SmartSoko Wallet',
      'payment.walletSub': 'Use your balance',
      'payment.pesaPal': 'PesaPal',
      'payment.pesaPalSub': 'Secure payment',
      'payment.pesapalFee': 'PesaPal fee (3.5%)',

      'order.title': 'My Orders',
      'order.subtitle': 'Track and reorder',
      'order.empty': 'No orders yet',
      'order.emptySub': 'Start shopping today!',
      'order.reorder': 'Reorder',
      'order.share': 'Share on WhatsApp',
      'order.viewDetails': 'View Details',
      'order.track': 'Track',
      'order.status.pending': 'Pending',
      'order.status.confirmed': 'Confirmed',
      'order.status.preparing': 'Preparing',
      'order.status.ready_for_delivery': 'Ready',
      'order.status.dispatched': 'Dispatched',
      'order.status.delivered': 'Delivered',
      'order.status.cancelled': 'Cancelled',
      'order.items': 'items',
      'order.eta': 'Estimated time',
      'order.driver': 'Driver',
      'order.callDriver': 'Call driver',

      'empty.cartTitle': 'Your basket is empty',
      'empty.cartSub': 'Wanna grab some vitumbua?',
      'empty.networkTitle': 'Network too slow',
      'empty.networkSub': 'Retrying...',
      'empty.oosTitle': 'Out of stock right now',
      'empty.oosSub': 'But this is similar:',
      'empty.somethingWrong': 'Something went wrong. Try again.',
      'empty.firstOrderTitle': 'First order placed! 🎉',
      'empty.firstOrderSub': 'Asante sana! You are now a Soko Member.',

      'cta.orderNow': 'Order Now',
      'cta.addToCart': 'Add to Cart',
      'cta.viewCart': 'View Cart',
      'cta.checkout': 'Checkout',
      'cta.share': 'Share',
      'cta.like': 'Like',
      'cta.close': 'Close',
      'cta.confirm': 'Confirm',
      'cta.cancel': 'Cancel',
      'cta.continue': 'Continue',
      'cta.seeAll': 'See all',
      'cta.tryAgain': 'Try again',
      'cta.browse': 'Browse',

      'genz.hot': 'HOT',
      'genz.new': 'NEW',
      'genz.deal': 'DEAL',
      'genz.lite': 'Lite',
      'genz.points': 'Bonga',
      'genz.firstOrder': 'First Order',
      'genz.freeDelivery': 'Free Delivery',
      'genz.mamaNtilie': 'Mama Ntilie Friday',
      'genz.bongaFriday': 'Free Vitumbua',

      'auth.welcome': 'Welcome to Soko!',
      'auth.welcomeSub': 'Get TZS 1,000 Bonga on your first order',
      'auth.continueWithPhone': 'Continue with Phone',
      'auth.phoneHint': 'e.g. 0712 345 678',
      'auth.sendCode': 'Send Code',
      'auth.verifyCode': 'Verify',
      'auth.resendCode': 'Resend code',
      'auth.chooseVibe': 'Pick your vibe',
      'auth.vibeBudget': 'Budget Broke',
      'auth.vibeBudgetSub': 'Cheap, fast, easy',
      'auth.vibeQuick': 'Quick Bites',
      'auth.vibeQuickSub': 'Short on time',
      'auth.vibeTreat': 'Treat Myself',
      'auth.vibeTreatSub': 'YOLO today',

      'bonga.title': 'Bonga Points',
      'bonga.subtitle': 'Earn points on every order',
      'bonga.yourPoints': 'Your points',
      'bonga.howToEarn': 'How to earn',
      'bonga.earn1': '1 point per TZS 1,000 spent',
      'bonga.earn2': 'Bonus points on first orders',
      'bonga.earn3': 'Mama Ntilie Friday = 2x points',
      'bonga.redeem': 'Redeem',
      'bonga.redeemNote': '100 points = TZS 1,000 off',

      'group.title': 'Group Order',
      'group.subtitle': 'Split the bill with friends',
      'group.start': 'Start Group Order',
      'group.invite': 'Invite on WhatsApp',
      'group.inviteText': 'Join our Soko order! Add what you want:',
      'group.splitBill': 'Split Bill',
      'group.participants': 'Participants',

      'profile.title': 'Profile',
      'profile.myOrders': 'My Orders',
      'profile.addresses': 'Addresses',
      'profile.favorites': 'Favorites',
      'profile.rewards': 'Bonga Points',
      'profile.support': 'Support',
      'profile.settings': 'Settings',
      'profile.logout': 'Log out',
      'profile.language': 'Language',
      'profile.liteMode': 'Lite mode',

      'misc.loading': 'Loading...',
      'misc.error': 'Error',
      'misc.success': 'Success',
      'misc.minutes': 'min',
      'misc.tzs': 'TZS',
      'misc.tzsFormat': 'TZS {amount}',
      'misc.free': 'Free',
      'misc.popular': 'Popular',
      'misc.near': 'Near',
      'misc.open': 'Open',
      'misc.closed': 'Closed',
    }
  };

  function getLang() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'sw';
    } catch (_) {
      return 'sw';
    }
  }

  function setLang(lang) {
    if (!STRINGS[lang]) return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
    document.documentElement.lang = lang === 'sw' ? 'sw' : 'en';
    document.dispatchEvent(new CustomEvent('soko:lang', { detail: { lang } }));
    if (typeof apply === 'function') apply(document);
  }

  function t(key, fallback) {
    const lang = getLang();
    const dict = STRINGS[lang] || STRINGS.sw;
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    if (STRINGS.en[key]) return STRINGS.en[key];
    return fallback || key;
  }

  function formatMoney(n) {
    const num = Math.round(Number(n) || 0);
    return `${t('misc.tzs')} ${num.toLocaleString()}`;
  }

  function apply(root) {
    root = root || document;
    const lang = getLang();
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const txt = t(key, el.textContent);
      if (typeof txt === 'string') el.textContent = txt;
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', t(key, el.getAttribute('placeholder') || ''));
    });
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title'), el.getAttribute('title') || ''));
    });
  }

  window.I18N = { t, setLang, getLang, apply, formatMoney, STRINGS };
  document.documentElement.lang = getLang() === 'sw' ? 'sw' : 'en';
})();
