import { sql } from '@/db/client';
import type { Appointment, Service } from '@/db/client';
import { bot } from '@/lib/bot';
import { MESSAGES } from '@/lib/messages';
import { formatFullJalaliDate, formatTime } from '@/lib/jalali';

export async function GET(request: Request): Promise<Response> {
  try {
    // Verify Vercel Cron secret if configured
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }
    }
    
    const now = new Date();
    
    let sent24h = 0;
    let sent2h = 0;
    
    // 24-hour reminders: on a daily cron, select appointments 20-28 hours from now
    // This accommodates the once-per-day run (cron is 30 4 * * * UTC = 08:00 Asia/Tehran)
    const twentyHoursLater = new Date(now.getTime() + 20 * 60 * 60 * 1000);
    const twentyEightHoursLater = new Date(now.getTime() + 28 * 60 * 60 * 1000);
    
    const appointments24h = await sql`
      SELECT a.*, s.name as service_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'confirmed'
      AND a.appointment_time >= ${twentyHoursLater.toISOString()}
      AND a.appointment_time <= ${twentyEightHoursLater.toISOString()}
      AND NOT EXISTS (
        SELECT 1 FROM sent_reminders
        WHERE appointment_id = a.id
        AND reminder_type = '24h'
      )
    ` as unknown as (Appointment & { service_name: string })[];
    
    for (const appt of appointments24h) {
      try {
        const dateTime = new Date(appt.appointment_time);
        const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;
        
        const customerThread = bot.channel(`telegram:${appt.customer_telegram_id}`);
        await customerThread.post(MESSAGES.reminder24h(appt.service_name, dateTimeStr));
        
        // Mark as sent
        await sql`
          INSERT INTO sent_reminders (appointment_id, reminder_type)
          VALUES (${appt.id}, '24h')
          ON CONFLICT (appointment_id, reminder_type) DO NOTHING
        `;
        
        sent24h++;
      } catch (error) {
        console.error(`Failed to send 24h reminder for appointment ${appt.id}:`, error);
      }
    }
    
    // 2-hour reminders (between now and 2.5 hours from now)
    // NOTE: On Vercel Hobby (daily cron), this will rarely fire. Only appointments
    // that happen to be 2 hours away at 08:00 Asia/Tehran will receive this reminder.
    // On Vercel Pro with a */30 * * * * schedule, this fires reliably every 30 minutes.
    const twoHoursThirtyMinutesLater = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
    const appointments2h = await sql`
      SELECT a.*, s.name as service_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status = 'confirmed'
      AND a.appointment_time > ${now.toISOString()}
      AND a.appointment_time <= ${twoHoursThirtyMinutesLater.toISOString()}
      AND NOT EXISTS (
        SELECT 1 FROM sent_reminders
        WHERE appointment_id = a.id
        AND reminder_type = '2h'
      )
    ` as unknown as (Appointment & { service_name: string })[];
    
    for (const appt of appointments2h) {
      try {
        const dateTime = new Date(appt.appointment_time);
        const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;
        
        const customerThread = bot.channel(`telegram:${appt.customer_telegram_id}`);
        await customerThread.post(MESSAGES.reminder2h(appt.service_name, dateTimeStr));
        
        // Mark as sent
        await sql`
          INSERT INTO sent_reminders (appointment_id, reminder_type)
          VALUES (${appt.id}, '2h')
          ON CONFLICT (appointment_id, reminder_type) DO NOTHING
        `;
        
        sent2h++;
      } catch (error) {
        console.error(`Failed to send 2h reminder for appointment ${appt.id}:`, error);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        sent24h,
        sent2h,
        timestamp: now.toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Cron job error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
