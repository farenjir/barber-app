import { headers } from 'next/headers';
import { sql } from '@/db/client';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getBarberData(userId: number) {
  const barber = await sql`
    SELECT id, display_name FROM barbers WHERE user_id = ${userId}
  ` as any[];

  if (barber.length === 0) return null;

  return barber[0];
}

async function getBarberCustomers(userId: number) {
  const barber = await sql`
    SELECT id FROM barbers WHERE user_id = ${userId}
  ` as any[];

  if (barber.length === 0) return [];

  return await sql`
    SELECT DISTINCT 
      customer_telegram_id,
      customer_name,
      customer_phone,
      MAX(appointment_time) as last_appointment
    FROM appointments
    WHERE barber_id = ${barber[0].id}
    GROUP BY customer_telegram_id, customer_name, customer_phone
    ORDER BY last_appointment DESC
    LIMIT 50
  ` as any[];
}

export default async function BarberCustomers() {
  const headersList = await headers();
  const userId = parseInt(headersList.get('x-user-id') || '0');
  const userName = headersList.get('x-user-name') || 'کاربر';

  const barberData = await getBarberData(userId);
  const customers = await getBarberCustomers(userId);

  if (!barberData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg text-center">
          <p className="text-destructive">شما به عنوان آرایشگر ثبت نشده‌اید.</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      userName={userName}
      userRole="barber"
      barberName={barberData.display_name}
      pageTitle="لیست مشتریان"
    >
      <Card>
        <CardHeader>
          <CardTitle>مشتریان</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">مشتری‌ای یافت نشد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((customer: any, idx: number) => (
                <div key={idx} className="border border-border rounded-lg p-4 hover:bg-accent/10 transition-colors">
                  <h3 className="font-semibold text-foreground">{customer.customer_name}</h3>
                  <p className="text-sm text-muted-foreground">{customer.customer_phone}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    آخرین نوبت: {new Date(customer.last_appointment).toLocaleDateString('fa-IR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
