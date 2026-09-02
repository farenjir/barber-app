-- Barber Appointment Bot Database Schema Migration
-- This migration is safe for existing production databases

-- Step 1: Create new tables for multi-barber support
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('customer', 'barber', 'super_admin')),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS barbers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS magic_links (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 2: Add barber_id to existing tables (if not already present)
-- Services
ALTER TABLE services ADD COLUMN IF NOT EXISTS barber_id INTEGER;

-- Working hours
ALTER TABLE working_hours ADD COLUMN IF NOT EXISTS barber_id INTEGER;
-- Drop old unique constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'working_hours_weekday_key'
  ) THEN
    ALTER TABLE working_hours DROP CONSTRAINT working_hours_weekday_key;
  END IF;
END $$;

-- Blocked slots
ALTER TABLE blocked_slots ADD COLUMN IF NOT EXISTS barber_id INTEGER;

-- Appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS barber_id INTEGER;

-- Step 3: Create indexes for new columns (only if columns exist and indexes don't)
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_barbers_user_id ON barbers(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_services_barber ON services(barber_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_barber ON working_hours(barber_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_barber ON blocked_slots(barber_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_time ON blocked_slots(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);

-- Existing indexes
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_telegram_id);
CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments(appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_chat_state_expires ON chat_state(expires_at) WHERE expires_at IS NOT NULL;

-- Note: The migration script will:
-- 1. Check if barber_id columns have data
-- 2. If no data, create first barber and backfill
-- 3. Set barber_id as NOT NULL
-- 4. Add foreign key constraints
-- 5. Add unique constraint for working_hours (barber_id, weekday)
