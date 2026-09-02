import { sql } from '@/db/client';
import type { Service } from '@/db/client';
import { MESSAGES } from '@/lib/messages';
import { formatFullJalaliDate, formatTime } from '@/lib/jalali';
import { getNextOpenDays, getAvailableSlots, isSlotAvailable } from '@/lib/slots';
import { createMagicLink, getUserByTelegramId, getBarberByUserId, generateBarberCode, getBarberByCode, ensureBarberCode } from '@/lib/auth';
import { getTehranDayStart, getTehranNextDayStart, addTehranDays } from '@/lib/tehran-time';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const BRAND_NAME = 'نوبت‌آرا';
const BOT_USERNAME = process.env.BOT_USERNAME || 'BarberAppointmentAppBot';
const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

// Get app URL with proper fallbacks
function getAppUrl(request?: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }
  
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
interface ChatState {
  step: 'role' | 'enter_code' | 'service' | 'date' | 'time' | 'name' | 'phone' | 'confirm' | 'register_barber_name';
  barberId?: number;
  barberName?: string;
  barberCode?: string;
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
  replyMarkup?: any,
  disableWebPagePreview?: boolean
): Promise<any> {
  console.log('[sendMessage] Sending to chat', chatId);
  
  const body: any = { chat_id: chatId, text };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  if (disableWebPagePreview) {
    body.disable_web_page_preview = true;
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
async function getUserState(userId: number): Promise<ChatState | null> {
  const key = `chat_state:${userId}`;
  const rows = await sql`
    SELECT value FROM chat_state 
    WHERE key = ${key} 
    AND (expires_at IS NULL OR expires_at > NOW())
  ` as unknown as Array<{ value: string }>;
  
  if (rows.length === 0) return null;
  return JSON.parse(rows[0].value);
}

// Helper: Set user state
async function setUserState(userId: number, state: ChatState): Promise<void> {
  const key = `chat_state:${userId}`;
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
  const key = `chat_state:${userId}`;
  await sql`DELETE FROM chat_state WHERE key = ${key}`;
}

// Helper: Check if user is admin
function isAdmin(userId: number): boolean {
  return ADMIN_TELEGRAM_IDS.includes(userId);
}

// Screen 0: Role picker
async function showRolePicker(chatId: number, userId: number): Promise<void> {
  await clearUserState(userId);
  
  const user = await getUserByTelegramId(userId);
  const isBarber = user && user.role === 'barber';
  const isSuperAdmin = user && user.role === 'super_admin';
  const showAdmin = isAdmin(userId);
  
  // Build inline keyboard
  const buttons: any[][] = [
    [{ text: MESSAGES.roleCustomer, callback_data: 'role_customer' }],
    [{ text: MESSAGES.roleBarber, callback_data: 'role_barber' }],
  ];
  
  if (showAdmin) {
    buttons.push([{ text: MESSAGES.roleAdmin, callback_data: 'role_admin' }]);
  }
  
  const keyboard = { inline_keyboard: buttons };
  await sendMessage(chatId, MESSAGES.rolePicker, keyboard);
}

// Customer flow: request barber code
async function startCustomerFlow(chatId: number, userId: number, barberCode?: string): Promise<void> {
  if (barberCode) {
    // Deep link with code
    await handleBarberCodeInput(chatId, userId, barberCode);
  } else {
    // Check if user has a previous barber
    const lastBooking = await sql`
      SELECT b.id, b.display_name, b.public_code
      FROM appointments a
      JOIN barbers b ON a.barber_id = b.id
      WHERE a.customer_telegram_id = ${userId}
      ORDER BY a.created_at DESC
      LIMIT 1
    ` as any[];
    
    if (lastBooking.length > 0 && lastBooking[0].public_code) {
      const barber = lastBooking[0];
      const keyboard = {
        inline_keyboard: [
          [{ text: MESSAGES.customer.continueWithBarber(barber.display_name), callback_data: `use_barber_${barber.id}` }],
          [{ text: MESSAGES.customer.enterDifferentCode, callback_data: 'enter_code' }],
          [{ text: MESSAGES.customer.menuMain, callback_data: 'menu' }],
        ],
      };
      await sendMessage(chatId, MESSAGES.customer.requestBarberCode, keyboard);
    } else {
      await setUserState(userId, { step: 'enter_code' });
      const keyboard = {
        inline_keyboard: [
          [{ text: MESSAGES.customer.menuMain, callback_data: 'menu' }],
        ],
      };
      await sendMessage(chatId, MESSAGES.customer.requestBarberCode, keyboard);
    }
  }
}

// Handle barber code input
async function handleBarberCodeInput(chatId: number, userId: number, code: string): Promise<void> {
  const barber = await getBarberByCode(code);
  
  if (!barber) {
    await sendMessage(chatId, MESSAGES.customer.barberNotFound);
    await startCustomerFlow(chatId, userId);
    return;
  }
  
  // Check if barber has active services
  const services = await sql`
    SELECT id FROM services 
    WHERE barber_id = ${barber.id} AND is_active = true
    LIMIT 1
  ` as any[];
  
  if (services.length === 0) {
    await sendMessage(chatId, MESSAGES.customer.barberNoServices);
    await startCustomerFlow(chatId, userId);
    return;
  }
  
  // Show services
  await setUserState(userId, { 
    step: 'service', 
    barberId: barber.id,
    barberName: barber.display_name,
    barberCode: code,
  });
  await handleServiceSelection(chatId, userId, barber.id);
}

// Customer menu
async function showCustomerMenu(chatId: number, userId: number): Promise<void> {
  const keyboard = {
    keyboard: [
      [{ text: MESSAGES.customer.menuNewBooking }],
      [{ text: MESSAGES.customer.menuMyBookings }, { text: MESSAGES.customer.menuCancel }],
      [{ text: MESSAGES.customer.menuChangeBarber }, { text: MESSAGES.customer.menuHelp }],
      [{ text: MESSAGES.customer.menuMain }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
  await sendMessage(chatId, MESSAGES.customer.menu, keyboard);
}

// Barber flow: signup or menu
async function startBarberFlow(chatId: number, userId: number, request?: Request): Promise<void> {
  const user = await getUserByTelegramId(userId);
  
  if (!user || (user.role !== 'barber' && user.role !== 'super_admin')) {
    // Signup
    await setUserState(userId, { step: 'register_barber_name' });
    await sendMessage(chatId, MESSAGES.barber.signup.welcome);
    return;
  }
  
  // Show barber menu
  await showBarberMenu(chatId, userId);
}

// Barber signup
async function completeBarberSignup(chatId: number, userId: number, displayName: string, request?: Request): Promise<void> {
  try {
    const existingUser = await getUserByTelegramId(userId);
    
    let userDbId: number;
    
    if (existingUser) {
      await sql`
        UPDATE users
        SET role = 'barber', name = ${displayName}
        WHERE telegram_id = ${userId}
      `;
      userDbId = existingUser.id;
    } else {
      const [newUser] = await sql`
        INSERT INTO users (telegram_id, role, name, is_active)
        VALUES (${userId}, 'barber', ${displayName}, true)
        RETURNING id
      ` as any[];
      userDbId = newUser.id;
    }
    
    // Generate barber code
    const publicCode = await generateBarberCode();
    
    // Create barber record
    const [barber] = await sql`
      INSERT INTO barbers (user_id, display_name, public_code, is_active)
      VALUES (${userDbId}, ${displayName}, ${publicCode}, true)
      RETURNING id
    ` as any[];
    
    const barberId = barber.id;
    
    // Seed working hours (10:00-21:00, all days)
    const workingHours = [
      { weekday: 0, start_time: '10:00', end_time: '21:00', is_open: true },
      { weekday: 1, start_time: '10:00', end_time: '21:00', is_open: true },
      { weekday: 2, start_time: '10:00', end_time: '21:00', is_open: true },
      { weekday: 3, start_time: '10:00', end_time: '21:00', is_open: true },
      { weekday: 4, start_time: '10:00', end_time: '21:00', is_open: true },
      { weekday: 5, start_time: '10:00', end_time: '21:00', is_open: true },
      { weekday: 6, start_time: '10:00', end_time: '21:00', is_open: true },
    ];
    
    for (const hours of workingHours) {
      await sql`
        INSERT INTO working_hours (barber_id, weekday, start_time, end_time, is_open)
        VALUES (${barberId}, ${hours.weekday}, ${hours.start_time}, ${hours.end_time}, ${hours.is_open})
      `;
    }
    
    await clearUserState(userId);
    
    // Generate magic link
    const appUrl = getAppUrl(request);
    const token = await createMagicLink(userDbId);
    const magicLink = `${appUrl}/api/auth/magic?token=${token}`;
    const inviteLink = `https://t.me/${BOT_USERNAME}?start=${publicCode}`;
    
    await sendMessage(
      chatId, 
      MESSAGES.barber.signup.success(publicCode, inviteLink, magicLink),
      undefined,
      true
    );
    
    await showBarberMenu(chatId, userId);
  } catch (error) {
    console.error('Error in barber signup:', error);
    await sendMessage(chatId, MESSAGES.barber.signup.error);
  }
}

// Barber menu
async function showBarberMenu(chatId: number, userId: number): Promise<void> {
  const keyboard = {
    keyboard: [
      [{ text: MESSAGES.barber.menuToday }],
      [{ text: MESSAGES.barber.menuPanel }, { text: MESSAGES.barber.menuMyCode }],
      [{ text: MESSAGES.barber.menuHelp }],
      [{ text: MESSAGES.barber.menuMain }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
  await sendMessage(chatId, MESSAGES.barber.menu, keyboard);
}

// Show barber code
async function showBarberCode(chatId: number, userId: number): Promise<void> {
  const user = await getUserByTelegramId(userId);
  if (!user) return;
  
  const barber = await getBarberByUserId(user.id);
  if (!barber) {
    await sendMessage(chatId, 'شما به عنوان آرایشگر ثبت نشده‌اید.');
    return;
  }
  
  const code = await ensureBarberCode(barber.id);
  const inviteLink = `https://t.me/${BOT_USERNAME}?start=${code}`;
  
  await sendMessage(chatId, MESSAGES.barber.codeInfo(code, inviteLink), undefined, true);
}

// Admin flow
async function startAdminFlow(chatId: number, userId: number, request?: Request): Promise<void> {
  if (!isAdmin(userId)) {
    await sendMessage(chatId, 'شما دسترسی به پنل ادمین ندارید.');
    return;
  }
  
  const user = await getUserByTelegramId(userId);
  if (!user) {
    await sendMessage(chatId, 'کاربر یافت نشد.');
    return;
  }
  
  const appUrl = getAppUrl(request);
  
  if (!appUrl || appUrl === 'http://localhost:3000') {
    await sendMessage(chatId, 'پنل مدیریت در دسترس نیست.');
    return;
  }
  
  try {
    const token = await createMagicLink(user.id);
    const magicLink = `${appUrl}/api/auth/magic?token=${token}`;
    
    await sendMessage(
      chatId,
      `${MESSAGES.admin.welcome}\n\n${magicLink}\n\n⏰ لینک تا ۱۰ دقیقه معتبر است.`,
      undefined,
      true
    );
  } catch (error) {
    console.error('Error creating admin magic link:', error);
    await sendMessage(chatId, 'خطا در ایجاد لینک ورود.');
  }
}

// Handle panel command
async function handlePanelCommand(chatId: number, userId: number, request?: Request): Promise<void> {
  const user = await getUserByTelegramId(userId);
  
  if (!user || (user.role !== 'barber' && user.role !== 'super_admin')) {
    await sendMessage(chatId, 'شما دسترسی به پنل مدیریت ندارید.');
    return;
  }

  const appUrl = getAppUrl(request);
  
  if (!appUrl || appUrl === 'http://localhost:3000') {
    await sendMessage(chatId, 'پنل مدیریت در دسترس نیست.');
    return;
  }

  try {
    const token = await createMagicLink(user.id);
    const magicLink = `${appUrl}/api/auth/magic?token=${token}`;
    
    await sendMessage(
      chatId,
      `🔐 لینک ورود به پنل مدیریت:\n\n${magicLink}\n\n⏰ لینک تا ۱۰ دقیقه معتبر است.`,
      undefined,
      true
    );
  } catch (error) {
    console.error('Error creating magic link:', error);
    await sendMessage(chatId, 'خطا در ایجاد لینک ورود.');
  }
}

// Handle service selection
async function handleServiceSelection(chatId: number, userId: number, barberId: number): Promise<void> {
  const services = await sql`
    SELECT * FROM services 
    WHERE barber_id = ${barberId} AND is_active = true 
    ORDER BY name
  ` as unknown as Service[];

  if (services.length === 0) {
    await sendMessage(chatId, 'متأسفانه خدمتی موجود نیست.');
    return;
  }

  const buttons = services.map((s) => [{
    text: `${s.name} (${s.duration_minutes}د - ${s.price_toman.toLocaleString('fa-IR')}ت)`,
    callback_data: `sv_${s.id}`,
  }]);
  buttons.push([{ text: '🏠 بازگشت', callback_data: 'back' }]);

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
  buttons.push([{ text: '🏠 بازگشت', callback_data: 'back' }]);

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
    await showRolePicker(chatId, userId);
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
  buttons.push([{ text: '🏠 بازگشت', callback_data: 'back' }]);

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
    await showRolePicker(chatId, userId);
    return;
  }

  state.step = 'name';
  state.time = timeStr;
  await setUserState(userId, state);

  await sendMessage(chatId, MESSAGES.requestName);
}

// Handle text input
async function handleText(chatId: number, userId: number, text: string, request?: Request): Promise<void> {
  const state = await getUserState(userId);

  // Check for menu buttons - Customer
  if (text === MESSAGES.customer.menuNewBooking) {
    await startCustomerFlow(chatId, userId);
    return;
  }
  if (text === MESSAGES.customer.menuMyBookings) {
    await handleMyBookings(chatId, userId);
    return;
  }
  if (text === MESSAGES.customer.menuCancel) {
    await handleCancelBooking(chatId, userId);
    return;
  }
  if (text === MESSAGES.customer.menuHelp) {
    await sendMessage(chatId, MESSAGES.customer.help);
    return;
  }
  if (text === MESSAGES.customer.menuChangeBarber) {
    await startCustomerFlow(chatId, userId);
    return;
  }
  if (text === MESSAGES.customer.menuMain || text === MESSAGES.barber.menuMain) {
    await showRolePicker(chatId, userId);
    return;
  }
  
  // Check for menu buttons - Barber
  if (text === MESSAGES.barber.menuToday) {
    const user = await getUserByTelegramId(userId);
    if (user) {
      await handleTodayCommand(chatId, userId, user);
    }
    return;
  }
  if (text === MESSAGES.barber.menuPanel) {
    await handlePanelCommand(chatId, userId, request);
    return;
  }
  if (text === MESSAGES.barber.menuMyCode) {
    await showBarberCode(chatId, userId);
    return;
  }
  if (text === MESSAGES.barber.menuHelp) {
    await sendMessage(chatId, MESSAGES.barber.help);
    return;
  }

  // State machine text input
  if (!state) {
    await showRolePicker(chatId, userId);
    return;
  }

  if (state.step === 'register_barber_name') {
    const displayName = text.trim();
    await completeBarberSignup(chatId, userId, displayName, request);
    return;
  }

  if (state.step === 'enter_code') {
    const code = text.trim().toUpperCase();
    await handleBarberCodeInput(chatId, userId, code);
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
  await showRolePicker(chatId, userId);
}

// Show booking summary
async function showBookingSummary(
  chatId: number,
  userId: number,
  state: ChatState
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
    await sendMessage(chatId, 'متأسفانه این زمان دیگر در دسترس نیست.');
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
  
  // Show customer menu
  await showCustomerMenu(chatId, userId);
}

// Notify barber of new booking
async function notifyBarber(
  appointmentId: number,
  state: ChatState,
  customerId: number
): Promise<void> {
  if (!state.barberId) return;

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

// Handle barber confirm
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
    await sendMessage(chatId, '✅ نوبت تأیید شد.');
  }
}

// Handle barber reject
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
    await sendMessage(chatId, '❌ نوبت رد شد.');
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
  buttons.push([{ text: '🏠 بازگشت', callback_data: 'menu' }]);

  const keyboard = { inline_keyboard: buttons };
  await sendMessage(chatId, MESSAGES.selectBookingToCancel, keyboard);
}

// Barber: today's appointments
async function handleTodayCommand(chatId: number, userId: number, user: any): Promise<void> {
  const now = new Date();
  const today = getTehranDayStart(now);
  const tomorrow = getTehranNextDayStart(now);

  let query;
  if (user.role === 'barber') {
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

// Phone validation (Iranian mobile)
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
        // Check for deep link payload
        const parts = text.split(' ');
        if (parts.length > 1 && parts[0] === '/start') {
          const payload = parts[1];
          // Check if it's a barber code
          if (/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(payload)) {
            await startCustomerFlow(chatId, userId, payload);
            return new Response('OK', { status: 200 });
          }
        }
        await showRolePicker(chatId, userId);
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
        await showRolePicker(chatId, userId);
      } else if (data === 'back') {
        const state = await getUserState(userId);
        if (state && state.step === 'date' && state.barberId) {
          await handleServiceSelection(chatId, userId, state.barberId);
        } else {
          await showRolePicker(chatId, userId);
        }
      } else if (data === 'role_customer') {
        await startCustomerFlow(chatId, userId);
      } else if (data === 'role_barber') {
        await startBarberFlow(chatId, userId, request);
      } else if (data === 'role_admin') {
        await startAdminFlow(chatId, userId, request);
      } else if (data === 'enter_code') {
        await setUserState(userId, { step: 'enter_code' });
        await sendMessage(chatId, MESSAGES.customer.requestBarberCode);
      } else if (data.startsWith('use_barber_')) {
        const barberId = parseInt(data.replace('use_barber_', ''));
        const barber = await sql`
          SELECT * FROM barbers WHERE id = ${barberId} AND is_active = true
        ` as any[];
        if (barber.length > 0) {
          await setUserState(userId, { 
            step: 'service', 
            barberId: barber[0].id,
            barberName: barber[0].display_name,
          });
          await handleServiceSelection(chatId, userId, barber[0].id);
        }
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
        const keyboard = {
          inline_keyboard: [
            [{ text: '✅ تأیید لغو', callback_data: `cc_${appointmentId}` }],
            [{ text: '❌ بازگشت', callback_data: 'menu' }],
          ],
        };
        await sendMessage(chatId, 'آیا مطمئن هستید؟', keyboard);
      } else if (data.startsWith('cc_')) {
        const appointmentId = parseInt(data.replace('cc_', ''));
        
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

    console.log('[webhook] Processing complete');
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
