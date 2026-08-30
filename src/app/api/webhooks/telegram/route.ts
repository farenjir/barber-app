import { sql } from '@/db/client';
import type { Service } from '@/db/client';
import { MESSAGES } from '@/lib/messages';
import { formatFullJalaliDate, formatTime } from '@/lib/jalali';
import { getNextOpenDays, getAvailableSlots, isSlotAvailable } from '@/lib/slots';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SALON_NAME = process.env.SALON_NAME || 'سالن زیبایی';
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map((id) => parseInt(id.trim()))
  .filter((id) => !isNaN(id));

// Telegram API types
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  text?: string;
  date: number;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
}

// Booking state type
interface BookingState {
  step: 'service' | 'date' | 'time' | 'name' | 'phone' | 'confirm';
  serviceId?: number;
  serviceName?: string;
  duration?: number;
  price?: number;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
}

// Helper: Send message to Telegram
async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: any
): Promise<any> {
  console.log('[sendMessage] Sending to chat', chatId);
  
  const body: any = { chat_id: chatId, text };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  console.log('[sendMessage] Telegram response:', result);
  
  if (!result.ok) {
    console.error('[sendMessage] Error:', result);
  }
  
  return result;
}

// Helper: Answer callback query
async function answerCallbackQuery(queryId: string, text?: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: queryId, text }),
  });
}

// Helper: Get user state
async function getUserState(userId: number): Promise<BookingState | null> {
  const key = `booking_state:${userId}`;
  const rows = await sql`
    SELECT value FROM chat_state 
    WHERE key = ${key} 
    AND (expires_at IS NULL OR expires_at > NOW())
  ` as unknown as Array<{ value: string }>;
  
  if (rows.length === 0) return null;
  return JSON.parse(rows[0].value);
}

// Helper: Set user state
async function setUserState(userId: number, state: BookingState): Promise<void> {
  const key = `booking_state:${userId}`;
  const value = JSON.stringify(state);
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour
  
  await sql`
    INSERT INTO chat_state (key, value, expires_at, updated_at)
    VALUES (${key}, ${value}, ${expiresAt}, NOW())
    ON CONFLICT (key) 
    DO UPDATE SET value = ${value}, expires_at = ${expiresAt}, updated_at = NOW()
  `;
}

// Helper: Clear user state
async function clearUserState(userId: number): Promise<void> {
  const key = `booking_state:${userId}`;
  await sql`DELETE FROM chat_state WHERE key = ${key}`;
}

// Helper: Check if user is admin
function isAdmin(userId: number): boolean {
  return ADMIN_IDS.includes(userId);
}

