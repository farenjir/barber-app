import { requireCustomer } from '@/lib/auth-server';
import { sql } from '@/db/client';
import CustomerAppointmentsClient from './client';

export const dynamic = 'force-dynamic';

async function getCustomerAppointments(telegramId: number) {
  const appointments = await sql`
    SELECT 
      a.id,
      a.appointment_time,
      a.status,
      a.customer_name,
      a.customer_phone,
      a.duration_minutes,
      s.name as service_name,
      s.price_toman,
      b.display_name as barber_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN barbers b ON a.barber_id = b.id
    WHERE a.customer_telegram_id = ${telegramId}
    ORDER BY a.appointment_time DESC
  ` as any[];
  
  return appointments;
}

export default async function CustomerPage() {
  const user = await requireCustomer();
  const appointments = await getCustomerAppointments(user.telegram_id);
  
  return <CustomerAppointmentsClient user={user} appointments={appointments} />;
}
