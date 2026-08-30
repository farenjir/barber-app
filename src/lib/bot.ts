import { Chat } from 'chat';
import { createTelegramAdapter } from '@chat-adapter/telegram';
import { createPostgresState } from './state-adapter';
import { sql } from '../db/client';
import type { Service, Appointment } from '../db/client';
import { MESSAGES, formatStatus } from './messages';
import { 
  getNextOpenDays, 
  getAvailableSlots, 
  isSlotAvailable,
  getAppointments 
} from './slots';
import { formatFullJalaliDate, formatTime, formatJalaliDate } from './jalali';

const SALON_NAME = process.env.SALON_NAME || 'سالن زیبایی';
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map(id => parseInt(id.trim()))
  .filter(id => !isNaN(id));

// State adapter instance (shared)
const stateAdapter = createPostgresState();

// Bot instance
export const bot = new Chat({
  userName: 'BarberAppointmentAppBot',
  adapters: {
    telegram: createTelegramAdapter({
      mode: 'auto',
    }),
  },
  state: stateAdapter,
});

// Conversation state types
type BookingState = {
  step: 'service' | 'date' | 'time' | 'contact' | 'confirm';
  serviceId?: number;
  serviceName?: string;
  duration?: number;
  price?: number;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
};

// Helper to check if user is admin
function isAdmin(userId: number): boolean {
  return ADMIN_IDS.includes(userId);
}

// Helper to get user state
async function getUserState(userId: string): Promise<BookingState | null> {
  const stateKey = `booking_state:${userId}`;
  const stateJson = await stateAdapter.get(stateKey);
  return stateJson ? JSON.parse(stateJson) : null;
}

// Helper to set user state
async function setUserState(userId: string, state: BookingState): Promise<void> {
  const stateKey = `booking_state:${userId}`;
  await stateAdapter.set(stateKey, JSON.stringify(state), 3600000); // 1 hour TTL
}

// Helper to clear user state
async function clearUserState(userId: string): Promise<void> {
  const stateKey = `booking_state:${userId}`;
  await stateAdapter.delete(stateKey);
}

// Show main menu
async function showMainMenu(thread: any) {
  await thread.post({
    card: {
      type: 'Card',
      children: [
        { type: 'Text', text: MESSAGES.welcome(SALON_NAME) },
        {
          type: 'Actions',
          children: [
            { type: 'Button', id: 'new_booking', label: MESSAGES.mainMenu.newBooking },
            { type: 'Button', id: 'my_bookings', label: MESSAGES.mainMenu.myBookings },
            { type: 'Button', id: 'cancel_booking', label: MESSAGES.mainMenu.cancelBooking },
            { type: 'Button', id: 'services', label: MESSAGES.mainMenu.services },
            { type: 'Button', id: 'help', label: MESSAGES.mainMenu.help },
          ],
        },
      ],
    },
  });
}

// Handle /start command
bot.onNewMention(async (thread, message) => {
  const text = message.text?.trim().toLowerCase();
  
  if (text === '/start' || text?.startsWith('/start')) {
    await clearUserState(message.author.userId);
    await showMainMenu(thread);
    return;
  }
  
  // Admin commands
  const userId = parseInt(message.author.userId);
  if (isAdmin(userId)) {
    if (text === '/help') {
      await thread.post(MESSAGES.adminHelp);
      return;
    }
    
    if (text === '/today') {
      await handleTodayCommand(thread);
      return;
    }
    
    if (text === '/week') {
      await handleWeekCommand(thread);
      return;
    }
  }
  
  // Default: show menu
  await showMainMenu(thread);
});

