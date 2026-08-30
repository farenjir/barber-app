/**
 * Persian UI messages for the bot
 */

export const MESSAGES = {
  welcome: (salonName: string) => 
    `سلام! به ${salonName} خوش آمدید 💈\n\nبرای رزرو نوبت از منوی زیر استفاده کنید:`,
  
  mainMenu: {
    newBooking: '📅 رزرو نوبت جدید',
    myBookings: '📋 نوبت‌های من',
    cancelBooking: '❌ لغو نوبت',
    services: '💇 خدمات و قیمت‌ها',
    help: '❓ راهنما',
    backToMenu: '🏠 بازگشت به منو اصلی',
  },
  
  selectService: 'لطفاً خدمت مورد نظر خود را انتخاب کنید:',
  
  selectDate: 'لطفاً تاریخ مورد نظر خود را انتخاب کنید:',
  
  selectTime: (date: string) => 
    `زمان دلخواه خود را برای ${date} انتخاب کنید:`,
  
  noSlotsAvailable: 'متأسفانه در این تاریخ زمان خالی موجود نیست. لطفاً تاریخ دیگری انتخاب کنید.',
  
  requestContact: 
    'برای تکمیل رزرو، لطفاً نام و شماره تماس خود را وارد کنید.\n\n' +
    'می‌توانید از دکمه زیر برای اشتراک‌گذاری شماره تماس استفاده کنید:',
  
  shareContact: '📱 اشتراک‌گذاری شماره تماس',
  
  requestName: 'لطفاً نام خود را وارد کنید:',
  
  requestPhone: 'لطفاً شماره تماس خود را وارد کنید (مثال: 09123456789):',
  
  invalidPhone: 'شماره تماس نامعتبر است. لطفاً یک شماره موبایل معتبر وارد کنید (مثال: 09123456789):',
  
  bookingSummary: (service: string, dateTime: string, price: number, name: string, phone: string) =>
    `📋 *خلاصه رزرو*\n\n` +
    `خدمت: ${service}\n` +
    `زمان: ${dateTime}\n` +
    `قیمت: ${price.toLocaleString('fa-IR')} تومان\n` +
    `نام: ${name}\n` +
    `تلفن: ${phone}\n\n` +
    `آیا اطلاعات صحیح است؟`,
  
  confirmButton: '✅ تأیید',
  cancelButton: '❌ لغو',
  
  bookingCreated: 
    '✅ درخواست شما با موفقیت ثبت شد!\n\n' +
    'درخواست شما به زودی بررسی و نتیجه از طریق پیام اطلاع داده خواهد شد.',
  
  bookingConfirmed: 
    '✅ نوبت شما تأیید شد!\n\n' +
    'منتظر دیدار شما هستیم. در صورت نیاز به تغییر یا لغو نوبت، از منو استفاده کنید.',
  
  bookingRejected: 
    '❌ متأسفانه امکان رزرو در زمان درخواستی وجود ندارد.\n\n' +
    'لطفاً زمان دیگری انتخاب کنید.',
  
  bookingCancelled: '✅ نوبت شما با موفقیت لغو شد.',
  
  noUpcomingBookings: 'شما نوبت آینده‌ای ندارید.',
  
  myBookings: '📋 *نوبت‌های شما:*\n\n',
  
  bookingItem: (service: string, dateTime: string, status: string) =>
    `• ${service}\n  ${dateTime}\n  وضعیت: ${status}\n\n`,
  
  selectBookingToCancel: 'نوبتی که می‌خواهید لغو کنید را انتخاب کنید:',
  
  confirmCancel: (service: string, dateTime: string) =>
    `آیا مطمئن هستید که می‌خواهید این نوبت را لغو کنید؟\n\n` +
    `${service}\n${dateTime}`,
  
  servicesList: '💇 *خدمات و قیمت‌ها:*\n\n',
  
  serviceItem: (name: string, duration: number, price: number) =>
    `• ${name}\n  مدت: ${duration} دقیقه | قیمت: ${price.toLocaleString('fa-IR')} تومان\n\n`,
  
  help: 
    '*راهنمای استفاده:*\n\n' +
    '📅 *رزرو نوبت جدید:* برای رزرو نوبت جدید از این گزینه استفاده کنید.\n\n' +
    '📋 *نوبت‌های من:* مشاهده لیست نوبت‌های آینده خود.\n\n' +
    '❌ *لغو نوبت:* برای لغو یک نوبت از این گزینه استفاده کنید.\n\n' +
    '💇 *خدمات و قیمت‌ها:* مشاهده لیست خدمات و قیمت‌ها.\n\n' +
    'در صورت نیاز به راهنمایی بیشتر، می‌توانید با آرایشگاه تماس بگیرید.',
  
  reminder24h: (service: string, dateTime: string) =>
    `⏰ یادآوری نوبت\n\n` +
    `نوبت شما فردا است:\n` +
    `${service}\n${dateTime}`,
  
  reminder2h: (service: string, dateTime: string) =>
    `⏰ یادآوری نوبت\n\n` +
    `نوبت شما 2 ساعت دیگر است:\n` +
    `${service}\n${dateTime}`,
  
  adminNotification: (service: string, dateTime: string, name: string, phone: string, username?: string) =>
    `🔔 *درخواست رزرو جدید*\n\n` +
    `خدمت: ${service}\n` +
    `زمان: ${dateTime}\n` +
    `نام: ${name}\n` +
    `تلفن: ${phone}\n` +
    (username ? `کاربر: @${username}\n` : ''),
  
  adminConfirmButton: '✅ تأیید',
  adminRejectButton: '❌ رد',
  
  adminHelp:
    '*دستورات مدیریت:*\n\n' +
    '/today - نوبت‌های امروز\n' +
    '/week - نوبت‌های هفته آینده\n' +
    '/block - مسدود کردن زمان\n' +
    '/services - مدیریت خدمات\n' +
    '/hours - تنظیم ساعات کاری\n' +
    '/help - راهنما',
  
  statusPending: 'در انتظار تأیید',
  statusConfirmed: 'تأیید شده',
  statusCancelled: 'لغو شده',
  
  unknownCommand: 'دستور نامعتبر است. از منو استفاده کنید یا /help را ارسال کنید.',
  
  error: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.',
};

export function formatPrice(price: number): string {
  return price.toLocaleString('fa-IR');
}

export function formatStatus(status: string): string {
  switch (status) {
    case 'pending':
      return MESSAGES.statusPending;
    case 'confirmed':
      return MESSAGES.statusConfirmed;
    case 'cancelled':
      return MESSAGES.statusCancelled;
    default:
      return status;
  }
}
