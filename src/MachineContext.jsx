/* eslint-disable react/only-export-components */
import React, { createContext, useContext, useState } from 'react';

const MachineContext = createContext(null);

export function MachineProvider({ children }) {
  const [selectedMachineId, setSelectedMachineIdState] = useState(() => {
    try {
      return localStorage.getItem('tf_active_machine') || 'all';
    } catch {
      return 'all';
    }
  });

  const [selectedLine, setSelectedLineState] = useState(() => {
    try {
      return localStorage.getItem('tf_active_line') || 'all';
    } catch {
      return 'all';
    }
  });

  const setSelectedMachineId = (id) => {
    const val = id || 'all';
    setSelectedMachineIdState(val);
    try {
      localStorage.setItem('tf_active_machine', val);
    } catch {}
  };

  const setSelectedLine = (line) => {
    const val = line || 'all';
    setSelectedLineState(val);
    try {
      localStorage.setItem('tf_active_line', val);
    } catch {}
  };

  const clearMachineContext = () => {
    setSelectedMachineIdState('all');
    setSelectedLineState('all');
    try {
      localStorage.removeItem('tf_active_machine');
      localStorage.removeItem('tf_active_line');
    } catch {}
  };

  return (
    <MachineContext.Provider
      value={{
        selectedMachineId,
        setSelectedMachineId,
        selectedLine,
        setSelectedLine,
        clearMachineContext,
        isFiltered: selectedMachineId !== 'all' || selectedLine !== 'all',
      }}
    >
      {children}
    </MachineContext.Provider>
  );
}

export function useMachineContext() {
  const context = useContext(MachineContext);
  if (!context) {
    // Fallback default context if used outside provider
    return {
      selectedMachineId: 'all',
      setSelectedMachineId: () => {},
      selectedLine: 'all',
      setSelectedLine: () => {},
      clearMachineContext: () => {},
      isFiltered: false,
    };
  }
  return context;
}

export default MachineContext;
