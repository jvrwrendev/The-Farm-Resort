-- =====================================================================
-- RESORT BOOKING MANAGEMENT SYSTEM - CORE SCHEMA
-- Tables: profiles, rooms, bookings, resort_settings
-- Spec: requirements 1, 8, 13 of the integration brief.
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'customer');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('unpaid', 'paid', 'partially_paid');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'day_period') then
    create type day_period as enum ('AM', 'PM');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text        not null default '',
  email       text        not null default '',
  role        app_role    not null default 'customer',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);

-- ---------------------------------------------------------------------
-- ROOMS  (the resort has a single accommodation as per requirement #1)
-- ---------------------------------------------------------------------

create table if not exists public.rooms (
  id              uuid primary key default gen_random_uuid(),
  name            text           not null,
  description     text           not null default '',
  price_per_night numeric(10,2)  not null check (price_per_night >= 0),
  capacity        integer        not null check (capacity > 0),
  image_url       text,
  images          text[]         not null default '{}',
  amenities       text[]         not null default '{}',
  status          text           not null default 'available'
                    check (status in ('available','unavailable')),
  created_at      timestamptz    not null default now(),
  updated_at      timestamptz    not null default now()
);

create index if not exists idx_rooms_status on public.rooms(status);

-- ---------------------------------------------------------------------
-- RESORT SETTINGS  (optional singleton used by Admin Settings page)
-- ---------------------------------------------------------------------

create table if not exists public.resort_settings (
  id                  integer       primary key default 1 check (id = 1),
  resort_name         text          not null,
  email               text          not null default '',
  phone               text          not null default '',
  address             text          not null default '',
  description         text          not null default '',
  check_in_time       text          not null default '14:00',
  check_out_time      text          not null default '12:00',
  max_guests          integer       not null default 25,
  cancellation_policy text          not null default '',
  booking_policy      text          not null default '',
  updated_at          timestamptz   not null default now()
);

-- ---------------------------------------------------------------------
-- BOOKINGS
-- ---------------------------------------------------------------------

create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  booking_reference text           not null unique,
  customer_name     text           not null,
  customer_email    text           not null,
  customer_phone    text           not null,
  check_in          date           not null,
  check_out         date           not null,
  check_in_period   day_period     not null default 'PM',
  check_out_period  day_period     not null default 'PM',
  guests            integer        not null check (guests > 0),
  adults            integer        not null default 1 check (adults > 0),
  children          integer        not null default 0 check (children >= 0),
  room_id           uuid           not null references public.rooms(id) on delete restrict,
  total_nights      integer        not null check (total_nights > 0),
  price_per_night   numeric(10,2)  not null check (price_per_night >= 0),
  total_price       numeric(10,2)  not null check (total_price >= 0),
  status            booking_status not null default 'pending',
  payment_status    payment_status not null default 'unpaid',
  special_requests  text           not null default '',
  user_id           uuid           references public.profiles(id) on delete set null,
  created_at        timestamptz    not null default now(),
  updated_at        timestamptz    not null default now(),
  constraint bookings_valid_dates check (check_out > check_in)
);

-- Hard overlap guard for blocking statuses (requirement #13).
-- Prevents two customers reserving the same dates.
alter table public.bookings
  drop constraint if exists bookings_no_overlap;
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  )
  where (status in ('pending','confirmed'));

create index if not exists idx_bookings_status        on public.bookings(status);
create index if not exists idx_bookings_payment       on public.bookings(payment_status);
create index if not exists idx_bookings_check_in      on public.bookings(check_in);
create index if not exists idx_bookings_check_out     on public.bookings(check_out);
create index if not exists idx_bookings_reference     on public.bookings(booking_reference);
create index if not exists idx_bookings_created       on public.bookings(created_at desc);
create index if not exists idx_bookings_user          on public.bookings(user_id);
create index if not exists idx_bookings_room          on public.bookings(room_id);
create index if not exists idx_bookings_customer_email on public.bookings
  using gin (customer_email gin_trgm_ops);

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------

create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tr_profiles_updated       on public.profiles;
drop trigger if exists tr_rooms_updated          on public.rooms;
drop trigger if exists tr_bookings_updated       on public.bookings;
drop trigger if exists tr_resort_settings_updated on public.resort_settings;

create trigger tr_profiles_updated
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger tr_rooms_updated
  before update on public.rooms
  for each row execute function public.update_updated_at();

create trigger tr_bookings_updated
  before update on public.bookings
  for each row execute function public.update_updated_at();

create trigger tr_resort_settings_updated
  before update on public.resort_settings
  for each row execute function public.update_updated_at();

-- Auto-create profile on signup. SECURITY: role is always 'customer' here;
-- self-registration must never be able to grant admin. Elevate an existing
-- account to admin manually (service role / SQL) instead.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- HELPER: is_admin()
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Helper: current user's role, resolved without triggering RLS recursion.
create or replace function public.current_app_role()
returns app_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_app_role() to authenticated;

-- ---------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.rooms           enable row level security;
alter table public.bookings        enable row level security;
alter table public.resort_settings enable row level security;

-- PROFILES: own row readable/editable; admins see/edit all.
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_insert_admin on public.profiles;

create policy profiles_select
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy profiles_update_own
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = public.current_app_role());

create policy profiles_update_admin
  on public.profiles for update
  using (public.is_admin());

create policy profiles_insert_admin
  on public.profiles for insert
  with check (public.is_admin());

-- ROOMS: public can read; admins manage.
drop policy if exists rooms_public_select on public.rooms;
drop policy if exists rooms_admin_all     on public.rooms;

create policy rooms_public_select on public.rooms for select using (true);
create policy rooms_admin_all     on public.rooms for all
  using (public.is_admin()) with check (public.is_admin());

-- RESORT SETTINGS: public can read; admins manage.
drop policy if exists settings_public_select on public.resort_settings;
drop policy if exists settings_admin_all     on public.resort_settings;

create policy settings_public_select on public.resort_settings for select using (true);
create policy settings_admin_all     on public.resort_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- BOOKINGS: SELECT/INSERT/UPDATE/DELETE on the table itself are restricted.
-- All read/write paths go through SECURITY DEFINER RPCs so server-side
-- validation is always applied. Direct table access is denied for everyone.
drop policy if exists bookings_block_all    on public.bookings;
drop policy if exists bookings_admin_select on public.bookings;
drop policy if exists bookings_admin_all    on public.bookings;

create policy bookings_admin_select
  on public.bookings for select
  using (public.is_admin());

create policy bookings_admin_all
  on public.bookings for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- REALTIME
-- ---------------------------------------------------------------------

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    execute 'alter publication supabase_realtime add table public.bookings';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- STORAGE  (run via Supabase Dashboard Storage or via SQL)
-- ---------------------------------------------------------------------

-- insert into storage.buckets (id, name, public)
--   values ('room-images', 'room-images', true)
--   on conflict (id) do nothing;

-- create policy "room-images public read"
--   on storage.objects for select
--   using (bucket_id = 'room-images');

-- create policy "room-images admin write"
--   on storage.objects for all
--   using (
--     bucket_id = 'room-images'
--     and public.is_admin()
--   )
--   with check (bucket_id = 'room-images' and public.is_admin());
