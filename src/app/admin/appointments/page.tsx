import { requireAdmin } from '@/lib/auth-server';
import { sql } from '@/db/client';
import Link from 'next/link';
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
  await requireAdmin();
  
  // Get all barbers
  const barbers = await sql`
    SELECT b.id, b.display_name 
    FROM barbers b
    WHERE b.is_active = true
    ORDER BY b.display_name
  ` as any[];
  
  // Build query
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
  
  // Combine conditions
  if (conditions.length > 0) {
    query = sql`${query} ${sql(conditions.map(c => c.strings[0]).join(' '))}`;
  }
  
  query = sql`${query} ORDER BY a.appointment_time DESC LIMIT 100`;
  
  const appointments = await query as any[];

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">مدیریت نوبت‌ها</h1>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">بازگشت</Link>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">آرایشگر</label>
              <select name="barber" className="w-full px-3 py-2 border rounded">
                <option value="">همه</option>
                {barbers.map((b: any) => (
                  <option key={b.id} value={b.id} selected={searchParams.barber === b.id.toString()}>
                    {b.display_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-1">وضعیت</label>
              <select name="status" className="w-full px-3 py-2 border rounded">
                <option value="">همه</option>
                <option value="pending" selected={searchParams.status === 'pending'}>در انتظار</option>
                <option value="confirmed" selected={searchParams.status === 'confirmed'}>تأیید شده</option>
                <option value="cancelled" selected={searchParams.status === 'cancelled'}>لغو شده</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-1">زمان</label>
              <select name="from" className="w-full px-3 py-2 border rounded">
                <option value="">همه</option>
                <option value="today" selected={searchParams.from === 'today'}>امروز</option>
                <option value="upcoming" selected={searchParams.from === 'upcoming'}>آینده</option>
                <option value="past" selected={searchParams.from === 'past'}>گذشته</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                اعمال فیلتر
              </button>
            </div>
          </form>
        </div>
        
        {/* Appointments Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold">زمان</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">آرایشگر</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">خدمت</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">مشتری</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">تلفن</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-600">
                      نوبتی یافت نشد
                    </td>
                  </tr>
                ) : (
                  appointments.map((appt: any) => {
                    const statusColors = {
                      pending: 'bg-yellow-100 text-yellow-800',
                      confirmed: 'bg-green-100 text-green-800',
                      cancelled: 'bg-red-100 text-red-800',
                    };
                    
                    const statusText = {
                      pending: 'در انتظار',
                      confirmed: 'تأیید شده',
                      cancelled: 'لغو شده',
                    };
                    
                    return (
                      <tr key={appt.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{formatDateTime(new Date(appt.appointment_time))}</td>
                        <td className="px-4 py-3 text-sm">{appt.barber_name}</td>
                        <td className="px-4 py-3 text-sm">{appt.service_name}</td>
                        <td className="px-4 py-3 text-sm">{appt.customer_name}</td>
                        <td className="px-4 py-3 text-sm">{appt.customer_phone}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[appt.status as keyof typeof statusColors]}`}>
                            {statusText[appt.status as keyof typeof statusText]}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {appointments.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600">
              نمایش {appointments.length} نوبت (حداکثر 100 نوبت اخیر)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
