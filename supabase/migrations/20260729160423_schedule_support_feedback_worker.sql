DO $$
DECLARE
  existing_job record;
BEGIN
  FOR existing_job IN
    SELECT jobid FROM cron.job WHERE jobname = 'haqak_support_feedback_dispatch'
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
  END LOOP;
END
$$;

SELECT cron.schedule(
  'haqak_support_feedback_dispatch',
  '*/10 * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://fpkffdfattidugsrjzey.supabase.co/functions/v1/support-feedback-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-haqak-worker-token', (
          SELECT worker_token
          FROM public.support_feedback_runtime_config
          WHERE singleton = true
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 15000
    );
  $job$
);
