-- Pickleball image management table + storage bucket

create table if not exists public.pickleball_images (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  storage_path text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pickleball_images enable row level security;

create policy "pickleball_images public read active"
  on public.pickleball_images for select
  using (status = 'active' or public.is_admin());

create policy "pickleball_images admin write"
  on public.pickleball_images for all
  using (public.is_admin())
  with check (public.is_admin());

-- Storage bucket (run via Supabase Dashboard or SQL)
insert into storage.buckets (id, name, public)
  values ('pickleball-images', 'pickleball-images', true)
  on conflict (id) do nothing;

create policy "pickleball-images public read"
  on storage.objects for select
  using (bucket_id = 'pickleball-images');

create policy "pickleball-images admin write"
  on storage.objects for all
  using (bucket_id = 'pickleball-images' and public.is_admin())
  with check (bucket_id = 'pickleball-images' and public.is_admin());
