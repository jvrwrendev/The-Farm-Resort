-- =====================================================================
-- RPC FUNCTIONS
-- Server-side safety for booking creation, availability, admin ops,
-- dashboard statistics, and reports.
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_booking
-- Validates dates, computes nights/price, re-checks overlap inside a
-- transaction, inserts a new booking and returns it.
-- SECURITY DEFINER bypasses RLS so anon customers can create bookings.
-- ---------------------------------------------------------------------
create or replace function public.create_booking(
  p_room_id          uuid,
  p_customer_name    text,
  p_customer_email   text,
  p_customer_phone   text,
  p_check_in         date,
  p_check_out        date,
  p_guests           integer,
  p_check_in_period  day_period default 'PM',
  p_check_out_period day_period default 'PM',
  p_special_requests text        default '',
  p_adults           integer    default 1,
  p_children         integer    default 0,
  p_user_id          uuid        default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_price  numeric(10,2);
  v_room_status text;
  v_nights      integer;
  v_total       numeric(10,2);
  v_booking     public.bookings;
  v_ref         text;
begin
  -- Room availability sanity.
  select price_per_night, status into v_room_price, v_room_status
  from public.rooms
  where id = p_room_id;

  if v_room_price is null then
    raise exception 'ROOM_NOT_FOUND' using errcode = '22023';
  end if;
  if v_room_status <> 'available' then
    raise exception 'ROOM_UNAVAILABLE' using errcode = '22023';
  end if;

  -- Date validation.
  if p_check_in is null or p_check_out is null then
    raise exception 'DATES_REQUIRED' using errcode = '22023';
  end if;
  if p_check_out <= p_check_in then
    raise exception 'INVALID_DATE_RANGE' using errcode = '22023';
  end if;
  if p_check_in < current_date then
    raise exception 'PAST_CHECK_IN' using errcode = '22023';
  end if;
  if p_adults is null or p_adults < 1 then
    raise exception 'ADULTS_REQUIRED' using errcode = '22023';
  end if;
  if p_children is null or p_children < 0 then
    raise exception 'INVALID_CHILDREN' using errcode = '22023';
  end if;
  if p_guests is null or p_guests < 1 then
    raise exception 'GUESTS_REQUIRED' using errcode = '22023';
  end if;

  -- Server-side calculation of nights and total.
  v_nights := (p_check_out - p_check_in);
  v_total  := v_nights * v_room_price;

  -- Insert. The EXCLUDE constraint guarantees no overlap with another
  -- pending/confirmed booking; we map that into a friendly error.
  begin
    insert into public.bookings (
      booking_reference, customer_name, customer_email, customer_phone,
      check_in, check_out, check_in_period, check_out_period,
      guests, adults, children,
      room_id, total_nights, price_per_night, total_price,
      special_requests, user_id
    )
    values (
      'BK-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 8)),
      trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone),
      p_check_in, p_check_out, p_check_in_period, p_check_out_period,
      p_guests, p_adults, p_children,
      p_room_id, v_nights, v_room_price, v_total,
      coalesce(p_special_requests, ''), p_user_id
    )
    returning * into v_booking;
  exception
    when exclusion_violation then
      raise exception 'DATES_UNAVAILABLE' using errcode = '22023';
    when unique_violation then
      raise exception 'BOOKING_REFERENCE_CONFLICT' using errcode = '22023';
  end;

  return v_booking;
end $$;

grant execute on function public.create_booking(
  uuid, text, text, text, date, date, integer,
  day_period, day_period, text, integer, integer, uuid
) to anon, authenticated;

-- ---------------------------------------------------------------------
-- get_booking_by_reference  -- used by the public confirmation page.
-- ---------------------------------------------------------------------
create or replace function public.get_booking_by_reference(p_reference text)
returns public.bookings
language sql
security definer
set search_path = public
stable
as $$
  select * from public.bookings
  where booking_reference = p_reference
  limit 1;
