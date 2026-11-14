-- Include 'checked_in' bookings in availability/occupancy so approved & checked-in
-- reservations keep their dates locked until completed/cancelled/rejected.

create or replace function public.get_calendar_occupancy(
  p_from   date,
  p_to     date,
  p_room_id uuid default null
)
returns table (
  event_date  date,
  booking_id  uuid,
  status      booking_status,
  guest_name  text,
  number_of_guests integer,
  total_amount numeric
)
language sql
security definer
set search_path = public
stable
as $$
  with range as (
    select generate_series(
      greatest(p_from, current_date - interval '5 years'),
      p_to,
      interval '1 day'
    )::date as day
  ),
  active_bookings as (
    select b.id, b.status, b.check_in, b.check_out, b.room_id
    from public.bookings b
    where b.status in ('pending','confirmed','checked_in','completed')
      and (p_room_id is null or b.room_id = p_room_id)
      and b.check_out > p_from
      and b.check_in <= p_to
  )
  select
    d.day::date as event_date,
    b.id as booking_id,
    b.status,
    'Reserved'::text as guest_name,
    0 as number_of_guests,
    0::numeric as total_amount
  from range d
  join active_bookings b
    on d.day >= b.check_in and d.day < b.check_out
  order by d.day;
$$;

grant execute on function public.get_calendar_occupancy(date, date, uuid)
  to anon, authenticated;

create or replace function public.get_pickleball_booked_slots(
  p_court_id uuid,
  p_date date
)
returns table (start_time text, end_time text, status text)
language sql
security definer
set search_path = public
stable
as $$
  select b.start_time, b.end_time, b.status
  from public.pickleball_bookings b
  where b.court_id = p_court_id
    and b.booking_date = p_date
    and b.status in ('pending', 'confirmed', 'checked_in', 'completed')
  order by b.start_time;
$$;

create or replace function public.get_pickleball_occupancy(
  p_from date,
  p_to date
)
returns table (
  booking_date date,
  court_id uuid,
  start_time text,
  end_time text,
  status text
)
language sql
security definer
set search_path = public
stable
as $$
  select b.booking_date, b.court_id, b.start_time, b.end_time, b.status
  from public.pickleball_bookings b
  where b.booking_date between p_from and p_to
    and b.status in ('pending', 'confirmed', 'checked_in', 'completed')
  order by b.booking_date, b.start_time;
$$;