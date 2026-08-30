/** @jsxImportSource chat */
import { Chat, Card, CardText, Actions, Button } from 'chat';
import { createTelegramAdapter } from '@chat-adapter/telegram';
import { createPostgresState } from './state-adapter';
import { sql } from '../db/client';
import type { Service, Appointment } from '../db/client';
import { MESSAGES, formatStatus } from './messages';
import {
  getNextOpenDays,
  getAvailableSlots,
  isSlotAvailable,
  getAppointments,
} from './slots';
import { formatFullJalaliDate, formatTime, formatJalaliDate } from './jalali';

const SALON_NAME = process.env.SALON_NAME || 'سالن زیبایی';
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map((id) => parseInt(id.trim()))
  .filter((id) => !isNaN(id));

// State adapter instance
const stateAdapter = createPostgresState();

// Bot instance
export const bot = new Chat({
  userName: 'BarberAppointmentAppBot',
  adapters: {
    telegram: createTelegramAdapter({
      mode: 'auto',
      botToken: process.env.TELEGRAM_BOT_TOKEN || 'build-time-dummy-token',
    }),
  },
  state: stateAdapter,
});

// Conversation state types
type BookingState = {
  step: 'service' | 'date' | 'time' | 'name' | 'phone' | 'confirm';
  serviceId?: number;
  serviceName?: string;
  duration?: number;
  price?: number;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
};

// Helper functions
function isAdmin(userId: number): boolean {
  return ADMIN_IDS.includes(userId);
}

async function getUserState(userId: string): Promise<BookingState | null> {
  const stateKey = `booking_state:${userId}`;
  const state = await stateAdapter.get<BookingState>(stateKey);
  return state;
}

async function setUserState(userId: string, state: BookingState): Promise<void> {
  const stateKey = `booking_state:${userId}`;
  await stateAdapter.set(stateKey, state, 3600000); // 1 hour TTL
}

async function clearUserState(userId: string): Promise<void> {
  const stateKey = `booking_state:${userId}`;
  await stateAdapter.delete(stateKey);
}

// Main menu - send plain text ONLY (no Cards)
async function showMainMenu(thread: any) {
  console.log('[showMainMenu] Starting...');
  
  // Send plain text welcome - absolutely simple, no formatting, no Cards
  const welcomeText = `${SALON_NAME}\n\nبه ربات رزرو نوبت خوش آمدید!\n\nلطفاً یکی از گزینه‌های زیر را انتخاب کنید:\n\n1️⃣ رزرو نوبت جدید - /new\n2️⃣ نوبت‌های من - /my\n3️⃣ لغو نوبت - /cancel\n4️⃣ خدمات و قیمت‌ها - /services\n5️⃣ راهنما - /help`;
  
  console.log('[showMainMenu] About to call thread.post with text:', welcomeText.substring(0, 50));
  
  try {
    const result = await thread.post(welcomeText);
    console.log('[showMainMenu] thread.post returned:', result);
  } catch (error) {
    console.error('[showMainMenu] thread.post threw error:', error);
    throw error;
  }
  
  console.log('[showMainMenu] Completed');
}

