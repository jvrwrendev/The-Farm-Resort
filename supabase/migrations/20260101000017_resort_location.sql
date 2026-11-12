alter table public.resort_settings
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;