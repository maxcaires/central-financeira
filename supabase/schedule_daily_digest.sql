-- Agenda o resumo diário às 08:00 de Brasília (11:00 UTC; o Brasil não tem horário de verão).
-- Rode UMA vez no SQL Editor do Supabase, DEPOIS de publicar na Vercel e testar com ?teste=1.
--
-- Antes de rodar, troque os dois valores entre <> abaixo:
--   <URL_DO_SITE>   ex.: https://central-financeira.vercel.app   (sem barra no final)
--   <CRON_SECRET>   o mesmo valor que você colocou na Vercel
-- Este arquivo fica no GitHub com os <> intactos; cole o valor real só no SQL Editor, nunca aqui.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'central-financeira-resumo-diario',
  '0 11 * * *',
  $$
  select net.http_post(
    url     := '<URL_DO_SITE>/api/cron/daily-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Conferir:   select jobname, schedule, active from cron.job;
-- Histórico:  select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
-- Remover:    select cron.unschedule('central-financeira-resumo-diario');
