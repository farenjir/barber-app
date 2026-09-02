import { requireAdmin } from '@/lib/auth-server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  await requireAdmin();
  
  const salonName = process.env.SALON_NAME || 'سالن زیبایی';
  const appUrl = process.env.APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '-';

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">تنظیمات سالن</h1>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">بازگشت</Link>
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">تنظیمات محیطی</h2>
            <p className="text-sm text-gray-600 mb-4">
              این تنظیمات از متغیرهای محیطی (Environment Variables) خوانده می‌شوند.
              برای تغییر، به تنظیمات Vercel مراجعه کنید.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">نام سالن</h3>
                  <p className="text-sm text-gray-600 mt-1">SALON_NAME</p>
                </div>
                <div className="text-lg font-bold text-blue-600">{salonName}</div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">آدرس وب اپلیکیشن</h3>
                  <p className="text-sm text-gray-600 mt-1">APP_URL</p>
                </div>
                <div className="text-sm text-left font-mono text-blue-600 break-all">{appUrl}</div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">سوپر ادمین‌ها</h3>
                  <p className="text-sm text-gray-600 mt-1">ADMIN_TELEGRAM_IDS</p>
                </div>
                <div className="text-sm text-gray-600">پیکربندی شده</div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">ربات تلگرام</h3>
                  <p className="text-sm text-gray-600 mt-1">TELEGRAM_BOT_TOKEN</p>
                </div>
                <div className="text-sm text-gray-600">پیکربندی شده</div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">پایگاه داده</h3>
                  <p className="text-sm text-gray-600 mt-1">DATABASE_URL</p>
                </div>
                <div className="text-sm text-gray-600">متصل</div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-blue-800 mb-2">📝 نکته</h3>
            <p className="text-sm text-blue-700">
              برای تغییر این تنظیمات، به داشبورد Vercel → Settings → Environment Variables مراجعه کنید و پس از تغییر، پروژه را redeploy کنید.
            </p>
          </div>
          
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">📚 راهنمای متغیرها</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• <strong>SALON_NAME:</strong> نام سالن که در پیام‌های ربات و پنل نمایش داده می‌شود</li>
              <li>• <strong>APP_URL:</strong> آدرس اصلی وب اپلیکیشن برای لینک‌های magic link</li>
              <li>• <strong>ADMIN_TELEGRAM_IDS:</strong> لیست Telegram ID های سوپر ادمین‌ها (با کاما جدا شده)</li>
              <li>• <strong>TELEGRAM_BOT_TOKEN:</strong> توکن ربات تلگرام از @BotFather</li>
              <li>• <strong>DATABASE_URL:</strong> رشته اتصال به پایگاه داده PostgreSQL</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
