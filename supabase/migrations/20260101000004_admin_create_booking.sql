-- M20260101000004 — ADMIN MANUAL BOOKING — walk-in/contact/other manual entry.
-- Migration 4 of this feature set (idempotent).

-- ---------------------------------------------------------------------
-- 1) list_admin_bookings gains an optional booking_type filter arg so the
--    admin table can be sliced by source without changing search/status/date.
-- ---------------------------------------------------------------------
drop function if exists public.list_admin_bookings(text, booking_status, date, date);

create function public.list_admin_bookings(
  p_search        text          default null,
  p_status        booking_status default null,
  p_from          date          default null,
  p_to            date          default null,
  p_booking_type  booking_type  default null
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
    and (p_status       is null or b.status       = p_status)
    and (p_booking_type is null or b.booking_type = p_booking_type)
    and (p_from         is null or b.check_in    >= p_from)
    and (p_to           is null or b.check_in    <= p_to)
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
  text, booking_status, date, date, booking_type
) to authenticated;

-- ---------------------------------------------------------------------
-- 2) admin_create_booking — SECURITY DEFINER, is_admin() guard. Unlike the
--    customer RPC it ALLOWS past check-in dates (admins backdate walk-in /
--    contact / other manually-entered reservations) and lets the admin set
--    status, payment status and booking type up front.
-- ---------------------------------------------------------------------
create or replace function public.admin_create_booking(
  p_room_id          uuid,
  p_customer_name    text,
  p_customer_email   text,
  p_customer_phone   text,
  p_check_in         date,
  p_check_out        date,
  p_guests           integer,
  p_check_in_period  day_period   default 'PM',
  p_check_out_period day_period   default 'PM',
  p_adults           integer      default 1,
  p_children         integer      default 0,
  p_booking_type     booking_type default 'walk_in',
  p_status           booking_status default 'confirmed',
  p_payment_status   payment_status default 'unpaid',
  p_special_requests text         default '',
  p_user_id          uuid         default null
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
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  -- Room sanity.
  select price_per_night, status into v_room_price, v_room_status
  from public.rooms
  where id = p_room_id;
  if v_room_price is null then
    raise exception 'ROOM_NOT_FOUND' using errcode = '22023';
  end if;
  if v_room_status <> 'available' then
    raise exception 'ROOM_UNAVAILABLE' using errcode = '22023';
  end if;

  -- Date validation (NO past-date guard — backdating intentionally allowed).
  if p_check_in is null or p_check_out is null then
    raise exception 'DATES_REQUIRED' using errcode = '22023';
  end if;
  if p_check_out <= p_check_in then
    raise exception 'INVALID_DATE_RANGE' using errcode = '22023';
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

  -- Insert. The EXCLUDE constraint blocks falling on another blocking
  -- booking; map that to a friendly error.
  begin
    insert into public.bookings (
      booking_reference, customer_name, customer_email, customer_phone,
      check_in, check_out, check_in_period, check_out_period,
      guests, adults, children,
      room_id, total_nights, price_per_night, total_price,
      special_requests, user_id, booking_type, status, payment_status
    )
    values (
      'BK-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 8)),
      trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone),
      p_check_in, p_check_out, p_check_in_period, p_check_out_period,
      p_guests, p_adults, p_children,
      p_room_id, v_nights, v_room_price, v_total,
      coalesce(p_special_requests, ''), p_user_id, p_booking_type, p_status, p_payment_status
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

grant execute on function public.admin_create_booking(
  uuid, text, text, text, date, date, integer, day_period, day_period,
  integer, integer, booking_type, booking_status, payment_status, text, uuid
) to authenticated;
