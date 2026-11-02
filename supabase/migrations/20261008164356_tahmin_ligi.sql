-- Rinvalo prediction league: fixtures mirrored from the site's public data, user picks locked at
-- kick-off, and a points table (exact score 3, right result 1).

create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Where the site publishes its data (raw files of the public repository).
create table private.settings (key text primary key, value text not null);
insert into private.settings values
  ('data_base', 'https://raw.githubusercontent.com/AykutKahya/rinvalo-main/main/site/data');

create table public.fixtures (
  id text primary key,
  league text not null,
  kickoff timestamptz not null,
  home text not null,
  away text not null,
  status text not null,
  hg smallint,
  ag smallint,
  updated_at timestamptz not null default now()
);
alter table public.fixtures enable row level security;
create policy "fixtures are public" on public.fixtures for select using (true);
create index fixtures_kickoff on public.fixtures (kickoff);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (char_length(username) between 3 and 20 and username ~ '^[A-Za-z0-9_.çğıöşüÇĞİÖŞÜ-]+$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "usernames are public" on public.profiles for select using (true);
create policy "create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "rename own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create table public.picks (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fixture_id text not null references public.fixtures on delete cascade,
  hg smallint not null check (hg between 0 and 20),
  ag smallint not null check (ag between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, fixture_id)
);
alter table public.picks enable row level security;
create index picks_fixture on public.picks (fixture_id);

-- A pick can be made, changed or withdrawn only before its game kicks off.
create or replace function private.before_kickoff(fid text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.fixtures f where f.id = fid and f.kickoff > now() and f.status = 'scheduled');
$$;
grant usage on schema private to authenticated;
grant execute on function private.before_kickoff(text) to authenticated;

create policy "see own picks" on public.picks for select to authenticated using ((select auth.uid()) = user_id);
create policy "pick before kick-off" on public.picks for insert to authenticated
  with check ((select auth.uid()) = user_id and private.before_kickoff(fixture_id));
create policy "change before kick-off" on public.picks for update to authenticated
  using ((select auth.uid()) = user_id and private.before_kickoff(fixture_id))
  with check ((select auth.uid()) = user_id and private.before_kickoff(fixture_id));
create policy "withdraw before kick-off" on public.picks for delete to authenticated
  using ((select auth.uid()) = user_id and private.before_kickoff(fixture_id));

-- Points table over settled games, optionally from a date on (weekly / monthly tables).
create or replace function public.leaderboard(since timestamptz default null, max_rows int default 100)
returns table (username text, points bigint, exact bigint, results bigint, played bigint)
language sql stable security definer set search_path = '' as $$
  with scored as (
    select p.user_id,
      case when p.hg = f.hg and p.ag = f.ag then 3
           when sign(p.hg - p.ag) = sign(f.hg - f.ag) then 1 else 0 end as pts
    from public.picks p
    join public.fixtures f on f.id = p.fixture_id
    where f.status = 'finished' and f.hg is not null and f.ag is not null
      and (since is null or f.kickoff >= since)
  )
  select pr.username, sum(s.pts), count(*) filter (where s.pts = 3), count(*) filter (where s.pts >= 1), count(*)
  from scored s join public.profiles pr on pr.id = s.user_id
  group by pr.username
  order by 2 desc, 3 desc, 5 asc, 1
  limit least(greatest(max_rows, 1), 500);
$$;
grant execute on function public.leaderboard(timestamptz, int) to anon, authenticated;

-- Mirror fixtures and results from the site's data files.
create or replace function private.sync_fixtures() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  base text := (select value from private.settings where key = 'data_base');
  file text;
  doc jsonb;
  n integer := 0;
  c integer;
begin
  foreach file in array array['season.json', 'cups.json'] loop
    begin
      select (r.content)::jsonb into doc from extensions.http_get(base || '/' || file) r where r.status = 200;
    exception when others then
      doc := null;
    end;
    continue when doc is null;
    insert into public.fixtures (id, league, kickoff, home, away, status, hg, ag, updated_at)
    select f->>'id', f->>'league', (f->>'kickoff')::timestamptz, f->>'home', f->>'away', f->>'status',
           (f->>'hg')::smallint, (f->>'ag')::smallint, now()
    from jsonb_array_elements(doc->'fixtures') f
    on conflict (id) do update set
      kickoff = excluded.kickoff, status = excluded.status, hg = excluded.hg, ag = excluded.ag, updated_at = now()
    where (public.fixtures.kickoff, public.fixtures.status, public.fixtures.hg, public.fixtures.ag)
          is distinct from (excluded.kickoff, excluded.status, excluded.hg, excluded.ag);
    get diagnostics c = row_count;
    n := n + c;
  end loop;
  return n;
end;
$$;
revoke all on function private.sync_fixtures() from public, anon, authenticated;

select cron.schedule('rinvalo-sync-fixtures', '*/15 * * * *', 'select private.sync_fixtures()');
