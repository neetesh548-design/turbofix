import { useState, useCallback, useEffect } from 'react';
import { ChevronDown, X, Save } from 'lucide-react';

export function FilterPanel({
  filters,
  onFilterChange,
  onSavePreset,
  savedPresets = []
}) {
  const [activeFilters, setActiveFilters] = useState({});
  const [showSaved, setShowSaved] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleFilterChange = useCallback((filterId, values) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: values
    }));
    onFilterChange?.(filterId, values);
  }, [onFilterChange]);

  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset?.({
        name: presetName,
        filters: { ...activeFilters }
      });
      setPresetName('');
    }
  };

  const handleLoadPreset = (preset) => {
    setActiveFilters(preset.filters);
    Object.entries(preset.filters).forEach(([filterId, values]) => {
      onFilterChange?.(filterId, values);
    });
  };

  const handleClearAll = () => {
    setActiveFilters({});
    filters.forEach(filter => {
      onFilterChange?.(filter.id, []);
    });
  };

  const activeCount = Object.values(activeFilters).flat().length;

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h3>Filters {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}</h3>
        {activeCount > 0 && (
          <button onClick={handleClearAll} className="filter-clear">
            Clear all
          </button>
        )}
      </div>

      <div className="filter-groups">
        {filters.map((filter) => (
          <FilterGroup
            key={filter.id}
            filter={filter}
            selected={activeFilters[filter.id] || []}
            onChange={(values) => handleFilterChange(filter.id, values)}
          />
        ))}
      </div>

      <div className="filter-presets">
        <button
          onClick={() => setShowSaved(!showSaved)}
          className="presets-toggle"
        >
          <ChevronDown size={16} style={{ transform: showSaved ? 'rotate(180deg)' : '' }} />
          Saved Presets ({savedPresets.length})
        </button>

        {showSaved && (
          <div className="presets-list">
            {savedPresets.length > 0 ? (
              savedPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLoadPreset(preset)}
                  className="preset-item"
                  title={`Load: ${preset.name}`}
                >
                  {preset.name}
                </button>
              ))
            ) : (
              <p className="presets-empty">No saved presets yet</p>
            )}

            <div className="preset-saver">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Name this filter set..."
                className="preset-input"
              />
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim() || activeCount === 0}
                className="preset-save-btn"
              >
                <Save size={16} />
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ filter, selected, onChange }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = (value) => {
    const newSelected = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  return (
    <div className="filter-group">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="filter-group-header"
      >
        <ChevronDown
          size={16}
          style={{ transform: isExpanded ? 'rotate(180deg)' : '' }}
        />
        <span>{filter.label}</span>
        {selected.length > 0 && <span className="group-badge">{selected.length}</span>}
      </button>

      {isExpanded && (
        <div className="filter-options">
          {filter.type === 'checkbox' && (
            <div className="checkbox-options">
              {filter.options.map((option) => (
                <label key={option.value} className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => handleToggle(option.value)}
                  />
                  <span>{option.label}</span>
                  {option.count && <span className="option-count">({option.count})</span>}
                </label>
              ))}
            </div>
          )}

          {filter.type === 'range' && (
            <div className="range-filter">
              <input
                type="number"
                placeholder={`Min ${filter.label}`}
                className="range-input"
              />
              <span className="range-separator">–</span>
              <input
                type="number"
                placeholder={`Max ${filter.label}`}
                className="range-input"
              />
            </div>
          )}

          {filter.type === 'date' && (
            <div className="date-filter">
              <input
                type="date"
                className="date-input"
                onChange={(e) => handleToggle(e.target.value)}
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                className="date-input"
                onChange={(e) => handleToggle(e.target.value)}
              />
            </div>
          )}

          {filter.type === 'select' && (
            <div className="select-filter">
              <select
                multiple
                value={selected}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  onChange(values);
                }}
                className="multi-select"
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function useSavedFilters() {
  const [presets, setPresets] = useState(() => {
    const saved = localStorage.getItem('filter-presets');
    return saved ? JSON.parse(saved) : [];
  });

  const savePreset = useCallback((preset) => {
    const newPresets = [...presets, preset];
    setPresets(newPresets);
    localStorage.setItem('filter-presets', JSON.stringify(newPresets));
  }, [presets]);

  const deletePreset = useCallback((name) => {
    const newPresets = presets.filter(p => p.name !== name);
    setPresets(newPresets);
    localStorage.setItem('filter-presets', JSON.stringify(newPresets));
  }, [presets]);

  return { presets, savePreset, deletePreset };
}
