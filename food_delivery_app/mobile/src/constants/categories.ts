/**
 * Category Constants
 * Reused from web app data-service.js
 */

import { CategoryInfo } from '@/types/models';

export const CATEGORIES: CategoryInfo[] = [
  {
    name: 'fishing',
    displayName: 'Fishing',
    icon: 'set_meal',
    color: '#4a90a4',
  },
  {
    name: 'fruits',
    displayName: 'Fruits',
    icon: 'nutrition',
    color: '#e07b39',
  },
  {
    name: 'dairy',
    displayName: 'Dairy',
    icon: 'local_cafe',
    color: '#5d8aa8',
  },
  {
    name: 'vegetables',
    displayName: 'Vegetables',
    icon: 'eco',
    color: '#6b8e23',
  },
  {
    name: 'bakery',
    displayName: 'Bakery',
    icon: 'bakery_dining',
    color: '#c17b5f',
  },
  {
    name: 'honey',
    displayName: 'Honey & Spices',
    icon: 'opacity',
    color: '#daa520',
  },
  {
    name: 'artisan',
    displayName: 'Artisan',
    icon: 'handyman',
    color: '#8b7355',
  },
  {
    name: 'food',
    displayName: 'Restaurants',
    icon: 'restaurant',
    color: '#012d1d',
  },
  {
    name: 'groceries',
    displayName: 'Groceries',
    icon: 'shopping_basket',
    color: '#2d5016',
  },
];

export const getCategoryByName = (name: string): CategoryInfo | undefined => {
  return CATEGORIES.find((cat) => cat.name === name);
};

export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    food: 'restaurant',
    dairy: 'water_drop',
    fruits: 'nutrition',
    groceries: 'shopping_basket',
    bakery: 'bakery_dining',
    vegetables: 'eco',
    fishing: 'set_meal',
    honey: 'opacity',
    artisan: 'handyman',
  };
  return icons[category] || 'store';
};

export const getCategoryColor = (category: string): string => {
  const cat = CATEGORIES.find((c) => c.name === category);
  return cat?.color || '#012d1d';
};
