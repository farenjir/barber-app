'use client';

import { Paper, SimpleGrid, Text, Badge, Stack, Group } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { IconUsers, IconCalendar, IconScissors, IconClock, IconSettings } from '@tabler/icons-react';
import Link from 'next/link';

interface AdminStats {
  barbersCount: number;
  customersCount: number;
  todayAppointmentsCount: number;
  recentAppointments: any[];
  weeklyData: { day: string; count: number }[];
}

export default function AdminDashboardClient({ stats }: { stats: AdminStats }) {
  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
        <Paper p="md" withBorder>
          <Group>
            <IconScissors size={32} />
            <div>
              <Text size="xs" c="dimmed">آرایشگران فعال</Text>
              <Text size="xl" fw={700}>{stats.barbersCount}</Text>
            </div>
          </Group>
        </Paper>

        <Paper p="md" withBorder>
          <Group>
            <IconUsers size={32} />
            <div>
              <Text size="xs" c="dimmed">مشتریان</Text>
              <Text size="xl" fw={700}>{stats.customersCount}</Text>
            </div>
          </Group>
        </Paper>

        <Paper p="md" withBorder>
          <Group>
            <IconCalendar size={32} />
            <div>
              <Text size="xs" c="dimmed">نوبت‌های امروز</Text>
              <Text size="xl" fw={700}>{stats.todayAppointmentsCount}</Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">نوبت‌های هفته اخیر</Text>
        {stats.weeklyData.every(d => d.count === 0) ? (
          <Text c="dimmed" ta="center" py="xl">داده‌ای برای نمایش وجود ندارد</Text>
        ) : (
          <BarChart
            h={300}
            data={stats.weeklyData}
            dataKey="day"
            series={[{ name: 'count', label: 'تعداد نوبت', color: 'orange' }]}
            tickLine="y"
          />
        )}
      </Paper>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Link href="/admin/barbers">
          <Paper p="lg" withBorder style={{ textAlign: 'center', cursor: 'pointer' }}>
            <Stack align="center" gap="xs">
              <IconScissors size={32} />
              <Text size="sm" fw={600}>آرایشگران</Text>
            </Stack>
          </Paper>
        </Link>
        <Link href="/admin/appointments">
          <Paper p="lg" withBorder style={{ textAlign: 'center', cursor: 'pointer' }}>
            <Stack align="center" gap="xs">
              <IconCalendar size={32} />
              <Text size="sm" fw={600}>نوبت‌ها</Text>
            </Stack>
          </Paper>
        </Link>
        <Link href="/admin/customers">
          <Paper p="lg" withBorder style={{ textAlign: 'center', cursor: 'pointer' }}>
            <Stack align="center" gap="xs">
              <IconUsers size={32} />
              <Text size="sm" fw={600}>مشتریان</Text>
            </Stack>
          </Paper>
        </Link>
        <Link href="/admin/settings">
          <Paper p="lg" withBorder style={{ textAlign: 'center', cursor: 'pointer' }}>
            <Stack align="center" gap="xs">
              <IconSettings size={32} />
              <Text size="sm" fw={600}>تنظیمات</Text>
            </Stack>
          </Paper>
        </Link>
      </SimpleGrid>

      <Paper p="md" withBorder>
        <Text size="lg" fw={600} mb="md">آخرین نوبت‌ها</Text>
        {stats.recentAppointments.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">نوبتی یافت نشد</Text>
        ) : (
          <Stack gap="md">
            {stats.recentAppointments.map((appt: any) => {
              const date = new Date(appt.appointment_time).toLocaleDateString('fa-IR', {
                timeZone: 'Asia/Tehran',
              });
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
                      <Text size="sm" c="dimmed">{appt.barber_name}</Text>
                    </div>
                    <Stack gap="xs" align="flex-start">
                      <Badge color={appt.status === 'confirmed' ? 'green' : appt.status === 'pending' ? 'orange' : 'red'}>
                        {appt.status === 'confirmed' ? 'تأیید شده' : appt.status === 'pending' ? 'در انتظار' : 'لغو شده'}
                      </Badge>
                      <Text size="sm" mt="xs">{date} {time}</Text>
                      <Text size="xs" c="dimmed">{appt.service_name}</Text>
                    </Stack>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