// Handle /start and main menu
async function handleStart(chatId: number, userId: number): Promise<void> {
  await clearUserState(userId);
  
  const welcomeText = `${SALON_NAME} 💈\n\n${MESSAGES.welcome(SALON_NAME)}`;
  
  const keyboard = {
    keyboard: [
      [{ text: '📅 رزرو نوبت جدید' }],
      [{ text: '📋 نوبت‌های من' }, { text: '❌ لغو نوبت' }],
      [{ text: '💇 خدمات و قیمت‌ها' }, { text: '❓ راهنما' }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };

  await sendMessage(chatId, welcomeText, keyboard);
}

// Handle service selection
async function handleNewBooking(chatId: number, userId: number): Promise<void> {
  const services = await sql`
    SELECT * FROM services WHERE is_active = true ORDER BY name
  ` as unknown as Service[];

  if (services.length === 0) {
    await sendMessage(chatId, 'متأسفانه در حال حاضر خدمتی موجود نیست.');
    return;
  }

  await setUserState(userId, { step: 'service' });

  const buttons = services.map((s) => [{
    text: `${s.name} (${s.duration_minutes}د - ${s.price_toman.toLocaleString('fa-IR')}ت)`,
    callback_data: `sv_${s.id}`,
  }]);
  buttons.push([{ text: '🏠 بازگشت به منو', callback_data: 'menu' }]);

  const keyboard = { inline_keyboard: buttons };
  await sendMessage(chatId, MESSAGES.selectService, keyboard);
}

// Handle service selected
async function handleServiceSelected(
  chatId: number,
  userId: number,
  serviceId: number
): Promise<void> {
  const service = await sql`SELECT * FROM services WHERE id = ${serviceId}` as unknown as Service[];

  if (service.length === 0) {
    await sendMessage(chatId, MESSAGES.error);
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
  const buttons = openDays.slice(0, 10).map((date) => [{
    text: formatFullJalaliDate(date),
    callback_data: `dt_${date.toISOString()}`,
  }]);
  buttons.push([{ text: '🏠 بازگشت به منو', callback_data: 'menu' }]);

  const keyboard = { inline_keyboard: buttons };
  await sendMessage(chatId, MESSAGES.selectDate, keyboard);
}

// Handle date selected
async function handleDateSelected(
  chatId: number,
  userId: number,
  dateStr: string
): Promise<void> {
  const state = await getUserState(userId);
  if (!state || !state.duration) {
    await handleStart(chatId, userId);
    return;
  }

  const date = new Date(dateStr);
  const slots = await getAvailableSlots(date, state.duration);

  if (slots.length === 0) {
    await sendMessage(chatId, MESSAGES.noSlotsAvailable);
    return;
  }

  state.step = 'time';
  state.date = dateStr;
  await setUserState(userId, state);

  const buttons = slots.map((slot) => [{
    text: formatTime(slot),
    callback_data: `tm_${slot.toISOString()}`,
  }]);
  buttons.push([{ text: '🏠 بازگشت به منو', callback_data: 'menu' }]);

  const keyboard = { inline_keyboard: buttons };
  await sendMessage(chatId, MESSAGES.selectTime(formatFullJalaliDate(date)), keyboard);
}

// Handle time selected
async function handleTimeSelected(
  chatId: number,
  userId: number,
  timeStr: string
): Promise<void> {
  const state = await getUserState(userId);
  if (!state) {
    await handleStart(chatId, userId);
    return;
  }

  state.step = 'name';
  state.time = timeStr;
  await setUserState(userId, state);

  await sendMessage(chatId, MESSAGES.requestName);
}

// Handle text input (name/phone)
async function handleText(chatId: number, userId: number, text: string): Promise<void> {
  const state = await getUserState(userId);

  // Check for menu buttons
  if (text === '📅 رزرو نوبت جدید') {
    await handleNewBooking(chatId, userId);
    return;
  }
  if (text === '📋 نوبت‌های من') {
    await handleMyBookings(chatId, userId);
    return;
  }
  if (text === '❌ لغو نوبت') {
    await handleCancelBooking(chatId, userId);
    return;
  }
  if (text === '💇 خدمات و قیمت‌ها') {
    await handleServices(chatId);
    return;
  }
  if (text === '❓ راهنما') {
    await sendMessage(chatId, MESSAGES.help);
    return;
  }

  // Admin commands
  if (isAdmin(userId)) {
    if (text === '/today') {
      await handleTodayCommand(chatId);
      return;
    }
    if (text === '/week') {
      await handleWeekCommand(chatId);
      return;
    }
  }

  // State machine text input
  if (!state) {
    await handleStart(chatId, userId);
    return;
  }

  if (state.step === 'name') {
    state.name = text.trim();
    state.step = 'phone';
    await setUserState(userId, state);
    await sendMessage(chatId, MESSAGES.requestPhone);
    return;
  }

  if (state.step === 'phone') {
    const phone = text.trim();
    if (!isValidPhone(phone)) {
      await sendMessage(chatId, MESSAGES.invalidPhone);
      return;
    }
    state.phone = phone;
    await setUserState(userId, state);
    await showBookingSummary(chatId, userId, state);
    return;
  }

  // Unknown text
  await handleStart(chatId, userId);
}

// Show booking summary
async function showBookingSummary(
  chatId: number,
  userId: number,
  state: BookingState
): Promise<void> {
  if (!state.serviceName || !state.time || !state.name || !state.phone || state.price === undefined) {
    await sendMessage(chatId, MESSAGES.error);
    return;
  }

  const dateTime = new Date(state.time);
  const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;

  state.step = 'confirm';
  await setUserState(userId, state);

  const text = MESSAGES.bookingSummary(
    state.serviceName,
    dateTimeStr,
    state.price,
    state.name,
    state.phone
  );

  const keyboard = {
    inline_keyboard: [
      [{ text: '✅ تأیید', callback_data: 'confirm' }],
      [{ text: '❌ لغو', callback_data: 'menu' }],
    ],
  };

  await sendMessage(chatId, text, keyboard);
}

// Handle booking confirmation
async function handleBookingConfirm(chatId: number, userId: number): Promise<void> {
  const state = await getUserState(userId);
  if (!state || !state.serviceId || !state.time || !state.name || !state.phone || !state.duration) {
    await sendMessage(chatId, MESSAGES.error);
    return;
  }

  const appointmentTime = new Date(state.time);

  // Check availability
  if (!(await isSlotAvailable(appointmentTime, state.duration))) {
    await sendMessage(chatId, 'متأسفانه این زمان دیگر در دسترس نیست. لطفاً دوباره تلاش کنید.');
    await clearUserState(userId);
    return;
  }

  // Create appointment
  const result = await sql`
    INSERT INTO appointments (
      service_id, customer_telegram_id, customer_name, customer_phone,
      customer_username, appointment_time, duration_minutes, status
    ) VALUES (
      ${state.serviceId}, ${userId}, ${state.name}, ${state.phone},
      ${null}, ${appointmentTime.toISOString()},
      ${state.duration}, 'pending'
    )
    RETURNING id
  ` as unknown as Array<{ id: number }>;

  const appointmentId = result[0].id;

  await clearUserState(userId);
  await sendMessage(chatId, MESSAGES.bookingCreated);

  // Notify admins
  await notifyAdmins(appointmentId, state, userId);
}

// Notify admins of new booking
async function notifyAdmins(
  appointmentId: number,
  state: BookingState,
  userId: number
): Promise<void> {
  if (ADMIN_IDS.length === 0) return;

  const dateTime = new Date(state.time!);
  const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;
  
  const text = `🔔 درخواست رزرو جدید\n\nخدمت: ${state.serviceName}\nزمان: ${dateTimeStr}\nنام: ${state.name}\nتلفن: ${state.phone}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ تأیید', callback_data: `ok_${appointmentId}` },
        { text: '❌ رد', callback_data: `no_${appointmentId}` },
      ],
    ],
  };

  for (const adminId of ADMIN_IDS) {
    try {
      await sendMessage(adminId, text, keyboard);
    } catch (error) {
      console.error(`Failed to notify admin ${adminId}:`, error);
    }
  }
}

// Handle admin confirm
async function handleAdminConfirm(chatId: number, appointmentId: number): Promise<void> {
  await sql`
    UPDATE appointments
    SET status = 'confirmed', updated_at = NOW()
    WHERE id = ${appointmentId}
  `;

  const appointment = await sql`
    SELECT * FROM appointments WHERE id = ${appointmentId}
  ` as unknown as Array<any>;

  if (appointment.length > 0) {
    const appt = appointment[0];
    await sendMessage(appt.customer_telegram_id, MESSAGES.bookingConfirmed);
    await sendMessage(chatId, '✅ نوبت تأیید شد و به مشتری اطلاع داده شد.');
  }
}

// Handle admin reject
async function handleAdminReject(chatId: number, appointmentId: number): Promise<void> {
  await sql`
    UPDATE appointments
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${appointmentId}
  `;

  const appointment = await sql`
    SELECT * FROM appointments WHERE id = ${appointmentId}
  ` as unknown as Array<any>;

  if (appointment.length > 0) {
    const appt = appointment[0];
    await sendMessage(appt.customer_telegram_id, MESSAGES.bookingRejected);
    await sendMessage(chatId, '❌ نوبت رد شد و به مشتری اطلاع داده شد.');
  }
}

// Show user's bookings
async function handleMyBookings(chatId: number, userId: number): Promise<void> {
  const now = new Date();
  const appointments = await sql`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.customer_telegram_id = ${userId}
    AND a.appointment_time > ${now.toISOString()}
    AND a.status IN ('pending', 'confirmed')
    ORDER BY a.appointment_time ASC
  ` as unknown as Array<any>;

  if (appointments.length === 0) {
    await sendMessage(chatId, MESSAGES.noUpcomingBookings);
    return;
  }

  let message = MESSAGES.myBookings;
  for (const appt of appointments) {
    const dateTime = new Date(appt.appointment_time);
    const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;
    const status = appt.status === 'confirmed' ? '✅ تأیید شده' : '⏳ در انتظار';
    message += `\n\n• ${appt.service_name}\n${dateTimeStr}\nوضعیت: ${status}`;
  }

  await sendMessage(chatId, message);
}

// Show cancel booking interface
async function handleCancelBooking(chatId: number, userId: number): Promise<void> {
  const now = new Date();
  const appointments = await sql`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.customer_telegram_id = ${userId}
    AND a.appointment_time > ${now.toISOString()}
    AND a.status IN ('pending', 'confirmed')
    ORDER BY a.appointment_time ASC
  ` as unknown as Array<any>;

  if (appointments.length === 0) {
    await sendMessage(chatId, MESSAGES.noUpcomingBookings);
    return;
  }

  const buttons = appointments.map((appt) => {
    const dateTime = new Date(appt.appointment_time);
    const dateTimeStr = `${formatFullJalaliDate(dateTime).substring(0, 15)} ${formatTime(dateTime)}`;
    return [{ text: `${appt.service_name} - ${dateTimeStr}`, callback_data: `ca_${appt.id}` }];
  });
  buttons.push([{ text: '🏠 بازگشت به منو', callback_data: 'menu' }]);

  const keyboard = { inline_keyboard: buttons };
  await sendMessage(chatId, MESSAGES.selectBookingToCancel, keyboard);
}

// Handle services list
async function handleServices(chatId: number): Promise<void> {
  const services = await sql`
    SELECT * FROM services WHERE is_active = true ORDER BY name
  ` as unknown as Service[];

  let message = MESSAGES.servicesList;
  for (const service of services) {
    message += `\n\n• ${service.name}\n⏱ ${service.duration_minutes} دقیقه\n💰 ${service.price_toman.toLocaleString('fa-IR')} تومان`;
  }

  await sendMessage(chatId, message);
}

// Admin: today's appointments
async function handleTodayCommand(chatId: number): Promise<void> {
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
  ` as unknown as Array<any>;

  if (appointments.length === 0) {
    await sendMessage(chatId, 'امروز نوبتی وجود ندارد.');
    return;
  }

  let message = '📋 *نوبت‌های امروز:*\n';
  for (const appt of appointments) {
    const dateTime = new Date(appt.appointment_time);
    const status = appt.status === 'confirmed' ? '✅' : '⏳';
    message += `\n• ${formatTime(dateTime)} - ${appt.service_name} ${status}\n  ${appt.customer_name} (${appt.customer_phone})`;
  }

  await sendMessage(chatId, message);
}

// Admin: week's appointments
async function handleWeekCommand(chatId: number): Promise<void> {
  const now = new Date();
  const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const appointments = await sql`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.appointment_time >= ${today.toISOString()}
    AND a.appointment_time < ${nextWeek.toISOString()}
    AND a.status IN ('pending', 'confirmed')
    ORDER BY a.appointment_time ASC
  ` as unknown as Array<any>;

  if (appointments.length === 0) {
    await sendMessage(chatId, 'هفته آینده نوبتی وجود ندارد.');
    return;
  }

  let message = '📋 *نوبت‌های هفته آینده:*\n';
  for (const appt of appointments) {
    const dateTime = new Date(appt.appointment_time);
    const status = appt.status === 'confirmed' ? '✅' : '⏳';
    message += `\n• ${formatFullJalaliDate(dateTime).substring(0, 15)} ${formatTime(dateTime)}\n  ${appt.service_name} - ${appt.customer_name} ${status}`;
  }

  await sendMessage(chatId, message);
}

// Phone validation
function isValidPhone(phone: string): boolean {
  return /^09\d{9}$/.test(phone.replace(/[\s-]/g, ''));
}

// Main webhook handler
export async function POST(request: Request): Promise<Response> {
  console.log('[webhook] POST received');

  try {
    // Verify webhook secret
    const secretToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (WEBHOOK_SECRET && secretToken !== WEBHOOK_SECRET) {
      console.error('[webhook] Invalid secret token');
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse update
    const update: TelegramUpdate = await request.json();
    console.log('[webhook] Update:', JSON.stringify(update));

    // Handle message
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text?.trim() || '';

      console.log('[webhook] Message from', userId, 'text:', text);

      if (text === '/start' || text === '/menu') {
        await handleStart(chatId, userId);
      } else {
        await handleText(chatId, userId, text);
      }
    }

    // Handle callback query
    if (update.callback_query) {
      const query = update.callback_query;
      const chatId = query.message?.chat.id;
      const userId = query.from.id;
      const data = query.data || '';

      console.log('[webhook] Callback query from', userId, 'data:', data);

      await answerCallbackQuery(query.id);

      if (!chatId) {
        return new Response('OK', { status: 200 });
      }

      if (data === 'menu') {
        await clearUserState(userId);
        await handleStart(chatId, userId);
      } else if (data === 'new') {
        await handleNewBooking(chatId, userId);
      } else if (data === 'confirm') {
        await handleBookingConfirm(chatId, userId);
      } else if (data.startsWith('sv_')) {
        const serviceId = parseInt(data.replace('sv_', ''));
        await handleServiceSelected(chatId, userId, serviceId);
      } else if (data.startsWith('dt_')) {
        const dateStr = data.replace('dt_', '');
        await handleDateSelected(chatId, userId, dateStr);
      } else if (data.startsWith('tm_')) {
        const timeStr = data.replace('tm_', '');
        await handleTimeSelected(chatId, userId, timeStr);
      } else if (data.startsWith('ok_')) {
        const appointmentId = parseInt(data.replace('ok_', ''));
        await handleAdminConfirm(chatId, appointmentId);
      } else if (data.startsWith('no_')) {
        const appointmentId = parseInt(data.replace('no_', ''));
        await handleAdminReject(chatId, appointmentId);
      } else if (data.startsWith('ca_')) {
        const appointmentId = parseInt(data.replace('ca_', ''));
        // Confirm cancel
        const keyboard = {
          inline_keyboard: [
            [{ text: '✅ تأیید لغو', callback_data: `cc_${appointmentId}` }],
            [{ text: '❌ بازگشت', callback_data: 'menu' }],
          ],
        };
        await sendMessage(chatId, 'آیا مطمئن هستید که می‌خواهید این نوبت را لغو کنید؟', keyboard);
      } else if (data.startsWith('cc_')) {
        const appointmentId = parseInt(data.replace('cc_', ''));
        await sql`
          UPDATE appointments
          SET status = 'cancelled', updated_at = NOW()
          WHERE id = ${appointmentId} AND customer_telegram_id = ${userId}
        `;
        await sendMessage(chatId, MESSAGES.bookingCancelled);
        
        // Notify admins
        for (const adminId of ADMIN_IDS) {
          try {
            await sendMessage(adminId, `📅 نوبت شماره ${appointmentId} توسط مشتری لغو شد.`);
          } catch (error) {
            console.error(`Failed to notify admin ${adminId}:`, error);
          }
        }
      }
    }

    console.log('[webhook] Processing complete, returning 200');
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[webhook] Error:', error);
    if (error instanceof Error) {
      console.error('[webhook] Error details:', error.name, error.message, error.stack);
    }
    return new Response('Internal Server Error', { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
