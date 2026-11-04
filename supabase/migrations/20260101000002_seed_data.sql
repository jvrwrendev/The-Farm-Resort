-- =====================================================================
-- RESORT CORE - SEED DATA
-- Run AFTER the migration files in supabase/migrations/.
-- Idempotent: uses ON CONFLICT so re-running is safe.
-- =====================================================================

-- 1. Resort settings singleton ----------------------------------------
insert into public.resort_settings (
  id, resort_name, email, phone, address, description,
  check_in_time, check_out_time, max_guests,
  cancellation_policy, booking_policy
)
values (
  1,
  'The Farm',
  'stay@thefarm.ph',
  '+63 912 345 6789',
  'Antipolo, Rizal, Philippines',
  'A private resort offering exclusive whole-property bookings — one group at a time.',
  '14:00', '12:00', 25,
  'Free cancellation up to 7 days before check-in. Cancellations made within 7 days are subject to a one-night charge.',
  'Check-in is from 2:00 PM and check-out is by 12:00 PM. Early check-in and late check-out may be arranged in advance.'
)
on conflict (id) do update set
  resort_name         = excluded.resort_name,
  email               = excluded.email,
  phone               = excluded.phone,
  address             = excluded.address,
  description         = excluded.description,
  check_in_time       = excluded.check_in_time,
  check_out_time      = excluded.check_out_time,
  max_guests          = excluded.max_guests,
  cancellation_policy = excluded.cancellation_policy,
  booking_policy      = excluded.booking_policy,
  updated_at          = now();

-- 2. The single exclusive accommodation --------------------------------
do $$
declare
  v_room_id uuid;
begin
  select id into v_room_id from public.rooms limit 1;
  if v_room_id is null then
    insert into public.rooms (
      name, description, price_per_night, capacity,
      image_url, images, amenities, status
    )
    values (
      'Exclusive Resort Accommodation',
      'The entire resort reserved exclusively for your group — pool, gardens, AC suites, full kitchen, videoke, and outdoor dining spaces.',
      7000.00, 25,
      null,
      '{}',
      array[
        'Swimming Pool',
        'Air-conditioning',
        'Wi-Fi',
        'Free Parking',
        'Full Kitchen',
        'Videoke',
        'Outdoor Garden'
      ],
      'available'
    )
    returning id into v_room_id;
  end if;
end $$;
