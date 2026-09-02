import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { getTehranDayStart, getTehranNextDayStart, addTehranDays } from '@/lib/tehran-time';
import { ensureBarberCode } from '@/lib/auth';
import { AppShell } from '@/components/MantineAppShell';
import { Title, Text } from '@mantine/core';
import BarberDashboardClient from './client';

export const dynamic = 'force-dynamic';

async function getBarberData(userId: number) {
  const barber = await sql`
    SELECT * FROM barbers WHERE user_id = ${userId}
  ` as any[];

  if (barber.length === 0) {
    return null;
  }

  const barberId = barber[0].id;
  
  // Ensure barber has a public code
  const publicCode = await ensureBarberCode(barberId);
  const now = new Date();
  const today = getTehranDayStart(now);
  const tomorrow = getTehranNextDayStart(now);

  const todayAppointments = await sql`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.barber_id = ${barberId}
    AND a.appointment_time >= ${today.toISOString()}
    AND a.appointment_time < ${tomorrow.toISOString()}
    AND a.status IN ('pending', 'confirmed')
    ORDER BY a.appointment_time ASC
  ` as any[];

  const servicesCount = await sql`
    SELECT COUNT(*) as count FROM services 
    WHERE barber_id = ${barberId} AND is_active = true
  ` as any[];

  const nextWeek = addTehranDays(today, 7);
  const upcomingCount = await sql`
    SELECT COUNT(*) as count FROM appointments 
    WHERE barber_id = ${barberId}
    AND appointment_time >= ${today.toISOString()}
    AND appointment_time < ${nextWeek.toISOString()}
    AND status IN ('pending', 'confirmed')
  ` as any[];

  // Get weekly appointment counts for chart (last 7 days)
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = addTehranDays(today, -i);
    const dayEnd = addTehranDays(dayStart, 1);
    
    const count = await sql`
      SELECT COUNT(*) as count FROM appointments
      WHERE barber_id = ${barberId}
      AND appointment_time >= ${dayStart.toISOString()}
      AND appointment_time < ${dayEnd.toISOString()}
      AND status IN ('pending', 'confirmed')
    ` as any[];
    
    weeklyData.push({
      day: dayStart.toLocaleDateString('fa-IR', { weekday: 'short' }),
      count: parseInt(count[0].count),
    });
  }

  return {
    barber: { ...barber[0], public_code: publicCode },
    todayAppointments,
    servicesCount: parseInt(servicesCount[0].count),
    upcomingCount: parseInt(upcomingCount[0].count),
    weeklyData,
  };
}

export default async function BarberDashboard() {
  const user = await requireBarber();
  const data = await getBarberData(user.id);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="p-8 text-center">
          <Title order={2} c="red" mb="md">خطا</Title>
          <Text>شما به عنوان آرایشگر ثبت نشده‌اید.</Text>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={data.barber.display_name}
      pageTitle="داشبورد"
      isSuperAdmin={user.role === 'super_admin'}
    >
      <BarberDashboardClient data={data} />
    </AppShell>
  );
}
