import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/MantineAppShell';
import { Text, Center } from '@mantine/core';
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
      <Center style={{ minHeight: '100vh' }} p="xl">
        <Text c="red" ta="center">شما به عنوان آرایشگر ثبت نشده‌اید.</Text>
      </Center>
    );
  }

  const customers = await getBarberCustomers(user.id);

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={barber[0].display_name}
      pageTitle="لیست مشتریان"
      isSuperAdmin={user.role === 'super_admin'}
    >
      <CustomersClient customers={customers} />
    </AppShell>
  );
}
