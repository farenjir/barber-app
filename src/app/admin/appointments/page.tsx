import { requireAdmin } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/MantineAppShell';
import AppointmentsClient from './client';
import { getTehranDayStart, addTehranDays } from '@/lib/tehran-time';

export const dynamic = 'force-dynamic';

export default async function AdminAppointments({
  searchParams,
}: {
  searchParams: Promise<{ barber?: string; status?: string; from?: string }>;
}) {
  const user = await requireAdmin();
  const params = await searchParams;
  
  const barbers = await sql`
    SELECT b.id, b.display_name 
    FROM barbers b
    WHERE b.is_active = true
    ORDER BY b.display_name
  ` as any[];
  
  let query = sql`
    SELECT 
      a.*,
      s.name as service_name,
      b.display_name as barber_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN barbers b ON a.barber_id = b.id
    WHERE 1=1
  `;
  
  const conditions: any[] = [];
  
  if (params.barber) {
    conditions.push(sql`AND a.barber_id = ${parseInt(params.barber)}`);
  }
  
  if (params.status) {
    conditions.push(sql`AND a.status = ${params.status}`);
  }
  
  if (params.from === 'upcoming') {
    const now = new Date();
    conditions.push(sql`AND a.appointment_time >= ${now.toISOString()}`);
  } else if (params.from === 'past') {
    const now = new Date();
    conditions.push(sql`AND a.appointment_time < ${now.toISOString()}`);
  } else if (params.from === 'today') {
    const today = getTehranDayStart();
    const tomorrow = addTehranDays(today, 1);
    conditions.push(sql`AND a.appointment_time >= ${today.toISOString()} AND a.appointment_time < ${tomorrow.toISOString()}`);
  }
  
  if (conditions.length > 0) {
    query = sql`${query} ${sql(conditions.map(c => c.strings[0]).join(' '))}`;
  }
  
  query = sql`${query} ORDER BY a.appointment_time DESC LIMIT 100`;
  
  const appointments = await query as any[];

  return (
    <AppShell
      userName={user.name}
      userRole="super_admin"
      pageTitle="مدیریت نوبت‌ها"
    >
      <AppointmentsClient 
        appointments={appointments}
        barbers={barbers}
        filters={params}
      />
    </AppShell>
  );
}
