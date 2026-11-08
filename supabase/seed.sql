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

-- 3. Admin account (development seed only) -----------------------------
-- Creates javierrenren1@gmail.com with the password admin123 and promotes
-- the matching profile to admin. Safe to re-run.
--
-- WARNING: weak, publicly-known password. Use only for local or throwaway
-- environments, and change it after first login.
--
-- If your SQL editor reports that crypt()/gen_salt() do not exist, replace
-- them with extensions.crypt() and extensions.gen_salt().
do $$
declare
  v_email     text := 'javierrenren1@gmail.com';
  v_password  text := 'admin123';
  v_full_name text := 'Javier Renren';
  v_user_id   uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower(v_email)
  limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      reauthentication_token,
      email_change_confirm_status,
      is_super_admin
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name),
      '',
      '',
      '',
      '',
      '',
      '',
      0,
      false
    );
  else
    -- Repair rows created by older versions of this seed: GoTrue expects
    -- these token columns to be empty strings, not NULL.
    update auth.users
    set encrypted_password          = crypt(v_password, gen_salt('bf')),
        email_confirmed_at          = coalesce(email_confirmed_at, now()),
        confirmation_token          = coalesce(confirmation_token, ''),
        recovery_token              = coalesce(recovery_token, ''),
        email_change_token_new      = coalesce(email_change_token_new, ''),
        email_change                = coalesce(email_change, ''),
        email_change_token_current  = coalesce(email_change_token_current, ''),
        reauthentication_token      = coalesce(reauthentication_token, ''),
        email_change_confirm_status = coalesce(email_change_confirm_status, 0),
        is_super_admin              = coalesce(is_super_admin, false),
        updated_at                  = now()
    where id = v_user_id;
  end if;

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do update
  set identity_data = excluded.identity_data,
      updated_at    = now();

  insert into public.profiles (id, email, full_name, role, is_active)
  values (v_user_id, v_email, v_full_name, 'admin', true)
  on conflict (id) do update
  set email      = excluded.email,
      full_name  = excluded.full_name,
      role       = 'admin',
      is_active  = true,
      updated_at = now();
end $$;
