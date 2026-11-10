-- Individual ATV units and billiard tables.
-- Keeps `activities` as the type/category record for shared hours/content and
-- introduces `activity_units` for per-unit management and reservations.

create table if not exists public.activity_units (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null check (activity_type in ('billiards','atv')),
  name text not null,
  identifier text,
  description text,
  image_url text,
  hourly_rate numeric not null default 0,
  weekday_rate numeric not null default 0,
  weekend_rate numeric not null default 0,
  max_players int not null default 1,
  status text not null default 'available' check (status in ('available','maintenance')),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_type, name)
);

create index if not exists activity_units_type_idx on public.activity_units (activity_type);
create index if not exists activity_units_status_idx on public.activity_units (status, is_active);

alter table public.activity_units enable row level security;

drop policy if exists "activity_units public read active" on public.activity_units;
create policy "activity_units public read active"
  on public.activity_units for select
  using ((is_active = true and status = 'available') or public.is_admin());

drop policy if exists "activity_units admin write" on public.activity_units;
create policy "activity_units admin write"
  on public.activity_units for all
  using (public.is_admin())
  with check (public.is_admin());

-- Seed units from existing inventory so current deployments keep capacity.
insert into public.activity_units (
  activity_type,
  name,
  identifier,
  description,
  image_url,
  hourly_rate,
  weekday_rate,
  weekend_rate,
  max_players,
  status,
  is_active,
  sort_order
)
select
  a.type,
  case
    when a.type = 'atv' then 'ATV ' || gs.n::text
    else 'Table ' || gs.n::text
  end,
  case
    when a.type = 'atv' then 'ATV-' || lpad(gs.n::text, 2, '0')
    else 'TBL-' || lpad(gs.n::text, 2, '0')
  end,
  a.description,
  a.image_url,
  a.hourly_rate,
  a.weekday_rate,
  a.weekend_rate,
  greatest(1, a.max_players),
  case when a.is_available and a.is_active then 'available' else 'maintenance' end,
  a.is_active,
  gs.n
from public.activities a
cross join lateral generate_series(1, greatest(1, coalesce(a.inventory_count, 1))) as gs(n)
where not exists (
  select 1
  from public.activity_units u
  where u.activity_type = a.type
);

alter table public.activity_bookings
  add column if not exists unit_id uuid references public.activity_units(id) on delete set null;

create index if not exists activity_bookings_unit_idx
  on public.activity_bookings (unit_id, booking_date, start_time, end_time);

-- Best-effort assignment for legacy quantity bookings (keeps history readable).
do $$
declare
  b record;
  u record;
begin
  for b in
    select id, activity_id, booking_date, start_time, end_time, quantity
    from public.activity_bookings
    where unit_id is null
      and status in ('pending', 'confirmed', 'completed')
    order by booking_date, start_time, created_at
  loop
    select au.id into u
    from public.activity_units au
    join public.activities a on a.type = au.activity_type
    where a.id = b.activity_id
      and au.is_active = true
      and not exists (
        select 1
        from public.activity_bookings ob
        where ob.unit_id = au.id
          and ob.booking_date = b.booking_date
          and ob.status in ('pending', 'confirmed', 'completed')
          and ob.start_time < b.end_time
          and ob.end_time > b.start_time
      )
    order by au.sort_order, au.name
    limit 1;

    if found then
      update public.activity_bookings
      set unit_id = u.id, quantity = 1
      where id = b.id;
    end if;
  end loop;
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
  p_quantity int default 1,
  p_notes text default null,
  p_unit_id uuid default null
)
returns public.activity_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity public.activities%rowtype;
  v_unit public.activity_units%rowtype;
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

  if p_duration_hours < 1 then
    raise exception 'ACTIVITY_INVALID_QUANTITY';
  end if;

  if extract(epoch from (p_end_time::time - p_start_time::time)) / 3600 <> p_duration_hours then
    raise exception 'ACTIVITY_INVALID_TIME';
  end if;

  v_reference := 'ACT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  if p_unit_id is not null then
    select * into v_unit
    from public.activity_units
    where id = p_unit_id
    for update;

    if not found then
      raise exception 'ACTIVITY_UNIT_NOT_FOUND';
    end if;

    if v_unit.activity_type <> v_activity.type then
      raise exception 'ACTIVITY_UNIT_MISMATCH';
    end if;

    if not v_unit.is_active or v_unit.status <> 'available' then
      raise exception 'ACTIVITY_UNIT_UNAVAILABLE';
    end if;

    if p_players < 1 or p_players > v_unit.max_players then
      raise exception 'ACTIVITY_PARTICIPANT_CAPACITY';
    end if;

    if exists (
      select 1
      from public.activity_bookings b
      where b.unit_id = p_unit_id
        and b.booking_date = p_booking_date
        and b.status in ('pending', 'confirmed', 'completed')
        and b.start_time < p_end_time
        and b.end_time > p_start_time
    ) then
      raise exception 'ACTIVITY_UNIT_CONFLICT';
    end if;

    v_rate := case
      when extract(dow from p_booking_date) in (0, 6) then v_unit.weekend_rate
      else v_unit.weekday_rate
    end;

    insert into public.activity_bookings (
      reference,
      customer_name,
      email,
      contact_number,
      activity_id,
      unit_id,
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
      p_unit_id,
      p_booking_date,
      p_start_time,
      p_end_time,
      p_duration_hours,
      p_players,
      1,
      v_rate,
      v_rate * p_duration_hours,
      'pending',
      nullif(trim(p_notes), '')
    )
    returning * into v_booking;

    return v_booking;
  end if;

  -- Legacy quantity-based booking path (kept for backward compatibility).
  if p_quantity < 1 then
    raise exception 'ACTIVITY_INVALID_QUANTITY';
  end if;

  if p_quantity > v_activity.inventory_count then
    raise exception 'ACTIVITY_INVENTORY_EXCEEDED';
  end if;

  if p_players < 1 or p_players > (v_activity.max_players * p_quantity) then
    raise exception 'ACTIVITY_PARTICIPANT_CAPACITY';
  end if;

  select coalesce(max(point_occupancy), 0)::int
  into v_max_occupied
  from (
    select coalesce((
      select sum(b.quantity)
      from public.activity_bookings b
      where b.activity_id = p_activity_id
        and b.booking_date = p_booking_date
        and b.status in ('pending', 'confirmed', 'completed')
        and b.unit_id is null
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
        and b.unit_id is null
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

  insert into public.activity_bookings (
    reference,
    customer_name,
    email,
    contact_number,
    activity_id,
    unit_id,
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
    null,
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
  uuid, text, text, text, date, text, text, int, int, int, text, uuid
) to anon, authenticated;
