-- Repair activity image buckets that may have been created as private or with
-- incomplete policies. Safe to run after the original image migrations.

insert into storage.buckets (id, name, public)
values
  ('pickleball-images', 'pickleball-images', true),
  ('activity-images', 'activity-images', true)
on conflict (id) do update
set public = true;

drop policy if exists "pickleball-images public read" on storage.objects;
drop policy if exists "pickleball-images admin write" on storage.objects;
drop policy if exists "activity-images public read" on storage.objects;
drop policy if exists "activity-images admin write" on storage.objects;

create policy "pickleball-images public read"
  on storage.objects for select
  using (bucket_id = 'pickleball-images');

create policy "pickleball-images admin write"
  on storage.objects for all
  using (bucket_id = 'pickleball-images' and public.is_admin())
  with check (bucket_id = 'pickleball-images' and public.is_admin());

create policy "activity-images public read"
  on storage.objects for select
  using (bucket_id = 'activity-images');

create policy "activity-images admin write"
  on storage.objects for all
  using (bucket_id = 'activity-images' and public.is_admin())
  with check (bucket_id = 'activity-images' and public.is_admin());
