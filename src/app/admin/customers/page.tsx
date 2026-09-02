import { requireAdmin } from '@/lib/auth-server';
import { sql } from '@/db/client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminCustomers() {
  await requireAdmin();
  
  // Get all customers from appointments
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
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">مدیریت مشتریان</h1>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">بازگشت</Link>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">لیست مشتریان ({customers.length} مشتری)</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold">نام</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">تلفن</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">تعداد نوبت‌ها</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">نوبت‌های تأیید شده</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">آخرین نوبت</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Telegram ID</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-600">
                      مشتری‌ای یافت نشد
                    </td>
                  </tr>
                ) : (
                  customers.map((customer: any) => {
                    const lastAppt = customer.last_appointment 
                      ? new Date(customer.last_appointment).toLocaleDateString('fa-IR', {
                          timeZone: 'Asia/Tehran',
                        })
                      : '-';
                    
                    return (
                      <tr key={customer.customer_telegram_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-semibold">{customer.customer_name}</td>
                        <td className="px-4 py-3 text-sm">{customer.customer_phone}</td>
                        <td className="px-4 py-3 text-sm text-center">{customer.total_appointments}</td>
                        <td className="px-4 py-3 text-sm text-center">{customer.confirmed_count}</td>
                        <td className="px-4 py-3 text-sm">{lastAppt}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{customer.customer_telegram_id}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
