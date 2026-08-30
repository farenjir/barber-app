import { describe, it, expect } from 'vitest';
import { toJalali, fromJalali, formatJalaliDate, getPersianWeekday } from '../jalali';

describe('Jalali calendar utilities', () => {
  it('should convert Gregorian to Jalali correctly', () => {
    // August 30, 2026 = 1405/06/08
    const date = new Date('2026-08-30');
    const jalali = toJalali(date);
    
    expect(jalali.year).toBe(1405);
    expect(jalali.month).toBe(6);
    expect(jalali.day).toBe(8);
  });

  it('should convert Jalali to Gregorian correctly', () => {
    // 1405/06/08 = August 30, 2026
    const date = fromJalali(1405, 6, 8);
    
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7); // 0-indexed (August = 7)
    expect(date.getDate()).toBe(30);
  });

  it('should format Jalali date correctly', () => {
    const date = new Date('2026-08-30');
    const formatted = formatJalaliDate(date);
    
    expect(formatted).toBe('1405/06/08');
  });

  it('should return correct Persian weekday names', () => {
    const sunday = new Date('2024-01-07'); // Sunday
    const saturday = new Date('2024-01-06'); // Saturday
    
    expect(getPersianWeekday(sunday)).toBe('یکشنبه');
    expect(getPersianWeekday(saturday)).toBe('شنبه');
  });

  it('should handle round-trip conversion', () => {
    const originalDate = new Date('2026-08-30');
    const jalali = toJalali(originalDate);
    const convertedBack = fromJalali(jalali.year, jalali.month, jalali.day);
    
    expect(convertedBack.getFullYear()).toBe(originalDate.getFullYear());
    expect(convertedBack.getMonth()).toBe(originalDate.getMonth());
    expect(convertedBack.getDate()).toBe(originalDate.getDate());
  });
});
