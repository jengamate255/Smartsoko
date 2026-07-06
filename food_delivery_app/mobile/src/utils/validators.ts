/**
 * Input Validation Utilities
 */

export const validators = {
  // Email validation
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Password validation (min 8 characters with complexity)
  password: (password: string): { valid: boolean; message?: string } => {
    if (password == null || password.length === 0) {
      return { valid: false, message: 'Password is required' };
    }
    
    // Prevent excessively long passwords that could cause DoS
    if (password.length > 128) {
      return { valid: false, message: 'Password is too long (maximum 128 characters)' };
    }
    
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    
    // Check for character variety to prevent weak passwords
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#\$&*~.,?]/.test(password);
    
    let score = 0;
    if (hasUpperCase) score++;
    if (hasLowerCase) score++;
    if (hasNumbers) score++;
    if (hasSpecialChars) score++;
    
    // Require at least 3 different character types
    if (score < 3) {
      return { valid: false, message: 'Password must contain at least 3 of: uppercase, lowercase, number, special character' };
    }
    
    // Prevent common weak patterns
    const lowerPassword = password.toLowerCase();
    const weakPatterns = [
      'password',
      '123456',
      '12345678',
      'qwerty',
      'abc123',
      'password1',
      'smartsoko',
      'admin',
      'welcome',
      'login',
      'user',
      'guest'
    ];
    
    for (const pattern of weakPatterns) {
      if (lowerPassword.includes(pattern)) {
        return { valid: false, message: 'Password is too common; please choose a stronger password' };
      }
    }
    
    // Prevent sequences
    const sequences = [
      '0123456789',
      '1234567890',
      'abcdefghijklmnopqrstuvwxyz',
      'zyxwvutsrqponmlkjihgfedcba'
    ];
    
    for (const sequence in sequences) {
      if (lowerPassword.includes(sequence)) {
        return { valid: false, message: 'Password contains sequential characters; please choose a more complex password' };
      }
    }
    
    return { valid: true };
  },

  // Required field
  required: (value: string): boolean => {
    return value.trim().length > 0;
  },

  // Phone number (Tanzania format)
  phone: (phone: string): boolean => {
    const tzPhoneRegex = /^(?:\+255|0)?[67]\d{8}$/;
    return tzPhoneRegex.test(phone);
  },

  // Name validation
  name: (name: string): { valid: boolean; message?: string } => {
    if (!name || name.trim().length === 0) {
      return { valid: false, message: 'Name is required' };
    }
    
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return { valid: false, message: 'Name must be at least 2 characters' };
    }
    
    if (trimmed.length > 50) {
      return { valid: false, message: 'Name must not exceed 50 characters' };
    }
    
    // Allow letters, spaces, hyphens, and apostrophes
    // This prevents injection attacks by restricting to safe characters only
    const nameRegex = /^[a-zA-Z\s\-\']+$/;
    if (!nameRegex.test(trimmed)) {
      return { valid: false, message: 'Name can only contain letters, spaces, hyphens and apostrophes' };
    }
    
    // Additional security: prevent names that could be used for injection
    const lowerValue = trimmed.toLowerCase();
    const suspiciousPatterns = [
      'script',
      'javascript',
      'onload',
      'onerror',
      'onclick',
      'onmouseover',
      '<',
      '>',
      '&',
      '"',
      '\'',
      '\\',
      '--',
      '/*',
      '*/',
      'drop',
      'union',
      'select',
      'insert',
      'update',
      'delete',
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (lowerValue.includes(pattern)) {
        return { valid: false, message: 'Name contains invalid characters' };
      }
    }
    
    return { valid: true };
  },

  // Price validation
  price: (price: number): boolean => {
    return price > 0 && !isNaN(price);
  },

  // Quantity validation
  quantity: (qty: number, max?: number): boolean => {
    if (qty < 1) return false;
    if (max && qty > max) return false;
    return true;
  },
};

export interface ValidationError {
  field: string;
  message: string;
}

export const validateLoginForm = (email: string, password: string): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!validators.email(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return errors;
};

export const validateSignupForm = (
  email: string,
  password: string,
  fullName: string,
  phone?: string
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!validators.email(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email' });
  }

  const passwordCheck = validators.password(password);
  if (!passwordCheck.valid) {
    errors.push({ field: 'password', message: passwordCheck.message || 'Invalid password' });
  }

  if (!validators.required(fullName)) {
    errors.push({ field: 'fullName', message: 'Full name is required' });
  }

  if (phone && !validators.phone(phone)) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
  }

  return errors;
};

export const validateAddress = (address: {
  street?: string;
  city?: string;
  phone?: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!validators.required(address.street || '')) {
    errors.push({ field: 'street', message: 'Street address is required' });
  }

  if (!validators.required(address.city || '')) {
    errors.push({ field: 'city', message: 'City is required' });
  }

  if (address.phone && !validators.phone(address.phone)) {
    errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
  }

  return errors;
};
