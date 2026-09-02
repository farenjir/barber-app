import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from '@/db/client';
import Link from 'next/link';

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
  const today = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

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
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

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
  const headersList = await headers();
  const userId = parseInt(headersList.get('x-user-id') || '0');
  const userName = headersList.get('x-user-name') || '';

  const data = await getBarberData(userId);

  if (!data) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">خطا</h1>
            <p className="text-gray-700">شما به عنوان آرایشگر ثبت نشده‌اید.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{data.barber.display_name}</h1>
            <p className="text-sm text-gray-600">پنل آرایشگر</p>
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
            <h3 className="text-sm text-gray-600 mb-2">نوبت‌های امروز</h3>
            <p className="text-3xl font-bold text-blue-600">{data.todayAppointments.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm text-gray-600 mb-2">نوبت‌های هفته آینده</h3>
            <p className="text-3xl font-bold text-green-600">{data.upcomingCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm text-gray-600 mb-2">خدمات فعال</h3>
            <p className="text-3xl font-bold text-purple-600">{data.servicesCount}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">دسترسی سریع</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/barber/calendar" className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition">
              <div className="text-3xl mb-2">📅</div>
              <div className="text-sm font-semibold text-gray-700">تقویم</div>
            </Link>
            <Link href="/barber/services" className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition">
              <div className="text-3xl mb-2">💇</div>
              <div className="text-sm font-semibold text-gray-700">خدمات</div>
            </Link>
            <Link href="/barber/hours" className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition">
              <div className="text-3xl mb-2">🕐</div>
              <div className="text-sm font-semibold text-gray-700">ساعات کاری</div>
            </Link>
            <Link href="/barber/customers" className="p-4 bg-yellow-50 rounded-lg text-center hover:bg-yellow-100 transition">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-sm font-semibold text-gray-700">مشتریان</div>
            </Link>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">نوبت‌های امروز</h2>
          {data.todayAppointments.length === 0 ? (
            <p className="text-gray-600 text-center py-8">امروز نوبتی وجود ندارد</p>
          ) : (
            <div className="space-y-4">
              {data.todayAppointments.map((appt: any) => {
                const time = new Date(appt.appointment_time).toLocaleTimeString('fa-IR', {
                  timeZone: 'Asia/Tehran',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const statusColor = appt.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
                const statusText = appt.status === 'confirmed' ? 'تأیید شده' : 'در انتظار';

                return (
                  <div key={appt.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">{appt.customer_name}</h3>
                        <p className="text-sm text-gray-600">{appt.customer_phone}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                        {statusText}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>⏰ {time}</span>
                      <span>💇 {appt.service_name}</span>
                      <span>⏱ {appt.duration_minutes} دقیقه</span>
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
