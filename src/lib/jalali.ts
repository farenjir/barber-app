import * as jalaali from 'jalaali-js';

/**
 * Convert Gregorian date to Jalali (Persian) calendar string
 */
export function toJalali(date: Date): { year: number; month: number; day: number } {
  const jalali = jalaali.toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return { year: jalali.jy, month: jalali.jm, day: jalali.jd };
}

/**
 * Convert Jalali to Gregorian date
 */
export function fromJalali(year: number, month: number, day: number): Date {
  const greg = jalaali.toGregorian(year, month, day);
  return new Date(greg.gy, greg.gm - 1, greg.gd);
}

/**
 * Format date as Persian date string (e.g., "1403/06/09")
 */
export function formatJalaliDate(date: Date): string {
  const { year, month, day } = toJalali(date);
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/**
 * Format time in 24h format (e.g., "14:30")
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get Persian weekday name
 */
export function getPersianWeekday(date: Date): string {
  const weekdays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
  return weekdays[date.getDay()];
}

/**
 * Get Persian month name
 */
export function getPersianMonth(month: number): string {
  const months = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  return months[month - 1] || '';
}

/**
 * Format complete Persian date with weekday (e.g., "شنبه 9 شهریور 1403")
 */
export function formatFullJalaliDate(date: Date): string {
  const { year, month, day } = toJalali(date);
  const weekday = getPersianWeekday(date);
  const monthName = getPersianMonth(month);
  return `${weekday} ${day} ${monthName} ${year}`;
}
