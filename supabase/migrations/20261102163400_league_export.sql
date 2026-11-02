-- Weekly backup of the prediction league, read by the "upload" function with the service role only.
create or replace function public.export_league() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'exportedAt', now(),
    'users', (select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'email', u.email, 'createdAt', u.created_at)), '[]') from auth.users u),
    'profiles', (select coalesce(jsonb_agg(to_jsonb(p)), '[]') from public.profiles p),
    'picks', (select coalesce(jsonb_agg(to_jsonb(k)), '[]') from public.picks k)
  );
$$;
revoke all on function public.export_league() from public, anon, authenticated;
grant execute on function public.export_league() to service_role;
