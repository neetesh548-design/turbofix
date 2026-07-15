-- Replace previously deployed schedules so every privileged edge-function call
-- carries the service-role JWT and targets the deployed project, not localhost.
select cron.unschedule(jobid)
from cron.job
where jobname in (
  'check-consumable-schedules-daily',
  'invoke-monthly-report-edge-function'
);

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

select cron.schedule(
  'invoke-monthly-report-edge-function',
  '0 3 1-7 * 1',
  $$
    select net.http_post(
      url:='https://wcqgbleppiaddgfjrnpq.supabase.co/functions/v1/monthly_report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb
    ) as request_id;
  $$
);
