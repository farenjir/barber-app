/**
 * Get the start of day in Asia/Tehran timezone
 * Returns a UTC Date object representing midnight in Tehran
 */
export function getTehranDayStart(date: Date = new Date()): Date {
  // Get ISO string for the date in Tehran timezone
  const tehranStr = date.toLocaleString('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  });
  
  // Parse the Tehran date and create a date at midnight Tehran time
  const [yearMonthDay] = tehranStr.split(',');
  const tehranMidnight = new Date(`${yearMonthDay}T00:00:00+03:30`);
  
  return tehranMidnight;
}

/**
 * Get the end of day in Asia/Tehran timezone
 * Returns a UTC Date object representing 23:59:59.999 in Tehran
 */
export function getTehranDayEnd(date: Date = new Date()): Date {
  const start = getTehranDayStart(date);
  // Add 24 hours minus 1 millisecond
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Get the next day start in Tehran
 */
export function getTehranNextDayStart(date: Date = new Date()): Date {
  const start = getTehranDayStart(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Add days to a date in Tehran timezone
 */
export function addTehranDays(date: Date, days: number): Date {
  const start = getTehranDayStart(date);
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}
