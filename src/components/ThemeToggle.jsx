import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    // #region agent log
    fetch('http://127.0.0.1:7301/ingest/17a095ee-d2f1-472e-988e-145f532e93e3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '4431f1',
      },
      body: JSON.stringify({
        sessionId: '4431f1',
        runId: 'pre-fix',
        hypothesisId: 'H3',
        location: 'ThemeToggle.jsx:click',
        message: 'theme toggle clicked',
        data: { from: theme, to: next, pathname: window.location.pathname },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    toggleTheme();
  };

  return (
    <button
      className="theme-toggle"
      onClick={handleToggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Current theme: ${theme} mode`}
    >
      {theme === 'dark' ? (
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      ) : (
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.536l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.121-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm5.657-9.193a1 1 0 00-1.414 0l-.707.707A1 1 0 005.05 3.536l.707-.707a1 1 0 011.414 0zM5 11a1 1 0 100-2H4a1 1 0 100 2h1z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span className="sr-only">{theme === 'dark' ? '🌙' : '☀️'}</span>
    </button>
  );
}
