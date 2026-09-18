-- ============================================================
-- SEED DATA FOR EXCLUSIVE RESORT BOOKING SYSTEM
-- ============================================================
-- Usage:
--   Local  : npx supabase db reset          (runs migrations + this seed)
--   Remote : paste this file into the Supabase Dashboard -> SQL Editor
--
-- Notes:
--   * Re-runnable: content tables are guarded / use ON CONFLICT DO NOTHING.
--   * Gallery and hero images are NOT seeded here. They come from the bundled
--     mock data in src/features/landing/mockContent.ts (see public/gallery
--     and public/hero for the image files). The DB tables remain empty so the
--     frontend falls back to the local mock content.
--   * Sample bookings are guest bookings (user_id = NULL) so no auth users
--     are required. Notifications cannot be seeded without a profile row.
-- ============================================================

-- ------------------------------------------------------------
-- RESORT SETTINGS (singleton)
-- ------------------------------------------------------------
INSERT INTO resort_settings (
  resort_name, description, contact_number, facebook_page,
  google_map_url, address, check_in_time, check_out_time,
  max_parking_slots, videoke_curfew, meta_title, meta_description
)
SELECT * FROM (VALUES (
  'The Farm',
  'Experience the calm of the countryside at The Farm, an exclusive private resort tucked away in a quiet, scenic location. With spacious rooms, modern comforts, and wide-open spaces, every stay becomes an unforgettable memory for families, friends, and special celebrations.',
  '+63 912 345 6789',
  'https://facebook.com/thefarm',
  'https://maps.google.com/?q=The+Farm+Exclusive+Resort',
  'Brgy. San Isidro, Antipolo City, Rizal, Philippines',
  '14:00'::time, '12:00'::time, 6, '22:00'::time,
  'The Farm - Book Your Private Getaway',
  'Exclusive private farm resort booking. One client per day. Spacious grounds, modern amenities, and total privacy.'
)) AS v(
  resort_name, description, contact_number, facebook_page,
  google_map_url, address, check_in_time, check_out_time,
  max_parking_slots, videoke_curfew, meta_title, meta_description
)
WHERE NOT EXISTS (SELECT 1 FROM resort_settings);

-- ------------------------------------------------------------
-- INCLUSIONS
-- ------------------------------------------------------------
INSERT INTO inclusions (name, description, icon, sort_order)
SELECT * FROM (VALUES
  ('2 Big Rooms', 'Spacious rooms with comfortable beds', 'bed-double', 1),
  ('Foam & Beddings', 'Quality foam mattresses and fresh linens', 'bed', 2),
  ('Ceiling Fans', 'Cool comfort in every room', 'fan', 3),
  ('2 Full Bathrooms', 'Complete bathroom facilities', 'bath', 4),
  ('2 Half Bathrooms', 'Additional comfort rooms', 'bath', 5),
  ('Furnished Kitchen', 'Fully equipped cooking area', 'chef-hat', 6),
  ('Refrigerator', 'Keep your food fresh', 'refrigerator', 7),
  ('Water Dispenser', 'Clean drinking water available', 'droplets', 8),
  ('Rice Cooker', 'Convenient meal preparation', 'cooking-pot', 9),
  ('Stove', 'Gas stove for cooking', 'flame', 10),
  ('Open Living Area', 'Spacious lounge for relaxation', 'sofa', 11),
  ('Dining Area', 'Comfortable dining space', 'utensils', 12),
  ('Smart & TNT Signal', 'Mobile network coverage', 'smartphone', 13),
  ('Piso WiFi', 'Affordable internet access', 'wifi', 14),
  ('Caretaker on Call', 'Assistance when you need it', 'user-check', 15),
  ('Generator', 'Uninterrupted power supply', 'zap', 16),
  ('Kiddie Pool', 'Fun for the little ones (additional fee)', 'waves', 17),
  ('Videoke', 'Entertainment system (additional fee)', 'mic', 18)
) AS v(name, description, icon, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM inclusions);

-- ------------------------------------------------------------
-- AMENITIES
-- ------------------------------------------------------------
INSERT INTO amenities (name, description, icon, category, is_included, sort_order)
SELECT * FROM (VALUES
  ('Swimming Pool', 'Refreshing pool for all ages', 'waves', 'outdoor', true, 1),
  ('Garden Area', 'Beautiful landscaped gardens', 'tree-pine', 'outdoor', true, 2),
  ('Parking Area', 'Secure parking for up to 6 vehicles', 'car', 'facilities', true, 3),
  ('BBQ Area', 'Outdoor grilling station', 'flame', 'outdoor', true, 4),
  ('Gazebo', 'Shaded outdoor lounge', 'home', 'outdoor', true, 5),
  ('Kiddie Pool', 'Safe pool for children', 'baby', 'outdoor', false, 6),
  ('Videoke System', 'Complete karaoke setup', 'mic', 'entertainment', false, 7)
) AS v(name, description, icon, category, is_included, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM amenities);

