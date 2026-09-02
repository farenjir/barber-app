import { sql } from '@/db/client';
import type { Service } from '@/db/client';
import { MESSAGES } from '@/lib/messages';
import { formatFullJalaliDate, formatTime } from '@/lib/jalali';
import { getNextOpenDays, getAvailableSlots, isSlotAvailable } from '@/lib/slots';
import { createMagicLink, getUserByTelegramId, getActiveBarbers } from '@/lib/auth';
import { getTehranDayStart, getTehranNextDayStart, addTehranDays } from '@/lib/tehran-time';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SALON_NAME = process.env.SALON_NAME || 'سالن زیبایی';

// Get app URL with proper fallbacks
function getAppUrl(request?: Request): string {
  // 1. Use APP_URL if set
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  // 2. Use VERCEL_URL if available
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 3. Extract from request if provided
  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }
  
  // 4. Fallback
  return 'http://localhost:3000';
}

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
  step: 'barber' | 'service' | 'date' | 'time' | 'name' | 'phone' | 'confirm' | 'register_barber_name';
  barberId?: number;
  barberName?: string;
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

// Handle /start and main menu
async function handleStart(chatId: number, userId: number): Promise<void> {
  await clearUserState(userId);
  
  const welcomeText = MESSAGES.welcome(SALON_NAME);
  
  // Check if user is barber or admin
  const user = await getUserByTelegramId(userId);
  const isStaff = user && (user.role === 'barber' || user.role === 'super_admin');
  
  const keyboard = {
    keyboard: [
      [{ text: '📅 رزرو نوبت جدید' }],
      [{ text: '📋 نوبت‌های من' }, { text: '❌ لغو نوبت' }],
      [{ text: '💇 خدمات و قیمت‌ها' }, { text: '❓ راهنما' }],
      ...(isStaff ? [[{ text: '🔐 ورود به پنل مدیریت' }]] : [[{ text: '✍️ ثبت‌نام آرایشگر' }]]),
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };

  await sendMessage(chatId, welcomeText, keyboard);
}

// Handle /panel command
async function handlePanelCommand(chatId: number, userId: number, request?: Request): Promise<void> {
  const user = await getUserByTelegramId(userId);
  
  if (!user || (user.role !== 'barber' && user.role !== 'super_admin')) {
    await sendMessage(chatId, 'شما دسترسی به پنل مدیریت ندارید.');
    return;
  }

  const appUrl = getAppUrl(request);
  
  if (!appUrl || appUrl === 'http://localhost:3000') {
    await sendMessage(chatId, 'پنل مدیریت در حال حاضر در دسترس نیست. لطفاً با پشتیبانی تماس بگیرید.');
    return;
  }

  try {
    const token = await createMagicLink(user.id);
    const magicLink = `${appUrl}/api/auth/magic?token=${token}`;
    
    await sendMessage(
      chatId,
      `🔐 لینک ورود به پنل مدیریت:\n\n${magicLink}\n\n⏰ این لینک تا ۱۰ دقیقه دیگر معتبر است و فقط یک بار قابل استفاده می‌باشد.`
    );
  } catch (error) {
    console.error('Error creating magic link:', error);
    await sendMessage(chatId, 'خطا در ایجاد لینک ورود. لطفاً دوباره تلاش کنید.');
  }
}

// Handle barber registration
async function handleBarberRegistration(chatId: number, userId: number, request?: Request): Promise<void> {
  // Check if user already has barber or admin role
  const user = await getUserByTelegramId(userId);
  
  if (user && (user.role === 'barber' || user.role === 'super_admin')) {
    await sendMessage(chatId, MESSAGES.barberRegistration.alreadyBarber);
    return;
  }
  
  // Ask for display name
  await setUserState(userId, { step: 'register_barber_name' });
  await sendMessage(chatId, MESSAGES.barberRegistration.requestDisplayName);
}

// Complete barber registration
async function completeBarberRegistration(chatId: number, userId: number, displayName: string, request?: Request): Promise<void> {
  try {
    // Check if user exists
    const existingUser = await getUserByTelegramId(userId);
    
    let userDbId: number;
    
    if (existingUser) {
      // Update existing customer to barber
      await sql`
        UPDATE users
        SET role = 'barber', name = ${displayName}
        WHERE telegram_id = ${userId}
      `;
      userDbId = existingUser.id;
    } else {
      // Create new user with barber role
      const [newUser] = await sql`
        INSERT INTO users (telegram_id, role, name, is_active)
        VALUES (${userId}, 'barber', ${displayName}, true)
        RETURNING id
      ` as any[];
      userDbId = newUser.id;
    }
    
    // Create barber record
    const [barber] = await sql`
      INSERT INTO barbers (user_id, display_name, is_active)
      VALUES (${userDbId}, ${displayName}, true)
      RETURNING id
    ` as any[];
    
    const barberId = barber.id;
    
    // Seed working hours for all 7 weekdays (10:00-21:00, all open)
    const workingHours = [
      { weekday: 0, start_time: '10:00', end_time: '21:00', is_open: true },  // Sunday
      { weekday: 1, start_time: '10:00', end_time: '21:00', is_open: true },  // Monday
      { weekday: 2, start_time: '10:00', end_time: '21:00', is_open: true },  // Tuesday
      { weekday: 3, start_time: '10:00', end_time: '21:00', is_open: true },  // Wednesday
      { weekday: 4, start_time: '10:00', end_time: '21:00', is_open: true },  // Thursday
      { weekday: 5, start_time: '10:00', end_time: '21:00', is_open: true },  // Friday
      { weekday: 6, start_time: '10:00', end_time: '21:00', is_open: true },  // Saturday
    ];
    
    for (const hours of workingHours) {
      await sql`
        INSERT INTO working_hours (barber_id, weekday, start_time, end_time, is_open)
        VALUES (${barberId}, ${hours.weekday}, ${hours.start_time}, ${hours.end_time}, ${hours.is_open})
      `;
    }
    
    // Clear registration state
    await clearUserState(userId);
    
    // Send magic link to panel
    const appUrl = getAppUrl(request);
    const token = await createMagicLink(userDbId);
    const magicLink = `${appUrl}/api/auth/magic?token=${token}`;
    
    await sendMessage(chatId, MESSAGES.barberRegistration.success(magicLink));
  } catch (error) {
    console.error('Error in barber registration:', error);
    await sendMessage(chatId, MESSAGES.barberRegistration.error);
  }
}

// Handle barber selection (for multi-barber booking)
async function handleBarberSelection(chatId: number, userId: number): Promise<void> {
  const barbers = await getActiveBarbers();

  if (barbers.length === 0) {
    await sendMessage(chatId, 'متأسفانه در حال حاضر هیچ آرایشگری در دسترس نیست.');
    return;
  }

  // If only one barber, skip selection
  if (barbers.length === 1) {
    const state: BookingState = {
      step: 'service',
      barberId: barbers[0].id,
      barberName: barbers[0].display_name,
    };
    await setUserState(userId, state);
    await handleServiceSelection(chatId, userId, barbers[0].id);
    return;
  }

  // Multiple barbers - show selection
  await setUserState(userId, { step: 'barber' });

  const buttons = barbers.map((b) => [{
    text: b.display_name,
    callback_data: `bb_${b.id}`,
  }]);
  buttons.push([{ text: '🏠 بازگشت به منو', callback_data: 'menu' }]);

  const keyboard = { inline_keyboard: buttons };
  await sendMessage(chatId, 'لطفاً آرایشگر مورد نظر خود را انتخاب کنید:', keyboard);
}

// Handle service selection
async function handleServiceSelection(chatId: number, userId: number, barberId: number): Promise<void> {
  const services = await sql`
    SELECT * FROM services 
    WHERE barber_id = ${barberId} AND is_active = true 
    ORDER BY name
  ` as unknown as Service[];

  if (services.length === 0) {
    await sendMessage(chatId, 'متأسفانه در حال حاضر خدمتی موجود نیست.');
    return;
  }

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
  const service = await sql`
    SELECT s.*, b.id as barber_id, b.display_name as barber_name
    FROM services s
    JOIN barbers b ON s.barber_id = b.id
    WHERE s.id = ${serviceId}
  ` as unknown as any[];

  if (service.length === 0) {
    await sendMessage(chatId, MESSAGES.error);
    return;
  }

  const s = service[0];
  await setUserState(userId, {
    step: 'date',
    barberId: s.barber_id,
    barberName: s.barber_name,
    serviceId: s.id,
    serviceName: s.name,
    duration: s.duration_minutes,
    price: s.price_toman,
  });

  const openDays = await getNextOpenDays(s.barber_id, 14);
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
  if (!state || !state.duration || !state.barberId) {
    await handleStart(chatId, userId);
    return;
  }

  const date = new Date(dateStr);
  const slots = await getAvailableSlots(state.barberId, date, state.duration);

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
async function handleText(chatId: number, userId: number, text: string, request?: Request): Promise<void> {
  const state = await getUserState(userId);

  // Check for menu buttons
  if (text === '📅 رزرو نوبت جدید') {
    await handleBarberSelection(chatId, userId);
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
  if (text === '🔐 ورود به پنل مدیریت' || text === '/panel') {
    await handlePanelCommand(chatId, userId, request);
    return;
  }
  if (text === '✍️ ثبت‌نام آرایشگر' || text === '/register_barber') {
    await handleBarberRegistration(chatId, userId, request);
    return;
  }

  // Check for barber/admin commands
  const user = await getUserByTelegramId(userId);
  if (user && (user.role === 'barber' || user.role === 'super_admin')) {
    if (text === '/today') {
      await handleTodayCommand(chatId, userId, user);
      return;
    }
    if (text === '/week') {
      await handleWeekCommand(chatId, userId, user);
      return;
    }
  }

  // State machine text input
  if (!state) {
    await handleStart(chatId, userId);
    return;
  }

  if (state.step === 'register_barber_name') {
    const displayName = text.trim();
    await completeBarberRegistration(chatId, userId, displayName, request);
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
  if (!state || !state.barberId || !state.serviceId || !state.time || !state.name || !state.phone || !state.duration) {
    await sendMessage(chatId, MESSAGES.error);
    return;
  }

  const appointmentTime = new Date(state.time);

  // Check availability
  if (!(await isSlotAvailable(state.barberId, appointmentTime, state.duration))) {
    await sendMessage(chatId, 'متأسفانه این زمان دیگر در دسترس نیست. لطفاً دوباره تلاش کنید.');
    await clearUserState(userId);
    return;
  }

  // Create appointment
  const result = await sql`
    INSERT INTO appointments (
      barber_id, service_id, customer_telegram_id, customer_name, customer_phone,
      customer_username, appointment_time, duration_minutes, status
    ) VALUES (
      ${state.barberId}, ${state.serviceId}, ${userId}, ${state.name}, ${state.phone},
      ${null}, ${appointmentTime.toISOString()},
      ${state.duration}, 'pending'
    )
    RETURNING id
  ` as unknown as Array<{ id: number }>;

  const appointmentId = result[0].id;

  await clearUserState(userId);
  await sendMessage(chatId, MESSAGES.bookingCreated);

  // Notify the barber
  await notifyBarber(appointmentId, state, userId);
}

// Notify barber of new booking
async function notifyBarber(
  appointmentId: number,
  state: BookingState,
  customerId: number
): Promise<void> {
  if (!state.barberId) return;

  // Get barber's telegram ID
  const barberUser = await sql`
    SELECT u.telegram_id
    FROM barbers b
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ${state.barberId}
  ` as any[];

  if (barberUser.length === 0) return;

  const barberTelegramId = barberUser[0].telegram_id;
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

  try {
    await sendMessage(barberTelegramId, text, keyboard);
  } catch (error) {
    console.error(`Failed to notify barber ${barberTelegramId}:`, error);
  }
}

// Handle barber/admin confirm
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

// Handle barber/admin reject
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
    SELECT a.*, s.name as service_name, b.display_name as barber_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN barbers b ON a.barber_id = b.id
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
    message += `\n\n• ${appt.service_name}\nآرایشگر: ${appt.barber_name}\n${dateTimeStr}\nوضعیت: ${status}`;
  }

  await sendMessage(chatId, message);
}

// Show cancel booking interface
async function handleCancelBooking(chatId: number, userId: number): Promise<void> {
  const now = new Date();
  const appointments = await sql`
    SELECT a.*, s.name as service_name, b.display_name as barber_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN barbers b ON a.barber_id = b.id
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
    SELECT s.*, b.display_name as barber_name
    FROM services s
    JOIN barbers b ON s.barber_id = b.id
    WHERE s.is_active = true AND b.is_active = true
    ORDER BY b.display_name, s.name
  ` as unknown as any[];

  let message = MESSAGES.servicesList;
  
  // Group by barber
  const barbers = new Map<string, any[]>();
  for (const service of services) {
    const barberName = service.barber_name;
    if (!barbers.has(barberName)) {
      barbers.set(barberName, []);
    }
    barbers.get(barberName)!.push(service);
  }

  for (const [barberName, barberServices] of barbers) {
    message += `\n\n👤 ${barberName}:`;
    for (const service of barberServices) {
      message += `\n• ${service.name}\n⏱ ${service.duration_minutes} دقیقه\n💰 ${service.price_toman.toLocaleString('fa-IR')} تومان`;
    }
  }

  await sendMessage(chatId, message);
}

// Barber/Admin: today's appointments
async function handleTodayCommand(chatId: number, userId: number, user: any): Promise<void> {
  const now = new Date();
  const today = getTehranDayStart(now);
  const tomorrow = getTehranNextDayStart(now);

  let query;
  if (user.role === 'barber') {
    // Get barber's appointments only
    const barber = await sql`
      SELECT id FROM barbers WHERE user_id = ${user.id}
    ` as any[];
    
    if (barber.length === 0) {
      await sendMessage(chatId, 'شما به عنوان آرایشگر ثبت نشده‌اید.');
      return;
    }

    const barberId = barber[0].id;
    query = sql`
      SELECT a.*, s.name as service_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.barber_id = ${barberId}
      AND a.appointment_time >= ${today.toISOString()}
      AND a.appointment_time < ${tomorrow.toISOString()}
      AND a.status IN ('pending', 'confirmed')
      ORDER BY a.appointment_time ASC
    `;
  } else {
    // Super admin: all appointments
    query = sql`
      SELECT a.*, s.name as service_name, b.display_name as barber_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN barbers b ON a.barber_id = b.id
      WHERE a.appointment_time >= ${today.toISOString()}
      AND a.appointment_time < ${tomorrow.toISOString()}
      AND a.status IN ('pending', 'confirmed')
      ORDER BY b.display_name, a.appointment_time ASC
    `;
  }

  const appointments = await query as unknown as Array<any>;

  if (appointments.length === 0) {
    await sendMessage(chatId, 'امروز نوبتی وجود ندارد.');
    return;
  }

  let message = '📋 *نوبت‌های امروز:*\n';
  for (const appt of appointments) {
    const dateTime = new Date(appt.appointment_time);
    const status = appt.status === 'confirmed' ? '✅' : '⏳';
    const barberInfo = user.role === 'super_admin' ? ` (${appt.barber_name})` : '';
    message += `\n• ${formatTime(dateTime)} - ${appt.service_name}${barberInfo} ${status}\n  ${appt.customer_name} (${appt.customer_phone})`;
  }

  await sendMessage(chatId, message);
}

// Barber/Admin: week's appointments
async function handleWeekCommand(chatId: number, userId: number, user: any): Promise<void> {
  const now = new Date();
  const today = getTehranDayStart(now);
  const nextWeek = addTehranDays(today, 7);

  let query;
  if (user.role === 'barber') {
    // Get barber's appointments only
    const barber = await sql`
      SELECT id FROM barbers WHERE user_id = ${user.id}
    ` as any[];
    
    if (barber.length === 0) {
      await sendMessage(chatId, 'شما به عنوان آرایشگر ثبت نشده‌اید.');
      return;
    }

    const barberId = barber[0].id;
    query = sql`
      SELECT a.*, s.name as service_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.barber_id = ${barberId}
      AND a.appointment_time >= ${today.toISOString()}
      AND a.appointment_time < ${nextWeek.toISOString()}
      AND a.status IN ('pending', 'confirmed')
      ORDER BY a.appointment_time ASC
    `;
  } else {
    // Super admin: all appointments
    query = sql`
      SELECT a.*, s.name as service_name, b.display_name as barber_name
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      JOIN barbers b ON a.barber_id = b.id
      WHERE a.appointment_time >= ${today.toISOString()}
      AND a.appointment_time < ${nextWeek.toISOString()}
      AND a.status IN ('pending', 'confirmed')
      ORDER BY b.display_name, a.appointment_time ASC
    `;
  }

  const appointments = await query as unknown as Array<any>;

  if (appointments.length === 0) {
    await sendMessage(chatId, 'هفته آینده نوبتی وجود ندارد.');
    return;
  }

  let message = '📋 *نوبت‌های هفته آینده:*\n';
  for (const appt of appointments) {
    const dateTime = new Date(appt.appointment_time);
    const status = appt.status === 'confirmed' ? '✅' : '⏳';
    const barberInfo = user.role === 'super_admin' ? ` (${appt.barber_name})` : '';
    message += `\n• ${formatFullJalaliDate(dateTime).substring(0, 15)} ${formatTime(dateTime)}\n  ${appt.service_name}${barberInfo} - ${appt.customer_name} ${status}`;
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
        await handleText(chatId, userId, text, request);
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
        await handleBarberSelection(chatId, userId);
      } else if (data === 'confirm') {
        await handleBookingConfirm(chatId, userId);
      } else if (data.startsWith('bb_')) {
        const barberId = parseInt(data.replace('bb_', ''));
        const state = await getUserState(userId);
        if (state) {
          state.step = 'service';
          state.barberId = barberId;
          await setUserState(userId, state);
        }
        await handleServiceSelection(chatId, userId, barberId);
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
        
        // Get appointment details for notification
        const appt = await sql`
          SELECT a.*, b.user_id as barber_user_id
          FROM appointments a
          JOIN barbers b ON a.barber_id = b.id
          WHERE a.id = ${appointmentId} AND a.customer_telegram_id = ${userId}
        ` as any[];

        if (appt.length > 0) {
          await sql`
            UPDATE appointments
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = ${appointmentId} AND customer_telegram_id = ${userId}
          `;
          await sendMessage(chatId, MESSAGES.bookingCancelled);
          
          // Notify barber
          const barberUser = await sql`
            SELECT telegram_id FROM users WHERE id = ${appt[0].barber_user_id}
          ` as any[];
          
          if (barberUser.length > 0) {
            try {
              await sendMessage(barberUser[0].telegram_id, `📅 نوبت شماره ${appointmentId} توسط مشتری لغو شد.`);
            } catch (error) {
              console.error(`Failed to notify barber:`, error);
            }
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
