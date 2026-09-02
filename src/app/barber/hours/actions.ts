'use server';

import { sql } from '@/db/client';
import { revalidatePath } from 'next/cache';

interface WorkingHourData {
  weekday: number;
  is_open: boolean;
  start_time: string;
  end_time: string;
}

export async function updateWorkingHours(barberId: number, hoursArray: WorkingHourData[]) {
  for (const hour of hoursArray) {
    await sql`
      INSERT INTO working_hours (barber_id, weekday, start_time, end_time, is_open)
      VALUES (${barberId}, ${hour.weekday}, ${hour.start_time}, ${hour.end_time}, ${hour.is_open})
      ON CONFLICT (barber_id, weekday)
      DO UPDATE SET 
        start_time = ${hour.start_time},
        end_time = ${hour.end_time},
        is_open = ${hour.is_open},
        updated_at = NOW()
    `;
  }
  
  revalidatePath('/barber/hours');
}
