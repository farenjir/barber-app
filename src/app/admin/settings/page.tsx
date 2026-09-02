import { requireAdmin } from '@/lib/auth-server';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  const user = await requireAdmin();
  
  const salonName = process.env.SALON_NAME || 'سالن زیبایی';
  const appUrl = process.env.APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '-';

  const settings = [
    { label: 'نام سالن', key: 'SALON_NAME', value: salonName },
    { label: 'آدرس وب اپلیکیشن', key: 'APP_URL', value: appUrl },
    { label: 'سوپر ادمین‌ها', key: 'ADMIN_TELEGRAM_IDS', value: 'پیکربندی شده' },
    { label: 'ربات تلگرام', key: 'TELEGRAM_BOT_TOKEN', value: 'پیکربندی شده' },
    { label: 'پایگاه داده', key: 'DATABASE_URL', value: 'متصل' },
  ];

  return (
    <AppShell
      userName={user.name}
      userRole="super_admin"
      pageTitle="تنظیمات سالن"
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>تنظیمات محیطی</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            این تنظیمات از متغیرهای محیطی (Environment Variables) خوانده می‌شوند.
            برای تغییر، به تنظیمات Vercel مراجعه کنید.
          </p>
          
          <div className="space-y-3">
            {settings.map((setting) => (
              <div key={setting.key} className="border border-border rounded-lg p-4 hover:bg-accent/10 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-foreground">{setting.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{setting.key}</p>
                  </div>
                  <div className="text-sm font-mono text-accent break-all max-w-md text-left">{setting.value}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            راهنمای متغیرها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• <strong className="text-foreground">SALON_NAME:</strong> نام سالن که در پیام‌های ربات و پنل نمایش داده می‌شود</li>
            <li>• <strong className="text-foreground">APP_URL:</strong> آدرس اصلی وب اپلیکیشن برای لینک‌های magic link</li>
            <li>• <strong className="text-foreground">ADMIN_TELEGRAM_IDS:</strong> لیست Telegram ID های سوپر ادمین‌ها</li>
            <li>• <strong className="text-foreground">TELEGRAM_BOT_TOKEN:</strong> توکن ربات تلگرام از @BotFather</li>
            <li>• <strong className="text-foreground">DATABASE_URL:</strong> رشته اتصال به پایگاه داده PostgreSQL</li>
          </ul>
        </CardContent>
      </Card>
    </AppShell>
  );
}
