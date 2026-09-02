import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (token) {
<<<<<<< HEAD
    redirect(`/api/auth/magic?token=${token}`);
=======
    // Verify magic link
    const user = await verifyMagicLink(token);

    if (user) {
      // Create session
      const sessionToken = await createSession(user.id);

      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set('session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      // Redirect based on role
      if (user.role === 'super_admin') {
        redirect('/admin');
      } else if (user.role === 'barber') {
        redirect('/barber');
      } else {
        // Customers don't have web access
        return (
          <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="bg-card border border-border rounded-lg p-8 shadow-lg max-w-md w-full text-center">
              <h1 className="text-2xl font-bold text-destructive mb-4">خطا</h1>
              <p className="text-foreground mb-2">شما به عنوان مشتری دسترسی به پنل وب ندارید.</p>
              <p className="text-muted-foreground">لطفاً از ربات تلگرام برای رزرو نوبت استفاده کنید.</p>
            </div>
          </div>
        );
      }
    }
>>>>>>> 49a9a7c (feat: Add modern RTL Persian UI with Tailwind CSS and shadcn/ui)
  }

  return (
<<<<<<< HEAD
    <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">ورود به پنل</h1>
        <div className="text-gray-600 space-y-3">
          {error === 'expired' ? (
            <>
              <p className="text-red-600 font-semibold">لینک منقضی شده یا نامعتبر است</p>
              <p>لطفاً لینک جدیدی از ربات تلگرام دریافت کنید.</p>
            </>
          ) : error === 'forbidden' || error === 'customer' ? (
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
=======
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-primary mb-3">نوبت‌آرا</h1>
          <div className="h-px bg-border max-w-xs mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">سامانه نوبت‌دهی آرایشگاه</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">ورود به پنل</h2>
          
          <div className="space-y-4 text-center">
            {token ? (
              <>
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-destructive font-semibold">لینک منقضی شده یا نامعتبر است</p>
                </div>
                <p className="text-muted-foreground">لطفاً لینک جدیدی از ربات تلگرام دریافت کنید.</p>
              </>
            ) : (
              <p className="text-muted-foreground">برای ورود، لینک دسترسی را از ربات تلگرام دریافت کنید.</p>
            )}
            
            <div className="mt-6 p-6 bg-accent/20 border border-accent/30 rounded-lg">
              <p className="font-semibold text-accent-foreground mb-4 text-lg">راهنمای ورود</p>
              <ol className="text-right space-y-2 text-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">۱</span>
                  <span>به ربات تلگرام مراجعه کنید</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">۲</span>
                  <span>دستور <code className="px-2 py-1 bg-muted rounded text-sm">/panel</code> را ارسال کنید</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">۳</span>
                  <span>روی لینک ارسال شده کلیک کنید</span>
                </li>
              </ol>
            </div>
>>>>>>> 49a9a7c (feat: Add modern RTL Persian UI with Tailwind CSS and shadcn/ui)
          </div>
        </div>
      </div>
    </div>
  );
}
