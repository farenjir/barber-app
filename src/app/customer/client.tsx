'use client';

import { Container, Paper, Title, Text, Stack, Badge, Group, Button } from '@mantine/core';
import { IconCalendar, IconLogout } from '@tabler/icons-react';
import Link from 'next/link';

interface CustomerAppointmentsClientProps {
  user: any;
  appointments: any[];
}

export default function CustomerAppointmentsClient({ user, appointments }: CustomerAppointmentsClientProps) {
  const formatJalaliDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fa-IR', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge color="green">تأیید شده</Badge>;
      case 'pending':
        return <Badge color="orange">در انتظار تأیید</Badge>;
      case 'cancelled':
        return <Badge color="red">لغو شده</Badge>;
      default:
        return <Badge color="gray">{status}</Badge>;
    }
  };

  const now = new Date();
  const upcomingAppointments = appointments.filter(
    (appt) => new Date(appt.appointment_time) > now && appt.status !== 'cancelled'
  );
  const pastAppointments = appointments.filter(
    (appt) => new Date(appt.appointment_time) <= now || appt.status === 'cancelled'
  );

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Paper p="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">خوش آمدید</Text>
              <Title order={3}>{user.name}</Title>
            </div>
            <Button
              component="a"
              href="/api/logout"
              variant="subtle"
              color="red"
              leftSection={<IconLogout size={16} />}
            >
              خروج
            </Button>
          </Group>
        </Paper>

        <Paper p="md" withBorder>
          <Title order={4} mb="md">
            <Group gap="xs">
              <IconCalendar size={24} />
              نوبت‌های آینده
            </Group>
          </Title>
          
          {upcomingAppointments.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              نوبت آینده‌ای وجود ندارد
            </Text>
          ) : (
            <Stack gap="md">
              {upcomingAppointments.map((appt) => (
                <Paper key={appt.id} p="md" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text fw={600} size="lg">{appt.service_name}</Text>
                      {getStatusBadge(appt.status)}
                    </Group>
                    <Text size="sm" c="dimmed">
                      آرایشگر: {appt.barber_name}
                    </Text>
                    <Text size="sm" fw={500}>
                      {formatJalaliDateTime(appt.appointment_time)}
                    </Text>
                    <Group gap="xs">
                      <Text size="sm" c="dimmed">
                        مدت: {appt.duration_minutes} دقیقه
                      </Text>
                      <Text size="sm" c="dimmed">•</Text>
                      <Text size="sm" c="dimmed">
                        قیمت: {appt.price_toman.toLocaleString('fa-IR')} تومان
                      </Text>
                    </Group>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>

        {pastAppointments.length > 0 && (
          <Paper p="md" withBorder>
            <Title order={4} mb="md">تاریخچه نوبت‌ها</Title>
            <Stack gap="md">
              {pastAppointments.map((appt) => (
                <Paper key={appt.id} p="md" withBorder style={{ opacity: 0.7 }}>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text fw={600}>{appt.service_name}</Text>
                      {getStatusBadge(appt.status)}
                    </Group>
                    <Text size="sm" c="dimmed">
                      آرایشگر: {appt.barber_name}
                    </Text>
                    <Text size="sm">
                      {formatJalaliDateTime(appt.appointment_time)}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
