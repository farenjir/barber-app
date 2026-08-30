/**
 * Simplified bot implementation for initial deployment
 * This version uses basic message posting without complex card interactions
 * TODO: Implement full state machine with inline keyboards after deployment
 */

import { Chat } from 'chat';
import { createTelegramAdapter } from '@chat-adapter/telegram';
import { createPostgresState } from './state-adapter';
import { sql } from '../db/client';
import type { Service } from '../db/client';
import { formatFullJalaliDate, formatTime } from './jalali';

const SALON_NAME = process.env.SALON_NAME || 'سالن زیبایی';
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map(id => parseInt(id.trim()))
  .filter(id => !isNaN(id));

// Bot instance
export const bot = new Chat({
  userName: 'BarberAppointmentAppBot',
  adapters: {
    telegram: createTelegramAdapter({
      mode: 'auto',
    }),
  },
  state: createPostgresState(),
});

// Handle /start and mentions
bot.onNewMention(async (thread, message) => {
  const text = message.text?.trim().toLowerCase();
  
  if (text === '/start' || text?.startsWith('/start')) {
    await thread.post(
      `سلام! به ${SALON_NAME} خوش آمدید 💈\n\n` +
      `برای رزرو نوبت، لطفاً با آرایشگاه تماس بگیرید.\n\n` +
      `این ربات به زودی به طور کامل راه‌اندازی خواهد شد.`
    );
    return;
  }
  
  // Show services
  if (text === '/services' || text === 'خدمات') {
    const services = await sql`SELECT * FROM services WHERE is_active = true ORDER BY name`;
    
    let message = '💇 *خدمات و قیمت‌ها:*\n\n';
    for (const service of services as Service[]) {
      message += `• ${service.name}\n`;
      message += `  مدت: ${service.duration_minutes} دقیقه | قیمت: ${service.price_toman.toLocaleString('fa-IR')} تومان\n\n`;
    }
    
    await thread.post(message);
    return;
  }
  
  // Admin command: today
  const userId = parseInt(message.author.userId);
  if (ADMIN_IDS.includes(userId) && text === '/today') {
    const now = new Date();
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const appointments = await sql`
      SELECT a.*, s.name as service_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.appointment_time >= ${today.toISOString()}
      AND a.appointment_time < ${tomorrow.toISOString()}
      AND a.status IN ('pending', 'confirmed')
      ORDER BY a.appointment_time ASC
    `;
    
    if (appointments.length === 0) {
      await thread.post('امروز نوبتی وجود ندارد.');
      return;
    }
    
    let msg = '📋 *نوبت‌های امروز:*\n\n';
    for (const appt of appointments as any[]) {
      const dateTime = new Date(appt.appointment_time);
      msg += `• ${formatTime(dateTime)} - ${appt.service_name}\n`;
      msg += `  ${appt.customer_name} (${appt.customer_phone})\n`;
      msg += `  وضعیت: ${appt.status === 'pending' ? 'در انتظار تأیید' : 'تأیید شده'}\n\n`;
    }
    
    await thread.post(msg);
    return;
  }
  
  // Default response
  await thread.post(
    'سلام! 👋\n\n' +
    `به ${SALON_NAME} خوش آمدید.\n\n` +
    'دستورات موجود:\n' +
    '/start - شروع\n' +
    '/services - مشاهده خدمات و قیمت‌ها\n\n' +
    'برای رزرو نوبت، لطفاً با آرایشگاه تماس بگیرید.'
  );
});

// Initialize bot
export async function initializeBot() {
  await bot.initialize();
  console.log('✓ Bot initialized');
}
