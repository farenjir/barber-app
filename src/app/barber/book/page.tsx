import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/MantineAppShell';
import BookClient from './client';

export const dynamic = 'force-dynamic';

export default async function BarberBook() {
  const user = await requireBarber();
  
  const barber = await sql`SELECT id, display_name FROM barbers WHERE user_id = ${user.id}` as any[];
  if (barber.length === 0) {
    return <div className="p-4 text-center">شما به عنوان آرایشگر ثبت نشده‌اید.</div>;
  }
  
  const barberId = barber[0].id;
  
  const services = await sql`
    SELECT * FROM services 
    WHERE barber_id = ${barberId} AND is_active = true
    ORDER BY name
  ` as any[];

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={barber[0].display_name}
      pageTitle="نوبت دستی"
    >
      <BookClient barberId={barberId} services={services} userRole={user.role as 'barber' | 'super_admin'} />
    </AppShell>
  );
}
