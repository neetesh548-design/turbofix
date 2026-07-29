import React from 'react';
import { Search, LayoutGrid, List, X } from 'lucide-react';
import { HEALTH } from '@/utils/machineHealth';

/**
 * MachineFilterBar — search, health filter, and the grid/list toggle.
 *
 * The filter chips double as the fleet summary: each one carries its own
 * count, so the strip answers "how is the plant doing?" without a separate
 * KPI row above it.
 *
 * Props:
 * - search (string) / onSearchChange (fn(value))
 * - status (string) / onStatusChange (fn(statusKey))
 * - view ('grid' | 'list') / onViewChange (fn(view))
 * - summary (object): { all, running, issues, down, maintenance } counts
 */
function MachineFilterBar({ search, onSearchChange, status, onStatusChange, view, onViewChange, summary }) {
  const filters = [
    { key: 'all', label: 'All', count: summary.all },
    { key: HEALTH.RUNNING, label: 'Running', count: summary.running },
    { key: HEALTH.ISSUES, label: 'Issues', count: summary.issues },
    { key: HEALTH.DOWN, label: 'Down', count: summary.down },
    { key: 'maintenance', label: 'Maintenance', count: summary.maintenance },
  ];

  return (
    <div className="machine-filterbar">
      <div className="machine-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={search}
          data-testid="machine-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by machine name or location"
          aria-label="Search machines by name or location"
        />
        {search && (
          <button type="button" className="machine-search-clear" onClick={() => onSearchChange('')} aria-label="Clear search">
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="machine-filter-chips" role="group" aria-label="Filter machines by health">
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            data-testid={`machine-filter-${filter.key}`}
            className={`machine-chip machine-chip-${filter.key}${status === filter.key ? ' active' : ''}`}
            aria-pressed={status === filter.key}
            onClick={() => onStatusChange(filter.key)}
          >
            {filter.key !== 'all' && <span className="machine-chip-dot" aria-hidden="true" />}
            {filter.label}
            <b>{filter.count}</b>
          </button>
        ))}
      </div>

      <div className="machine-view-toggle" role="group" aria-label="Machine board layout">
        <button
          type="button"
          className={view === 'grid' ? 'active' : ''}
          aria-pressed={view === 'grid'}
          onClick={() => onViewChange('grid')}
          title="Grid view"
        >
          <LayoutGrid size={15} aria-hidden="true" /><span>Grid</span>
        </button>
        <button
          type="button"
          className={view === 'list' ? 'active' : ''}
          aria-pressed={view === 'list'}
          onClick={() => onViewChange('list')}
          title="List view"
        >
          <List size={15} aria-hidden="true" /><span>List</span>
        </button>
      </div>
    </div>
  );
}

export default React.memo(MachineFilterBar);
