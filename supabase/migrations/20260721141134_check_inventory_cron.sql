-- Schedule the check_inventory edge function to run daily at 2:00 AM
SELECT cron.schedule(
  'invoke-check-inventory-nightly',
  '0 2 * * *',
  $$
    select net.http_post(
        url:=(current_setting('app.settings.edge_functions_base_url', TRUE) || '/check_inventory'),
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', TRUE)
        )
    ) as request_id;
  $$
);
