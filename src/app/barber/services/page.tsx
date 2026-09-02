import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/MantineAppShell';
import ServicesClient from './client';

export const dynamic = 'force-dynamic';

export default async function BarberServices() {
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
  
  const barberId = barber[0].id;
  
  const services = await sql`
    SELECT * FROM services 
    WHERE barber_id = ${barberId}
    ORDER BY is_active DESC, name ASC
  ` as any[];

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={barber[0].display_name}
      pageTitle="مدیریت خدمات"
      isSuperAdmin={user.role === 'super_admin'}
    >
      <ServicesClient barberId={barberId} initialServices={services} />
    </AppShell>
  );
}
