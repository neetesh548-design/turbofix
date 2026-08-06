import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

const DEBUG_INGEST =
  'http://127.0.0.1:7301/ingest/17a095ee-d2f1-472e-988e-145f532e93e3';
const DEBUG_SESSION = '4431f1';

function agentLog(location, message, data, hypothesisId) {
  // #region agent log
  fetch(DEBUG_INGEST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION,
      runId: 'pre-fix',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function countUnlabeledControls() {
  return [...document.querySelectorAll('input, select, textarea')].filter((el) => {
    if (el.type === 'hidden') return false;
    const id = el.id;
    const hasLabel = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
    return (
      !hasLabel &&
      !el.getAttribute('aria-label') &&
      !el.getAttribute('aria-labelledby')
    );
  }).length;
}

function unnamedSelectCount() {
  return [...document.querySelectorAll('select')].filter(
    (el) => !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && el.labels.length === 0,
  ).length;
}

/**
 * Dev-only monitor for public marketing routes (MainLayout shell).
 */
export default function PublicSiteDebugMonitor() {
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const globalHandlersBound = useRef(false);

  useEffect(() => {
    if (globalHandlersBound.current) return;
    globalHandlersBound.current = true;

    const onError = (event) => {
      agentLog(
        'PublicSiteDebugMonitor.jsx:onError',
        'window error',
        { message: event.message, filename: event.filename, lineno: event.lineno },
        'H4',
      );
    };
    const onRejection = (event) => {
      agentLog(
        'PublicSiteDebugMonitor.jsx:onRejection',
        'unhandled rejection',
        { reason: String(event.reason) },
        'H4',
      );
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      const marketingHome = document.querySelector('.marketing-home');
      const mainChild = document.querySelector('#main-content > div');
      const inlineStyle = mainChild?.getAttribute('style') || '';
      const homeInlineDark = pathname === '/' && inlineStyle.includes('#0b1118');

      agentLog(
        'PublicSiteDebugMonitor.jsx:route',
        'public page snapshot',
        {
          pathname,
          theme,
          htmlDataTheme: document.documentElement.getAttribute('data-theme'),
          hasMarketingHomeClass: Boolean(marketingHome),
          homeInlineDarkStyles: homeInlineDark,
          themeMismatchHome: theme === 'light' && homeInlineDark,
        },
        'H1',
      );

      agentLog(
        'PublicSiteDebugMonitor.jsx:a11y',
        'unlabeled controls on page',
        {
          pathname,
          unlabeledControlCount: countUnlabeledControls(),
          unnamedSelectCount: unnamedSelectCount(),
        },
        'H2',
      );

      const { scrollWidth, clientWidth } = document.documentElement;
      agentLog(
        'PublicSiteDebugMonitor.jsx:layout',
        'horizontal overflow check',
        {
          pathname,
          horizontalOverflowPx: Math.max(0, scrollWidth - clientWidth),
        },
        'H5',
      );
    });
  }, [pathname, theme]);

  return null;
}
