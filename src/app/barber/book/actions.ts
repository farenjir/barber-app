'use server';

import { sql } from '@/db/client';
import { revalidatePath } from 'next/cache';
import { requireBarber } from '@/lib/auth-server';
import { logError } from '@/lib/error-logger';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

type ActionResult = 
  | { ok: true }
  | { ok: false; error: string; stack?: string };

export async function createAppointment(
  barberId: number,
  serviceId: number,
  datetime: string,
  customerName: string,
  customerPhone: string
): Promise<ActionResult> {
  let userId: number | undefined;
  try {
    const user = await requireBarber();
    userId = user.id;
    
    const barberRows = await sql`
      SELECT id FROM barbers WHERE user_id = ${user.id}
    ` as any[];
    
    if (barberRows.length === 0) {
      return { ok: false, error: 'شما به عنوان آرایشگر ثبت نشده‌اید' };
    }
    
    const userBarberId = barberRows[0].id;
    
    if (user.role !== 'super_admin' && userBarberId !== barberId) {
      return { ok: false, error: 'شما اجازه ایجاد نوبت برای این آرایشگر را ندارید' };
    }
    
    if (user.role === 'super_admin') {
      const targetBarberExists = await sql`
        SELECT id FROM barbers WHERE id = ${barberId}
      ` as any[];
      
      if (targetBarberExists.length === 0) {
        return { ok: false, error: 'آرایشگر مورد نظر یافت نشد' };
      }
    }
    
    const serviceRows = await sql`
      SELECT duration_minutes FROM services 
      WHERE id = ${serviceId} AND barber_id = ${barberId} AND is_active = true
    ` as any[];
    
    if (serviceRows.length === 0) {
      return { ok: false, error: 'خدمت انتخاب شده یافت نشد یا غیرفعال است' };
    }
    
    const duration = serviceRows[0].duration_minutes;
    
    const tehranTime = dayjs.tz(datetime, 'Asia/Tehran');
    if (!tehranTime.isValid()) {
      return { ok: false, error: 'تاریخ و زمان نامعتبر است' };
    }
    
    const appointmentTimeUtc = tehranTime.utc().format();
    
    await sql`
      INSERT INTO appointments (
        barber_id, service_id, customer_telegram_id, customer_name, 
        customer_phone, appointment_time, duration_minutes, status
      ) VALUES (
        ${barberId}, ${serviceId}, 0, ${customerName.trim()}, 
        ${customerPhone.trim()}, ${appointmentTimeUtc}, ${duration}, 'confirmed'
      )
    `;
    
    revalidatePath('/barber/book');
    revalidatePath('/barber');
    revalidatePath('/barber/calendar');
    revalidatePath('/admin');
    revalidatePath('/admin/appointments');
    
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطای داخلی سرور';
    const stack = error instanceof Error ? error.stack : undefined;
    
    await logError({
      source: 'createAppointment',
      path: '/barber/book',
      message,
      stack,
      userId,
    });
    
    return { ok: false, error: message, stack };
  }
}
