import { redirect } from 'next/navigation';
import { Center, Stack, Paper, Title, Text, Divider, Alert, Box, Code, List } from '@mantine/core';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (token) {
    redirect(`/api/auth/magic?token=${encodeURIComponent(token)}`);
  }

  return (
    <Center style={{ minHeight: '100vh' }} p="xl">
      <Stack w="100%" maw={500} gap="lg">
        <Stack gap="md" ta="center">
          <Title order={1} size="3rem" c="orange">نوبت‌آرا</Title>
          <Divider w="70%" mx="auto" />
          <Text size="sm" c="dimmed">سامانه نوبت‌دهی آرایشگاه</Text>
        </Stack>

        <Paper shadow="lg" p="xl" radius="md" withBorder>
          <Title order={2} size="h3" mb="xl" ta="center">ورود به پنل</Title>

          <Stack gap="md" ta="center">
            {error === 'expired' ? (
              <>
                <Alert color="red" variant="light" title="لینک منقضی شده یا نامعتبر است" />
                <Text c="dimmed">لطفاً لینک جدیدی از ربات تلگرام دریافت کنید.</Text>
              </>
            ) : error === 'forbidden' || error === 'customer' ? (
              <>
                <Alert color="red" variant="light" title="شما به عنوان مشتری دسترسی به پنل وب ندارید" />
                <Text c="dimmed">لطفاً از ربات تلگرام برای رزرو نوبت استفاده کنید.</Text>
              </>
            ) : (
              <Text c="dimmed">برای ورود، لینک دسترسی را از ربات تلگرام دریافت کنید.</Text>
            )}

            <Paper bg="orange.1" p="lg" radius="md" withBorder mt="md">
              <Text fw={600} size="lg" mb="md" c="orange">راهنمای ورود</Text>
              <List spacing="sm" ta="right">
                <List.Item>به ربات تلگرام مراجعه کنید</List.Item>
                <List.Item>
                  دستور <Code>‎/panel</Code> را ارسال کنید
                </List.Item>
                <List.Item>روی لینک ارسال شده کلیک کنید</List.Item>
              </List>
            </Paper>
          </Stack>
        </Paper>
      </Stack>
    </Center>
  );
}
