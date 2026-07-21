import { useCallback, useState } from 'react';

export const DASHBOARD_LAYOUT_STORAGE_KEY = 'dashboard-layout-v2';

function readStoredLayout(defaultLayout) {
  try {
    const saved = localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    if (!saved) return defaultLayout;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return defaultLayout;
    const expectedIds = new Set(defaultLayout.map((item) => item.id));
    if (parsed.length !== defaultLayout.length || parsed.some((item) => !item || !expectedIds.has(item.id))) {
      return defaultLayout;
    }
    return parsed;
  } catch {
    return defaultLayout;
  }
}

export function useWidgetLayout(defaultLayout = []) {
  const [layout, setLayout] = useState(() => readStoredLayout(defaultLayout));

  const saveLayout = useCallback((newLayout) => {
    setLayout(newLayout);
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(newLayout));
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(defaultLayout);
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(defaultLayout));
  }, [defaultLayout]);

  return { layout, saveLayout, resetLayout };
}
