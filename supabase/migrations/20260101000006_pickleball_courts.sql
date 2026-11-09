create table if not exists public.pickleball_courts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  description text,
  image_url text,
  hourly_rate numeric not null default 0,
  weekday_rate numeric not null default 0,
  weekend_rate numeric not null default 0,
  max_players int not null default 4,
  surface text,
  is_covered boolean not null default false,
  amenities text[] default '{}',
  is_available boolean not null default true,
  is_active boolean not null default true,
  open_time text not null default '07:00',
  close_time text not null default '21:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pickleball_courts enable row level security;

create policy "pickleball_courts public read active"
  on public.pickleball_courts for select
  using (is_active = true or public.is_admin());

create policy "pickleball_courts admin write"
  on public.pickleball_courts for all
  using (public.is_admin())
  with check (public.is_admin());

-- Seed default courts (idempotent by name)
insert into public.pickleball_courts (name, tagline, description, image_url, hourly_rate, weekday_rate, weekend_rate, max_players, surface, is_covered, amenities, is_available, is_active, open_time, close_time)
values
  ('Garden Court', 'Shaded and serene', 'A relaxed outdoor court tucked beside the gardens.', null, 500, 500, 600, 4, 'Outdoor acrylic', false, array['Garden shade','Court lighting','Courtside seating','Water station'], true, true, '07:00', '21:00'),
  ('Center Court', 'The main stage', 'Our signature outdoor court with a wide playing area.', null, 600, 600, 700, 4, 'Outdoor acrylic', false, array['Tournament markings','Court lighting','Spectator seating','Scoreboard'], true, true, '07:00', '21:00'),
  ('Covered Court', 'Play through any weather', 'A fully covered court for sunny afternoons and sudden showers.', null, 750, 750, 850, 4, 'Covered acrylic', true, array['All-weather cover','Fans and lighting','Spectator seating','Equipment rental'], true, true, '07:00', '21:00')
on conflict do nothing;
