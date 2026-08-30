-- Barber Appointment Bot Database Schema

-- Services offered by the salon
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price_toman INTEGER NOT NULL CHECK (price_toman >= 0),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Working hours configuration (per weekday)
CREATE TABLE IF NOT EXISTS working_hours (
  id SERIAL PRIMARY KEY,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_open BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(weekday)
);

-- Blocked time slots (full day or specific time range)
CREATE TABLE IF NOT EXISTS blocked_slots (
  id SERIAL PRIMARY KEY,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CHECK (end_time > start_time)
);

-- Customer appointments
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  customer_telegram_id BIGINT NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_username VARCHAR(255),
  appointment_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Reminders sent (to ensure idempotency)
CREATE TABLE IF NOT EXISTS sent_reminders (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('24h', '2h')),
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(appointment_id, reminder_type)
);

-- Chat SDK state storage (for conversation state management)
CREATE TABLE IF NOT EXISTS chat_state (
  key VARCHAR(512) PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_telegram_id);
CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments(appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_time ON blocked_slots(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_chat_state_expires ON chat_state(expires_at) WHERE expires_at IS NOT NULL;
