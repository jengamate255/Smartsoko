/**
 * SmartSoko i18n — Kiswahili-first localization
 *
 * Usage (static HTML):
 *   <span data-i18n="nav.home">Nyumbani</span>
 *   <input data-i18n-placeholder="search.placeholder" placeholder="Tafuta...">
 *   <a data-i18n-title="home.title" title="Nyumbani">...</a>
 *
 * Usage (dynamic JS):
 *   SmartSokoI18n.t('cart.empty')
 *
 * Language is persisted in localStorage('smartsoko_lang').
 * Default: 'sw' (Kiswahili).
 */
const SmartSokoI18n = (() => {
  const STORAGE_KEY = 'smartsoko_lang';
  const DEFAULT_LANG = 'sw';

  const dictionaries = {
    sw: {
      // ── Navigation ──
      'nav.home': 'Nyumbani',
      'nav.discover': 'Gundua',
      'nav.cart': 'Kikapu',
      'nav.sell': 'Uza',
      'nav.profile': 'Profaili',
      'nav.orders': 'Maagizo',
      'nav.earnings': 'Mapato',
      'nav.dashboard': 'Dashibodi',
      'nav.users': 'Watumiaji',
      'nav.products': 'Bidhaa',
      'nav.search': 'Tafuta',
      'nav.signOut': 'Ondoka',
      'nav.mainMenu': 'Menyu Kuu',
      'nav.quickLinks': 'Viungo vya Haraka',
      'nav.categories': 'Vikundi',
      'nav.adminPanel': 'Paneli ya Msimamizi',
      'nav.sellOnSmartSoko': 'Uza kwenye SmartSoko',

      // ── Categories ──
      'cat.food': 'Chakula',
      'cat.dairy': 'Maziwa',
      'cat.fruits': 'Matunda',
      'cat.groceries': 'Magauni',
      'cat.bakery': 'Mkate',
      'cat.all': 'Zote',
      'cat.vegetables': 'Mboga',
      'cat.freshProduce': 'Mazao Mabichi',
      'cat.foodRestaurants': 'Chakula na Migahawa',

      // ── Header / Search ──
      'header.deliverTo': 'Peleka',
      'header.searchProducts': 'Tafuta bidhaa, chapa na zaidi...',
      'header.searchRestaurants': 'Tafuta migahawa au vyakula...',
      'header.searchProductsSellers': 'Tafuta bidhaa, wauzaji...',
      'header.skipToShopping': 'Ruka kwenda ununuzi',

      // ── Homepage ──
      'home.heroTitle': 'Soko Lako, Karibu Nyumbani',
      'home.heroSubtitle': 'Soko la kienyeji linalounga mkono wa jamii yako',
      'home.orderNow': 'Pokea Sasa',
      'home.joinUs': 'Jiunge Nasi',
      'home.limitedOffer': 'Joto la Kipekee',
      'home.quickCategories': 'Vikundi vya Haraka',
      'home.seeAll': 'Zote',
      'home.flashDeals': 'Ofa za Haraka',
      'home.endsIn': 'Inaisha katika',
      'home.popularProducts': 'Bidhaa Maarufu',
      'home.popularSellers': 'Wauzaji Maarufu',
      'home.quickLinks': 'Viungo vya Haraka',
      'home.newArrivals': 'Mpya',
      'home.featuredProducts': 'Bidhaa Zilizochaguliwa',
      'home.yourNeighbourhood': 'Jirani yako, imepelekwa.',
      'home.allDepartments': 'Idara zote',
      'home.organicCurator': 'Mteuzi wa Kienyeji',
      'home.slogan': 'Soko — Sasa — Salama',
      'home.freshFood': 'Chakula Mabichi',
      'home.groceriesMore': 'Magauni na Zaidi',
      'home.fromLocalSellers': 'Kutoka wauzaji wa kienyeji',
      'home.fastDelivery': 'Utoaji wa haraka',
      'home.greatPrices': 'Bei nzuri',
      'home.supportLocal': 'Unga mkono jamii',

      // ── Discovery / Browse ──
      'discovery.title': 'Gundua',
      'discovery.subtitle': 'Pata bidhaa bora kutoka wauzaji wa kienyeji',
      'discovery.filter': 'Chuja',
      'discovery.sort': 'Panga',
      'discovery.sortPopular': 'Maarufu',
      'discovery.sortPriceLow': 'Bei: Chini kwenda Juu',
      'discovery.sortPriceHigh': 'Bei: Juu kwenda Chini',
      'discovery.sortNewest': 'Mpya zaidi',
      'discovery.sortRating': 'Kiwango cha juu',
      'discovery.noResults': 'Hakuna matokeo yaliyopatikana',
      'discovery.tryDifferent': 'Jaribu maneno tofauti au chuja tena',
      'discovery.loadMore': 'Pakia zaidi',
      'discovery.sellers': 'Wauzaji',
      'discovery.products': 'Bidhaa',

      // ── Product ──
      'product.addToCart': 'Ongeza kwenye Kikapu',
      'product.buyNow': 'Nunua Sasa',
      'product.price': 'Bei',
      'product.quantity': 'Idadi',
      'product.description': 'Maelezo',
      'product.reviews': 'Maoni',
      'product.relatedProducts': 'Bidhaa Zinazofanana',
      'product.soldBy': 'Inauzwa na',
      'product.inStock': 'Ipo',
      'product.outOfStock': 'Imeisha',
      'product.deliveryInfo': 'Taarifa ya Utoaji',
      'product.returnPolicy': 'Sera ya Kurudisha',
      'product.selectVariation': 'Chagua Aina',
      'product.minPrice': 'Bei ya chini',
      'product.maxPrice': 'Bei ya juu',

      // ── Cart ──
      'cart.title': 'Kikapu',
      'cart.item': 'Bidhaa',
      'cart.items': 'Bidhaa',
      'cart.empty': 'Kikapu chako kiko tupu',
      'cart.startShopping': 'Anza Ununuzi',
      'cart.subtotal': 'Jumla Ndogo',
      'cart.deliveryFee': 'Ada ya Utoaji',
      'cart.vat': 'Kodi (VAT)',
      'cart.grandTotal': 'Jumla Kuu',
      'cart.placeOrder': 'Weka Agizo',
      'cart.checkout': 'Lipia',
      'cart.remove': 'Ondoa',
      'cart.deliveryDetails': 'Maelezo ya Utoaji',
      'cart.deliveryAddress': 'Anuani ya Utoaji',
      'cart.change': 'Badilisha',
      'cart.setAddress': 'Weka anuani ya utoaji',
      'cart.preferredTime': 'Muda Unaopendelea',
      'cart.continueShopping': 'Endelea Ununuzi',

      // ── Checkout ──
      'checkout.title': 'Lipia',
      'checkout.paymentMethod': 'Njia ya Malipo',
      'checkout.mpesa': 'M-Pesa',
      'checkout.tigopesa': 'Tigo Pesa',
      'checkout.airtelmoney': 'Airtel Money',
      'checkout.card': 'Kadi',
      'checkout.wallet': 'Pochi',
      'checkout.promoCode': 'Msimbo wa Promosheni',
      'checkout.apply': 'Tumia',
      'checkout.orderSummary': 'Muhtasari wa Agizo',
      'checkout.address': 'Anuani',
      'checkout.enterAddress': 'Weka anuani yako',
      'checkout.phone': 'Namba ya Simu',
      'checkout.notes': 'Maelezo ya Ziada',
      'checkout.notesPlaceholder': 'Maelezo yoyote ya ziada...',

      // ── Auth / Login ──
      'auth.signIn': 'Ingia',
      'auth.signUp': 'Jisajili',
      'auth.email': 'Barua pepe',
      'auth.password': 'Nenosiri',
      'auth.forgotPassword': 'Umesahau nenosiri?',
      'auth.noAccount': 'Huna akaunti?',
      'auth.hasAccount': 'Una akaunti tayari?',
      'auth.signInGoogle': 'Ingia na Google',
      'auth.signInPhone': 'Ingia na Simu',
      'auth.orContinueWith': 'Au endelea na',
      'auth.orSignInWith': 'Au ingia na',
      'auth.customer': 'Mteja',
      'auth.merchant': 'Mfanyabiashara',
      'auth.driver': 'Dereva',
      'auth.admin': 'Msimamizi',
      'auth.welcomeBack': 'Karibu Tena',
      'auth.createAccount': 'Unda Akaunti',
      'auth.fullName': 'Jina kamili',
      'auth.phoneNumber': 'Namba ya simu',
      'auth.confirmPassword': 'Thibitisha nenosiri',
      'auth.agreeTerms': 'Kwa kujiandikisha, unakubali',
      'auth.termsOfService': 'Masharti ya Huduma',
      'auth.andPrivacy': 'na Sera ya Faragha',
      'auth.verifyPhone': 'Thibitisha Simu Yako',
      'auth.enterCode': 'Weka msimbo wa tarakimu 6 uliotumwa kwa',
      'auth.verify': 'Thibitisha',
      'auth.resendCode': 'Tuma Msimbo Upya',
      'auth.signOut': 'Ondoka',

      // ── Profile ──
      'profile.title': 'Profaili Yangu',
      'profile.editProfile': 'Hariri Profaili',
      'profile.myOrders': 'Maagizo Yangu',
      'profile.trackOrder': 'Fuatilia Agizo',
      'profile.myWallet': 'Pochi Yangu',
      'profile.savedItems': 'Vilivyohifadhiwa',
      'profile.referrals': 'Rufaa',
      'profile.settings': 'Mipangilio',
      'profile.help': 'Msaada',
      'profile.language': 'Lugha',
      'profile.notifications': 'Arifa',

      // ── Orders / Tracking ──
      'orders.title': 'Maagizo Yangu',
      'orders.noOrders': 'Bado huna maagizo',
      'orders.trackOrder': 'Fuatilia Agizo',
      'orders.orderPlaced': 'Agizo Limewekwa',
      'orders.confirmed': 'Imethibitishwa',
      'orders.preparing': 'Inatayarishwa',
      'orders.ready': 'Iko Tayari',
      'orders.onTheWay': 'Njiani',
      'orders.delivered': 'Imefikishwa',
      'orders.cancelled': 'Imeghairiwa',
      'orders.orderDetails': 'Maelezo ya Agizo',
      'orders.orderId': 'Namba ya Agizo',
      'orders.date': 'Tarehe',
      'orders.status': 'Hali',
      'orders.total': 'Jumla',
      'orders.items': 'Bidhaa',
      'orders.deliveryAddress': 'Anuani ya Utoaji',
      'orders.paymentMethod': 'Njia ya Malipo',
      'orders.driverInfo': 'Taarifa ya Dereva',
      'orders.contactDriver': 'Wasiliana na Dereva',
      'orders.estimatedArrival': 'Muda wa Kuwasili',

      // ── Wallet ──
      'wallet.title': 'Pochi Yangu',
      'wallet.balance': 'Salio',
      'wallet.topUp': 'Jaza Pochi',
      'wallet.transactions': 'Miamala',
      'wallet.noTransactions': 'Hakuna miamala',
      'wallet.amount': 'Kiasi',
      'wallet.enterAmount': 'Weka kiasi',

      // ── Stores ──
      'stores.title': 'Maduka',
      'stores.nearby': 'Maduka ya Karibu',
      'stores.noStores': 'Hakuna maduka yaliyopatikana',

      // ── Chat ──
      'chat.title': 'Mazungumzo',
      'chat.typeMessage': 'Andika ujumbe...',
      'chat.send': 'Tuma',
      'chat.online': 'Mtandaoni',
      'chat.offline': 'Nje ya mtandao',

      // ── Referral ──
      'referral.title': 'Alika na Upate',
      'referral.subtitle': 'Alika marafiki na upate tuzo',
      'referral.yourCode': 'Msimbo Wako',
      'referral.copy': 'Nakili',
      'referral.share': 'Shiriki',
      'referral.howItWorks': 'Jinsi Inavyofanya Kazi',

      // ── 404 ──
      '404.title': 'Ukurasa huu umepotea',
      '404.message': 'Ukurasa unaotafuta haupo au umehamishwa. Hebu turudi kwenye bidhaa mpya.',
      '404.backHome': 'Rudi SmartSoko',

      // ── Footer ──
      'footer.explore': 'Gundua SmartSoko',
      'footer.shopMarketplace': 'Tembea soko',
      'footer.myOrders': 'Maagizo yangu',
      'footer.trackDelivery': 'Fuatilia utoaji',
      'footer.myAccount': 'Akaunti yangu',
      'footer.customerService': 'Huduma kwa Wateja',
      'footer.helpSubtitle': 'Kidogo msaada, kutoka kwa mtu halisi',
      'footer.hereForYou': 'Tuko hapa kwako.',
      'footer.helpDescription': 'Maswali kuhusu agizo au akaunti yako? Wasiliana na mhudumu wa SmartSoko.',
      'footer.contactService': 'Wasiliana na huduma kwa wateja',
      'footer.madeFor': 'Imetengenezwa kwa maisha ya kienyeji Tanzania',
      'footer.rights': 'Haki zote zimehifadhiwa.',
      'footer.findOnline': 'Tupate mtandaoni',
      'footer.linksComing': 'Viungo rasmi vinakuja hivi karibuni',
      'footer.comingSoon': 'Inakuja hivi karibuni',
      'footer.privacy': 'Sera ya Faragha',
      'footer.terms': 'Masharti ya Huduma',

      // ── Cookie Consent ──
      'cookie.message': 'Tunatumia cookies kuboresha huduma zetu. Kwa kuendelea kutumia tovuti yetu, unakubali matumizi yetu ya cookies.',
      'cookie.accept': 'Kubali',
      'cookie.decline': 'Kataa',

      // ── Common / Shared ──
      'common.loading': 'Inapakia...',
      'common.error': 'Hitilafu imetokea',
      'common.retry': 'Jaribu tena',
      'common.cancel': 'Ghairi',
      'common.confirm': 'Thibitisha',
      'common.save': 'Hifadhi',
      'common.delete': 'Futa',
      'common.edit': 'Hariri',
      'common.close': 'Funga',
      'common.back': 'Rudi',
      'common.next': 'Endelea',
      'common.previous': 'Rudi nyuma',
      'common.submit': 'Tuma',
      'common.search': 'Tafuta',
      'common.filter': 'Chuja',
      'common.sort': 'Panga',
      'common.viewAll': 'Tazama zote',
      'common.seeAll': 'Tazama zote',
      'common.noResults': 'Hakuna matokeo',
      'common.tsh': 'TSh',
      'common.free': 'Bure',
      'common.yes': 'Ndio',
      'common.no': 'Hapana',
      'common.required': 'Inahitajika',
      'common.optional': 'Si lazima',
      'common.selectOption': 'Chagua chaguo',
      'common.success': 'Imefanikiwa',
      'common.failed': 'Imeshindwa',
      'common.pending': 'Inasubiri',
      'common.completed': 'Imekamilika',

      // ── Homepage extras ──
      'home.freshFindsLocal': 'Bidhaa mpya kutoka soko lako',
      'home.freshFindsBetter': 'Bidhaa mpya. Bei bora.',
      'home.savingsEveryday': 'Akiba kwa mahitaji ya kila siku',
      'home.goodThingsBasket': 'Vitu vizuri vya kuongeza kwenye kikapu chako',
      'home.exploreMarket': 'Tembea soko →',
      'home.freshEssentials': 'Mahitaji muhimu mabichi',
      'home.localSellers': 'Wauzaji wa kienyeji',
      'home.toYourDoor': 'Hadi mlangoni',
      'home.freshEveryday': 'Mahitaji mabichi, kila siku',
      'home.goodFoodStarts': 'Chakula kizuri huanza nyumbani.',
      'home.supportLocalSellers': 'Unga mkono wauzaji wako wa kienyeji',
      'home.discoverShops': 'Gundua maduka katika jamii yako.',
      'home.marketToDoor': 'Kutoka sokoni hadi mlangoni',
      'home.moreTime': 'Muda zaidi kwa mambo unayopenda.',
      'home.shopByCategory': 'Nunua kwa Kikundi',
      'home.featuredSellers': 'Wauzaji Waliochaguliwa',
      'home.recommendedForYou': 'Ilimependekeza Kwa Ajili Yako',
      'home.realTimeTracking': 'Ufuatiliaji wa wakati halisi',
      'home.customerService': 'Huduma kwa wateja',
      'home.hereToHelp': 'Tuko hapa kusaidia',
      'home.yourCart': 'Kikapu Chako',
      'home.browse': 'Tazama',
      'home.support': 'Msaada',
      'home.freshFinds': 'MAVUNO MAPYA. VIPENDEWE VYA KIENYEJI.',
      'home.littleLocal': 'Kitu kidogo cha kienyeji.<br>Kipendwe sana.',
      'home.freshGroceriesDoor': 'Magauni mabichi na chakula kizuri kutoka jirani yako, vinapelekwa mlangoni.',
      'home.nextFavourite': 'Kipendwe chako cha kienyeji cha mara ijayo.',
      'home.freshGroceriesFinds': 'Magauni mabichi, chakula kizuri na vipengele vya kila siku kutoka maduka katika jirani yako.',
      'home.shopNow': 'Nunua Sasa',
      'home.meetSellers': 'Kutana na Wauzaji',
      'home.verifiedSellers': 'Wauzaji Waliothibitishwa',
      'home.verifiedSellersNear': 'Wauzaji Waliothibitishwa Karibu Nawe',
      'home.newArrivalsBadge': 'Mpya Zilizowasili',
      'home.localRestaurants': 'Migahawa ya Kienyechi<br>Mlangoni Mwako',
      'home.discoverBestFood': 'Gundua chakula bora kutoka wauzaji wa kienyeji karibu nawe',
      'home.explore': 'Gundua',
      'home.freeDelivery': 'Utoaji wa Bure',
      'home.dailyFreshDairy': 'Bidhaa za Maziwa Mabichi<br>Kila Siku',
      'home.milkCheeseYogurt': 'Maziwa, jibini, yoleti — vinapelekwa mabichi kila siku',
      'home.freshFromMarket': 'Bidhaa mpya kutoka soko lako la kienyeji',
      'home.itemsCount': 'bidhaa',
      'home.veggies': 'Mboga',
      'home.snacks': 'Vitafunwa',
      'home.drinks': 'Vinywaji',
      'home.meat': 'Nyama',
      'home.noProductsYet': 'Bado hakuna bidhaa. Tafadhali rudi baadaye.',
      'home.newProductsComing': 'Bidhaa mpya zinakuja. Tembea soko.',
      'home.productsCouldNotLoad': 'Bidhaa hazikuweza kupakiwa. Tumia Jaribu tena hapa chini.',
      'home.productsTemporarily': 'Bidhaa hazipatikani kwa muda.',
      'home.failedLoadProducts': 'Imeshindwa kupakia bidhaa',
      'home.onlyAvailable': 'Imebaki',
      'home.reviewBasket': '. Angalia kikapu chako.',
      'home.unnamedItem': 'Bidhaa isiyo na jina',
      'home.general': 'Jumla',
      'home.from': 'Kuanzia TSh',
      'home.upTo': 'Hadi TSh',
      'home.anyPrice': 'Bei yoyote',
      'home.clearFilters': 'Futa vichujio',
      'home.productsFound': 'bidhaa zimepatikana',
      'home.sortRecommended': 'Panga: Zilizopendekezwa',
      'home.sortPriceLow': 'Bei: Chini kwenda Juu',
      'home.sortPriceHigh': 'Bei: Juu kwenda Chini',
      'home.sortNameAZ': 'Jina A-Z',
      'home.noProductsFound': 'Hakuna bidhaa zilizopatikana',
      'home.tryAdjusting': 'Jaribu kurekebisha utafutaji au vichujio vyako',
      'home.clearFiltersBtn': 'Futa Vichujio',
      'home.verifiedGoldMember': 'Mwanachama wa Dhahabu Aliyethibitishwa',
      'home.premiumFoodVendor': 'Muuzaji wa Chakula wa Premium',
      'home.masterBaker': 'Mpishi Mkuu wa Mkate',
      'home.reviews': 'maoni',
      'home.min': 'Dakika',
      'home.zeroProductsFound': 'bidhaa 0 zimepatikana',
      'home.noProductsAvailable': 'Bado hakuna bidhaa zinazopatikana',
      'home.productsUnavailable': 'Bidhaa hazipatikani',
      'home.failedLoad': 'Imeshindwa kupakia bidhaa',
      'home.retry': 'Jaribu tena',
      'home.removeFilter': 'Ondoa kichujio:',
      'home.minPricePlaceholder': 'TSh 0',
      'profile.manageAccount': 'Simamia akaunti',

      // ── Login extras ──
      'auth.rememberSession': 'Kumbuka kipindi changu',
      'auth.sendOtp': 'Tuma OTP',
      'auth.enterPhone': 'Weka namba yako ya simu ya Tanzania',
      'auth.backToEmail': 'Rudi kuingia kwa barua pepe',
      'auth.google': 'Google',
      'auth.apple': 'Apple',
      'auth.newToSmartSoko': 'Mpya kwenye SmartSoko?',
      'auth.signingIn': 'Inaingia...',
      'auth.accessAccount': 'Fikia akaunti yako ya SmartSoko',
      'auth.empowering': 'Kuwezesha Biashara ya Kienyeji',
      'auth.connecting': 'Kuunganisha masoko ya kienyeji na teknolojia kwa biashara bora.',
      'auth.trustedBy': 'Wateja 10k+ wanaamini',

      // ── Checkout extras ──
      'checkout.addItems': 'Ongeza bidhaa kuanza',
      'checkout.chooseLocation': 'Chagua eneo lako la utoaji',
      'checkout.needLocation': 'Tunahitaji eneo lako kwa utoaji',
      'checkout.detecting': 'Inagundua eneo lako...',
      'checkout.payOnline': 'Lipia Mtandaoni (PesaPal)',
      'checkout.cardMpesa': 'Kadi, M-Pesa, Tigo Pesa, Airtel na zaidi',
      'checkout.stablecoinBalance': 'Lipia na salio la TZS stablecoin',
      'checkout.mobileMoney': 'Namba ya pesa ya simu',
      'checkout.editBasket': 'Hariri kikapu →',
      'checkout.promoLabel': 'Promo',
      'checkout.useCurrentLocation': 'Tumia Eneo la Sasa',
      'checkout.name': 'Jina',
      'checkout.tapToEditAddress': 'Gonga "Hariri" ili kuongeza eneo lako',
      'checkout.addressSaved': 'Anuani imehifadhiwa',
      'checkout.savedAddressUsed': 'Anuani yako iliyohifadhiwa itatumika kwa utoaji.',
      'checkout.useMyLocation': 'Tumia eneo langu',
      'checkout.enterPromo': 'Weka msimbo wa promosheni',
      'checkout.checkingPromo': 'Inakagua...',
      'checkout.promoFailed': 'Promosheni haiweza kutumika',
      'checkout.promoApplied': 'imetumika',
      'checkout.locationDetected': 'Eneo limepatikana',
      'checkout.deliveryTo': 'Kwenda',
      'checkout.geoUnsupported': 'Kupata eneo hakuna kivinjari hiki',
      'checkout.geoUnsupportedHint': 'Kivinjari chako hakiruhusu kupata eneo. Tafadhali weka anuani mwenyewe.',
      'checkout.allowLocation': 'Tafadhali ruhusu upatikanaji wa eneo utakapoulizwa',
      'checkout.locationFound': 'Eneo limepatikana!',
      'checkout.coordsNoAddress': 'Msimatro umepatikana, lakini hakuna anuani',
      'checkout.enterManually': 'Weka anuani yako mwenyewe au gonga Hariri',
      'checkout.locationUnavailable': 'Eneo halipatikani',

      // ── Signup extras ──
      'signup.accountCreated': 'Akaunti Imeundwa!',
      'signup.joinMarketplace': 'Jiunge na soko la SmartSoko',
      'signup.iWantTo': 'Ninataka',
      'signup.buyProducts': 'Kunua Bidhaa',
      'signup.sellProducts': 'Kuuza Bidhaa',
      'signup.passwordRule': 'Angalwe herufi 8, herufi kubwa 1, tarakimu 1, alama 1',

      // ── Order tracking ──
      'track.deliveryProgress': 'Maendeleo ya Utoaji',
      'track.deliveryLocation': 'Eneo la Utoaji',
      'track.orderConfirmation': 'Uthibitisho wa Agizo',
      'track.orderDeliveredQ': 'Agizo Limewasili?',
      'track.liveLocation': 'Eneo la Sasa',
      'track.confirmedToast': 'Utoaji Umethibitishwa!',
      'track.confirmHint': 'Thibitisha umepokea agizo lako',
      'track.thankYou': 'Asante kwa agizo lako. Karibu chakula!',
      'track.driverName': 'Jina la Dereva',
      'track.estimatedDelivery': 'Muda Unategemewa',
      'track.readyForPickup': 'Tayari Kuchukuliwa',
      'track.orderNumber': 'Agizo #',
      'track.noItems': 'Hakuna bidhaa',
      'track.waiting': 'Inasubiri...',

      // ── Product extras ──
      'product.moreFromSeller': 'Zaidi Kutoka kwa Muuzaji Huu',
      'product.orderProtection': 'Ulinzi wa Agizo',
      'product.payment': 'Malipo',
      'product.delivery': 'Utoaji',
      'product.returns': 'Kurudisha',
      'product.category': 'Kikundi',
      'product.chooseOption': 'Chagua Chaguo',
      'product.askAnything': 'Niulize chochote kuhusu bidhaa hii.',
      'product.smartAssistant': 'Msaidizi wa Kielektroniki',
      'product.shareExperience': 'Shiriki uzoefu wako na bidhaa hii.',
      'product.noReviewsYet': 'Bado hakuna maoni.',
      'product.beFirstReview': 'Bado hakuna maoni. Kuwa wa kwanza kuandika maoni.',
      'product.couldNotLoadReviews': 'Maoni hayakuweza kupakiwa. Jaribu tena.',
      'product.noComment': 'Hakuna maoni yaliyotolewa.',
      'product.freeDeliveryOver': 'Utoaji wa bure kwa maagizo zaidi ya TSh 50,000',
      'product.returnsEasy': 'Kurudisha kwa siku 7 kwa matatizo ya ubora',
      'product.moneyBack': 'Dhamana ya kurudishiwa pesa kutoka kwa wauzaji waliothibitishwa',
      'product.noQuestions': 'Bila maswali, marejesho kamili',
      'product.buyerProtected': 'Imelindwa na ulinzi wa mnunuzi wa SmartSoko',
      'product.feesAtCheckout': 'Ada za utoaji zinathibitishwa wakati wa kulipia baada ya kuchagua anuani.',
      'product.quickLinks': 'Viungo vya Haraka',
      'product.support': 'Msaada',
      'product.connect': 'Tuunganee',

      // ── Profile extras ──
      'profile.notSignedIn': 'Hujaingia.',
      'profile.memberSince': 'Mwanachama tangu',
      'profile.role': 'Cheo',

      // ── Wallet extras ──
      'wallet.subtitle': 'Salio, malipo na mijukuu',
      'wallet.recentTransactions': 'Miamala ya Hivi Karibuni',
      'wallet.retryCheckout': 'Jaribu Malipo Tena',
      'wallet.depositFailed': 'Uwekaji wa nTZS umeshindwa',
      'wallet.depositProgress': 'Uwekaji wa nTZS unaendelea',
      'wallet.pendingHint': 'Bado inasubiri baada ya dakika chache — pakia ukurasa upya kuangalia tena.',

      // ── Stores extras ──
      'stores.discover': 'Gundua Maduka ya Kienyeji',
      'stores.allStores': 'Maduka Yote',

      // ── Chat extras ──
      'chat.callWhenArrive': 'Nipige simu nitakapofika',
      'chat.atLocation': 'Nimefika eneo',
      'chat.leaveAtDoor': 'Niache mlangoni',
      'chat.runningLate': 'Naichelewia',

      // ── Referral extras ──
      'referral.invitesSent': 'Mialika Iliyotumwa',
      'referral.earned': 'Mapato',
      'referral.shareDesc': 'Shiriki msimbo wako au kiungo cha mialika na marafiki',
      'referral.signInPrompt': 'Ingia ili kuanza kupata tuzo za mialika.',
      'referral.stepSignup': 'Wanasajili kwa msimbo wako kisha wanafanya agizo lao la kwanza',

      // ── Customer orders ──
      'customerOrders.eyebrow': 'Soko lako',
      'customerOrders.subtitle': 'Fuatilia utoaji wako na rudisha ununuzi wa hivi karibuni.',
      'customerOrders.onePlace': 'Maagizo yako, mahali pamoja.',
      'customerOrders.signInPrompt': 'Ingia ili kuona ununuzi wako na taarifa za utoaji.',

      // ── Saved items ──
      'savedItems.title': 'Vilivyohifadhiwa',
      'savedItems.description': 'Bidhaa zilizohifadhiwa kwenye kifaa hiki.',
      'savedItems.loading': 'Inapakia vilivyohifadhiwa...',

      // ── Residual page strings ──
      'track.confirmDelivery': 'Thibitisha Utoaji',
      'track.confirming': 'Inathibitisha...',
      'track.liveTracking': 'Ufuatiliaji wa Moja kwa Moja',
      'track.buyAgain': 'Nunua Tena',
      'track.orderMore': 'Agiza Zaidi',
      'track.call': 'Piga Simu',
      'track.contact': 'Wasiliana',
      'track.notFound': 'Agizo halipatikani',
      'track.noAddress': 'Anuani haipatikani',
      'track.noGps': 'Hakuna msimatro wa GPS inayopatikana',
      'track.deliveryUpdates': 'Taarifa za utoaji',
      'track.statusUpdated': 'Hali ya agizo imesasishwa:',
      'track.confirmError': 'Imeshindwa kuthibitisha utoaji. Tafadhali jaribu tena.',
      'track.pending': 'Inasubiri',
      'orders.cashOnDelivery': 'Lipa Unapopokea',
      'orders.ntzsWallet': 'Pochi la nTZS',
      'orders.orderReceived': 'Agizo limepokelewa',
      'product.notFound': 'Hatuwezi kupata bidhaa hii',
      'product.notFoundHint': 'Inawezakana imeondolewa au haipatikani tena.',
      'product.goHome': 'Nenda kwenye ukurasa wa mwanzo',
      'product.noDescription': 'Hakuna maelezo yaliyotolewa.',
      'product.unavailable': 'Bidhaa hii haipatikani kwa sasa',
      'product.writeReview': 'Andika Maoni',
      'product.submitReview': 'Tuma Maoni',
      'product.reviewSubmitted': 'Maoni yako yatumikwa. Asante.',
      'product.reviewLoad': 'Inapakia maoni...',
      'product.yourName': 'Jina lako',
      'product.yourReview': 'Maoni yako',
      'product.reviewPlaceholder': 'Ulipenda au umekosoa nini?',
      'product.starRating': 'Kadirio la nyota',
      'product.wishlist': 'Ongeza kwenye orodha ya hamu',
      'product.share': 'Shiriki bidhaa',
      'product.perUnit': 'kwa kila',
      'product.readMore': 'Soma zaidi',
      'product.readLess': 'Soma chache',
      'product.verifiedSeller': 'Muuzaji Aliyethibitishwa',
      'product.securePay': 'Malipo Salama',
      'product.shippingReturns': 'Utoaji na Kurudisha',
      'product.reviewCount': 'kadirio la wateja',
      'chat.today': 'Leo',
      'chat.justNow': 'Sasa hivi',
      'chat.withRider': 'Zungumza na Dereva',
      'chat.withCustomer': 'Zungumza na Mteja',
      'chat.noOrder': 'Hakuna agizo lililochaguliwa',
      'chat.yourRider': 'Dereva Wako',
      'chat.noPhone': 'Namba ya simu haipatikani',
      'wallet.withdraw': 'Toa Pesa',
      'wallet.unavailable': 'Pochi halipatikani. Angalia muunganisho wako na uingie tena.',
      'referral.inviteFriend': 'Alika rafiki — ninyi wote mnapata TSh 5,000 baada ya agizo lake la kwanza.',
      'referral.linkCopied': 'Kiungo kimenakiliwa — kitume kwa rafiki!',
      'referral.bothGet': 'Mnapata TSh 5,000 kwenye pochi zenu',
      'customerOrders.exploreShops': 'Tembea maduka ya karibu na upate kitu kipya.',
      'customerOrders.firstOrder': 'Agizo lako la kwanza linaanza hapa.',
      'customerOrders.loadError': 'Tumeshindwa kupakia maagizo yako.',
      'customerOrders.tryAgainHint': 'Tafadhali jaribu tena. Tatizo likiendelea, ingia upya.',
      'stores.subtitle': 'Pata migahawa na maduka unayopenda karibu nawe',
      'stores.loading': 'Inapakia maduka...',
      'stores.closed': 'Imefungwa',
      'stores.open': 'Wazi',
      'stores.featured': 'Iliochaguliwa',
      'common.backToHome': 'Rudi kwenye ukurasa wa mwanzo',

      // ── Seller console (orders.html, seller.html, restaurant.html) ──
      'orders.welcomeBack': 'Karibu tena,',
      'orders.monitorSub': 'Fuatilia na usindikaje maagizo ya soko',
      'orders.managementTitle': 'Usimamizi wa Maagizo',
      'orders.allStatus': 'Hali Zote',
      'orders.readyForDelivery': 'Tayari kwa Uwasilishaji',
      'orders.dispatched': 'Imetumwa',
      'orders.allTime': 'Muda Wote',
      'orders.thisWeek': 'Wiki Hii',
      'orders.thisMonth': 'Mwezi Huu',
      'common.seller': 'Muuzaji',
      'common.actions': 'Vitendo',
      'orders.orderStatus': 'Hali ya Agizo',
      'orders.orderItems': 'Bidhaa za Agizo',
      'orders.timeline': 'Ratiba',
      'common.print': 'Chapisha',
      'common.qty': 'Idadi:',
      'orders.noTimeline': 'Hakuna ratiba',
      'common.viewDetails': 'Tazama Maelezo',
      'orders.loadError': 'Hitilafu kupakia maagizo',
      'orders.emptyHint': 'Maagizo kutoka kwa wateja yataonekana hapa.',
      'orders.searchPlaceholder': 'Tafuta kwa namba ya agizo, mteja...',
      'orders.searchAria': 'Tafuta maagizo',
      'orders.statusUpdateFailed': 'Imeshindwa kusasisha hali',
      'orders.nothingToExport': 'Hakuna maagizo ya kuhamisha',
      'common.phone': 'Simu',
      'common.guest': 'Mgeni',
      'common.update': 'Sasisha',
      'common.saveChanges': 'Hifadhi Mabadiliko',
      'seller.editMenuItem': 'Hariri Kipengele kwenye Menyu',
      'common.export': 'Hamisha',
      'seller.activeOrders': 'Maagizo Hai',
      'seller.revenueToday': 'Mapato ya Leo',
      'seller.avgPrepTime': 'Wastani wa Muda wa Maandalizi',
      'seller.lowStock': 'Bidhaa Zenye Akiba Ndogo',
      'seller.inventory': 'Akiba',
      'seller.analytics': 'Uchambuzi',
      'seller.orderTime': 'Muda wa Agizo',
      'seller.addProduct': '+ Ongeza Bidhaa',
      'seller.inventoryMgmt': 'Usimamizi wa Akiba',
      'seller.updateStock': 'Sasisha Viwango vya Akiba',
      'seller.restaurantAnalytics': 'Uchambuzi wa Migahawa',
      'seller.peakHours': 'Saa za Kilele',
      'seller.popularItems': 'Bidhaa Maarufu Zaidi',
      'seller.addMenuItem': 'Ongeza Kipengele kwenye Menyu',
      'seller.itemName': 'Jina la Kipengele',
      'seller.initialStock': 'Akiba ya Awali',
      'seller.addItem': 'Ongeza Kipengele',
      'seller.selectSeller': 'Chagua Muuzaji',
      'seller.startPrep': 'Anza Maandalizi',
      'seller.complete': 'Kamilisha',
      'seller.hide': 'Ficha',
      'seller.show': 'Onyesha',
      'seller.currentStock': 'Akiba ya sasa:',
      'seller.lowStockBadge': 'AKIBA NDOGO',
      'seller.itemNotFound': 'Kipengele hakikupatikana',
      'seller.fillRequired': 'Tafadhali jaza sehemu zinazohitajika',
      'seller.itemUpdated': 'Kipengele kimesasishwa',
      'seller.itemAdded': 'Kipengele kimeongezwa',
      'seller.newOrder': 'Agizo jipya limepokelewa!',
      'seller.uncategorized': 'Bila Kikundi',
      'restaurant.joinTitle': 'Jiunge na SmartSoko kama Muuzaji',
      'restaurant.businessName': 'Jina la Biashara',
      'restaurant.selectCategory': 'Chagua Kikundi cha Biashara',
      'restaurant.businessLogo': 'Logo/Picha ya Biashara',
      'restaurant.businessDesc': 'Maelezo ya Biashara',
      'restaurant.businessAddress': 'Anwani ya Biashara',
      'restaurant.deliveryTime': 'Muda wa Uwasilishaji (dakika)',
      'restaurant.register': 'Jisajili kama Muuzaji',
      'restaurant.alreadySeller': 'Tayari wewe ni Muuzaji?',
      'restaurant.successTitle': 'Usajili Umeefanikiwa!',
      'restaurant.goDashboard': 'Nenda kwenye Dashibodi',
      'restaurant.registering': 'Inasajili...',
      'restaurant.failed': 'Usajili umeshindwa. Tafadhali jaribu tena.',

      // ── Customer page residue ──
      'product.browseProducts': 'Tazama bidhaa',
      'product.submitting': 'Inatumwa...',
      'customerOrders.exploreMarket': 'Chunguza soko',
      'stores.topRated': 'Zenye Kadirio Bora',
      'stores.fastDelivery': 'Uwasilishaji wa Haraka',
      'stores.loadError': 'Haikuwezekana kupakia maduka',
      'nav.shop': 'Nunua',
      'home.findProductsHint': 'Tafuta bidhaa, panga kikapu au angalia agizo.',

      // ── Language Switcher ──
      'lang.sw': 'Kiswahili',
      'lang.en': 'English',
      'lang.switch': 'Badilisha lugha',
    },

    en: {
      // ── Navigation ──
      'nav.home': 'Home',
      'nav.discover': 'Discover',
      'nav.cart': 'Cart',
      'nav.sell': 'Sell',
      'nav.profile': 'Profile',
      'nav.orders': 'Orders',
      'nav.earnings': 'Earnings',
      'nav.dashboard': 'Dashboard',
      'nav.users': 'Users',
      'nav.products': 'Products',
      'nav.search': 'Search',
      'nav.signOut': 'Sign Out',
      'nav.mainMenu': 'Main Menu',
      'nav.quickLinks': 'Quick Links',
      'nav.categories': 'Categories',
      'nav.adminPanel': 'Admin Panel',
      'nav.sellOnSmartSoko': 'Sell on SmartSoko',

      // ── Categories ──
      'cat.food': 'Food',
      'cat.dairy': 'Dairy',
      'cat.fruits': 'Fruits',
      'cat.groceries': 'Groceries',
      'cat.bakery': 'Bakery',
      'cat.all': 'All',
      'cat.vegetables': 'Vegetables',
      'cat.freshProduce': 'Fresh Produce',
      'cat.foodRestaurants': 'Food & Restaurants',

      // ── Header / Search ──
      'header.deliverTo': 'Deliver to',
      'header.searchProducts': 'Search products, brands and more...',
      'header.searchRestaurants': 'Search restaurants or dishes...',
      'header.searchProductsSellers': 'Search products, sellers...',
      'header.skipToShopping': 'Skip to shopping',

      // ── Homepage ──
      'home.heroTitle': 'Your Market, Welcome Home',
      'home.heroSubtitle': 'Local marketplace that supports your community',
      'home.orderNow': 'Order Now',
      'home.joinUs': 'Join Us',
      'home.limitedOffer': 'Limited Time Offer',
      'home.quickCategories': 'Quick Categories',
      'home.seeAll': 'See all',
      'home.flashDeals': 'Flash Deals',
      'home.endsIn': 'Ends in',
      'home.popularProducts': 'Popular Products',
      'home.popularSellers': 'Popular Sellers',
      'home.quickLinks': 'Quick Links',
      'home.newArrivals': 'New Arrivals',
      'home.featuredProducts': 'Featured Products',
      'home.yourNeighbourhood': 'Your neighbourhood, delivered.',
      'home.allDepartments': 'All departments',
      'home.organicCurator': 'Organic Curator',
      'home.slogan': 'Fresh — Now — Safe',
      'home.freshFood': 'Fresh Food',
      'home.groceriesMore': 'Groceries & More',
      'home.fromLocalSellers': 'From local sellers',
      'home.fastDelivery': 'Fast delivery',
      'home.greatPrices': 'Great prices',
      'home.supportLocal': 'Support local',

      // ── Discovery / Browse ──
      'discovery.title': 'Discover',
      'discovery.subtitle': 'Find the best products from local sellers',
      'discovery.filter': 'Filter',
      'discovery.sort': 'Sort',
      'discovery.sortPopular': 'Popular',
      'discovery.sortPriceLow': 'Price: Low to High',
      'discovery.sortPriceHigh': 'Price: High to Low',
      'discovery.sortNewest': 'Newest',
      'discovery.sortRating': 'Top Rated',
      'discovery.noResults': 'No results found',
      'discovery.tryDifferent': 'Try different keywords or adjust filters',
      'discovery.loadMore': 'Load More',
      'discovery.sellers': 'Sellers',
      'discovery.products': 'Products',

      // ── Product ──
      'product.addToCart': 'Add to Cart',
      'product.buyNow': 'Buy Now',
      'product.price': 'Price',
      'product.quantity': 'Quantity',
      'product.description': 'Description',
      'product.reviews': 'Reviews',
      'product.relatedProducts': 'Related Products',
      'product.soldBy': 'Sold by',
      'product.inStock': 'In Stock',
      'product.outOfStock': 'Out of Stock',
      'product.deliveryInfo': 'Delivery Info',
      'product.returnPolicy': 'Return Policy',
      'product.selectVariation': 'Select Variation',
      'product.minPrice': 'Min price',
      'product.maxPrice': 'Max price',

      // ── Cart ──
      'cart.title': 'Cart',
      'cart.item': 'Item',
      'cart.items': 'Items',
      'cart.empty': 'Your cart is empty',
      'cart.startShopping': 'Start Shopping',
      'cart.subtotal': 'Subtotal',
      'cart.deliveryFee': 'Delivery Fee',
      'cart.vat': 'VAT',
      'cart.grandTotal': 'Grand Total',
      'cart.placeOrder': 'Place Order',
      'cart.checkout': 'Checkout',
      'cart.remove': 'Remove',
      'cart.deliveryDetails': 'Delivery Details',
      'cart.deliveryAddress': 'Delivery Address',
      'cart.change': 'Change',
      'cart.setAddress': 'Set delivery address',
      'cart.preferredTime': 'Preferred Time Slot',
      'cart.continueShopping': 'Continue Shopping',

      // ── Checkout ──
      'checkout.title': 'Checkout',
      'checkout.paymentMethod': 'Payment Method',
      'checkout.mpesa': 'M-Pesa',
      'checkout.tigopesa': 'Tigo Pesa',
      'checkout.airtelmoney': 'Airtel Money',
      'checkout.card': 'Card',
      'checkout.wallet': 'Wallet',
      'checkout.promoCode': 'Promo Code',
      'checkout.apply': 'Apply',
      'checkout.orderSummary': 'Order Summary',
      'checkout.address': 'Address',
      'checkout.enterAddress': 'Enter your address',
      'checkout.phone': 'Phone Number',
      'checkout.notes': 'Additional Notes',
      'checkout.notesPlaceholder': 'Any additional notes...',

      // ── Auth / Login ──
      'auth.signIn': 'Sign In',
      'auth.signUp': 'Sign Up',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.forgotPassword': 'Forgot password?',
      'auth.noAccount': "Don't have an account?",
      'auth.hasAccount': 'Already have an account?',
      'auth.signInGoogle': 'Sign in with Google',
      'auth.signInPhone': 'Sign in with Phone',
      'auth.orContinueWith': 'Or continue with',
      'auth.orSignInWith': 'Or sign in with',
      'auth.customer': 'Customer',
      'auth.merchant': 'Merchant',
      'auth.driver': 'Driver',
      'auth.admin': 'Admin',
      'auth.welcomeBack': 'Welcome Back',
      'auth.createAccount': 'Create Account',
      'auth.fullName': 'Full name',
      'auth.phoneNumber': 'Phone number',
      'auth.confirmPassword': 'Confirm password',
      'auth.agreeTerms': 'By signing up, you agree to our',
      'auth.termsOfService': 'Terms of Service',
      'auth.andPrivacy': 'and Privacy Policy',
      'auth.verifyPhone': 'Verify Your Phone',
      'auth.enterCode': 'Enter the 6-digit code sent to',
      'auth.verify': 'Verify',
      'auth.resendCode': 'Resend Code',
      'auth.signOut': 'Sign Out',

      // ── Profile ──
      'profile.title': 'My Profile',
      'profile.editProfile': 'Edit Profile',
      'profile.myOrders': 'My Orders',
      'profile.trackOrder': 'Track Order',
      'profile.myWallet': 'My Wallet',
      'profile.savedItems': 'Saved Items',
      'profile.referrals': 'Referrals',
      'profile.settings': 'Settings',
      'profile.help': 'Help',
      'profile.language': 'Language',
      'profile.notifications': 'Notifications',

      // ── Orders / Tracking ──
      'orders.title': 'My Orders',
      'orders.noOrders': 'You have no orders yet',
      'orders.trackOrder': 'Track Order',
      'orders.orderPlaced': 'Order Placed',
      'orders.confirmed': 'Confirmed',
      'orders.preparing': 'Preparing',
      'orders.ready': 'Ready',
      'orders.onTheWay': 'On the Way',
      'orders.delivered': 'Delivered',
      'orders.cancelled': 'Cancelled',
      'orders.orderDetails': 'Order Details',
      'orders.orderId': 'Order ID',
      'orders.date': 'Date',
      'orders.status': 'Status',
      'orders.total': 'Total',
      'orders.items': 'Items',
      'orders.deliveryAddress': 'Delivery Address',
      'orders.paymentMethod': 'Payment Method',
      'orders.driverInfo': 'Driver Info',
      'orders.contactDriver': 'Contact Driver',
      'orders.estimatedArrival': 'Estimated Arrival',

      // ── Wallet ──
      'wallet.title': 'My Wallet',
      'wallet.balance': 'Balance',
      'wallet.topUp': 'Top Up',
      'wallet.transactions': 'Transactions',
      'wallet.noTransactions': 'No transactions',
      'wallet.amount': 'Amount',
      'wallet.enterAmount': 'Enter amount',

      // ── Stores ──
      'stores.title': 'Stores',
      'stores.nearby': 'Nearby Stores',
      'stores.noStores': 'No stores found',

      // ── Chat ──
      'chat.title': 'Chat',
      'chat.typeMessage': 'Type a message...',
      'chat.send': 'Send',
      'chat.online': 'Online',
      'chat.offline': 'Offline',

      // ── Referral ──
      'referral.title': 'Refer & Earn',
      'referral.subtitle': 'Invite friends and earn rewards',
      'referral.yourCode': 'Your Code',
      'referral.copy': 'Copy',
      'referral.share': 'Share',
      'referral.howItWorks': 'How It Works',

      // ── 404 ──
      '404.title': 'This page took a wrong turn',
      '404.message': "The page you're looking for doesn't exist or may have moved. Let's get you back to the fresh stuff.",
      '404.backHome': 'Back to SmartSoko',

      // ── Footer ──
      'footer.explore': 'Explore SmartSoko',
      'footer.shopMarketplace': 'Shop the marketplace',
      'footer.myOrders': 'My orders',
      'footer.trackDelivery': 'Track a delivery',
      'footer.myAccount': 'My account',
      'footer.customerService': 'Customer Service',
      'footer.helpSubtitle': 'A little help, from a real person',
      'footer.hereForYou': "We're here for you.",
      'footer.helpDescription': 'Questions about an order or your account? Contact a SmartSoko customer service associate.',
      'footer.contactService': 'Contact customer service',
      'footer.madeFor': 'Made for local life in Tanzania',
      'footer.rights': 'All rights reserved.',
      'footer.findOnline': 'Find us online',
      'footer.linksComing': 'Official links coming soon',
      'footer.comingSoon': 'Coming soon',
      'footer.privacy': 'Privacy Policy',
      'footer.terms': 'Terms of Service',

      // ── Cookie Consent ──
      'cookie.message': 'We use cookies to improve your experience. By continuing to use our site, you agree to our use of cookies.',
      'cookie.accept': 'Accept',
      'cookie.decline': 'Decline',

      // ── Common / Shared ──
      'common.loading': 'Loading...',
      'common.error': 'An error occurred',
      'common.retry': 'Retry',
      'common.cancel': 'Cancel',
      'common.confirm': 'Confirm',
      'common.save': 'Save',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.close': 'Close',
      'common.back': 'Back',
      'common.next': 'Next',
      'common.previous': 'Previous',
      'common.submit': 'Submit',
      'common.search': 'Search',
      'common.filter': 'Filter',
      'common.sort': 'Sort',
      'common.viewAll': 'View all',
      'common.seeAll': 'See all',
      'common.noResults': 'No results',
      'common.tsh': 'TSh',
      'common.free': 'Free',
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.required': 'Required',
      'common.optional': 'Optional',
      'common.selectOption': 'Select an option',
      'common.success': 'Success',
      'common.failed': 'Failed',
      'common.pending': 'Pending',
      'common.completed': 'Completed',

      // ── Homepage extras ──
      'home.freshFindsLocal': 'Fresh finds from your local market',
      'home.freshFindsBetter': 'Fresh finds. Better prices.',
      'home.savingsEveryday': 'Savings on everyday favourites',
      'home.goodThingsBasket': 'A few good things to add to your basket',
      'home.exploreMarket': 'Explore the market →',
      'home.freshEssentials': 'Fresh essentials',
      'home.localSellers': 'Local sellers',
      'home.toYourDoor': 'To your door',
      'home.freshEveryday': 'Fresh, everyday essentials',
      'home.goodFoodStarts': 'Good food starts close to home.',
      'home.supportLocalSellers': 'Support your local sellers',
      'home.discoverShops': 'Discover shops in your community.',
      'home.marketToDoor': 'From market to doorstep',
      'home.moreTime': 'More time for the things you love.',
      'home.shopByCategory': 'Shop by Category',
      'home.featuredSellers': 'Featured Sellers',
      'home.recommendedForYou': 'Recommended for You',
      'home.realTimeTracking': 'Real-time tracking',
      'home.customerService': 'Customer service',
      'home.hereToHelp': "We're here to help",
      'home.yourCart': 'Your Cart',
      'home.browse': 'Browse',
      'home.support': 'Support',
      'home.freshFinds': 'FRESH FINDS. LOCAL FAVOURITES.',
      'home.littleLocal': 'A little local.<br>A lot to love.',
      'home.freshGroceriesDoor': 'Fresh groceries and good food from your neighbourhood, brought to your door.',
      'home.nextFavourite': 'Your next local favourite.',
      'home.freshGroceriesFinds': 'Fresh groceries, good food and everyday finds from shops in your neighbourhood.',
      'home.shopNow': 'Shop Now',
      'home.meetSellers': 'Meet Sellers',
      'home.verifiedSellers': 'Verified Sellers',
      'home.verifiedSellersNear': 'Verified Sellers Near You',
      'home.newArrivalsBadge': 'New Arrivals',
      'home.localRestaurants': 'Local Restaurants<br>At Your Door',
      'home.discoverBestFood': 'Discover the best food from local sellers near you',
      'home.explore': 'Explore',
      'home.freeDelivery': 'Free Delivery',
      'home.dailyFreshDairy': 'Daily Fresh Dairy<br>Products',
      'home.milkCheeseYogurt': 'Milk, cheese, yogurt — delivered fresh daily',
      'home.freshFromMarket': 'Fresh finds from your local market',
      'home.itemsCount': 'items',
      'home.veggies': 'Veggies',
      'home.snacks': 'Snacks',
      'home.drinks': 'Drinks',
      'home.meat': 'Meat',
      'home.noProductsYet': 'No products available yet. Please check back soon.',
      'home.newProductsComing': 'New products are on their way. Explore the marketplace.',
      'home.productsCouldNotLoad': 'Products could not load. Use Retry below to try again.',
      'home.productsTemporarily': 'Products are temporarily unavailable.',
      'home.failedLoadProducts': 'Failed to load products',
      'home.onlyAvailable': 'Only',
      'home.reviewBasket': 'available. Review your basket quantity.',
      'home.unnamedItem': 'Unnamed Item',
      'home.general': 'General',
      'home.from': 'From TSh',
      'home.upTo': 'Up to TSh',
      'home.anyPrice': 'Any price',
      'home.clearFilters': 'Clear filters',
      'home.productsFound': 'products found',
      'home.sortRecommended': 'Sort: Recommended',
      'home.sortPriceLow': 'Price: Low to High',
      'home.sortPriceHigh': 'Price: High to Low',
      'home.sortNameAZ': 'Name A-Z',
      'home.noProductsFound': 'No products found',
      'home.tryAdjusting': 'Try adjusting your search or filters',
      'home.clearFiltersBtn': 'Clear Filters',
      'home.verifiedGoldMember': 'Verified Gold Member',
      'home.premiumFoodVendor': 'Premium Food Vendor',
      'home.masterBaker': 'Master Baker',
      'home.reviews': 'reviews',
      'home.min': 'min',
      'home.zeroProductsFound': '0 products found',
      'home.noProductsAvailable': 'No products available yet',
      'home.productsUnavailable': 'Products unavailable',
      'home.failedLoad': 'Failed to load products',
      'home.retry': 'Retry',
      'home.removeFilter': 'Remove filter:',
      'home.minPricePlaceholder': 'TSh 0',
      'profile.manageAccount': 'Manage account',

      // ── Login extras ──
      'auth.rememberSession': 'Remember my session',
      'auth.sendOtp': 'Send OTP',
      'auth.enterPhone': 'Enter your Tanzanian phone number',
      'auth.backToEmail': 'Back to email sign in',
      'auth.google': 'Google',
      'auth.apple': 'Apple',
      'auth.newToSmartSoko': 'New to SmartSoko?',
      'auth.signingIn': 'Signing in...',
      'auth.accessAccount': 'Access your SmartSoko marketplace account',
      'auth.empowering': 'Empowering Local Commerce',
      'auth.connecting': 'Connecting local markets with technology for seamless trade.',
      'auth.trustedBy': 'Trusted by 10k+ Vendors',

      // ── Checkout extras ──
      'checkout.addItems': 'Add items to get started',
      'checkout.chooseLocation': 'Choose your delivery location',
      'checkout.needLocation': 'We need your location for delivery',
      'checkout.detecting': 'Detecting your location...',
      'checkout.payOnline': 'Pay Online (PesaPal)',
      'checkout.cardMpesa': 'Card, M-Pesa, Tigo Pesa, Airtel & more',
      'checkout.stablecoinBalance': 'Pay with TZS stablecoin balance',
      'checkout.mobileMoney': 'Mobile money number',
      'checkout.editBasket': 'Edit basket →',
      'checkout.promoLabel': 'Promo',
      'checkout.useCurrentLocation': 'Use Current Location',
      'checkout.name': 'Name',
      'checkout.tapToEditAddress': 'Tap "Edit" to add your location',
      'checkout.addressSaved': 'Delivery address saved',
      'checkout.savedAddressUsed': 'Your saved address will be used for delivery.',
      'checkout.useMyLocation': 'Use my location',
      'checkout.enterPromo': 'Enter a promo code',
      'checkout.checkingPromo': 'Checking...',
      'checkout.promoFailed': 'Promo could not be applied',
      'checkout.promoApplied': 'Promo applied',
      'checkout.locationDetected': 'Location detected',
      'checkout.deliveryTo': 'Delivery to:',
      'checkout.geoUnsupported': 'Geolocation not supported',
      'checkout.geoUnsupportedHint': 'Your browser does not support location detection. Please enter address manually.',
      'checkout.allowLocation': 'Please allow location access when prompted',
      'checkout.locationFound': 'Location found!',
      'checkout.coordsNoAddress': 'Coordinates found, but no address',
      'checkout.enterManually': 'Please enter your address manually or tap Edit',
      'checkout.locationUnavailable': 'Location unavailable',

      // ── Signup extras ──
      'signup.accountCreated': 'Account Created!',
      'signup.joinMarketplace': 'Join SmartSoko marketplace',
      'signup.iWantTo': 'I want to',
      'signup.buyProducts': 'Buy Products',
      'signup.sellProducts': 'Sell Products',
      'signup.passwordRule': 'Min 8 chars, 1 uppercase, 1 number, 1 special char',

      // ── Order tracking ──
      'track.deliveryProgress': 'Delivery Progress',
      'track.deliveryLocation': 'Delivery Location',
      'track.orderConfirmation': 'Order Confirmation',
      'track.orderDeliveredQ': 'Order Delivered?',
      'track.liveLocation': 'Live Location',
      'track.confirmedToast': 'Delivery Confirmed!',
      'track.confirmHint': 'Confirm that you have received your order',
      'track.thankYou': 'Thank you for your order. Enjoy your meal!',
      'track.driverName': 'Driver Name',
      'track.estimatedDelivery': 'Estimated Delivery',
      'track.readyForPickup': 'Ready for Pickup',
      'track.orderNumber': 'Order #',
      'track.noItems': 'No items',
      'track.waiting': 'Waiting...',

      // ── Product extras ──
      'product.moreFromSeller': 'More from this Seller',
      'product.orderProtection': 'Order Protection',
      'product.payment': 'Payment',
      'product.delivery': 'Delivery',
      'product.returns': 'Returns',
      'product.category': 'Category',
      'product.chooseOption': 'Choose Option',
      'product.askAnything': 'Ask me anything about this product.',
      'product.smartAssistant': 'Smart Assistant',
      'product.shareExperience': 'Share your experience with this product.',
      'product.noReviewsYet': 'No reviews yet.',
      'product.beFirstReview': 'No reviews yet. Be the first to review this product.',
      'product.couldNotLoadReviews': 'Could not load reviews. Please try again.',
      'product.noComment': 'No comment provided.',
      'product.freeDeliveryOver': 'Free delivery on orders over TZS 50,000',
      'product.returnsEasy': '7-day easy returns for quality issues',
      'product.moneyBack': 'Money-back guarantee from verified sellers',
      'product.noQuestions': 'No questions asked, full refund',
      'product.buyerProtected': 'Protected by SmartSoko buyer protection',
      'product.feesAtCheckout': 'Delivery fees are confirmed at checkout after you select an address.',
      'product.quickLinks': 'Quick Links',
      'product.support': 'Support',
      'product.connect': 'Connect',

      // ── Profile extras ──
      'profile.notSignedIn': "You're not signed in.",
      'profile.memberSince': 'Member since',
      'profile.role': 'Role',

      // ── Wallet extras ──
      'wallet.subtitle': 'Balance, payments and withdrawals',
      'wallet.recentTransactions': 'Recent Transactions',
      'wallet.retryCheckout': 'Retry Checkout',
      'wallet.depositFailed': 'nTZS deposit failed',
      'wallet.depositProgress': 'nTZS deposit in progress',
      'wallet.pendingHint': 'Still pending after a few minutes — refresh this page to check again.',

      // ── Stores extras ──
      'stores.discover': 'Discover Local Stores',
      'stores.allStores': 'All Stores',

      // ── Chat extras ──
      'chat.callWhenArrive': 'Call when arrive',
      'chat.atLocation': "I'm at the location",
      'chat.leaveAtDoor': 'Leave at door',
      'chat.runningLate': 'Running late',

      // ── Referral extras ──
      'referral.invitesSent': 'Invites sent',
      'referral.earned': 'Earned',
      'referral.shareDesc': 'Share your code or invite link with friends',
      'referral.signInPrompt': 'Sign in to start earning referral rewards.',
      'referral.stepSignup': 'They sign up with your code and place their first order',

      // ── Customer orders ──
      'customerOrders.eyebrow': 'Your marketplace',
      'customerOrders.subtitle': 'Follow your deliveries and revisit your recent purchases.',
      'customerOrders.onePlace': 'Your orders, in one place.',
      'customerOrders.signInPrompt': 'Sign in to see your purchases and delivery updates.',

      // ── Saved items ──
      'savedItems.title': 'Saved items',
      'savedItems.description': 'Products saved on this device.',
      'savedItems.loading': 'Loading saved items...',

      // ── Residual page strings ──
      'track.confirmDelivery': 'Confirm Delivery',
      'track.confirming': 'Confirming...',
      'track.liveTracking': 'Live Tracking',
      'track.buyAgain': 'Buy Again',
      'track.orderMore': 'Order More',
      'track.call': 'Call',
      'track.contact': 'Contact',
      'track.notFound': 'Order not found',
      'track.noAddress': 'Address not available',
      'track.noGps': 'No GPS coordinates available',
      'track.deliveryUpdates': 'Delivery updates',
      'track.statusUpdated': 'Order status updated:',
      'track.confirmError': 'Error confirming delivery. Please try again.',
      'track.pending': 'Pending',
      'orders.cashOnDelivery': 'Cash on Delivery',
      'orders.ntzsWallet': 'nTZS Wallet',
      'orders.orderReceived': 'Order received',
      'product.notFound': "We couldn't find this product",
      'product.notFoundHint': 'It may have been removed or is no longer available.',
      'product.goHome': 'Go to homepage',
      'product.noDescription': 'No description available.',
      'product.unavailable': 'This item is currently unavailable',
      'product.writeReview': 'Write a Review',
      'product.submitReview': 'Submit Review',
      'product.reviewSubmitted': 'Review submitted! Thank you.',
      'product.reviewLoad': 'Loading reviews...',
      'product.yourName': 'Your name',
      'product.yourReview': 'Your review',
      'product.reviewPlaceholder': 'What did you like or dislike?',
      'product.starRating': 'Star rating',
      'product.wishlist': 'Add to wishlist',
      'product.share': 'Share product',
      'product.perUnit': 'per unit',
      'product.readMore': 'Read more',
      'product.readLess': 'Read less',
      'product.verifiedSeller': 'Verified Seller',
      'product.securePay': 'Secure Pay',
      'product.shippingReturns': 'Shipping & Returns',
      'product.reviewCount': 'customer rating',
      'chat.today': 'Today',
      'chat.justNow': 'Just now',
      'chat.withRider': 'Chat with Rider',
      'chat.withCustomer': 'Chat with Customer',
      'chat.noOrder': 'No order specified',
      'chat.yourRider': 'Your Rider',
      'chat.noPhone': 'Phone number not available',
      'wallet.withdraw': 'Withdraw',
      'wallet.unavailable': 'Wallet unavailable. Please check your connection and sign in again.',
      'referral.inviteFriend': 'Invite a friend — you both earn TSh 5,000 after their first order.',
      'referral.linkCopied': 'Link copied — send it to a friend!',
      'referral.bothGet': 'You both get TSh 5,000 credited to your wallets',
      'customerOrders.exploreShops': 'Explore local shops and find something fresh.',
      'customerOrders.firstOrder': 'Your first order starts here.',
      'customerOrders.loadError': 'We could not load your orders.',
      'customerOrders.tryAgainHint': 'Please try again. If the problem continues, sign in again.',
      'stores.subtitle': 'Find your favorite restaurants and shops near you',
      'stores.loading': 'Loading stores...',
      'stores.closed': 'Closed',
      'stores.open': 'Open',
      'stores.featured': 'Featured',
      'common.backToHome': 'Back to home',

      // ── Seller console (orders.html, seller.html, restaurant.html) ──
      'orders.welcomeBack': 'Welcome back,',
      'orders.monitorSub': 'Monitor and process your marketplace orders',
      'orders.managementTitle': 'Orders Management',
      'orders.allStatus': 'All Status',
      'orders.readyForDelivery': 'Ready for Delivery',
      'orders.dispatched': 'Dispatched',
      'orders.allTime': 'All Time',
      'orders.thisWeek': 'This Week',
      'orders.thisMonth': 'This Month',
      'common.seller': 'Seller',
      'common.actions': 'Actions',
      'orders.orderStatus': 'Order Status',
      'orders.orderItems': 'Order Items',
      'orders.timeline': 'Timeline',
      'common.print': 'Print',
      'common.qty': 'Qty:',
      'orders.noTimeline': 'No timeline',
      'common.viewDetails': 'View Details',
      'orders.loadError': 'Error loading orders',
      'orders.emptyHint': 'Orders from customers will appear here.',
      'orders.searchPlaceholder': 'Search by order ID, customer...',
      'orders.searchAria': 'Search orders',
      'orders.statusUpdateFailed': 'Failed to update status',
      'orders.nothingToExport': 'No orders to export',
      'common.phone': 'Phone',
      'common.guest': 'Guest',
      'common.update': 'Update',
      'common.saveChanges': 'Save Changes',
      'seller.editMenuItem': 'Edit Menu Item',
      'common.export': 'Export',
      'seller.activeOrders': 'Active Orders',
      'seller.revenueToday': 'Revenue Today',
      'seller.avgPrepTime': 'Avg Prep Time',
      'seller.lowStock': 'Low Stock Items',
      'seller.inventory': 'Inventory',
      'seller.analytics': 'Analytics',
      'seller.orderTime': 'Order Time',
      'seller.addProduct': '+ Add Product',
      'seller.inventoryMgmt': 'Inventory Management',
      'seller.updateStock': 'Update Stock Levels',
      'seller.restaurantAnalytics': 'Restaurant Analytics',
      'seller.peakHours': 'Peak Hours',
      'seller.popularItems': 'Most Popular Items',
      'seller.addMenuItem': 'Add Menu Item',
      'seller.itemName': 'Item Name',
      'seller.initialStock': 'Initial Stock',
      'seller.addItem': 'Add Item',
      'seller.selectSeller': 'Select Seller',
      'seller.startPrep': 'Start Prep',
      'seller.complete': 'Complete',
      'seller.hide': 'Hide',
      'seller.show': 'Show',
      'seller.currentStock': 'Current stock:',
      'seller.lowStockBadge': 'LOW STOCK',
      'seller.itemNotFound': 'Item not found',
      'seller.fillRequired': 'Please fill required fields',
      'seller.itemUpdated': 'Item updated',
      'seller.itemAdded': 'Item added',
      'seller.newOrder': 'New order received!',
      'seller.uncategorized': 'Uncategorized',
      'restaurant.joinTitle': 'Join SmartSoko as a Seller',
      'restaurant.businessName': 'Business Name',
      'restaurant.selectCategory': 'Select Business Category',
      'restaurant.businessLogo': 'Business Logo/Image',
      'restaurant.businessDesc': 'Business Description',
      'restaurant.businessAddress': 'Business Address',
      'restaurant.deliveryTime': 'Delivery Time (minutes)',
      'restaurant.register': 'Register as Seller',
      'restaurant.alreadySeller': 'Already a Seller?',
      'restaurant.successTitle': 'Registration Successful!',
      'restaurant.goDashboard': 'Go to Dashboard',
      'restaurant.registering': 'Registering...',
      'restaurant.failed': 'Registration failed. Please try again.',

      // ── Customer page residue ──
      'product.browseProducts': 'Browse products',
      'product.submitting': 'Submitting...',
      'customerOrders.exploreMarket': 'Explore the marketplace',
      'stores.topRated': 'Top Rated',
      'stores.fastDelivery': 'Fast Delivery',
      'stores.loadError': 'Unable to load stores',
      'nav.shop': 'Shop',
      'home.findProductsHint': 'Find products, plan a basket or check an order.',

      // ── Language Switcher ──
      'lang.sw': 'Kiswahili',
      'lang.en': 'English',
      'lang.switch': 'Switch language',
    },
  };

  let currentLang = DEFAULT_LANG;

  function getLang() {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  }

  function setLang(lang) {
    if (!dictionaries[lang]) return;
    currentLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    document.documentElement.lang = lang;
    applyTranslations();
    document.dispatchEvent(new CustomEvent('smartsoko:langchange', { detail: { lang } }));
  }

  function t(key, fallback) {
    const val = dictionaries[currentLang]?.[key];
    if (val !== undefined) return val;
    const enVal = dictionaries.en?.[key];
    if (enVal !== undefined) return enVal;
    return fallback || key;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (val && val !== key) el.textContent = val;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = t(key);
      if (val && val !== key) el.placeholder = val;
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const val = t(key);
      if (val && val !== key) el.title = val;
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      const val = t(key);
      if (val && val !== key) el.setAttribute('aria-label', val);
    });

    document.querySelectorAll('[data-i18n-alt]').forEach(el => {
      const key = el.getAttribute('data-i18n-alt');
      const val = t(key);
      if (val && val !== key) el.alt = val;
    });

    // Values containing inline markup (hero line breaks). Source is the built-in dictionary only.
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const val = t(key);
      if (val && val !== key) el.innerHTML = val;
    });
  }

  function createLanguageSwitcher() {
    let existing = document.getElementById('ss-lang-switcher');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.id = 'ss-lang-switcher';
    btn.type = 'button';
    btn.className = 'ss-lang-btn';
    btn.setAttribute('aria-label', t('lang.switch'));
    btn.title = t('lang.switch');
    btn.innerHTML = `<span class="ss-lang-label">${currentLang === 'sw' ? 'SW' : 'EN'}</span>`;

    const style = document.createElement('style');
    style.textContent = `
      .ss-lang-btn {
        position: fixed; bottom: 80px; right: 16px; z-index: 999;
        width: 40px; height: 40px; border-radius: 50%;
        background: #1B4332; color: #fff; border: 2px solid #fff;
        box-shadow: 0 2px 12px rgba(0,0,0,.15);
        cursor: pointer; font-weight: 700; font-size: 11px;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .ss-lang-btn:hover { background: #2D6A4F; transform: scale(1.1); }
      @media (min-width: 768px) { .ss-lang-btn { bottom: 16px; right: 16px; } }
    `;
    document.head.appendChild(style);

    btn.addEventListener('click', () => {
      setLang(currentLang === 'sw' ? 'en' : 'sw');
      btn.querySelector('.ss-lang-label').textContent = currentLang === 'sw' ? 'SW' : 'EN';
    });

    document.body.appendChild(btn);
  }

  function announce() {
    document.dispatchEvent(new CustomEvent('smartsoko:langchange', { detail: { lang: currentLang } }));
  }

  // The API localizes its responses from this header (server/src/utils/api-messages.js).
  // Storefront pages call fetch() directly, so the active UI language is attached
  // here rather than relying on the browser's Accept-Language.
  function installApiLanguageHeader() {
    if (typeof window.fetch !== 'function' || window.fetch.__ssLang) return;
    const original = window.fetch.bind(window);
    const patched = (input, options = {}) => {
      let target;
      try {
        target = new URL(input instanceof Request ? input.url : String(input), location.href);
      } catch (_) {
        return original(input, options);
      }
      if (target.pathname !== '/api' && !target.pathname.startsWith('/api/')) {
        return original(input, options);
      }
      const headers = new Headers(
        options.headers || (input instanceof Request ? input.headers : undefined)
      );
      if (!headers.has('X-Language')) headers.set('X-Language', currentLang);
      if (input instanceof Request) {
        return original(new Request(input, { headers }), { ...options });
      }
      return original(input, { ...options, headers });
    };
    patched.__ssLang = true;
    window.fetch = patched;
  }

  function init(options = {}) {
    installApiLanguageHeader();
    currentLang = getLang();
    document.documentElement.lang = currentLang;

    if (options.apply !== false) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          applyTranslations();
          announce();
          if (options.switcher !== false) createLanguageSwitcher();
        });
      } else {
        applyTranslations();
        announce();
        if (options.switcher !== false) createLanguageSwitcher();
      }
      // Late-rendered DOM (async data, component slots) is translated once the page settles.
      window.addEventListener('load', () => {
        applyTranslations();
        announce();
      }, { once: true });
    }
  }

  return {
    init,
    t,
    getLang,
    setLang,
    applyTranslations,
    createLanguageSwitcher,
    dictionaries,
  };
})();

if (typeof window !== 'undefined') {
  window.SmartSokoI18n = SmartSokoI18n;
  window.t = SmartSokoI18n.t;
  SmartSokoI18n.init();
}
