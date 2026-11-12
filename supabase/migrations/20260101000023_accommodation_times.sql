-- Add check-in / check-out times to accommodation bookings

alter table public.bookings
  add column if not exists check_in_time text,
  add column if not exists check_out_time text;

-- create_booking
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
  p_check_in_time    text default null,
  p_check_out_time   text default null,
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
  select price_per_night, status into v_room_price, v_room_status
  from public.rooms
  where id = p_room_id;

  if v_room_price is null then
    raise exception 'ROOM_NOT_FOUND' using errcode = '22023';
  end if;
  if v_room_status <> 'available' then
    raise exception 'ROOM_UNAVAILABLE' using errcode = '22023';
  end if;

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

  v_nights := (p_check_out - p_check_in);
  v_total  := v_nights * v_room_price;

  begin
    insert into public.bookings (
      booking_reference, customer_name, customer_email, customer_phone,
      check_in, check_out, check_in_period, check_out_period,
      check_in_time, check_out_time,
      guests, adults, children,
      room_id, total_nights, price_per_night, total_price,
      special_requests, user_id
    )
    values (
      'BK-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 8)),
      trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone),
      p_check_in, p_check_out, p_check_in_period, p_check_out_period,
      p_check_in_time, p_check_out_time,
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
  day_period, day_period, text, text, text, integer, integer, uuid
) to anon, authenticated;

-- admin_create_booking
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
  p_check_in_time    text         default null,
  p_check_out_time   text         default null,
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

  select price_per_night, status into v_room_price, v_room_status
  from public.rooms
  where id = p_room_id;
  if v_room_price is null then
    raise exception 'ROOM_NOT_FOUND' using errcode = '22023';
  end if;
  if v_room_status <> 'available' then
    raise exception 'ROOM_UNAVAILABLE' using errcode = '22023';
  end if;

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

  v_nights := (p_check_out - p_check_in);
  v_total  := v_nights * v_room_price;

  begin
    insert into public.bookings (
      booking_reference, customer_name, customer_email, customer_phone,
      check_in, check_out, check_in_period, check_out_period,
      check_in_time, check_out_time,
      guests, adults, children,
      room_id, total_nights, price_per_night, total_price,
      special_requests, user_id, booking_type, status, payment_status
    )
    values (
      'BK-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 8)),
      trim(p_customer_name), lower(trim(p_customer_email)), trim(p_customer_phone),
      p_check_in, p_check_out, p_check_in_period, p_check_out_period,
      p_check_in_time, p_check_out_time,
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
  text, text, integer, integer, booking_type, booking_status, payment_status, text, uuid
) to authenticated;