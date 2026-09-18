-- ============================================================
-- EXCLUSIVE RESORT BOOKING SYSTEM - DATABASE SCHEMA
-- PostgreSQL / Supabase
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'client');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled', 'completed');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'refunded');
CREATE TYPE package_type AS ENUM ('basic', 'premium_ac');
CREATE TYPE day_type AS ENUM ('weekday', 'weekend', 'holiday');
CREATE TYPE notification_type AS ENUM (
  'booking_submitted',
  'booking_approved',
  'booking_rejected',
  'booking_cancelled',
  'booking_completed',
  'payment_received',
  'system'
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'client',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================================
-- RESORT SETTINGS
-- ============================================================

CREATE TABLE resort_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resort_name TEXT NOT NULL DEFAULT 'Exclusive Resort',
  description TEXT NOT NULL DEFAULT '',
  contact_number TEXT DEFAULT '',
  facebook_page TEXT DEFAULT '',
  google_map_url TEXT DEFAULT '',
  address TEXT DEFAULT '',
  check_in_time TIME NOT NULL DEFAULT '14:00',
  check_out_time TIME NOT NULL DEFAULT '12:00',
  max_parking_slots INTEGER NOT NULL DEFAULT 6,
  videoke_curfew TIME NOT NULL DEFAULT '22:00',
  hero_video_url TEXT,
  meta_title TEXT DEFAULT 'Exclusive Resort Booking',
  meta_description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GALLERY
-- ============================================================

CREATE TABLE gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  title TEXT DEFAULT '',
  alt_text TEXT DEFAULT '',
  is_cover BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gallery_sort ON gallery(sort_order);
CREATE INDEX idx_gallery_cover ON gallery(is_cover) WHERE is_cover = true;

-- ============================================================
-- HERO IMAGES
-- ============================================================

CREATE TABLE hero_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  title TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hero_sort ON hero_images(sort_order);

-- ============================================================
-- AMENITIES
-- ============================================================

CREATE TABLE amenities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'check',
  category TEXT DEFAULT 'general',
  is_included BOOLEAN NOT NULL DEFAULT true,
  additional_fee DECIMAL(10,2) DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_amenities_sort ON amenities(sort_order);

-- ============================================================
-- POLICIES
-- ============================================================

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT 'info',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policies_sort ON policies(sort_order);

-- ============================================================
-- RESORT INCLUSIONS
-- ============================================================

CREATE TABLE inclusions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'check',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RATES (Package Pricing)
-- ============================================================

CREATE TABLE rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_type package_type NOT NULL,
  guest_count INTEGER NOT NULL,
  weekday_price DECIMAL(10,2) NOT NULL,
  weekend_price DECIMAL(10,2) NOT NULL,
  holiday_price DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(package_type, guest_count)
);

CREATE INDEX idx_rates_package ON rates(package_type);

-- ============================================================
-- ADDITIONAL FEES
-- ============================================================

CREATE TABLE additional_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  price DECIMAL(10,2) NOT NULL,
  is_per_unit BOOLEAN NOT NULL DEFAULT false,
  max_quantity INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HOLIDAYS
-- ============================================================

CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holidays_date ON holidays(date);

-- ============================================================
-- PROMO CODES
-- ============================================================

CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_code ON promo_codes(code);

-- ============================================================
-- BOOKINGS (Exclusive: one booking per day)
-- ============================================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_reference TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_address TEXT DEFAULT '',
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL DEFAULT (check_in_date + INTERVAL '1 day'),
  number_of_guests INTEGER NOT NULL CHECK (number_of_guests > 0),
  package_type package_type NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  base_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  addons_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  extra_guests_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  day_type day_type NOT NULL DEFAULT 'weekday',
  special_requests TEXT DEFAULT '',
  valid_id_url TEXT,
  valid_id_path TEXT,
  admin_notes TEXT DEFAULT '',
  qr_code_data TEXT,
  is_pwd_discount BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT exclusive_booking UNIQUE (check_in_date),
  CONSTRAINT valid_date_range CHECK (check_out_date > check_in_date)
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_check_in ON bookings(check_in_date);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);

-- ============================================================
-- BOOKING ADD-ONS
-- ============================================================

CREATE TABLE booking_addons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  additional_fee_id UUID NOT NULL REFERENCES additional_fees(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_addons_booking ON booking_addons(booking_id);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT '',
  transaction_reference TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- ============================================================
-- CALENDAR EVENTS (denormalized view for fast calendar queries)
-- ============================================================

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  status booking_status NOT NULL,
  guest_name TEXT NOT NULL,
  number_of_guests INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_date)
);