// Common handler for both direct messages and mentions
async function handleIncomingMessage(thread: any, message: any) {
  console.log('[handleIncomingMessage] CALLED - userId:', message.author?.userId, 'text:', message.text);
  
  const text = message.text?.trim().toLowerCase();
  const userId = parseInt(message.author.userId);

  try {
    // Admin commands
    if (isAdmin(userId)) {
      console.log('[handleIncomingMessage] User is admin');
      if (text === '/today') {
        await handleTodayCommand(thread);
        return;
      }
      if (text === '/week') {
        await handleWeekCommand(thread);
        return;
      }
      if (text === '/help') {
        await thread.post(MESSAGES.adminHelp);
        return;
      }
    }

    // Default: show menu FIRST (don't block on DB)
    console.log('[handleIncomingMessage] Calling showMainMenu...');
    await showMainMenu(thread);
    console.log('[handleIncomingMessage] showMainMenu completed');

    // Then subscribe and clear state (background operations)
    console.log('[handleIncomingMessage] Starting background operations...');
    try {
      await thread.subscribe();
      console.log('[handleIncomingMessage] Thread subscribed');
    } catch (error) {
      console.error('[handleIncomingMessage] Failed to subscribe to thread:', error);
    }

    try {
      await clearUserState(message.author.userId);
      console.log('[handleIncomingMessage] User state cleared');
    } catch (error) {
      console.error('[handleIncomingMessage] Failed to clear user state:', error);
    }
    
    console.log('[handleIncomingMessage] Completed successfully');
  } catch (error) {
    console.error('[handleIncomingMessage] CAUGHT ERROR:', error);
    if (error instanceof Error) {
      console.error('[handleIncomingMessage] Error name:', error.name);
      console.error('[handleIncomingMessage] Error message:', error.message);
      console.error('[handleIncomingMessage] Error stack:', error.stack);
    }
    // Always try to send an error message to the user
    try {
      console.log('[handleIncomingMessage] Attempting to send error message to user...');
      await thread.post('متأسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.');
      console.log('[handleIncomingMessage] Error message sent');
    } catch (postError) {
      console.error('[handleIncomingMessage] Failed to send error message:', postError);
    }
  }
}

// Handle direct messages (private chats)
bot.onDirectMessage(async (thread, message) => {
  console.log('[onDirectMessage] HANDLER CALLED - threadId:', thread?.id, 'messageId:', message?.id);
  console.log('[onDirectMessage] Message text:', message?.text);
  console.log('[onDirectMessage] Thread isDM:', thread?.isDM);
  
  try {
    await handleIncomingMessage(thread, message);
    console.log('[onDirectMessage] Handler completed successfully');
  } catch (error) {
    console.error('[onDirectMessage] CAUGHT ERROR:', error);
    if (error instanceof Error) {
      console.error('[onDirectMessage] Error details:', error.name, error.message, error.stack);
    }
    // Try to notify user of error
    try {
      console.log('[onDirectMessage] Sending error notification to user...');
      await thread.post('متأسفانه خطایی رخ داد. لطفاً دوباره /start را ارسال کنید.');
      console.log('[onDirectMessage] Error notification sent');
    } catch (e) {
      console.error('[onDirectMessage] Failed to send error notification:', e);
    }
  }
});

// Handle @-mentions in groups
bot.onNewMention(async (thread, message) => {
  console.log('[onNewMention] HANDLER CALLED - threadId:', thread?.id, 'messageId:', message?.id);
  
  try {
    await handleIncomingMessage(thread, message);
    console.log('[onNewMention] Handler completed successfully');
  } catch (error) {
    console.error('[onNewMention] CAUGHT ERROR:', error);
    // Try to notify user of error
    try {
      await thread.post('متأسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید.');
    } catch (e) {
      console.error('[onNewMention] Failed to send error notification:', e);
    }
  }
});