-- ------------------------------------------------------------
-- POLICIES
-- ------------------------------------------------------------
INSERT INTO policies (title, description, icon, sort_order)
SELECT * FROM (VALUES
  ('Kids Policy', 'Kids below 5 years old are free of charge.', 'baby', 1),
  ('Corkage Fee', 'Corkage fee of ₱3,000 applies for groups of 50 guests and above.', 'wine', 2),
  ('Pet Policy', 'Pets are not allowed within the resort premises.', 'ban', 3),
  ('PWD Discount', 'PWD discount available upon presentation of valid ID.', 'heart-handshake', 4),
  ('Check-in Time', 'Check-in time is 2:00 PM.', 'log-in', 5),
  ('Check-out Time', 'Check-out time is 12:00 PM.', 'log-out', 6),
  ('Parking', 'Maximum of 6 parking slots available.', 'car', 7),
  ('Videoke Curfew', 'Videoke must be turned off by 10:00 PM.', 'clock', 8)
) AS v(title, description, icon, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM policies);

-- ------------------------------------------------------------
-- RATES
-- ------------------------------------------------------------
INSERT INTO rates (package_type, guest_count, weekday_price, weekend_price, holiday_price) VALUES
  ('basic', 10, 12000.00, 13000.00, 15000.00),
  ('basic', 20, 19000.00, 20000.00, 22000.00),
  ('basic', 30, 25000.00, 26000.00, 28000.00),
  ('premium_ac', 10, 15000.00, 16000.00, 18000.00),
  ('premium_ac', 23, 26000.00, 27000.00, 29000.00)
ON CONFLICT (package_type, guest_count) DO NOTHING;

-- ------------------------------------------------------------
-- ADDITIONAL FEES
-- ------------------------------------------------------------
INSERT INTO additional_fees (name, slug, description, price, is_per_unit, max_quantity, sort_order) VALUES
  ('Deluxe AC Room', 'deluxe-ac-room', 'Upgrade to deluxe air-conditioned room', 3500.00, false, 1, 1),
  ('Extra Bed', 'extra-bed', 'Additional sleeping arrangement', 600.00, true, 10, 2),
  ('Entrance Fee', 'entrance-fee', 'Per person entrance fee for extra guests', 300.00, true, 50, 3),
  ('Videoke', 'videoke', 'Karaoke entertainment system', 1000.00, false, 1, 4),
  ('PVC Kiddie Pool', 'kiddie-pool', 'Inflatable kiddie pool setup', 600.00, false, 1, 5),
  ('Towel', 'towel', 'Fresh towel rental', 150.00, true, 20, 6),
  ('Pillow', 'pillow', 'Extra pillow', 50.00, true, 20, 7)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- HOLIDAYS (2026 - 2027)
-- ------------------------------------------------------------
INSERT INTO holidays (name, date, description) VALUES
  ('New Year''s Day', '2026-01-01', 'New Year holiday'),
  ('Chinese New Year', '2026-02-17', 'Chinese New Year'),
  ('Maundy Thursday', '2026-04-02', 'Holy Week'),
  ('Good Friday', '2026-04-03', 'Holy Week'),
  ('Black Saturday', '2026-04-04', 'Holy Week'),
  ('Labor Day', '2026-05-01', 'Labor Day'),
  ('Independence Day', '2026-06-12', 'Independence Day'),
  ('National Heroes Day', '2026-08-31', 'National Heroes Day'),
  ('All Saints Day', '2026-11-01', 'All Saints Day'),
  ('Christmas Eve', '2026-12-24', 'Christmas holiday'),
  ('Christmas Day', '2026-12-25', 'Christmas'),
  ('Rizal Day', '2026-12-30', 'Rizal Day'),
  ('New Year''s Day', '2027-01-01', 'New Year holiday'),
  ('Labor Day', '2027-05-01', 'Labor Day'),
  ('Independence Day', '2027-06-12', 'Independence Day')
ON CONFLICT (date) DO NOTHING;

-- ------------------------------------------------------------
-- PROMO CODES
-- ------------------------------------------------------------
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_amount, max_uses, valid_until) VALUES
  ('WELCOME10', 'Welcome discount - 10% off', 'percentage', 10.00, 10000.00, 100, '2027-12-31'),
  ('SUMMER500', 'Summer special - ₱500 off', 'fixed', 500.00, 15000.00, 50, '2027-08-31'),
  ('BERMONTHS15', 'Ber months promo - 15% off', 'percentage', 15.00, 20000.00, 30, '2027-01-15')
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- (gallery and hero_images are intentionally not seeded here.
--  See mockContent.ts in src/features/landing for the bundled
--  image content used by the public site.)
-- ------------------------------------------------------------

