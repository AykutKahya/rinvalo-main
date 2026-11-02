-- Fixtures are written only by the sync job; visitors can read them.
revoke insert, update, delete, truncate on public.fixtures from anon, authenticated;
revoke insert, update, delete, truncate on public.profiles from anon;
revoke insert, update, delete, truncate on public.picks from anon;
