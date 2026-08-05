/**
 * SmartSoko Data Service
 * Provides client-side Firestore access using Firebase Modular SDK v9
 */

import { collection, query, where, getDocs, limit, orderBy, getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { db as importedDb } from '../config/firebase-config.js?v=3';

const DataService = {
  // Get Firestore db reference (prefer imported db, fallback to window.db)
  get db() {
    return importedDb || window.db || null;
  },

  /**
   * Get all categories with seller counts
   */
  async getCategories() {
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
    const { category, search, limit: limitCount = 20 } = options;
    const db = this.db;
    
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    try {
      // Build query using Modular SDK
      const constraints = [where('isOpen', '==', true), limit(50)];
      
      if (category) {
        constraints.push(where('category', '==', category));
      }
      
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
      throw new Error('Failed to load sellers. Please check your internet connection.');
    }
  },

  /**
   * Get products for a specific seller
   */
  async getProducts(sellerId) {
    const db = this.db;
    if (!db) throw new Error('Database not initialized');
    
    try {
      const q = query(
        collection(db, 'products'),
        where('sellerId', '==', sellerId),
        where('isAvailable', '==', true)
      );
      const snapshot = await getDocs(q);
      
      return { data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  /**
   * Get popular products for home screen
   */
  async getPopularProducts(limitCount = 6) {
    const db = this.db;
    if (!db) throw new Error('Database not initialized');
    
    try {
      const q = query(
        collection(db, 'products'),
        where('isAvailable', '==', true),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching popular products:', error);
      throw error;
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
