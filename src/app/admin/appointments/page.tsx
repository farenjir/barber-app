import { requireAdmin } from '@/lib/auth-server';
import { sql } from '@/db/client';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Calendar, Clock, Scissors } from 'lucide-react';
import { getTehranDayStart, addTehranDays } from '@/lib/tehran-time';

export const dynamic = 'force-dynamic';

function formatDateTime(date: Date): string {
  const jalaliDate = date.toLocaleDateString('fa-IR', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const time = date.toLocaleTimeString('fa-IR', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${jalaliDate} ${time}`;
}

export default async function AdminAppointments({
  searchParams,
}: {
  searchParams: { barber?: string; status?: string; from?: string };
}) {
  const user = await requireAdmin();
  
  const barbers = await sql`
    SELECT b.id, b.display_name 
    FROM barbers b
    WHERE b.is_active = true
    ORDER BY b.display_name
  ` as any[];
  
  let query = sql`
    SELECT 
      a.*,
      s.name as service_name,
      b.display_name as barber_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN barbers b ON a.barber_id = b.id
    WHERE 1=1
  `;
  
  const conditions: any[] = [];
  
  if (searchParams.barber) {
    conditions.push(sql`AND a.barber_id = ${parseInt(searchParams.barber)}`);
  }
  
  if (searchParams.status) {
    conditions.push(sql`AND a.status = ${searchParams.status}`);
  }
  
  if (searchParams.from === 'upcoming') {
    const now = new Date();
    conditions.push(sql`AND a.appointment_time >= ${now.toISOString()}`);
  } else if (searchParams.from === 'past') {
    const now = new Date();
    conditions.push(sql`AND a.appointment_time < ${now.toISOString()}`);
  } else if (searchParams.from === 'today') {
    const today = getTehranDayStart();
    const tomorrow = addTehranDays(today, 1);
    conditions.push(sql`AND a.appointment_time >= ${today.toISOString()} AND a.appointment_time < ${tomorrow.toISOString()}`);
  }
  
  if (conditions.length > 0) {
    query = sql`${query} ${sql(conditions.map(c => c.strings[0]).join(' '))}`;
  }
  
  query = sql`${query} ORDER BY a.appointment_time DESC LIMIT 100`;
  
  const appointments = await query as any[];

  return (
    <AppShell
      userName={user.name}
      userRole="super_admin"
      pageTitle="مدیریت نوبت‌ها"
    >
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="barber">آرایشگر</Label>
              <select id="barber" name="barber" className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm">
                <option value="">همه</option>
                {barbers.map((b: any) => (
                  <option key={b.id} value={b.id} selected={searchParams.barber === b.id.toString()}>
                    {b.display_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="status">وضعیت</Label>
              <select id="status" name="status" className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm">
                <option value="">همه</option>
                <option value="pending" selected={searchParams.status === 'pending'}>در انتظار</option>
                <option value="confirmed" selected={searchParams.status === 'confirmed'}>تأیید شده</option>
                <option value="cancelled" selected={searchParams.status === 'cancelled'}>لغو شده</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="from">زمان</Label>
              <select id="from" name="from" className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm">
                <option value="">همه</option>
                <option value="today" selected={searchParams.from === 'today'}>امروز</option>
                <option value="upcoming" selected={searchParams.from === 'upcoming'}>آینده</option>
                <option value="past" selected={searchParams.from === 'past'}>گذشته</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                اعمال فیلتر
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-accent/50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold">زمان</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">آرایشگر</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">خدمت</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">مشتری</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">تلفن</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">نوبتی یافت نشد</p>
                    </td>
                  </tr>
                ) : (
                  appointments.map((appt: any) => (
                    <tr key={appt.id} className="hover:bg-accent/10">
                      <td className="px-4 py-3 text-sm">{formatDateTime(new Date(appt.appointment_time))}</td>
                      <td className="px-4 py-3 text-sm">{appt.barber_name}</td>
                      <td className="px-4 py-3 text-sm">{appt.service_name}</td>
                      <td className="px-4 py-3 text-sm">{appt.customer_name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{appt.customer_phone}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={appt.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {appointments.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-accent/50 text-sm text-muted-foreground">
              نمایش {appointments.length} نوبت (حداکثر 100 نوبت اخیر)
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
