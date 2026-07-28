import { describe, expect, it } from 'vitest';
import { getOfflineLocalQueueCount } from '../utils/offlineQueue';

describe('OfflineIndicator', () => {
  it('counts queued reports from every local offline queue', () => {
    const storage = {
      getItem(key) {
        const values = {
          tf_offline_tickets: JSON.stringify([{ id: 1 }, { id: 2 }]),
          tf_offline_queue: JSON.stringify([{ id: 3 }]),
        };
        return values[key] || null;
      },
    };

    expect(getOfflineLocalQueueCount(storage)).toBe(3);
  });

  it('ignores broken queue payloads', () => {
    const storage = {
      getItem(key) {
        return key === 'tf_offline_tickets' ? 'nope' : JSON.stringify([{ id: 1 }]);
      },
    };

    expect(getOfflineLocalQueueCount(storage)).toBe(1);
  });
});
