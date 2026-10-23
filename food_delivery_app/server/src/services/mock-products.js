/**
 * Mock product data for development/demo mode
 * Used when the database is unavailable
 */

const MOCK_PRODUCTS = [
  {
    id: 'prod-001',
    name: 'Fresh Milk 1L',
    description: 'Fresh full-cream milk delivered daily',
    price: 4500,
    originalPrice: 5000,
    unit: 'per litre',
    category: 'dairy',
    sellerName: 'Fresh Dairy Farm',
    rating: 4.8,
    reviewCount: 156,
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=60',
    stockQuantity: 50,
    isAvailable: true,
    popular: true
  },
  {
    id: 'prod-002',
    name: 'Fresh Bread Loaf',
    description: 'Soft white bread, freshly baked',
    price: 3000,
    originalPrice: 3500,
    unit: 'per loaf',
    category: 'bakery',
    sellerName: 'Daily Bread',
    rating: 4.9,
    reviewCount: 234,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=60',
    stockQuantity: 30,
    isAvailable: true,
    popular: true
  },
  {
    id: 'prod-003',
    name: 'Tomatoes 1kg',
    description: 'Fresh red tomatoes, ripe and juicy',
    price: 5000,
    unit: 'per kg',
    category: 'vegetables',
    sellerName: 'Green Market',
    rating: 4.5,
    reviewCount: 89,
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=60',
    stockQuantity: 100,
    isAvailable: true,
    popular: false
  },
  {
    id: 'prod-004',
    name: 'Bananas 1kg',
    description: 'Ripe sweet bananas',
    price: 4000,
    unit: 'per kg',
    category: 'fruits',
    sellerName: 'Fresh Fruit Market',
    rating: 4.7,
    reviewCount: 145,
    image: 'https://images.unsplash.com/photo-1571771896612-61870f013794?auto=format&fit=crop&w=400&q=60',
    stockQuantity: 80,
    isAvailable: true,
    popular: true
  },
  {
    id: 'prod-005',
    name: 'Chicken Breast 500g',
    description: 'Fresh chicken breast, boneless',
    price: 12000,
    originalPrice: 15000,
    unit: 'per 500g',
    category: 'meat',
    sellerName: 'Fresh Meat Market',
    rating: 4.6,
    reviewCount: 67,
    image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=400&q=60',
    stockQuantity: 40,
    isAvailable: true,
    popular: false
  },
  {
    id: 'prod-006',
    name: 'Rice 5kg',
    description: 'Premium quality basmati rice',
    price: 25000,
    originalPrice: 30000,
    unit: 'per 5kg',
    category: 'groceries',
    sellerName: 'Grain Store',
    rating: 4.8,
    reviewCount: 198,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=60',
    stockQuantity: 25,
    isAvailable: true,
    popular: true
  },
  {
    id: 'prod-007',
    name: 'Eggs Dozen',
    description: 'Farm fresh brown eggs',
    price: 7000,
    originalPrice: 8000,
    unit: 'per dozen',
    category: 'dairy',
    sellerName: 'Fresh Dairy Farm',
    rating: 4.7,
    reviewCount: 178,
    image: 'https://images.unsplash.com/photo-1587486913049-53fc889801fc?auto=format&fit=crop&w=400&q=60',
    stockQuantity: 60,
    isAvailable: true,
    popular: false
  },
  {
    id: 'prod-008',
    name: 'Carrots 1kg',
    description: 'Fresh crunchy carrots',
    price: 3500,
    unit: 'per kg',
    category: 'vegetables',
    sellerName: 'Green Market',
    rating: 4.4,
    reviewCount: 56,
    image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=400&q=60',
    stockQuantity: 90,
    isAvailable: true,
    popular: false
  }
];

module.exports = { MOCK_PRODUCTS };
