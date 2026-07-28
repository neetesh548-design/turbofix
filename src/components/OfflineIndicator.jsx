import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { getOfflineLocalQueueCount } from '@/utils/offlineQueue';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync event if background sync registered
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.sync.register('workbox-background-sync:ticketQueue').catch(() => {});
        });
      }
    };
    const handleOffline = () => setIsOnline(false);

    const updateQueueCount = async () => {
      const localCount = getOfflineLocalQueueCount();

      if ('indexedDB' in window) {
        try {
          const request = indexedDB.open('workbox-background-sync');
          request.onsuccess = (e) => {
            const db = e.target.result;
            if (db.objectStoreNames.contains('requests')) {
              const tx = db.transaction('requests', 'readonly');
              const store = tx.objectStore('requests');
              const countReq = store.count();
              countReq.onsuccess = () => {
                setQueuedCount(localCount + countReq.result);
              };
            } else {
              setQueuedCount(localCount);
            }
          };
          request.onerror = () => setQueuedCount(localCount);
        } catch {
          setQueuedCount(localCount);
        }
      } else {
        setQueuedCount(localCount);
      }
    };

    updateQueueCount();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', updateQueueCount);

    const interval = setInterval(updateQueueCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', updateQueueCount);
      clearInterval(interval);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      aria-label="Offline Mode Active"
      className="offline-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#b91c1c',
        color: '#ffffff',
        padding: '8px 16px',
        fontSize: '0.85rem',
        fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 9998
      }}
    >
      <WifiOff size={16} />
      <span>You're offline. Work orders and reports are saved locally on your device.</span>
      {queuedCount > 0 && (
        <span
          style={{
            background: 'rgba(255,255,255,0.25)',
            padding: '2px 10px',
            borderRadius: 999,
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <RefreshCw size={12} className="spin" />
          {queuedCount} {queuedCount === 1 ? 'action' : 'actions'} queued
        </span>
      )}
    </div>
  );
}

export default OfflineIndicator;
