-- Add dedicated "about" and "room" image slots to the accommodation (rooms) row.

alter table public.rooms
  add column if not exists about_image_url text,
  add column if not exists room_image_url text;