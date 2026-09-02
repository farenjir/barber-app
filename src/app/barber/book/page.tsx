import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { redirect } from 'next/navigation';
import { getAvailableSlots } from '@/lib/slots';
import { getTehranDayStart, addTehranDays } from '@/lib/tehran-time';
import { formatFullJalaliDate, formatTime } from '@/lib/jalali';
import BarberBookClient from './client';

export const dynamic = 'force-dynamic';

async function createAppointment(formData: FormData, barberId: number) {
  'use server';
  
  const serviceId = parseInt(formData.get('service') as string);
  const dateTime = formData.get('datetime') as string;
  const customerName = formData.get('name') as string;
  const customerPhone = formData.get('phone') as string;
  
  const service = await sql`SELECT duration_minutes FROM services WHERE id = ${serviceId}` as any[];
  const duration = service[0].duration_minutes;
  
  await sql`
    INSERT INTO appointments (
      barber_id, service_id, customer_telegram_id, customer_name, 
      customer_phone, appointment_time, duration_minutes, status
    ) VALUES (
      ${barberId}, ${serviceId}, 0, ${customerName}, 
      ${customerPhone}, ${dateTime}, ${duration}, 'confirmed'
    )
  `;
  
  redirect('/barber/book?success=1');
}

export default async function BarberBook({
  searchParams,
}: {
  searchParams: { success?: string; service?: string; date?: string };
}) {
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
  
  const today = getTehranDayStart();
  const daysData = Array.from({ length: 14 }, (_, i) => {
    const day = addTehranDays(today, i);
    return {
      value: day.toISOString(),
      label: formatFullJalaliDate(day),
    };
  });
  
  let availableSlotsData: any[] = [];
  if (searchParams.service && searchParams.date) {
    const service = services.find((s: any) => s.id === parseInt(searchParams.service!));
    if (service) {
      const date = new Date(searchParams.date);
      const slots = await getAvailableSlots(barberId, date, service.duration_minutes);
      availableSlotsData = slots.map((slot) => ({
        value: slot.toISOString(),
        label: formatTime(slot),
      }));
    }
  }

  return (
    <BarberBookClient
      user={user}
      barberName={barber[0].display_name}
      services={services}
      days={daysData}
      availableSlots={availableSlotsData}
      searchParams={searchParams}
    />
  );
}
