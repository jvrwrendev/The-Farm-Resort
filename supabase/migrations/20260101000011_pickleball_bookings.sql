-- Pickleball court reservations, moved from browser localStorage to Supabase.
-- Public reads go through security-definer functions that expose availability
-- only (no customer contact details).

create table if not exists public.pickleball_bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  email text not null,
  contact_number text not null,
  court_id uuid not null references public.pickleball_courts(id) on delete restrict,
  booking_date date not null,
  start_time text not null,
  end_time text not null,
  duration_hours int not null default 1,
  players int not null default 1,
  hourly_rate numeric not null default 0,
  total_amount numeric not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pickleball_bookings_court_date_idx
  on public.pickleball_bookings (court_id, booking_date);

alter table public.pickleball_bookings enable row level security;

drop policy if exists "pickleball_bookings admin write" on public.pickleball_bookings;
create policy "pickleball_bookings admin write"
  on public.pickleball_bookings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Creates a reservation and serialises overlapping requests per court.
create or replace function public.create_pickleball_booking(
  p_court_id uuid,
  p_customer_name text,
  p_email text,
  p_contact_number text,
  p_booking_date date,
  p_start_time text,
  p_end_time text,
  p_players int default 1,
  p_notes text default null
)
returns public.pickleball_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_court public.pickleball_courts%rowtype;
  v_booking public.pickleball_bookings%rowtype;
  v_rate numeric;
  v_duration int;
  v_reference text;
