import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/MantineAppShell';
import { Text, Center } from '@mantine/core';
import CalendarClient from './client';

export const dynamic = 'force-dynamic';

export default async function BarberCalendar() {
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
  
  const barberId = barber[0].id;
  
  // Get working hours for start/end time
  const workingHours = await sql`
    SELECT MIN(start_time) as earliest, MAX(end_time) as latest
    FROM working_hours 
    WHERE barber_id = ${barberId} AND is_open = true
  ` as any[];
  
  const startTime = workingHours[0]?.earliest || '10:00:00';
  const endTime = workingHours[0]?.latest || '21:00:00';
  
  // Get appointments for the calendar (wider window for week navigation)
  const appointments = await sql`
    SELECT 
      a.id,
      a.appointment_time,
      a.duration_minutes,
      a.customer_name,
      a.status,
      s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.barber_id = ${barberId}
      AND a.appointment_time >= NOW() - INTERVAL '30 days'
      AND a.appointment_time <= NOW() + INTERVAL '60 days'
      AND a.status IN ('pending', 'confirmed')
    ORDER BY a.appointment_time
  ` as any[];

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={barber[0].display_name}
      pageTitle="تقویم نوبت‌ها"
      isSuperAdmin={user.role === 'super_admin'}
    >
      <CalendarClient 
        appointments={appointments}
        startTime={startTime}
        endTime={endTime}
      />
    </AppShell>
  );
}
