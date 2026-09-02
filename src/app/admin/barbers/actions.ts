'use server';

import { sql } from '@/db/client';
import { revalidatePath } from 'next/cache';

export async function addBarber(telegramId: number, displayName: string) {
  const [user] = await sql`
    INSERT INTO users (telegram_id, role, name, is_active)
    VALUES (${telegramId}, 'barber', ${displayName}, true)
    ON CONFLICT (telegram_id) DO UPDATE SET role = 'barber', name = ${displayName}
    RETURNING id
  ` as any[];
  
  await sql`
    INSERT INTO barbers (user_id, display_name, is_active)
    VALUES (${user.id}, ${displayName}, true)
    ON CONFLICT (user_id) DO UPDATE SET display_name = ${displayName}
  `;
  
  const firstBarber = await sql`
    SELECT id FROM barbers WHERE id != (SELECT id FROM barbers WHERE user_id = ${user.id}) LIMIT 1
  ` as any[];
  
  if (firstBarber.length > 0) {
    const sourceId = firstBarber[0].id;
    const newBarberId = await sql`SELECT id FROM barbers WHERE user_id = ${user.id}` as any[];
    
    await sql`
      INSERT INTO working_hours (barber_id, weekday, start_time, end_time, is_open)
      SELECT ${newBarberId[0].id}, weekday, start_time, end_time, is_open
      FROM working_hours
      WHERE barber_id = ${sourceId}
      ON CONFLICT (barber_id, weekday) DO NOTHING
    `;
  }
  
  revalidatePath('/admin/barbers');
}

export async function toggleBarber(barberId: number, currentStatus: boolean) {
  await sql`
    UPDATE barbers
    SET is_active = ${!currentStatus}
    WHERE id = ${barberId}
  `;
  
  await sql`
    UPDATE users
    SET is_active = ${!currentStatus}
    WHERE id = (SELECT user_id FROM barbers WHERE id = ${barberId})
  `;
  
  revalidatePath('/admin/barbers');
}
