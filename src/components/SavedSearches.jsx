import { useState, useCallback } from 'react';
import { Star, Trash2, Share2 } from 'lucide-react';

export function SavedSearches({ searches, onLoadSearch, onDeleteSearch, onShareSearch }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="saved-searches">
      <div className="saved-header">
        <h3>Saved Searches</h3>
        <span className="saved-count">{searches.length}</span>
      </div>

      {searches.length > 0 ? (
        <div className="searches-list">
          {searches.map((search) => (
            <div
              key={search.id}
              className="search-item"
              onMouseEnter={() => setExpandedId(search.id)}
              onMouseLeave={() => setExpandedId(null)}
            >
              <div className="search-item-header">
                <Star size={16} className="search-star" />
                <div className="search-item-info">
                  <h4>{search.name}</h4>
                  <p className="search-query">{search.query}</p>
                </div>
              </div>

              <div className="search-item-meta">
                <span className="search-count">{search.resultCount} results</span>
                <span className="search-date">
                  {new Date(search.createdAt).toLocaleDateString()}
                </span>
              </div>

              {expandedId === search.id && (
                <div className="search-item-actions">
                  <button
                    onClick={() => onLoadSearch?.(search)}
                    className="action-btn load"
                    title="Load this search"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => onShareSearch?.(search)}
                    className="action-btn share"
                    title="Share search"
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteSearch?.(search.id)}
                    className="action-btn delete"
                    title="Delete search"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="searches-empty">
          <Star size={32} />
          <p>No saved searches yet</p>
          <small>Save frequently used searches for quick access</small>
        </div>
      )}
    </div>
  );
}

export function useSavedSearches() {
  const [searches, setSearches] = useState(() => {
    const saved = localStorage.getItem('saved-searches');
    return saved ? JSON.parse(saved) : [];
  });

  const saveSearch = useCallback((name, query) => {
    const newSearch = {
      id: Date.now(),
      name,
      query,
      resultCount: 0,
      createdAt: new Date().toISOString()
    };

    const updated = [...searches, newSearch];
    setSearches(updated);
    localStorage.setItem('saved-searches', JSON.stringify(updated));
    return newSearch;
  }, [searches]);

  const deleteSearch = useCallback((id) => {
    const updated = searches.filter(s => s.id !== id);
    setSearches(updated);
    localStorage.setItem('saved-searches', JSON.stringify(updated));
  }, [searches]);

  const updateSearch = useCallback((id, updates) => {
    const updated = searches.map(s => s.id === id ? { ...s, ...updates } : s);
    setSearches(updated);
    localStorage.setItem('saved-searches', JSON.stringify(updated));
  }, [searches]);

  return { searches, saveSearch, deleteSearch, updateSearch };
}
