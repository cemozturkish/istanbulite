-- =====================================================================
-- push_notifications_cron — the two clocks that drive push_notifications.
--
--   push-reminders  every 5 minutes: free stuck rows (push_recover) and
--                   queue the reminders now due
--   push-send       every minute: if anything is due, call the send-push
--                   Edge Function, which delivers it to APNs
--
-- Run ONCE, in the Supabase SQL editor, AFTER db/push_notifications.sql
-- and after `send-push` is deployed (see supabase/functions/send-push/
-- README.md). Before running it:
--
--   1. Database → Extensions: enable pg_cron and pg_net.
--   2. Put the same random string you gave the function as
--      PUSH_CRON_SECRET into the vault (replace the placeholder):
--
--        select vault.create_secret('<the same random string>', 'push_cron_secret');
--
-- The secret is read from the vault at each run, so it is never written
-- into this file or into cron.job. Idempotent (each job is unscheduled
-- first).
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('push-reminders', 'push-send');
end $$;

select cron.schedule('push-reminders', '*/5 * * * *', $$ select public.push_enqueue_reminders(); $$);

select cron.schedule('push-send', '* * * * *', $$
  select net.http_post(
    url     := 'https://fgxispjoiynnoqitwpks.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-push-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 55000
  )
  where exists (
    select 1 from public.push_outbox
    where (status = 'queued' and send_after <= now())
       -- a batch a dead run left behind: push_claim() frees it (so does
       -- push-reminders, every five minutes, via push_recover())
       or (status = 'sending' and send_after < now() - interval '5 minutes')
  );
$$);
