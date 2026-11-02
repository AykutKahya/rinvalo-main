-- Friend leagues: a signed-in player opens a group and shares its code; members see a table of
-- their own. Badges summarise a player's record. Everything goes through the functions below;
-- the tables have no policies of their own, so the API cannot read or write them directly.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  name text not null check (char_length(btrim(name)) between 3 and 30),
  owner uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user on public.group_members (user_id);
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
revoke all on public.groups, public.group_members from anon, authenticated;

-- Points per player over settled games; the public table and the group tables share it.
create or replace function private.scores(since timestamptz)
returns table (user_id uuid, points bigint, exact bigint, results bigint, played bigint)
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
  select user_id, sum(pts), count(*) filter (where pts = 3), count(*) filter (where pts >= 1), count(*)
  from scored group by user_id;
$$;
revoke all on function private.scores(timestamptz) from public, anon, authenticated;

create or replace function public.create_group(name text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  new_code text;
  gid uuid;
begin
  if me is null then raise exception 'sign in'; end if;
  if (select count(*) from public.groups g where g.owner = me) >= 10 then raise exception 'too many groups'; end if;
  loop
    -- No 0/O or 1/I, so a code read aloud is not mistyped.
    new_code := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from public.groups g where g.code = new_code);
  end loop;
  insert into public.groups (code, name, owner) values (new_code, btrim(name), me) returning id into gid;
  insert into public.group_members (group_id, user_id) values (gid, me);
  return new_code;
end;
$$;

create or replace function public.join_group(group_code text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  g public.groups;
begin
  if me is null then raise exception 'sign in'; end if;
  select * into g from public.groups where code = upper(btrim(group_code));
  if g.id is null then raise exception 'no such group'; end if;
  if (select count(*) from public.group_members m where m.group_id = g.id) >= 200 then raise exception 'group full'; end if;
  if (select count(*) from public.group_members m where m.user_id = me) >= 20 then raise exception 'too many groups'; end if;
  insert into public.group_members (group_id, user_id) values (g.id, me) on conflict do nothing;
  return g.code;
end;
$$;

-- Leaving the last seat closes the group.
create or replace function public.leave_group(group_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  gid uuid := (select id from public.groups where code = upper(btrim(group_code)));
begin
  delete from public.group_members where group_id = gid and user_id = auth.uid();
  delete from public.groups g where g.id = gid and not exists (select 1 from public.group_members m where m.group_id = gid);
end;
$$;

create or replace function public.my_groups()
returns table (code text, name text, members bigint, owner boolean)
language sql stable security definer set search_path = '' as $$
  select g.code, g.name, (select count(*) from public.group_members x where x.group_id = g.id), g.owner = auth.uid()
  from public.groups g
  join public.group_members m on m.group_id = g.id and m.user_id = auth.uid()
  order by g.created_at;
$$;

-- A group's table; only its members may read it. Members without a settled pick show with 0.
create or replace function public.group_board(group_code text, since timestamptz default null)
returns table (username text, points bigint, exact bigint, results bigint, played bigint)
language sql stable security definer set search_path = '' as $$
  select pr.username, coalesce(s.points, 0), coalesce(s.exact, 0), coalesce(s.results, 0), coalesce(s.played, 0)
  from public.groups g
  join public.group_members m on m.group_id = g.id
  join public.profiles pr on pr.id = m.user_id
  left join private.scores(since) s on s.user_id = m.user_id
  where g.code = upper(btrim(group_code))
    and exists (select 1 from public.group_members me where me.group_id = g.id and me.user_id = auth.uid())
  order by 2 desc, 3 desc, 5 asc, 1;
$$;

-- The signed-in player's record for badges: totals, longest run of right results, weeks topped.
create or replace function public.my_record() returns jsonb
language sql stable security definer set search_path = '' as $$
  with mine as (
    select f.kickoff,
      case when p.hg = f.hg and p.ag = f.ag then 3
           when sign(p.hg - p.ag) = sign(f.hg - f.ag) then 1 else 0 end as pts
    from public.picks p join public.fixtures f on f.id = p.fixture_id
    where p.user_id = auth.uid() and f.status = 'finished' and f.hg is not null and f.ag is not null
  ),
  runs as (
    select count(*) as len from (
      select pts, sum(case when pts = 0 then 1 else 0 end) over (order by kickoff) as grp from mine
    ) x where pts > 0 group by grp
  ),
  weekly as (
    select date_trunc('week', f.kickoff) as wk, p.user_id,
      sum(case when p.hg = f.hg and p.ag = f.ag then 3 when sign(p.hg - p.ag) = sign(f.hg - f.ag) then 1 else 0 end) as pts
    from public.picks p join public.fixtures f on f.id = p.fixture_id
    where f.status = 'finished' and f.hg is not null and f.ag is not null
    group by 1, 2
  ),
  tops as (
    select wk from weekly w
    where w.user_id = auth.uid() and w.pts > 0
      and w.pts = (select max(pts) from weekly o where o.wk = w.wk)
  )
  select jsonb_build_object(
    'played', (select count(*) from mine),
    'points', (select coalesce(sum(pts), 0) from mine),
    'exact', (select count(*) from mine where pts = 3),
    'results', (select count(*) from mine where pts >= 1),
    'streak', (select coalesce(max(len), 0) from runs),
    'weeks', (select count(*) from tops)
  );
$$;

revoke all on function public.create_group(text), public.join_group(text), public.leave_group(text),
  public.my_groups(), public.group_board(text, timestamptz), public.my_record() from public, anon;
grant execute on function public.create_group(text), public.join_group(text), public.leave_group(text),
  public.my_groups(), public.group_board(text, timestamptz), public.my_record() to authenticated;
