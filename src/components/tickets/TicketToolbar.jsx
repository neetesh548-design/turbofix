import React from 'react';
import { Search, X, SlidersHorizontal, Download, ArrowUpDown } from 'lucide-react';
import { QUEUE_FILTERS, SORT_OPTIONS } from '@/utils/ticketQueues';

/**
 * TicketToolbar — search, queue filters, sort and export.
 *
 * Props:
 * - search / onSearchChange
 * - activeFilter / onFilterChange, counts (object keyed by filter)
 * - sortKey / onSortChange, sortDir / onSortDirToggle
 * - advancedOpen / onToggleAdvanced, onExport
 */
export default function TicketToolbar({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  counts = {},
  sortKey,
  onSortChange,
  sortDir,
  onSortDirToggle,
  advancedOpen,
  onToggleAdvanced,
  onExport,
}) {
  return (
    <div className="tickets-toolbar" role="search">
      <div className="tickets-search">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search WO number, machine or technician…"
          aria-label="Search tickets by work order number, machine name or technician"
        />
        {search && (
          <button
            type="button"
            className="tickets-search-clear"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className="tickets-segment" role="group" aria-label="Ticket queue filter">
        {QUEUE_FILTERS.map(({ key, label }) => (
          <button
            type="button"
            key={key}
            onClick={() => onFilterChange(key)}
            aria-pressed={activeFilter === key}
            className={activeFilter === key ? 'is-active' : ''}
          >
            {label}
            {counts[key] != null && <span className="tickets-count-pill">{counts[key]}</span>}
          </button>
        ))}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--slate-light)', fontWeight: 700 }}>
          Sort
        </span>
        <select
          className="tickets-select"
          value={sortKey}
          onChange={(event) => onSortChange(event.target.value)}
          aria-label="Sort tickets by"
        >
          {SORT_OPTIONS.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="tickets-icon-btn"
        onClick={onSortDirToggle}
        title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
        aria-label={`Toggle sort direction, currently ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
      >
        <ArrowUpDown size={14} />
        {sortDir === 'asc' ? 'Asc' : 'Desc'}
      </button>

      <button
        type="button"
        className={`tickets-icon-btn${advancedOpen ? ' is-active' : ''}`}
        onClick={onToggleAdvanced}
        aria-expanded={advancedOpen}
      >
        <SlidersHorizontal size={14} />
        Filters
      </button>

      <button type="button" className="tickets-icon-btn" onClick={onExport}>
        <Download size={14} />
        Export
      </button>
    </div>
  );
}