// Handle button actions
bot.onAction(async (event) => {
  const actionId = event.actionId;
  const userId = event.user.userId;
  const thread = event.thread;

  if (!thread) {
    console.error('No thread in action event');
    return;
  }

  try {
    // Main menu actions
    if (actionId === 'new') {
      await startBookingFlow(thread, userId);
      return;
    }

    if (actionId === 'my') {
      await showMyBookings(thread, userId);
      return;
    }

    if (actionId === 'cancel') {
      await showCancelBooking(thread, userId);
      return;
    }

    if (actionId === 'services') {
      await showServices(thread);
      return;
    }

    if (actionId === 'help') {
      await thread.post(MESSAGES.help);
      await showMainMenu(thread);
      return;
    }

    if (actionId === 'menu') {
      await clearUserState(userId);
      await showMainMenu(thread);
      return;
    }

    // Booking flow actions
    if (actionId.startsWith('sv_')) {
      await handleServiceSelection(thread, userId, actionId);
      return;
    }

    if (actionId.startsWith('dt_')) {
      await handleDateSelection(thread, userId, actionId);
      return;
    }

    if (actionId.startsWith('tm_')) {
      await handleTimeSelection(thread, userId, actionId);
      return;
    }

    if (actionId === 'confirm') {
      await handleBookingConfirm(thread, userId);
      return;
    }

    if (actionId === 'back') {
      await clearUserState(userId);
      await showMainMenu(thread);
      return;
    }

    // Cancel flow
    if (actionId.startsWith('ca_')) {
      await handleAppointmentCancel(thread, userId, actionId);
      return;
    }

    if (actionId.startsWith('cc_')) {
      await handleCancelConfirm(thread, userId, actionId);
      return;
    }

    // Admin actions
    if (actionId.startsWith('ok_')) {
      await handleAdminConfirm(thread, actionId);
      return;
    }

    if (actionId.startsWith('no_')) {
      await handleAdminReject(thread, actionId);
      return;
    }
  } catch (error) {
    console.error('Action handler error:', error);
    await thread.post(MESSAGES.error);
    await showMainMenu(thread);
  }
});

// Handle text messages (for name and phone collection)
bot.onSubscribedMessage(async (thread, message) => {
  const userId = message.author.userId;
  const state = await getUserState(userId);

  if (!state) {
    // Unknown text - show menu
    await showMainMenu(thread);
    return;
  }

  const text = message.text?.trim();

  if (state.step === 'name') {
    state.name = text;
    state.step = 'phone';
    await setUserState(userId, state);
    await thread.post(MESSAGES.requestPhone);
    return;
  }

  if (state.step === 'phone') {
    if (!text || !isValidPhone(text)) {
      await thread.post(MESSAGES.invalidPhone);
      return;
    }
    state.phone = text;
    await setUserState(userId, state);
    await showBookingSummary(thread, userId, state);
    return;
  }
});

// Start booking flow
async function startBookingFlow(thread: any, userId: string) {
  const services = (await sql`
    SELECT * FROM services WHERE is_active = true ORDER BY name
  `) as unknown as Service[];

  if (services.length === 0) {
    await thread.post('متأسفانه در حال حاضر خدمتی موجود نیست.');
    return;
  }

  await setUserState(userId, { step: 'service' });

  // Telegram has 64-byte callback_data limit, so keep IDs short
  const buttons = services.map((s) => (
    <Button key={s.id} id={`sv_${s.id}`}>
      {s.name} ({s.duration_minutes}د - {s.price_toman.toLocaleString('fa-IR')}ت)
    </Button>
  ));

  await thread.post(
    <Card title="انتخاب خدمت">
      <CardText>{MESSAGES.selectService}</CardText>
      <Actions>
        {buttons}
        <Button id="menu">🏠 بازگشت به منو</Button>
      </Actions>
    </Card>
  );
}

// Handle service selection
async function handleServiceSelection(thread: any, userId: string, actionId: string) {
  const serviceId = parseInt(actionId.replace('sv_', ''));
  const service = (await sql`SELECT * FROM services WHERE id = ${serviceId}`) as unknown as Service[];

  if (service.length === 0) {
    await thread.post(MESSAGES.error);
    return;
  }

  const s = service[0];
  await setUserState(userId, {
    step: 'date',
    serviceId: s.id,
    serviceName: s.name,
    duration: s.duration_minutes,
    price: s.price_toman,
  });

  const openDays = await getNextOpenDays(14);
  const buttons = openDays.slice(0, 10).map((date, idx) => (
    <Button key={idx} id={`dt_${date.toISOString()}`}>
      {formatFullJalaliDate(date)}
    </Button>
  ));

  await thread.post(
    <Card title="انتخاب تاریخ">
      <CardText>{MESSAGES.selectDate}</CardText>
      <Actions>
        {buttons}
        <Button id="menu">🏠 بازگشت به منو</Button>
      </Actions>
    </Card>
  );
}

