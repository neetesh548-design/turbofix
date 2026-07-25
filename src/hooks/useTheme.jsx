/* eslint-disable react/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Single source of truth for theme state.
 *
 * This replaces the former duplicate `useTheme.js`, which shadowed this file
 * (Vite resolves `.js` before `.jsx`) and shipped a no-op ThemeProvider plus a
 * different return shape — `ThemeToggle` destructured `theme` from it and always
 * got `undefined`.
 *
 * Storage key is `tf_theme` to stay in sync with `getAntDTheme()` in
 * src/config/antd-theme.js, which reads the same key.
 */

const STORAGE_KEY = 'tf_theme';

const ThemeContext = createContext(null);

function readInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage can throw in private mode / sandboxed iframes
  }

  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // matchMedia may be unavailable in non-browser environments
  }

  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Persistence is best-effort; the attribute above is what drives styling.
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value = {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
