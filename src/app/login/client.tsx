'use client';

import { Paper, Title, Text, Stack, Alert, Button, List, ThemeIcon, Center, Divider } from '@mantine/core';
import { IconAlertCircle, IconBrandTelegram, IconCircleNumber1, IconCircleNumber2, IconCircleNumber3 } from '@tabler/icons-react';

interface LoginViewProps {
  error?: string;
}

export default function LoginView({ error }: LoginViewProps) {
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'BarberAppointmentAppBot';
  const botUrl = `https://t.me/${botUsername}`;

  const getErrorContent = () => {
    if (error === 'expired') {
      return {
        title: 'لینک منقضی شده است',
        description: 'لینک ورود شما منقضی شده، استفاده شده، یا نامعتبر است.',
        instruction: 'لطفاً لینک جدیدی از ربات تلگرام دریافت کنید.',
      };
    }
    
    if (error === 'forbidden' || error === 'customer') {
      return {
        title: 'دسترسی محدود',
        description: 'شما به عنوان مشتری دسترسی به پنل وب ندارید.',
        instruction: 'برای رزرو نوبت، از ربات تلگرام استفاده کنید.',
      };
    }

    return null;
  };

  const errorContent = getErrorContent();

  return (
    <Center style={{ minHeight: '100vh', padding: '1.5rem' }}>
      <Stack gap="lg" style={{ width: '100%', maxWidth: '32rem' }}>
        <Stack gap="md" align="center">
          <Title order={1} size="3rem" fw={700} c="orange">
            نوبت‌آرا
          </Title>
          <Divider style={{ width: '20rem', maxWidth: '100%' }} />
          <Text size="sm" c="dimmed">
            سامانه نوبت‌دهی آرایشگاه
          </Text>
        </Stack>

        <Paper shadow="lg" p="xl" withBorder>
          <Title order={2} size="1.5rem" fw={700} ta="center" mb="xl">
            ورود به پنل
          </Title>

          <Stack gap="md">
            {errorContent ? (
              <>
                <Alert
                  color="red"
                  icon={<IconAlertCircle />}
                  title={errorContent.title}
                >
                  {errorContent.description}
                </Alert>
                <Text ta="center" c="dimmed">
                  {errorContent.instruction}
                </Text>
              </>
            ) : (
              <Text ta="center" c="dimmed">
                برای ورود، لینک دسترسی را از ربات تلگرام دریافت کنید.
              </Text>
            )}

            <Paper p="lg" withBorder>
              <Text size="lg" fw={600} mb="md">
                راهنمای ورود
              </Text>
              <List spacing="md" center>
                <List.Item
                  icon={
                    <ThemeIcon color="orange" size={32} radius="xl">
                      <IconCircleNumber1 size={20} />
                    </ThemeIcon>
                  }
                >
                  <Text>به ربات تلگرام مراجعه کنید</Text>
                </List.Item>
                <List.Item
                  icon={
                    <ThemeIcon color="orange" size={32} radius="xl">
                      <IconCircleNumber2 size={20} />
                    </ThemeIcon>
                  }
                >
                  <Text>
                    دستور <Text component="code" fw={600} c="orange">/panel</Text> را ارسال کنید
                  </Text>
                </List.Item>
                <List.Item
                  icon={
                    <ThemeIcon color="orange" size={32} radius="xl">
                      <IconCircleNumber3 size={20} />
                    </ThemeIcon>
                  }
                >
                  <Text>روی لینک ارسال شده کلیک کنید</Text>
                </List.Item>
              </List>
            </Paper>

            <Button
              component="a"
              href={botUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              fullWidth
              leftSection={<IconBrandTelegram size={20} />}
              color="orange"
            >
              باز کردن ربات تلگرام
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Center>
  );
}
