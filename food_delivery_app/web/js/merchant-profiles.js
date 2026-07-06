/**
 * SmartSoko Merchant Profiles — Industry-Specific Customization
 * Tailors the merchant dashboard to specific SME business types
 */
window.MerchantProfiles = {
  profiles: {
    bakery: {
      label: 'Bakery',
      icon: 'bakery_dining',
      emoji: '🥖',
      description: 'Breads, cakes, pastries & baked goods',
      brandColors: { primary: '#92400e', secondary: '#b45309' },
      scheme: 'warm',
      defaultCategories: ['Bread', 'Cake', 'Pastry', 'Cookie', 'Savory', 'Beverage'],
      productFormExtras: [
        { id: 'bakedOn', label: 'Baked On', type: 'date', section: 'production' },
        { id: 'unitType', label: 'Unit', type: 'select', options: ['Per Loaf', 'Per Slice', 'Per Piece', 'Per Kg', 'Per Pack'], section: 'pricing' }
      ],
      dashboardTips: [
        'Mark items as "Freshly Baked" daily to attract morning customers',
        'Add a "Today\'s Special" collection for items baked this morning',
        'Set stock to match your daily bake count'
      ],
      quickActions: [
        { label: 'Today\'s Bake', icon: 'wb_sunny', action: 'filterTodayBake' },
        { label: 'Daily Special', icon: 'star', action: 'openDailySpecial' }
      ],
      filters: { type: ['Freshly Baked', 'Packed', 'Frozen'] },
      tags: ['Freshly Baked', 'Wholegrain', 'Gluten-Free', 'Sugar-Free', 'Sourdough']
    },

    farmer: {
      label: 'Farmer',
      icon: 'agriculture',
      emoji: '🌾',
      description: 'Fresh produce, fruits & vegetables',
      brandColors: { primary: '#166534', secondary: '#15803d' },
      scheme: 'green',
      defaultCategories: ['Fruits', 'Vegetables', 'Herbs', 'Grains', 'Tubers', 'Seeds'],
      productFormExtras: [
        { id: 'harvestDate', label: 'Harvest Date', type: 'date', section: 'production' },
        { id: 'origin', label: 'Farm / Origin', type: 'text', placeholder: 'e.g. Mbeya Highlands', section: 'details' },
        { id: 'unitType', label: 'Sell By', type: 'select', options: ['Per Kg', 'Per Bunch', 'Per Piece', 'Per Sack', 'Per Crate'], section: 'pricing' },
        { id: 'seasonal', label: 'Seasonal Item', type: 'checkbox', section: 'details' }
      ],
      dashboardTips: [
        'Add harvest dates so customers know your produce is fresh',
        'Mark seasonal items to highlight what\'s in season now',
        'Use bulk pricing for wholesale buyers'
      ],
      quickActions: [
        { label: 'New Harvest', icon: 'eco', action: 'newHarvest' },
        { label: 'Seasonal Items', icon: 'flare', action: 'showSeasonal' }
      ],
      filters: { type: ['Organic', 'Fresh', 'Seasonal', 'Bulk'] },
      tags: ['Organic', 'Fresh', 'Seasonal', 'Locally Grown', 'Farm Fresh', 'Pesticide-Free']
    },

    dairy: {
      label: 'Dairy',
      icon: 'emoji_food_beverage',
      emoji: '🥛',
      description: 'Milk, cheese, yogurt & dairy products',
      brandColors: { primary: '#1e3a5f', secondary: '#2563eb' },
      scheme: 'cool',
      defaultCategories: ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Cream', 'Ice Cream'],
      productFormExtras: [
        { id: 'expiryDate', label: 'Expiry Date', type: 'date', section: 'production', required: true },
        { id: 'fatContent', label: 'Fat Content %', type: 'number', placeholder: 'e.g. 3.5', step: '0.1', section: 'details' },
        { id: 'pasteurized', label: 'Pasteurized', type: 'checkbox', section: 'details', default: true },
        { id: 'unitType', label: 'Unit', type: 'select', options: ['Per Litre', 'Per 500ml', 'Per Kg', 'Per Piece'], section: 'pricing' }
      ],
      dashboardTips: [
        'Expiry date items should be discounted as they near expiry',
        'Mark pasteurized products clearly — customers look for this',
        'Stock multiple fat content options (whole, semi, skimmed)'
      ],
      quickActions: [
        { label: 'Expiring Soon', icon: 'schedule', action: 'showExpiring' },
        { label: 'New Batch', icon: 'batch_prediction', action: 'newBatch' }
      ],
      filters: { type: ['Pasteurized', 'Fresh', 'Organic', 'Long-Life'] },
      tags: ['Pasteurized', 'Fresh Milk', 'Organic', 'Full Cream', 'Low Fat', 'Probiotic']
    },

    restaurant: {
      label: 'Restaurant',
      icon: 'restaurant',
      emoji: '🍽️',
      description: 'Full meals, takeaway & dining',
      brandColors: { primary: '#b91c1c', secondary: '#dc2626' },
      scheme: 'red',
      defaultCategories: ['Main Course', 'Appetizer', 'Dessert', 'Beverage', 'Side', 'Special'],
      productFormExtras: [
        { id: 'prepTime', label: 'Prep Time (min)', type: 'number', placeholder: '15', section: 'details' },
        { id: 'servingSize', label: 'Serving Size', type: 'text', placeholder: 'Serves 2', section: 'pricing' },
        { id: 'spiceLevel', label: 'Spice Level', type: 'select', options: ['Mild', 'Medium', 'Spicy', 'Extra Spicy'], section: 'details' },
        { id: 'mealType', label: 'Meal Type', type: 'select', options: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], section: 'details' }
      ],
      dashboardTips: [
        'Feature your most popular dishes prominently',
        'Add prep times to help customers plan pickup',
        'Create meal bundles to increase order value'
      ],
      quickActions: [
        { label: 'Today\'s Menu', icon: 'today', action: 'showTodaysMenu' },
        { label: 'Special Offer', icon: 'local_offer', action: 'openDealModal' }
      ],
      filters: { type: ['Popular', 'Chef Special', 'New', 'Seasonal'] },
      tags: ['Chef Special', 'Popular', 'New', 'Seasonal', 'Spicy', 'Vegetarian', 'Vegan']
    },

    butchery: {
      label: 'Butchery',
      icon: 'grocery',
      emoji: '🥩',
      description: 'Fresh meat, poultry & fish',
      brandColors: { primary: '#7f1d1d', secondary: '#991b1b' },
      scheme: 'dark-red',
      defaultCategories: ['Beef', 'Chicken', 'Goat', 'Fish', 'Pork', 'Sausages'],
      productFormExtras: [
        { id: 'slaughterDate', label: 'Slaughter / Catch Date', type: 'date', section: 'production' },
        { id: 'cutType', label: 'Cut Type', type: 'text', placeholder: 'e.g. T-Bone, Fillet', section: 'details' },
        { id: 'origin', label: 'Source / Farm', type: 'text', placeholder: 'e.g. Arusha Ranch', section: 'details' },
        { id: 'unitType', label: 'Sell By', type: 'select', options: ['Per Kg', 'Per Piece', 'Per Pack'], section: 'pricing' }
      ],
      dashboardTips: [
        'Display slaughter dates to emphasize freshness',
        'Offer mixed-pack bundles for BBQs and events',
        'Stock both raw and marinated options'
      ],
      quickActions: [
        { label: 'Fresh Arrival', icon: 'local_shipping', action: 'newArrival' },
        { label: 'Bundle Deal', icon: 'inventory_2', action: 'openBundleModal' }
      ],
      filters: { type: ['Fresh', 'Frozen', 'Marinated', 'Organic'] },
      tags: ['Fresh', 'Frozen', 'Marinated', 'Organic', 'Grass-Fed', 'Free-Range']
    },

    grocery: {
      label: 'Grocery',
      icon: 'store',
      emoji: '🛒',
      description: 'Packaged goods & household supplies',
      brandColors: { primary: '#065f46', secondary: '#047857' },
      scheme: 'emerald',
      defaultCategories: ['Beverages', 'Snacks', 'Canned Goods', 'Cereals', 'Household', 'Personal Care'],
      productFormExtras: [
        { id: 'expiryDate', label: 'Expiry Date', type: 'date', section: 'production' },
        { id: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Azam, Coca-Cola', section: 'details' },
        { id: 'barcode', label: 'Barcode / SKU', type: 'text', placeholder: 'e.g. 8901234567890', section: 'details' },
        { id: 'unitType', label: 'Unit', type: 'select', options: ['Per Piece', 'Per Pack', 'Per Carton', 'Per Kg', 'Per Litre'], section: 'pricing' }
      ],
      dashboardTips: [
        'Group items by brand to make restocking easier',
        'Set expiry alerts for near-expiry stock',
        'Offer multi-buy discounts on fast-moving items'
      ],
      quickActions: [
        { label: 'Restock Alert', icon: 'inventory', action: 'lowStockAlert' },
        { label: 'Bulk Discount', icon: 'discount', action: 'newBulkDeal' }
      ],
      filters: { type: ['Local', 'Imported', 'Premium', 'Economy'] },
      tags: ['Local', 'Imported', 'Premium', 'Economy', 'Family Size', 'Eco-Friendly']
    },

    pharmacy: {
      label: 'Pharmacy',
      icon: 'local_pharmacy',
      emoji: '💊',
      description: 'Medicines, supplements & health products',
      brandColors: { primary: '#075985', secondary: '#0284c7' },
      scheme: 'sky',
      defaultCategories: ['Medicine', 'Supplements', 'First Aid', 'Baby Care', 'Personal Care', 'Medical Equipment'],
      productFormExtras: [
        { id: 'expiryDate', label: 'Expiry Date', type: 'date', section: 'production', required: true },
        { id: 'manufacturer', label: 'Manufacturer', type: 'text', placeholder: 'e.g. Shelys, GSK', section: 'details' },
        { id: 'dosage', label: 'Dosage Form', type: 'select', options: ['Tablet', 'Capsule', 'Syrup', 'Cream', 'Injection', 'Drops', 'Spray'], section: 'details' },
        { id: 'requiresPrescription', label: 'Requires Prescription', type: 'checkbox', section: 'details' }
      ],
      dashboardTips: [
        'Always check expiry dates before listing medicines',
        'Mark prescription-only items clearly for customer safety',
        'Bundle first-aid kits for emergency preparedness'
      ],
      quickActions: [
        { label: 'Expiring Soon', icon: 'schedule', action: 'showExpiring' },
        { label: 'Best Sellers', icon: 'trending_up', action: 'showBestSellers' }
      ],
      filters: { type: ['OTC', 'Prescription', 'Supplement', 'First Aid'] },
      tags: ['OTC', 'Prescription', 'Supplement', 'First Aid', 'Pain Relief', 'Vitamins']
    },

    fashion: {
      label: 'Fashion & Clothing',
      icon: 'checkroom',
      emoji: '👕',
      description: 'Clothing, shoes & accessories',
      brandColors: { primary: '#831843', secondary: '#be185d' },
      scheme: 'pink',
      defaultCategories: ['Men', 'Women', 'Kids', 'Shoes', 'Accessories', 'Traditional'],
      productFormExtras: [
        { id: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Mitumba, Bora', section: 'details' },
        { id: 'sizes', label: 'Available Sizes', type: 'text', placeholder: 'e.g. S, M, L, XL or 38-44', section: 'details' },
        { id: 'material', label: 'Material', type: 'text', placeholder: 'e.g. Cotton, Kitenge, Denim', section: 'details' },
        { id: 'gender', label: 'Gender', type: 'select', options: ['Unisex', 'Men', 'Women', 'Kids'], section: 'details' }
      ],
      dashboardTips: [
        'Include size charts in product descriptions to reduce returns',
        'Showcase traditional wear (Kitenge, Khanga) as a featured collection',
        'Upload clear photos showing fabric texture and fit'
      ],
      quickActions: [
        { label: 'New Arrivals', icon: 'new_releases', action: 'showNewArrivals' },
        { label: 'Seasonal', icon: 'ac_unit', action: 'showSeasonal' }
      ],
      filters: { type: ['New Arrival', 'Trending', 'Sale', 'Traditional'] },
      tags: ['New Arrival', 'Trending', 'Sale', 'Traditional', 'Premium', 'Casual', 'Formal']
    },

    electronics: {
      label: 'Electronics',
      icon: 'devices',
      emoji: '📱',
      description: 'Phones, gadgets & electronic accessories',
      brandColors: { primary: '#1e293b', secondary: '#334155' },
      scheme: 'slate',
      defaultCategories: ['Phones', 'Accessories', 'Audio', 'Computer', 'Home Appliances', 'Chargers & Cables'],
      productFormExtras: [
        { id: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Samsung, Tecno, Nokia', section: 'details' },
        { id: 'model', label: 'Model', type: 'text', placeholder: 'e.g. iPhone 13, Galaxy S24', section: 'details' },
        { id: 'warranty', label: 'Warranty (months)', type: 'number', placeholder: '12', section: 'details' },
        { id: 'condition', label: 'Condition', type: 'select', options: ['New', 'Like New', 'Used - Good', 'Used - Fair', 'Refurbished'], section: 'details' }
      ],
      dashboardTips: [
        'Specify warranty clearly — customers value this highly',
        'Add condition details for pre-owned items to build trust',
        'Bundle phone cases and screen protectors with phones'
      ],
      quickActions: [
        { label: 'Top Sellers', icon: 'trending_up', action: 'showBestSellers' },
        { label: 'New Stock', icon: 'inventory_2', action: 'openAddMenuItem' }
      ],
      filters: { type: ['New', 'Used', 'Refurbished', 'Accessories'] },
      tags: ['New', 'Used', 'Refurbished', 'Warranty', 'Genuine', 'Original', 'Compatible']
    },

    beauty: {
      label: 'Beauty & Cosmetics',
      icon: 'spa',
      emoji: '💄',
      description: 'Cosmetics, skincare & personal care',
      brandColors: { primary: '#86198f', secondary: '#c026d3' },
      scheme: 'purple',
      defaultCategories: ['Skincare', 'Makeup', 'Hair Care', 'Fragrance', 'Nails', 'Body Care'],
      productFormExtras: [
        { id: 'expiryDate', label: 'Expiry Date', type: 'date', section: 'production', required: true },
        { id: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Nivea, L\'Oreal', section: 'details' },
        { id: 'skinType', label: 'Skin Type', type: 'select', options: ['All', 'Normal', 'Dry', 'Oily', 'Sensitive', 'Combination'], section: 'details' },
        { id: 'volume', label: 'Volume / Weight', type: 'text', placeholder: 'e.g. 50ml, 200g', section: 'pricing' }
      ],
      dashboardTips: [
        'Expiry dates are critical for beauty products — always check before listing',
        'Group by skin type (dry, oily, sensitive) for easier browsing',
        'Bundle complete skincare routines to increase order value'
      ],
      quickActions: [
        { label: 'Expiring', icon: 'schedule', action: 'showExpiring' },
        { label: 'New Brands', icon: 'new_releases', action: 'showNewArrivals' }
      ],
      filters: { type: ['Skincare', 'Makeup', 'Hair', 'Natural', 'Premium'] },
      tags: ['Natural', 'Organic', 'Hypoallergenic', 'Paraben-Free', 'Cruelty-Free', 'Premium']
    },

    beverages: {
      label: 'Beverages & Drinks',
      icon: 'local_cafe',
      emoji: '🥤',
      description: 'Juices, sodas, water & bottled drinks',
      brandColors: { primary: '#0e7490', secondary: '#0891b2' },
      scheme: 'cyan',
      defaultCategories: ['Soft Drinks', 'Juices', 'Water', 'Energy Drinks', 'Traditional', 'Alcohol'],
      productFormExtras: [
        { id: 'expiryDate', label: 'Best Before', type: 'date', section: 'production' },
        { id: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Coca-Cola, Pepsi', section: 'details' },
        { id: 'volume', label: 'Volume', type: 'select', options: ['330ml', '500ml', '1L', '1.5L', '2L', 'Case (12)'], section: 'pricing' },
        { id: 'carbonated', label: 'Carbonated', type: 'checkbox', section: 'details' }
      ],
      dashboardTips: [
        'Stock both cold and room-temperature options during peak hours',
        'Bundle party packs for events and gatherings',
        'Highlight traditional drinks (mbege, togwa) as local favorites'
      ],
      quickActions: [
        { label: 'Restock', icon: 'inventory', action: 'lowStockAlert' },
        { label: 'Party Pack', icon: 'celebration', action: 'openBundleModal' }
      ],
      filters: { type: ['Cold', 'Room Temp', 'Traditional', 'Imported', 'Local'] },
      tags: ['Cold Drink', 'Traditional', 'Local', 'Imported', 'Sugar-Free', 'Energy']
    },

    flowers: {
      label: 'Flowers & Gifts',
      icon: 'local_florist',
      emoji: '💐',
      description: 'Flower arrangements, bouquets & gift items',
      brandColors: { primary: '#9d174d', secondary: '#db2777' },
      scheme: 'rose',
      defaultCategories: ['Bouquets', 'Arrangements', 'Single Stems', 'Gift Baskets', 'Plants', 'Occasions'],
      productFormExtras: [
        { id: 'flowerType', label: 'Main Flower', type: 'text', placeholder: 'e.g. Roses, Lilies, Sunflowers', section: 'details' },
        { id: 'occasion', label: 'Best For', type: 'select', options: ['Any Occasion', 'Birthday', 'Wedding', 'Anniversary', 'Sorry', 'Graduation', 'Valentine'], section: 'details' },
        { id: 'deliveryTime', label: 'Delivery Needed By', type: 'text', placeholder: 'e.g. Same day, 24hr notice', section: 'details' },
        { id: 'unitType', label: 'Packaging', type: 'select', options: ['Wrapped Bouquet', 'Vase Arrangement', 'Box', 'Basket'], section: 'pricing' }
      ],
      dashboardTips: [
        'Add "Same Day Delivery" tag for last-minute shoppers',
        'Create occasion-specific collections (Wedding, Birthday, Sorry)',
        'Send care instructions with every flower delivery'
      ],
      quickActions: [
        { label: 'Today\'s Orders', icon: 'today', action: 'filterTodayOrders' },
        { label: 'Occasion Special', icon: 'celebration', action: 'openCouponModal' }
      ],
      filters: { type: ['Bouquet', 'Arrangement', 'Plant', 'Gift Basket'] },
      tags: ['Fresh Cut', 'Same Day', 'Premium', 'Wedding', 'Birthday', 'Seasonal']
    },

    baby: {
      label: 'Baby & Kids',
      icon: 'child_care',
      emoji: '👶',
      description: 'Baby products, diapers, toys & kids essentials',
      brandColors: { primary: '#0d9488', secondary: '#14b8a6' },
      scheme: 'teal',
      defaultCategories: ['Diapers', 'Baby Food', 'Toys', 'Clothing', 'Feeding', 'Nursery'],
      productFormExtras: [
        { id: 'expiryDate', label: 'Expiry Date', type: 'date', section: 'production', required: true },
        { id: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Pampers, Huggies', section: 'details' },
        { id: 'ageRange', label: 'Age Range', type: 'select', options: ['0-6 months', '6-12 months', '1-3 years', '3-5 years', '5+ years'], section: 'details' },
        { id: 'safetyInfo', label: 'Safety Info', type: 'text', placeholder: 'e.g. BPA-free, CE marked', section: 'details' }
      ],
      dashboardTips: [
        'Baby products need clear safety and age information',
        'Bundle newborn essentials (diapers + wipes + cream)',
        'Check expiry dates strictly — parents are very particular'
      ],
      quickActions: [
        { label: 'Baby Bundles', icon: 'inventory_2', action: 'openBundleModal' },
        { label: 'Restock', icon: 'inventory', action: 'lowStockAlert' }
      ],
      filters: { type: ['Newborn', 'Infant', 'Toddler', 'Safety Tested'] },
      tags: ['Newborn', 'Infant', 'Toddler', 'BPA-Free', 'Organic', 'Hypoallergenic', 'Eco-Friendly']
    },

    hardware: {
      label: 'Hardware & Building',
      icon: 'hardware',
      emoji: '🔧',
      description: 'Tools, building materials & hardware supplies',
      brandColors: { primary: '#78350f', secondary: '#b45309' },
      scheme: 'amber',
      defaultCategories: ['Tools', 'Paint', 'Electrical', 'Plumbing', 'Timber', 'Cement & Blocks'],
      productFormExtras: [
        { id: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Makita, Bosch', section: 'details' },
        { id: 'material', label: 'Material', type: 'text', placeholder: 'e.g. Steel, Plastic, Wood', section: 'details' },
        { id: 'unitType', label: 'Sold By', type: 'select', options: ['Per Piece', 'Per Kg', 'Per Metre', 'Per Bag', 'Per Litre', 'Per Dozen'], section: 'pricing' },
        { id: 'bulkDiscount', label: 'Bulk Discount Available', type: 'checkbox', section: 'pricing' }
      ],
      dashboardTips: [
        'Contractors buy in bulk — offer quantity discounts',
        'Stock common sizes (nails, pipes, cables) for walk-in tradesmen',
        'Add "per metre/kg/piece" pricing clearly for building materials'
      ],
      quickActions: [
        { label: 'Bulk Quote', icon: 'request_quote', action: 'openDealModal' },
        { label: 'Low Stock', icon: 'inventory', action: 'lowStockAlert' }
      ],
      filters: { type: ['Tool', 'Material', 'Electrical', 'Plumbing', 'Paint'] },
      tags: ['Professional Grade', 'DIY', 'Bulk', 'Heavy Duty', 'Eco-Friendly']
    },

    stationery: {
      label: 'Stationery & Books',
      icon: 'menu_book',
      emoji: '📚',
      description: 'Books, school supplies & office stationery',
      brandColors: { primary: '#7c3aed', secondary: '#8b5cf6' },
      scheme: 'violet',
      defaultCategories: ['Books', 'Pens & Pencils', 'Paper & Notebooks', 'Office Supplies', 'Art Supplies', 'School Bags'],
      productFormExtras: [
        { id: 'brand', label: 'Brand / Publisher', type: 'text', placeholder: 'e.g. Oxford, Bic', section: 'details' },
        { id: 'format', label: 'Format', type: 'select', options: ['Physical Book', 'Exercise Book', 'Notebook', 'Set', 'Individual'], section: 'details' },
        { id: 'subject', label: 'Subject / Category', type: 'text', placeholder: 'e.g. Mathematics, Fiction', section: 'details' },
        { id: 'unitType', label: 'Sold In', type: 'select', options: ['Per Piece', 'Per Set', 'Per Pack', 'Per Dozen'], section: 'pricing' }
      ],
      dashboardTips: [
        'Back-to-school seasons drive 70% of annual revenue — stock up early',
        'Bundle school supply sets (notebook + pen + pencil + ruler)',
        'List books by subject and class level for easy navigation'
      ],
      quickActions: [
        { label: 'School Sets', icon: 'school', action: 'openBundleModal' },
        { label: 'Back to School', icon: 'calendar_month', action: 'showSeasonal' }
      ],
      filters: { type: ['Book', 'Stationery', 'Art Supply', 'Office'] },
      tags: ['Educational', 'Exercise Book', 'Textbook', 'Fiction', 'Office', 'Art Supply']
    },

    pets: {
      label: 'Pet Supplies',
      icon: 'pets',
      emoji: '🐾',
      description: 'Pet food, accessories & animal supplies',
      brandColors: { primary: '#7c2d12', secondary: '#9a3412' },
      scheme: 'orange',
      defaultCategories: ['Dog Food', 'Cat Food', 'Bird Supplies', 'Fish', 'Pet Accessories', 'Health & Grooming'],
      productFormExtras: [
        { id: 'expiryDate', label: 'Expiry Date', type: 'date', section: 'production' },
        { id: 'petType', label: 'Pet Type', type: 'select', options: ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Other'], section: 'details' },
        { id: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Royal Canin, Pedigree', section: 'details' },
        { id: 'unitType', label: 'Sold By', type: 'select', options: ['Per Kg', 'Per Piece', 'Per Pack', 'Per Bag'], section: 'pricing' }
      ],
      dashboardTips: [
        'Pet owners are loyal — stock their preferred brands consistently',
        'Bundle food + toy + treat for new pet owners',
        'Clearly specify which animal and age range each product is for'
      ],
      quickActions: [
        { label: 'Pet Bundles', icon: 'inventory_2', action: 'openBundleModal' },
        { label: 'Best Sellers', icon: 'trending_up', action: 'showBestSellers' }
      ],
      filters: { type: ['Dog', 'Cat', 'Bird', 'Fish', 'Small Animal'] },
      tags: ['Premium Pet Food', 'Treats', 'Toy', 'Grooming', 'Healthy', 'Vet Recommended']
    }
  },

  getProfile(category) {
    if (!category) return this.getDefaultProfile();
    const key = category.toLowerCase().trim();
    // Map legacy category values
    const legacyMap = { food: 'restaurant', fruits: 'farmer', vegetables: 'farmer' };
    const resolvedKey = legacyMap[key] || key;
    return this.profiles[resolvedKey] || this.getDefaultProfile();
  },

  getDefaultProfile() {
    return {
      label: 'General Store',
      icon: 'storefront',
      emoji: '🏪',
      description: 'General merchandise',
      brandColors: { primary: '#064e3b', secondary: '#065f46' },
      scheme: 'default',
      defaultCategories: ['Food', 'Drinks', 'Dessert', 'Specials'],
      productFormExtras: [],
      dashboardTips: [
        'Keep your product catalog updated for better visibility',
        'Add clear descriptions to help customers choose',
        'Respond to reviews to build trust'
      ],
      quickActions: [
        { label: 'Add Product', icon: 'add_circle', action: 'openAddMenuItem' },
        { label: 'Promo Code', icon: 'sell', action: 'openPromoModal' }
      ],
      filters: { type: ['Available', 'Popular', 'New'] },
      tags: ['Popular', 'New', 'Recommended', 'Best Value']
    };
  },

  apply(category) {
    const profile = this.getProfile(category);
    this._updateBrandColors(profile);
    this._updateCategoryOptions(profile);
    this._updateQuickActions(profile);
    this._updateProductForm(profile);
    this._updateDashboardTips(profile);
    this._setThemeMeta(profile);
    this._updateProfileCard(profile);
    return profile;
  },

  _updateProfileCard(profile) {
    const icon = document.getElementById('profileIndustryIcon');
    const label = document.getElementById('profileIndustryLabel');
    const desc = document.getElementById('profileIndustryDesc');
    const badge = document.getElementById('profileIndustryBadge');
    if (icon) icon.textContent = profile.icon;
    if (label) label.textContent = `${profile.emoji} ${profile.label}`;
    if (desc) desc.textContent = profile.description;
    if (badge) {
      badge.textContent = profile.label;
      badge.style.background = profile.brandColors.primary + '15';
      badge.style.color = profile.brandColors.primary;
      badge.style.borderColor = profile.brandColors.primary + '30';
    }
  },

  _updateBrandColors(profile) {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = profile.brandColors.primary;
    const style = document.createElement('style');
    style.id = 'profile-brand-colors';
    style.textContent = `
      .profile-badge { background: ${profile.brandColors.primary}15; color: ${profile.brandColors.primary}; border-color: ${profile.brandColors.primary}30; }
      .profile-icon { color: ${profile.brandColors.primary}; }
    `;
    const existing = document.getElementById('profile-brand-colors');
    if (existing) existing.remove();
    document.head.appendChild(style);
  },

  _updateCategoryOptions(profile) {
    const datalist = document.getElementById('categoryOptions');
    if (datalist) {
      datalist.innerHTML = profile.defaultCategories.map(c =>
        `<option value="${c}">`
      ).join('');
    }
    const menuFilter = document.getElementById('menuFilter');
    if (menuFilter) {
      menuFilter.innerHTML = '<option value="all">All Categories</option>' +
        profile.defaultCategories.map(c =>
          `<option value="${c}">${c}</option>`
        ).join('') +
        '<option value="available">Available Only</option>';
    }
  },

  _updateQuickActions(profile) {
    const container = document.getElementById('quickActionsContainer');
    if (!container) return;
    container.innerHTML = profile.quickActions.map(a => `
      <button onclick="handleQuickAction('${a.action}')" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:border-primary/30 transition-all text-sm font-medium shadow-sm hover:shadow">
        <span class="material-symbols-outlined text-[18px] text-primary">${a.icon}</span>
        ${a.label}
      </button>
    `).join('');
  },

  _updateProductForm(profile) {
    const container = document.getElementById('extraFieldsContainer');
    const body = document.getElementById('extraFieldsBody');
    if (!container || !body) return;
    if (!profile.productFormExtras || profile.productFormExtras.length === 0) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    body.innerHTML = profile.productFormExtras.map(field => {
      const requiredAttr = field.required ? 'required' : '';
      const defaultVal = field.default !== undefined ? field.default : '';
      const stepAttr = field.step ? `step="${field.step}"` : '';

      if (field.type === 'select') {
        return `
          <div class="flex-1">
            <label for="${field.id}" class="block text-xs text-gray-500 mb-1">${field.label}${field.required ? ' *' : ''}</label>
            <select id="${field.id}" ${requiredAttr} class="w-full px-3 py-1.5 bg-surface-container border border-outline-variant rounded text-sm">
              <option value="">Select...</option>
              ${(field.options || []).map(o => `<option value="${o}">${o}</option>`).join('')}
            </select>
          </div>
        `;
      }
      if (field.type === 'checkbox') {
        return `
          <div class="flex items-center gap-2 pt-2">
            <input type="checkbox" id="${field.id}" ${defaultVal ? 'checked' : ''} class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary">
            <label for="${field.id}" class="text-xs text-gray-500">${field.label}</label>
          </div>
        `;
      }
      return `
        <div class="flex-1">
          <label for="${field.id}" class="block text-xs text-gray-500 mb-1">${field.label}${field.required ? ' *' : ''}</label>
          <input type="${field.type}" id="${field.id}" placeholder="${field.placeholder || ''}" ${stepAttr} ${requiredAttr} class="w-full px-3 py-1.5 bg-surface-container border border-outline-variant rounded text-sm">
        </div>
      `;
    }).join('');
  },

  _updateDashboardTips(profile) {
    const container = document.getElementById('dashboardTips');
    if (!container) return;
    container.innerHTML = profile.dashboardTips.map(tip => `
      <li class="flex items-start gap-2 text-sm text-gray-600">
        <span class="material-symbols-outlined text-[16px] text-primary mt-0.5">lightbulb</span>
        ${tip}
      </li>
    `).join('');
  },

  _setThemeMeta(profile) {
    document.documentElement.style.setProperty('--profile-primary', profile.brandColors.primary);
    document.documentElement.style.setProperty('--profile-secondary', profile.brandColors.secondary);
  }
};