$$;

grant execute on function public.get_booking_by_reference(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- is_range_available -- the booking page calls this before submission.
-- Returns true when no pending/confirmed booking overlaps the range.
-- ---------------------------------------------------------------------
create or replace function public.is_range_available(
  p_room_id  uuid,
  p_check_in date,
  p_check_out date
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.bookings
    where room_id = p_room_id
      and status in ('pending','confirmed')
      and daterange(check_in, check_out, '[)') &&
          daterange(p_check_in, p_check_out, '[)')
  );
$$;

grant execute on function public.is_range_available(uuid, date, date)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- get_calendar_occupancy -- public landing + booking calendars.
-- Returns one row per occupied night per booking for the given range.
-- SECURITY NOTE: this is callable by anonymous visitors, so guest-identifying
-- fields are intentionally masked. Admin calendars read bookings directly.
-- ---------------------------------------------------------------------
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
    where b.status in ('pending','confirmed','completed')
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

-- ---------------------------------------------------------------------
-- list_admin_bookings  -- filtered list for admin bookings table.
-- ---------------------------------------------------------------------
create or replace function public.list_admin_bookings(
  p_search text         default null,
  p_status booking_status default null,
  p_from   date         default null,
  p_to     date         default null
)
returns setof public.bookings
language sql
security definer
set search_path = public
stable
as $$
  select b.*
  from public.bookings b
  where
    -- SECURITY: only admins may read the booking list (contains PII).
    public.is_admin()
    and (p_status is null or b.status = p_status)
    and (p_from is null or b.check_in >= p_from)
    and (p_to   is null or b.check_in <= p_to)
    and (
      p_search is null or p_search = ''
      or b.booking_reference ilike '%' || p_search || '%'
      or b.customer_name    ilike '%' || p_search || '%'
      or b.customer_email   ilike '%' || p_search || '%'
      or b.customer_phone   ilike '%' || p_search || '%'
    )
  order by b.created_at desc;
$$;

grant execute on function public.list_admin_bookings(
  text, booking_status, date, date
) to authenticated;

-- ---------------------------------------------------------------------
-- admin_update_booking_status  -- status state-machine.
-- ---------------------------------------------------------------------
create or replace function public.admin_update_booking_status(
  p_booking_id uuid,
  p_status     booking_status
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare v_booking public.bookings;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'BOOKING_NOT_FOUND' using errcode = '22023';
  end if;

  -- No-op validation of state transitions (we keep it permissive to mirror
  -- the previous UI behaviour: any admin can set the terminal statuses).
  if v_booking.status = 'completed' and p_status = 'pending' then
    raise exception 'CANNOT_REOPEN_COMPLETED' using errcode = '22023';
  end if;

  update public.bookings
  set status = p_status
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end $$;

grant execute on function public.admin_update_booking_status(uuid, booking_status)
  to authenticated;

-- ---------------------------------------------------------------------
-- admin_update_payment_status
-- ---------------------------------------------------------------------
create or replace function public.admin_update_payment_status(
  p_booking_id     uuid,
  p_payment_status payment_status
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare v_booking public.bookings;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  update public.bookings
  set payment_status = p_payment_status
  where id = p_booking_id
  returning * into v_booking;

  if v_booking.id is null then
    raise exception 'BOOKING_NOT_FOUND' using errcode = '22023';
  end if;
  return v_booking;
end $$;

grant execute on function public.admin_update_payment_status(uuid, payment_status)
  to authenticated;

-- ---------------------------------------------------------------------
-- dashboard_stats  -- returns the KPIs shown on the admin dashboard.
-- ---------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_total           integer;
  v_pending         integer;
  v_confirmed       integer;
  v_completed       integer;
  v_cancelled       integer;
  v_revenue         numeric;
  v_upcoming_in     integer;
  v_upcoming_out    integer;
  v_current_guests  integer;
  v_accomm_avail    boolean;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  select count(*) into v_total      from public.bookings;
  select count(*) into v_pending    from public.bookings where status = 'pending';
  select count(*) into v_confirmed  from public.bookings where status = 'confirmed';
  select count(*) into v_completed  from public.bookings where status = 'completed';
  select count(*) into v_cancelled  from public.bookings where status = 'cancelled';

  select coalesce(sum(total_price), 0) into v_revenue
  from public.bookings
  where status in ('confirmed','completed');

  -- upcoming check-ins (next 7 days)
  select count(*) into v_upcoming_in
  from public.bookings
  where status in ('pending','confirmed')
    and check_in >= current_date
    and check_in <= current_date + 7;

  -- upcoming check-outs (next 7 days)
  select count(*) into v_upcoming_out
  from public.bookings
  where status in ('confirmed','completed')
    and check_out >= current_date
    and check_out <= current_date + 7;

  -- current guests: confirmed bookings whose range covers today.
  select coalesce(sum(guests), 0) into v_current_guests
  from public.bookings
  where status = 'confirmed'
    and check_in <= current_date
    and check_out > current_date;

  select not exists (
    select 1 from public.bookings
    where status = 'confirmed'
      and check_in <= current_date
      and check_out > current_date
  ) into v_accomm_avail;

  return jsonb_build_object(
    'total_bookings',         v_total,
    'pending',                v_pending,
    'confirmed',              v_confirmed,
    'completed',              v_completed,
    'cancelled',              v_cancelled,
    'total_revenue',          v_revenue,
    'upcoming_check_ins',     v_upcoming_in,
    'upcoming_check_outs',    v_upcoming_out,
    'current_guests',         v_current_guests,
    'accommodation_available', v_accomm_avail
  );
end $$;

grant execute on function public.dashboard_stats() to authenticated;

-- ---------------------------------------------------------------------
-- report_data  -- aggregates for the reports page.
-- ---------------------------------------------------------------------
create or replace function public.report_data(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_total      integer;
  v_confirmed  integer;
  v_completed  integer;
  v_cancelled  integer;
  v_revenue    numeric;
  v_nights     integer := 0;
  v_occ        integer := 0;
  v_trend      jsonb   := '[]'::jsonb;
  v_use_month  boolean;
  v_buckets    date[];
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'INVALID_DATE_RANGE' using errcode = '22023';
  end if;

  select count(*) into v_total
  from public.bookings
  where check_in >= p_from and check_in <= p_to;

  select count(*) into v_confirmed
  from public.bookings
  where check_in >= p_from and check_in <= p_to and status = 'confirmed';

  select count(*) into v_completed
  from public.bookings
  where check_in >= p_from and check_in <= p_to and status = 'completed';

  select count(*) into v_cancelled
  from public.bookings
  where check_in >= p_from and check_in <= p_to and status = 'cancelled';

  select coalesce(sum(total_price), 0) into v_revenue
  from public.bookings
  where check_in >= p_from and check_in <= p_to
    and status in ('confirmed','completed');

  -- occupancy: (p_to - p_from + 1) nights, occupied = days covered by a
  -- pending/confirmed booking inside the window (per night).
  v_nights := (p_to - p_from) + 1;
  select count(distinct d.day)::int into v_occ
  from generate_series(p_from, p_to, interval '1 day') d(day)
  join public.bookings b
    on b.status in ('pending','confirmed')
   and d.day >= b.check_in
   and d.day <  b.check_out;

  v_trend := '[]'::jsonb;
  return jsonb_build_object(
    'total_bookings',  v_total,
    'confirmed',       v_confirmed,
    'completed',       v_completed,
    'cancelled',       v_cancelled,
    'revenue',         v_revenue,
    'occupied_nights', v_occ,
    'total_nights',    v_nights,
    'trend',           v_trend
  );
end $$;

grant execute on function public.report_data(date, date) to authenticated;
