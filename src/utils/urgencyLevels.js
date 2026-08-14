/**
 * Single source of truth for the 4 urgency levels' underlying values
 * (rank/label/color/responseMinutes/hint). Previously src/utils/breakdownRouter.js
 * and src/utils/ticketMeta.js each maintained their own independent copy of
 * this data with different shapes and different fallback behavior for an
 * unrecognized urgency (silently "Medium" in one, a distinct "Unrated" in
 * the other) — a change to urgency levels in one file had no mechanism
 * forcing the other to stay in sync.
 *
 * Both files still export their own `urgencyMeta()` with their own return
 * shape and fallback (each genuinely appropriate to its context — the
 * breakdown-reporting wizard always has *some* real urgency and defaulting
 * to Medium mid-flow is reasonable UX; the ticket board displays existing
 * data where "no urgency set" should read as Unrated, not silently Medium)
 * — only the underlying rank/label/color/responseMinutes values are shared
 * now, so updating a level updates both call sites' data consistently
 * without changing either one's public API or fallback behavior.
 */
export const URGENCY_LEVELS = Object.freeze({
  critical: {
    rank: 0, label: 'Critical', tone: 'danger',
    color: '#F87171', rgb: '239,68,68',
    responseMinutes: 15, hint: 'Safety or a full line stop — someone comes now.',
  },
  high: {
    rank: 1, label: 'High', tone: 'danger',
    color: '#FBBF24', rgb: '245,158,11',
    responseMinutes: 30, hint: 'Machine is down or unsafe to run.',
  },
  medium: {
    rank: 2, label: 'Medium', tone: 'warning',
    color: '#60A5FA', rgb: '96,165,250',
    responseMinutes: 240, hint: 'Still running, but not right.',
  },
  low: {
    rank: 3, label: 'Low', tone: 'ok',
    color: '#94a3b8', rgb: '148,163,184',
    responseMinutes: 1440, hint: 'Worth fixing at the next stoppage.',
  },
});
