-- A fixture id that comes back next season must never overwrite last season's row (its picks
-- would be graded against the new result). Ids carry the season from 2027-28 on; this guard
-- also ignores any row whose kickoff is more than 180 days from the stored one.
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
  return n;
end;
$$;
revoke all on function private.sync_fixtures() from public, anon, authenticated;
