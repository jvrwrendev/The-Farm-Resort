-- Billiards & ATV rental activities + bookings

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null unique check (type in ('billiards','atv')),
  name text not null,
  description text,
  image_url text,
  hourly_rate numeric not null default 0,
  weekday_rate numeric not null default 0,
  weekend_rate numeric not null default 0,
  max_players int not null default 4,
  is_available boolean not null default true,
  is_active boolean not null default true,
  open_time text not null default '08:00',
  close_time text not null default '20:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.activities enable row level security;

create policy "activities public read active"
  on public.activities for select
  using (is_active = true or public.is_admin());

create policy "activities admin write"
  on public.activities for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.activity_bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  email text not null,
  contact_number text not null,
  activity_id uuid not null references public.activities(id) on delete cascade,
  booking_date date not null,
  start_time text not null,
  end_time text not null,
  duration_hours int not null default 1,
  players int not null default 1,
  total_amount numeric not null default 0,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.activity_bookings enable row level security;

create policy "activity_bookings public insert"
  on public.activity_bookings for insert
  with check (true);

create policy "activity_bookings public read own reference"
  on public.activity_bookings for select
  using (true);

create policy "activity_bookings admin write"
  on public.activity_bookings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Storage bucket for activity images
insert into storage.buckets (id, name, public)
  values ('activity-images', 'activity-images', true)
  on conflict (id) do nothing;

create policy "activity-images public read"
  on storage.objects for select
  using (bucket_id = 'activity-images');

create policy "activity-images admin write"
  on storage.objects for all
  using (bucket_id = 'activity-images' and public.is_admin())
  with check (bucket_id = 'activity-images' and public.is_admin());

-- Seed default activities
insert into public.activities (type, name, description, hourly_rate, weekday_rate, weekend_rate, max_players, is_available, is_active, open_time, close_time)
values
  ('billiards', 'Billiards Table', 'Enjoy a relaxed game of pool in the clubhouse.', 300, 300, 350, 4, true, true, '08:00', '22:00'),
  ('atv', 'ATV Rental', 'Explore the farm trails on a guided ATV ride.', 800, 800, 900, 2, true, true, '08:00', '18:00')
on conflict do nothing;
