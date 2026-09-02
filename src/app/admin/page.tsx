import { requireAdmin } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/MantineAppShell';
import AdminDashboardClient from './client';
import { getTehranDayStart, addTehranDays } from '@/lib/tehran-time';

export const dynamic = 'force-dynamic';

async function getAdminStats() {
  const barbers = await sql`
    SELECT COUNT(*) as count FROM barbers WHERE is_active = true
  ` as any[];

  const customers = await sql`
    SELECT COUNT(DISTINCT customer_telegram_id) as count FROM appointments
  ` as any[];

  const today = getTehranDayStart(new Date());
  const tomorrow = addTehranDays(today, 1);

  const todayAppointments = await sql`
    SELECT COUNT(*) as count FROM appointments
    WHERE appointment_time >= ${today.toISOString()}
    AND appointment_time < ${tomorrow.toISOString()}
    AND status IN ('pending', 'confirmed')
  ` as any[];

  const recentAppointments = await sql`
    SELECT a.*, s.name as service_name, b.display_name as barber_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN barbers b ON a.barber_id = b.id
    ORDER BY a.created_at DESC
    LIMIT 10
  ` as any[];

  // Weekly appointment trend (last 7 days)
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = addTehranDays(today, -i);
    const dayEnd = addTehranDays(dayStart, 1);
    
    const count = await sql`
      SELECT COUNT(*) as count FROM appointments
      WHERE appointment_time >= ${dayStart.toISOString()}
      AND appointment_time < ${dayEnd.toISOString()}
      AND status IN ('pending', 'confirmed')
    ` as any[];
    
    weeklyData.push({
      day: dayStart.toLocaleDateString('fa-IR', { weekday: 'short' }),
      count: parseInt(count[0].count),
    });
  }

  return {
    barbersCount: parseInt(barbers[0].count),
    customersCount: parseInt(customers[0].count),
    todayAppointmentsCount: parseInt(todayAppointments[0].count),
    recentAppointments,
    weeklyData,
  };
}

export default async function AdminDashboard() {
  const user = await requireAdmin();
  const stats = await getAdminStats();

  return (
    <AppShell
      userName={user.name}
      userRole="super_admin"
      pageTitle="داشبورد مدیریت"
    >
      <AdminDashboardClient stats={stats} />
    </AppShell>
  );
}
