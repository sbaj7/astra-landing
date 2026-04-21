// Extensions.js - Utility functions and React equivalents for Swift extensions

// Custom Shape equivalent - RoundedCorner
export const RoundedCorner = ({ 
  radius = 20, 
  corners = 'all', 
  children, 
  className = '', 
  style = {} 
}) => {
  const getBorderRadius = () => {
    if (corners === 'all') {
      return `${radius}px`;
    }
    
    const cornerMap = {
      'top': `${radius}px ${radius}px 0 0`,
      'bottom': `0 0 ${radius}px ${radius}px`,
      'left': `${radius}px 0 0 ${radius}px`,
      'right': `0 ${radius}px ${radius}px 0`,
      'topLeft': `${radius}px 0 0 0`,
      'topRight': `0 ${radius}px 0 0`,
      'bottomLeft': `0 0 0 ${radius}px`,
      'bottomRight': `0 0 ${radius}px 0`
    };
    
    return cornerMap[corners] || `${radius}px`;
  };

  return (
    <div 
      className={className}
      style={{
        ...style,
        borderRadius: getBorderRadius(),
        overflow: 'hidden'
      }}
    >
      {children}
    </div>
  );
};

// React hook equivalent for cornerRadius view modifier
export const useCornerRadius = (radius, corners = 'all') => {
  const getBorderRadius = () => {
    if (corners === 'all') {
      return `${radius}px`;
    }
    
    const cornerMap = {
      'top': `${radius}px ${radius}px 0 0`,
      'bottom': `0 0 ${radius}px ${radius}px`,
      'left': `${radius}px 0 0 ${radius}px`,
      'right': `0 ${radius}px ${radius}px 0`,
      'topLeft': `${radius}px 0 0 0`,
      'topRight': `0 ${radius}px 0 0`,
      'bottomLeft': `0 0 0 ${radius}px`,
      'bottomRight': `0 0 ${radius}px 0`
    };
    
    return cornerMap[corners] || `${radius}px`;
  };

  return {
    borderRadius: getBorderRadius(),
    overflow: 'hidden'
  };
};

// String Utilities
/**
 * A very simple function that just passes through the content for now
 * This helps us isolate if this function is causing issues
 */
export const tightenCitations = (md) => {
  // For debugging
  console.log(`DEBUG: tightenCitations called with string of length ${md.length}`);
  
  // Just return the original string as-is for now, to isolate any issues
  return md;
};

// Additional utility functions

// Debounce utility
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle utility
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Color utility functions
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Add alpha to hex color
export const addAlphaToHex = (hex, alpha) => {
  const alphaValue = Math.round(alpha * 255);
  const alphaHex = alphaValue.toString(16).padStart(2, '0');
  return hex + alphaHex;
};

// Animation utilities
export const easeInOut = (t) => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

export const easeOut = (t) => {
  return 1 - Math.pow(1 - t, 3);
};

export const easeIn = (t) => {
  return t * t * t;
};

// Format utilities
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
};

export const formatRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return formatDate(date, { year: 'numeric', month: 'short', day: 'numeric' });
  }
};

// Text utilities
export const truncateText = (text, maxLength, suffix = '...') => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
};

export const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const camelToKebab = (str) => {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
};

// Validation utilities
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Local storage utilities with error handling
export const safeLocalStorage = {
  getItem: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to get item from localStorage: ${key}`, error);
      return defaultValue;
    }
  },
  
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to set item in localStorage: ${key}`, error);
      return false;
    }
  },
  
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove item from localStorage: ${key}`, error);
      return false;
    }
  }
};

// Platform detection
export const platform = {
  isMobile: () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  isIOS: () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },
  
  isAndroid: () => {
    return /Android/.test(navigator.userAgent);
  },
  
  isSafari: () => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  },
  
  isChrome: () => {
    return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  }
};

export default {
  RoundedCorner,
  useCornerRadius,
  tightenCitations,
  debounce,
  throttle,
  hexToRgb,
  rgbToHex,
  addAlphaToHex,
  easeInOut,
  easeOut,
  easeIn,
  formatDate,
  formatRelativeTime,
  truncateText,
  capitalizeFirst,
  camelToKebab,
  isValidEmail,
  isValidUrl,
  safeLocalStorage,
  platform
};