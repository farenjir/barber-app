import { redirect } from 'next/navigation';

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
            {error === 'expired' ? (
              <>
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-destructive font-semibold">لینک منقضی شده یا نامعتبر است</p>
                </div>
                <p className="text-muted-foreground">لطفاً لینک جدیدی از ربات تلگرام دریافت کنید.</p>
              </>
            ) : error === 'forbidden' || error === 'customer' ? (
              <>
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-destructive font-semibold">شما به عنوان مشتری دسترسی به پنل وب ندارید</p>
                </div>
                <p className="text-muted-foreground">لطفاً از ربات تلگرام برای رزرو نوبت استفاده کنید.</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}
