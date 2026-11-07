-- The signed-in player's season points, rank and Rinvalo's points on the same games, in one row,
-- instead of the home page fetching the whole leaderboard to find them.
create function public.my_standing()
returns table (points bigint, rank bigint, rinvalo bigint)
language sql stable security definer set search_path = '' as $$
  select r.points, r.rank, r.rinvalo
  from (
    select s.user_id, s.points, s.rinvalo,
      row_number() over (order by s.points desc, s.exact desc, s.played asc, pr.username) as rank
    from private.scores(null) s join public.profiles pr on pr.id = s.user_id
  ) r
  where r.user_id = auth.uid();
$$;
revoke execute on function public.my_standing() from public, anon;
grant execute on function public.my_standing() to authenticated;
