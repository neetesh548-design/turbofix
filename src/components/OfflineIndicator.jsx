import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const updateQueueCount = () => {
      try {
        const queue = JSON.parse(localStorage.getItem('tf_offline_queue') || '[]');
        setQueuedCount(Array.isArray(queue) ? queue.length : 0);
      } catch {
        setQueuedCount(0);
      }
    };

    updateQueueCount();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', updateQueueCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', updateQueueCount);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="offline-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <span>📡 You're offline. Work orders updated locally.</span>
      {queuedCount > 0 && (
        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
          {queuedCount} {queuedCount === 1 ? 'action' : 'actions'} queued to sync
        </span>
      )}
    </div>
  );
}
