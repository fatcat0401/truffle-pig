-- 002: AU job boards. Wellfound dropped, LinkedIn added (show + open link only).
-- Keeps existing data. Run once in the Supabase SQL editor.

begin;

-- Wellfound is no longer a source: remove its cached jobs.
-- saved_jobs rows cascade away; applications keep their row with job_id set to null.
delete from public.jobs where platform = 'wellfound';

alter table public.jobs drop constraint if exists jobs_platform_check;
alter table public.jobs
  add constraint jobs_platform_check
  check (platform in ('greenhouse', 'lever', 'workable', 'linkedin'));

commit;
