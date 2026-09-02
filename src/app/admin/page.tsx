import { requireAdmin } from '@/lib/auth-server';
import { sql } from '@/db/client';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Settings, Scissors, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getAdminStats() {
  const barbers = await sql`
    SELECT COUNT(*) as count FROM barbers WHERE is_active = true
  ` as any[];

  const customers = await sql`
    SELECT COUNT(DISTINCT customer_telegram_id) as count FROM appointments
  ` as any[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppointments = await sql`
    SELECT COUNT(*) as count FROM appointments
    WHERE appointment_time >= ${today.toISOString()}
    AND appointment_time < ${tomorrow.toISOString()}
    AND status IN ('pending', 'confirmed')
  ` as any[];

  const recentAppointments = await sql`
    SELECT a.*, s.name as service_name, b.display_name as barber_name
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN barbers b ON a.barber_id = b.id
    ORDER BY a.created_at DESC
    LIMIT 10
  ` as any[];

  return {
    barbersCount: parseInt(barbers[0].count),
    customersCount: parseInt(customers[0].count),
    todayAppointmentsCount: parseInt(todayAppointments[0].count),
    recentAppointments,
  };
}

export default async function AdminDashboard() {
  const user = await requireAdmin();

  const stats = await getAdminStats();

  return (
    <AppShell
      userName={user.name}
      userRole="super_admin"
      pageTitle="داشبورد مدیریت"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="آرایشگران فعال"
          value={stats.barbersCount}
          icon={<Scissors className="w-6 h-6" />}
        />
        <StatCard
          title="مشتریان"
          value={stats.customersCount}
          icon={<Users className="w-6 h-6" />}
        />
        <StatCard
          title="نوبت‌های امروز"
          value={stats.todayAppointmentsCount}
          icon={<Calendar className="w-6 h-6" />}
        />
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>مدیریت سیستم</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin/barbers"
              className="flex flex-col items-center gap-3 p-6 bg-accent/20 hover:bg-accent/30 rounded-lg transition-colors border border-border"
            >
              <Scissors className="w-8 h-8 text-accent" />
              <span className="text-sm font-semibold text-foreground">آرایشگران</span>
            </Link>
            <Link
              href="/admin/appointments"
              className="flex flex-col items-center gap-3 p-6 bg-accent/20 hover:bg-accent/30 rounded-lg transition-colors border border-border"
            >
              <Calendar className="w-8 h-8 text-accent" />
              <span className="text-sm font-semibold text-foreground">نوبت‌ها</span>
            </Link>
            <Link
              href="/admin/customers"
              className="flex flex-col items-center gap-3 p-6 bg-accent/20 hover:bg-accent/30 rounded-lg transition-colors border border-border"
            >
              <Users className="w-8 h-8 text-accent" />
              <span className="text-sm font-semibold text-foreground">مشتریان</span>
            </Link>
            <Link
              href="/admin/settings"
              className="flex flex-col items-center gap-3 p-6 bg-accent/20 hover:bg-accent/30 rounded-lg transition-colors border border-border"
            >
              <Settings className="w-8 h-8 text-accent" />
              <span className="text-sm font-semibold text-foreground">تنظیمات</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>آخرین نوبت‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">نوبتی یافت نشد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentAppointments.map((appt: any) => {
                const date = new Date(appt.appointment_time).toLocaleDateString('fa-IR', {
                  timeZone: 'Asia/Tehran',
                });
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
                        <p className="text-sm text-muted-foreground">{appt.barber_name}</p>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Scissors className="w-4 h-4" />
                        {appt.service_name}
                      </span>
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
