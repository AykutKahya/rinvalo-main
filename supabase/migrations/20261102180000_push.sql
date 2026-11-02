-- Push notifications: a browser follows a club or a game and is told 15 minutes before kick-off
-- and when the result is in. No account needed; the push endpoint (an unguessable URL the
-- browser hands out) identifies the subscriber. Tables are reached only through the functions.

create table public.push_subs (
  endpoint text primary key check (endpoint like 'https://%' and char_length(endpoint) < 1000),
  p256dh text not null check (char_length(p256dh) < 200),
  auth text not null check (char_length(auth) < 100),
  lang text not null default 'tr' check (lang in ('tr', 'en')),
  created_at timestamptz not null default now()
);
create table public.push_follows (
  endpoint text not null references public.push_subs on delete cascade,
  kind text not null check (kind in ('team', 'match')),
  ref text not null check (ref ~ '^[a-z0-9-]{2,80}$'),
  primary key (endpoint, kind, ref)
);
create index push_follows_ref on public.push_follows (kind, ref);
create table public.push_sent (
  endpoint text not null references public.push_subs on delete cascade,
  fixture_id text not null,
  event text not null check (event in ('start', 'end')),
  sent_at timestamptz not null default now(),
  primary key (endpoint, fixture_id, event)
);
alter table public.push_subs enable row level security;
alter table public.push_follows enable row level security;
alter table public.push_sent enable row level security;
revoke all on public.push_subs, public.push_follows, public.push_sent from anon, authenticated;

-- Follow or unfollow; returns what this browser now follows.
create or replace function public.push_follow(endpoint text, p256dh text, auth text, lang text, kind text, ref text, follow boolean)
returns table (follow_kind text, follow_ref text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  insert into public.push_subs as s (endpoint, p256dh, auth, lang) values (push_follow.endpoint, push_follow.p256dh, push_follow.auth, push_follow.lang)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang;
  if follow then
    if (select count(*) from public.push_follows f where f.endpoint = push_follow.endpoint) >= 300 then raise exception 'too many follows'; end if;
    insert into public.push_follows values (push_follow.endpoint, push_follow.kind, push_follow.ref) on conflict do nothing;
  else
    delete from public.push_follows f where f.endpoint = push_follow.endpoint and f.kind = push_follow.kind and f.ref = push_follow.ref;
  end if;
  return query select f.kind, f.ref from public.push_follows f where f.endpoint = push_follow.endpoint;
end;
$$;

create or replace function public.push_following(endpoint text)
returns table (follow_kind text, follow_ref text)
language sql stable security definer set search_path = '' as $$
  select f.kind, f.ref from public.push_follows f where f.endpoint = push_following.endpoint;
$$;
grant execute on function public.push_follow(text, text, text, text, text, text, boolean), public.push_following(text) to anon, authenticated;

-- Notifications that are due, claimed once: kick-off within 15 minutes, or a result settled in
-- the last six hours. Only the "push" function (service role) calls this.
create or replace function public.push_due()
returns table (endpoint text, p256dh text, auth text, lang text, fixture_id text, event text, league text, home text, away text, hg smallint, ag smallint, kickoff timestamptz)
language sql volatile security definer set search_path = '' as $$
  with due as (
    select distinct s.endpoint, f.id as fixture_id, e.event
    from public.fixtures f
    cross join lateral (
      select 'start'::text as event where f.status = 'scheduled' and f.kickoff between now() and now() + interval '15 minutes'
      union all
      select 'end' where f.status = 'finished' and f.hg is not null and f.updated_at > now() - interval '6 hours' and f.kickoff > now() - interval '1 day'
    ) e
    join public.push_follows w on (w.kind = 'match' and w.ref = f.id) or (w.kind = 'team' and w.ref in (f.home, f.away))
    join public.push_subs s on s.endpoint = w.endpoint
  ),
  claimed as (
    insert into public.push_sent (endpoint, fixture_id, event)
    select endpoint, fixture_id, event from due
    on conflict do nothing
    returning endpoint, fixture_id, event
  )
  select s.endpoint, s.p256dh, s.auth, s.lang, f.id, c.event, f.league, f.home, f.away, f.hg, f.ag, f.kickoff
  from claimed c join public.push_subs s on s.endpoint = c.endpoint join public.fixtures f on f.id = c.fixture_id;
$$;

-- The push service says a subscription is gone (410/404): forget it.
create or replace function public.push_forget(endpoint text) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_subs s where s.endpoint = push_forget.endpoint;
$$;

-- VAPID keys live in private.settings (vapid_public, vapid_private, vapid_subject), never in git.
create or replace function public.push_config() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(key, value) from private.settings where key like 'vapid_%';
$$;

revoke all on function public.push_due(), public.push_forget(text), public.push_config() from public, anon, authenticated;
grant execute on function public.push_due(), public.push_forget(text), public.push_config() to service_role;

-- Old receipts are not needed once the game is days old.
select cron.schedule('rinvalo-push-cleanup', '17 4 * * *', $$delete from public.push_sent where sent_at < now() - interval '7 days'$$);
-- Every five minutes the "push" function sends what is due (see private.settings push_url).
select cron.schedule('rinvalo-push', '*/5 * * * *', $$select extensions.http_post((select value from private.settings where key = 'push_url'), '{}', 'application/json')$$);
