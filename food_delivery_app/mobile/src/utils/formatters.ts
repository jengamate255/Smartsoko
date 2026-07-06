/**
 * Formatting Utilities
 * Adapted from web app utils
 */

// Format currency (TZS default for Tanzania market)
export const formatCurrency = (amount: number, currency: string = 'TZS'): string => {
  return `${currency} ${amount.toLocaleString('en-US')}`;
};

// Format currency without decimals
export const formatCurrencyCompact = (amount: number, currency: string = 'TZS'): string => {
  if (amount >= 1000000) {
    return `${currency} ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${currency} ${(amount / 1000).toFixed(1)}K`;
  }
  return `${currency} ${amount}`;
};

// Format date
export const formatDate = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
};

// Format time
export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(d);
};

// Format delivery time range
export const formatDeliveryTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
};

// Calculate distance between two points (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

const toRad = (deg: number): number => {
  return (deg * Math.PI) / 180;
};

// Format distance
export const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

// Format rating
export const formatRating = (rating: number): string => {
  return rating.toFixed(1);
};

// Generate order ID
export const generateOrderId = (): string => {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Format phone number (Tanzania format)
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Convert to international format if needed
  if (cleaned.startsWith('0')) {
    return '+255' + cleaned.substring(1);
  }
  if (cleaned.startsWith('7')) {
    return '+255' + cleaned;
  }
  return cleaned;
};

// Validate phone number (Tanzania format)
export const validatePhoneNumber = (phone: string): boolean => {
  const tzPhoneRegex = /^(?:\+255|0)?[67]\d{8}$/;
  return tzPhoneRegex.test(phone);
};

// Format category name
export const formatCategoryName = (category: string): string => {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
