-- Multiple simultaneous Billiards / ATV reservations based on available inventory.

alter table public.activities
  add column if not exists inventory_count int not null default 1;

alter table public.activity_bookings
  add column if not exists quantity int not null default 1,
  add column if not exists hourly_rate numeric not null default 0;

update public.activity_bookings
set hourly_rate = case
  when duration_hours > 0 then total_amount / duration_hours
  else 0
end
where hourly_rate = 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activities_inventory_count_check'
  ) then
    alter table public.activities
      add constraint activities_inventory_count_check check (inventory_count > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_bookings_quantity_check'
  ) then
    alter table public.activity_bookings
      add constraint activity_bookings_quantity_check check (quantity > 0);
  end if;
end
$$;

create or replace function public.create_activity_booking(
  p_activity_id uuid,
  p_customer_name text,
  p_email text,
  p_contact_number text,
  p_booking_date date,
  p_start_time text,
  p_end_time text,
  p_duration_hours int,
  p_players int,
  p_quantity int,
  p_notes text default null
)
returns public.activity_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity public.activities%rowtype;
  v_rate numeric;
  v_max_occupied int := 0;
  v_booking public.activity_bookings%rowtype;
  v_reference text;
begin
  select * into v_activity
  from public.activities
  where id = p_activity_id
  for update;

  if not found then
    raise exception 'ACTIVITY_NOT_FOUND';
  end if;

  if not v_activity.is_active or not v_activity.is_available then
    raise exception 'ACTIVITY_UNAVAILABLE';
  end if;

  if p_booking_date < current_date then
    raise exception 'ACTIVITY_PAST_DATE';
  end if;

  if p_start_time >= p_end_time then
    raise exception 'ACTIVITY_INVALID_TIME';
  end if;

  if p_start_time < v_activity.open_time or p_end_time > v_activity.close_time then
    raise exception 'ACTIVITY_OUTSIDE_HOURS';
  end if;

  if p_duration_hours < 1 or p_quantity < 1 then
    raise exception 'ACTIVITY_INVALID_QUANTITY';
  end if;

  if extract(epoch from (p_end_time::time - p_start_time::time)) / 3600 <> p_duration_hours then
    raise exception 'ACTIVITY_INVALID_TIME';
  end if;

  if p_quantity > v_activity.inventory_count then
    raise exception 'ACTIVITY_INVENTORY_EXCEEDED';
  end if;

  if p_players < 1 or p_players > (v_activity.max_players * p_quantity) then
    raise exception 'ACTIVITY_PARTICIPANT_CAPACITY';
  end if;

  -- Find peak existing occupancy during the requested period. Locking the activity
  -- row serializes bookings for this inventory and prevents concurrent overbooking.
  select coalesce(max(point_occupancy), 0)::int
  into v_max_occupied
  from (
    select coalesce((
      select sum(b.quantity)
      from public.activity_bookings b
      where b.activity_id = p_activity_id
        and b.booking_date = p_booking_date
        and b.status in ('pending', 'confirmed', 'completed')
        and b.start_time <= points.point
        and b.end_time > points.point
    ), 0) as point_occupancy
    from (
      select p_start_time as point
      union
      select b.start_time
      from public.activity_bookings b
      where b.activity_id = p_activity_id
        and b.booking_date = p_booking_date
        and b.status in ('pending', 'confirmed', 'completed')
        and b.start_time < p_end_time
        and b.end_time > p_start_time
        and b.start_time > p_start_time
    ) points
  ) occupancy;

  if v_max_occupied + p_quantity > v_activity.inventory_count then
    raise exception 'ACTIVITY_INSUFFICIENT_INVENTORY';
  end if;

  v_rate := case
    when extract(dow from p_booking_date) in (0, 6) then v_activity.weekend_rate
    else v_activity.weekday_rate
  end;

  v_reference := 'ACT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.activity_bookings (
    reference,
    customer_name,
    email,
    contact_number,
    activity_id,
    booking_date,
    start_time,
    end_time,
    duration_hours,
    players,
    quantity,
    hourly_rate,
    total_amount,
    status,
    notes
  ) values (
    v_reference,
    trim(p_customer_name),
    trim(p_email),
    trim(p_contact_number),
    p_activity_id,
    p_booking_date,
    p_start_time,
    p_end_time,
    p_duration_hours,
    p_players,
    p_quantity,
    v_rate,
    v_rate * p_duration_hours * p_quantity,
    'pending',
    nullif(trim(p_notes), '')
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.create_activity_booking(
  uuid, text, text, text, date, text, text, int, int, int, text
) to anon, authenticated;
