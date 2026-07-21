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

export function useInstallPrompt() {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  const showInstallPrompt = async () => {
    if (!deferredPrompt) {
      console.log('Install prompt not available');
      return false;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    deferredPrompt = null;
    return outcome === 'accepted';
  };

  window.addEventListener('appinstalled', () => {
    console.log('App installed successfully');
  });

  return { showInstallPrompt, canInstall: !!deferredPrompt };
}

export function setupOfflineData() {
  const DB_NAME = 'turbofix-offline';
  const DB_VERSION = 1;

  return {
    save: async (storeName, data) => {
      const db = await openDB(DB_NAME, DB_VERSION);
      const tx = db.transaction(storeName, 'readwrite');
      await tx.store.put(data);
      await tx.done;
    },

    get: async (storeName, key) => {
      const db = await openDB(DB_NAME, DB_VERSION);
      return await db.get(storeName, key);
    },

    getAll: async (storeName) => {
      const db = await openDB(DB_NAME, DB_VERSION);
      return await db.getAll(storeName);
    },

    delete: async (storeName, key) => {
      const db = await openDB(DB_NAME, DB_VERSION);
      const tx = db.transaction(storeName, 'readwrite');
      await tx.store.delete(key);
      await tx.done;
    },
  };
}

async function openDB(name, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
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
