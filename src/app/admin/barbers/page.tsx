import { requireAdmin } from '@/lib/auth-server';
import { sql } from '@/db/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function addBarber(formData: FormData) {
  'use server';
  
  const telegramId = parseInt(formData.get('telegram_id') as string);
  const displayName = formData.get('display_name') as string;
  
  // Create user
  const [user] = await sql`
    INSERT INTO users (telegram_id, role, name, is_active)
    VALUES (${telegramId}, 'barber', ${displayName}, true)
    ON CONFLICT (telegram_id) DO UPDATE SET role = 'barber', name = ${displayName}
    RETURNING id
  ` as any[];
  
  // Create barber
  await sql`
    INSERT INTO barbers (user_id, display_name, is_active)
    VALUES (${user.id}, ${displayName}, true)
    ON CONFLICT (user_id) DO UPDATE SET display_name = ${displayName}
  `;
  
  // Copy default working hours from first barber
  const firstBarber = await sql`
    SELECT id FROM barbers WHERE id != (SELECT id FROM barbers WHERE user_id = ${user.id}) LIMIT 1
  ` as any[];
  
  if (firstBarber.length > 0) {
    const sourceId = firstBarber[0].id;
    const newBarberId = await sql`SELECT id FROM barbers WHERE user_id = ${user.id}` as any[];
    
    await sql`
      INSERT INTO working_hours (barber_id, weekday, start_time, end_time, is_open)
      SELECT ${newBarberId[0].id}, weekday, start_time, end_time, is_open
      FROM working_hours
      WHERE barber_id = ${sourceId}
      ON CONFLICT (barber_id, weekday) DO NOTHING
    `;
  }
  
  redirect('/admin/barbers?added=1');
}

async function toggleBarber(formData: FormData) {
  'use server';
  
  const barberId = parseInt(formData.get('barber_id') as string);
  const currentStatus = formData.get('current_status') === 'true';
  
  await sql`
    UPDATE barbers
    SET is_active = ${!currentStatus}
    WHERE id = ${barberId}
  `;
  
  await sql`
    UPDATE users
    SET is_active = ${!currentStatus}
    WHERE id = (SELECT user_id FROM barbers WHERE id = ${barberId})
  `;
  
  redirect('/admin/barbers');
}

export default async function AdminBarbers({
  searchParams,
}: {
  searchParams: { add?: string; added?: string };
}) {
  await requireAdmin();
  
  const barbers = await sql`
    SELECT b.*, u.name as user_name, u.telegram_id, u.is_active as user_active
    FROM barbers b
    JOIN users u ON b.user_id = u.id
    ORDER BY b.is_active DESC, b.display_name ASC
  ` as any[];

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">مدیریت آرایشگران</h1>
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">بازگشت</Link>
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {searchParams.added && (
          <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded text-green-800">
            ✓ آرایشگر با موفقیت اضافه شد
          </div>
        )}
        
        {/* Add Form */}
        {searchParams.add && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">افزودن آرایشگر جدید</h2>
              <Link href="/admin/barbers" className="text-gray-600 hover:text-gray-800">✕</Link>
            </div>
            
            <form action={addBarber} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Telegram ID</label>
                <input
                  type="number"
                  name="telegram_id"
                  required
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="123456789"
                />
                <p className="text-xs text-gray-600 mt-1">
                  آیدی عددی تلگرام آرایشگر (با ارسال /start به @userinfobot قابل دریافت است)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">نام نمایشی</label>
                <input
                  type="text"
                  name="display_name"
                  required
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="نام آرایشگر"
                />
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
                <strong>توجه:</strong> ساعات کاری پیش‌فرض از آرایشگر دیگری کپی می‌شود. آرایشگر می‌تواند از پنل خود آن را تغییر دهد.
              </div>
              
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
              >
                افزودن آرایشگر
              </button>
            </form>
          </div>
        )}
        
        {/* Barbers List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">لیست آرایشگران ({barbers.length})</h2>
            <Link
              href="/admin/barbers?add=1"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
            >
              + افزودن آرایشگر
            </Link>
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
                    <p className="text-xs text-gray-500 mt-1">Telegram ID: {barber.telegram_id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs ${barber.is_active && barber.user_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {barber.is_active && barber.user_active ? 'فعال' : 'غیرفعال'}
                    </span>
                    
                    <form action={toggleBarber} className="inline">
                      <input type="hidden" name="barber_id" value={barber.id} />
                      <input type="hidden" name="current_status" value={(barber.is_active && barber.user_active).toString()} />
                      <button
                        type="submit"
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-semibold"
                      >
                        {barber.is_active && barber.user_active ? 'غیرفعال کردن' : 'فعال کردن'}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
