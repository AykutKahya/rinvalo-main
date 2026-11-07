-- Rinvalo plays the prediction league too: its score pick, frozen before kick-off, is compared
-- with each player's picks on the same matches. The bot publishes model-picks.json (only games
-- that have started, so nothing can be changed afterwards); the first value stored wins.
create table public.model_picks (
  fixture_id text primary key references public.fixtures on delete cascade,
  hg smallint not null check (hg between 0 and 20),
  ag smallint not null check (ag between 0 and 20)
);
alter table public.model_picks enable row level security;
create policy "model picks are public" on public.model_picks for select using (true);

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
    where abs(extract(epoch from excluded.kickoff - public.fixtures.kickoff)) < 180 * 86400
      and (public.fixtures.kickoff, public.fixtures.status, public.fixtures.hg, public.fixtures.ag)
          is distinct from (excluded.kickoff, excluded.status, excluded.hg, excluded.ag);
    get diagnostics c = row_count;
    n := n + c;
  end loop;

  begin
    select (r.content)::jsonb into doc from extensions.http_get(base || '/model-picks.json') r where r.status = 200;
  exception when others then
    doc := null;
  end;
  if doc is not null then
    insert into public.model_picks (fixture_id, hg, ag)
    select e.key, (e.value->>0)::smallint, (e.value->>1)::smallint
    from jsonb_each(doc) e
    join public.fixtures f on f.id = e.key and f.kickoff <= now()
    on conflict (fixture_id) do nothing;
  end if;
  return n;
end;
$$;
revoke all on function private.sync_fixtures() from public, anon, authenticated;

drop function public.group_board(text, timestamptz);
drop function public.leaderboard(timestamptz, int);
drop function private.scores(timestamptz);

-- rinvalo: Rinvalo's points on the same settled matches the player picked.
create function private.scores(since timestamptz)
returns table (user_id uuid, points bigint, exact bigint, results bigint, played bigint, rinvalo bigint)
language sql stable security definer set search_path = '' as $$
  with scored as (
    select p.user_id,
      case when p.hg = f.hg and p.ag = f.ag then 3
           when sign(p.hg - p.ag) = sign(f.hg - f.ag) then 1 else 0 end as pts,
      case when m.hg is null then 0
           when m.hg = f.hg and m.ag = f.ag then 3
           when sign(m.hg - m.ag) = sign(f.hg - f.ag) then 1 else 0 end as model
    from public.picks p
    join public.fixtures f on f.id = p.fixture_id
    left join public.model_picks m on m.fixture_id = p.fixture_id
    where f.status = 'finished' and f.hg is not null and f.ag is not null
      and (since is null or f.kickoff >= since)
  )
  select user_id, sum(pts), count(*) filter (where pts = 3), count(*) filter (where pts >= 1), count(*), sum(model)
  from scored group by user_id;
$$;
revoke all on function private.scores(timestamptz) from public, anon, authenticated;

create function public.leaderboard(since timestamptz default null, max_rows int default 100)
returns table (username text, points bigint, exact bigint, results bigint, played bigint, rinvalo bigint)
language sql stable security definer set search_path = '' as $$
  select pr.username, s.points, s.exact, s.results, s.played, s.rinvalo
  from private.scores(since) s join public.profiles pr on pr.id = s.user_id
  order by 2 desc, 3 desc, 5 asc, 1
  limit least(greatest(max_rows, 1), 500);
$$;
grant execute on function public.leaderboard(timestamptz, int) to anon, authenticated;

create function public.group_board(group_code text, since timestamptz default null)
returns table (username text, points bigint, exact bigint, results bigint, played bigint, rinvalo bigint)
language sql stable security definer set search_path = '' as $$
  select pr.username, coalesce(s.points, 0), coalesce(s.exact, 0), coalesce(s.results, 0), coalesce(s.played, 0), coalesce(s.rinvalo, 0)
  from public.groups g
  join public.group_members m on m.group_id = g.id
  join public.profiles pr on pr.id = m.user_id
  left join private.scores(since) s on s.user_id = m.user_id
  where g.code = upper(btrim(group_code))
    and exists (select 1 from public.group_members me where me.group_id = g.id and me.user_id = auth.uid())
  order by 2 desc, 3 desc, 5 asc, 1;
$$;
grant execute on function public.group_board(text, timestamptz) to authenticated;
revoke execute on function public.group_board(text, timestamptz) from public, anon;
