import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const WEEKDAYS = [
  { value: 6, label: 'شنبه' },
  { value: 0, label: 'یکشنبه' },
  { value: 1, label: 'دوشنبه' },
  { value: 2, label: 'سه‌شنبه' },
  { value: 3, label: 'چهارشنبه' },
  { value: 4, label: 'پنج‌شنبه' },
  { value: 5, label: 'جمعه' },
];

async function updateWorkingHours(formData: FormData, barberId: number) {
  'use server';
  
  for (const day of WEEKDAYS) {
    const isOpen = formData.get(`is_open_${day.value}`) === 'on';
    const startTime = formData.get(`start_${day.value}`) as string;
    const endTime = formData.get(`end_${day.value}`) as string;
    
    await sql`
      INSERT INTO working_hours (barber_id, weekday, start_time, end_time, is_open)
      VALUES (${barberId}, ${day.value}, ${startTime}, ${endTime}, ${isOpen})
      ON CONFLICT (barber_id, weekday)
      DO UPDATE SET 
        start_time = ${startTime},
        end_time = ${endTime},
        is_open = ${isOpen},
        updated_at = NOW()
    `;
  }
  
  redirect('/barber/hours?saved=1');
}

export default async function BarberHours({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const user = await requireBarber();
  
  // Get barber ID
  const barber = await sql`
    SELECT id FROM barbers WHERE user_id = ${user.id}
  ` as any[];
  
  if (barber.length === 0) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-red-600">شما به عنوان آرایشگر ثبت نشده‌اید.</p>
        </div>
      </div>
    );
  }
  
  const barberId = barber[0].id;
  
  // Get current working hours
  const workingHours = await sql`
    SELECT * FROM working_hours WHERE barber_id = ${barberId} ORDER BY weekday
  ` as any[];
  
  const hoursMap = new Map(workingHours.map((h: any) => [h.weekday, h]));

  const updateHoursAction = updateWorkingHours.bind(null, barberId as any) as any;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">ساعات کاری</h1>
          <Link href="/barber" className="text-blue-600 hover:text-blue-800">بازگشت</Link>
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {searchParams.saved && (
          <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded text-green-800">
            ✓ ساعات کاری با موفقیت ذخیره شد
          </div>
        )}
        
        <form action={updateHoursAction} className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-6">تنظیم ساعات کاری</h2>
          
          <div className="space-y-4">
            {WEEKDAYS.map((day) => {
              const hours = hoursMap.get(day.value);
              const isOpen = hours?.is_open ?? true;
              const startTime = hours?.start_time ?? '10:00';
              const endTime = hours?.end_time ?? '21:00';
              
              return (
                <div key={day.value} className="border rounded-lg p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name={`is_open_${day.value}`}
                        defaultChecked={isOpen}
                        className="w-5 h-5"
                      />
                      <span className="font-semibold text-lg">{day.label}</span>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">ساعت شروع</label>
                      <input
                        type="time"
                        name={`start_${day.value}`}
                        defaultValue={startTime}
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">ساعت پایان</label>
                      <input
                        type="time"
                        name={`end_${day.value}`}
                        defaultValue={endTime}
                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6">
            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              ذخیره ساعات کاری
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
