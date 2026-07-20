import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Clock, Save } from 'lucide-react';

export function SearchBar({
  onSearch,
  onSave,
  placeholder = 'Search machines, tickets, records...',
  suggestions = [],
  recentSearches = []
}) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (query.length > 0) {
      const filtered = suggestions.filter(s =>
        s.label.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, suggestions]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback((searchQuery) => {
    onSearch?.(searchQuery);
    setShowSuggestions(false);
  }, [onSearch]);

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.label);
    handleSearch(suggestion);
  };

  const handleSaveSearch = () => {
    if (query.trim()) {
      onSave?.(query);
      setQuery('');
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="search-bar-container" ref={searchRef}>
      <div className="search-bar">
        <Search size={20} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="search-input"
          aria-label="Search"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
        />
        {query && (
          <button
            onClick={handleClear}
            className="search-clear"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
        <button
          onClick={handleSaveSearch}
          disabled={!query.trim()}
          className="search-save"
          title="Save this search"
          aria-label="Save search"
        >
          <Save size={18} />
        </button>
      </div>

      {showSuggestions && (
        <div className="search-suggestions" role="listbox">
          {query.length > 0 && filteredSuggestions.length > 0 && (
            <div className="suggestions-group">
              <div className="suggestions-header">Suggestions</div>
              {filteredSuggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                  role="option"
                >
                  <Search size={16} className="suggestion-icon" />
                  <div className="suggestion-content">
                    <div className="suggestion-label">{suggestion.label}</div>
                    {suggestion.category && (
                      <div className="suggestion-category">{suggestion.category}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {query.length === 0 && recentSearches.length > 0 && (
            <div className="suggestions-group">
              <div className="suggestions-header">Recent Searches</div>
              {recentSearches.slice(0, 5).map((search, idx) => (
                <div
                  key={idx}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(search)}
                  role="option"
                >
                  <Clock size={16} className="suggestion-icon" />
                  <div className="suggestion-content">
                    <div className="suggestion-label">{search.query || search.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {query.length > 0 && filteredSuggestions.length === 0 && (
            <div className="suggestions-empty">
              <p>No results found for "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function useSearchHistory() {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('search-history');
    return saved ? JSON.parse(saved) : [];
  });

  const addSearch = useCallback((query) => {
    const newHistory = [
      { query, timestamp: new Date().toISOString() },
      ...history.filter(h => h.query !== query)
    ].slice(0, 20);

    setHistory(newHistory);
    localStorage.setItem('search-history', JSON.stringify(newHistory));
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('search-history');
  }, []);

  return { history, addSearch, clearHistory };
}
