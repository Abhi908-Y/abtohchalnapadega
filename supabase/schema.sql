-- Ab Toh Chalna Padega — Supabase schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.trips (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  coordinator_name text not null,
  window_start     date not null,
  window_end       date not null,
  created_at       timestamptz not null default now(),
  -- generation lock: one AI run per trip at a time, plus one queued rerun
  gen_status       text not null default 'idle' check (gen_status in ('idle', 'running')),
  gen_pending      boolean not null default false,
  gen_started_at   timestamptz,
  gen_error        text
);

create table if not exists public.participants (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  name        text not null,
  preferences jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists participants_trip_id_idx on public.participants (trip_id);

-- Edit-token hashes live apart from participants so they are never readable
-- by the browser (the anon key can select from participants, and Realtime
-- broadcasts full rows).
create table if not exists public.participant_secrets (
  participant_id  uuid primary key references public.participants (id) on delete cascade,
  edit_token_hash text not null
);

create table if not exists public.results (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips (id) on delete cascade,
  participant_count int not null,
  constraints       jsonb not null,
  options           jsonb not null,
  what_changed      text not null default '',
  created_at        timestamptz not null default now()
);
create index if not exists results_trip_id_created_idx on public.results (trip_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- All writes go through Next.js server routes with the service role key,
-- which bypasses RLS. The browser (anon key) gets read-only access.
--
-- There are no logins, so the database can't know which trip a visitor was
-- invited to. Access control is the link itself: slugs are long and random,
-- and the dashboard only ever queries/subscribes by its own trip_id.
-- ---------------------------------------------------------------------------

alter table public.trips               enable row level security;
alter table public.participants        enable row level security;
alter table public.participant_secrets enable row level security; -- no policies: nobody but the service role
alter table public.results             enable row level security;

drop policy if exists "read trips" on public.trips;
create policy "read trips" on public.trips
  for select to anon, authenticated using (true);

drop policy if exists "read participants of a trip" on public.participants;
create policy "read participants of a trip" on public.participants
  for select to anon, authenticated
  using (exists (select 1 from public.trips t where t.id = participants.trip_id));

drop policy if exists "read results of a trip" on public.results;
create policy "read results of a trip" on public.results
  for select to anon, authenticated
  using (exists (select 1 from public.trips t where t.id = results.trip_id));

-- Belt and braces: the browser roles can never write.
revoke insert, update, delete on public.trips, public.participants, public.results from anon, authenticated;
revoke all on public.participant_secrets from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Generation lock (atomic, works across serverless instances)
-- ---------------------------------------------------------------------------

-- Returns true if the caller now owns the run. If a fresh run is already in
-- progress, queues one rerun and returns false. Runs older than 3 minutes are
-- treated as crashed and taken over.
create or replace function public.claim_generation(p_trip_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  was_busy boolean;
begin
  select (gen_status = 'running' and gen_started_at > now() - interval '3 minutes')
    into was_busy
    from trips where id = p_trip_id
    for update;

  if not found then
    return false;
  end if;

  if was_busy then
    update trips set gen_pending = true where id = p_trip_id;
    return false;
  end if;

  update trips
     set gen_status = 'running', gen_pending = false, gen_started_at = now()
   where id = p_trip_id;
  return true;
end;
$$;

-- Ends a run. Returns true if a rerun was queued meanwhile (the caller keeps
-- the lock and should run again); otherwise releases the lock.
create or replace function public.finish_generation(p_trip_id uuid, p_error text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rerun boolean;
begin
  select gen_pending into rerun from trips where id = p_trip_id for update;
  if not found then
    return false;
  end if;

  update trips
     set gen_status     = case when rerun then 'running' else 'idle' end,
         gen_started_at = case when rerun then now() else gen_started_at end,
         gen_pending    = false,
         gen_error      = p_error
   where id = p_trip_id;
  return rerun;
end;
$$;

revoke execute on function public.claim_generation(uuid) from public, anon, authenticated;
revoke execute on function public.finish_generation(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_generation(uuid) to service_role;
grant execute on function public.finish_generation(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast changes to participants, results and trips (the last
-- one drives the "Updating suggestions…" state).
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['participants', 'results', 'trips'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
