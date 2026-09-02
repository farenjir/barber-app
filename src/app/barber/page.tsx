import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import Link from 'next/link';
import { getTehranDayStart, getTehranNextDayStart, addTehranDays } from '@/lib/tehran-time';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Scissors, Clock, UserPlus, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getBarberData(userId: number) {
  // Get barber
  const barber = await sql`
    SELECT * FROM barbers WHERE user_id = ${userId}
  ` as any[];

  if (barber.length === 0) {
    return null;
  }

  const barberId = barber[0].id;

  // Get today's appointments
  const now = new Date();
  const today = getTehranDayStart(now);
  const tomorrow = getTehranNextDayStart(now);

  const todayAppointments = await sql`
    SELECT a.*, s.name as service_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.barber_id = ${barberId}
    AND a.appointment_time >= ${today.toISOString()}
    AND a.appointment_time < ${tomorrow.toISOString()}
    AND a.status IN ('pending', 'confirmed')
    ORDER BY a.appointment_time ASC
  ` as any[];

  // Get services count
  const services = await sql`
    SELECT COUNT(*) as count FROM services 
    WHERE barber_id = ${barberId} AND is_active = true
  ` as any[];

  // Get upcoming appointments count (next 7 days)
  const nextWeek = addTehranDays(today, 7);

  const upcomingCount = await sql`
    SELECT COUNT(*) as count FROM appointments 
    WHERE barber_id = ${barberId}
    AND appointment_time >= ${today.toISOString()}
    AND appointment_time < ${nextWeek.toISOString()}
    AND status IN ('pending', 'confirmed')
  ` as any[];

  return {
    barber: barber[0],
    todayAppointments,
    servicesCount: parseInt(services[0].count),
    upcomingCount: parseInt(upcomingCount[0].count),
  };
}

export default async function BarberDashboard() {
  const user = await requireBarber();

  const data = await getBarberData(user.id);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="bg-card border border-border rounded-lg p-8 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">خطا</h1>
          <p className="text-foreground">شما به عنوان آرایشگر ثبت نشده‌اید.</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      userName={user.name}
      userRole="barber"
      barberName={data.barber.display_name}
      pageTitle="داشبورد"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="نوبت‌های امروز"
          value={data.todayAppointments.length}
          icon={<Calendar className="w-6 h-6" />}
        />
        <StatCard
          title="نوبت‌های هفته آینده"
          value={data.upcomingCount}
          icon={<Clock className="w-6 h-6" />}
        />
        <StatCard
          title="خدمات فعال"
          value={data.servicesCount}
          icon={<Scissors className="w-6 h-6" />}
        />
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>دسترسی سریع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link
              href="/barber/calendar"
              className="flex flex-col items-center gap-3 p-6 bg-accent/20 hover:bg-accent/30 rounded-lg transition-colors border border-border"
            >
              <Calendar className="w-8 h-8 text-accent" />
              <span className="text-sm font-semibold text-foreground">تقویم</span>
            </Link>
            <Link
              href="/barber/services"
              className="flex flex-col items-center gap-3 p-6 bg-accent/20 hover:bg-accent/30 rounded-lg transition-colors border border-border"
            >
              <Scissors className="w-8 h-8 text-accent" />
              <span className="text-sm font-semibold text-foreground">خدمات</span>
            </Link>
            <Link
              href="/barber/hours"
              className="flex flex-col items-center gap-3 p-6 bg-accent/20 hover:bg-accent/30 rounded-lg transition-colors border border-border"
            >
              <Clock className="w-8 h-8 text-accent" />
              <span className="text-sm font-semibold text-foreground">ساعات کاری</span>
            </Link>
            <Link
              href="/barber/book"
              className="flex flex-col items-center gap-3 p-6 bg-accent/20 hover:bg-accent/30 rounded-lg transition-colors border border-border"
            >
              <UserPlus className="w-8 h-8 text-accent" />
              <span className="text-sm font-semibold text-foreground">نوبت دستی</span>
            </Link>
            <Link
              href="/barber/customers"
              className="flex flex-col items-center gap-3 p-6 bg-accent/20 hover:bg-accent/30 rounded-lg transition-colors border border-border"
            >
              <Users className="w-8 h-8 text-accent" />
              <span className="text-sm font-semibold text-foreground">مشتریان</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>نوبت‌های امروز</CardTitle>
        </CardHeader>
        <CardContent>
          {data.todayAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">امروز نوبتی وجود ندارد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.todayAppointments.map((appt: any) => {
                const time = new Date(appt.appointment_time).toLocaleTimeString('fa-IR', {
                  timeZone: 'Asia/Tehran',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={appt.id}
                    className="border border-border rounded-lg p-4 hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{appt.customer_name}</h3>
                        <p className="text-sm text-muted-foreground">{appt.customer_phone}</p>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Scissors className="w-4 h-4" />
                        {appt.service_name}
                      </span>
                      <span>{appt.duration_minutes} دقیقه</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
