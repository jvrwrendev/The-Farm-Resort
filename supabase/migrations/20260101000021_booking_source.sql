-- Add booking_source to all booking tables

alter table public.bookings add column if not exists booking_source text not null default 'online'
  check (booking_source in ('online', 'manual'));
alter table public.pickleball_bookings add column if not exists booking_source text not null default 'online'
  check (booking_source in ('online', 'manual'));
alter table public.activity_bookings add column if not exists booking_source text not null default 'online'
  check (booking_source in ('online', 'manual'));

update public.bookings set booking_source = 'online' where booking_source is null;
update public.pickleball_bookings set booking_source = 'online' where booking_source is null;
update public.activity_bookings set booking_source = 'online' where booking_source is null;