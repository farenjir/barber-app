'use client';

import { useState } from 'react';
import { Paper, SimpleGrid, Text, Badge, Stack, Group, CopyButton, ActionIcon, Tooltip, Button, Modal } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { IconCalendar, IconScissors, IconClock, IconCopy, IconCheck, IconKey } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { DateTimePicker } from '@mantine/dates';
import Link from 'next/link';
import { confirmAppointment, rejectAppointment, cancelAppointment, rescheduleAppointment } from './appointments/actions';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

interface BarberDashboardData {
  barber: any;
  todayAppointments: any[];
  servicesCount: number;
  upcomingCount: number;
  weeklyData: { day: string; count: number }[];
}

export default function BarberDashboardClient({ data }: { data: BarberDashboardData }) {
  const [processingAppt, setProcessingAppt] = useState<number | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedApptForReschedule, setSelectedApptForReschedule] = useState<any | null>(null);
  const [newDateTime, setNewDateTime] = useState<Date | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedApptForCancel, setSelectedApptForCancel] = useState<any | null>(null);
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'BarberAppointmentAppBot';
  const telegramInviteLink = `https://t.me/${botUsername}?start=${data.barber.public_code}`;
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const webInviteLink = `${appUrl}/book/${data.barber.public_code}`;

  const handleConfirm = async (appointmentId: number) => {
    setProcessingAppt(appointmentId);
    try {
      const result = await confirmAppointment(appointmentId);
      if (result.success) {
        notifications.show({
          title: 'موفق',
          message: 'نوبت تأیید شد',
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'خطا',
          message: result.error || 'خطا در تأیید نوبت',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'خطا',
        message: 'خطا در تأیید نوبت',
        color: 'red',
      });
    } finally {
      setProcessingAppt(null);
    }
  };

  const handleReject = async (appointmentId: number) => {
    setProcessingAppt(appointmentId);
    try {
      const result = await rejectAppointment(appointmentId);
      if (result.success) {
        notifications.show({
          title: 'موفق',
          message: 'نوبت رد شد',
          color: 'blue',
        });
      } else {
        notifications.show({
          title: 'خطا',
          message: result.error || 'خطا در رد نوبت',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'خطا',
        message: 'خطا در رد نوبت',
        color: 'red',
      });
    } finally {
      setProcessingAppt(null);
    }
  };

  const openRescheduleModal = (appt: any) => {
    setSelectedApptForReschedule(appt);
    setNewDateTime(new Date(appt.appointment_time));
    setRescheduleModalOpen(true);
  };

  const handleReschedule = async () => {
    if (!selectedApptForReschedule || !newDateTime) return;
    
    setProcessingAppt(selectedApptForReschedule.id);
    try {
      const tehranTime = dayjs(newDateTime).tz('Asia/Tehran');
      const result = await rescheduleAppointment(selectedApptForReschedule.id, tehranTime.toISOString());
      if (result.success) {
        notifications.show({
          title: 'موفق',
          message: 'نوبت جابه‌جا شد',
          color: 'green',
        });
        setRescheduleModalOpen(false);
        setSelectedApptForReschedule(null);
        setNewDateTime(null);
      } else {
        notifications.show({
          title: 'خطا',
          message: result.error || 'خطا در جابه‌جایی نوبت',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'خطا',
        message: 'خطا در جابه‌جایی نوبت',
        color: 'red',
      });
    } finally {
      setProcessingAppt(null);
    }
  };

  const openCancelModal = (appt: any) => {
    setSelectedApptForCancel(appt);
    setCancelModalOpen(true);
  };

  const handleCancel = async () => {
    if (!selectedApptForCancel) return;
    
    setProcessingAppt(selectedApptForCancel.id);
    try {
      const result = await cancelAppointment(selectedApptForCancel.id);
      if (result.success) {
        notifications.show({
          title: 'موفق',
          message: 'نوبت لغو شد',
          color: 'blue',
        });
        setCancelModalOpen(false);
        setSelectedApptForCancel(null);
      } else {
        notifications.show({
          title: 'خطا',
          message: result.error || 'خطا در لغو نوبت',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'خطا',
        message: 'خطا در لغو نوبت',
        color: 'red',
      });
    } finally {
      setProcessingAppt(null);
    }
  };
  
  return (
    <Stack>
      {/* Barber Invite Links Card */}
      {data.barber.public_code && (
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group>
              <IconKey size={32} />
              <div>
                <Text size="xs" c="dimmed">لینک‌های دعوت مشتری</Text>
                <Text size="sm" c="dimmed">کد شما: <Text span fw={700} tt="uppercase">{data.barber.public_code}</Text></Text>
              </div>
            </Group>
            
            <Stack gap="sm">
              <Group justify="space-between" wrap="wrap">
                <Text size="sm" fw={500}>لینک دعوت تلگرام</Text>
                <CopyButton value={telegramInviteLink}>
                  {({ copied, copy }) => (
                    <Button
                      variant="light"
                      size="xs"
                      color={copied ? 'teal' : 'blue'}
                      leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      onClick={copy}
                    >
                      {copied ? 'کپی شد!' : 'کپی لینک'}
                    </Button>
                  )}
                </CopyButton>
              </Group>
              
              <Group justify="space-between" wrap="wrap">
                <Text size="sm" fw={500}>لینک دعوت وب</Text>
                <CopyButton value={webInviteLink}>
                  {({ copied, copy }) => (
                    <Button
                      variant="light"
                      size="xs"
                      color={copied ? 'teal' : 'blue'}
                      leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      onClick={copy}
                    >
                      {copied ? 'کپی شد!' : 'کپی لینک'}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </Stack>
          </Stack>
          
          <Text size="xs" c="dimmed" mt="md">
            مشتریان می‌توانند از طریق تلگرام یا وب از شما نوبت رزرو کنند.
          </Text>
        </Paper>
      )}

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
              const isPending = appt.status === 'pending';
              const isProcessing = processingAppt === appt.id;

              return (
                <Paper key={appt.id} p="md" withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <div>
                        <Text fw={600}>{appt.customer_name}</Text>
                        <Text size="sm" c="dimmed">{appt.customer_phone}</Text>
                      </div>
                      <Stack gap="xs" align="flex-start">
                        <Badge color={appt.status === 'confirmed' ? 'green' : 'orange'}>
                          {appt.status === 'confirmed' ? 'تأیید شده' : 'در انتظار'}
                        </Badge>
                        <Text size="sm" mt="xs">{time} - {appt.service_name}</Text>
                      </Stack>
                    </Group>
                    
                    <Group gap="sm" wrap="wrap">
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            color="green"
                            onClick={() => handleConfirm(appt.id)}
                            loading={isProcessing}
                            disabled={isProcessing}
                          >
                            تأیید
                          </Button>
                          <Button
                            size="sm"
                            color="red"
                            variant="outline"
                            onClick={() => handleReject(appt.id)}
                            loading={isProcessing}
                            disabled={isProcessing}
                          >
                            رد
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        color="blue"
                        variant="light"
                        onClick={() => openRescheduleModal(appt)}
                        disabled={isProcessing}
                      >
                        جابه‌جایی
                      </Button>
                      <Button
                        size="sm"
                        color="red"
                        variant="subtle"
                        onClick={() => openCancelModal(appt)}
                        disabled={isProcessing}
                      >
                        لغو
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="md">
        <Link href="/barber/calendar">
          <Paper p="lg" withBorder style={{ textAlign: 'center', transition: 'background-color 150ms' }}>
            <Stack gap="xs" align="center">
              <IconCalendar size={32} />
              <Text size="sm" fw={600}>تقویم</Text>
            </Stack>
          </Paper>
        </Link>
        <Link href="/barber/services">
          <Paper p="lg" withBorder style={{ textAlign: 'center', transition: 'background-color 150ms' }}>
            <Stack gap="xs" align="center">
              <IconScissors size={32} />
              <Text size="sm" fw={600}>خدمات</Text>
            </Stack>
          </Paper>
        </Link>
        <Link href="/barber/hours">
          <Paper p="lg" withBorder style={{ textAlign: 'center', transition: 'background-color 150ms' }}>
            <Stack gap="xs" align="center">
              <IconClock size={32} />
              <Text size="sm" fw={600}>ساعات کاری</Text>
            </Stack>
          </Paper>
        </Link>
        <Link href="/barber/book">
          <Paper p="lg" withBorder style={{ textAlign: 'center', transition: 'background-color 150ms' }}>
            <Stack gap="xs" align="center">
              <IconCalendar size={32} />
              <Text size="sm" fw={600}>نوبت دستی</Text>
            </Stack>
          </Paper>
        </Link>
        <Link href="/barber/customers">
          <Paper p="lg" withBorder style={{ textAlign: 'center', transition: 'background-color 150ms' }}>
            <Stack gap="xs" align="center">
              <IconCalendar size={32} />
              <Text size="sm" fw={600}>مشتریان</Text>
            </Stack>
          </Paper>
        </Link>
      </SimpleGrid>

      <Modal
        opened={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="جابه‌جایی نوبت"
        size="md"
        centered
      >
        <Stack gap="md">
          {selectedApptForReschedule && (
            <>
              <Text size="sm">
                نوبت: {selectedApptForReschedule.customer_name} - {selectedApptForReschedule.service_name}
              </Text>
              <DateTimePicker
                label="تاریخ و زمان جدید"
                placeholder="تاریخ و زمان را انتخاب کنید"
                value={newDateTime}
                onChange={(value) => setNewDateTime(value ? new Date(value) : null)}
                locale="fa-IR"
                clearable={false}
              />
              <Group gap="sm">
                <Button
                  flex={1}
                  color="blue"
                  onClick={handleReschedule}
                  loading={processingAppt === selectedApptForReschedule.id}
                  disabled={!newDateTime || processingAppt === selectedApptForReschedule.id}
                >
                  تأیید جابه‌جایی
                </Button>
                <Button
                  flex={1}
                  variant="outline"
                  onClick={() => setRescheduleModalOpen(false)}
                  disabled={processingAppt === selectedApptForReschedule.id}
                >
                  انصراف
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      <Modal
        opened={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="لغو نوبت"
        size="md"
        centered
      >
        <Stack gap="md">
          {selectedApptForCancel && (
            <>
              <Text size="sm">
                آیا مطمئن هستید که می‌خواهید این نوبت را لغو کنید؟
              </Text>
              <Text size="sm" fw={600}>
                {selectedApptForCancel.customer_name} - {selectedApptForCancel.service_name}
              </Text>
              <Group gap="sm">
                <Button
                  flex={1}
                  color="red"
                  onClick={handleCancel}
                  loading={processingAppt === selectedApptForCancel.id}
                  disabled={processingAppt === selectedApptForCancel.id}
                >
                  تأیید لغو
                </Button>
                <Button
                  flex={1}
                  variant="outline"
                  onClick={() => setCancelModalOpen(false)}
                  disabled={processingAppt === selectedApptForCancel.id}
                >
                  انصراف
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
