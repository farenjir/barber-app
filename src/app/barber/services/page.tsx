import { headers } from 'next/headers';
import { sql } from '@/db/client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getBarberServices(userId: number) {
  const barber = await sql`
    SELECT id FROM barbers WHERE user_id = ${userId}
  ` as any[];

  if (barber.length === 0) return [];

  return await sql`
    SELECT * FROM services 
    WHERE barber_id = ${barber[0].id}
    ORDER BY is_active DESC, name ASC
  ` as any[];
}

export default async function BarberServices() {
  const headersList = await headers();
  const userId = parseInt(headersList.get('x-user-id') || '0');

  const services = await getBarberServices(userId);

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">مدیریت خدمات</h1>
          <Link href="/barber" className="text-blue-600 hover:text-blue-800">بازگشت</Link>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">خدمات</h2>
          {services.length === 0 ? (
            <p className="text-gray-600 text-center py-8">خدمتی یافت نشد</p>
          ) : (
            <div className="space-y-3">
              {services.map((service: any) => (
                <div key={service.id} className="border rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-800">{service.name}</h3>
                    <p className="text-sm text-gray-600">
                      {service.duration_minutes} دقیقه | {service.price_toman.toLocaleString('fa-IR')} تومان
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${service.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {service.is_active ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">ویرایش خدمات - در حال توسعه</p>
          </div>
        </div>
      </div>
    </div>
  );
}
