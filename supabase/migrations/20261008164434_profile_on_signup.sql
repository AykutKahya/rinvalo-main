-- Create the public profile from the username given at sign-up.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'oyuncu_' || substr(new.id::text, 1, 8)))
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Is a username still free? (Checked before sign-up so the form can say so.)
create or replace function public.username_free(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(name));
$$;
grant execute on function public.username_free(text) to anon, authenticated;
