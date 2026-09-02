import { headers } from 'next/headers';
import { sql } from '@/db/client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getAllBarbers() {
  return await sql`
    SELECT b.*, u.name as user_name, u.telegram_id, u.is_active as user_active
    FROM barbers b
    JOIN users u ON b.user_id = u.id
    ORDER BY b.is_active DESC, b.display_name ASC
  ` as any[];
}

export default async function AdminBarbers() {
  const barbers = await getAllBarbers();

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">مدیریت آرایشگران</h1>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">بازگشت</Link>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">آرایشگران</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              + افزودن آرایشگر
            </button>
          </div>
          {barbers.length === 0 ? (
            <p className="text-gray-600 text-center py-8">آرایشگری یافت نشد</p>
          ) : (
            <div className="space-y-3">
              {barbers.map((barber: any) => (
                <div key={barber.id} className="border rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-800">{barber.display_name}</h3>
                    <p className="text-sm text-gray-600">کاربر: {barber.user_name}</p>
                    <p className="text-xs text-gray-500">Telegram ID: {barber.telegram_id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs ${barber.is_active && barber.user_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {barber.is_active && barber.user_active ? 'فعال' : 'غیرفعال'}
                    </span>
                    <button className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800">ویرایش</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">افزودن/ویرایش آرایشگران - در حال توسعه</p>
          </div>
        </div>
      </div>
    </div>
  );
}
