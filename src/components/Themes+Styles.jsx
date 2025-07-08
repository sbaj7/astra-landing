import React, { useState, useEffect, createContext, useContext } from 'react';

// MARK: - Hex Color Utilities
const hexToRgb = (hex) => {
  // Remove # if present and clean up
  const cleanHex = hex.replace(/[^0-9A-Fa-f]/g, '');
  let r, g, b, a = 255;
  
  switch (cleanHex.length) {
    case 3: // #RGB
      r = parseInt(cleanHex[0] + cleanHex[0], 16);
      g = parseInt(cleanHex[1] + cleanHex[1], 16);
      b = parseInt(cleanHex[2] + cleanHex[2], 16);
      break;
    case 6: // #RRGGBB
      r = parseInt(cleanHex.substring(0, 2), 16);
      g = parseInt(cleanHex.substring(2, 4), 16);
      b = parseInt(cleanHex.substring(4, 6), 16);
      break;
    case 8: // #AARRGGBB
      a = parseInt(cleanHex.substring(0, 2), 16);
      r = parseInt(cleanHex.substring(2, 4), 16);
      g = parseInt(cleanHex.substring(4, 6), 16);
      b = parseInt(cleanHex.substring(6, 8), 16);
      break;
    default:
      return { r: 0, g: 0, b: 0, a: 255 };
  }
  
  return { r, g, b, a };
};

const rgbToHex = (r, g, b, a = 255) => {
  const toHex = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return a < 255 
    ? `#${toHex(a)}${toHex(r)}${toHex(g)}${toHex(b)}`
    : `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// MARK: - Color System (matching Swift exactly)
const colorDefinitions = {
  light: {
    backgroundPrimary: "#FAFAF9",
    backgroundSurface: "#FEFEFE",
    textPrimary: "#2A2A2A",
    textSecondary: "#5A6169",
    buttonPrimary: "#2D3843", // Darker in light mode
    buttonSecondary: "#D8DCE1", // More contrast
    callToAction: "#495A6B", // Darker for better visibility
    accentSoftBlue: "#4A6B7D", // More muted in light
    errorColor: "#D92D20",
    successColor: "#12B76A",
    grayPrimary: "#8B8B8B"
  },
  dark: {
    backgroundPrimary: "#121417",
    backgroundSurface: "#1C1F23",
    textPrimary: "#F9FAFB",
    textSecondary: "#A0AAB4",
    buttonPrimary: "#3A4A58",
    buttonSecondary: "#38424D",
    callToAction: "#9BA8B3",
    accentSoftBlue: "#8FA5B5",
    errorColor: "#F97066",
    successColor: "#32D583",
    grayPrimary: "#8B8B8B"
  }
};

// MARK: - Color Creation Function (matching Swift Color init)
const createColor = (lightHex, darkHex, isDark = false) => {
  return isDark ? darkHex : lightHex;
};

// MARK: - Theme Context
const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// MARK: - Theme Provider Component
export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);

    const handleChange = (e) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => setIsDark(!isDark);
  
  const colors = isDark ? colorDefinitions.dark : colorDefinitions.light;

  const value = {
    isDark,
    colors,
    toggleTheme,
    // Additional utility functions
    hexToRgb,
    rgbToHex,
    createColor: (light, dark) => createColor(light, dark, isDark)
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// MARK: - Color Extensions (matching Swift static colors)
export const Colors = {
  // Static color getters that automatically adapt to theme
  backgroundPrimary: (isDark = false) => createColor("#FAFAF9", "#121417", isDark),
  backgroundSurface: (isDark = false) => createColor("#FEFEFE", "#1C1F23", isDark),
  textPrimary: (isDark = false) => createColor("#2A2A2A", "#F9FAFB", isDark),
  textSecondary: (isDark = false) => createColor("#5A6169", "#A0AAB4", isDark),
  buttonPrimary: (isDark = false) => createColor("#2D3843", "#3A4A58", isDark),
  buttonSecondary: (isDark = false) => createColor("#D8DCE1", "#38424D", isDark),
  callToAction: (isDark = false) => createColor("#495A6B", "#9BA8B3", isDark),
  accentSoftBlue: (isDark = false) => createColor("#4A6B7D", "#8FA5B5", isDark),
  errorColor: (isDark = false) => createColor("#D92D20", "#F97066", isDark),
  successColor: (isDark = false) => createColor("#12B76A", "#32D583", isDark),
  grayPrimary: (isDark = false) => createColor("#8B8B8B", "#8B8B8B", isDark)
};

// MARK: - Theme Hook (simpler version for direct use)
export const useColors = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);

    const handleChange = (e) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDark ? colorDefinitions.dark : colorDefinitions.light;
};

// MARK: - CSS Custom Properties Generator
export const generateCSSCustomProperties = (isDark = false) => {
  const colors = isDark ? colorDefinitions.dark : colorDefinitions.light;
  
  const cssProperties = Object.entries(colors).reduce((acc, [key, value]) => {
    // Convert camelCase to kebab-case for CSS custom properties
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    acc[`--color-${cssKey}`] = value;
    return acc;
  }, {});

  return cssProperties;
};

// MARK: - Style Generator Utility
export const createThemedStyles = (styleFunction) => {
  return (isDark = false) => {
    const colors = isDark ? colorDefinitions.dark : colorDefinitions.light;
    return styleFunction(colors);
  };
};

// MARK: - Color Utility Functions
export const colorUtils = {
  // Add opacity to any color
  withOpacity: (color, opacity) => {
    const rgb = hexToRgb(color);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  },

  // Lighten a color
  lighten: (color, amount = 0.1) => {
    const rgb = hexToRgb(color);
    const factor = 1 + amount;
    return rgbToHex(
      Math.min(255, rgb.r * factor),
      Math.min(255, rgb.g * factor),
      Math.min(255, rgb.b * factor)
    );
  },

  // Darken a color
  darken: (color, amount = 0.1) => {
    const rgb = hexToRgb(color);
    const factor = 1 - amount;
    return rgbToHex(
      Math.max(0, rgb.r * factor),
      Math.max(0, rgb.g * factor),
      Math.max(0, rgb.b * factor)
    );
  },

  // Check if color is dark
  isDark: (color) => {
    const rgb = hexToRgb(color);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness < 128;
  },

  // Get contrasting text color
  getContrastColor: (backgroundColor) => {
    return colorUtils.isDark(backgroundColor) ? '#FFFFFF' : '#000000';
  }
};

// MARK: - Theme CSS Class Generator
export const getThemeClassName = (isDark) => {
  return isDark ? 'theme-dark' : 'theme-light';
};

// MARK: - Global CSS Generator (for injection into head)
export const generateGlobalCSS = (isDark = false) => {
  const colors = isDark ? colorDefinitions.dark : colorDefinitions.light;
  const className = getThemeClassName(isDark);
  
  return `
    .${className} {
      ${Object.entries(colors).map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `--color-${cssKey}: ${value};`;
      }).join('\n      ')}
    }
    
    .${className} body {
      background-color: ${colors.backgroundPrimary};
      color: ${colors.textPrimary};
    }
  `;
};

// MARK: - Default Export
export default {
  ThemeProvider,
  useTheme,
  useColors,
  Colors,
  colorUtils,
  generateCSSCustomProperties,
  createThemedStyles,
  getThemeClassName,
  generateGlobalCSS,
  hexToRgb,
  rgbToHex
};