import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/MantineAppShell';
import CustomersClient from './client';

export const dynamic = 'force-dynamic';

async function getBarberCustomers(userId: number) {
  const barber = await sql`
    SELECT id FROM barbers WHERE user_id = ${userId}
  ` as any[];

  if (barber.length === 0) return null;

  return await sql`
    SELECT DISTINCT 
      customer_telegram_id,
      customer_name,
      customer_phone,
      MAX(appointment_time) as last_appointment,
      COUNT(*) as total_appointments
    FROM appointments
    WHERE barber_id = ${barber[0].id}
    GROUP BY customer_telegram_id, customer_name, customer_phone
    ORDER BY last_appointment DESC
    LIMIT 100
  ` as any[];
}

export default async function BarberCustomers() {
  const user = await requireBarber();
  
  const barber = await sql`
    SELECT id, display_name FROM barbers WHERE user_id = ${user.id}
  ` as any[];
  
  if (barber.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="p-8 text-center">
          <p className="text-red-600">شما به عنوان آرایشگر ثبت نشده‌اید.</p>
        </div>
      </div>
    );
  }

  const customers = await getBarberCustomers(user.id);

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={barber[0].display_name}
      pageTitle="لیست مشتریان"
    >
      <CustomersClient customers={customers} />
    </AppShell>
  );
}
