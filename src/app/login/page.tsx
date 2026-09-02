import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (token) {
    redirect(`/api/auth/magic?token=${token}`);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">ورود به پنل</h1>
        <div className="text-gray-600 space-y-3">
          {error === 'expired' ? (
            <>
              <p className="text-red-600 font-semibold">لینک منقضی شده یا نامعتبر است</p>
              <p>لطفاً لینک جدیدی از ربات تلگرام دریافت کنید.</p>
            </>
          ) : error === 'forbidden' ? (
            <>
              <p className="text-red-600 font-semibold">شما به عنوان مشتری دسترسی به پنل وب ندارید</p>
              <p>لطفاً از ربات تلگرام برای رزرو نوبت استفاده کنید.</p>
            </>
          ) : (
            <p>برای ورود، لینک دسترسی را از ربات تلگرام دریافت کنید.</p>
          )}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="font-semibold text-blue-800 mb-2">راهنما:</p>
            <ol className="text-right text-sm space-y-1 text-blue-700">
              <li>۱. به ربات تلگرام مراجعه کنید</li>
              <li>۲. دستور /panel را ارسال کنید</li>
              <li>۳. روی لینک ارسال شده کلیک کنید</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
