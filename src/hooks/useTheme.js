/**
 * useTheme Hook
 * Provides access to theme state and toggle functionality
 * Integrates with localStorage and Ant Design theme
 */

import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('tf_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = (dark) => {
    const newTheme = dark !== undefined ? dark : !isDark;
    setIsDark(newTheme);
    localStorage.setItem('tf_theme', newTheme ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return {
    isDark,
    toggleTheme,
    currentTheme: isDark ? 'dark' : 'light',
  };
};

// ThemeProvider component (for compatibility with existing code)
// Theme management is now handled by AntDProvider
export const ThemeProvider = ({ children }) => {
  return children;
};
