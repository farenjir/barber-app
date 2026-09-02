import { headers } from 'next/headers';
import { sql } from '@/db/client';
import Link from 'next/link';

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
  const headersList = await headers();
  const userName = headersList.get('x-user-name') || '';

  const stats = await getAdminStats();

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">پنل مدیریت</h1>
            <p className="text-sm text-gray-600">سوپر ادمین</p>
          </div>
          <div className="text-left">
            <p className="text-sm text-gray-600">{userName}</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm text-gray-600 mb-2">آرایشگران فعال</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.barbersCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm text-gray-600 mb-2">مشتریان</h3>
            <p className="text-3xl font-bold text-green-600">{stats.customersCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm text-gray-600 mb-2">نوبت‌های امروز</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.todayAppointmentsCount}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">مدیریت</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/admin/barbers" className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition">
              <div className="text-3xl mb-2">👨‍💼</div>
              <div className="text-sm font-semibold text-gray-700">آرایشگران</div>
            </Link>
            <Link href="/admin/appointments" className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition">
              <div className="text-3xl mb-2">📅</div>
              <div className="text-sm font-semibold text-gray-700">نوبت‌ها</div>
            </Link>
            <Link href="/admin/customers" className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-sm font-semibold text-gray-700">مشتریان</div>
            </Link>
            <Link href="/admin/settings" className="p-4 bg-yellow-50 rounded-lg text-center hover:bg-yellow-100 transition">
              <div className="text-3xl mb-2">⚙️</div>
              <div className="text-sm font-semibold text-gray-700">تنظیمات</div>
            </Link>
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">آخرین نوبت‌ها</h2>
          {stats.recentAppointments.length === 0 ? (
            <p className="text-gray-600 text-center py-8">نوبتی یافت نشد</p>
          ) : (
            <div className="space-y-4">
              {stats.recentAppointments.map((appt: any) => {
                const date = new Date(appt.appointment_time).toLocaleDateString('fa-IR', {
                  timeZone: 'Asia/Tehran',
                });
                const time = new Date(appt.appointment_time).toLocaleTimeString('fa-IR', {
                  timeZone: 'Asia/Tehran',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const statusColors = {
                  pending: 'bg-yellow-100 text-yellow-800',
                  confirmed: 'bg-green-100 text-green-800',
                  cancelled: 'bg-red-100 text-red-800',
                };
                const statusTexts = {
                  pending: 'در انتظار',
                  confirmed: 'تأیید شده',
                  cancelled: 'لغو شده',
                };

                return (
                  <div key={appt.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">{appt.customer_name}</h3>
                        <p className="text-sm text-gray-600">{appt.barber_name}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[appt.status as keyof typeof statusColors]}`}>
                        {statusTexts[appt.status as keyof typeof statusTexts]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>📅 {date}</span>
                      <span>⏰ {time}</span>
                      <span>💇 {appt.service_name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