// Handle date selection
async function handleDateSelection(thread: any, userId: string, actionId: string) {
  const state = await getUserState(userId);
  if (!state || !state.duration) {
    await showMainMenu(thread);
    return;
  }

  const dateStr = actionId.replace('dt_', '');
  const date = new Date(dateStr);

  const slots = await getAvailableSlots(date, state.duration);

  if (slots.length === 0) {
    await thread.post(MESSAGES.noSlotsAvailable);
    await startBookingFlow(thread, userId);
    return;
  }

  state.step = 'time';
  state.date = dateStr;
  await setUserState(userId, state);

  const buttons = slots.map((slot, idx) => (
    <Button key={idx} id={`tm_${slot.toISOString()}`}>
      {formatTime(slot)}
    </Button>
  ));

  await thread.post(
    <Card title="انتخاب زمان">
      <CardText>{MESSAGES.selectTime(formatFullJalaliDate(date))}</CardText>
      <Actions>
        {buttons}
        <Button id="menu">🏠 بازگشت به منو</Button>
      </Actions>
    </Card>
  );
}

// Handle time selection
async function handleTimeSelection(thread: any, userId: string, actionId: string) {
  const state = await getUserState(userId);
  if (!state) {
    await showMainMenu(thread);
    return;
  }

  const timeStr = actionId.replace('tm_', '');
  state.step = 'name';
  state.time = timeStr;
  await setUserState(userId, state);

  await thread.post(MESSAGES.requestName);
}

// Show booking summary
async function showBookingSummary(thread: any, userId: string, state: BookingState) {
  if (!state.serviceName || !state.time || !state.name || !state.phone || state.price === undefined) {
    await thread.post(MESSAGES.error);
    return;
  }

  const dateTime = new Date(state.time);
  const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;

  state.step = 'confirm';
  await setUserState(userId, state);

  await thread.post(
    <Card title="تأیید رزرو">
      <CardText>
        {MESSAGES.bookingSummary(state.serviceName, dateTimeStr, state.price, state.name, state.phone)}
      </CardText>
      <Actions>
        <Button id="confirm" style="primary">
          ✅ تأیید
        </Button>
        <Button id="back">❌ لغو</Button>
      </Actions>
    </Card>
  );
}

// Handle booking confirmation
async function handleBookingConfirm(thread: any, userId: string) {
  const state = await getUserState(userId);
  if (!state || !state.serviceId || !state.time || !state.name || !state.phone || !state.duration) {
    await thread.post(MESSAGES.error);
    return;
  }

  const appointmentTime = new Date(state.time);

  // Double-check availability
  if (!(await isSlotAvailable(appointmentTime, state.duration))) {
    await thread.post('متأسفانه این زمان دیگر در دسترس نیست. لطفاً دوباره تلاش کنید.');
    await clearUserState(userId);
    await showMainMenu(thread);
    return;
  }

  // Create appointment
  const result = (await sql`
    INSERT INTO appointments (
      service_id, customer_telegram_id, customer_name, customer_phone,
      customer_username, appointment_time, duration_minutes, status
    ) VALUES (
      ${state.serviceId}, ${userId}, ${state.name}, ${state.phone},
      ${null}, ${appointmentTime.toISOString()},
      ${state.duration}, 'pending'
    )
    RETURNING id
  `) as unknown as Array<{ id: number }>;

  const appointmentId = result[0].id;

  await clearUserState(userId);
  await thread.post(MESSAGES.bookingCreated);
  await showMainMenu(thread);

  // Notify admins
  await notifyAdmins(appointmentId, state, userId);
}

// Notify admins
async function notifyAdmins(appointmentId: number, state: BookingState, userId: string) {
  if (ADMIN_IDS.length === 0) return;

  const dateTime = new Date(state.time!);
  const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;

  for (const adminId of ADMIN_IDS) {
    try {
      const adminThread = bot.channel(`telegram:${adminId}`);
      await adminThread.post(
        <Card title="🔔 درخواست رزرو جدید">
          <CardText>
            {`خدمت: ${state.serviceName}\nزمان: ${dateTimeStr}\nنام: ${state.name}\nتلفن: ${state.phone}`}
          </CardText>
          <Actions>
            <Button id={`ok_${appointmentId}`} style="primary">
              ✅ تأیید
            </Button>
            <Button id={`no_${appointmentId}`} style="danger">
              ❌ رد
            </Button>
          </Actions>
        </Card>
      );
    } catch (error) {
      console.error(`Failed to notify admin ${adminId}:`, error);
    }
  }
}

