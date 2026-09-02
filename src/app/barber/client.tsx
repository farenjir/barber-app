'use client';

import { Paper, SimpleGrid, Text, Badge, Stack, Group } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { IconCalendar, IconScissors, IconClock } from '@tabler/icons-react';
import Link from 'next/link';

interface BarberDashboardData {
  barber: any;
  todayAppointments: any[];
  servicesCount: number;
  upcomingCount: number;
  weeklyData: { day: string; count: number }[];
}

export default function BarberDashboardClient({ data }: { data: BarberDashboardData }) {
  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
        <Paper p="md" withBorder>
          <Group>
            <IconCalendar size={32} />
            <div>
              <Text size="xs" c="dimmed">نوبت‌های امروز</Text>
              <Text size="xl" fw={700}>{data.todayAppointments.length}</Text>
            </div>
          </Group>
        </Paper>

        <Paper p="md" withBorder>
          <Group>
            <IconClock size={32} />
            <div>
              <Text size="xs" c="dimmed">نوبت‌های هفته آینده</Text>
              <Text size="xl" fw={700}>{data.upcomingCount}</Text>
            </div>
          </Group>
        </Paper>

        <Paper p="md" withBorder>
          <Group>
            <IconScissors size={32} />
            <div>
              <Text size="xs" c="dimmed">خدمات فعال</Text>
              <Text size="xl" fw={700}>{data.servicesCount}</Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">نوبت‌های هفته اخیر</Text>
        {data.weeklyData.every(d => d.count === 0) ? (
          <Text c="dimmed" ta="center" py="xl">داده‌ای برای نمایش وجود ندارد</Text>
        ) : (
          <BarChart
            h={300}
            data={data.weeklyData}
            dataKey="day"
            series={[{ name: 'count', label: 'تعداد نوبت', color: 'orange' }]}
            tickLine="y"
          />
        )}
      </Paper>

      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">نوبت‌های امروز</Text>
        {data.todayAppointments.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">امروز نوبتی وجود ندارد</Text>
        ) : (
          <Stack gap="md">
            {data.todayAppointments.map((appt: any) => {
              const time = new Date(appt.appointment_time).toLocaleTimeString('fa-IR', {
                timeZone: 'Asia/Tehran',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Paper key={appt.id} p="md" withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text fw={600}>{appt.customer_name}</Text>
                      <Text size="sm" c="dimmed">{appt.customer_phone}</Text>
                    </div>
                    <div className="text-left">
                      <Badge color={appt.status === 'confirmed' ? 'green' : 'orange'}>
                        {appt.status === 'confirmed' ? 'تأیید شده' : 'در انتظار'}
                      </Badge>
                      <Text size="sm" mt="xs">{time} - {appt.service_name}</Text>
                    </div>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="md">
        <Link href="/barber/calendar">
          <Paper p="lg" withBorder className="hover:bg-gray-800 transition-colors text-center">
            <IconCalendar size={32} className="mx-auto mb-2" />
            <Text size="sm" fw={600}>تقویم</Text>
          </Paper>
        </Link>
        <Link href="/barber/services">
          <Paper p="lg" withBorder className="hover:bg-gray-800 transition-colors text-center">
            <IconScissors size={32} className="mx-auto mb-2" />
            <Text size="sm" fw={600}>خدمات</Text>
          </Paper>
        </Link>
        <Link href="/barber/hours">
          <Paper p="lg" withBorder className="hover:bg-gray-800 transition-colors text-center">
            <IconClock size={32} className="mx-auto mb-2" />
            <Text size="sm" fw={600}>ساعات کاری</Text>
          </Paper>
        </Link>
        <Link href="/barber/book">
          <Paper p="lg" withBorder className="hover:bg-gray-800 transition-colors text-center">
            <IconCalendar size={32} className="mx-auto mb-2" />
            <Text size="sm" fw={600}>نوبت دستی</Text>
          </Paper>
        </Link>
        <Link href="/barber/customers">
          <Paper p="lg" withBorder className="hover:bg-gray-800 transition-colors text-center">
            <IconCalendar size={32} className="mx-auto mb-2" />
            <Text size="sm" fw={600}>مشتریان</Text>
          </Paper>
        </Link>
      </SimpleGrid>
    </Stack>
  );
}
