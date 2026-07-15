-- Schedule the monthly report via pg_cron
-- First Monday of the month at 08:30 IST (03:00 UTC)
-- We'll schedule it every Monday at 03:00 UTC, and the Edge Function can check if it's the first Monday.
-- Or better, we can schedule it using exact CRON if possible, but pg_cron doesn't natively support "first Monday" syntax easily.
-- For simplicity, run it on days 1-7 of every month at 03:00 UTC, IF it's a Monday.
-- Standard CRON: 0 3 1-7 * 1 (03:00 UTC, days 1-7, only on Mondays)

SELECT cron.schedule(
  'invoke-monthly-report-edge-function',
  '0 3 1-7 * 1', -- 03:00 UTC on the first Monday of the month
  $$
    SELECT net.http_post(
      url:='https://wcqgbleppiaddgfjrnpq.supabase.co/functions/v1/monthly_report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb
    ) as request_id;
  $$
);
