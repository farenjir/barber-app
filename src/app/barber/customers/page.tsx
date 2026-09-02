import { headers } from 'next/headers';
import { sql } from '@/db/client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

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

  const customers = await getBarberCustomers(userId);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">لیست مشتریان</h1>
          <Link href="/barber" className="text-blue-600 hover:text-blue-800">بازگشت</Link>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">مشتریان</h2>
          {customers.length === 0 ? (
            <p className="text-gray-600 text-center py-8">مشتری‌ای یافت نشد</p>
          ) : (
            <div className="space-y-3">
              {customers.map((customer: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800">{customer.customer_name}</h3>
                  <p className="text-sm text-gray-600">{customer.customer_phone}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    آخرین نوبت: {new Date(customer.last_appointment).toLocaleDateString('fa-IR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
