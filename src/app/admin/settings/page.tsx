import { requireAdmin } from '@/lib/auth-server';
import { AppShell } from '@/components/MantineAppShell';
import { Paper, Text, Stack, Title, Code, Divider } from '@mantine/core';

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
        <Paper p="lg" withBorder>
          <Title order={3} mb="md">تنظیمات محیطی</Title>
          <Text size="sm" c="dimmed" mb="lg">
            این تنظیمات از متغیرهای محیطی (Environment Variables) خوانده می‌شوند.
            برای تغییر، به تنظیمات Vercel مراجعه کنید.
          </Text>
          
          <Stack gap="sm">
            {settings.map((setting) => (
              <Paper key={setting.key} p="md" withBorder style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                <Stack gap="xs">
                  <Text fw={600}>{setting.label}</Text>
                  <Code>{setting.key}</Code>
                  <Text size="sm" c="blue">{setting.value}</Text>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
        
        <Paper p="lg" withBorder>
          <Title order={3} mb="md">راهنمای متغیرها</Title>
          <Stack gap="sm">
            <div>
              <Text fw={600} size="sm">SALON_NAME</Text>
              <Text size="sm" c="dimmed">نام پلتفرم که در پیام‌های ربات و پنل نمایش داده می‌شود</Text>
            </div>
            <Divider />
            <div>
              <Text fw={600} size="sm">APP_URL</Text>
              <Text size="sm" c="dimmed">آدرس اصلی وب اپلیکیشن برای لینک‌های magic link و وب‌هوک تلگرام</Text>
            </div>
            <Divider />
            <div>
              <Text fw={600} size="sm">ADMIN_TELEGRAM_IDS</Text>
              <Text size="sm" c="dimmed">لیست Telegram ID های سوپر ادمین‌ها (جدا شده با ویرگول)</Text>
            </div>
            <Divider />
            <div>
              <Text fw={600} size="sm">TELEGRAM_BOT_TOKEN</Text>
              <Text size="sm" c="dimmed">توکن ربات تلگرام دریافت شده از @BotFather</Text>
            </div>
            <Divider />
            <div>
              <Text fw={600} size="sm">DATABASE_URL</Text>
              <Text size="sm" c="dimmed">رشته اتصال به پایگاه داده PostgreSQL</Text>
            </div>
          </Stack>
        </Paper>
      </Stack>
    </AppShell>
  );
}
