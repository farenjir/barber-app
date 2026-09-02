import { sql } from '../db/client';
import type { WorkingHours, BlockedSlot, Appointment } from '../db/client';

const TEHRAN_TZ = 'Asia/Tehran';

/**
 * Get working hours for a specific barber and weekday
 */
export async function getWorkingHours(barberId: number, weekday: number): Promise<WorkingHours | null> {
  const rows = await sql`
    SELECT * FROM working_hours 
    WHERE barber_id = ${barberId} AND weekday = ${weekday}
  ` as unknown as WorkingHours[];
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Check if a time slot is available for booking for a specific barber
 */
export async function isSlotAvailable(
  barberId: number,
  startTime: Date,
  durationMinutes: number
): Promise<boolean> {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
  
  // Check working hours
  const weekday = startTime.getDay();
  const hours = await getWorkingHours(barberId, weekday);
  
  if (!hours || !hours.is_open) {
    return false;
  }
  
  // Convert to Tehran time for comparison
  const timeStr = startTime.toLocaleTimeString('en-US', {
    timeZone: TEHRAN_TZ,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const endTimeStr = endTime.toLocaleTimeString('en-US', {
    timeZone: TEHRAN_TZ,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  
  if (timeStr < hours.start_time || endTimeStr > hours.end_time) {
    return false;
  }
  
  // Check blocked slots for this barber
  const blockedSlots = await sql`
    SELECT * FROM blocked_slots
    WHERE barber_id = ${barberId}
    AND (start_time, end_time) OVERLAPS (${startTime.toISOString()}, ${endTime.toISOString()})
  ` as unknown as BlockedSlot[];
  
  if (blockedSlots.length > 0) {
    return false;
  }
  
  // Check existing appointments for this barber
  const existingAppointments = await sql`
    SELECT * FROM appointments
    WHERE barber_id = ${barberId}
    AND status IN ('pending', 'confirmed')
    AND (
      appointment_time < ${endTime.toISOString()}
      AND (appointment_time + (duration_minutes || ' minutes')::interval) > ${startTime.toISOString()}
    )
  ` as unknown as Appointment[];
  
  return existingAppointments.length === 0;
}

/**
 * Generate available time slots for a specific barber, date, and service duration
 */
export async function getAvailableSlots(
  barberId: number,
  date: Date,
  durationMinutes: number
): Promise<Date[]> {
  const slots: Date[] = [];
  const weekday = date.getDay();
  const hours = await getWorkingHours(barberId, weekday);
  
  if (!hours || !hours.is_open) {
    return slots;
  }
  
  // Parse working hours
  const [startHour, startMinute] = hours.start_time.split(':').map(Number);
  const [endHour, endMinute] = hours.end_time.split(':').map(Number);
  
  // Create start and end times for the day in Tehran timezone
  const dayStart = new Date(date);
  dayStart.setHours(startHour, startMinute, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, endMinute, 0, 0);
  
  // Generate slots with service duration intervals
  let currentSlot = new Date(dayStart);
  
  while (currentSlot.getTime() + durationMinutes * 60000 <= dayEnd.getTime()) {
    if (await isSlotAvailable(barberId, currentSlot, durationMinutes)) {
      slots.push(new Date(currentSlot));
    }
    // Move to next slot (same as duration for zero buffer)
    currentSlot = new Date(currentSlot.getTime() + durationMinutes * 60000);
  }
  
  return slots;
}

/**
 * Get the next N open days starting from today for a specific barber
 */
export async function getNextOpenDays(barberId: number, count: number = 14): Promise<Date[]> {
  const days: Date[] = [];
  const now = new Date();
  const today = new Date(now.toLocaleString('en-US', { timeZone: TEHRAN_TZ }));
  today.setHours(0, 0, 0, 0);
  
  let currentDate = new Date(today);
  let daysChecked = 0;
  const maxDaysToCheck = count * 3; // Check up to 3x to handle closed days
  
  while (days.length < count && daysChecked < maxDaysToCheck) {
    const weekday = currentDate.getDay();
    const hours = await getWorkingHours(barberId, weekday);
    
    if (hours && hours.is_open) {
      days.push(new Date(currentDate));
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
    daysChecked++;
  }
  
  return days;
}

/**
 * Block a time range for a specific barber
 */
export async function blockTimeRange(
  barberId: number,
  startTime: Date,
  endTime: Date,
  reason?: string
): Promise<void> {
  await sql`
    INSERT INTO blocked_slots (barber_id, start_time, end_time, reason)
    VALUES (${barberId}, ${startTime.toISOString()}, ${endTime.toISOString()}, ${reason || null})
  `;
}

/**
 * Get appointments for a specific barber and date range
 */
export async function getAppointments(
  barberId: number,
  startDate: Date,
  endDate: Date,
  status?: string[]
): Promise<Appointment[]> {
  if (status && status.length > 0) {
    const statusArray = `{${status.join(',')}}`;
    return await sql`
      SELECT * FROM appointments
      WHERE barber_id = ${barberId}
      AND appointment_time >= ${startDate.toISOString()}
      AND appointment_time < ${endDate.toISOString()}
      AND status = ANY(${statusArray}::text[])
      ORDER BY appointment_time ASC
    ` as unknown as Appointment[];
  }
  
  return await sql`
    SELECT * FROM appointments
    WHERE barber_id = ${barberId}
    AND appointment_time >= ${startDate.toISOString()}
    AND appointment_time < ${endDate.toISOString()}
    ORDER BY appointment_time ASC
  ` as unknown as Appointment[];
}