begin
  select * into v_court
  from public.pickleball_courts
  where id = p_court_id
  for update;

  if not found then
    raise exception 'PICKLEBALL_COURT_NOT_FOUND';
  end if;

  if not v_court.is_active or not v_court.is_available then
    raise exception 'PICKLEBALL_UNAVAILABLE';
  end if;

  if p_booking_date < current_date then
    raise exception 'PICKLEBALL_PAST_DATE';
  end if;

  if p_booking_date > current_date + 90 then
    raise exception 'PICKLEBALL_WINDOW_EXCEEDED';
  end if;

  if p_start_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or p_end_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'PICKLEBALL_INVALID_TIME';
  end if;

  if p_start_time >= p_end_time then
    raise exception 'PICKLEBALL_INVALID_TIME';
  end if;

  if p_start_time < v_court.open_time or p_end_time > v_court.close_time then
    raise exception 'PICKLEBALL_OUTSIDE_HOURS';
  end if;

  v_duration := round(extract(epoch from (p_end_time::time - p_start_time::time)) / 3600);

  if v_duration < 1 then
    raise exception 'PICKLEBALL_INVALID_TIME';
  end if;

  if v_duration > 3 then
    raise exception 'PICKLEBALL_MAX_DURATION';
  end if;

  if p_players < 1 or p_players > v_court.max_players then
    raise exception 'PICKLEBALL_CAPACITY';
  end if;

  if exists (
    select 1
    from public.pickleball_bookings b
    where b.court_id = p_court_id
      and b.booking_date = p_booking_date
      and b.status in ('pending', 'confirmed', 'completed')
      and b.start_time < p_end_time
      and b.end_time > p_start_time
  ) then
    raise exception 'PICKLEBALL_SLOT_CONFLICT';
  end if;

  v_rate := case
    when extract(dow from p_booking_date) in (0, 6) then v_court.weekend_rate
    else v_court.weekday_rate
  end;

  if v_rate is null or v_rate <= 0 then
    v_rate := v_court.hourly_rate;
  end if;

  v_reference := 'PB-' || to_char(p_booking_date, 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.pickleball_bookings (
    reference,
    customer_name,
    email,
    contact_number,
    court_id,
    booking_date,
    start_time,
    end_time,
    duration_hours,
    players,
    hourly_rate,
    total_amount,
    status,
    notes
  ) values (
    v_reference,
    trim(p_customer_name),
    trim(p_email),
    trim(p_contact_number),
    p_court_id,
    p_booking_date,
    p_start_time,
    p_end_time,
    v_duration,
    p_players,
    v_rate,
    v_rate * v_duration,
    'pending',
    nullif(trim(p_notes), '')
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

create or replace function public.get_pickleball_booking(p_reference text)
returns public.pickleball_bookings
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.pickleball_bookings
  where lower(reference) = lower(trim(p_reference))
  limit 1;
$$;

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
    and b.status in ('pending', 'confirmed', 'completed')
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
    and b.status in ('pending', 'confirmed', 'completed')
  order by b.booking_date, b.start_time;
$$;

grant execute on function public.create_pickleball_booking(
  uuid, text, text, text, date, text, text, int, text
) to anon, authenticated;

grant execute on function public.get_pickleball_booking(text) to anon, authenticated;
grant execute on function public.get_pickleball_booked_slots(uuid, date) to anon, authenticated;
grant execute on function public.get_pickleball_occupancy(date, date) to anon, authenticated;

-- Demo reservations (idempotent). Dates are relative to the migration run.
insert into public.pickleball_bookings (
  reference,
  customer_name,
  email,
  contact_number,
  court_id,
  booking_date,
  start_time,
  end_time,
  duration_hours,
  players,
  hourly_rate,
  total_amount,
  status,
  notes
)
select
  'PB-' || to_char(current_date, 'YYYYMMDD') || '-' || v.suffix,
  v.customer_name,
  v.email,
  v.contact_number,
  c.id,
  current_date + v.day_offset,
  v.start_time,
  v.end_time,
  v.duration_hours,
  v.players,
  v.hourly_rate,
  v.hourly_rate * v.duration_hours,
  v.status,
  v.notes
from (
  values
    ('D001', 'Maria Santos', 'maria.santos@example.com', '+63 917 555 0101', 'Center Court', 1, '08:00', '10:00', 2, 4, 600, 'confirmed', 'Celebrating a birthday after the game.'),
    ('D002', 'Juan Dela Cruz', 'juan.delacruz@example.com', '+63 918 555 0102', 'Garden Court', 1, '17:00', '18:00', 1, 4, 500, 'pending', null),
    ('D003', 'Ana Reyes', 'ana.reyes@example.com', '+63 919 555 0103', 'Covered Court', 2, '07:00', '08:00', 1, 2, 750, 'confirmed', 'Please prepare two paddles.'),
    ('D004', 'Mark Villanueva', 'mark.villanueva@example.com', '+63 920 555 0104', 'Center Court', 2, '18:00', '20:00', 2, 4, 600, 'confirmed', null),
    ('D005', 'Liza Mendoza', 'liza.mendoza@example.com', '+63 921 555 0105', 'Garden Court', 3, '09:00', '10:00', 1, 4, 500, 'cancelled', 'Cancelled due to schedule change.'),
    ('D006', 'Paolo Garcia', 'paolo.garcia@example.com', '+63 922 555 0106', 'Covered Court', 4, '16:00', '17:00', 1, 4, 750, 'pending', 'First time playing - please include beginner tips.'),
    ('D007', 'Carla Bautista', 'carla.bautista@example.com', '+63 923 555 0107', 'Center Court', -1, '10:00', '12:00', 2, 4, 600, 'completed', null),
    ('D008', 'Ramon Cruz', 'ramon.cruz@example.com', '+63 924 555 0108', 'Garden Court', -2, '19:00', '20:00', 1, 2, 500, 'completed', null),
    ('D009', 'Sofia Lim', 'sofia.lim@example.com', '+63 925 555 0109', 'Center Court', 5, '20:00', '21:00', 1, 4, 600, 'confirmed', 'Late session under the lights.')
) as v(
  suffix, customer_name, email, contact_number, court_name, day_offset,
  start_time, end_time, duration_hours, players, hourly_rate, status, notes
)
join public.pickleball_courts c on c.name = v.court_name
on conflict (reference) do nothing;
