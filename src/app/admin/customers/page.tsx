import { requireAdmin } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/MantineAppShell';
import CustomersClient from './client';

export const dynamic = 'force-dynamic';

export default async function AdminCustomers() {
  const user = await requireAdmin();
  
  const customers = await sql`
    SELECT 
      customer_telegram_id,
      customer_name,
      customer_phone,
      COUNT(*) as total_appointments,
      MAX(appointment_time) as last_appointment,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count
    FROM appointments
    GROUP BY customer_telegram_id, customer_name, customer_phone
    ORDER BY last_appointment DESC
  ` as any[];

  return (
    <AppShell
      userName={user.name}
      userRole="super_admin"
      pageTitle="مدیریت مشتریان"
    >
      <CustomersClient customers={customers} />
    </AppShell>
  );
}
