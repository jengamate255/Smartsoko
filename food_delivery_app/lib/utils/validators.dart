class Validators {
  static String? validatePhone(String? value, {bool allowInternational = false}) {
    if (value == null || value.isEmpty) {
      return 'Phone number is required';
    }
    
    // Remove all spaces, dashes, and parentheses for validation
    final cleaned = value.replaceAll(RegExp(r'[\s\-\(\)]'), '');
    
    if (allowInternational) {
      // International format: + followed by country code and number
      final internationalRegex = RegExp(r'^\+[1-9]\d{1,14}$');
      if (internationalRegex.hasMatch(cleaned)) {
        return null;
      }
    }
    
    // Tanzanian format: starts with 07, 06, or 05 followed by 8 digits (9 digits total after 0)
    // Or with country code: +255 followed by 9 digits
    final tanzanianRegex = RegExp(r'^(0[567]\d{8}|\+255[567]\d{8})$');
    if (tanzanianRegex.hasMatch(cleaned)) {
      return null;
    }
    
    return 'Please enter a valid Tanzanian phone number (e.g., 07XXXXXXXX or +2557XXXXXXXX)';
  }
  
  static String? validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }
    
    // More robust email regex
    final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
    if (!emailRegex.hasMatch(value)) {
      return 'Please enter a valid email address';
    }
    
    return null;
  }
  
  static String? validateRequired(String? value, String fieldName) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName is required';
    }
    return null;
  }
  
  static String? validateAmount(String? value) {
    if (value == null || value.isEmpty) {
      return 'Amount is required';
    }
    
    // Remove currency symbols and commas
    final cleaned = value.replaceAll(RegExp(r'[^\d\.]'), '');
    final amount = double.tryParse(cleaned);
    
    if (amount == null) {
      return 'Please enter a valid amount';
    }
    
    if (amount <= 0) {
      return 'Amount must be greater than zero';
    }
    
    // Check for reasonable maximum (e.g., 1,000,000 for a food delivery app)
    if (amount > 1000000) {
      return 'Amount seems too high';
    }
    
    return null;
  }
  
  static String? validatePassword(String? value, {int minLength = 8, bool requireComplexity = true}) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    
    // Prevent excessively long passwords that could cause DoS
    if (value.length > 128) {
      return 'Password is too long (maximum 128 characters)';
    }
    
    if (value.length < minLength) {
      return 'Password must be at least $minLength characters long';
    }
    
    if (requireComplexity) {
      // Check for character variety to prevent weak passwords
      bool hasUpperCase = value.contains(RegExp(r'[A-Z]'));
      bool hasLowerCase = value.contains(RegExp(r'[a-z]'));
      bool hasNumbers = value.contains(RegExp(r'[0-9]'));
      bool hasSpecialChars = value.contains(RegExp(r'[!@#\$&*~.,?]'));
      
      int score = 0;
      if (hasUpperCase) score++;
      if (hasLowerCase) score++;
      if (hasNumbers) score++;
      if (hasSpecialChars) score++;
      
      // Require at least 3 different character types
      if (score < 3) {
        return 'Password must contain at least 3 of: uppercase, lowercase, number, special character';
      }
      
      // Prevent common weak patterns
      final lowerValue = value.toLowerCase();
      final weakPatterns = [
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
      
      for (final pattern in weakPatterns) {
        if (lowerValue.contains(pattern)) {
          return 'Password is too common; please choose a stronger password';
        }
      }
      
      // Prevent sequences
      final sequences = [
        '0123456789',
        '1234567890',
        'abcdefghijklmnopqrstuvwxyz',
        'zyxwvutsrqponmlkjihgfedcba'
      ];
      
      for (final sequence in sequences) {
        if (lowerValue.contains(sequence)) {
          return 'Password contains sequential characters; please choose a more complex password';
        }
      }
    }
    
    return null;
  }
  
  static String? validateName(String? value, {int minLength = 2, int maxLength = 50}) {
    if (value == null || value.isEmpty) {
      return 'Name is required';
    }
    
    final trimmed = value.trim();
    if (trimmed.length < minLength) {
      return 'Name must be at least $minLength characters long';
    }
    
    if (trimmed.length > maxLength) {
      return 'Name must not exceed $maxLength characters';
    }
    
    // Allow letters, spaces, hyphens, and apostrophes
    // This prevents injection attacks by restricting to safe characters only
    final nameRegex = RegExp(r"^[a-zA-Z\s\-\']+$");
    if (!nameRegex.hasMatch(trimmed)) {
      return 'Name can only contain letters, spaces, hyphens and apostrophes';
    }
    
    // Additional security: prevent names that could be used for injection
    final lowerValue = trimmed.toLowerCase();
    final suspiciousPatterns = [
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
    
    for (final pattern in suspiciousPatterns) {
      if (lowerValue.contains(pattern)) {
        return 'Name contains invalid characters';
      }
    }
    
    return null;
  }
  
  static String? validateAddress(String? value, {int minLength = 10}) {
    if (value == null || value.isEmpty) {
      return 'Address is required';
    }
    
    final trimmed = value.trim();
    if (trimmed.length < minLength) {
      return 'Please enter a complete address (minimum $minLength characters)';
    }
    
    return null;
  }
  
  static String? validateUrl(String? value) {
    if (value == null || value.isEmpty) {
      return 'URL is required';
    }
    
    // Basic URL validation
    final urlRegex = RegExp(r'^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)$');
    if (!urlRegex.hasMatch(value)) {
      return 'Please enter a valid URL';
    }
    
    return null;
  }
  
  static String? validatePin(String? value, {int length = 4}) {
    if (value == null || value.isEmpty) {
      return 'PIN is required';
    }
    
    if (value.length != length) {
      return 'PIN must be exactly $length digits';
    }
    
    final pinPattern = RegExp('^[0-9]{$length}\$');
    if (!pinPattern.hasMatch(value)) {
      return 'PIN must contain only digits';
    }
    
    return null;
  }
}
