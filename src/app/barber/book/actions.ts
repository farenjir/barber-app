'use server';

import { sql } from '@/db/client';
import { revalidatePath } from 'next/cache';

export async function createAppointment(
  barberId: number,
  serviceId: number,
  datetime: string,
  customerName: string,
  customerPhone: string
) {
  const service = await sql`SELECT duration_minutes FROM services WHERE id = ${serviceId}` as any[];
  const duration = service[0].duration_minutes;
  
  await sql`
    INSERT INTO appointments (
      barber_id, service_id, customer_telegram_id, customer_name, 
      customer_phone, appointment_time, duration_minutes, status
    ) VALUES (
      ${barberId}, ${serviceId}, 0, ${customerName}, 
      ${customerPhone}, ${datetime}, ${duration}, 'confirmed'
    )
  `;
  
  revalidatePath('/barber/book');
  revalidatePath('/barber');
  revalidatePath('/barber/calendar');
}
