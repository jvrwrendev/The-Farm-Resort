-- =====================================================================
-- M20260101000003 — BOOKING SOURCE / TYPE TAXONOMY — ONLINE BOOKING module.
-- Migration 3 of this feature set (idempotent; safe to re-run via API replay).
--
-- Adds bookings.booking_type so the admin can record HOW a reservation was
-- created (online form, front-desk walk-in, phone/contact, other manual) and
-- filter the admin tables on it.
-- =====================================================================

-- 1. Enum of booking entry points (channels).
do $$ begin
  if not exists (select 1 from pg_type where typname = 'booking_type') then
    create type booking_type as enum (
      'online_booking',
      'walk_in',
      'contact_booking',
      'other_manual'
    );
  end if;
end $$;

-- 2. Column on bookings. Existing rows are treated as ONLINE bookings
--    (they were all created through the public booking flow).
alter table public.bookings
  add column if not exists booking_type booking_type not null default 'online_booking';

-- 3. Index for the admin filter.
create index if not exists idx_bookings_type on public.bookings(booking_type);

-- 4. Realtime: keep bookings in the publication (idempotent) so admin tables
--    refresh when a new booking lands.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bookings'
  ) then
    execute 'alter publication supabase_realtime add table public.bookings';
  end if;
end $$;
