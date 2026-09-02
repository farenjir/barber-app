import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/MantineAppShell';
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
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="p-8 text-center">
          <p className="text-red-600">شما به عنوان آرایشگر ثبت نشده‌اید.</p>
        </div>
      </div>
    );
  }
  
  const barberId = barber[0].id;
  
  const workingHours = await sql`
    SELECT * FROM working_hours WHERE barber_id = ${barberId} ORDER BY weekday
  ` as any[];
  
  const hoursMap = new Map(workingHours.map((h: any) => [h.weekday, h]));

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={barber[0].display_name}
      pageTitle="ساعات کاری"
    >
      <HoursClient barberId={barberId} weekdays={WEEKDAYS} hoursMap={hoursMap} />
    </AppShell>
  );
}
