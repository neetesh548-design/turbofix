-- Enable the pg_cron extension
create extension if not exists pg_cron;

-- Enable pg_net to make HTTP requests
create extension if not exists pg_net;

-- Schedule the check_schedules edge function to run at 8:00 AM IST (02:30 UTC)
select cron.schedule(
  'check-consumable-schedules-daily',
  '30 2 * * *',
  $$
    select net.http_post(
        url:='https://wcqgbleppiaddgfjrnpq.supabase.co/functions/v1/check_schedules',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb
    ) as request_id;
  $$
);
