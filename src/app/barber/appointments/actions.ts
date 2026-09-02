'use server';

import { sql } from '@/db/client';
import { revalidatePath } from 'next/cache';
import { requireBarber } from '@/lib/auth-server';
import { MESSAGES } from '@/lib/messages';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('[sendTelegramMessage] Error:', result);
    }
  } catch (error) {
    console.error('[sendTelegramMessage] Failed to send:', error);
  }
}

export async function confirmAppointment(appointmentId: number) {
  try {
    const user = await requireBarber();
    
    // Get barber ID
    const barber = await sql`
      SELECT id FROM barbers WHERE user_id = ${user.id}
    ` as any[];
    
    if (barber.length === 0) {
      return { success: false, error: 'شما به عنوان آرایشگر ثبت نشده‌اید.' };
    }
    
    const barberId = barber[0].id;
    
    // Verify the appointment belongs to this barber and is pending
    const appointment = await sql`
      SELECT * FROM appointments 
      WHERE id = ${appointmentId} 
        AND barber_id = ${barberId} 
        AND status = 'pending'
    ` as any[];
    
    if (appointment.length === 0) {
      return { success: false, error: 'نوبت یافت نشد یا قبلاً پردازش شده است.' };
    }
    
    // Update status to confirmed
    await sql`
      UPDATE appointments
      SET status = 'confirmed', updated_at = NOW()
      WHERE id = ${appointmentId}
    `;
    
    // Notify customer on Telegram (skip if walk-in with telegram_id = 0)
    const appt = appointment[0];
    if (appt.customer_telegram_id && appt.customer_telegram_id !== 0) {
      await sendTelegramMessage(appt.customer_telegram_id, MESSAGES.bookingConfirmed);
    }
    
    // Revalidate barber pages
    revalidatePath('/barber');
    revalidatePath('/barber/calendar');
    
    return { success: true };
  } catch (error) {
    console.error('[confirmAppointment] Error:', error);
    return { success: false, error: 'خطا در تأیید نوبت. لطفاً دوباره تلاش کنید.' };
  }
}

export async function rejectAppointment(appointmentId: number) {
  try {
    const user = await requireBarber();
    
    // Get barber ID
    const barber = await sql`
      SELECT id FROM barbers WHERE user_id = ${user.id}
    ` as any[];
    
    if (barber.length === 0) {
      return { success: false, error: 'شما به عنوان آرایشگر ثبت نشده‌اید.' };
    }
    
    const barberId = barber[0].id;
    
    // Verify the appointment belongs to this barber and is pending
    const appointment = await sql`
      SELECT * FROM appointments 
      WHERE id = ${appointmentId} 
        AND barber_id = ${barberId} 
        AND status = 'pending'
    ` as any[];
    
    if (appointment.length === 0) {
      return { success: false, error: 'نوبت یافت نشد یا قبلاً پردازش شده است.' };
    }
    
    // Update status to cancelled
    await sql`
      UPDATE appointments
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ${appointmentId}
    `;
    
    // Notify customer on Telegram (skip if walk-in with telegram_id = 0)
    const appt = appointment[0];
    if (appt.customer_telegram_id && appt.customer_telegram_id !== 0) {
      await sendTelegramMessage(appt.customer_telegram_id, MESSAGES.bookingRejected);
    }
    
    // Revalidate barber pages
    revalidatePath('/barber');
    revalidatePath('/barber/calendar');
    
    return { success: true };
  } catch (error) {
    console.error('[rejectAppointment] Error:', error);
    return { success: false, error: 'خطا در رد نوبت. لطفاً دوباره تلاش کنید.' };
  }
}
