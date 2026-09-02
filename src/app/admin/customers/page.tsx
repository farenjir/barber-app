import { requireAdmin } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminCustomers() {
  const user = await requireAdmin();
  
  const customers = await sql`
    SELECT 
      customer_telegram_id,
      customer_name,
      customer_phone,
      COUNT(*) as total_appointments,
      MAX(appointment_time) as last_appointment,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count
    FROM appointments
    GROUP BY customer_telegram_id, customer_name, customer_phone
    ORDER BY last_appointment DESC
  ` as any[];

  return (
    <AppShell
      userName={user.name}
      userRole="super_admin"
      pageTitle="مدیریت مشتریان"
    >
      <Card>
        <CardHeader>
          <CardTitle>لیست مشتریان ({customers.length} مشتری)</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">مشتری‌ای یافت نشد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-semibold">نام</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">تلفن</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">تعداد نوبت‌ها</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">تأیید شده</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">آخرین نوبت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer: any) => {
                    const lastAppt = customer.last_appointment 
                      ? new Date(customer.last_appointment).toLocaleDateString('fa-IR', {
                          timeZone: 'Asia/Tehran',
                        })
                      : '-';
                    
                    return (
                      <tr key={customer.customer_telegram_id} className="hover:bg-accent/10">
                        <td className="px-4 py-3 text-sm font-semibold">{customer.customer_name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{customer.customer_phone}</td>
                        <td className="px-4 py-3 text-sm text-center">{customer.total_appointments}</td>
                        <td className="px-4 py-3 text-sm text-center">{customer.confirmed_count}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{lastAppt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
