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
  
  const barberId = params.barber ? parseInt(params.barber) : null;
  const status = params.status || null;
  
  let appointments: any[];
  
  if (!params.barber && !params.status && !params.from) {
    appointments = await sql`
      SELECT 
        a.*,
        s.name as service_name,
        b.display_name as barber_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN barbers b ON a.barber_id = b.id
      ORDER BY a.appointment_time DESC 
      LIMIT 100
    ` as any[];
  } else if (params.from === 'upcoming') {
    const now = new Date().toISOString();
    if (barberId && status) {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.barber_id = ${barberId} AND a.status = ${status} AND a.appointment_time >= ${now}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    } else if (barberId) {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.barber_id = ${barberId} AND a.appointment_time >= ${now}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    } else if (status) {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.status = ${status} AND a.appointment_time >= ${now}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    } else {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.appointment_time >= ${now}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    }
  } else if (params.from === 'past') {
    const now = new Date().toISOString();
    if (barberId && status) {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.barber_id = ${barberId} AND a.status = ${status} AND a.appointment_time < ${now}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    } else if (barberId) {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.barber_id = ${barberId} AND a.appointment_time < ${now}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    } else if (status) {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.status = ${status} AND a.appointment_time < ${now}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    } else {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.appointment_time < ${now}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    }
  } else if (params.from === 'today') {
    const today = getTehranDayStart().toISOString();
    const tomorrow = addTehranDays(getTehranDayStart(), 1).toISOString();
    if (barberId && status) {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.barber_id = ${barberId} AND a.status = ${status} 
          AND a.appointment_time >= ${today} AND a.appointment_time < ${tomorrow}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    } else if (barberId) {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.barber_id = ${barberId} AND a.appointment_time >= ${today} AND a.appointment_time < ${tomorrow}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    } else if (status) {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.status = ${status} AND a.appointment_time >= ${today} AND a.appointment_time < ${tomorrow}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    } else {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.appointment_time >= ${today} AND a.appointment_time < ${tomorrow}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    }
  } else {
    if (barberId && status) {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.barber_id = ${barberId} AND a.status = ${status}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    } else if (barberId) {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.barber_id = ${barberId}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    } else if (status) {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        WHERE a.status = ${status}
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    } else {
      appointments = await sql`
        SELECT a.*, s.name as service_name, b.display_name as barber_name
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        JOIN barbers b ON a.barber_id = b.id
        ORDER BY a.appointment_time DESC LIMIT 100
      ` as any[];
    }
  }

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
