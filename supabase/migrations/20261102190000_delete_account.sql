-- A player deletes their own account: picks, profile and memberships go with it (cascades). A group
-- they own passes to its longest-standing other member, so the friends' table survives; a group with
-- no one else in it is closed.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'sign in'; end if;
  update public.groups g set owner = (
    select m.user_id from public.group_members m
    where m.group_id = g.id and m.user_id <> me
    order by m.joined_at limit 1
  )
  where g.owner = me
    and exists (select 1 from public.group_members m where m.group_id = g.id and m.user_id <> me);
  delete from auth.users where id = me;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
