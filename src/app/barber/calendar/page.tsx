import { requireBarber } from '@/lib/auth-server';
import { sql } from '@/db/client';
import Link from 'next/link';
import { getTehranDayStart, addTehranDays } from '@/lib/tehran-time';

export const dynamic = 'force-dynamic';

// Get Jalali weekday name
function getJalaliWeekdayName(date: Date): string {
  const weekday = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tehran' })).getDay();
  const names = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
  return names[weekday];
}

// Format Jalali date (short)
function formatJalaliDateShort(date: Date): string {
  const jalaliStr = date.toLocaleDateString('fa-IR', { 
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return jalaliStr;
}

async function getWeekAppointments(barberId: number, weekStart: Date) {
  const weekEnd = addTehranDays(weekStart, 7);
  
  return await sql`
    SELECT 
      a.*,
      s.name as service_name,
      s.duration_minutes
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.barber_id = ${barberId}
    AND a.appointment_time >= ${weekStart.toISOString()}
    AND a.appointment_time < ${weekEnd.toISOString()}
    ORDER BY a.appointment_time ASC
  ` as any[];
}

export default async function BarberCalendar({
  searchParams,
}: {
  searchParams: { confirm?: string; cancel?: string };
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

  // Handle confirm/cancel actions
  if (searchParams.confirm) {
    await sql`
      UPDATE appointments 
      SET status = 'confirmed', updated_at = NOW()
      WHERE id = ${parseInt(searchParams.confirm)} AND barber_id = ${barberId}
    `;
  }
  
  if (searchParams.cancel) {
    await sql`
      UPDATE appointments 
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ${parseInt(searchParams.cancel)} AND barber_id = ${barberId}
    `;
  }

  // Get current week
  const now = new Date();
  const today = getTehranDayStart(now);
  
  // Get start of week (Saturday in Persian calendar)
  const currentWeekday = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Tehran' })).getDay();
  const daysFromSaturday = currentWeekday === 6 ? 0 : currentWeekday + 1;
  const weekStart = addTehranDays(today, -daysFromSaturday);
  
  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addTehranDays(weekStart, i));
  
  const appointments = await getWeekAppointments(barberId, weekStart);
  
  // Group appointments by day
  const appointmentsByDay = new Map<string, any[]>();
  for (const appt of appointments) {
    const apptDate = getTehranDayStart(new Date(appt.appointment_time));
    const dayKey = apptDate.toISOString();
    if (!appointmentsByDay.has(dayKey)) {
      appointmentsByDay.set(dayKey, []);
    }
    appointmentsByDay.get(dayKey)!.push(appt);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">تقویم هفتگی</h1>
          <Link href="/barber" className="text-blue-600 hover:text-blue-800">بازگشت</Link>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold">
              هفته {formatJalaliDateShort(weekStart)} تا {formatJalaliDateShort(addTehranDays(weekStart, 6))}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {weekDays.map((day) => {
              const dayKey = day.toISOString();
              const dayAppointments = appointmentsByDay.get(dayKey) || [];
              const isToday = day.toISOString() === today.toISOString();
              
              return (
                <div key={dayKey} className={`border rounded-lg p-4 ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}>
                  <div className="font-bold text-lg mb-3 flex items-center gap-2">
                    <span>{getJalaliWeekdayName(day)}</span>
                    <span className="text-gray-600 text-base">{formatJalaliDateShort(day)}</span>
                    {isToday && <span className="text-blue-600 text-sm">(امروز)</span>}
                  </div>
                  
                  {dayAppointments.length === 0 ? (
                    <p className="text-gray-500 text-sm">نوبتی وجود ندارد</p>
                  ) : (
                    <div className="space-y-2">
                      {dayAppointments.map((appt: any) => {
                        const time = new Date(appt.appointment_time).toLocaleTimeString('fa-IR', {
                          timeZone: 'Asia/Tehran',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        
                        const statusColors = {
                          pending: 'bg-yellow-100 border-yellow-300',
                          confirmed: 'bg-green-100 border-green-300',
                          cancelled: 'bg-red-100 border-red-300',
                        };
                        
                        const statusText = {
                          pending: 'در انتظار تأیید',
                          confirmed: 'تأیید شده',
                          cancelled: 'لغو شده',
                        };
                        
                        return (
                          <div key={appt.id} className={`border rounded p-3 ${statusColors[appt.status as keyof typeof statusColors]}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-semibold">{time} - {appt.service_name}</div>
                                <div className="text-sm text-gray-700">{appt.customer_name} | {appt.customer_phone}</div>
                                <div className="text-xs text-gray-600 mt-1">⏱ {appt.duration_minutes} دقیقه</div>
                              </div>
                              <span className="text-xs font-semibold">
                                {statusText[appt.status as keyof typeof statusText]}
                              </span>
                            </div>
                            
                            {appt.status === 'pending' && (
                              <div className="flex gap-2 mt-2">
                                <Link
                                  href={`/barber/calendar?confirm=${appt.id}`}
                                  className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  ✅ تأیید
                                </Link>
                                <Link
                                  href={`/barber/calendar?cancel=${appt.id}`}
                                  className="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  ❌ لغو
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
