import { requireAdmin } from '@/lib/auth-server';
import { AppShell } from '@/components/MantineAppShell';
import { Paper, Text, Stack, Group, Code } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  const user = await requireAdmin();
  
  const platformName = process.env.SALON_NAME || 'نوبت‌آرا';
  const appUrl = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '-');
  const hasTelegramBot = !!process.env.TELEGRAM_BOT_TOKEN;
  const hasDatabase = !!process.env.DATABASE_URL;
  const hasAdminIds = !!process.env.ADMIN_TELEGRAM_IDS;

  const settings = [
    { label: 'نام پلتفرم', key: 'SALON_NAME', value: platformName },
    { label: 'آدرس وب اپلیکیشن', key: 'APP_URL', value: appUrl },
    { label: 'سوپر ادمین‌ها', key: 'ADMIN_TELEGRAM_IDS', value: hasAdminIds ? 'پیکربندی شده' : 'پیکربندی نشده' },
    { label: 'ربات تلگرام', key: 'TELEGRAM_BOT_TOKEN', value: hasTelegramBot ? 'پیکربندی شده' : 'پیکربندی نشده' },
    { label: 'پایگاه داده', key: 'DATABASE_URL', value: hasDatabase ? 'متصل' : 'پیکربندی نشده' },
  ];

  return (
    <AppShell
      userName={user.name}
      userRole="super_admin"
      pageTitle="تنظیمات"
    >
      <Stack gap="md">
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Text fw={600} size="lg">تنظیمات محیطی</Text>
            <Text size="sm" c="dimmed">
              این تنظیمات از متغیرهای محیطی (Environment Variables) خوانده می‌شوند.
              برای تغییر، به تنظیمات Vercel مراجعه کنید.
            </Text>
            
            <Stack gap="xs">
              {settings.map((setting) => (
                <Paper key={setting.key} p="md" withBorder radius="md">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Text fw={500}>{setting.label}</Text>
                      <Code c="dimmed" fz="xs">{setting.key}</Code>
                    </Stack>
                    <Text fw={500} style={{ flexShrink: 0 }}>{setting.value}</Text>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Paper>
        
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconSettings size={20} />
              <Text fw={600} size="lg">راهنمای متغیرها</Text>
            </Group>
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                • <Text component="span" fw={500} inherit>SALON_NAME:</Text> نام پلتفرم که در پیام‌های ربات و پنل نمایش داده می‌شود
              </Text>
              <Text size="sm" c="dimmed">
                • <Text component="span" fw={500} inherit>APP_URL:</Text> آدرس اصلی وب اپلیکیشن برای لینک‌های magic link و وب‌هوک تلگرام
              </Text>
              <Text size="sm" c="dimmed">
                • <Text component="span" fw={500} inherit>ADMIN_TELEGRAM_IDS:</Text> لیست Telegram ID های سوپر ادمین‌ها (جدا شده با ویرگول)
              </Text>
              <Text size="sm" c="dimmed">
                • <Text component="span" fw={500} inherit>TELEGRAM_BOT_TOKEN:</Text> توکن ربات تلگرام دریافت شده از @BotFather
              </Text>
              <Text size="sm" c="dimmed">
                • <Text component="span" fw={500} inherit>DATABASE_URL:</Text> رشته اتصال به پایگاه داده PostgreSQL
              </Text>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </AppShell>
  );
}
