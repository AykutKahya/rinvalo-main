-- Hardening after the code review.

-- 1. Usernames are unique regardless of case ("aykut" can't pose as "Aykut").
create unique index profiles_username_lower on public.profiles (lower(username));

-- 2. A taken name at sign-up no longer leaves the account without a profile: fall back to oyuncu_<id>.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  wanted text := nullif(new.raw_user_meta_data->>'username', '');
  fallback text := 'oyuncu_' || substr(replace(new.id::text, '-', ''), 1, 12);
begin
  begin
    insert into public.profiles (id, username) values (new.id, coalesce(wanted, fallback));
  exception when unique_violation or check_violation then
    insert into public.profiles (id, username) values (new.id, fallback) on conflict do nothing;
  end;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

-- 3. Push: only the browsers' own push services, a ceiling on subscribers, and the keys of an
--    existing subscription can't be replaced by someone who only knows its address.
create or replace function public.push_follow(endpoint text, p256dh text, auth text, lang text, kind text, ref text, follow boolean)
returns table (follow_kind text, follow_ref text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if push_follow.endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/' then
    raise exception 'unsupported push service';
  end if;
  if not exists (select 1 from public.push_subs s where s.endpoint = push_follow.endpoint) then
    if (select count(*) from public.push_subs) >= 20000 then raise exception 'too many subscribers'; end if;
    insert into public.push_subs (endpoint, p256dh, auth, lang) values (push_follow.endpoint, push_follow.p256dh, push_follow.auth, push_follow.lang);
  else
    update public.push_subs s set lang = push_follow.lang where s.endpoint = push_follow.endpoint;
  end if;
  if follow then
    if (select count(*) from public.push_follows f where f.endpoint = push_follow.endpoint) >= 300 then raise exception 'too many follows'; end if;
    insert into public.push_follows values (push_follow.endpoint, push_follow.kind, push_follow.ref) on conflict do nothing;
  else
    delete from public.push_follows f where f.endpoint = push_follow.endpoint and f.kind = push_follow.kind and f.ref = push_follow.ref;
  end if;
  return query select f.kind, f.ref from public.push_follows f where f.endpoint = push_follow.endpoint;
end;
$$;
