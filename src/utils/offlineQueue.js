const OFFLINE_QUEUE_KEYS = ['tf_offline_tickets', 'tf_offline_queue'];

export function getOfflineLocalQueueCount(storage = localStorage) {
  return OFFLINE_QUEUE_KEYS.reduce((total, key) => {
    try {
      const queue = JSON.parse(storage.getItem(key) || '[]');
      return total + (Array.isArray(queue) ? queue.length : 0);
    } catch {
      return total;
    }
  }, 0);
}
