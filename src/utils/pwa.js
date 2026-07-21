import { registerSW } from 'virtual:pwa-register';

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return null;
  }

  try {
    const updateSW = registerSW({
      onNeedRefresh() {
        console.log('New content available, click on reload button to update.');
      },
      onOfflineReady() {
        console.log('App ready to work offline');
      },
    });
    console.log('Service Worker registered via vite-plugin-pwa');
    return updateSW;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export function detectNetworkQuality() {
  if (!('connection' in navigator)) {
    return { effective: '4g', rtt: null, downlink: null };
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return { effective: '4g', rtt: null, downlink: null };

  return {
    effective: connection.effectiveType,
    rtt: connection.rtt,
    downlink: connection.downlink,
    saveData: connection.saveData,
  };
}

export function setupTouchGestures() {
  let touchStartX = 0;
  let touchEndX = 0;

  function handleSwipe() {
    if (touchStartX - touchEndX > 50) {
      window.dispatchEvent(new CustomEvent('swipe-left'));
    }
    if (touchEndX - touchStartX > 50) {
      window.dispatchEvent(new CustomEvent('swipe-right'));
    }
  }

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });

  return {
    onSwipeLeft: (callback) => window.addEventListener('swipe-left', callback),
    onSwipeRight: (callback) => window.addEventListener('swipe-right', callback),
  };
}
