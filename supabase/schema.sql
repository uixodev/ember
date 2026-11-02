-- Ember: the one table the app needs. Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).
--
-- Each signed-in person has exactly one row: all of their fires, sparks, gems and settings as one JSON document.
-- Row level security makes sure nobody can read or change anyone else's row, even with the public anon key.

create table if not exists public.ember_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null,
  -- set by the database itself, so the clocks of different phones never disagree
  updated_at timestamptz not null default now()
);

alter table public.ember_state enable row level security;

drop policy if exists "read own state"   on public.ember_state;
drop policy if exists "insert own state" on public.ember_state;
drop policy if exists "update own state" on public.ember_state;
drop policy if exists "delete own state" on public.ember_state;

create policy "read own state"   on public.ember_state for select using (auth.uid() = user_id);
create policy "insert own state" on public.ember_state for insert with check (auth.uid() = user_id);
create policy "update own state" on public.ember_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own state" on public.ember_state for delete using (auth.uid() = user_id);

-- always stamp the time on the server when a row is written
create or replace function public.ember_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ember_touch on public.ember_state;
create trigger ember_touch before insert or update on public.ember_state
  for each row execute function public.ember_touch();

-- a sanity limit: the document may not be larger than about 2 MB
alter table public.ember_state drop constraint if exists ember_state_size;
alter table public.ember_state add constraint ember_state_size check (pg_column_size(data) < 2000000);
