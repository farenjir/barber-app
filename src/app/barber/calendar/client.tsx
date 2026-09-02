'use client';

import { useState } from 'react';
import { WeekView, ScheduleEventData } from '@mantine/schedule';
import { Paper, Badge, Stack, Group, Modal, Text, Divider } from '@mantine/core';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { toJalaali } from 'jalaali-js';

dayjs.extend(utc);
dayjs.extend(timezone);

interface Appointment {
  id: number;
  appointment_time: string | Date;
  duration_minutes: number;
  customer_name: string;
  status: string;
  service_name: string;
}

interface CalendarClientProps {
  appointments: Appointment[];
  startTime: string | Date;
  endTime: string | Date;
}

// Persian weekday names
const PERSIAN_WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

// Persian month names
const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

// Persian numerals mapping
const toPersianNumber = (num: number): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(digit => persianDigits[parseInt(digit)]).join('');
};

export default function CalendarClient({ appointments, startTime, endTime }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState<Date | string>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalOpened, setModalOpened] = useState(false);

  // Normalize TIME fields from postgres (could be Date objects) to HH:mm:ss strings
  const normalizedStartTime = typeof startTime === 'string' ? startTime : 
    dayjs(startTime).format('HH:mm:ss');
  const normalizedEndTime = typeof endTime === 'string' ? endTime : 
    dayjs(endTime).format('HH:mm:ss');

  // Convert appointments to schedule events
  const events: ScheduleEventData[] = appointments.map((appt) => {
    const appointmentTime = dayjs(appt.appointment_time).tz('Asia/Tehran');
    const eventEndTime = appointmentTime.add(appt.duration_minutes, 'minute');
    
    return {
      id: appt.id.toString(),
      title: `${appt.customer_name} — ${appt.service_name}`,
      start: appointmentTime.format('YYYY-MM-DD HH:mm:ss'),
      end: eventEndTime.format('YYYY-MM-DD HH:mm:ss'),
      color: appt.status === 'confirmed' ? 'green' : 'orange',
    };
  });

  // Format weekday with Jalali day number (e.g., "شنبه ۱۱")
  const weekdayFormat = (dateStr: string): string => {
    const tehranDate = dayjs(dateStr).tz('Asia/Tehran');
    const year = tehranDate.year();
    const month = tehranDate.month() + 1;
    const day = tehranDate.date();
    const jDate = toJalaali(year, month, day);
    const weekdayIndex = tehranDate.day();
    const weekdayName = PERSIAN_WEEKDAYS[weekdayIndex];
    const jalaliDay = toPersianNumber(jDate.jd);
    return `${weekdayName} ${jalaliDay}`;
  };

  // Format week label with Jalali range (e.g., "۱۱–۱۷ شهریور ۱۴۰۵")
  const weekLabelFormat = (dateStr: string): string => {
    // dateStr is the week start date
    const weekStart = dayjs(dateStr);
    const weekEnd = weekStart.add(6, 'day');
    
    const startGregorian = weekStart.toDate();
    const endGregorian = weekEnd.toDate();
    
    const jStart = toJalaali(startGregorian.getFullYear(), startGregorian.getMonth() + 1, startGregorian.getDate());
    const jEnd = toJalaali(endGregorian.getFullYear(), endGregorian.getMonth() + 1, endGregorian.getDate());
    
    // If same month and year
    if (jStart.jm === jEnd.jm && jStart.jy === jEnd.jy) {
      return `${toPersianNumber(jStart.jd)}–${toPersianNumber(jEnd.jd)} ${PERSIAN_MONTHS[jStart.jm - 1]} ${toPersianNumber(jStart.jy)}`;
    }
    // If different months but same year
    if (jStart.jy === jEnd.jy) {
      return `${toPersianNumber(jStart.jd)} ${PERSIAN_MONTHS[jStart.jm - 1]} – ${toPersianNumber(jEnd.jd)} ${PERSIAN_MONTHS[jEnd.jm - 1]} ${toPersianNumber(jStart.jy)}`;
    }
    // Different years
    return `${toPersianNumber(jStart.jd)} ${PERSIAN_MONTHS[jStart.jm - 1]} ${toPersianNumber(jStart.jy)} – ${toPersianNumber(jEnd.jd)} ${PERSIAN_MONTHS[jEnd.jm - 1]} ${toPersianNumber(jEnd.jy)}`;
  };

  // Return current time in Asia/Tehran timezone
  const getCurrentTime = () => {
    return dayjs().tz('Asia/Tehran').format('YYYY-MM-DD HH:mm:ss');
  };

  // Handle event click
  const handleEventClick = (event: ScheduleEventData) => {
    const appointment = appointments.find(appt => appt.id.toString() === event.id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setModalOpened(true);
    }
  };

  // Format appointment time in Persian
  const formatAppointmentTime = (appt: Appointment) => {
    const tehranTime = dayjs(appt.appointment_time).tz('Asia/Tehran');
    const date = tehranTime.format('YYYY/MM/DD');
    const time = tehranTime.format('HH:mm');
    const jDate = toJalaali(tehranTime.year(), tehranTime.month() + 1, tehranTime.date());
    const jalaliDate = `${toPersianNumber(jDate.jy)}/${toPersianNumber(jDate.jm)}/${toPersianNumber(jDate.jd)}`;
    const weekdayName = PERSIAN_WEEKDAYS[tehranTime.day()];
    return { jalaliDate, weekdayName, time };
  };

  // Get status label in Persian
  const getStatusLabel = (status: string) => {
    return status === 'confirmed' ? 'تأیید شده' : 'در انتظار';
  };

  const getStatusColor = (status: string) => {
    return status === 'confirmed' ? 'green' : 'orange';
  };

  return (
    <Stack>
      <Paper withBorder>
        <WeekView
          events={events}
          date={currentDate}
          onDateChange={setCurrentDate}
          onEventClick={handleEventClick}
          startTime={normalizedStartTime}
          endTime={normalizedEndTime}
          firstDayOfWeek={6}
          weekendDays={[5]}
          highlightToday
          withCurrentTimeIndicator
          getCurrentTime={getCurrentTime}
          withWeekNumber={false}
          withAllDaySlots={false}
          weekdayFormat={weekdayFormat}
          weekLabelFormat={weekLabelFormat}
        />
      </Paper>

      <Paper p="md" withBorder>
        <Group gap="md">
          <Badge color="green" size="lg">تأیید شده</Badge>
          <Badge color="orange" size="lg">در انتظار</Badge>
        </Group>
      </Paper>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="جزئیات نوبت"
        size="md"
        centered
      >
        {selectedAppointment && (
          <Stack gap="md">
            <div>
              <Text size="sm" c="dimmed">مشتری</Text>
              <Text size="lg" fw={600}>{selectedAppointment.customer_name}</Text>
            </div>
            
            <Divider />
            
            <div>
              <Text size="sm" c="dimmed">خدمت</Text>
              <Text size="lg">{selectedAppointment.service_name}</Text>
            </div>
            
            <div>
              <Text size="sm" c="dimmed">مدت زمان</Text>
              <Text size="lg">{selectedAppointment.duration_minutes} دقیقه</Text>
            </div>
            
            <Divider />
            
            <div>
              <Text size="sm" c="dimmed">تاریخ و زمان</Text>
              {(() => {
                const { jalaliDate, weekdayName, time } = formatAppointmentTime(selectedAppointment);
                return (
                  <>
                    <Text size="lg">{weekdayName} {jalaliDate}</Text>
                    <Text size="lg" fw={600}>{time}</Text>
                  </>
                );
              })()}
            </div>
            
            <Divider />
            
            <div>
              <Text size="sm" c="dimmed">وضعیت</Text>
              <Badge color={getStatusColor(selectedAppointment.status)} size="lg" mt={4}>
                {getStatusLabel(selectedAppointment.status)}
              </Badge>
            </div>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
