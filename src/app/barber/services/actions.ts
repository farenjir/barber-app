'use server';

import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { revalidatePath } from 'next/cache';

export async function createService(barberId: number, name: string, duration: number, price: number) {
  await requireBarber();
  
  const [result] = await sql`
    INSERT INTO services (barber_id, name, duration_minutes, price_toman, is_active)
    VALUES (${barberId}, ${name}, ${duration}, ${price}, true)
    RETURNING id
  ` as any[];
  
  revalidatePath('/barber/services');
  return result;
}

export async function updateService(serviceId: number, barberId: number, name: string, duration: number, price: number) {
  await requireBarber();
  
  await sql`
    UPDATE services
    SET name = ${name}, duration_minutes = ${duration}, price_toman = ${price}, updated_at = NOW()
    WHERE id = ${serviceId} AND barber_id = ${barberId}
  `;
  
  revalidatePath('/barber/services');
}

export async function toggleService(serviceId: number, barberId: number, currentStatus: boolean) {
  await requireBarber();
  
  await sql`
    UPDATE services
    SET is_active = ${!currentStatus}, updated_at = NOW()
    WHERE id = ${serviceId} AND barber_id = ${barberId}
  `;
  
  revalidatePath('/barber/services');
}