// Handle button actions
bot.onAction(async (event) => {
  const actionId = event.actionId;
  const userId = event.thread.channel.channelId;
  
  const thread = event.thread;
  
  try {
    // Main menu buttons
    if (actionId === 'new_booking') {
      await startBookingFlow(thread, userId);
      return;
    }
    
    if (actionId === 'my_bookings') {
      await showMyBookings(thread, userId);
      return;
    }
    
    if (actionId === 'cancel_booking') {
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
    
    if (actionId === 'back_to_menu') {
      await clearUserState(userId);
      await showMainMenu(thread);
      return;
    }
    
    // Booking flow buttons
    if (actionId.startsWith('service_')) {
      await handleServiceSelection(thread, userId, actionId);
      return;
    }
    
    if (actionId.startsWith('date_')) {
      await handleDateSelection(thread, userId, actionId);
      return;
    }
    
    if (actionId.startsWith('time_')) {
      await handleTimeSelection(thread, userId, actionId);
      return;
    }
    
    if (actionId === 'confirm_booking') {
      await handleBookingConfirm(thread, userId);
      return;
    }
    
    if (actionId === 'cancel_booking_flow') {
      await clearUserState(userId);
      await thread.post('❌ رزرو لغو شد.');
      await showMainMenu(thread);
      return;
    }
    
    if (actionId.startsWith('cancel_appt_')) {
      await handleAppointmentCancel(thread, userId, actionId);
      return;
    }
    
    if (actionId.startsWith('confirm_cancel_')) {
      await handleCancelConfirm(thread, userId, actionId);
      return;
    }
    
    // Admin buttons
    if (actionId.startsWith('admin_confirm_')) {
      await handleAdminConfirm(thread, actionId);
      return;
    }
    
    if (actionId.startsWith('admin_reject_')) {
      await handleAdminReject(thread, actionId);
      return;
    }
    
  } catch (error) {
    console.error('Action handler error:', error);
    await thread.post(MESSAGES.error);
    await showMainMenu(thread);
  }
});

// Handle text messages (for contact info collection)
bot.onSubscribedMessage(async (thread, message) => {
  const userId = thread.channel.channelId;
  const state = await getUserState(userId);
  
  if (!state) {
    await showMainMenu(thread);
    return;
  }
  
  if (state.step === 'contact') {
    // Check if it's a contact share
    if (message.text && message.text.startsWith('+')) {
      state.phone = message.text;
      if (!state.name) {
        await thread.post(MESSAGES.requestName);
        await setUserState(userId, state);
      } else {
        await showBookingSummary(thread, userId, state);
      }
      return;
    }
    
    // Collect name or phone
    if (!state.name) {
      state.name = message.text;
      await thread.post(MESSAGES.requestPhone);
      await setUserState(userId, state);
    } else if (!state.phone) {
      const phone = message.text?.trim();
      if (!phone || !isValidPhone(phone)) {
        await thread.post(MESSAGES.invalidPhone);
        return;
      }
      state.phone = phone;
      await showBookingSummary(thread, userId, state);
    }
  }
});

// Start booking flow
async function startBookingFlow(thread: any, userId: string) {
  const services = await sql<Service[]>`
    SELECT * FROM services WHERE is_active = true ORDER BY name
  `;
  
  if (services.length === 0) {
    await thread.post('متأسفانه در حال حاضر خدمتی موجود نیست.');
    return;
  }
  
  await setUserState(userId, { step: 'service' });
  
  const actions = services.map(s => ({
    type: 'Button' as const,
    id: `service_${s.id}`,
    label: `${s.name} (${s.duration_minutes} دقیقه - ${s.price_toman.toLocaleString('fa-IR')} تومان)`,
  }));
  
  actions.push({ type: 'Button' as const, id: 'back_to_menu', label: MESSAGES.mainMenu.backToMenu });
  
  await thread.post({
    text: MESSAGES.selectService,
    actions,
  });
}

// Handle service selection
async function handleServiceSelection(thread: any, userId: string, buttonId: string) {
  const serviceId = parseInt(buttonId.replace('service_', ''));
  const service = await sql<Service[]>`SELECT * FROM services WHERE id = ${serviceId}`;
  
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
  const actions = openDays.slice(0, 10).map(date => ({
    type: 'Button' as const,
    id: `date_${date.toISOString()}`,
    label: formatFullJalaliDate(date),
  }));
  
  actions.push({ type: 'Button' as const, id: 'back_to_menu', label: MESSAGES.mainMenu.backToMenu });
  
  await thread.post({
    text: MESSAGES.selectDate,
    actions,
  });
}

// Handle date selection
async function handleDateSelection(thread: any, userId: string, buttonId: string) {
  const state = await getUserState(userId);
  if (!state || !state.duration) {
    await showMainMenu(thread);
    return;
  }
  
  const dateStr = buttonId.replace('date_', '');
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
  
  const actions = slots.map(slot => ({
    type: 'Button' as const,
    id: `time_${slot.toISOString()}`,
    label: formatTime(slot),
  }));
  
  actions.push({ type: 'Button' as const, id: 'back_to_menu', label: MESSAGES.mainMenu.backToMenu });
  
  await thread.post({
    text: MESSAGES.selectTime(formatFullJalaliDate(date)),
    actions,
  });
}

// Handle time selection
async function handleTimeSelection(thread: any, userId: string, buttonId: string) {
  const state = await getUserState(userId);
  if (!state) {
    await showMainMenu(thread);
    return;
  }
  
  const timeStr = buttonId.replace('time_', '');
  state.step = 'contact';
  state.time = timeStr;
  await setUserState(userId, state);
  
  await thread.post(MESSAGES.requestContact);
  await thread.post(MESSAGES.requestName);
}

// Show booking summary
async function showBookingSummary(thread: any, userId: string, state: BookingState) {
  if (!state.serviceName || !state.time || !state.name || !state.phone || !state.price) {
    await thread.post(MESSAGES.error);
    return;
  }
  
  const dateTime = new Date(state.time);
  const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;
  
  state.step = 'confirm';
  await setUserState(userId, state);
  
  await thread.post({
    text: MESSAGES.bookingSummary(
      state.serviceName,
      dateTimeStr,
      state.price,
      state.name,
      state.phone
    ),
    actions: [
      { type: 'Button', id: 'confirm_booking', label: MESSAGES.confirmButton },
      { type: 'Button', id: 'cancel_booking_flow', label: MESSAGES.cancelButton },
    ],
  });
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
  if (!await isSlotAvailable(appointmentTime, state.duration)) {
    await thread.post('متأسفانه این زمان دیگر در دسترس نیست. لطفاً دوباره تلاش کنید.');
    await clearUserState(userId);
    await showMainMenu(thread);
    return;
  }
  
  // Create appointment
  const result = await sql`
    INSERT INTO appointments (
      service_id, customer_telegram_id, customer_name, customer_phone,
      customer_username, appointment_time, duration_minutes, status
    ) VALUES (
      ${state.serviceId}, ${userId}, ${state.name}, ${state.phone},
      ${thread.channel.channelName || null}, ${appointmentTime.toISOString()},
      ${state.duration}, 'pending'
    )
    RETURNING id
  `;
  
  const appointmentId = result[0].id;
  
  await clearUserState(userId);
  await thread.post(MESSAGES.bookingCreated);
  await showMainMenu(thread);
  
  // Notify admins
  await notifyAdmins(appointmentId, state, userId, thread.channel.channelName);
}

// Notify admins about new booking
async function notifyAdmins(
  appointmentId: number,
  state: BookingState,
  userId: string,
  username?: string
) {
  if (ADMIN_IDS.length === 0) return;
  
  const dateTime = new Date(state.time!);
  const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;
  
  const message = MESSAGES.adminNotification(
    state.serviceName!,
    dateTimeStr,
    state.name!,
    state.phone!,
    username
  );
  
  for (const adminId of ADMIN_IDS) {
    try {
      const adminThread = bot.channel(`telegram:${adminId}`);
      await adminThread.post({
        text: message,
        actions: [
          { type: 'Button', id: `admin_confirm_${appointmentId}`, label: MESSAGES.adminConfirmButton },
          { type: 'Button', id: `admin_reject_${appointmentId}`, label: MESSAGES.adminRejectButton },
        ],
      });
    } catch (error) {
      console.error(`Failed to notify admin ${adminId}:`, error);
    }
  }
}

// Handle admin confirmation
async function handleAdminConfirm(thread: any, buttonId: string) {
  const appointmentId = parseInt(buttonId.replace('admin_confirm_', ''));
  
  await sql`
    UPDATE appointments
    SET status = 'confirmed', updated_at = NOW()
    WHERE id = ${appointmentId}
  `;
  
  const appointment = await sql<Appointment[]>`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.id = ${appointmentId}
  `;
  
  if (appointment.length > 0) {
    const appt = appointment[0];
    const customerThread = bot.channel(`telegram:${appt.customer_telegram_id}`);
    await customerThread.post(MESSAGES.bookingConfirmed);
    await thread.post('✅ نوبت تأیید شد و به مشتری اطلاع داده شد.');
  }
}

// Handle admin rejection
async function handleAdminReject(thread: any, buttonId: string) {
  const appointmentId = parseInt(buttonId.replace('admin_reject_', ''));
  
  await sql`
    UPDATE appointments
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${appointmentId}
  `;
  
  const appointment = await sql<Appointment[]>`
    SELECT * FROM appointments WHERE id = ${appointmentId}
  `;
  
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
  const appointments = await sql<(Appointment & { service_name: string })[]>`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.customer_telegram_id = ${userId}
    AND a.appointment_time > ${now.toISOString()}
    AND a.status IN ('pending', 'confirmed')
    ORDER BY a.appointment_time ASC
  `;
  
  if (appointments.length === 0) {
    await thread.post(MESSAGES.noUpcomingBookings);
    await showMainMenu(thread);
    return;
  }
  
  let message = MESSAGES.myBookings;
  for (const appt of appointments) {
    const dateTime = new Date(appt.appointment_time);
    const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;
    message += MESSAGES.bookingItem(
      appt.service_name,
      dateTimeStr,
      formatStatus(appt.status)
    );
  }
  
  await thread.post(message);
  await showMainMenu(thread);
}

// Show cancel booking interface
async function showCancelBooking(thread: any, userId: string) {
  const now = new Date();
  const appointments = await sql<(Appointment & { service_name: string })[]>`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.customer_telegram_id = ${userId}
    AND a.appointment_time > ${now.toISOString()}
    AND a.status IN ('pending', 'confirmed')
    ORDER BY a.appointment_time ASC
  `;
  
  if (appointments.length === 0) {
    await thread.post(MESSAGES.noUpcomingBookings);
    await showMainMenu(thread);
    return;
  }
  
  const actions = appointments.map(appt => {
    const dateTime = new Date(appt.appointment_time);
    const dateTimeStr = `${formatJalaliDate(dateTime)} ${formatTime(dateTime)}`;
    return {
      type: 'Button' as const,
      id: `cancel_appt_${appt.id}`,
      label: `${appt.service_name} - ${dateTimeStr}`,
    };
  });
  
  actions.push({ type: 'Button' as const, id: 'back_to_menu', label: MESSAGES.mainMenu.backToMenu });
  
  await thread.post({
    text: MESSAGES.selectBookingToCancel,
    actions,
  });
}

// Handle appointment cancel selection
async function handleAppointmentCancel(thread: any, userId: string, buttonId: string) {
  const appointmentId = parseInt(buttonId.replace('cancel_appt_', ''));
  
  const appointment = await sql<(Appointment & { service_name: string })[]>`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.id = ${appointmentId}
    AND a.customer_telegram_id = ${userId}
  `;
  
  if (appointment.length === 0) {
    await thread.post(MESSAGES.error);
    return;
  }
  
  const appt = appointment[0];
  const dateTime = new Date(appt.appointment_time);
  const dateTimeStr = `${formatFullJalaliDate(dateTime)} - ${formatTime(dateTime)}`;
  
  await thread.post({
    text: MESSAGES.confirmCancel(appt.service_name, dateTimeStr),
    actions: [
      { type: 'Button', id: `confirm_cancel_${appointmentId}`, label: MESSAGES.confirmButton },
      { type: 'Button', id: 'back_to_menu', label: MESSAGES.cancelButton },
    ],
  });
}

// Handle cancel confirmation
async function handleCancelConfirm(thread: any, userId: string, buttonId: string) {
  const appointmentId = parseInt(buttonId.replace('confirm_cancel_', ''));
  
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

// Show services list
async function showServices(thread: any) {
  const services = await sql<Service[]>`
    SELECT * FROM services WHERE is_active = true ORDER BY name
  `;
  
  let message = MESSAGES.servicesList;
  for (const service of services) {
    message += MESSAGES.serviceItem(service.name, service.duration_minutes, service.price_toman);
  }
  
  await thread.post(message);
  await showMainMenu(thread);
}

// Handle /today command (admin)
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
    const service = await sql<Service[]>`SELECT name FROM services WHERE id = ${appt.service_id}`;
    const dateTime = new Date(appt.appointment_time);
    message += `• ${formatTime(dateTime)} - ${service[0]?.name || 'نامشخص'}\n`;
    message += `  ${appt.customer_name} (${appt.customer_phone})\n`;
    message += `  وضعیت: ${formatStatus(appt.status)}\n\n`;
  }
  
  await thread.post(message);
}

// Handle /week command (admin)
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
    const service = await sql<Service[]>`SELECT name FROM services WHERE id = ${appt.service_id}`;
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
