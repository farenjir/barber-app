'use client';

import { useState } from 'react';
import { WeekView, ScheduleEventData } from '@mantine/schedule';
import { Paper, Badge, Text, Stack, Group, Button } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconCalendarEvent } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fa';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { toJalaali } from 'jalaali-js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('fa');

interface Appointment {
  id: number;
  appointment_time: string;
  duration_minutes: number;
  customer_name: string;
  status: string;
  service_name: string;
}

interface CalendarClientProps {
  appointments: Appointment[];
  startTime: string;
  endTime: string;
}

export default function CalendarClient({ appointments, startTime, endTime }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Convert appointments to schedule events
  const events: ScheduleEventData[] = appointments.map((appt) => {
    const start = new Date(appt.appointment_time);
    const end = new Date(start.getTime() + appt.duration_minutes * 60000);
    
    return {
      id: appt.id.toString(),
      title: `${appt.customer_name} - ${appt.service_name}`,
      start: start.toISOString(),
      end: end.toISOString(),
      color: appt.status === 'confirmed' ? 'green' : 'orange',
    };
  });

  const handlePrevWeek = () => {
    setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
  };

  const handleNextWeek = () => {
    setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Format current week in Jalali
  const weekStart = dayjs(currentDate).startOf('week');
  const jDate = toJalaali(weekStart.year(), weekStart.month() + 1, weekStart.date());
  const jalaliWeek = `هفته ${jDate.jd} ${getJalaliMonthName(jDate.jm)} ${jDate.jy}`;

  return (
    <Stack>
      <Paper p="md" withBorder>
        <Group justify="space-between">
          <Group>
            <Button variant="subtle" onClick={handlePrevWeek} leftSection={<IconChevronRight size={16} />}>
              هفته قبل
            </Button>
            <Button variant="filled" onClick={handleToday}>
              امروز
            </Button>
            <Button variant="subtle" onClick={handleNextWeek} leftSection={<IconChevronLeft size={16} />}>
              هفته بعد
            </Button>
          </Group>
          <Text fw={600}>{jalaliWeek}</Text>
        </Group>
      </Paper>

      <Paper withBorder>
        <WeekView
          events={events}
          date={currentDate}
          startTime={startTime}
          endTime={endTime}
          firstDayOfWeek={6}
          highlightToday
          withCurrentTimeIndicator
        />
      </Paper>

      <Paper p="md" withBorder>
        <Group gap="md">
          <Badge color="green" size="lg">تأیید شده</Badge>
          <Badge color="orange" size="lg">در انتظار</Badge>
        </Group>
      </Paper>
    </Stack>
  );
}

function getJalaliMonthName(month: number): string {
  const months = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  return months[month - 1];
}