CREATE INDEX idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_resort_settings_updated BEFORE UPDATE ON resort_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_gallery_updated BEFORE UPDATE ON gallery FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_amenities_updated BEFORE UPDATE ON amenities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_policies_updated BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_rates_updated BEFORE UPDATE ON rates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_additional_fees_updated BEFORE UPDATE ON additional_fees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_bookings_updated BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_payments_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_promo_codes_updated BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_reference IS NULL OR NEW.booking_reference = '' THEN
    NEW.booking_reference = 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_booking_reference BEFORE INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION generate_booking_reference();

-- Sync calendar events on booking changes
CREATE OR REPLACE FUNCTION sync_calendar_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO calendar_events (booking_id, event_date, title, status, guest_name, number_of_guests, total_amount)
    VALUES (NEW.id, NEW.check_in_date, NEW.guest_name || ' - ' || NEW.package_type::TEXT, NEW.status, NEW.guest_name, NEW.number_of_guests, NEW.total_amount);
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE calendar_events SET
      event_date = NEW.check_in_date,
      title = NEW.guest_name || ' - ' || NEW.package_type::TEXT,
      status = NEW.status,
      guest_name = NEW.guest_name,
      number_of_guests = NEW.number_of_guests,
      total_amount = NEW.total_amount
    WHERE booking_id = NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM calendar_events WHERE booking_id = OLD.id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sync_calendar AFTER INSERT OR UPDATE OR DELETE ON bookings FOR EACH ROW EXECUTE FUNCTION sync_calendar_event();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Check booking conflict function
CREATE OR REPLACE FUNCTION check_booking_conflict(p_check_in_date DATE, p_booking_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bookings
    WHERE check_in_date = p_check_in_date
    AND status NOT IN ('cancelled', 'rejected')
    AND (p_booking_id IS NULL OR id != p_booking_id)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resort_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE inclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT WITH CHECK (is_admin());

-- RESORT SETTINGS - public read, admin write
CREATE POLICY "Resort settings viewable by all" ON resort_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage resort settings" ON resort_settings FOR ALL USING (is_admin());

-- GALLERY - public read, admin write
CREATE POLICY "Gallery viewable by all" ON gallery FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admins manage gallery" ON gallery FOR ALL USING (is_admin());

-- HERO IMAGES - public read, admin write
CREATE POLICY "Hero images viewable by all" ON hero_images FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admins manage hero images" ON hero_images FOR ALL USING (is_admin());

-- AMENITIES - public read, admin write
CREATE POLICY "Amenities viewable by all" ON amenities FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admins manage amenities" ON amenities FOR ALL USING (is_admin());

-- POLICIES - public read, admin write
CREATE POLICY "Policies viewable by all" ON policies FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admins manage policies" ON policies FOR ALL USING (is_admin());

-- INCLUSIONS - public read, admin write
CREATE POLICY "Inclusions viewable by all" ON inclusions FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admins manage inclusions" ON inclusions FOR ALL USING (is_admin());

-- RATES - public read, admin write
CREATE POLICY "Rates viewable by all" ON rates FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admins manage rates" ON rates FOR ALL USING (is_admin());

-- ADDITIONAL FEES - public read, admin write
CREATE POLICY "Additional fees viewable by all" ON additional_fees FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admins manage additional fees" ON additional_fees FOR ALL USING (is_admin());

-- HOLIDAYS - public read, admin write
CREATE POLICY "Holidays viewable by all" ON holidays FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admins manage holidays" ON holidays FOR ALL USING (is_admin());

-- PROMO CODES - admin only except validate
CREATE POLICY "Admins manage promo codes" ON promo_codes FOR ALL USING (is_admin());

-- BOOKINGS
CREATE POLICY "Users view own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Anyone can create booking" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update own pending bookings" ON bookings FOR UPDATE USING (
  (auth.uid() = user_id AND status = 'pending') OR is_admin()
);
CREATE POLICY "Admins delete bookings" ON bookings FOR DELETE USING (is_admin());

-- BOOKING ADDONS
CREATE POLICY "View booking addons" ON booking_addons FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_addons.booking_id AND (bookings.user_id = auth.uid() OR is_admin()))
);
CREATE POLICY "Insert booking addons" ON booking_addons FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage booking addons" ON booking_addons FOR ALL USING (is_admin());

-- PAYMENTS
CREATE POLICY "View own payments" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND (bookings.user_id = auth.uid() OR is_admin()))
);
CREATE POLICY "Admins manage payments" ON payments FOR ALL USING (is_admin());

-- NOTIFICATIONS
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- ACTIVITY LOGS - admin only
CREATE POLICY "Admins view activity logs" ON activity_logs FOR SELECT USING (is_admin());
CREATE POLICY "Insert activity logs" ON activity_logs FOR INSERT WITH CHECK (true);

-- CALENDAR EVENTS
CREATE POLICY "Public calendar view" ON calendar_events FOR SELECT USING (true);
CREATE POLICY "Admins manage calendar events" ON calendar_events FOR ALL USING (is_admin());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Run in Supabase Dashboard or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('hero', 'hero', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
