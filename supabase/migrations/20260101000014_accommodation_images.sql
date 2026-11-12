-- Accommodation image management in Supabase (mirrors pickleball_images)

create table if not exists public.accommodation_images (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  storage_path text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accommodation_images enable row level security;

drop policy if exists "accommodation_images public read active" on public.accommodation_images;
create policy "accommodation_images public read active"
  on public.accommodation_images for select
  using (status = 'active' or public.is_admin());

drop policy if exists "accommodation_images admin write" on public.accommodation_images;
create policy "accommodation_images admin write"
  on public.accommodation_images for all
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
  values ('accommodation-images', 'accommodation-images', true)
  on conflict (id) do nothing;

drop policy if exists "accommodation-images public read" on storage.objects;
drop policy if exists "accommodation-images admin write" on storage.objects;

create policy "accommodation-images public read"
  on storage.objects for select
  using (bucket_id = 'accommodation-images');

create policy "accommodation-images admin write"
  on storage.objects for all
  using (bucket_id = 'accommodation-images' and public.is_admin())
  with check (bucket_id = 'accommodation-images' and public.is_admin());