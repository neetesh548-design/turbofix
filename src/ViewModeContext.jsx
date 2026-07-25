/* eslint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

const ViewModeContext = createContext();

export const ViewModeProvider = ({ children }) => {
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('turbofix_view_mode') || 'full'; // 'mvp' or 'full'
  });

  useEffect(() => {
    localStorage.setItem('turbofix_view_mode', viewMode);
  }, [viewMode]);

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'mvp' ? 'full' : 'mvp');
  };

  const isMvpMode = viewMode === 'mvp';
  const isFullMode = viewMode === 'full';

  return (
    <ViewModeContext.Provider value={{
      viewMode,
      setViewMode,
      toggleViewMode,
      isMvpMode,
      isFullMode
    }}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within ViewModeProvider');
  }
  return context;
};