// Admin confirm
async function handleAdminConfirm(thread: any, actionId: string) {
  const appointmentId = parseInt(actionId.replace('ok_', ''));

  await sql`
    UPDATE appointments
    SET status = 'confirmed', updated_at = NOW()
    WHERE id = ${appointmentId}
  `;

  const appointment = (await sql`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.id = ${appointmentId}
  `) as unknown as Array<Appointment & { service_name: string }>;

  if (appointment.length > 0) {
    const appt = appointment[0];
    const customerThread = bot.channel(`telegram:${appt.customer_telegram_id}`);
    await customerThread.post(MESSAGES.bookingConfirmed);
    await thread.post('✅ نوبت تأیید شد و به مشتری اطلاع داده شد.');
  }
}

// Admin reject
async function handleAdminReject(thread: any, actionId: string) {
  const appointmentId = parseInt(actionId.replace('no_', ''));

  await sql`
    UPDATE appointments
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${appointmentId}
  `;

  const appointment = (await sql`
    SELECT * FROM appointments WHERE id = ${appointmentId}
  `) as unknown as Appointment[];

  if (appointment.length > 0) {
    const appt = appointment[0];
    const customerThread = bot.channel(`telegram:${appt.customer_telegram_id}`);
    await customerThread.post(MESSAGES.bookingRejected);
    await thread.post('❌ نوبت رد شد و به مشتری اطلاع داده شد.');
  }
}

// Show user's bookings
async function showMyBookings(thread: any, userId: string) {
  const now = new Date();
  const appointments = (await sql`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.customer_telegram_id = ${userId}
    AND a.appointment_time > ${now.toISOString()}
    AND a.status IN ('pending', 'confirmed')
    ORDER BY a.appointment_time ASC
  `) as unknown as Array<Appointment & { service_name: string }>;

  if (appointments.length === 0) {
    await thread.post(MESSAGES.noUpcomingBookings);
    await showMainMenu(thread);
    return;
  }

  let message = MESSAGES.myBookings;
  for (const appt of appointments) {
    const dateTime = new Date(appt.appointment_time);
    const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;
    message += MESSAGES.bookingItem(appt.service_name, dateTimeStr, formatStatus(appt.status));
  }

  await thread.post(message);
  await showMainMenu(thread);
}

// Show cancel booking interface
async function showCancelBooking(thread: any, userId: string) {
  const now = new Date();
  const appointments = (await sql`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.customer_telegram_id = ${userId}
    AND a.appointment_time > ${now.toISOString()}
    AND a.status IN ('pending', 'confirmed')
    ORDER BY a.appointment_time ASC
  `) as unknown as Array<Appointment & { service_name: string }>;

  if (appointments.length === 0) {
    await thread.post(MESSAGES.noUpcomingBookings);
    await showMainMenu(thread);
    return;
  }

  const buttons = appointments.map((appt) => {
    const dateTime = new Date(appt.appointment_time);
    const dateTimeStr = `${formatJalaliDate(dateTime)} ${formatTime(dateTime)}`;
    return (
      <Button key={appt.id} id={`ca_${appt.id}`}>
        {appt.service_name} - {dateTimeStr}
      </Button>
    );
  });

  await thread.post(
    <Card title="لغو نوبت">
      <CardText>{MESSAGES.selectBookingToCancel}</CardText>
      <Actions>
        {buttons}
        <Button id="menu">🏠 بازگشت به منو</Button>
      </Actions>
    </Card>
  );
}

