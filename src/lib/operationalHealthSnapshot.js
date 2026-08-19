/**
 * Persistence for the Operational Health Score's month-over-month trend.
 *
 * utils/operationalHealth.js is pure — no Supabase calls — so the actual
 * read/write against operational_health_snapshots (see the migration of
 * the same name) lives here, mirroring how dashboardData.js is the one
 * place that touches Supabase for the rest of the dashboard.
 *
 * One row per company per UTC day; today's row is upserted every time the
 * dashboard computes a fresh score, and the trend compares against the
 * closest snapshot at or before 30 days ago.
 */

import { supabase } from '@/supabaseClient';
import { describeTrend } from '@/utils/operationalHealth.js';

const TABLE = 'operational_health_snapshots';
const TREND_WINDOW_DAYS = 30;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Upsert today's snapshot for this company. Fire-and-forget from the
 * caller's perspective — a failure here should never block the dashboard
 * from rendering the score it already computed, so this only logs.
 */
export async function persistTodaySnapshot({ companyId, score, drivers, now = new Date() }) {
  if (!companyId || typeof score !== 'number') return;
  try {
    const { error } = await supabase.from(TABLE).upsert(
      {
        company_id: companyId,
        snapshot_date: isoDate(now),
        score,
        drivers: drivers || {},
      },
      { onConflict: 'company_id,snapshot_date' }
    );
    if (error) console.error('Operational health snapshot save failed:', error.message);
  } catch (err) {
    console.error('Operational health snapshot save failed:', err.message || err);
  }
}

/**
 * Fetch the month-over-month trend for the given score. Returns null (not
 * a fabricated 0) when there isn't a snapshot old enough to compare
 * against yet — a brand-new company has no "last month" to speak of.
 */
export async function fetchTrend({ companyId, currentScore, now = new Date() }) {
  if (!companyId || typeof currentScore !== 'number') return null;
  const cutoff = new Date(now.getTime() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('score,snapshot_date')
      .eq('company_id', companyId)
      .lte('snapshot_date', isoDate(cutoff))
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('Operational health trend fetch failed:', error.message);
      return null;
    }
    return describeTrend(currentScore, data?.score);
  } catch (err) {
    console.error('Operational health trend fetch failed:', err.message || err);
    return null;
  }
}
