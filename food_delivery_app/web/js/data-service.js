/**
 * SmartSoko Data Service
 * Supports both live API calls and mock data for development
 */

import { collection, query, where, getDocs, limit, orderBy, getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Mock data configurations
const USE_MOCK_API = window.location.hostname === 'localhost' && 
                    (new URLSearchParams(window.location.search)).get('mock') === 'true';

const MOCK_DATA = {
  categories: [
    { name: 'food', count: 26, displayName: 'Restaurants', icon: 'restaurant' },
    { name: 'dairy', count: 2, displayName: 'Dairy', icon: 'water_drop' },
    { name: 'fruits', count: 2, displayName: 'Fruits', icon: 'nutrition' },
    { name: 'groceries', count: 3, displayName: 'Groceries', icon: 'shopping_basket' },
    { name: 'bakery', count: 2, displayName: 'Bakery', icon: 'bakery_dining' }
  ],
  sellers: [
    {
      id: 'seller-bakery-001',
      name: 'Golden Crust Bakery',
      category: 'bakery',
      description: 'Fresh bread, cakes and pastries',
      isOpen: true,
      rating: 4.7,
      ownerId: 'owner-bakery-001',
      address: 'Kinondoni',
      deliveryFee: 3000,
      deliveryTimeMinutes: 25,
      imageUrl: null,
      createdAt: { _seconds: 1777210628, _nanoseconds: 233000000 }
    },
    {
      id: 'seller-dairy-001',
      name: 'Mzimu Dairy Farm',
      category: 'dairy',
      description: 'Fresh milk, cheese and yogurt',
      isOpen: true,
      rating: 4.5,
      ownerId: 'owner-dairy-001',
      address: 'Bagamoyo Road',
      deliveryFee: 3500,
      deliveryTimeMinutes: 30,
      imageUrl: null,
      createdAt: { _seconds: 1777210625, _nanoseconds: 752000000 }
    },
    {
      id: 'seller-fruits-001',
      name: 'Tropicana Fruits',
      category: 'fruits',
      description: 'Seasonal tropical fruits',
      isOpen: true,
      rating: 4.9,
      ownerId: 'owner-fruits-001',
      address: 'Mwenge Market',
      deliveryFee: 2500,
      deliveryTimeMinutes: 20,
      imageUrl: null,
      createdAt: { _seconds: 1777210626, _nanoseconds: 809000000 }
    }
  ],
  products: {
    'seller-bakery-001': [
      {
        id: 'prod-bread-001',
        sellerId: 'seller-bakery-001',
        name: 'Fresh White Bread',
        description: 'Soft and fluffy white bread',
        price: 1500,
        category: 'bakery',
        isAvailable: true,
        imageUrl: null,
        createdAt: { _seconds: 1777210628, _nanoseconds: 233000000 },
        updatedAt: { _seconds: 1777210628, _nanoseconds: 233000000 }
      },
      {
        id: 'prod-cake-001',
        sellerId: 'seller-bakery-001',
        name: 'Chocolate Cake',
        description: 'Rich chocolate cake with frosting',
        price: 8000,
        category: 'bakery',
        isAvailable: true,
        imageUrl: null,
        createdAt: { _seconds: 1777210628, _nanoseconds: 233000000 },
        updatedAt: { _seconds: 1777210628, _nanoseconds: 233000000 }
      }
    ],
    'seller-dairy-001': [
      {
        id: 'prod-milk-001',
        sellerId: 'seller-dairy-001',
        name: 'Fresh Milk 1L',
        description: 'Pasteurized fresh milk',
        price: 2000,
        category: 'dairy',
        isAvailable: true,
        imageUrl: null,
        createdAt: { _seconds: 1777210625, _nanoseconds: 752000000 },
        updatedAt: { _seconds: 1777210625, _nanoseconds: 752000000 }
      }
    ],
    'seller-fruits-001': [
      {
        id: 'prod-mango-001',
        sellerId: 'seller-fruits-001',
        name: 'Ripe Mangoes',
        description: 'Sweet ripe mangoes per kg',
        price: 3500,
        category: 'fruits',
        isAvailable: true,
        imageUrl: null,
        createdAt: { _seconds: 1777210626, _nanoseconds: 809000000 },
        updatedAt: { _seconds: 1777210626, _nanoseconds: 809000000 }
      }
    ]
  },
  orders: [
    {
      id: 'order-001',
      customerId: 'customer-001',
      sellerId: 'seller-bakery-001',
      items: [
        { productId: 'prod-bread-001', name: 'Fresh White Bread', quantity: 2, price: 1500 },
        { productId: 'prod-cake-001', name: 'Chocolate Cake', quantity: 1, price: 8000 }
      ],
      subtotal: 11000,
      deliveryFee: 3000,
      tax: 1980,
      total: 15980,
      status: 'delivered',
      currency: 'TSh',
      createdAt: { _seconds: 1777210628, _nanoseconds: 233000000 },
      updatedAt: { _seconds: 1777210628, _nanoseconds: 233000000 }
    }
  ],
  profile: {
    id: 'customer-001',
    email: 'customer@example.com',
    displayName: 'Test Customer',
    phone: '+255 712 345 678',
    address: 'Dar es Salaam, Tanzania',
    role: 'customer',
    createdAt: { _seconds: 1777210628, _nanoseconds: 233000000 },
    updatedAt: { _seconds: 1777210628, _nanoseconds: 233000000 }
  }
};

// Helper to simulate network delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

const DataService = {
  // Get Firestore db reference
  get db() {
    return window.db || null;
  },

  /**
   * Check if we're on static hosting (Firebase/Vercel/Netlify)
   */
  isStaticHosting() {
    const hostname = window.location.hostname;
    return hostname.includes('web.app') || 
           hostname.includes('firebaseapp.com') ||
           hostname.includes('vercel.app') ||
           hostname.includes('netlify.app');
  },

   /**
    * Get all categories
    */
   async getCategories() {
     // Return mock data if enabled
     if (USE_MOCK_API) {
       await delay(300); // Simulate network delay
       return { ...MOCK_DATA.categories };
     }

     const CATEGORIES = ['food', 'dairy', 'fruits', 'groceries', 'bakery'];
     const CATEGORY_LABELS = {
       food: 'Restaurants',
       dairy: 'Dairy',
       fruits: 'Fruits',
       groceries: 'Groceries',
       bakery: 'Bakery'
     };

     return {
       categories: CATEGORIES.map(c => ({
         name: c,
         count: null,
         displayName: CATEGORY_LABELS[c],
         icon: this.getCategoryIcon(c)
       }))
     };
   },

   /**
    * Get sellers with optional filtering
    */
   async getSellers(options = {}) {
     // Return mock data if enabled
     if (USE_MOCK_API) {
       await delay(500); // Simulate network delay
       const { category, search, limit: limitCount = 20 } = options;
       
       let sellers = [...MOCK_DATA.sellers];
       
       // Filter by category if specified
       if (category && category !== 'all') {
         sellers = sellers.filter(s => s.category === category);
       }
       
       // Local text search
       if (search) {
         const searchLower = search.toLowerCase();
         sellers = sellers.filter(s =>
           s.name?.toLowerCase().includes(searchLower) ||
           s.description?.toLowerCase().includes(searchLower)
         );
       }
       
       return { data: sellers.slice(0, limitCount) };
     }

     const { category, search, limit: limitCount = 20 } = options;
     
     try {
       const db = this.db;
       if (!db) throw new Error('Database not initialized');
       
       const constraints = [];
       
        // Check if sellers collection has isOpen field
        try {
          constraints.push(where('isOpen', '==', true));
        } catch(e) {
          // Field might not exist, continue without it
          console.debug('isOpen field not available in sellers collection');
        }
       
       if (category) {
         try {
           constraints.push(where('category', '==', category));
         } catch(e) {
           // Field might not exist, continue without it
           console.debug('category field not available in sellers collection');
         }
       }
       
       constraints.push(limit(50));
       
       const q = query(collection(db, 'sellers'), ...constraints);
       const snapshot = await getDocs(q);
       
       let sellers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       
       // Local text search
       if (search) {
         const searchLower = search.toLowerCase();
         sellers = sellers.filter(s =>
           s.name?.toLowerCase().includes(searchLower) ||
           s.description?.toLowerCase().includes(searchLower)
         );
       }
       
       return { data: sellers.slice(0, limitCount) };
     } catch (error) {
       console.error('Error fetching sellers:', error);
       return { data: [] };
     }
   },

   /**
    * Get products for a specific seller
    */
   async getProducts(sellerId) {
     // Return mock data if enabled
     if (USE_MOCK_API) {
       await delay(400); // Simulate network delay
       return { data: [...(MOCK_DATA.products[sellerId] || [])] };
     }

     try {
       const db = this.db;
       if (!db) throw new Error('Database not initialized');
       
       const q = query(
         collection(db, 'products'),
         where('sellerId', '==', sellerId)
       );
       const snapshot = await getDocs(q);
       
       return { data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
     } catch (error) {
       console.error('Error fetching products:', error);
       return { data: [] };
     }
   },

   /**
    * Get popular products for home screen
    */
   async getPopularProducts(limitCount = 6) {
     // Return mock data if enabled
     if (USE_MOCK_API) {
       await delay(300); // Simulate network delay
       
       // Flatten all products and take first limitCount items
       const allProducts = Object.values(MOCK_DATA.products).flat();
       return [...allProducts.slice(0, limitCount)];
     }

     try {
       const db = this.db;
       if (!db) throw new Error('Database not initialized');
       
       const q = query(
         collection(db, 'products'),
         limit(limitCount)
       );
       const snapshot = await getDocs(q);
       
       return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
     } catch (error) {
       console.error('Error fetching popular products:', error);
       return [];
     }
   },

   /**
    * Get orders for current user
    */
   async getMyOrders() {
     // Return mock data if enabled
     if (USE_MOCK_API) {
       await delay(400); // Simulate network delay
       return [...MOCK_DATA.orders];
     }

     try {
       const auth = window.auth;
       if (!auth?.currentUser) {
         throw new Error('User not authenticated');
       }
       
       const db = this.db;
       if (!db) throw new Error('Database not initialized');
       
       const q = query(
         collection(db, 'orders'),
         where('customerId', '==', auth.currentUser.uid),
         orderBy('createdAt', 'desc')
       );
       const snapshot = await getDocs(q);
       
       return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
     } catch (error) {
       console.error('Error fetching orders:', error);
       return [];
     }
   },

   /**
    * Get user profile
    */
   async getProfile() {
     // Return mock data if enabled
     if (USE_MOCK_API) {
       await delay(300); // Simulate network delay
       return { ...MOCK_DATA.profile };
     }

     try {
       const auth = window.auth;
       if (!auth?.currentUser) {
         throw new Error('User not authenticated');
       }
       
       const db = this.db;
       if (!db) throw new Error('Database not initialized');
       
       const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
       const userDocRef = doc(db, 'users', auth.currentUser.uid);
       const userSnap = await getDoc(userDocRef);
       
       if (userSnap.exists()) {
         return { id: userSnap.id, ...userSnap.data() };
       }
       return null;
     } catch (error) {
       console.error('Error fetching profile:', error);
       return null;
     }
   },

  getCategoryIcon(category) {
    const icons = {
      food: 'restaurant',
      dairy: 'water_drop',
      fruits: 'nutrition',
      groceries: 'shopping_basket',
      bakery: 'bakery_dining'
    };
    return icons[category] || 'store';
  }
};

// Make DataService available globally
window.DataService = DataService;

// ES Module export
export { DataService };
export default DataService;