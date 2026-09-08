'use server';

import { sql } from '@/db/client';
import { isSlotAvailable } from '@/lib/slots';
import { cookies } from 'next/headers';
import { verifySession, getUserByTelegramId } from '@/lib/auth';

interface CreateBookingParams {
  barberId: number;
  serviceId: number;
  appointmentTime: string;
  duration: number;
  customerName: string;
  customerPhone: string;
}

export async function createBooking(params: CreateBookingParams) {
  try {
    const { barberId, serviceId, appointmentTime, duration, customerName, customerPhone } = params;
    
    const appointmentDate = new Date(appointmentTime);
    
    if (!(await isSlotAvailable(barberId, appointmentDate, duration))) {
      return { success: false, error: 'SLOT_UNAVAILABLE' };
    }
    
    let customerTelegramId: number | null = null;
    let userId: number | null = null;
    
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (sessionToken) {
      const user = await verifySession(sessionToken);
      if (user && user.role === 'customer') {
        customerTelegramId = user.telegram_id;
        userId = user.id;
      }
    }
    
    await sql`
      INSERT INTO appointments (
        barber_id, service_id, customer_telegram_id, customer_name, customer_phone,
        appointment_time, duration_minutes, status
      ) VALUES (
        ${barberId}, ${serviceId}, ${customerTelegramId || 0}, ${customerName}, ${customerPhone},
        ${appointmentDate.toISOString()}, ${duration}, 'pending'
      )
    `;
    
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (BOT_TOKEN) {
      const barberUser = await sql`
        SELECT u.telegram_id
        FROM barbers b
        JOIN users u ON b.user_id = u.id
        WHERE b.id = ${barberId}
      ` as any[];
      
      if (barberUser.length > 0) {
        const barberTelegramId = barberUser[0].telegram_id;
        const service = await sql`
          SELECT name FROM services WHERE id = ${serviceId}
        ` as any[];
        
        const dateTimeStr = appointmentDate.toLocaleString('fa-IR', {
          timeZone: 'Asia/Tehran',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        
        const serviceName = service[0]?.name || 'خدمت';
        const text = `🔔 درخواست رزرو جدید (وب)\n\nخدمت: ${serviceName}\nزمان: ${dateTimeStr}\nنام: ${customerName}\nتلفن: ${customerPhone}`;
        
        try {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: barberTelegramId,
              text,
            }),
          });
        } catch (error) {
          console.error('Failed to notify barber:', error);
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { success: false, error: 'خطا در ثبت نوبت' };
  }
}