-- ============================================================
-- SAMPLE BOOKINGS (guest checkouts, no auth user required)
-- Dates are relative to CURRENT_DATE so the demo stays fresh.
-- ============================================================
INSERT INTO bookings (
  booking_reference, user_id, guest_name, guest_email, guest_phone, guest_address,
  check_in_date, check_out_date, number_of_guests, package_type, status,
  base_rate, addons_total, extra_guests_fee, discount_amount, total_amount,
  day_type, special_requests, is_pwd_discount,
  approved_at, cancelled_at, cancelled_reason, rejected_at, rejected_reason
) VALUES
  ('BK-DEMO-0001', NULL, 'Maria Santos', 'maria.santos@example.com', '+63 917 111 2222', 'Quezon City',
   (CURRENT_DATE - INTERVAL '30 days')::date, (CURRENT_DATE - INTERVAL '29 days')::date, 20, 'basic', 'completed',
   20000, 1000, 0, 0, 21000, 'weekend', 'Family reunion celebration.', false,
   NOW() - INTERVAL '28 days', NULL, NULL, NULL, NULL),

  ('BK-DEMO-0002', NULL, 'Juan Dela Cruz', 'juan.delacruz@example.com', '+63 917 222 3333', 'Makati City',
   (CURRENT_DATE - INTERVAL '16 days')::date, (CURRENT_DATE - INTERVAL '15 days')::date, 10, 'premium_ac', 'completed',
   15000, 3500, 0, 0, 18500, 'weekday', 'Need air-conditioned rooms.', false,
   NOW() - INTERVAL '14 days', NULL, NULL, NULL, NULL),

  ('BK-DEMO-0003', NULL, 'Andrea Reyes', 'andrea.reyes@example.com', '+63 917 333 4444', 'Marikina City',
   (CURRENT_DATE - INTERVAL '7 days')::date, (CURRENT_DATE - INTERVAL '6 days')::date, 30, 'basic', 'completed',
   26000, 1200, 0, 0, 27200, 'weekend', 'Company team building.', false,
   NOW() - INTERVAL '5 days', NULL, NULL, NULL, NULL),

  ('BK-DEMO-0004', NULL, 'Carlo Mendoza', 'carlo.mendoza@example.com', '+63 917 444 5555', 'Pasig City',
   (CURRENT_DATE + INTERVAL '5 days')::date, (CURRENT_DATE + INTERVAL '6 days')::date, 23, 'premium_ac', 'confirmed',
   27000, 1600, 0, 0, 28600, 'weekend', 'Birthday celebration, please prepare videoke.', false,
   NOW() - INTERVAL '1 day', NULL, NULL, NULL, NULL),

  ('BK-DEMO-0005', NULL, 'Liza Fernandez', 'liza.fernandez@example.com', '+63 917 555 6666', 'Antipolo City',
   (CURRENT_DATE + INTERVAL '12 days')::date, (CURRENT_DATE + INTERVAL '13 days')::date, 11, 'basic', 'confirmed',
   12000, 600, 300, 0, 12900, 'weekday', 'One extra guest and an extra bed.', false,
   NOW() - INTERVAL '2 days', NULL, NULL, NULL, NULL),

  ('BK-DEMO-0006', NULL, 'Mark Villanueva', 'mark.villanueva@example.com', '+63 917 666 7777', 'Taguig City',
   (CURRENT_DATE + INTERVAL '20 days')::date, (CURRENT_DATE + INTERVAL '21 days')::date, 20, 'basic', 'pending',
   20000, 0, 0, 0, 20000, 'weekend', 'Awaiting confirmation of schedule.', false,
   NULL, NULL, NULL, NULL, NULL),

  ('BK-DEMO-0007', NULL, 'Grace Lim', 'grace.lim@example.com', '+63 917 777 8888', 'San Juan City',
   (CURRENT_DATE + INTERVAL '34 days')::date, (CURRENT_DATE + INTERVAL '35 days')::date, 10, 'premium_ac', 'pending',
   16000, 600, 0, 0, 16600, 'weekend', 'Requesting kiddie pool for the kids.', false,
   NULL, NULL, NULL, NULL, NULL),

  ('BK-DEMO-0008', NULL, 'Ramon Bautista', 'ramon.bautista@example.com', '+63 917 888 9999', 'Caloocan City',
   (CURRENT_DATE + INTERVAL '41 days')::date, (CURRENT_DATE + INTERVAL '42 days')::date, 20, 'basic', 'cancelled',
   20000, 0, 0, 0, 20000, 'weekend', 'Cancelled due to conflict.', false,
   NULL, NOW() - INTERVAL '1 day', 'Guest had a scheduling conflict.', NULL, NULL),

  ('BK-DEMO-0009', NULL, 'Sophia Tan', 'sophia.tan@example.com', '+63 918 111 0000', 'Mandaluyong City',
   (CURRENT_DATE + INTERVAL '48 days')::date, (CURRENT_DATE + INTERVAL '49 days')::date, 23, 'premium_ac', 'rejected',
   27000, 0, 0, 0, 27000, 'weekend', 'Requested dates already reserved.', false,
   NULL, NULL, NULL, NOW() - INTERVAL '2 days', 'No available slot on requested date.'),

  ('BK-DEMO-0010', NULL, 'Nicole Garcia', 'nicole.garcia@example.com', '+63 918 222 1111', 'Las Piñas City',
   (CURRENT_DATE + INTERVAL '60 days')::date, (CURRENT_DATE + INTERVAL '61 days')::date, 30, 'basic', 'confirmed',
   28000, 0, 0, 2800, 25200, 'holiday', 'Holiday family gathering. Used WELCOME10 promo.', false,
   NOW() - INTERVAL '1 day', NULL, NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- SAMPLE BOOKING ADD-ONS
-- ------------------------------------------------------------
INSERT INTO booking_addons (booking_id, additional_fee_id, quantity, unit_price, total_price)
SELECT b.id, f.id, v.quantity, f.price, f.price * v.quantity
FROM (VALUES
  ('BK-DEMO-0001', 'videoke', 1),
  ('BK-DEMO-0002', 'deluxe-ac-room', 1),
  ('BK-DEMO-0003', 'extra-bed', 2),
  ('BK-DEMO-0004', 'videoke', 1),
  ('BK-DEMO-0004', 'towel', 4),
  ('BK-DEMO-0005', 'extra-bed', 1),
  ('BK-DEMO-0007', 'kiddie-pool', 1)
) AS v(booking_ref, fee_slug, quantity)
JOIN bookings b ON b.booking_reference = v.booking_ref
JOIN additional_fees f ON f.slug = v.fee_slug
WHERE NOT EXISTS (SELECT 1 FROM booking_addons ba WHERE ba.booking_id = b.id);

-- ------------------------------------------------------------
-- SAMPLE PAYMENTS
-- ------------------------------------------------------------
INSERT INTO payments (booking_id, amount, status, payment_method, transaction_reference, notes, paid_at)
SELECT b.id, v.amount, v.status::payment_status, v.method, v.reference, v.notes,
       CASE WHEN v.status = 'paid' THEN b.created_at + INTERVAL '1 day' ELSE NULL END
FROM (VALUES
  ('BK-DEMO-0001', 21000, 'paid', 'GCash', 'GC-DEMO-0001', 'Full payment'),
  ('BK-DEMO-0002', 18500, 'paid', 'Bank Transfer', 'BT-DEMO-0002', 'Full payment'),
  ('BK-DEMO-0003', 27200, 'paid', 'Cash', 'CASH-DEMO-0003', 'Paid on site'),
  ('BK-DEMO-0004', 10000, 'partial', 'GCash', 'GC-DEMO-0004', '50% downpayment'),
  ('BK-DEMO-0005', 12900, 'paid', 'Maya', 'MAY-DEMO-0005', 'Full payment'),
  ('BK-DEMO-0006', 5000, 'pending', 'GCash', 'GC-DEMO-0006', 'Deposit awaiting confirmation'),
  ('BK-DEMO-0008', 20000, 'refunded', 'GCash', 'GC-DEMO-0008', 'Refunded after cancellation'),
  ('BK-DEMO-0010', 5000, 'partial', 'Bank Transfer', 'BT-DEMO-0010', 'Reservation deposit')
) AS v(booking_ref, amount, status, method, reference, notes)
JOIN bookings b ON b.booking_reference = v.booking_ref
WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = b.id);

-- ------------------------------------------------------------
-- SAMPLE ACTIVITY LOGS
-- ------------------------------------------------------------
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
SELECT NULL, v.action, 'booking', b.id, v.details::jsonb, '127.0.0.1'
FROM (VALUES
  ('booking.created', 'BK-DEMO-0006', '{"source":"website"}'),
  ('booking.updated', 'BK-DEMO-0005', '{"field":"number_of_guests"}'),
  ('booking.approved', 'BK-DEMO-0004', '{"channel":"admin"}'),
  ('payment.received', 'BK-DEMO-0004', '{"amount":10000,"method":"GCash"}'),
  ('booking.cancelled', 'BK-DEMO-0008', '{"reason":"scheduling conflict"}'),
  ('booking.rejected', 'BK-DEMO-0009', '{"reason":"no available slot"}')
) AS v(action, booking_ref, details)
JOIN bookings b ON b.booking_reference = v.booking_ref
WHERE NOT EXISTS (SELECT 1 FROM activity_logs);

-- ============================================================
-- DONE
-- ============================================================
