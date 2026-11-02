-- Site data (fixtures, predictions, crests) lives in Storage instead of git. Anyone may read it;
-- only the upload function (service role) writes.
insert into storage.buckets (id, name, public, file_size_limit)
values ('site', 'site', true, 20971520)
on conflict (id) do nothing;

create policy "site data is public" on storage.objects for select to anon, authenticated using (bucket_id = 'site');

-- The prediction league mirrors fixtures from the same files. Set per project:
--   update private.settings set value = '<project url>/storage/v1/object/public/site/data' where key = 'data_base';