// Handle appointment cancel
async function handleAppointmentCancel(thread: any, userId: string, actionId: string) {
  const appointmentId = parseInt(actionId.replace('ca_', ''));

  const appointment = (await sql`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.id = ${appointmentId}
    AND a.customer_telegram_id = ${userId}
  `) as unknown as Array<Appointment & { service_name: string }>;

  if (appointment.length === 0) {
    await thread.post(MESSAGES.error);
    return;
  }

  const appt = appointment[0];
  const dateTime = new Date(appt.appointment_time);
  const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;

  await thread.post(
    <Card title="تأیید لغو">
      <CardText>{MESSAGES.confirmCancel(appt.service_name, dateTimeStr)}</CardText>
      <Actions>
        <Button id={`cc_${appointmentId}`} style="danger">
          ✅ تأیید لغو
        </Button>
        <Button id="menu">❌ بازگشت</Button>
      </Actions>
    </Card>
  );
}

// Handle cancel confirmation
async function handleCancelConfirm(thread: any, userId: string, actionId: string) {
  const appointmentId = parseInt(actionId.replace('cc_', ''));

  await sql`
    UPDATE appointments
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${appointmentId}
    AND customer_telegram_id = ${userId}
  `;

  await thread.post(MESSAGES.bookingCancelled);

  // Notify admins
  for (const adminId of ADMIN_IDS) {
    try {
      const adminThread = bot.channel(`telegram:${adminId}`);
      await adminThread.post(`📅 نوبت شماره ${appointmentId} توسط مشتری لغو شد.`);
    } catch (error) {
      console.error(`Failed to notify admin ${adminId}:`, error);
    }
  }

  await showMainMenu(thread);
}

// Show services
async function showServices(thread: any) {
  const services = (await sql`
    SELECT * FROM services WHERE is_active = true ORDER BY name
  `) as unknown as Service[];

  let message = MESSAGES.servicesList;
  for (const service of services) {
    message += MESSAGES.serviceItem(service.name, service.duration_minutes, service.price_toman);
  }

  await thread.post(message);
  await showMainMenu(thread);
}

// Admin: today's appointments
async function handleTodayCommand(thread: any) {
  const now = new Date();
  const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const appointments = await getAppointments(today, tomorrow, ['pending', 'confirmed']);

  if (appointments.length === 0) {
    await thread.post('امروز نوبتی وجود ندارد.');
    return;
  }

  let message = '📋 *نوبت‌های امروز:*\n\n';
  for (const appt of appointments) {
    const service = (await sql`SELECT name FROM services WHERE id = ${appt.service_id}`) as unknown as Service[];
    const dateTime = new Date(appt.appointment_time);
    message += `• ${formatTime(dateTime)} - ${service[0]?.name || 'نامشخص'}\n`;
    message += `  ${appt.customer_name} (${appt.customer_phone})\n`;
    message += `  وضعیت: ${formatStatus(appt.status)}\n\n`;
  }

  await thread.post(message);
}

// Admin: week's appointments
async function handleWeekCommand(thread: any) {
  const now = new Date();
  const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const appointments = await getAppointments(today, nextWeek, ['pending', 'confirmed']);

  if (appointments.length === 0) {
    await thread.post('هفته آینده نوبتی وجود ندارد.');
    return;
  }

  let message = '📋 *نوبت‌های هفته آینده:*\n\n';
  for (const appt of appointments) {
    const service = (await sql`SELECT name FROM services WHERE id = ${appt.service_id}`) as unknown as Service[];
    const dateTime = new Date(appt.appointment_time);
    message += `• ${formatJalaliDate(dateTime)} ${formatTime(dateTime)} - ${service[0]?.name || 'نامشخص'}\n`;
    message += `  ${appt.customer_name}\n`;
    message += `  وضعیت: ${formatStatus(appt.status)}\n\n`;
  }

  await thread.post(message);
}

// Phone validation
function isValidPhone(phone: string): boolean {
  return /^09\d{9}$/.test(phone.replace(/[\s-]/g, ''));
}

// Initialize bot
export async function initializeBot() {
  await bot.initialize();
  console.log('✓ Bot initialized');
}
