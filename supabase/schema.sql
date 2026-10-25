-- =========================================================
-- Truffle Pig schema. Paste everything into Supabase SQL Editor and Run.
-- =========================================================

-- ---------------------------------------------------------
-- 0) RESET (development only!)
-- Deletes every Truffle Pig table, function and storage policy so this file
-- can be run again from scratch. ALL DATA IN THESE TABLES IS LOST.
-- Remove this block once the app has real users.
-- ---------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.increment_daily_usage(uuid, date, int);
drop policy if exists "resumes_upload_own" on storage.objects;
drop policy if exists "resumes_read_own" on storage.objects;
drop policy if exists "resumes_delete_own" on storage.objects;
drop table if exists
  public.activity_log,
  public.field_label_maps,
  public.billing_history,
  public.daily_apply_usage,
  public.job_applications,
  public.saved_jobs,
  public.jobs,
  public.job_searches,
  public.resumes,
  public.profiles
  cascade;

-- 1) PROFILES: one row per user
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  location text,
  headline text,
  summary text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  skills text[] not null default '{}',
  experience jsonb not null default '[]',
  education jsonb not null default '[]',
  projects jsonb not null default '[]',        -- [{ name, description, url }]
  certifications jsonb not null default '[]',  -- [{ name, issuer, date }]
  extra_answers jsonb not null default '{}',   -- answers the user gave to application questions, reused next time
  completeness int not null default 0,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) RESUMES: every uploaded CV file
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size int,                -- bytes; version (v1, v2...) and "Active" are computed from created_at
  parsed jsonb,
  created_at timestamptz not null default now()
);
create index resumes_user_idx on public.resumes (user_id, created_at desc);

-- 3) JOB SEARCH CACHE: when did we last call Brave for this search?
create table public.job_searches (
  query_key text primary key,
  last_fetched_at timestamptz not null default now(),
  result_count int not null default 0
);

-- 4) JOBS: postings found by Brave Search
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  query_key text not null,
  platform text not null check (platform in ('greenhouse', 'lever', 'workable', 'linkedin')),
  title text not null,
  company text,
  location text,
  url text not null,
  description text,
  posted_at text,
  company_logo text,            -- favicon URL from Brave, filled at search time
  -- Filled later from the careers-site API when someone opens "Details" (Bước 9.5)
  salary text,
  job_type text,                -- "Full-time", "Contract"...
  experience_level text,        -- "Junior", "Mid", "Senior"...
  tags text[] not null default '{}',
  details_fetched_at timestamptz,
  last_fetched_at timestamptz not null default now(),
  unique (query_key, url)
);
create index jobs_query_idx on public.jobs (query_key, last_fetched_at desc);

-- 5) SAVED JOBS
create table public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

-- 6) JOB APPLICATIONS: what the robot is doing
create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  job_title text not null,
  company text,
  platform text not null,
  job_url text not null,
  status text not null default 'queued' check (status in (
    'queued', 'detecting_fields', 'missing_info', 'in_progress', 'submitted', 'dry_run_complete', 'failed'
  )),
  detected_fields jsonb not null default '[]',
  missing_fields jsonb not null default '[]',
  answers jsonb not null default '{}',
  browserbase_session_id text,
  error text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_applications_user_idx on public.job_applications (user_id, created_at desc);

-- 7) DAILY USAGE: how many auto-applies today
create table public.daily_apply_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_date date not null,
  count int not null default 0,
  primary key (user_id, usage_date)
);

-- 8) FIELD LABEL MAPS: shared memory of "this form label = this profile field"
-- Holds no personal data (only labels), so every user benefits from it.
create table public.field_label_maps (
  platform text not null,
  label_norm text not null,     -- normalised label, e.g. "linkedin profile"
  profile_key text not null,    -- e.g. "linkedin_url", "first_name"
  updated_at timestamptz not null default now(),
  primary key (platform, label_norm)
);

-- 9) ACTIVITY LOG: the "Recent activity" list on the Jobs page
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('search', 'save', 'apply', 'profile', 'resume')),
  message text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_log_user_idx on public.activity_log (user_id, created_at desc);

-- 10) BILLING HISTORY: paid Stripe invoices
create table public.billing_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_invoice_id text not null unique,
  amount int not null,          -- in cents
  currency text not null,
  status text not null,
  invoice_url text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Auto-create a profile when someone signs up
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger-only function: keep it out of /rest/v1/rpc (the trigger still runs)
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- =========================================================
-- Atomic "use one credit" for today. Returns false when the limit is reached.
-- =========================================================
create or replace function public.increment_daily_usage(p_user_id uuid, p_usage_date date, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  insert into public.daily_apply_usage (user_id, usage_date, count)
  values (p_user_id, p_usage_date, 1)
  on conflict (user_id, usage_date)
  do update set count = public.daily_apply_usage.count + 1
  where public.daily_apply_usage.count < p_limit
  returning count into new_count;

  return new_count is not null;
end;
$$;

-- Only the server (service role) may call it
revoke execute on function public.increment_daily_usage(uuid, date, int) from public, anon, authenticated;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.job_searches enable row level security;
alter table public.jobs enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.daily_apply_usage enable row level security;
alter table public.billing_history enable row level security;
alter table public.field_label_maps enable row level security;
alter table public.activity_log enable row level security;

-- profiles: read + update own row
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id);

-- users may only edit these columns (NOT plan / stripe_* / email)
revoke update on public.profiles from authenticated;
grant update (
  full_name, phone, location, headline, summary, linkedin_url, github_url, portfolio_url,
  skills, experience, education, projects, certifications, extra_answers, completeness, updated_at
) on public.profiles to authenticated;

-- resumes: own rows
create policy "resumes_select_own" on public.resumes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "resumes_insert_own" on public.resumes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "resumes_delete_own" on public.resumes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- jobs: every signed-in user can read; only the server writes
create policy "jobs_select_all" on public.jobs
  for select to authenticated using (true);

-- saved_jobs: own rows
create policy "saved_jobs_select_own" on public.saved_jobs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "saved_jobs_insert_own" on public.saved_jobs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "saved_jobs_delete_own" on public.saved_jobs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- applications / usage / billing: read own; server writes
create policy "applications_select_own" on public.job_applications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "usage_select_own" on public.daily_apply_usage
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "billing_select_own" on public.billing_history
  for select to authenticated using ((select auth.uid()) = user_id);

-- activity_log: read own; server writes
create policy "activity_select_own" on public.activity_log
  for select to authenticated using ((select auth.uid()) = user_id);

-- field_label_maps: no policy at all = only the server (secret key) can read/write

-- =========================================================
-- Storage bucket for resumes (private)
-- Files are stored as  <user_id>/<timestamp>.pdf
-- =========================================================
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "resumes_upload_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resumes_read_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resumes_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);