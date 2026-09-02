import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/MantineAppShell';
import { Text, Center } from '@mantine/core';
import HoursClient from './client';

export const dynamic = 'force-dynamic';

const WEEKDAYS = [
  { value: 6, label: 'شنبه' },
  { value: 0, label: 'یکشنبه' },
  { value: 1, label: 'دوشنبه' },
  { value: 2, label: 'سه‌شنبه' },
  { value: 3, label: 'چهارشنبه' },
  { value: 4, label: 'پنج‌شنبه' },
  { value: 5, label: 'جمعه' },
];

export default async function BarberHours() {
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
  
  const workingHours = await sql`
    SELECT * FROM working_hours WHERE barber_id = ${barberId} ORDER BY weekday
  ` as any[];
  
  const hoursArray = workingHours.map((h: any) => ({
    weekday: h.weekday,
    is_open: h.is_open,
    start_time: h.start_time?.toString().substring(0, 5) || '10:00',
    end_time: h.end_time?.toString().substring(0, 5) || '21:00',
  }));

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={barber[0].display_name}
      pageTitle="ساعات کاری"
      isSuperAdmin={user.role === 'super_admin'}
    >
      <HoursClient barberId={barberId} weekdays={WEEKDAYS} hoursArray={hoursArray} />
    </AppShell>
  );
}
