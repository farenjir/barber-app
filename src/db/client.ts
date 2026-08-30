import { neon } from '@neondatabase/serverless';

// Lazy initialization: only create client when first used
let _sql: ReturnType<typeof neon> | undefined;

function getSql() {
  if (_sql) return _sql;
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required at runtime');
  }
  
  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

// Export a tagged template function that lazily initializes the client
export const sql = new Proxy((() => {}) as any, {
  apply(target, thisArg, args: any[]) {
    const client = getSql();
    return (client as any)(...args);
  },
}) as ReturnType<typeof neon>;

export type Service = {
  id: number;
  name: string;
  duration_minutes: number;
  price_toman: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type WorkingHours = {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  is_open: boolean;
  created_at: Date;
  updated_at: Date;
};

export type BlockedSlot = {
  id: number;
  start_time: Date;
  end_time: Date;
  reason: string | null;
  created_at: Date;
};

export type Appointment = {
  id: number;
  service_id: number;
  customer_telegram_id: number;
  customer_name: string;
  customer_phone: string;
  customer_username: string | null;
  appointment_time: Date;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
};

export type SentReminder = {
  id: number;
  appointment_id: number;
  reminder_type: '24h' | '2h';
  sent_at: Date;
};

export type ChatState = {
  key: string;
  value: string;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
};
